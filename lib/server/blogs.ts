import 'server-only';
import { cachedJson, type CacheStatus } from './edge-cache';

// Danh sach blog cong khai, dung chung cho:
//   - /api/public-blogs (trang Blog cua khach)
//   - metadata / sitemap (firestore-metadata.ts)
// Truoc day khach mo muc Blog la trinh duyet nghe thang Firestore (onSnapshot):
// moi luot mo = doc toan bo bai. 365 bai x vai tram luot/ngay vuot han muc
// mien phi 50.000 luot doc/ngay. Nay Firestore chi bi doc khi cache het han
// (1 gio, theo tung trung tam du lieu Cloudflare), khong phu thuoc so khach.
const BLOG_CACHE_SECONDS = 3600;
const PAGE = 300;

export type PublicBlog = {
  id: string;
  title: string;
  slug: string;
  metaDesc: string;
  content: string;
  coverUrl: string;
  hashtags: string[];
  createdAt: number;
  updatedAt: number;
};

type FirestoreValue = { stringValue?: string; integerValue?: string; doubleValue?: number; arrayValue?: { values?: FirestoreValue[] } };
type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };

const str = (d: FirestoreDocument, k: string) => d.fields?.[k]?.stringValue || '';
const num = (d: FirestoreDocument, k: string) => Number(d.fields?.[k]?.integerValue ?? d.fields?.[k]?.doubleValue ?? 0);

function toBlog(d: FirestoreDocument): PublicBlog {
  return {
    id: d.name.split('/').pop() || '',
    title: str(d, 'title'),
    slug: str(d, 'slug'),
    metaDesc: str(d, 'metaDesc'),
    content: str(d, 'content'),
    coverUrl: str(d, 'coverUrl'),
    hashtags: (d.fields?.hashtags?.arrayValue?.values || []).map((v) => v.stringValue || '').filter(Boolean),
    createdAt: num(d, 'createdAt'),
    updatedAt: num(d, 'updatedAt'),
  };
}

// Doc het cac trang (300 bai/trang). Loi giua chung -> null de cache dung ban cu.
async function loadAll(): Promise<PublicBlog[] | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  const out: PublicBlog[] = [];
  let pageToken = '';
  for (let i = 0; i < 20; i += 1) {
    const params = new URLSearchParams({ key: apiKey, pageSize: String(PAGE) });
    for (const f of ['title', 'slug', 'metaDesc', 'content', 'coverUrl', 'hashtags', 'createdAt', 'updatedAt']) params.append('mask.fieldPaths', f);
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/merci_blogs?${params}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const json = await response.json() as { documents?: FirestoreDocument[]; nextPageToken?: string };
    out.push(...(json.documents || []).map(toBlog));
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out;
}

export async function publicBlogs(): Promise<{ blogs: PublicBlog[]; status: CacheStatus }> {
  const { data, status } = await cachedJson<PublicBlog[]>('public-content/blogs-v1', BLOG_CACHE_SECONDS, loadAll);
  return { blogs: data ?? [], status };
}
