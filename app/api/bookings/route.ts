import { ApiError, cleanString, enforceRateLimit, errorResponse, escapeTelegram, getClientIp, normalizePhone, requireUser } from '@/lib/server/api-security';
import { adminDb, FieldValue } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

const SERVICES = new Set([
  'Chụp ảnh cưới (Wedding)',
  'Chụp ảnh ngoại cảnh / couple',
  'Phóng sự cưới (Pre-wedding)',
  'Kỷ yếu / Sự kiện / Graduation',
  'Dịch vụ khác / Cần tư vấn thêm'
]);

async function getOptionalUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;
  try {
    return await requireUser(request);
  } catch {
    return null;
  }
}

async function notifyTelegram(booking: Record<string, string>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const message = [
    '*CÓ ĐƠN ĐẶT LỊCH MỚI*',
    '',
    `*Họ tên:* ${escapeTelegram(booking.name)}`,
    `*SĐT:* ${escapeTelegram(booking.phone)}`,
    `*Dịch vụ:* ${escapeTelegram(booking.service)}`,
    `*Ngày dự kiến:* ${escapeTelegram(booking.date || 'Chưa chọn')}`,
    `*Ghi chú:* ${escapeTelegram(booking.notes || 'Không có')}`
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'MarkdownV2' }),
      signal: controller.signal
    });
    if (!response.ok) console.error('Telegram booking notification failed:', await response.text());
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    enforceRateLimit(`booking:${ip}`, 5, 15 * 60 * 1000);
    const token = await getOptionalUser(request);
    const body = await request.json() as Record<string, unknown>;
    const name = cleanString(body.name, 'Họ tên', 100, true);
    const phone = normalizePhone(body.phone);
    const service = cleanString(body.service, 'Dịch vụ', 80, true);
    if (!SERVICES.has(service)) throw new ApiError(400, 'Dịch vụ không hợp lệ.');
    const date = cleanString(body.date, 'Ngày dự kiến', 20) || 'Chưa chọn';
    const notes = cleanString(body.notes, 'Ghi chú', 1000) || 'Không có';

    const ref = adminDb.collection('merci_bookings').doc();
    const booking = {
      id: ref.id,
      name,
      phone,
      service,
      date,
      notes,
      status: 'Chưa xử lý',
      ownerUid: token?.uid || null,
      createdAt: Date.now(),
      createdAtServer: FieldValue.serverTimestamp()
    };
    await ref.set(booking);
    await notifyTelegram({ name, phone, service, date, notes });
    return Response.json({ success: true, bookingId: ref.id });
  } catch (error) {
    return errorResponse(error);
  }
}
