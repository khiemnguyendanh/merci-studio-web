'use client';

import { useEffect, useState } from 'react';

/**
 * Biến website thành "app" trên điện thoại:
 *  - đăng ký service worker (mở nhanh, xem lại ảnh khi mạng yếu)
 *  - gợi ý "Thêm vào màn hình chính" (Android: nút cài 1 chạm; iPhone: hướng dẫn Chia sẻ)
 */
const DISMISS_KEY = 'merci_pwa_dismissed_at';
const DISMISS_DAYS = 14;

export default function PwaRegister() {
    const [installEvent, setInstallEvent] = useState<any>(null);
    const [mode, setMode] = useState<'hidden' | 'android' | 'ios'>('hidden');

    useEffect(() => {
        if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        }

        const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
        if (standalone) return;
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;

        const onPrompt = (e: any) => { e.preventDefault(); setInstallEvent(e); setMode('android'); };
        window.addEventListener('beforeinstallprompt', onPrompt);

        const ua = navigator.userAgent;
        const isIos = /iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream;
        const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
        if (isIos && isSafari) {
            const t = setTimeout(() => setMode('ios'), 6000);
            return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); };
        }
        return () => window.removeEventListener('beforeinstallprompt', onPrompt);
    }, []);

    const dismiss = () => { localStorage.setItem(DISMISS_KEY, String(Date.now())); setMode('hidden'); };
    const install = async () => {
        if (!installEvent) return;
        installEvent.prompt();
        try { await installEvent.userChoice; } catch {}
        setMode('hidden');
    };

    if (mode === 'hidden') return null;

    return (
        <div className="md:hidden fixed left-3 right-3 z-[60] bottom-[calc(4.75rem+env(safe-area-inset-bottom))] rounded-2xl bg-slate-900 text-white shadow-2xl p-3.5 flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-500">
            <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">Cài Merci Studio như app</p>
                <p className="text-[11px] text-white/70 leading-snug mt-0.5">
                    {mode === 'android'
                        ? 'Mở nhanh từ màn hình chính, xem album mượt hơn.'
                        : 'Nhấn nút Chia sẻ ở Safari → "Thêm vào MH chính".'}
                </p>
            </div>
            {mode === 'android' ? (
                <button onClick={install} className="shrink-0 bg-white text-slate-900 text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition">Cài</button>
            ) : null}
            <button onClick={dismiss} aria-label="Đóng" className="shrink-0 text-white/60 text-lg leading-none px-1">×</button>
        </div>
    );
}
