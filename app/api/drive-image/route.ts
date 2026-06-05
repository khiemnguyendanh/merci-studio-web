import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const fileId = req.nextUrl.searchParams.get('id');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  if (!fileId) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Google API key' }, { status: 500 });
  }

  const urls = [
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w4096`,
  ];

  let lastError = '';

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        cache: 'no-store',
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        lastError = `${res.status} ${res.statusText}`;
        continue;
      }

      const buffer = await res.arrayBuffer();

      if (!buffer || buffer.byteLength === 0) {
        lastError = 'Empty image buffer';
        continue;
      }

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType.startsWith('image/') ? contentType : 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error: any) {
      lastError = error?.message || 'Unknown fetch error';
    }
  }

  return NextResponse.json(
    { error: 'Cannot fetch image from Google Drive', detail: lastError },
    { status: 502 }
  );
}