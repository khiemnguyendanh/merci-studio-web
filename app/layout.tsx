import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Cormorant_Garamond } from 'next/font/google';
import AnalyticsConsent from '@/components/AnalyticsConsent';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mercistudio.net';
const facebookPixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

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
    default: 'Merci Wedding Studio',
    template: '%s | Merci Wedding Studio'
  },
  description: 'Photo - Makeup - Bridal',
  openGraph: {
    title: 'Merci Wedding Studio',
    description: 'Photo - Makeup - Bridal',
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
    title: 'Merci Wedding Studio',
    description: 'Photo - Makeup - Bridal',
    images: ['/og-merci-studio-v2.png']
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${sansFont.variable} ${serifFont.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AnalyticsConsent gtmId={process.env.NEXT_PUBLIC_GTM_ID} gaId={process.env.NEXT_PUBLIC_GA_ID} facebookPixelId={facebookPixelId} />
        {children}
      </body>
    </html>
  );
}
