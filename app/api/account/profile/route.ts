import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, cleanString, errorResponse, requireUser } from '@/lib/server/api-security';
import { adminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

function createReferralCode(uid: string) {
  return `M${uid.replace(/[^a-zA-Z0-9]/g, '').slice(-7).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const token = await requireUser(request);
    const email = cleanString(token.email, 'Email', 200, true).toLowerCase();
    const ref = adminDb.collection('merci_users').doc(token.uid);

    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) return;

      const referralCode = createReferralCode(token.uid);
      const duplicate = await adminDb.collection('merci_users').where('referralCode', '==', referralCode).limit(1).get();
      if (!duplicate.empty) throw new ApiError(409, 'Không thể tạo mã giới thiệu duy nhất.');

      transaction.create(ref, {
        uid: token.uid,
        email,
        points: 50,
        referralCode,
        referredBy: '',
        createdAt: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
        history: [{
          id: 'signup',
          amount: 50,
          type: 'signup',
          description: 'Tặng điểm đăng ký thành viên',
          createdAt: Date.now()
        }]
      });
    });

    const profile = await ref.get();
    return Response.json({ profile: profile.data() });
  } catch (error) {
    return errorResponse(error);
  }
}
