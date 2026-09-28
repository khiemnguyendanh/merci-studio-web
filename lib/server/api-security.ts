import 'server-only';

import { NextResponse } from 'next/server';
import { adminAuth, type DecodedIdToken } from './firebase-admin';
export { cleanString, hashValue, normalizePhone } from './validation';

type RateEntry = { count: number; resetAt: number };
const rateStore = new Map<string, RateEntry>();

function pruneRateStore(now: number) {
  if (rateStore.size <= 5000) return;
  for (const [key, entry] of rateStore) {
    if (entry.resetAt <= now) rateStore.delete(key);
  }
  if (rateStore.size > 5000) rateStore.clear();
}

// Email admin chỉ đọc từ biến môi trường server (ADMIN_EMAILS).
// KHÔNG dùng NEXT_PUBLIC_* ở server: mọi thứ tiền tố NEXT_PUBLIC_ đều bị nhét vào
// bundle phía client, lộ danh sách admin + có thể bị lợi dụng cho fallback.
const configuredAdminEmails = new Set(
  [
    'khiemnguyendanh@gmail.com',
    ...(process.env.ADMIN_EMAILS || '').split(',')
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
  return getClientIpFromHeaders(request.headers);
}

// Trên Cloudflare Workers chỉ `cf-connecting-ip` là giá trị hạ tầng ghi, không giả
// mạo được. `x-forwarded-for` do client tự gửi nên chỉ dùng làm fallback cuối.
export function getClientIpFromHeaders(headers: Headers) {
  const direct = headers.get('cf-connecting-ip') || headers.get('x-real-ip');
  if (direct) return direct.trim();
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  pruneRateStore(now);
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
  // Đường chính: custom claim admin=true (set bằng `npm run admin:set-claim`).
  if (token.admin === true) return token;

  // Fallback theo email CHỈ khi email đã được xác minh trong Firebase Auth.
  // Nếu không, kẻ tấn công có thể tự đăng ký trước một địa chỉ trong ADMIN_EMAILS
  // (email chưa verify) và chiếm quyền admin.
  const email = String(token.email || '').toLowerCase();
  const emailVerified = (token as { email_verified?: boolean }).email_verified === true;
  if (email && emailVerified && configuredAdminEmails.has(email)) {
    return token;
  }
  throw new ApiError(403, 'Tài khoản không có quyền quản trị.');
}

export function escapeTelegram(value: string) {
  // MarkdownV2: phải escape cả backslash (nếu không, tên có '\' sẽ làm hỏng parse → mất thông báo)
  return value.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
