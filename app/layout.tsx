import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Cormorant_Garamond } from 'next/font/google';
import AnalyticsConsent from '@/components/AnalyticsConsent';
import './globals.css';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mercistudio.net').replace(/\/$/, '');
const facebookPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const siteDescription = 'Merci Wedding Studio chuyên chụp ảnh cưới, phóng sự cưới, makeup và váy cưới tại Hà Nội, Bắc Ninh. Xem album thực tế và đặt lịch tư vấn.';

const sansFont = Be_Vietnam_Pro({
  variable: '--font-be-vietnam-pro',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600'],
  display: 'swap'
});

const serifFont = Cormorant_Garamond({
  variable: '--font-cormorant-garamond',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap'
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Merci Wedding Studio | Ảnh cưới, Makeup & Váy cưới',
    template: '%s | Merci Wedding Studio'
  },
  description: siteDescription,
  applicationName: 'Merci Wedding Studio',
  category: 'Wedding photography',
  keywords: ['Merci Studio', 'ảnh cưới', 'chụp ảnh cưới Hà Nội', 'phóng sự cưới', 'makeup cô dâu', 'váy cưới', 'wedding studio'],
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Merci Wedding Studio | Ảnh cưới, Makeup & Váy cưới',
    description: siteDescription,
    url: siteUrl,
    siteName: 'Merci Wedding Studio',
    images: [
      {
        url: '/og-merci-studio-v2.png',
        width: 1200,
        height: 630,
        alt: 'Merci Studio - Photo Makeup Bridal'
      }
    ],
    locale: 'vi_VN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merci Wedding Studio | Ảnh cưới, Makeup & Váy cưới',
    description: siteDescription,
    images: ['/og-merci-studio-v2.png']
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'PhotographyBusiness'],
    '@id': `${siteUrl}/#business`,
    name: 'Merci Wedding Studio',
    url: siteUrl,
    image: `${siteUrl}/og-merci-studio-v2.png`,
    logo: `${siteUrl}/merci-logo-watermark.png`,
    description: siteDescription,
    email: 'vaycuoidouyin@gmail.com',
    telephone: '+84888999545',
    priceRange: '$$',
    sameAs: [
      'https://www.facebook.com/merciwedding.vn',
      'https://www.instagram.com/merciwedding.vn/',
      'https://www.tiktok.com/@mercistudiovn'
    ],
    address: [
      {
        '@type': 'PostalAddress',
        streetAddress: '244 Đội Cấn',
        addressLocality: 'Ba Đình',
        addressRegion: 'Hà Nội',
        addressCountry: 'VN'
      },
      {
        '@type': 'PostalAddress',
        streetAddress: '650 Thân Nhân Trung',
        addressLocality: 'Việt Yên',
        addressRegion: 'Bắc Ninh',
        addressCountry: 'VN'
      }
    ]
  };

  return (
    <html lang="vi" className={`${sansFont.variable} ${serifFont.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
        <AnalyticsConsent gtmId={process.env.NEXT_PUBLIC_GTM_ID} gaId={process.env.NEXT_PUBLIC_GA_ID} facebookPixelId={facebookPixelId} />
        {children}
      </body>
    </html>
  );
}
