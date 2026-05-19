import type { Metadata } from 'next';
import React from 'react';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mercistudio.net').replace(/\/$/, '');
const SITE_NAME = 'Merci Wedding Studio';
const DEFAULT_DESCRIPTION = 'Photo - Makeup - Bridal';
const OG_IMAGE = `${SITE_URL}/og-merci-studio-v2.png`;

type RouteMeta = {
  title: string;
  description: string;
};

function toNiceTitle(path: string) {
  return path
    .split('/')
    .pop()!
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getRouteMeta(slug?: string[]): RouteMeta {
  const path = (slug || []).join('/');

  const routeTitleMap: Record<string, RouteMeta> = {
    '': {
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION
    },
    'bo-su-tap': {
      title: 'Bộ Sưu Tập Ảnh | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    },
    blog: {
      title: 'Blog Cưới & Kinh Nghiệm | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    },
    video: {
      title: 'Phim Phóng Sự | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    },
    tool: {
      title: 'Tool Khách Hàng & Studio | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    },
    'tao-trang': {
      title: 'Tạo Trang Chọn Ảnh | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    },
    'chon-anh': {
      title: 'Chọn Ảnh | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    },
    'loc-anh': {
      title: 'Lọc Ảnh | Merci Studio',
      description: 'Photo - Makeup - Bridal'
    }
  };

  if (routeTitleMap[path]) return routeTitleMap[path];

  const niceTitle = toNiceTitle(path || 'Merci Studio');
  return {
    title: `${niceTitle} | Merci Studio`,
    description: DEFAULT_DESCRIPTION
  };
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug?: string[] }> | { slug?: string[] };
}): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams?.slug || [];
  const path = slug.join('/');
  const meta = getRouteMeta(slug);
  const canonicalUrl = path ? `${SITE_URL}/${path}` : SITE_URL;

  return {
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
      url: canonicalUrl,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: 'Merci Studio - Photo Makeup Bridal'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [OG_IMAGE]
    },
    robots: {
      index: true,
      follow: true
    }
  };
}

export default function SlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
