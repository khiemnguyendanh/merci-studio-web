import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Cormorant_Garamond } from 'next/font/google';
import AnalyticsConsent from '@/components/AnalyticsConsent';
import './globals.css';

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mercistudio.net').replace(/\/$/, '');
const facebookPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const siteDescription = 'Chụp ảnh cưới đẹp, phóng sự cưới và váy cưới Douyin tại Hà Nội, Bắc Ninh. Xem album thực tế, chọn váy cưới xinh và đặt lịch Merci Studio.';
const seoKeywords = [
  'Merci Studio',
  'ảnh cưới',
  'ảnh cưới đẹp',
  'chụp ảnh cưới',
  'chụp ảnh cưới Hà Nội',
  'chụp ảnh cưới Bắc Ninh',
  'studio ảnh cưới',
  'phóng sự cưới',
  'đám cưới',
  'váy cưới',
  'váy cưới xinh',
  'váy cưới Hà Nội',
  'váy cưới Douyin',
  'makeup cô dâu',
  'anhcuoi',
  'anhcuoidep',
  'chupanhcuoi',
  'vaycuoi',
  'vaycuoihanoi',
  'vaycuoixinh',
  'damcuoi',
  'douyin'
];

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
    default: 'Ảnh Cưới Đẹp & Váy Cưới Douyin Hà Nội | Merci Studio',
    template: '%s | Merci Wedding Studio'
  },
  description: siteDescription,
  applicationName: 'Merci Wedding Studio',
  category: 'Wedding photography',
  keywords: seoKeywords,
  alternates: { canonical: siteUrl },
  openGraph: {
    title: 'Ảnh Cưới Đẹp & Váy Cưới Douyin Hà Nội | Merci Studio',
    description: siteDescription,
    url: siteUrl,
    siteName: 'Merci Wedding Studio',
    images: [
      {
        url: '/og-merci-studio-v2.png',
        width: 1200,
        height: 630,
        alt: 'Merci Studio - Chụp ảnh cưới đẹp và váy cưới Douyin Hà Nội'
      }
    ],
    locale: 'vi_VN',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ảnh Cưới Đẹp & Váy Cưới Douyin Hà Nội | Merci Studio',
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
    knowsAbout: [
      'Chụp ảnh cưới',
      'Ảnh cưới đẹp',
      'Phóng sự đám cưới',
      'Váy cưới Douyin',
      'Váy cưới Hà Nội',
      'Makeup cô dâu'
    ],
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
