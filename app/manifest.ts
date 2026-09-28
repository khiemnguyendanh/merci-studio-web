import type { MetadataRoute } from 'next';

// Web App Manifest: cho phép khách "Thêm vào màn hình chính" và mở website
// như một ứng dụng (toàn màn hình, icon riêng, màn hình chờ).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Merci Wedding Studio',
    short_name: 'Merci Studio',
    description: 'Xem album ảnh cưới, váy cưới Douyin và đặt lịch chụp tại Merci Studio.',
    start_url: '/?utm_source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'vi',
    background_color: '#faf7f1',
    theme_color: '#faf7f1',
    categories: ['photo', 'lifestyle', 'shopping'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    shortcuts: [
      { name: 'Bộ sưu tập', url: '/bo-su-tap', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Váy cưới', url: '/vay-cuoi', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Đặt lịch', url: '/dat-lich', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] }
    ]
  };
}
