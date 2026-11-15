"""Quét khuôn mặt trong một folder Google Drive và gom theo từng người.

Luồng: tải ảnh thumbnail từ Drive -> InsightFace (buffalo_l, GPU) lấy đặc trưng
khuôn mặt -> gom nhóm bằng chamfer/average linkage -> xuất JSON + ảnh đại diện
của từng người, đẩy lên R2 (faces/<folderId>/). Trang chọn ảnh đọc file này để
hiển thị thanh lọc "Lọc theo người".

Chạy:  python scripts/face-groups.py <link hoặc id folder Drive> [...]
Tuỳ chọn:
  --min-faces N   nhóm ít hơn N ảnh thì bỏ (mặc định 3)
  --threshold F   ngưỡng giống nhau, càng cao càng chặt (mặc định 0.42)
  --limit N       chỉ quét N ảnh đầu (để thử nhanh)
  --no-upload     chỉ chạy và ghi ra .cache/faces, không đẩy lên R2
"""

import argparse
import concurrent.futures as futures
import hashlib
import io
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import cv2
import numpy as np
import requests

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.cache' / 'faces'
ACCOUNT_ID = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '29ca4c452d80113d4c92e1b7c31e820b')
BUCKET = os.environ.get('R2_BUCKET', 'merci-photos')
PREFIX = 'faces/'
PUBLIC_BASE = os.environ.get('PHOTOS_PUBLIC_BASE_ROOT', 'https://img.mercistudio.net')

DOWNLOAD_WORKERS = 8
DET_SIZE = (960, 960)          # ảnh cưới nhiều mặt nhỏ ở xa -> để lớn hơn mặc định 640
MIN_FACE_PX = 34               # bỏ mặt quá nhỏ: nhiễu, gom nhóm hay sai
MIN_DET_SCORE = 0.60


def log(msg):
    print(msg, flush=True)


# --- Google Drive -----------------------------------------------------------

def load_env():
    env = ROOT / '.env.local'
    if not env.exists():
        return
    for line in env.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$', line)
        if m and m.group(1) not in os.environ:
            os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")


def folder_id(value):
    m = re.search(r'/folders/([a-zA-Z0-9_-]+)', value) or re.search(r'[?&]id=([a-zA-Z0-9_-]+)', value)
    if m:
        return m.group(1)
    return value if re.fullmatch(r'[a-zA-Z0-9_-]{10,}', value) else ''


def drive_list(api_key, fid):
    files, token = [], ''
    while True:
        params = {
            'q': f"'{fid}' in parents and mimeType contains 'image/' and trashed=false",
            'key': api_key,
            'fields': 'nextPageToken,files(id,name)',
            'pageSize': '1000',
            'orderBy': 'name',
        }
        if token:
            params['pageToken'] = token
        data = requests.get('https://www.googleapis.com/drive/v3/files', params=params, timeout=60).json()
        if 'error' in data:
            raise RuntimeError(data['error'].get('message', 'Lỗi Google Drive API'))
        files.extend(data.get('files', []))
        token = data.get('nextPageToken', '')
        if not token:
            return files


def download(file_id, size='w1600'):
    url = f'https://drive.google.com/thumbnail?id={file_id}&sz={size}'
    for attempt in range(3):
        try:
            r = requests.get(url, timeout=90)
            if r.ok and r.content and len(r.content) > 1024:
                return r.content
        except requests.RequestException:
            pass
        time.sleep(0.6 * (attempt + 1))
    return None


# --- Gom nhóm ---------------------------------------------------------------

def cluster(embeddings, threshold):
    """Average-linkage: gộp dần 2 nhóm giống nhau nhất cho tới khi dưới ngưỡng.

    Dùng trung bình (không phải cặp gần nhất) nên tránh được hiện tượng dây
    chuyền khiến hai người khác nhau bị nối qua một ảnh mờ.
    """
    n = len(embeddings)
    if n == 0:
        return []
    sim = embeddings @ embeddings.T
    np.fill_diagonal(sim, -1.0)
    groups = {i: [i] for i in range(n)}
    between = sim.copy()

    while len(groups) > 1:
        keys = list(groups)
        best, pair = -1.0, None
        for ai in range(len(keys)):
            for bi in range(ai + 1, len(keys)):
                a, b = keys[ai], keys[bi]
                value = between[a, b]
                if value > best:
                    best, pair = value, (a, b)
        if pair is None or best < threshold:
            break
        a, b = pair
        merged = groups.pop(a) + groups.pop(b)
        groups[a] = merged
        for other in groups:
            if other == a:
                continue
            block = sim[np.ix_(merged, groups[other])]
            between[a, other] = between[other, a] = float(block.mean())
    return list(groups.values())


