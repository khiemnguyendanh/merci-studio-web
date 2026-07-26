import { randomInt } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, cleanString, enforceRateLimit, errorResponse, getClientIp, hashValue, normalizePhone } from '@/lib/server/api-security';
import { adminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

type WheelSlice = { id: string; text: string; color: string; weight: number };

function selectPrize(slices: WheelSlice[]) {
  const valid = slices.filter((slice) => slice.id && slice.text && Number.isFinite(slice.weight) && slice.weight > 0);
  const total = valid.reduce((sum, slice) => sum + slice.weight, 0);
  if (valid.length < 2 || total <= 0) throw new ApiError(409, 'Vòng quay chưa được cấu hình hợp lệ.');
  let ticket = randomInt(1, Math.floor(total * 1000) + 1) / 1000;
  return valid.find((slice) => ((ticket -= slice.weight) <= 0)) || valid[valid.length - 1];
}

function createPrizeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `MC-${Array.from({ length: 8 }, () => chars[randomInt(chars.length)]).join('')}`;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    enforceRateLimit(`wheel:${ip}`, 5, 60 * 60 * 1000);
    const body = await request.json();
    const name = cleanString(body.name, 'Họ tên', 100, true);
    const phone = normalizePhone(body.phone);
    const campaignId = 'settings';
    const phoneHash = hashValue(`${campaignId}:${phone}`);
    const registrationRef = adminDb.collection('merci_spin_registrations').doc(`${campaignId}_${phoneHash}`);
    const configRef = adminDb.collection('merci_wheel_config').doc(campaignId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const [registrationSnapshot, configSnapshot] = await Promise.all([
        transaction.get(registrationRef),
        transaction.get(configRef)
      ]);
      if (registrationSnapshot.exists) {
        const existing = registrationSnapshot.data() || {};
        return { alreadySpun: true, prize: existing.prizeText, code: existing.prizeCode, date: existing.createdAt };
      }
      if (!configSnapshot.exists || configSnapshot.data()?.isPublished !== true) {
        throw new ApiError(409, 'Vòng quay hiện chưa được mở.');
      }

      const prize = selectPrize(configSnapshot.data()?.slices || []);
      const code = createPrizeCode();
      const date = new Date().toISOString();
      transaction.create(registrationRef, {
        name,
        phone,
        phoneHash,
        campaignId,
        sliceId: prize.id,
        prizeText: prize.text,
        prizeCode: code,
        status: 'issued',
        createdAt: date,
        createdAtServer: FieldValue.serverTimestamp()
      });
      return { alreadySpun: false, prize: prize.text, sliceId: prize.id, code, date };
    });

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
