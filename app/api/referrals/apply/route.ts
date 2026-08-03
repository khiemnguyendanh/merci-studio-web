import { ApiError, cleanString, errorResponse, requireUser } from '@/lib/server/api-security';
import { adminDb, FieldValue } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const token = await requireUser(request);
    const body = await request.json() as Record<string, unknown>;
    const code = cleanString(body.code, 'Mã giới thiệu', 20, true).toUpperCase();
    const referrerQuery = await adminDb.collection('merci_users').where('referralCode', '==', code).limit(1).get();
    if (referrerQuery.empty) throw new ApiError(404, 'Mã giới thiệu không tồn tại.');

    const userRef = adminDb.collection('merci_users').doc(token.uid);
    const referrerRef = referrerQuery.docs[0].ref;
    if (referrerRef.id === token.uid) throw new ApiError(400, 'Bạn không thể dùng mã của chính mình.');

    await adminDb.runTransaction(async (transaction) => {
      const [userSnapshot, referrerSnapshot] = await Promise.all([
        transaction.get(userRef),
        transaction.get(referrerRef)
      ]);
      if (!userSnapshot.exists) throw new ApiError(404, 'Hồ sơ thành viên chưa tồn tại.');
      if (!referrerSnapshot.exists) throw new ApiError(404, 'Người giới thiệu không tồn tại.');

      const user = userSnapshot.data() || {};
      const referrer = referrerSnapshot.data() || {};
      if (user.referredBy) throw new ApiError(409, 'Bạn đã áp dụng mã giới thiệu trước đó.');

      const now = Date.now();
      transaction.update(userRef, {
        referredBy: code,
        referredByUid: referrerRef.id,
        points: Number(user.points || 0) + 50,
        updatedAt: FieldValue.serverTimestamp(),
        history: [...(Array.isArray(user.history) ? user.history : []), {
          id: `referral_received_${token.uid}`,
          amount: 50,
          type: 'referred',
          description: `Nhận điểm giới thiệu từ mã ${code}`,
          createdAt: now
        }].slice(-100)
      });
      transaction.update(referrerRef, {
        points: Number(referrer.points || 0) + 100,
        updatedAt: FieldValue.serverTimestamp(),
        history: [...(Array.isArray(referrer.history) ? referrer.history : []), {
          id: `referral_reward_${token.uid}`,
          amount: 100,
          type: 'referrer',
          description: `Giới thiệu thành viên mới ${token.email || 'Ẩn danh'}`,
          createdAt: now
        }].slice(-100)
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
