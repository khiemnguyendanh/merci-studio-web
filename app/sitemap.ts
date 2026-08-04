import type { MetadataRoute } from 'next';
import { listPublicContent } from '@/lib/server/firestore-metadata';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mercistudio.net').replace(/\/$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: 'weekly', priority: 1, images: [`${siteUrl}/og-merci-studio-v2.png`] },
    { url: `${siteUrl}/bo-su-tap`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl}/vest`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/video`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/feedback`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/dat-lich`, changeFrequency: 'monthly', priority: 0.8 }
  ];

  try {
    const content = await listPublicContent();
    const dynamicRoutes: MetadataRoute.Sitemap = content.map((item) => ({
      url: `${siteUrl}/${item.slug}`,
      changeFrequency: item.type === 'blog' ? 'monthly' : 'weekly',
      priority: item.type === 'blog' ? 0.7 : 0.8,
      images: item.coverUrl ? [item.coverUrl] : undefined
    }));
    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
