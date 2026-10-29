// Đẩy ảnh đã nén (.cache/photos) lên Cloudflare R2 bucket `merci-photos`, prefix `photos/`.
// Chỉ upload file mới hoặc đã thay đổi (so bằng MD5 với .cache/r2-state.json);
// manifest.json luôn upload cuối cùng. Xác thực bằng token của `wrangler login`
// (hoặc đặt CLOUDFLARE_API_TOKEN).
// Mỗi lần chạy đều liệt kê bucket trước để so với state: file có trong state mà
// không có trên R2 (API từng trả OK nhưng không ghi) sẽ được đẩy lại. Sau upload
// còn kiểm tra lại etag từng file.
// Chạy: node scripts/upload-r2.mjs [--all]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '29ca4c452d80113d4c92e1b7c31e820b';
const BUCKET = process.env.R2_BUCKET || 'merci-photos';
const PREFIX = 'photos/';
const SRC = path.join(process.cwd(), '.cache', 'photos');
const STATE_FILE = path.join(process.cwd(), '.cache', 'r2-state.json');
const CONCURRENCY = 4;
const FORCE_ALL = process.argv.includes('--all');
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}`;

function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfg = path.join(os.homedir(), '.wrangler', 'config', 'default.toml');
  if (!fs.existsSync(cfg)) throw new Error('Chưa đăng nhập Cloudflare. Chạy: npx wrangler login');
  const m = fs.readFileSync(cfg, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('Không đọc được token Cloudflare. Chạy: npx wrangler login');
  return m[1];
}
const TOKEN = loadToken();

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
const contentType = (file) => file.endsWith('.webp') ? 'image/webp' : file.endsWith('.jpg') ? 'image/jpeg' : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Liệt kê toàn bộ key + etag đang có trên bucket dưới prefix.
async function listRemote() {
  const remote = new Map();
  let cursor = '';
  do {
    const url = `${API}/objects?prefix=${encodeURIComponent(PREFIX)}&per_page=1000${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (res.status === 401 || res.status === 403) throw Object.assign(new Error('Token Cloudflare hết hạn / thiếu quyền R2. Chạy: npx wrangler login'), { fatal: true });
    if (!res.ok) throw new Error(`Không liệt kê được bucket: HTTP ${res.status}`);
    const data = await res.json();
    for (const o of data.result || []) remote.set(o.key, String(o.etag || '').replace(/"/g, ''));
    cursor = data.result_info?.is_truncated ? data.result_info.cursor : '';
  } while (cursor);
  return remote;
}

async function putObject(key, body, type, cacheControl, expectedMd5) {
  const url = `${API}/objects/${encodeURIComponent(key)}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': type, 'Cache-Control': cacheControl },
        body
      });
      if (res.status === 401 || res.status === 403) throw Object.assign(new Error('Token Cloudflare hết hạn / thiếu quyền R2. Chạy: npx wrangler login'), { fatal: true });
      if (res.ok) {
        // API có lúc trả OK mà không ghi: đối chiếu etag trong response (= MD5 với upload 1 phần).
        const data = await res.json().catch(() => null);
        const etag = String(data?.result?.etag || '').replace(/"/g, '');
        if (!expectedMd5 || etag === expectedMd5) return;
        throw new Error(`etag không khớp (${etag || 'trống'})`);
      }
      if (res.status < 500 && res.status !== 429) throw Object.assign(new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
    } catch (e) {
      if (e.fatal || attempt === 5) throw e;
    }
    await sleep(800 * attempt);
  }
}

// Ảnh do nút "Đồng bộ Drive → R2" trên web thêm vào (có driveId) không nằm trong
// thư mục máy, nên manifest build từ máy không có. Gộp lại từ manifest đang chạy
// trên R2 để lần cập nhật từ máy không xoá mất chúng. Trùng tên file gốc thì bỏ
// (ảnh đó đã được tải về máy và build lại).
async function keepWebSyncedImages(local) {
  const res = await fetch(`${API}/objects/${encodeURIComponent(PREFIX + 'manifest.json')}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`Không đọc được manifest trên R2: HTTP ${res.status} - manifest.json CHƯA được cập nhật.`);
  const remote = JSON.parse(await res.text());
  const nameKey = (n) => String(n || '').normalize('NFC').trim().toLowerCase();
  let kept = 0;
  for (const ra of remote.albums || []) {
    const synced = (ra.images || []).filter((img) => img.driveId);
    let la = local.albums.find((a) => a.id === ra.id);
    // Ảnh chia sẻ do make-share-images.mjs tạo trên R2 cho album chưa build lại từ máy.
    if (la && !la.shareUrl && ra.shareUrl) la.shareUrl = ra.shareUrl;
    if (!synced.length) {
      if (la && ra.driveFolderId) la.driveFolderId = ra.driveFolderId;
      continue;
    }
    if (!la) {
      la = { ...ra, images: [] };
      local.albums.push(la);
    }
    const names = new Set(la.images.map((img) => nameKey(img.name)));
    const ids = new Set(la.images.map((img) => img.id));
    for (const img of synced) {
      if (names.has(nameKey(img.name)) || ids.has(img.id)) continue;
      la.images.push(img);
      kept++;
    }
    if (ra.driveFolderId) la.driveFolderId = ra.driveFolderId;
    la.imageCount = la.images.length;
    if (!la.coverUrl && la.images[0]) {
      la.coverUrl = la.images[0].thumbnailUrl;
      la.coverImageUrl = la.images[0].url;
    }
  }
  local.albums.sort((a, b) => (b.order || 0) - (a.order || 0));
  local.categories = [...new Set(local.albums.map((a) => a.category))];
  return kept;
}

