import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    // sitemap: 'https://merci-studio.com/sitemap.xml', // Update with actual domain later
  };
}
