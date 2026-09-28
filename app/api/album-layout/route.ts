import { NextResponse } from 'next/server';
import { cachedJson } from '@/lib/server/edge-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bố cục album admin chỉnh trên web (ảnh bìa + thứ tự) cho app TV dùng chung.
// Nguồn: Firestore doc merci_albums/_album_layout = { order: {albumId: số}, cover: {albumId: url ảnh} }.
// Cache biên 5 phút (+ bản last-good 7 ngày) để TV không tốn quota Firestore.
const CACHE_SECONDS = 300;

type Layout = { order: Record<string, number>; cover: Record<string, string> };

async function loadLayout(): Promise<Layout | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/merci_albums/_album_layout?key=${apiKey}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (response.status === 404) return { order: {}, cover: {} };
  if (!response.ok) return null;
  const doc = await response.json() as { fields?: Record<string, any> };
  const mapOf = (key: string) => doc.fields?.[key]?.mapValue?.fields ?? {};
  const order: Record<string, number> = {};
  const cover: Record<string, string> = {};
  for (const [id, v] of Object.entries<any>(mapOf('order'))) {
    const n = Number(v.integerValue ?? v.doubleValue);
    if (Number.isFinite(n)) order[id] = n;
  }
  for (const [id, v] of Object.entries<any>(mapOf('cover'))) {
    const s = v.stringValue ?? v.mapValue?.fields?.url?.stringValue;
    if (typeof s === 'string' && s) cover[id] = s;
  }
  return { order, cover };
}

export async function GET() {
  const result = await cachedJson<Layout>('album-layout/v1', CACHE_SECONDS, loadLayout);
  return NextResponse.json(result.data ?? { order: {}, cover: {} }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      'X-Data-Cache': result.status
    }
  });
}