def crop_face(image, bbox, pad=0.42):
    """Cắt ô vuông quanh mặt. Mặt sát mép ảnh thì dịch ô vào trong thay vì
    xén bớt, nếu không ảnh đại diện sẽ mất nửa trên khuôn mặt."""
    h, w = image.shape[:2]
    x1, y1, x2, y2 = bbox
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    half = min(max(x2 - x1, y2 - y1) * (1 + pad) / 2, w / 2, h / 2)
    cx = min(max(cx, half), w - half)
    cy = min(max(cy, half), h - half)
    face = image[int(cy - half):int(cy + half), int(cx - half):int(cx + half)]
    if face.size == 0:
        return None
    return cv2.resize(face, (256, 256), interpolation=cv2.INTER_AREA)


def portrait_score(rec, shape):
    """Điểm chọn ảnh đại diện: ưu tiên mặt chính diện, rõ, to vừa phải và
    nằm trọn trong khung — đẹp hơn là cứ lấy mặt to nhất."""
    h, w = shape[:2]
    x1, y1, x2, y2 = rec['bbox']
    if x1 < 2 or y1 < 2 or x2 > w - 2 or y2 > h - 2:
        return -1.0
    kps = rec.get('kps')
    frontal = 1.0
    if kps is not None and len(kps) >= 5:
        left_eye, right_eye, nose = kps[0], kps[1], kps[2]
        eye_mid_x = (left_eye[0] + right_eye[0]) / 2
        eye_span = max(abs(right_eye[0] - left_eye[0]), 1e-3)
        frontal = max(0.0, 1.0 - abs(nose[0] - eye_mid_x) / eye_span * 1.6)
    return (rec['area'] ** 0.5) * rec['score'] * (0.35 + 0.65 * frontal)


# --- R2 ---------------------------------------------------------------------

def r2_token():
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    if token:
        return token
    cfg = Path.home() / '.wrangler' / 'config' / 'default.toml'
    if not cfg.exists():
        raise RuntimeError('Chưa đăng nhập Cloudflare. Chạy: npx wrangler login')

    def read():
        text = cfg.read_text(encoding='utf-8')
        tok = re.search(r'oauth_token\s*=\s*"([^"]+)"', text)
        exp = re.search(r'expiration_time\s*=\s*"([^"]+)"', text)
        return (tok.group(1) if tok else ''), (exp.group(1) if exp else '')

    tok, exp = read()
    expired = True
    if exp:
        from datetime import datetime, timezone
        try:
            expired = datetime.fromisoformat(exp.replace('Z', '+00:00')) <= datetime.now(timezone.utc)
        except ValueError:
            expired = True
    if expired:
        log('Đang gia hạn token Cloudflare...')
        subprocess.run('npx wrangler whoami', cwd=ROOT, shell=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
        tok, _ = read()
    if not tok:
        raise RuntimeError('Không đọc được token Cloudflare. Chạy: npx wrangler login')
    return tok


def r2_put(token, key, body, content_type, cache_control):
    from urllib.parse import quote
    url = (f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}'
           f'/r2/buckets/{BUCKET}/objects/{quote(key, safe="")}')
    expect = hashlib.md5(body).hexdigest()
    for attempt in range(4):
        r = requests.put(url, data=body, timeout=120, headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': content_type,
            'Cache-Control': cache_control,
        })
        if r.status_code in (401, 403):
            raise RuntimeError('Token Cloudflare hết hạn / thiếu quyền R2. Chạy: npx wrangler login')
        if r.ok:
            etag = (r.json().get('result') or {}).get('etag', '').replace('"', '')
            if etag == expect:
                return
        time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f'Không đẩy được {key} lên R2')


# --- Chính ------------------------------------------------------------------

