// Cong dang bai blog cho he thong noi dung (contents.mercistudio.net).
//
// He thong do tu viet bai tu van theo lich roi goi vao day. Xac thuc bang ma
// chung BLOG_PUBLISH_TOKEN (secret o ca hai worker), khong dung tai khoan
// admin Firebase: khoa service account chi nam o worker nay.
//
// GET  -> danh sach tieu de/slug da co (de khong viet trung chu de)
// POST -> tao bai moi trong merci_blogs, slug trung thi them -2, -3...
import { NextResponse } from 'next/server';
import { ApiError, errorResponse } from '@/lib/server/api-security';
import { adminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mercistudio.net').replace(/\/+$/, '');

function sameSecret(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i % x.length] || 0) ^ (y[i % y.length] || 0);
  return diff === 0;
}

function authorize(request: Request) {
  const expected = process.env.BLOG_PUBLISH_TOKEN || '';
  const given = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (expected.length < 32 || !given || !sameSecret(given, expected)) throw new ApiError(401, 'Unauthorized.');
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '').slice(0, 90);
}

function text(value: unknown, name: string, min: number, max: number) {
  const out = String(value ?? '').replace(/\r/g, '').trim();
  if (out.length < min) throw new ApiError(400, `${name} quá ngắn.`);
  if (out.length > max) throw new ApiError(400, `${name} quá dài.`);
  return out;
}

async function existingSlugs() {
  const list = await fetch(
    `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/merci_blogs?pageSize=300&mask.fieldPaths=slug&mask.fieldPaths=title&key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { cache: 'no-store' }
  );
  const json = await list.json() as { documents?: { fields?: Record<string, { stringValue?: string }> }[] };
  return (json.documents || []).map((d) => ({ slug: d.fields?.slug?.stringValue || '', title: d.fields?.title?.stringValue || '' }));
}

export async function GET(request: Request) {
  try {
    authorize(request);
    return NextResponse.json({ posts: await existingSlugs() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    authorize(request);
    const body = await request.json() as Record<string, unknown>;
    const title = text(body.title, 'Tiêu đề', 10, 160);
    const metaDesc = text(body.metaDesc, 'Mô tả', 40, 300);
    const content = text(body.content, 'Nội dung', 800, 40000);
    const coverUrl = text(body.coverUrl, 'Ảnh bìa', 0, 1000);
    if (coverUrl && !/^https:\/\//.test(coverUrl)) throw new ApiError(400, 'Ảnh bìa không hợp lệ.');
    const hashtags = (Array.isArray(body.hashtags) ? body.hashtags : [])
      .map((t) => String(t || '').replace(/^#/, '').trim().slice(0, 40)).filter(Boolean).slice(0, 8);

    const base = slugify(String(body.slug || '') || title);
    if (!base) throw new ApiError(400, 'Slug không hợp lệ.');
    const taken = new Set((await existingSlugs()).map((p) => p.slug));
    let slug = base;
    for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;

    const now = Date.now();
    const id = `blog_${now}`;
    await adminDb.collection('merci_blogs').doc(id).set({
      id, title, slug, metaDesc, content, coverUrl, hashtags,
      createdAt: now, updatedAt: now,
      aiProvider: 'merci-contents',
      sourceTopic: String(body.topic || '').slice(0, 200)
    });
    return NextResponse.json({ ok: true, id, slug, url: `${SITE}/${slug}` });
  } catch (error) {
    // Chi nguoi giu ma moi toi duoc day: tra loi cu the de he thong noi dung
    // ghi lai, thay vi "loi may chu" chung chung.
    if (!(error instanceof ApiError) && error instanceof Error) {
      console.error('blog publish:', error.message);
      return NextResponse.json({ error: 'Lưu bài thất bại: ' + error.message.slice(0, 300) }, { status: 500 });
    }
    return errorResponse(error);
  }
}
