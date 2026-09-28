// Pipeline ảnh tĩnh cho Cloudflare:
//   E:\Mẫu\ANH WEB\<Danh mục>\<Album>\*.jpg|png|webp|heic
//   -> public/photos/<cat-slug>/<album-slug>/NNN.webp   (web, tối đa 1920px, q80)
//   -> public/photos/<cat-slug>/<album-slug>/NNN_t.webp (thumbnail 640px, q75)
//   -> public/photos/manifest.json                      (danh sách album cho website + app TV)
// Chạy: node scripts/build-photos.mjs ["đường dẫn thư mục nguồn"]
// Chạy lại nhiều lần an toàn: file đã xử lý (mới hơn file gốc) được bỏ qua.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const HEIC_EXT = new Set(['.heic', '.heif']);

// sharp trên máy này không giải mã được HEIC (libheif thiếu HEVC decoder);
// ffmpeg (đã cài) giải mã tốt -> chuyển HEIC sang PNG tạm rồi để sharp xử lý tiếp.
function inputForSharp(srcPath) {
  const ext = path.extname(srcPath).toLowerCase();
  if (!HEIC_EXT.has(ext)) return { input: srcPath, cleanup: null };
  const tmp = path.join(os.tmpdir(), `merci_heic_${crypto.randomBytes(6).toString('hex')}.png`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', srcPath, '-frames:v', '1', '-update', '1', tmp], {
    stdio: ['ignore', 'ignore', 'ignore']
  });
  return { input: fs.readFileSync(tmp), cleanup: () => { try { fs.unlinkSync(tmp); } catch {} } };
}

// Tên thư mục tiếng Việt trên NTFS có thể lưu ở dạng Unicode NFD — so khớp sau khi chuẩn hoá.
function resolveSource(requested) {
  if (fs.existsSync(requested)) return requested;
  const parts = path.resolve(requested).split(path.sep);
  let current = parts[0] + path.sep;
  for (const part of parts.slice(1)) {
    if (!part) continue;
    const wanted = part.normalize('NFC').toLowerCase();
    const found = fs.readdirSync(current).find((name) => name.normalize('NFC').toLowerCase() === wanted);
    if (!found) return requested;
    current = path.join(current, found);
  }
  return current;
}
const SOURCE = resolveSource(process.argv[2] || 'E:\\Mẫu\\ANH WEB');
const OUT_ROOT = path.join(process.cwd(), 'public', 'photos');
const WEB_MAX = 1920;
const THUMB_MAX = 640;
const CONCURRENCY = 6;
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);

// Tên thư mục -> tên danh mục đúng như chip trên website
const CATEGORY_MAP = {
  'baby': 'Baby / Family',
  'concept': 'Concept',
  'event': 'Event',
  'ky yeu': 'Kỷ Yếu',
  'makeup': 'Make up',
  'make up': 'Make up',
  'phong su cuoi': 'Phóng sự cưới',
  'prewedding': 'Wedding',
  'pre-wedding': 'Wedding',
  'wedding': 'Wedding',
  'vay cuoi': 'Váy cưới',
  'vest': 'Vest'
};
const SKIP_CATEGORIES = new Set(['feedback']);
const VEST_SIZES = new Set(['S', 'M', 'L', 'XL', 'XXL', 'XXXL']);

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function slugify(text) {
  return stripDiacritics(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'album';
}
function folderKey(name) {
  return stripDiacritics(name).toLowerCase().replace(/\s+/g, ' ').trim();
}
function listDirs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort((a, b) => a.localeCompare(b, 'vi'));
}
function listImages(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && IMAGE_EXT.has(path.extname(d.name).toLowerCase()))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
}
function isFresh(src, out) {
  try {
    return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
  } catch {
    return false;
  }
}

async function processImage(srcPath, webPath, thumbPath) {
  let meta;
  if (isFresh(srcPath, webPath) && isFresh(srcPath, thumbPath)) {
    meta = await sharp(webPath).metadata();
    return { width: meta.width, height: meta.height, skipped: true };
  }
  async function encode(input) {
    const image = sharp(input, { failOn: 'none' }).rotate();
    const webBuffer = await image.clone()
      .resize({ width: WEB_MAX, height: WEB_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    fs.writeFileSync(webPath, webBuffer.data);
    await image.clone()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75, effort: 4 })
      .toFile(thumbPath);
    return { width: webBuffer.info.width, height: webBuffer.info.height, skipped: false };
  }
  const { input, cleanup } = inputForSharp(srcPath);
  try {
    return await encode(input);
  } catch (firstError) {
    if (cleanup) throw firstError; // HEIC đã qua ffmpeg mà vẫn lỗi -> tính là lỗi thật
    // sharp không đọc được (vd .webp/.jpg nhưng ruột là HEVC) -> thử qua ffmpeg.
    const tmp = path.join(os.tmpdir(), `merci_fb_${crypto.randomBytes(6).toString('hex')}.png`);
    try {
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', srcPath, '-frames:v', '1', '-update', '1', tmp], {
        stdio: ['ignore', 'ignore', 'ignore']
      });
      const buf = fs.readFileSync(tmp);
      return await encode(buf);
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  } finally {
    if (cleanup) cleanup();
  }
}

