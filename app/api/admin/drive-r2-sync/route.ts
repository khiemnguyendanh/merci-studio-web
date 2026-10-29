import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ApiError, cleanString, errorResponse, requireAdmin } from '@/lib/server/api-security';
import {
  DRIVE_ID_RE,
  MANIFEST_KEY,
  PHOTOS_PREFIX,
  THUMB_MAX,
  WEB_MAX,
  emptyManifest,
  extractDriveFolderId,
  fitInside,
  imageKeys,
  mergeAlbum,
  pickNewFiles,
  readWebpSize,
  resolveAlbumTarget,
  type Manifest,
  type ManifestImage
} from '@/lib/server/photo-manifest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Đồng bộ ảnh MỚI từ folder Google Drive lên R2 (bucket merci-photos, prefix photos/).
// Worker không decode được ảnh nên dùng bản thu nhỏ WebP do Google tạo sẵn
// (thumbnailLink "=s1920-rw"). Ảnh Drive chưa có thumbnail (thường là HEIC vừa
// upload, hoặc định dạng Google không đọc được) được ghi vào photos/drive-pending.json
// để máy tính xử lý bằng CAP-NHAT-ANH-TU-DRIVE.bat (sharp + ffmpeg).
//
// Client gọi nhiều lần: scan (liệt kê) rồi upload từng lô nhỏ để không vượt
// giới hạn subrequest/thời gian của một request Worker.

const PENDING_KEY = `${PHOTOS_PREFIX}drive-pending.json`;
const BATCH_MAX = 6;
const IMMUTABLE = 'public, max-age=31536000, immutable';

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  hasThumbnail?: boolean;
  thumbnailLink?: string;
  imageMediaMetadata?: { width?: number; height?: number; rotation?: number };
};

type PendingItem = { folderId: string; folderName: string; category: string; fileId: string; name: string; addedAt: number };
type Pending = { updatedAt: string; items: PendingItem[] };

function photosBase() {
  return (process.env.NEXT_PUBLIC_PHOTOS_BASE || 'https://img.mercistudio.net/photos').replace(/\/+$/, '');
}

async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { PHOTOS?: R2Bucket }).PHOTOS;
  if (!bucket) throw new ApiError(503, 'Chưa gắn R2 bucket PHOTOS cho Worker.');
  return bucket;
}

function driveKey() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!key) throw new ApiError(500, 'Thiếu NEXT_PUBLIC_GOOGLE_API_KEY.');
  return key;
}

async function driveGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`https://www.googleapis.com/drive/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', driveKey());
  url.searchParams.set('supportsAllDrives', 'true');
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!res.ok || data.error) {
    throw new ApiError(res.status === 404 ? 404 : 502,
      `Google Drive: ${data.error?.message || res.status}. Kiểm tra folder đã để "Bất kỳ ai có liên kết đều xem được".`);
  }
  return data;
}

async function listFiles(q: string, fields: string) {
  const out: DriveFile[] = [];
  let pageToken = '';
  do {
    const data = await driveGet<{ files?: DriveFile[]; nextPageToken?: string }>('files', {
      q,
      fields: `nextPageToken,files(${fields})`,
      pageSize: '1000',
      orderBy: 'name',
      includeItemsFromAllDrives: 'true',
      ...(pageToken ? { pageToken } : {})
    });
    out.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

const listImages = (folderId: string) => listFiles(
  `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
  'id,name,mimeType,hasThumbnail,thumbnailLink,imageMediaMetadata(width,height,rotation)'
);
const listSubfolders = (folderId: string) => listFiles(
  `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  'id,name'
);

function dims(f: DriveFile) {
  const m = f.imageMediaMetadata || {};
  const rotated = m.rotation === 1 || m.rotation === 3;
  return rotated ? { width: m.height, height: m.width } : { width: m.width, height: m.height };
}

async function readJson<T>(bucket: R2Bucket, key: string): Promise<{ data: T | null; etag: string | null }> {
  const obj = await bucket.get(key);
  if (!obj) return { data: null, etag: null };
  return { data: await obj.json<T>(), etag: obj.etag };
}

// Ghi JSON có điều kiện etag: nếu file vừa bị máy/khác ghi chen vào thì đọc lại và gộp lại.
async function updateJson<T>(bucket: R2Bucket, key: string, fallback: () => T, change: (current: T) => T, cacheControl: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, etag } = await readJson<T>(bucket, key);
    const next = change(data ?? fallback());
    const body = JSON.stringify(next);
    const options: R2PutOptions = { httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl } };
    if (etag) options.onlyIf = { etagMatches: etag };
    else options.onlyIf = { uploadedBefore: new Date(0) };
    const written = await bucket.put(key, body, options);
    if (written) return next;
  }
  throw new ApiError(409, 'Manifest đang được cập nhật ở nơi khác, thử lại sau ít phút.');
}

async function fetchThumb(link: string, size: number) {
  const url = link.replace(/=s\d+(-[a-z0-9-]+)?$/i, '') + `=s${size}-rw`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`thumbnail HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const size2 = readWebpSize(buf);
  if (!size2) throw new Error('thumbnail không phải WebP');
  return { buf, ...size2 };
}

