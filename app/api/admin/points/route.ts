import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, cleanString, errorResponse, requireAdmin } from '@/lib/server/api-security';
import { adminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const uid = cleanString(body.uid, 'UID', 128, true);
    const reason = cleanString(body.reason, 'Lý do', 200, true);
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) {
      throw new ApiError(400, 'Số điểm điều chỉnh không hợp lệ.');
    }

    const userRef = adminDb.collection('merci_users').doc(uid);
    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(userRef);
      if (!snapshot.exists) throw new ApiError(404, 'Người dùng không tồn tại.');
      const user = snapshot.data() || {};
      const nextPoints = Number(user.points || 0) + amount;
      if (nextPoints < 0) throw new ApiError(400, 'Số dư điểm không thể âm.');
      transaction.update(userRef, {
        points: nextPoints,
        updatedAt: FieldValue.serverTimestamp(),
        history: [...(Array.isArray(user.history) ? user.history : []), {
          id: `admin_${Date.now()}`,
          amount,
          type: 'admin',
          description: reason,
          createdAt: Date.now(),
          createdBy: admin.uid
        }].slice(-100)
      });
    });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
