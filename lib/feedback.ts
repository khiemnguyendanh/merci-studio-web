// Ảnh phản hồi khách. Nguồn chính: manifest R2 (mục "feedback", sinh từ
// E:\Mẫu\ANH WEB\Feedback bởi scripts/build-photos.mjs) — thay ảnh trong thư mục
// rồi bấm "Cap nhat anh Merci" là web đổi theo. Bộ dưới đây (public/home/feedback)
// chỉ dùng khi manifest chưa tải xong hoặc không có mục feedback.
// Thẻ nhỏ dùng bản _t, xem phóng to dùng bản 1080px. Không qua /_next/image: trên
// Workers bộ tối ưu ảnh của Next không resize, trả nguyên file gốc cho mọi kích thước.
export type FeedbackImage = { src: string; thumb: string; alt: string };

const altFor = (index: number) => `Tin nhắn cảm ơn của khách hàng Merci Studio số ${index + 1}`;

export const feedbackImages: FeedbackImage[] = Array.from({ length: 17 }, (_, index) => ({
    src: `/home/feedback/${index + 1}.webp`,
    thumb: `/home/feedback/${index + 1}_t.webp`,
    alt: altFor(index)
}));

export function feedbackFromManifest(items: unknown): FeedbackImage[] | null {
    if (!Array.isArray(items)) return null;
    const list = items
        .filter((it): it is { src: string; thumb?: string } => !!it && typeof (it as { src?: unknown }).src === 'string')
        .map((it, index) => ({ src: it.src, thumb: it.thumb || it.src, alt: altFor(index) }));
    return list.length ? list : null;
}
