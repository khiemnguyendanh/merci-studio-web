import type { Metadata } from 'next';
import { findPublicContent } from '@/lib/server/firestore-metadata';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mercistudio.net').replace(/\/$/, '');
const reservedMetadata: Record<string, { title: string; description: string; noIndex?: boolean }> = {
  '': { title: 'Ảnh Cưới Đẹp & Váy Cưới Douyin', description: 'Chụp ảnh cưới đẹp, phóng sự cưới và váy cưới Douyin tại Hà Nội, Bắc Ninh. Xem album thực tế, chọn váy cưới xinh và đặt lịch Merci Studio.' },
  'bo-su-tap': { title: 'Bộ Sưu Tập Ảnh Cưới Đẹp', description: 'Xem album ảnh cưới đẹp, chụp ảnh cưới studio và phóng sự đám cưới thực tế của Merci Studio tại Hà Nội, Bắc Ninh.' },
  'vest': { title: 'Vest Cưới Nam', description: 'Khám phá các mẫu vest cưới nam tại Merci Studio và lọc nhanh theo kích cỡ phù hợp.' },
  'blog': { title: 'Kinh Nghiệm Chụp Ảnh Cưới', description: 'Cẩm nang chụp ảnh cưới, chọn váy cưới, makeup cô dâu và chuẩn bị đám cưới dành cho các cặp đôi.' },
  'video': { title: 'Phim Phóng Sự Đám Cưới', description: 'Những thước phim phóng sự đám cưới chân thực, tự nhiên và giàu cảm xúc từ Merci Studio.' },
  'feedback': { title: 'Feedback khách hàng', description: 'Những lời nhắn và đánh giá thực tế từ khách hàng của Merci Studio.' },
  'dat-lich': { title: 'Đặt Lịch Chụp Ảnh Cưới', description: 'Đặt lịch chụp ảnh cưới, thử váy cưới Douyin và nhận tư vấn concept từ Merci Studio.' },
  'booking': { title: 'Đặt Lịch Chụp Ảnh Cưới', description: 'Đặt lịch chụp ảnh cưới, thử váy cưới Douyin và nhận tư vấn concept từ Merci Studio.' },
  'tool': { title: 'Công cụ khách hàng', description: 'Công cụ dành cho khách hàng Merci Studio.', noIndex: true },
  'tao-trang': { title: 'Tạo trang chọn ảnh', description: 'Công cụ nội bộ Merci Studio.', noIndex: true },
  'chon-anh': { title: 'Chọn ảnh', description: 'Trang chọn ảnh dành cho khách hàng Merci Studio.', noIndex: true },
  'loc-anh': { title: 'Lọc ảnh', description: 'Công cụ lọc ảnh Merci Studio.', noIndex: true },
  'thong-ke': { title: 'Thống kê', description: 'Khu vực quản trị Merci Studio.', noIndex: true }
};

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug: parts } = await params;
  const slug = parts?.join('/') || '';
  const reserved = reservedMetadata[slug];
  if (reserved) return {
    title: reserved.title,
    description: reserved.description,
    alternates: { canonical: slug ? `${siteUrl}/${slug}` : siteUrl },
    robots: reserved.noIndex ? { index: false, follow: false } : undefined
  };
  if (parts?.length !== 1) return { robots: { index: false, follow: false } };

  try {
    const content = await findPublicContent(slug);
    if (!content) return { robots: { index: false, follow: false } };
    const url = `${siteUrl}/${slug}`;
    const image = /^https?:\/\//.test(content.coverUrl) ? content.coverUrl : `/api/og?title=${encodeURIComponent(content.title)}`;
    return {
      title: content.title,
      description: content.description,
      alternates: { canonical: url },
      openGraph: { title: content.title, description: content.description, url, type: content.type === 'blog' ? 'article' : 'website', images: [image] },
      twitter: { card: 'summary_large_image', title: content.title, description: content.description, images: [image] }
    };
  } catch {
    return { robots: { index: false, follow: false } };
  }
}

export default function CatchAllLayout({ children }: { children: React.ReactNode }) {
  return children;
}
