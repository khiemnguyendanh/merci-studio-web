import type { Metadata } from 'next';
import { findPublicContent, type PublicContentMetadata } from '@/lib/server/firestore-metadata';
import { faqs } from '@/lib/faq';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mercistudio.net').replace(/\/$/, '');
const defaultImage = `${siteUrl}/og-merci-studio-v2.png`;
const reservedMetadata: Record<string, { title: string; description: string; noIndex?: boolean }> = {
  '': { title: 'Ảnh Cưới Đẹp & Váy Cưới Douyin', description: 'Chụp ảnh cưới đẹp, phóng sự cưới và váy cưới Douyin tại Hà Nội, Bắc Ninh. Xem album thực tế, bảng giá 2026 và đặt lịch Merci Studio.' },
  'bo-su-tap': { title: 'Bộ Sưu Tập Ảnh Cưới Đẹp', description: 'Xem album ảnh cưới đẹp, chụp ảnh cưới studio và phóng sự đám cưới thực tế của Merci Studio tại Hà Nội, Bắc Ninh.' },
  'vest': { title: 'Vest Cưới Nam', description: 'Khám phá các mẫu vest cưới nam tại Merci Studio và lọc nhanh theo kích cỡ phù hợp.' },
  'vay-cuoi': { title: 'Váy Cưới Đẹp', description: 'Khám phá các mẫu váy cưới đẹp, váy cưới Douyin và thử váy cưới tại Merci Studio ở Hà Nội, Bắc Ninh.' },
  'blog': { title: 'Kinh Nghiệm Chụp Ảnh Cưới', description: 'Cẩm nang chụp ảnh cưới, chọn váy cưới, makeup cô dâu và chuẩn bị đám cưới dành cho các cặp đôi.' },
  'video': { title: 'Phim Phóng Sự Đám Cưới', description: 'Những thước phim phóng sự đám cưới chân thực, tự nhiên và giàu cảm xúc từ Merci Studio.' },
  'feedback': { title: 'Feedback Khách Hàng', description: 'Những lời nhắn và đánh giá thực tế từ khách hàng của Merci Studio.' },
  'dat-lich': { title: 'Đặt Lịch Chụp Ảnh Cưới', description: 'Đặt lịch chụp ảnh cưới, thử váy cưới Douyin và nhận tư vấn concept từ Merci Studio.' },
  'booking': { title: 'Đặt Lịch Chụp Ảnh Cưới', description: 'Đặt lịch chụp ảnh cưới, thử váy cưới Douyin và nhận tư vấn concept từ Merci Studio.' },
  'tool': { title: 'Công cụ khách hàng', description: 'Công cụ dành cho khách hàng Merci Studio.', noIndex: true },
  'tao-trang': { title: 'Tạo trang chọn ảnh', description: 'Công cụ nội bộ Merci Studio.', noIndex: true },
  'chon-anh': { title: 'Chọn ảnh', description: 'Trang chọn ảnh dành cho khách hàng Merci Studio.', noIndex: true },
  'loc-anh': { title: 'Lọc ảnh', description: 'Công cụ lọc ảnh Merci Studio.', noIndex: true },
  'thong-ke': { title: 'Thống kê', description: 'Khu vực quản trị Merci Studio.', noIndex: true }
};

type Props = { params: Promise<{ slug?: string[] }> };

function slugOf(parts?: string[]) {
  return parts?.join('/') || '';
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: parts } = await params;
  const slug = slugOf(parts);
  const reserved = reservedMetadata[slug];
  if (reserved) {
    const url = slug ? `${siteUrl}/${slug}` : siteUrl;
    return {
      title: reserved.title,
      description: reserved.description,
      alternates: { canonical: url },
      robots: reserved.noIndex ? { index: false, follow: false } : undefined,
      // Mỗi trang con phải tự khai báo OG, nếu không Facebook hiện tiêu đề trang chủ.
      openGraph: { title: `${reserved.title} | Merci Studio`, description: reserved.description, url, siteName: 'Merci Wedding Studio', locale: 'vi_VN', type: 'website', images: [defaultImage] },
      twitter: { card: 'summary_large_image', title: `${reserved.title} | Merci Studio`, description: reserved.description, images: [defaultImage] }
    };
  }
  if (parts?.length !== 1) return { robots: { index: false, follow: false } };

  try {
    const content = await findPublicContent(slug);
    if (!content) return { robots: { index: false, follow: false } };
    const url = `${siteUrl}/${slug}`;
    const image = /^https?:\/\//.test(content.coverUrl) ? content.coverUrl : `/api/og?title=${encodeURIComponent(content.title)}`;
    const title = content.title.trim();
    return {
      title,
      description: content.description,
      alternates: { canonical: url },
      openGraph: { title: `${title} | Merci Studio`, description: content.description, url, siteName: 'Merci Wedding Studio', locale: 'vi_VN', type: content.type === 'blog' ? 'article' : 'website', images: [{ url: image, alt: title }] },
      twitter: { card: 'summary_large_image', title: `${title} | Merci Studio`, description: content.description, images: [image] }
    };
  } catch {
    return { robots: { index: false, follow: false } };
  }
}

// JSON-LD theo trang: FAQ ở trang chủ, ImageGallery + breadcrumb ở trang album.
function structuredDataFor(slug: string, content: PublicContentMetadata | null) {
  if (slug === '') {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    };
  }
  if (!content || content.type !== 'album') return null;
  const url = `${siteUrl}/${slug}`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      name: content.title,
      description: content.description,
      url,
      image: content.coverUrl || undefined,
      numberOfItems: content.imageCount || undefined,
      genre: content.category || undefined,
      author: { '@id': `${siteUrl}/#business` }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Bộ sưu tập', item: `${siteUrl}/bo-su-tap` },
        { '@type': 'ListItem', position: 3, name: content.title, item: url }
      ]
    }
  ];
}

export default async function CatchAllLayout({ children, params }: { children: React.ReactNode } & Props) {
  const { slug: parts } = await params;
  const slug = slugOf(parts);
  let content: PublicContentMetadata | null = null;
  if (parts?.length === 1 && !reservedMetadata[slug]) {
    content = await findPublicContent(slug).catch(() => null);
  }
  const data = structuredDataFor(slug, content);
  return (
    <>
      {data && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
      )}
      {children}
    </>
  );
}
