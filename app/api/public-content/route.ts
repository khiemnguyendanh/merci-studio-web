import { NextResponse } from 'next/server';
import { cachedJson } from '@/lib/server/edge-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dữ liệu công khai (albums + videos) cho KHÁCH truy cập website.
// Cache ở biên Cloudflare (Cache API) 1 giờ + bản "last-good" 7 ngày dùng khi
// Firestore lỗi/hết quota → khách luôn thấy album, Firestore chỉ tốn ~1 lượt đọc/giờ.
// Admin vẫn dùng onSnapshot realtime riêng phía client.
const CACHE_SECONDS = 3600;

type FirestoreValue = Record<string, unknown>;
type PlainDoc = Record<string, unknown> & { id: string };

function decodeValue(value: FirestoreValue | null | undefined): unknown {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] })?.values ?? [];
    return values.map(decodeValue);
  }
  if ('mapValue' in value) {
    return decodeFields((value.mapValue as { fields?: Record<string, FirestoreValue> })?.fields ?? {});
  }
  return null;
}

function decodeFields(fields: Record<string, FirestoreValue>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(fields)) out[key] = decodeValue(fields[key]);
  return out;
}

async function loadCollection(collection: string, masks: string[]): Promise<PlainDoc[] | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  // Chỉ trả các field công khai — tránh lộ driveLink/folderId/ownerEmail... cho khách.
  const params = new URLSearchParams({ key: apiKey, pageSize: '300' });
  masks.forEach((mask) => params.append('mask.fieldPaths', mask));
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?${params}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json() as { documents?: Array<{ name: string; fields?: Record<string, FirestoreValue> }> };
  return (data.documents ?? []).map((doc) => ({
    id: doc.name.split('/').pop() ?? '',
    ...decodeFields(doc.fields ?? {})
  }));
}

export async function GET() {
  // '-v2': bump key cache sau khi thêm field mask (tránh phục vụ bản cũ chưa mask
  // đã nằm trong Cache API 1h — cache nội bộ worker không tự đổi khi deploy).
  const [albums, videos] = await Promise.all([
    cachedJson<PlainDoc[]>('public-content/albums-v2', CACHE_SECONDS, () =>
      loadCollection('merci_albums', ['title', 'slug', 'sub', 'category', 'coverUrl', 'coverId', 'order', 'images'])),
    cachedJson<PlainDoc[]>('public-content/videos-v2', CACHE_SECONDS, () =>
      loadCollection('merci_videos', ['title', 'url', 'youtubeId', 'order', 'thumbnail']))
  ]);
  return NextResponse.json(
    { albums: albums.data ?? [], videos: videos.data ?? [] },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'X-Data-Cache': `${albums.status},${videos.status}`
      }
    }
  );
}
