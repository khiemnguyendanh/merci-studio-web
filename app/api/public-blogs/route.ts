import { NextResponse } from 'next/server';
import { publicBlogs } from '@/lib/server/blogs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Danh sach blog cho khach (xem lib/server/blogs.ts). Admin van nghe realtime
// tu Firestore phia trinh duyet de sua/xoa bai.
export async function GET() {
  const { blogs, status } = await publicBlogs();
  return NextResponse.json(
    { blogs },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400', 'X-Data-Cache': status } }
  );
}
