// Logic thuần (không I/O) cho manifest ảnh R2: photos/manifest.json.
// Dùng chung cho API admin đồng bộ Drive -> R2. Cấu trúc khớp scripts/build-photos.mjs.

export const PHOTOS_PREFIX = 'photos/';
export const MANIFEST_KEY = `${PHOTOS_PREFIX}manifest.json`;
export const WEB_MAX = 1920;
export const THUMB_MAX = 640;

export type ManifestImage = {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  // Có driveId = ảnh do web đồng bộ từ Drive (file d_<driveId>.webp), không phải từ E:\Mẫu\ANH WEB.
  driveId?: string;
};

export type ManifestAlbum = {
  id: string;
  slug: string;
  title: string;
  sub: string;
  category: string;
  categories: string[];
  sizes: string[];
  hashtags: string[];
  coverUrl: string;
  coverImageUrl: string;
  order: number;
  imageCount: number;
  images: ManifestImage[];
  driveFolderId?: string;
};

export type Manifest = {
  generatedAt: string;
  baseUrl: string;
  photosBase: string;
  categories: string[];
  albums: ManifestAlbum[];
};

export type DriveImageFile = { id: string; name: string; width?: number; height?: number };

export type AlbumTarget = {
  albumId: string;
  catSlug: string;
  albumSlug: string;
  title: string;
  category: string;
  sizes: string[];
  exists: boolean;
};

const VEST_SIZES = new Set(['S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,200}$/;

export function stripDiacritics(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function slugify(text: string) {
  return stripDiacritics(String(text || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'album';
}

const nameKey = (name: string) => String(name || '').normalize('NFC').trim().toLowerCase();

export function extractDriveFolderId(input: string) {
  const s = String(input || '').trim();
  if (!s) return '';
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return DRIVE_ID_RE.test(s) ? s : '';
}

export function emptyManifest(photosBase: string): Manifest {
  return { generatedAt: new Date(0).toISOString(), baseUrl: 'https://mercistudio.net', photosBase, categories: [], albums: [] };
}

// Slug thư mục danh mục trên R2: lấy theo album sẵn có cùng danh mục (vd "Váy cưới" -> vay-cuoi),
// để ảnh mới nằm cùng chỗ với ảnh build từ máy; danh mục mới thì slug theo tên.
export function categorySlugFor(manifest: Manifest, category: string) {
  const wanted = slugify(category);
  for (const album of manifest.albums) {
    if (slugify(album.category) !== wanted) continue;
    const fromImage = album.images[0]?.id?.split('/')[0];
    if (fromImage && SLUG_RE.test(fromImage)) return fromImage;
  }
  return wanted;
}

export function resolveAlbumTarget(manifest: Manifest, input: { category: string; folderId: string; folderName: string }): AlbumTarget {
  const byFolder = manifest.albums.find((a) => a.driveFolderId && a.driveFolderId === input.folderId);
  if (byFolder) {
    const [catSlug, albumSlug] = (byFolder.images[0]?.id || '').split('/');
    if (catSlug && albumSlug) {
      return {
        albumId: byFolder.id, catSlug, albumSlug, title: byFolder.title, category: byFolder.category,
        sizes: byFolder.sizes || [], exists: true
      };
    }
  }

  const folderName = String(input.folderName || '').trim() || 'Album';
  const category = String(input.category || '').trim() || 'Wedding';
  const catSlug = categorySlugFor(manifest, category);
  const isVestSize = slugify(category) === 'vest' && VEST_SIZES.has(folderName.toUpperCase());
  const albumSlug = isVestSize ? `vest-size-${folderName.toLowerCase()}` : slugify(folderName);
  const albumId = `static_${catSlug}_${albumSlug}`;
  const existing = manifest.albums.find((a) => a.id === albumId);
  return {
    albumId,
    catSlug,
    albumSlug,
    title: existing?.title || (isVestSize ? `Vest size ${folderName.toUpperCase()}` : folderName),
    category: existing?.category || category,
    sizes: existing?.sizes || (isVestSize ? [folderName.toUpperCase()] : []),
    exists: Boolean(existing)
  };
}

// Chỉ giữ ảnh Drive CHƯA có trong album (so theo driveId, hoặc tên file gốc
// cho ảnh đã tải về máy bằng drive-to-folder.mjs rồi build lên).
export function pickNewFiles(album: ManifestAlbum | undefined, files: DriveImageFile[]) {
  if (!album) return [...files];
  const ids = new Set(album.images.map((img) => img.driveId).filter(Boolean));
  const names = new Set(album.images.map((img) => nameKey(img.name)));
  return files.filter((f) => !ids.has(f.id) && !names.has(nameKey(f.name)));
}

export function imageKeys(catSlug: string, albumSlug: string, driveId: string, ext = 'webp') {
  const base = `${PHOTOS_PREFIX}${catSlug}/${albumSlug}/d_${driveId}`;
  return { id: `${catSlug}/${albumSlug}/d_${driveId}`, web: `${base}.${ext}`, thumb: `${base}_t.${ext}` };
}

export function fitInside(width: number | undefined, height: number | undefined, max: number) {
  if (!width || !height) return { width: undefined, height: undefined };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

// Đọc kích thước ảnh WebP từ header (Worker không decode được ảnh).
export function readWebpSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return null;
  const chunk = tag(12);
  if (chunk === 'VP8X') {
    return {
      width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
      height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16))
    };
  }
  if (chunk === 'VP8 ') {
    return { width: (buf[26] | (buf[27] << 8)) & 0x3fff, height: (buf[28] | (buf[29] << 8)) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    return {
      width: 1 + (((buf[22] & 0x3f) << 8) | buf[21]),
      height: 1 + (((buf[24] & 0x0f) << 10) | (buf[23] << 2) | ((buf[22] & 0xc0) >> 6))
    };
  }
  return null;
}

// Gộp ảnh mới vào album (tạo album nếu chưa có). Không sửa manifest gốc.
export function mergeAlbum(
  manifest: Manifest,
  target: AlbumTarget & { driveFolderId: string },
  newImages: ManifestImage[],
  now = Date.now()
): Manifest {
  const albums = manifest.albums.map((a) => ({ ...a, images: [...a.images] }));
  let album = albums.find((a) => a.id === target.albumId);
  if (!album) {
    album = {
      id: target.albumId,
      slug: target.albumSlug,
      title: target.title,
      sub: target.category,
      category: target.category,
      categories: [target.category],
      sizes: target.sizes,
      hashtags: [],
      coverUrl: '',
      coverImageUrl: '',
      order: now,
      imageCount: 0,
      images: []
    };
    albums.push(album);
  }
  const seen = new Set(album.images.map((img) => img.id));
  for (const img of newImages) {
    if (seen.has(img.id)) continue;
    seen.add(img.id);
    album.images.push(img);
  }
  album.driveFolderId = target.driveFolderId;
  album.imageCount = album.images.length;
  if (!album.coverUrl && album.images[0]) {
    album.coverUrl = album.images[0].thumbnailUrl;
    album.coverImageUrl = album.images[0].url;
  }
  albums.sort((a, b) => (b.order || 0) - (a.order || 0));
  return {
    ...manifest,
    generatedAt: new Date(now).toISOString(),
    categories: [...new Set(albums.map((a) => a.category))],
    albums
  };
}
