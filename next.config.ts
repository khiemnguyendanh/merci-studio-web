import type { NextConfig } from "next";

// Expose Cloudflare bindings while using `next dev` locally.
import('@opennextjs/cloudflare').then(({ initOpenNextCloudflareForDev }) => {
  initOpenNextCloudflareForDev();
});

// CSP: chỉ cho phép đúng các nguồn site đang dùng (fonts, GTM/GA, FB Pixel,
// Cloudflare Insights, Firebase/Google APIs, Drive/YouTube embeds).
// Next.js cần 'unsafe-inline' cho script bootstrap + inline styles.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.google-analytics.com https://*.firebaseapp.com https://*.firebaseapp.net https://accounts.google.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com https://cloudflareinsights.com https://static.cloudflareinsights.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.firebaseapp.net https://accounts.google.com https://www.googletagmanager.com https://td.doubleclick.net https://www.facebook.com https://www.youtube.com https://www.youtube-nocookie.com https://docs.google.com https://drive.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Content-Security-Policy', value: CSP }
        ]
      },
      {
        // API không cho search engine index; không đặt Cache-Control ở đây để
        // không đè header cache của các route public (public-content/tv-albums).
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' }
        ]
      }
    ];
  }
};

export default nextConfig;
