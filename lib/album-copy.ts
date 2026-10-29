// Câu giới thiệu ngắn cho album theo danh mục - dùng ở trang album (client)
// và mô tả SEO/ảnh chia sẻ (server). Danh mục lạ dùng câu chung.

const plain = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

const BY_CATEGORY: Record<string, string> = {
  'wedding': 'Bộ ảnh cưới thực hiện bởi Merci Studio - concept, trang phục và makeup do ekip Merci chuẩn bị.',
  'vay cuoi': 'Mẫu váy cưới đang có tại Merci Bridal - thử váy trực tiếp tại cơ sở Hà Nội và Bắc Ninh.',
  'vest': 'Mẫu vest chú rể có sẵn tại Merci - xem theo size và thử trực tiếp tại cơ sở.',
  'phong su cuoi': 'Ảnh phóng sự ngày cưới thực tế - ghi lại trọn vẹn cảm xúc lễ ăn hỏi và ngày cưới.',
  'concept': 'Bộ ảnh concept cá nhân, beauty và couple chụp tại studio Merci.',
  'make up': 'Layout makeup cô dâu và khách mời thực hiện bởi đội ngũ makeup Merci.',
  'ky yeu': 'Ảnh kỷ yếu tập thể lớp do ekip Merci thực hiện.',
  'baby / family': 'Ảnh gia đình và em bé chụp tại studio Merci.',
  'event': 'Ảnh sự kiện do ekip Merci Studio thực hiện.',
  'hoa cuoi': 'Mẫu hoa cưới cầm tay tại Merci Bridal.'
};

export function albumIntro(album?: { category?: string; sub?: string; title?: string } | null) {
  const key = plain(album?.category || album?.sub || '');
  return BY_CATEGORY[key] || 'Bộ sưu tập ảnh thực tế thực hiện bởi Merci Studio tại Hà Nội và Bắc Ninh.';
}
