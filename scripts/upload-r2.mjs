// Đẩy ảnh đã nén (.cache/photos) lên Cloudflare R2 bucket `merci-photos`, prefix `photos/`.
// Chỉ upload file mới hoặc đã thay đổi (so bằng MD5 với .cache/r2-state.json);
// manifest.json luôn upload cuối cùng. Xác thực bằng token của `wrangler login`
// (hoặc đặt CLOUDFLARE_API_TOKEN). Chạy: node scripts/upload-r2.mjs [--all]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '29ca4c452d80113d4c92e1b7c31e820b';
const BUCKET = process.env.R2_BUCKET || 'merci-photos';
const PREFIX = 'photos/';
const SRC = path.join(process.cwd(), '.cache', 'photos');
const STATE_FILE = path.join(process.cwd(), '.cache', 'r2-state.json');
const CONCURRENCY = 8;
const FORCE_ALL = process.argv.includes('--all');

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
const contentType = (file) => file.endsWith('.webp') ? 'image/webp' : file.endsWith('.json') ? 'application/json; charset=utf-8' : 'application/octet-stream';

async function putObject(key, body, type, cacheControl) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': type, 'Cache-Control': cacheControl },
        body
      });
      if (res.status === 401 || res.status === 403) throw Object.assign(new Error('Token Cloudflare hết hạn / thiếu quyền R2. Chạy: npx wrangler login'), { fatal: true });
      if (res.ok) return;
      if (res.status < 500 && res.status !== 429) throw Object.assign(new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`), { fatal: true });
    } catch (e) {
      if (e.fatal || attempt === 4) throw e;
    }
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
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

  const tasks = files.map((file) => async () => {
    if (fatal) return;
    const key = PREFIX + path.relative(SRC, file).split(path.sep).join('/');
    const buf = fs.readFileSync(file);
    const hash = md5(buf);
    if (state[key] === hash) { stats.skipped++; return; }
    try {
      await putObject(key, buf, contentType(file), 'public, max-age=31536000, immutable');
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

  await putObject(PREFIX + 'manifest.json', fs.readFileSync(path.join(SRC, 'manifest.json')), contentType('manifest.json'), 'public, max-age=60');
  console.log('\nXONG:', stats, `\nmanifest: https://img.mercistudio.net/${PREFIX}manifest.json`);
}

main().catch((e) => {
  console.error('\nLỗi:', e.message);
  process.exit(1);
});
