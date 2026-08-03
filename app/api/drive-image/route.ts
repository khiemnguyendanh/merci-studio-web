import { NextRequest, NextResponse } from 'next/server';
import { ApiError, enforceRateLimit, errorResponse, getClientIp } from '@/lib/server/api-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    enforceRateLimit(`drive-image:${getClientIp(req)}`, 120, 60 * 1000);
    const fileId = req.nextUrl.searchParams.get('id');

    if (!fileId || !/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
      throw new ApiError(400, 'Google Drive file ID không hợp lệ.');
    }

    // Redirect trực tiếp về link download của Google Drive để tiết kiệm băng thông Vercel
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return NextResponse.redirect(downloadUrl, 302);
  } catch (error) {
    return errorResponse(error);
  }
}
