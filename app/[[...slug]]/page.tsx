import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getDriveFolderOg } from '@/lib/server/drive-og';
import { findPublicContent, listPublicContent } from '@/lib/server/firestore-metadata';
import { findPublicBlogBySlug, publicBlogs } from '@/lib/server/blogs';
import { STUDIO_LOCATIONS } from '@/lib/locations';
import { faqs } from '@/lib/faq';
import ClientOnlyHome from './ClientOnlyHome';

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Link gửi khách có dạng /?folder=<id> hoặc /?folders=<id1>,<id2> — thumbnail
// phải là ảnh thật trong folder Drive đó thay vì ảnh OG chung của studio.
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  if (slug?.length) return {};

  const single = typeof search.folder === 'string' ? search.folder : '';
  const multi = typeof search.folders === 'string' ? search.folders.split(',')[0] : '';
  const folderId = (single || multi).trim();
  if (!folderId) return {};

  const hdrs = await headers();
  const ip = hdrs.get('cf-connecting-ip') || hdrs.get('x-real-ip') || 'unknown';
  const og = await getDriveFolderOg(folderId, ip).catch(() => null);
  if (!og) return {};

  const title = og.name ? `Album ${og.name}` : 'Album ảnh của bạn';
  const description = 'Mời bạn xem và chọn ảnh trong album của mình tại Merci Studio.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | Merci Studio`,
      description,
      images: [{ url: og.imageUrl, width: 1200, height: 800, alt: title }]
    },
    twitter: { card: 'summary_large_image', title: `${title} | Merci Studio`, description, images: [og.imageUrl] }
  };
}

function stripToParagraphs(raw: string): string[] {
  if (!raw) return [];
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|br|blockquote|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');

  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .slice(0, 60);
}

const NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/bo-su-tap', label: 'Bộ sưu tập' },
  { href: '/vay-cuoi', label: 'Váy cưới' },
  { href: '/vest', label: 'Vest cưới' },
  { href: '/video', label: 'Phim phóng sự cưới' },
  { href: '/blog', label: 'Kinh nghiệm cưới' },
  { href: '/feedback', label: 'Feedback khách hàng' },
  { href: '/dat-lich', label: 'Đặt lịch tư vấn' },
];

const STATIC_PAGE_COPY: Record<string, { h1: string; intro: string; albumFilter?: (cat: string) => boolean }> = {
  'bo-su-tap': {
    h1: 'Bộ Sưu Tập Ảnh Cưới Đẹp & Phóng Sự Cưới',
    intro: 'Khám phá hàng trăm album chụp ảnh cưới studio, ngoại cảnh, phóng sự đám cưới và makeup cô dâu thực tế từ Merci Studio tại Hà Nội và Bắc Ninh.',
  },
  'vay-cuoi': {
    h1: 'Váy Cưới Đẹp & Váy Cưới Douyin Thiết Kế Cao Cấp',
    intro: 'Bộ sưu tập váy cưới Douyin, váy cưới Luxury và váy cưới đi bàn tại Merci Bridal (244 Đội Cấn, Ba Đình, Hà Nội) và Merci Studio (650 Thân Nhân Trung, Việt Yên, Bắc Ninh).',
    albumFilter: (cat) => cat.toLowerCase().includes('váy') || cat.toLowerCase().includes('vay'),
  },
  'vest': {
    h1: 'Vest Cưới Nam Cao Cấp',
    intro: 'Các mẫu vest cưới chú rể phom chuẩn, đa dạng kích cỡ S–XXXL tại Merci Studio Hà Nội và Bắc Ninh.',
    albumFilter: (cat) => cat.toLowerCase().includes('vest'),
  },
  'video': {
    h1: 'Phim Phóng Sự Đám Cưới & Pre-Wedding',
    intro: 'Những thước phim phóng sự đám cưới chân thực, giàu cảm xúc được thực hiện bởi đội ngũ quay dựng Merci Studio.',
  },
  'feedback': {
    h1: 'Feedback Khách Hàng Merci Studio',
    intro: 'Lời nhắn và đánh giá thực tế từ các cặp đôi đã chụp ảnh cưới, thuê váy cưới và makeup tại Merci Studio.',
  },
  'dat-lich': {
    h1: 'Đặt Lịch Chụp Ảnh Cưới & Thử Váy Cưới',
    intro: 'Đăng ký lịch tư vấn concept chụp ảnh cưới, thử váy cưới Douyin và nhận báo giá chi tiết tại Merci Studio Hà Nội & Bắc Ninh.',
  },
  'booking': {
    h1: 'Đặt Lịch Chụp Ảnh Cưới & Thử Váy Cưới',
    intro: 'Đăng ký lịch tư vấn concept chụp ảnh cưới, thử váy cưới Douyin và nhận báo giá chi tiết tại Merci Studio Hà Nội & Bắc Ninh.',
  },
};

function SsrShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#faf7f1] px-6 py-14 text-[#2b241e]">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 border-b border-[#d9d0c3] pb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#7d6a52]">
            Merci Wedding Studio · Hà Nội &amp; Bắc Ninh
          </p>
          <nav aria-label="Điều hướng chính" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-medium text-[#5c5044]">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        {children}

        <footer className="mt-14 border-t border-[#d9d0c3] pt-8 text-sm text-[#5c5044]">
          <h2 className="font-serif text-xl font-semibold text-[#2b241e]">Hệ thống cơ sở Merci Studio</h2>
          <ul className="mt-3 space-y-2">
            {STUDIO_LOCATIONS.map((loc) => (
              <li key={loc.id}>
                <strong>{loc.name}:</strong>{' '}
                <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  {loc.fullAddress}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3">Hotline: 0888.999.545 · 0877.999.545 — Mở cửa 08:30 – 21:30 hàng ngày.</p>
        </footer>
      </div>
    </main>
  );
}

async function buildSsrContent(slugParts?: string[]) {
  const slug = slugParts?.join('/') || '';

  // 1. Trang danh sách Blog (/blog)
  if (slug === 'blog') {
    const { blogs } = await publicBlogs().catch(() => ({ blogs: [] }));
    return (
      <SsrShell>
        <section>
          <h1 className="font-serif text-4xl font-semibold">Kinh Nghiệm Chụp Ảnh Cưới &amp; Chọn Váy Cưới</h1>
          <p className="mt-4 text-base leading-7 text-[#5c5044]">
            Cẩm nang chụp ảnh cưới, kinh nghiệm chọn váy cưới Douyin, makeup cô dâu và chuẩn bị đám cưới từ đội ngũ Merci Studio tại Hà Nội và Bắc Ninh.
          </p>
          {blogs.length > 0 && (
            <ul className="mt-8 space-y-5">
              {blogs.slice(0, 30).map((b) => (
                <li key={b.id} className="border-b border-[#e8dfd2] pb-4">
                  <Link href={`/${b.slug || b.id}`} className="font-serif text-xl font-semibold text-[#2b241e] hover:underline">
                    {b.title}
                  </Link>
                  {b.metaDesc && <p className="mt-1.5 text-sm leading-6 text-[#5c5044]">{b.metaDesc}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </SsrShell>
    );
  }

  // 2. Các trang dịch vụ tĩnh (/bo-su-tap, /vay-cuoi, /vest, /video, /feedback, /dat-lich)
  const staticPage = STATIC_PAGE_COPY[slug];
  if (staticPage) {
    const allContent = staticPage.albumFilter || slug === 'bo-su-tap'
      ? await listPublicContent().catch(() => [])
      : [];
    const albums = allContent.filter(
      (item) => item.type === 'album' && (!staticPage.albumFilter || staticPage.albumFilter(item.category || ''))
    );
    return (
      <SsrShell>
        <section>
          <h1 className="font-serif text-4xl font-semibold">{staticPage.h1}</h1>
          <p className="mt-4 text-base leading-7 text-[#5c5044]">{staticPage.intro}</p>
          {albums.length > 0 && (
            <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {albums.slice(0, 24).map((album) => (
                <li key={album.slug} className="rounded-xl border border-[#e8dfd2] bg-white p-4">
                  <Link href={`/${album.slug}`} className="font-serif text-lg font-semibold text-[#2b241e] hover:underline">
                    {album.title}
                  </Link>
                  <p className="mt-1 text-sm text-[#5c5044]">{album.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SsrShell>
    );
  }

  // 3. Trang chi tiết Blog hoặc Album (/<slug>)
  if (slugParts?.length === 1) {
    const blog = await findPublicBlogBySlug(slug).catch(() => null);
    if (blog) {
      const paragraphs = stripToParagraphs(blog.content);
      const { blogs } = await publicBlogs().catch(() => ({ blogs: [] }));
      const related = blogs.filter((b) => b.id !== blog.id).slice(0, 6);
      return (
        <SsrShell>
          <article>
            <h1 className="font-serif text-4xl font-semibold leading-tight">{blog.title}</h1>
            {blog.metaDesc && <p className="mt-4 text-base font-medium leading-7 text-[#5c5044]">{blog.metaDesc}</p>}
            {blog.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={blog.coverUrl} alt={blog.title} className="mt-6 max-h-96 w-full rounded-xl object-cover" />
            )}
            <div className="mt-6 space-y-4 text-base leading-8 text-[#2b241e]">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {blog.hashtags?.length > 0 && (
              <p className="mt-6 text-xs text-[#7d6a52]">Từ khóa: {blog.hashtags.join(', ')}</p>
            )}
          </article>
          {related.length > 0 && (
            <section className="mt-12 border-t border-[#e8dfd2] pt-8">
              <h2 className="font-serif text-2xl font-semibold">Bài viết liên quan</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {related.map((b) => (
                  <li key={b.id}>
                    <Link href={`/${b.slug || b.id}`} className="text-[#7a5c44] hover:underline">
                      {b.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </SsrShell>
      );
    }

    const content = await findPublicContent(slug).catch(() => null);
    if (content && content.type === 'album') {
      return (
        <SsrShell>
          <article>
            {content.category && (
              <p className="text-xs font-semibold uppercase tracking-widest text-[#7d6a52]">{content.category}</p>
            )}
            <h1 className="mt-2 font-serif text-4xl font-semibold">{content.title}</h1>
            <p className="mt-4 text-base leading-7 text-[#5c5044]">{content.description}</p>
            {content.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={content.coverUrl} alt={content.title} className="mt-6 max-h-96 w-full rounded-xl object-cover" />
            )}
            <div className="mt-6 flex gap-4 text-sm font-semibold">
              <Link href="/bo-su-tap" className="text-[#7a5c44] underline">Xem thêm bộ sưu tập</Link>
              <Link href="/dat-lich" className="text-[#7a5c44] underline">Đặt lịch chụp concept này</Link>
            </div>
          </article>
        </SsrShell>
      );
    }
  }

  // 4. Trang chủ (/) hoặc fallback mặc định
  const [allContent, { blogs }] = await Promise.all([
    listPublicContent().catch(() => []),
    publicBlogs().catch(() => ({ blogs: [] })),
  ]);
  const featuredAlbums = allContent.filter((c) => c.type === 'album').slice(0, 8);
  const latestBlogs = blogs.slice(0, 6);

  return (
    <SsrShell>
      <section className="text-center">
        <h1 className="font-serif text-4xl font-semibold md:text-6xl">
          Chụp Ảnh Cưới Đẹp &amp; Váy Cưới Douyin Hà Nội, Bắc Ninh
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5c5044]">
          Merci Studio cung cấp dịch vụ chụp ảnh cưới, phóng sự đám cưới, makeup cô dâu và cho thuê váy cưới
          Douyin thiết kế cao cấp tại 244 Đội Cấn (Ba Đình, Hà Nội) và 650 Thân Nhân Trung (Việt Yên, Bắc Ninh).
        </p>
      </section>

      {featuredAlbums.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl font-semibold">Album ảnh cưới &amp; váy cưới nổi bật</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {featuredAlbums.map((a) => (
              <li key={a.slug}>
                <Link href={`/${a.slug}`} className="text-[#7a5c44] hover:underline font-medium">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {latestBlogs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl font-semibold">Kinh nghiệm cưới mới nhất</h2>
          <ul className="mt-4 space-y-2">
            {latestBlogs.map((b) => (
              <li key={b.id}>
                <Link href={`/${b.slug || b.id}`} className="text-[#7a5c44] hover:underline">
                  {b.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold">Câu hỏi thường gặp</h2>
        <dl className="mt-4 space-y-4 text-sm">
          {faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-[#2b241e]">{f.q}</dt>
              <dd className="mt-1 text-[#5c5044]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SsrShell>
  );
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const ssrContent = await buildSsrContent(slug);
  return <ClientOnlyHome ssrContent={ssrContent} />;
}