async function runPool(tasks, limit) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      results[index] = await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Không tìm thấy thư mục nguồn:', SOURCE);
    process.exit(1);
  }
  fs.mkdirSync(OUT_ROOT, { recursive: true });
  const albums = [];
  const stats = { processed: 0, skipped: 0, failed: 0, albums: 0 };
  const failures = [];

  for (const categoryFolder of listDirs(SOURCE)) {
    const key = folderKey(categoryFolder);
    if (SKIP_CATEGORIES.has(key)) continue;
    // Danh mục đã biết -> dùng tên chuẩn; danh mục mới -> dùng luôn tên thư mục
    // (giữ nguyên dấu) để mọi thư mục mới đều lên web, không bị bỏ qua.
    const category = CATEGORY_MAP[key] || categoryFolder.trim();
    const catSlug = slugify(categoryFolder);
    const categoryDir = path.join(SOURCE, categoryFolder);

    // Album = mỗi thư mục con; NGOÀI RA nếu thư mục danh mục có ảnh đặt trực tiếp
    // (không tạo thư mục con) thì gom thành 1 album cùng tên danh mục.
    const albumEntries = listDirs(categoryDir).map(name => ({ name, dir: path.join(categoryDir, name) }));
    const directImages = listImages(categoryDir);
    if (directImages.length) albumEntries.unshift({ name: categoryFolder, dir: categoryDir });

    for (const entry of albumEntries) {
      const albumFolder = entry.name;
      const albumDir = entry.dir;
      const files = listImages(albumDir);
      if (!files.length) continue;
      const isVestSize = category === 'Vest' && VEST_SIZES.has(albumFolder.trim().toUpperCase());
      const albumSlug = isVestSize ? `vest-size-${albumFolder.trim().toLowerCase()}` : slugify(albumFolder);
      const outDir = path.join(OUT_ROOT, catSlug, albumSlug);
      fs.mkdirSync(outDir, { recursive: true });

      const tasks = files.map((file, index) => async () => {
        const base = String(index + 1).padStart(3, '0');
        const webPath = path.join(outDir, `${base}.webp`);
        const thumbPath = path.join(outDir, `${base}_t.webp`);
        try {
          const result = await processImage(path.join(albumDir, file), webPath, thumbPath);
          result.skipped ? stats.skipped++ : stats.processed++;
          return {
            id: `${catSlug}/${albumSlug}/${base}`,
            name: file,
            url: `/photos/${catSlug}/${albumSlug}/${base}.webp`,
            thumbnailUrl: `/photos/${catSlug}/${albumSlug}/${base}_t.webp`,
            width: result.width,
            height: result.height
          };
        } catch (error) {
          stats.failed++;
          failures.push(`${categoryFolder}/${albumFolder}/${file}: ${error.message}`);
          return null;
        }
      });
      const images = (await runPool(tasks, CONCURRENCY)).filter(Boolean);
      if (!images.length) continue;

      const folderTime = fs.statSync(albumDir).mtimeMs;
      albums.push({
        id: `static_${catSlug}_${albumSlug}`,
        slug: albumSlug,
        title: isVestSize ? `Vest size ${albumFolder.trim().toUpperCase()}` : albumFolder.trim(),
        sub: category,
        category,
        categories: [category],
        sizes: isVestSize ? [albumFolder.trim().toUpperCase()] : [],
        hashtags: [],
        coverUrl: images[0].thumbnailUrl,
        coverImageUrl: images[0].url,
        order: Math.round(folderTime),
        imageCount: images.length,
        images
      });
      stats.albums++;
      console.log(`✓ ${category} / ${albumFolder}: ${images.length} ảnh`);
    }
  }

  albums.sort((a, b) => b.order - a.order);
  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: 'https://mercistudio.net',
    categories: [...new Set(albums.map((a) => a.category))],
    albums
  };
  fs.writeFileSync(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest));
  console.log('\nXONG:', stats, '\nmanifest:', path.join(OUT_ROOT, 'manifest.json'));
  if (failures.length) console.log('\nFile lỗi (bỏ qua):\n' + failures.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
