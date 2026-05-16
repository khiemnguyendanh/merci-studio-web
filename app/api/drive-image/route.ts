import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('id');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

  if (!fileId) {
    return NextResponse.json({ error: 'Missing Google Drive file id' }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Google API key' }, { status: 500 });
  }

  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;

  try {
    const driveResponse = await fetch(mediaUrl, { cache: 'no-store' });

    if (!driveResponse.ok) {
      const text = await driveResponse.text().catch(() => '');
      return NextResponse.json(
        { error: 'Cannot fetch Google Drive image', status: driveResponse.status, detail: text.slice(0, 300) },
        { status: driveResponse.status }
      );
    }

    const contentType = driveResponse.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await driveResponse.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Drive image proxy error:', error);
    return NextResponse.json({ error: 'Drive image proxy failed' }, { status: 500 });
  }
}
