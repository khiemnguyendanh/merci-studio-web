import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mercistudio.net';

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
  },
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}