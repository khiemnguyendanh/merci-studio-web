// Đẩy ảnh báo giá (JPG web) lên R2: bao-gia-2026/<tên file>.jpg
// -> https://img.mercistudio.net/bao-gia-2026/... (dùng trong lib/pricing-2026.json).
// Chạy: node scripts/upload-bao-gia.mjs ["thư mục JPG web"]
// Thay ảnh trùng tên thì sau tối đa 1 giờ (Cache-Control) web mới thấy ảnh mới.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '29ca4c452d80113d4c92e1b7c31e820b';
const BUCKET = process.env.R2_BUCKET || 'merci-photos';
const PREFIX = 'bao-gia-2026/';
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}`;

function resolveSource(requested) {
  if (fs.existsSync(requested)) return requested;
  const parts = path.resolve(requested).split(path.sep);
  let current = parts[0] + path.sep;
  for (const part of parts.slice(1)) {
    if (!part) continue;
    const wanted = part.normalize('NFC').toLowerCase();
    const found = fs.existsSync(current) && fs.readdirSync(current).find((n) => n.normalize('NFC').toLowerCase() === wanted);
    if (!found) return requested;
    current = path.join(current, found);
  }
  return current;
}
const SRC = resolveSource(process.argv[2] || 'E:\\Mẫu\\Bao Gia 2026\\TAT CA BAO GIA 2026\\JPG web');

function token() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const cfg = path.join(os.homedir(), '.wrangler', 'config', 'default.toml');
  const read = () => {
    const t = fs.readFileSync(cfg, 'utf8');
    return { tok: t.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1], exp: Date.parse(t.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1] || '') || 0 };
  };
  let { tok, exp } = read();
  if (exp - Date.now() < 10 * 60 * 1000) {
    try { execSync('npx wrangler whoami', { stdio: 'ignore', timeout: 120000 }); } catch {}
    ({ tok, exp } = read());
  }
  if (!tok || exp <= Date.now()) throw new Error('Token Cloudflare hết hạn. Chạy: npx wrangler login');
  return tok;
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error('Không tìm thấy thư mục: ' + SRC);
  const TOKEN = token();
  const files = fs.readdirSync(SRC).filter((f) => /\.jpe?g$/i.test(f)).sort();
  for (const f of files) {
    const buf = fs.readFileSync(path.join(SRC, f));
    const md5 = crypto.createHash('md5').update(buf).digest('hex');
    const key = PREFIX + f.toLowerCase().replace(/\.jpeg$/, '.jpg');
    const res = await fetch(`${API}/objects/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
      body: buf
    });
    const data = await res.json().catch(() => null);
    const etag = String(data?.result?.etag || '').replace(/"/g, '');
    if (!res.ok || etag !== md5) throw new Error(`Upload lỗi ${f}: HTTP ${res.status} etag=${etag}`);
    console.log('✓', key);
  }
  console.log(`\nXONG: ${files.length} ảnh -> https://img.mercistudio.net/${PREFIX}`);
}

main().catch((e) => { console.error('\nLỗi:', e.message); process.exit(1); });