async function runPool(tasks, limit) {
  let next = 0;
  async function worker() {
    while (next < tasks.length) await tasks[next++]();
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

async function main() {
  if (!fs.existsSync(path.join(SRC, 'manifest.json'))) throw new Error('Chưa có .cache/photos/manifest.json — chạy build-photos.mjs trước.');
  const state = !FORCE_ALL && fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
  const files = walk(SRC).filter((f) => !f.endsWith('manifest.json'));
  const stats = { uploaded: 0, skipped: 0, failed: 0 };
  const failures = [];
  let fatal = null;

  console.log('Đang liệt kê file trên R2...');
  const remote = await listRemote();
  console.log(`R2 đang có ${remote.size} file dưới ${PREFIX}`);

  const tasks = files.map((file) => async () => {
    if (fatal) return;
    const key = PREFIX + path.relative(SRC, file).split(path.sep).join('/');
    const buf = fs.readFileSync(file);
    const hash = md5(buf);
    if (state[key] === hash && remote.get(key) === hash) { stats.skipped++; return; }
    try {
      await putObject(key, buf, contentType(file), 'public, max-age=31536000, immutable', hash);
      state[key] = hash;
      stats.uploaded++;
      if (stats.uploaded % 100 === 0) {
        console.log(`  đã đẩy ${stats.uploaded} file...`);
        fs.writeFileSync(STATE_FILE, JSON.stringify(state));
      }
    } catch (e) {
      if (e.fatal) { fatal = e; return; }
      stats.failed++;
      failures.push(`${key}: ${e.message}`);
    }
  });

  console.log(`Kiểm tra ${files.length} file ảnh, đẩy lên R2 ${BUCKET}/${PREFIX}...`);
  await runPool(tasks, CONCURRENCY);
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  if (fatal) throw fatal;
  if (stats.failed) {
    console.log('\nFile lỗi:\n' + failures.join('\n'));
    throw new Error(`${stats.failed} file chưa đẩy được — chạy lại để thử tiếp. manifest.json CHƯA được cập nhật.`);
  }

  // Kiểm tra lại lần cuối: mọi file local phải có trên R2 với đúng MD5.
  const after = await listRemote();
  const missing = files
    .map((f) => PREFIX + path.relative(SRC, f).split(path.sep).join('/'))
    .filter((key) => after.get(key) !== state[key]);
  if (missing.length) {
    missing.forEach((k) => delete state[k]);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
    console.log('\nFile chưa có trên R2 sau khi upload:\n' + missing.slice(0, 20).join('\n') + (missing.length > 20 ? `\n... và ${missing.length - 20} file nữa` : ''));
    throw new Error(`${missing.length} file chưa lên R2 — chạy lại để đẩy tiếp. manifest.json CHƯA được cập nhật.`);
  }

  const local = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  const kept = await keepWebSyncedImages(local);
  if (kept) console.log(`Giữ ${kept} ảnh do web đồng bộ từ Drive (không có trong E:\\Mẫu\\ANH WEB).`);
  const manifestBuf = Buffer.from(JSON.stringify(local));
  await putObject(PREFIX + 'manifest.json', manifestBuf, contentType('manifest.json'), 'public, max-age=60', md5(manifestBuf));
  console.log('\nXONG:', stats, `\nmanifest: https://img.mercistudio.net/${PREFIX}manifest.json`);
}

main().catch((e) => {
  console.error('\nLỗi:', e.message);
  process.exit(1);
});
