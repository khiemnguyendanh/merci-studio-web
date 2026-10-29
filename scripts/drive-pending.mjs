// Xử lý hàng chờ ảnh Drive mà web KHÔNG tự nén được (HEIC, ảnh Google chưa có
// bản thu nhỏ...). Nút "Đồng bộ Drive → R2" trên web ghi các ảnh này vào
// R2 photos/drive-pending.json; script này chạy trên máy tính:
//   tải ảnh gốc từ Drive -> sharp (+ ffmpeg cho HEIC) nén WebP 1920px + thumbnail 640px
//   -> đẩy lên R2 cùng tên file web dùng (d_<driveId>.webp) -> gộp vào manifest.json
//   -> xoá khỏi hàng chờ.
// Chạy: node scripts/drive-pending.mjs   (hoặc DONG-BO-ANH-CHO.bat)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '29ca4c452d80113d4c92e1b7c31e820b';
const BUCKET = process.env.R2_BUCKET || 'merci-photos';
const PREFIX = 'photos/';
const PENDING_KEY = `${PREFIX}drive-pending.json`;
const MANIFEST_KEY = `${PREFIX}manifest.json`;
const PUBLIC_BASE = (process.env.PHOTOS_PUBLIC_BASE || 'https://img.mercistudio.net/photos').replace(/\/+$/, '');
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}`;
const WEB_MAX = 1920;
const THUMB_MAX = 640;
const CONCURRENCY = 3;
const VEST_SIZES = new Set(['S', 'M', 'L', 'XL', 'XXL', 'XXXL']);

function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();
const DRIVE_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfg = path.join(os.homedir(), '.wrangler', 'config', 'default.toml');
  if (!fs.existsSync(cfg)) throw new Error('Chưa đăng nhập Cloudflare. Chạy: npx wrangler login');
  const m = fs.readFileSync(cfg, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('Không đọc được token Cloudflare. Chạy: npx wrangler login');
  return m[1];
}
const TOKEN = loadToken();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');

function authError(res) {
  if (res.status === 401 || res.status === 403) {
    throw Object.assign(new Error('Token Cloudflare hết hạn / thiếu quyền R2. Chạy: npx wrangler login'), { fatal: true });
  }
}

async function getJson(key) {
  const res = await fetch(`${API}/objects/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  authError(res);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Không đọc được ${key}: HTTP ${res.status}`);
  return JSON.parse(await res.text());
}

async function putObject(key, body, type, cacheControl) {
  const expected = md5(body);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${API}/objects/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': type, 'Cache-Control': cacheControl },
        body
      });
      authError(res);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const etag = String(data?.result?.etag || '').replace(/"/g, '');
        if (etag === expected) return;
        throw new Error(`etag không khớp (${etag || 'trống'})`);
      }
      if (res.status < 500 && res.status !== 429) {
        throw Object.assign(new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
      }
    } catch (e) {
      if (e.fatal || attempt === 5) throw e;
    }
    await sleep(800 * attempt);
  }
}
const putJson = (key, value, cacheControl) =>
  putObject(key, Buffer.from(JSON.stringify(value)), 'application/json; charset=utf-8', cacheControl);

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function slugify(text) {
  return stripDiacritics(String(text || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'album';
}

// Cùng quy tắc với lib/server/photo-manifest.ts (resolveAlbumTarget).
function resolveTarget(manifest, { category, folderId, folderName }) {
  const byFolder = manifest.albums.find((a) => a.driveFolderId === folderId);
  const fromFolder = byFolder?.images?.[0]?.id?.split('/');
  if (byFolder && fromFolder?.length >= 2) {
    return { albumId: byFolder.id, catSlug: fromFolder[0], albumSlug: fromFolder[1], title: byFolder.title, category: byFolder.category, sizes: byFolder.sizes || [] };
  }
  const name = String(folderName || '').trim() || 'Album';
  const wanted = slugify(category);
  let catSlug = wanted;
  for (const a of manifest.albums) {
    const s = a.images?.[0]?.id?.split('/')[0];
    if (slugify(a.category) === wanted && s) { catSlug = s; break; }
  }
  const isVestSize = wanted === 'vest' && VEST_SIZES.has(name.toUpperCase());
  const albumSlug = isVestSize ? `vest-size-${name.toLowerCase()}` : slugify(name);
  const albumId = `static_${catSlug}_${albumSlug}`;
  const existing = manifest.albums.find((a) => a.id === albumId);
  return {
    albumId, catSlug, albumSlug,
    title: existing?.title || (isVestSize ? `Vest size ${name.toUpperCase()}` : name),
    category: existing?.category || category,
    sizes: existing?.sizes || (isVestSize ? [name.toUpperCase()] : [])
  };
}

function mergeInto(manifest, target, folderId, images) {
  let album = manifest.albums.find((a) => a.id === target.albumId);
  if (!album) {
    album = {
      id: target.albumId, slug: target.albumSlug, title: target.title, sub: target.category,
      category: target.category, categories: [target.category], sizes: target.sizes, hashtags: [],
      coverUrl: '', coverImageUrl: '', order: Date.now(), imageCount: 0, images: []
    };
    manifest.albums.push(album);
  }
  const seen = new Set(album.images.map((i) => i.id));
  for (const img of images) if (!seen.has(img.id)) { seen.add(img.id); album.images.push(img); }
  album.driveFolderId = folderId;
  album.imageCount = album.images.length;
  if (!album.coverUrl && album.images[0]) {
    album.coverUrl = album.images[0].thumbnailUrl;
    album.coverImageUrl = album.images[0].url;
  }
}

async function downloadDrive(fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&key=${DRIVE_KEY}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`tải Drive HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function viaFfmpeg(buf, ext) {
  const id = crypto.randomBytes(6).toString('hex');
  const src = path.join(os.tmpdir(), `merci_pend_${id}${ext}`);
  const out = path.join(os.tmpdir(), `merci_pend_${id}.png`);
  fs.writeFileSync(src, buf);
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-frames:v', '1', '-update', '1', out], { stdio: 'ignore' });
    return fs.readFileSync(out);
  } finally {
    for (const f of [src, out]) { try { fs.unlinkSync(f); } catch {} }
  }
}

