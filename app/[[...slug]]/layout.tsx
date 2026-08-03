import type { Metadata } from 'next';
import { findPublicContent } from '@/lib/server/firestore-metadata';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mercistudio.net';
const reservedMetadata: Record<string, { title: string; description: string; noIndex?: boolean }> = {
  '': { title: 'Merci Wedding Studio', description: 'Photo - Makeup - Bridal' },
  'bo-su-tap': { title: 'Bộ sưu tập ảnh', description: 'Album ảnh cưới, phóng sự cưới và những câu chuyện hình ảnh của Merci Studio.' },
  'vest': { title: 'Bộ sưu tập Vest', description: 'Khám phá các mẫu Vest tại Merci Studio và lọc nhanh theo kích cỡ phù hợp.' },
  'blog': { title: 'Blog kinh nghiệm cưới', description: 'Cẩm nang chụp ảnh, chuẩn bị đám cưới và kinh nghiệm dành cho các cặp đôi.' },
  'video': { title: 'Phim phóng sự cưới', description: 'Những thước phim cưới chân thực và giàu cảm xúc từ Merci Studio.' },
  'dat-lich': { title: 'Đặt lịch tư vấn', description: 'Đặt lịch chụp ảnh và nhận tư vấn từ Merci Studio.' },
  'booking': { title: 'Đặt lịch tư vấn', description: 'Đặt lịch chụp ảnh và nhận tư vấn từ Merci Studio.' },
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
    alternates: { canonical: `${siteUrl}/${slug}` },
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