def scan_folder(app, fid, args, token):
    api_key = os.environ.get('NEXT_PUBLIC_GOOGLE_API_KEY')
    files = drive_list(api_key, fid)
    if args.limit:
        files = files[:args.limit]
    if not files:
        log(f'  {fid}: không có ảnh (kiểm tra quyền chia sẻ)')
        return None
    log(f'  Tải và quét {len(files)} ảnh...')

    records, images, started = [], {}, time.time()
    with futures.ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        for index, (meta, blob) in enumerate(zip(files, pool.map(lambda f: download(f['id']), files)), 1):
            if blob is None:
                continue
            image = cv2.imdecode(np.frombuffer(blob, np.uint8), cv2.IMREAD_COLOR)
            if image is None:
                continue
            for face in app.get(image):
                x1, y1, x2, y2 = face.bbox
                if min(x2 - x1, y2 - y1) < MIN_FACE_PX or face.det_score < MIN_DET_SCORE:
                    continue
                emb = face.normed_embedding.astype(np.float32)
                records.append({'fileId': meta['id'], 'name': meta['name'], 'emb': emb,
                                'bbox': face.bbox, 'score': float(face.det_score),
                                'kps': getattr(face, 'kps', None),
                                'area': float((x2 - x1) * (y2 - y1))})
                images[meta['id']] = image
            if index % 50 == 0 or index == len(files):
                log(f'    {index}/{len(files)} ảnh · {len(records)} khuôn mặt · {time.time() - started:.0f}s')

    if not records:
        log('  Không tìm thấy khuôn mặt nào.')
        return None

    log(f'  Gom nhóm {len(records)} khuôn mặt...')
    embeddings = np.stack([r['emb'] for r in records])
    groups = [g for g in cluster(embeddings, args.threshold)]

    people, assets = [], []
    for members in groups:
        file_ids = sorted({records[i]['fileId'] for i in members})
        if len(file_ids) < args.min_faces:
            continue
        best = max(members, key=lambda i: portrait_score(records[i], images[records[i]['fileId']].shape))
        rec = records[best]
        face = crop_face(images[rec['fileId']], rec['bbox'])
        if face is None:
            continue
        ok, buf = cv2.imencode('.jpg', face, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not ok:
            continue
        data = buf.tobytes()
        digest = hashlib.md5(data).hexdigest()[:10]
        people.append({'id': digest, 'count': len(file_ids), 'fileIds': file_ids,
                       'thumb': f'{PUBLIC_BASE}/{PREFIX}{fid}/{digest}.jpg'})
        assets.append((f'{PREFIX}{fid}/{digest}.jpg', data))

    people.sort(key=lambda p: -p['count'])
    for order, person in enumerate(people, 1):
        person['label'] = f'Người {order}'

    result = {'folderId': fid, 'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
              'imageCount': len(files), 'faceCount': len(records), 'people': people}

    out = CACHE / fid
    out.mkdir(parents=True, exist_ok=True)
    (out / 'people.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    for key, data in assets:
        (out / Path(key).name).write_bytes(data)

    log(f'  -> {len(people)} người, {len(records)} khuôn mặt, {time.time() - started:.0f}s')
    for person in people[:12]:
        log(f'     {person["label"]}: {person["count"]} ảnh')

    if not args.no_upload:
        for key, data in assets:
            r2_put(token, key, data, 'image/jpeg', 'public, max-age=31536000, immutable')
        r2_put(token, f'{PREFIX}{fid}/people.json',
               json.dumps(result, ensure_ascii=False).encode('utf-8'),
               'application/json; charset=utf-8', 'public, max-age=60')
        log(f'  -> {PUBLIC_BASE}/{PREFIX}{fid}/people.json')
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('folders', nargs='+')
    parser.add_argument('--min-faces', type=int, default=3)
    parser.add_argument('--threshold', type=float, default=0.42)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--no-upload', action='store_true')
    args = parser.parse_args()

    load_env()
    if not os.environ.get('NEXT_PUBLIC_GOOGLE_API_KEY'):
        raise SystemExit('Thiếu NEXT_PUBLIC_GOOGLE_API_KEY trong .env.local')

    ids = [i for i in (folder_id(f) for f in args.folders) if i]
    if not ids:
        raise SystemExit('Không có link Drive hợp lệ.')

    token = None if args.no_upload else r2_token()

    os.environ.setdefault('INSIGHTFACE_HOME', str(ROOT / '.cache' / 'insightface'))
    from insightface.app import FaceAnalysis
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
    log('Đang nạp mô hình nhận diện khuôn mặt...')
    app = FaceAnalysis(name='buffalo_l', providers=providers)
    app.prepare(ctx_id=0, det_size=DET_SIZE)

    for fid in ids:
        log(f'\nFolder {fid}')
        scan_folder(app, fid, args, token)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        log(f'\nLỗi: {exc}')
        sys.exit(1)
