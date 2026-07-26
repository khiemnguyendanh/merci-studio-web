'use client';

import { useEffect, useState } from 'react';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';

const STORAGE_KEY = 'merci_analytics_consent';

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[][] };
  }
}

export default function AnalyticsConsent({ gtmId, gaId, facebookPixelId }: { gtmId?: string; gaId?: string; facebookPixelId?: string }) {
  const [consent, setConsent] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Read browser storage after hydration; consent is an external browser preference.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(saved === 'accepted' || saved === 'declined' ? saved : null);
  }, []);

  useEffect(() => {
    if (consent !== 'accepted' || !facebookPixelId || window.fbq) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    window.fbq = window.fbq || function (...args: unknown[]) {
      const queue = window.fbq?.queue || [];
      queue.push(args);
      if (window.fbq) window.fbq.queue = queue;
    };
    window.fbq?.('init', facebookPixelId);
    window.fbq?.('track', 'PageView');
  }, [consent, facebookPixelId]);

  const choose = (value: 'accepted' | 'declined') => {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent('merci-consent-change', { detail: value }));
    setConsent(value);
  };

  return (
    <>
      {consent === 'accepted' && gtmId && <GoogleTagManager gtmId={gtmId} />}
      {consent === 'accepted' && gaId && <GoogleAnalytics gaId={gaId} />}
      {consent === null && (
        <div role="dialog" aria-modal="true" aria-label="Tùy chọn quyền riêng tư" className="fixed inset-x-3 bottom-3 z-[10000] mx-auto max-w-3xl border border-slate-200 bg-white p-4 shadow-2xl md:p-5">
          <p className="font-serif text-xl font-semibold text-slate-900">Quyền riêng tư của bạn</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">Merci Studio dùng dữ liệu truy cập ẩn danh để cải thiện website và đo hiệu quả nội dung. Bạn có thể từ chối mà vẫn sử dụng đầy đủ chức năng.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => choose('declined')} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Từ chối</button>
            <button type="button" onClick={() => choose('accepted')} className="bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Đồng ý</button>
          </div>
        </div>
      )}
    </>
  );
}