async function encode(input) {
  const image = sharp(input, { failOn: 'none' }).rotate();
  const web = await image.clone()
    .resize({ width: WEB_MAX, height: WEB_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 }).toBuffer({ resolveWithObject: true });
  const thumb = await image.clone()
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75, effort: 4 }).toBuffer();
  return { web: web.data, thumb, width: web.info.width, height: web.info.height };
}

async function convert(buf, name) {
  const ext = path.extname(name).toLowerCase() || '.jpg';
  if (ext === '.heic' || ext === '.heif') return encode(viaFfmpeg(buf, ext));
  try {
    return await encode(buf);
  } catch {
    return encode(viaFfmpeg(buf, ext)); // vd .jpg nhưng ruột là HEVC
  }
}

async function runPool(tasks, limit) {
  let next = 0;
  async function worker() { while (next < tasks.length) await tasks[next++](); }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

async function main() {
  if (!DRIVE_KEY) throw new Error('Thiếu NEXT_PUBLIC_GOOGLE_API_KEY trong .env.local');
  const pending = await getJson(PENDING_KEY);
  const items = pending?.items || [];
  if (!items.length) {
    console.log('Không có ảnh nào đang chờ. Mọi ảnh từ Drive đã lên web.');
    return;
  }
  console.log(`Có ${items.length} ảnh đang chờ xử lý.\n`);

  const manifestNow = (await getJson(MANIFEST_KEY)) || { albums: [] };
  const results = []; // { item, target, image }
  const gone = new Set();
  const failures = [];
  let fatal = null;

  await runPool(items.map((item) => async () => {
    if (fatal) return;
    try {
      const buf = await downloadDrive(item.fileId);
      if (!buf) { gone.add(item.fileId); console.log(`- bỏ (đã xoá khỏi Drive): ${item.name}`); return; }
      const out = await convert(buf, item.name);
      const target = resolveTarget(manifestNow, item);
      const id = `${target.catSlug}/${target.albumSlug}/d_${item.fileId}`;
      await putObject(`${PREFIX}${id}.webp`, out.web, 'image/webp', 'public, max-age=31536000, immutable');
      await putObject(`${PREFIX}${id}_t.webp`, out.thumb, 'image/webp', 'public, max-age=31536000, immutable');
      results.push({
        item, target,
        image: {
          id, name: item.name,
          url: `${PUBLIC_BASE}/${id}.webp`, thumbnailUrl: `${PUBLIC_BASE}/${id}_t.webp`,
          width: out.width, height: out.height, driveId: item.fileId
        }
      });
      console.log(`V ${item.folderName} / ${item.name}`);
    } catch (e) {
      if (e.fatal) { fatal = e; return; }
      failures.push(`${item.folderName}/${item.name}: ${e.message}`);
    }
  }), CONCURRENCY);
  if (fatal) throw fatal;

  // Đọc lại manifest + hàng chờ NGAY trước khi ghi để không đè thay đổi web vừa làm.
  if (results.length) {
    const manifest = (await getJson(MANIFEST_KEY)) || { baseUrl: 'https://mercistudio.net', photosBase: PUBLIC_BASE, albums: [] };
    const byAlbum = new Map();
    for (const r of results) {
      const key = r.target.albumId;
      if (!byAlbum.has(key)) byAlbum.set(key, { target: r.target, folderId: r.item.folderId, images: [] });
      byAlbum.get(key).images.push(r.image);
    }
    for (const { target, folderId, images } of byAlbum.values()) {
      images.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
      mergeInto(manifest, target, folderId, images);
    }
    manifest.albums.sort((a, b) => (b.order || 0) - (a.order || 0));
    manifest.categories = [...new Set(manifest.albums.map((a) => a.category))];
    manifest.generatedAt = new Date().toISOString();
    await putJson(MANIFEST_KEY, manifest, 'public, max-age=60');
  }

  const done = new Set([...results.map((r) => r.item.fileId), ...gone]);
  const latest = (await getJson(PENDING_KEY)) || { items: [] };
  const left = (latest.items || []).filter((it) => !done.has(it.fileId));
  await putJson(PENDING_KEY, { updatedAt: new Date().toISOString(), items: left }, 'no-store');

  console.log(`\nXONG: đã lên web ${results.length} ảnh, còn chờ ${left.length}.`);
  if (failures.length) {
    console.log('\nẢnh lỗi (để lại hàng chờ, chạy lại sau):\n' + failures.join('\n'));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('\nLỗi:', e.message);
  process.exit(1);
});
