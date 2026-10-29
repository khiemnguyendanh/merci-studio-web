import 'server-only';
import { cachedJson } from './edge-cache';
import { albumIntro } from '@/lib/album-copy';

type FirestoreValue = { stringValue?: string; integerValue?: string; doubleValue?: number };
type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };

export type PublicContentMetadata = {
  type: 'album' | 'blog';
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  imageCount?: number;
  category?: string;
};

type ManifestAlbum = {
  id: string;
  slug?: string;
  title?: string;
  sub?: string;
  category?: string;
  coverUrl?: string;
  coverImageUrl?: string;
  shareUrl?: string;
  imageCount?: number;
  images?: { url?: string }[];
};

// Metadata/sitemap được gọi ở MỌI lượt render trang album/blog (kể cả bot) —
// phải cache ở biên, nếu không mỗi lượt xem = ~150 lượt đọc Firestore.
const METADATA_CACHE_SECONDS = 3600;
// Album hiển thị trên web lấy từ manifest R2 (không còn từ Firestore merci_albums).
const MANIFEST_CACHE_SECONDS = 600;
const PHOTOS_BASE = (process.env.NEXT_PUBLIC_PHOTOS_BASE || 'https://img.mercistudio.net/photos').replace(/\/+$/, '');

function field(document: FirestoreDocument, name: string) {
  return document.fields?.[name]?.stringValue || '';
}

function createSlug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
}

async function fetchCollection(collection: string, masks: string[]): Promise<FirestoreDocument[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return [];
  const { data } = await cachedJson<FirestoreDocument[]>(
    `metadata/${collection}/${masks.join(',')}`,
    METADATA_CACHE_SECONDS,
    async () => {
      const params = new URLSearchParams({ key: apiKey, pageSize: '300' });
      masks.forEach((mask) => params.append('mask.fieldPaths', mask));
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?${params}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return null;
      const json = await response.json() as { documents?: FirestoreDocument[] };
      return Array.isArray(json.documents) ? json.documents : [];
    }
  );
  return data ?? [];
}

// Chỉ giữ trường cần cho SEO để bản cache nhỏ (manifest gốc ~800 KB vì có danh sách ảnh).
async function fetchManifestAlbums(): Promise<ManifestAlbum[]> {
  const { data } = await cachedJson<ManifestAlbum[]>('metadata/photos-manifest-v2', MANIFEST_CACHE_SECONDS, async () => {
    const response = await fetch(`${PHOTOS_BASE}/manifest.json`, { cache: 'no-store' });
    if (!response.ok) return null;
    const json = await response.json() as { albums?: ManifestAlbum[] };
    if (!Array.isArray(json.albums)) return null;
    return json.albums.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      sub: a.sub,
      category: a.category,
      coverUrl: a.coverUrl,
      coverImageUrl: a.coverImageUrl,
      shareUrl: a.shareUrl,
      imageCount: a.imageCount || a.images?.length || 0
    }));
  });
  return data ?? [];
}

function albumToContent(album: ManifestAlbum): PublicContentMetadata {
  const title = String(album.title || '').trim();
  const count = album.imageCount || 0;
  return {
    type: 'album',
    title,
    slug: album.slug || createSlug(title) || album.id,
    description: `${title}${count ? ` - ${count} ảnh` : ''}. ${albumIntro(album)}`,
    // Ưu tiên share-*.jpg 1200x630 (Facebook không đọc ổn định WebP), rồi mới tới ảnh bìa 1920px.
    coverUrl: album.shareUrl || album.coverImageUrl || album.coverUrl || '',
    imageCount: count,
    category: album.category || album.sub || ''
  };
}

function blogToContent(document: FirestoreDocument, slug?: string): PublicContentMetadata {
  const title = field(document, 'title');
  const canonicalSlug = slug || field(document, 'slug') || createSlug(title) || document.name.split('/').pop() || '';
  return {
    type: 'blog',
    title,
    slug: canonicalSlug,
    description: field(document, 'metaDesc') || title,
    coverUrl: field(document, 'coverUrl')
  };
}

function fetchBlogs() {
  return fetchCollection('merci_blogs', ['title', 'slug', 'metaDesc', 'coverUrl']);
}

export async function findPublicContent(slug: string): Promise<PublicContentMetadata | null> {
  const [albums, blogs] = await Promise.all([fetchManifestAlbums(), fetchBlogs()]);
  const album = albums.find((a) => a.slug === slug || createSlug(a.title || '') === slug || a.id === slug);
  if (album) return albumToContent(album);
  const blog = blogs.find((document) => {
    const id = document.name.split('/').pop() || '';
    const title = field(document, 'title');
    return field(document, 'slug') === slug || createSlug(title) === slug || id === slug;
  });
  return blog ? blogToContent(blog, slug) : null;
}

export async function listPublicContent(): Promise<PublicContentMetadata[]> {
  const [albums, blogs] = await Promise.all([fetchManifestAlbums(), fetchBlogs()]);
  const seen = new Set<string>();
  const content = [...albums.map(albumToContent), ...blogs.map((blog) => blogToContent(blog))];
  return content.filter((item) => {
    if (!item.title || !item.slug || seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}