async function folderName(folderId: string) {
  const info = await driveGet<{ id: string; name: string; mimeType: string }>(`files/${encodeURIComponent(folderId)}`, { fields: 'id,name,mimeType' });
  if (info.mimeType !== 'application/vnd.google-apps.folder') throw new ApiError(400, 'Link này không phải thư mục Google Drive.');
  return info.name;
}

async function scan(body: Record<string, unknown>) {
  const link = cleanString(body.link, 'Link Drive', 500, true);
  const category = cleanString(body.category, 'Danh mục', 80, true);
  const rootId = extractDriveFolderId(link);
  if (!rootId) throw new ApiError(400, 'Link Google Drive không hợp lệ.');

  const bucket = await getBucket();
  const [rootName, subs, manifestRes] = await Promise.all([
    folderName(rootId),
    listSubfolders(rootId),
    readJson<Manifest>(bucket, MANIFEST_KEY)
  ]);
  const manifest = manifestRes.data ?? emptyManifest(photosBase());
  // Folder gốc có thư mục con -> mỗi thư mục con là 1 album; không có -> chính nó là album.
  const folders = subs.length ? subs.slice(0, 200) : [{ id: rootId, name: rootName }];

  const albums = [];
  for (const folder of folders) {
    const files = await listImages(folder.id);
    const target = resolveAlbumTarget(manifest, { category, folderId: folder.id, folderName: folder.name });
    const current = manifest.albums.find((a) => a.id === target.albumId);
    const fresh = pickNewFiles(current, files.map((f) => ({ id: f.id, name: f.name })));
    albums.push({
      folderId: folder.id,
      folderName: folder.name,
      albumId: target.albumId,
      title: target.title,
      exists: target.exists,
      total: files.length,
      newFiles: fresh.map((f) => f.id)
    });
  }
  return { rootName, category, albums };
}

