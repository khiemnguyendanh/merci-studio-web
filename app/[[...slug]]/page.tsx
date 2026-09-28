import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getDriveFolderOg } from '@/lib/server/drive-og';
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

export default function Page() {
  return <ClientOnlyHome />;
}
