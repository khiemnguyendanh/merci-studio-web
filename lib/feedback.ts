// Ảnh phản hồi khách (public/home/feedback). Thẻ nhỏ dùng bản _t (680px),
// xem phóng to dùng bản gốc 1080px. Không qua /_next/image: trên Workers bộ
// tối ưu ảnh của Next không resize, trả nguyên file gốc cho mọi kích thước.
export const feedbackImages = Array.from({ length: 17 }, (_, index) => ({
    src: `/home/feedback/${index + 1}.webp`,
    thumb: `/home/feedback/${index + 1}_t.webp`,
    alt: `Tin nhắn cảm ơn của khách hàng Merci Studio số ${index + 1}`
}));

export type FeedbackImage = (typeof feedbackImages)[number];