async function upload(body: Record<string, unknown>) {
  const folderId = cleanString(body.folderId, 'Folder', 200, true);
  const category = cleanString(body.category, 'Danh mục', 80, true);
  if (!DRIVE_ID_RE.test(folderId)) throw new ApiError(400, 'Folder Drive không hợp lệ.');
  const ids = Array.isArray(body.fileIds) ? body.fileIds.map(String).filter((id) => DRIVE_ID_RE.test(id)) : [];
  if (!ids.length || ids.length > BATCH_MAX) throw new ApiError(400, `Mỗi lần gửi 1-${BATCH_MAX} ảnh.`);

  const bucket = await getBucket();
  const [name, files, manifestRes] = await Promise.all([
    folderName(folderId),
    listImages(folderId),
    readJson<Manifest>(bucket, MANIFEST_KEY)
  ]);
  const manifest = manifestRes.data ?? emptyManifest(photosBase());
  const target = resolveAlbumTarget(manifest, { category, folderId, folderName: name });
  const wanted = new Set(ids);
  const batch = files.filter((f) => wanted.has(f.id));

  const base = photosBase();
  const added: ManifestImage[] = [];
  const deferred: PendingItem[] = [];
  const now = Date.now();

  await Promise.all(batch.map(async (f) => {
    const defer = () => deferred.push({ folderId, folderName: name, category: target.category, fileId: f.id, name: f.name, addedAt: now });
    if (!f.hasThumbnail || !f.thumbnailLink) return defer();
    try {
      const keys = imageKeys(target.catSlug, target.albumSlug, f.id);
      const [web, thumb] = await Promise.all([fetchThumb(f.thumbnailLink, WEB_MAX), fetchThumb(f.thumbnailLink, THUMB_MAX)]);
      // Google trả thumbnail nhỏ hơn yêu cầu với ảnh chưa xử lý xong -> để máy làm bản đẹp.
      const original = dims(f);
      const expected = fitInside(original.width, original.height, WEB_MAX);
      if (expected.width && Math.max(web.width, web.height) < Math.min(WEB_MAX, Math.max(expected.width, expected.height || 0)) * 0.9) {
        return defer();
      }
      const meta = { httpMetadata: { contentType: 'image/webp', cacheControl: IMMUTABLE } };
      await Promise.all([bucket.put(keys.web, web.buf, meta), bucket.put(keys.thumb, thumb.buf, meta)]);
      added.push({
        id: keys.id,
        name: f.name,
        url: `${base}/${keys.web.slice(PHOTOS_PREFIX.length)}`,
        thumbnailUrl: `${base}/${keys.thumb.slice(PHOTOS_PREFIX.length)}`,
        width: web.width,
        height: web.height,
        driveId: f.id
      });
    } catch (error) {
      console.warn('drive-r2-sync: defer', f.id, error);
      defer();
    }
  }));

  // Giữ đúng thứ tự tên file như trên Drive.
  const order = new Map(files.map((f, i) => [f.id, i]));
  added.sort((a, b) => (order.get(a.driveId!) ?? 0) - (order.get(b.driveId!) ?? 0));

  if (added.length) {
    await updateJson<Manifest>(bucket, MANIFEST_KEY, () => emptyManifest(base),
      (current) => mergeAlbum(current, { ...target, driveFolderId: folderId }, added), 'public, max-age=60');
  }

  const doneIds = new Set(added.map((img) => img.driveId));
  const deferredIds = new Set(deferred.map((d) => d.fileId));
  if (deferred.length || doneIds.size) {
    await updateJson<Pending>(bucket, PENDING_KEY, () => ({ updatedAt: '', items: [] }), (current) => {
      const items = (current.items || []).filter((it) => !doneIds.has(it.fileId) && !deferredIds.has(it.fileId));
      return { updatedAt: new Date().toISOString(), items: [...items, ...deferred] };
    }, 'no-store');
  }

  // Ảnh trong lô không còn trên Drive (bị xoá giữa chừng) thì bỏ qua.
  const missing = ids.filter((id) => !batch.some((f) => f.id === id)).length;
  return { albumId: target.albumId, added: added.length, deferred: deferred.length, missing };
}

async function pendingSummary() {
  const bucket = await getBucket();
  const { data } = await readJson<Pending>(bucket, PENDING_KEY);
  return { pending: data?.items?.length || 0 };
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action === 'scan') return Response.json(await scan(body));
    if (body.action === 'upload') return Response.json(await upload(body));
    if (body.action === 'pending') return Response.json(await pendingSummary());
    throw new ApiError(400, 'Thao tác không hợp lệ.');
  } catch (error) {
    return errorResponse(error);
  }
}
