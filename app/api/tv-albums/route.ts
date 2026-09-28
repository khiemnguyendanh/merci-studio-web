import { NextResponse } from 'next/server';
import { cachedJson } from '@/lib/server/edge-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Dữ liệu cho app Merci Studio TV (dạng Firestore REST để app parse sẵn).
// Cache ở biên Cloudflare 1 giờ + bản "last-good" 7 ngày khi Firestore lỗi/hết quota.
const CACHE_SECONDS = 3600;

type FirestoreCollection = { documents?: unknown[] };

async function loadCollection(collection: string, masks: string[]): Promise<FirestoreCollection | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  const params = new URLSearchParams({ key: apiKey, pageSize: '300' });
  masks.forEach((mask) => params.append('mask.fieldPaths', mask));
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?${params}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json() as FirestoreCollection;
  return { documents: Array.isArray(data.documents) ? data.documents : [] };
}

export async function GET() {
  const [albums, videos] = await Promise.all([
    cachedJson<FirestoreCollection>('tv-albums/albums', CACHE_SECONDS, () =>
      loadCollection('merci_albums', ['title', 'slug', 'sub', 'category', 'coverUrl', 'order', 'images'])),
    cachedJson<FirestoreCollection>('tv-albums/videos-v2', CACHE_SECONDS, () =>
      loadCollection('merci_videos', ['title', 'url', 'youtubeId', 'order']))
  ]);
  return NextResponse.json(
    { albums: albums.data ?? { documents: [] }, videos: videos.data ?? { documents: [] } },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        'X-Data-Cache': `${albums.status},${videos.status}`
      }
    }
  );
}
