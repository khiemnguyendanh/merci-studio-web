// Tạo ảnh chia sẻ JPEG 1200x630 (share.jpg) cho mọi album đang có trên R2 và
// ghi shareUrl vào manifest. Chạy 1 lần cho album cũ; album mới do build-photos.mjs tạo.
// Ảnh nguồn = ảnh bìa (coverImageUrl, có thể do admin đổi). Chạy: node scripts/make-share-images.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '29ca4c452d80113d4c92e1b7c31e820b';
const BUCKET = process.env.R2_BUCKET || 'merci-photos';
const PREFIX = 'photos/';
const PUBLIC_BASE = (process.env.PHOTOS_PUBLIC_BASE || 'https://img.mercistudio.net/photos').replace(/\/+$/, '');
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}`;
const FORCE = process.argv.includes('--all');

function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfg = path.join(os.homedir(), '.wrangler', 'config', 'default.toml');
  const m = fs.existsSync(cfg) && fs.readFileSync(cfg, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/);
  if (!m) throw new Error('Chưa đăng nhập Cloudflare. Chạy: npx wrangler login');
  return m[1];
}
const TOKEN = loadToken();
const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');

async function put(key, body, type, cacheControl) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(`${API}/objects/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': type, 'Cache-Control': cacheControl },
      body
    });
    if (res.status === 401 || res.status === 403) throw new Error('Token Cloudflare hết hạn. Chạy: npx wrangler login');
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (String(data?.result?.etag || '').replace(/"/g, '') === md5(body)) return;
    }
    await new Promise((r) => setTimeout(r, 700 * attempt));
  }
  throw new Error('Không ghi được ' + key);
}

async function getManifest() {
  const res = await fetch(`${API}/objects/${encodeURIComponent(PREFIX + 'manifest.json')}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error('Không đọc được manifest: HTTP ' + res.status);
  return { text: await res.text() };
}

async function main() {
  const { text } = await getManifest();
  const manifest = JSON.parse(text);
  const shareFor = new Map();
  let made = 0, skipped = 0;
  const failures = [];

  const todo = manifest.albums.filter((a) => FORCE || !a.shareUrl);
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const album = todo[next++];
      const src = album.coverImageUrl || album.images?.[0]?.url;
      const dir = (album.images?.[0]?.id || '').split('/').slice(0, 2).join('/');
      if (!src || !dir) { skipped++; continue; }
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error('tải ảnh bìa HTTP ' + res.status);
        const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer();
        // Tên có hash ảnh nguồn: đổi ảnh bìa -> URL mới, Facebook không giữ ảnh cũ.
        const key = `${PREFIX}${dir}/share-${md5(src).slice(0, 8)}.jpg`;
        await put(key, jpg, 'image/jpeg', 'public, max-age=31536000, immutable');
        shareFor.set(album.id, `${PUBLIC_BASE}/${key.slice(PREFIX.length)}`);
        made++;
      } catch (e) {
        failures.push(`${album.title}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  if (shareFor.size) {
    // Đọc lại ngay trước khi ghi để không đè thay đổi vừa có (vd nút đồng bộ Drive).
    const latest = JSON.parse((await getManifest()).text);
    for (const a of latest.albums) if (shareFor.has(a.id)) a.shareUrl = shareFor.get(a.id);
    await put(PREFIX + 'manifest.json', Buffer.from(JSON.stringify(latest)), 'application/json; charset=utf-8', 'public, max-age=60');
  }
  console.log(`XONG: tạo ${made} ảnh chia sẻ, bỏ qua ${skipped}, đã có sẵn ${manifest.albums.length - todo.length}.`);
  if (failures.length) { console.log('Lỗi:\n' + failures.join('\n')); process.exitCode = 1; }
}

main().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
