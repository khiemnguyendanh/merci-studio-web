import { NextRequest, NextResponse } from 'next/server';
import { ApiError, enforceRateLimit, errorResponse, getClientIp } from '@/lib/server/api-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
  enforceRateLimit(`drive-image:${getClientIp(req)}`, 120, 60 * 1000);
  const fileId = req.nextUrl.searchParams.get('id');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  if (!fileId || !/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
    throw new ApiError(400, 'Google Drive file ID không hợp lệ.');
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

      const contentLength = Number(res.headers.get('content-length') || 0);
      if (contentLength > 30 * 1024 * 1024) {
        lastError = 'Image exceeds 30 MB limit';
        continue;
      }
      if (!contentType.startsWith('image/')) {
        lastError = 'Upstream response is not an image';
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
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : 'Unknown fetch error';
    }
  }

  return NextResponse.json(
    { error: 'Cannot fetch image from Google Drive', detail: lastError },
    { status: 502 }
  );
  } catch (error) {
    return errorResponse(error);
  }
}
