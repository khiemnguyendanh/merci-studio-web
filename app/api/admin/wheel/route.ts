import { FieldValue } from 'firebase-admin/firestore';
import { ApiError, cleanString, errorResponse, requireAdmin } from '@/lib/server/api-security';
import { adminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';

type WheelSlice = { id: string; text: string; color: string; weight: number };

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const slices: WheelSlice[] = Array.isArray(body.slices) ? body.slices.slice(0, 20).map((slice: Record<string, unknown>, index: number) => ({
      id: cleanString(slice.id, `ID phần thưởng ${index + 1}`, 80, true),
      text: cleanString(slice.text, `Tên phần thưởng ${index + 1}`, 100, true),
      color: /^#[0-9a-f]{6}$/i.test(String(slice.color || '')) ? String(slice.color) : '#7a5c44',
      weight: Number(slice.weight)
    })) : [];
    if (slices.length < 2 || slices.some((slice) => !Number.isFinite(slice.weight) || slice.weight <= 0 || slice.weight > 10000)) {
      throw new ApiError(400, 'Cấu hình vòng quay không hợp lệ.');
    }

    await adminDb.collection('merci_wheel_config').doc('settings').set({
      slices,
      isPublished: body.isPublished === true,
      updatedAt: new Date().toISOString(),
      updatedAtServer: FieldValue.serverTimestamp(),
      updatedBy: admin.uid
    }, { merge: true });
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
