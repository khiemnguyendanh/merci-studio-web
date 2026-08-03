import 'server-only';

import { NextResponse } from 'next/server';
import { adminAuth, type DecodedIdToken } from './firebase-admin';
export { cleanString, hashValue, normalizePhone } from './validation';

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();

const configuredAdminEmails = new Set(
  [
    'khiemnguyendanh@gmail.com',
    ...(process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',')
  ]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ.' }, { status: 500 });
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= limit) {
    throw new ApiError(429, 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
  }
  entry.count += 1;
}

export async function requireUser(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, 'Bạn cần đăng nhập để tiếp tục.');

  try {
    return await adminAuth.verifyIdToken(match[1]);
  } catch {
    throw new ApiError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }
}

export async function requireAdmin(request: Request) {
  const token = await requireUser(request);
  const email = String(token.email || '').toLowerCase();
  if (token.admin !== true && !configuredAdminEmails.has(email)) {
    throw new ApiError(403, 'Tài khoản không có quyền quản trị.');
  }
  return token;
}

export function escapeTelegram(value: string) {
  return value.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
