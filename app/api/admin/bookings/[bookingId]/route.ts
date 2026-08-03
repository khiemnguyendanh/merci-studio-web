import { ApiError, cleanString, errorResponse, requireAdmin } from '@/lib/server/api-security';
import { adminDb, FieldValue } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

const STATUSES = new Set(['Chưa xử lý', 'Đã tư vấn', 'Đã hoàn thành']);

export async function PATCH(request: Request, context: { params: Promise<{ bookingId: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { bookingId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const status = cleanString(body.status, 'Trạng thái', 30, true);
    if (!STATUSES.has(status)) throw new ApiError(400, 'Trạng thái không hợp lệ.');

    const bookingRef = adminDb.collection('merci_bookings').doc(bookingId);
    await adminDb.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists) throw new ApiError(404, 'Lịch hẹn không tồn tại.');
      const booking = bookingSnapshot.data() || {};
      const update: Record<string, unknown> = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid
      };

      if (status === 'Đã hoàn thành') {
        update.completedAt = FieldValue.serverTimestamp();
        update.completedBy = admin.uid;
        if (booking.ownerUid && !booking.rewardGrantedAt) {
          const userRef = adminDb.collection('merci_users').doc(String(booking.ownerUid));
          const userSnapshot = await transaction.get(userRef);
          if (userSnapshot.exists) {
            const user = userSnapshot.data() || {};
            transaction.update(userRef, {
              points: Number(user.points || 0) + 200,
              updatedAt: FieldValue.serverTimestamp(),
              history: [...(Array.isArray(user.history) ? user.history : []), {
                id: `booking_${bookingId}`,
                amount: 200,
                type: 'booking',
                description: `Hoàn thành lịch hẹn dịch vụ ${booking.service || ''}`,
                createdAt: Date.now()
              }].slice(-100)
            });
            update.rewardGrantedAt = FieldValue.serverTimestamp();
            update.rewardTransactionId = `booking_${bookingId}`;
          }
        }
      }

      transaction.update(bookingRef, update);
    });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ bookingId: string }> }) {
  try {
    await requireAdmin(request);
    const { bookingId } = await context.params;
    await adminDb.collection('merci_bookings').doc(bookingId).delete();
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
