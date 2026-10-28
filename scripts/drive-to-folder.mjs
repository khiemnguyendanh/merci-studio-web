// Tải ảnh từ Google Drive về thư mục nguồn ảnh web, để sau đó build-photos.mjs
// nén và đưa lên Cloudflare. Drive chỉ là NGUỒN NẠP — web vẫn chỉ đọc ảnh tĩnh.
//
//   Link folder Drive gốc
//     ├─ có thư mục con  -> mỗi thư mục con = 1 album  (E:\Mẫu\ANH WEB\<Danh mục>\<Tên con>\)
//     └─ có ảnh trực tiếp -> folder đó = 1 album       (E:\Mẫu\ANH WEB\<Danh mục>\<Tên folder>\)
//
// Chạy: node scripts/drive-to-folder.mjs [link1 link2 ...] [--category "Váy cưới"] [--source "E:\Mẫu\ANH WEB"]
// Thiếu link/danh mục thì sẽ hỏi trên màn hình. Ảnh đã có (trùng tên) được bỏ qua.
// Folder Drive phải để quyền "Bất kỳ ai có liên kết đều có thể xem".

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const args = process.argv.slice(2);
function takeOpt(name) {
  const i = args.indexOf(name);
  if (i === -1) return '';
  const v = args[i + 1] || '';
  args.splice(i, 2);
  return v;
}
const optCategory = takeOpt('--category');
const optSource = takeOpt('--source');

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
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

function resolveSource(requested) {
  if (fs.existsSync(requested)) return requested;
  const parts = path.resolve(requested).split(path.sep);
  let current = parts[0] + path.sep;
  for (const part of parts.slice(1)) {
    if (!part) continue;
    const wanted = part.normalize('NFC').toLowerCase();
    const found = fs.existsSync(current) && fs.readdirSync(current).find((name) => name.normalize('NFC').toLowerCase() === wanted);
    if (!found) return requested;
    current = path.join(current, found);
  }
  return current;
}
const SOURCE = resolveSource(optSource || 'E:\\Mẫu\\ANH WEB');

function extractFolderId(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{10,}$/.test(s) ? s : '';
}
function safeName(name) {
  return String(name || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim() || 'album';
}

async function driveGet(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Lỗi Google Drive API');
  return data;
}
async function listAll(q, fields) {
  const out = [];
  let pageToken = '';
  do {
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&key=${API_KEY}` +
      `&fields=nextPageToken,files(${fields})&pageSize=1000&orderBy=name` +
      (pageToken ? `&pageToken=${pageToken}` : '');
    const data = await driveGet(url);
    out.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}
const folderInfo = (id) => driveGet(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType&key=${API_KEY}`);
const subFolders = (id) => listAll(`'${id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, 'id,name');
const imagesIn = (id) => listAll(`'${id}' in parents and mimeType contains 'image/' and trashed=false`, 'id,name,size');

async function download(fileId, dest) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const tmp = dest + '.part';
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
}
async function runPool(tasks, limit) {
  let next = 0;
  async function worker() {
    while (next < tasks.length) await tasks[next++]();
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

async function main() {
  if (!API_KEY) throw new Error('Thiếu NEXT_PUBLIC_GOOGLE_API_KEY trong .env.local');
  if (!fs.existsSync(SOURCE)) throw new Error('Không tìm thấy thư mục nguồn: ' + SOURCE);

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    let links = args.filter(Boolean);
    if (!links.length) {
      console.log('Dán link folder Google Drive (nhiều link thì mỗi dòng 1 link, dòng trống để kết thúc):');
      for (;;) {
        const line = (await rl.question('> ')).trim();
        if (!line) break;
        links.push(...line.split(/\s+/));
      }
    }
    const folderIds = [...new Set(links.map(extractFolderId).filter(Boolean))];
    if (!folderIds.length) throw new Error('Không có link Drive hợp lệ.');

    const categories = fs.readdirSync(SOURCE, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort((a, b) => a.localeCompare(b, 'vi'));
    let category = optCategory;
    if (!category) {
      console.log('\nChọn danh mục:');
      categories.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
      const ans = (await rl.question('Số thứ tự (hoặc gõ tên danh mục mới): ')).trim();
      const n = parseInt(ans, 10);
      category = n >= 1 && n <= categories.length ? categories[n - 1] : ans;
    }
    if (!category) throw new Error('Chưa chọn danh mục.');
    const existingCat = categories.find((c) => c.normalize('NFC').toLowerCase() === category.normalize('NFC').toLowerCase());
    const categoryDir = path.join(SOURCE, existingCat || safeName(category));
    fs.mkdirSync(categoryDir, { recursive: true });

    const albums = [];
    for (const id of folderIds) {
      const info = await folderInfo(id);
      const subs = await subFolders(id);
      if (subs.length) {
        for (const sub of subs) albums.push({ id: sub.id, name: sub.name });
      } else {
        albums.push({ id: info.id, name: info.name });
      }
    }
    console.log(`\nDanh mục: ${path.basename(categoryDir)} — ${albums.length} album\n`);

    const stats = { downloaded: 0, skipped: 0, failed: 0 };
    for (const album of albums) {
      const files = await imagesIn(album.id);
      if (!files.length) {
        console.log(`- ${album.name}: không có ảnh (kiểm tra quyền chia sẻ)`);
        continue;
      }
      const albumDir = path.join(categoryDir, safeName(album.name));
      fs.mkdirSync(albumDir, { recursive: true });
      const existing = new Set(fs.readdirSync(albumDir).map((n) => n.normalize('NFC').toLowerCase()));
      let added = 0;
      const tasks = files.map((f) => async () => {
        const name = safeName(f.name);
        if (existing.has(name.normalize('NFC').toLowerCase())) { stats.skipped++; return; }
        try {
          await download(f.id, path.join(albumDir, name));
          stats.downloaded++;
          added++;
        } catch (e) {
          stats.failed++;
          console.log(`   ! lỗi ${album.name}/${f.name}: ${e.message}`);
        }
      });
      await runPool(tasks, 4);
      console.log(`✓ ${album.name}: ${files.length} ảnh trên Drive, tải mới ${added}`);
    }
    console.log('\nXONG:', stats, '\nThư mục:', categoryDir);
    if (stats.failed) process.exitCode = 1;
  } finally {
    rl.close();
  }
}

main().catch((e) => {
  console.error('\nLỗi:', e.message);
  process.exit(1);
});
