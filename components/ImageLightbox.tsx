// @ts-nocheck
/* eslint-disable */
'use client';
import React from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

export default function ImageLightbox({ 
    lightboxData, 
    setLightboxData, 
    touchStart, 
    setTouchStart, 
    touchEnd, 
    setTouchEnd, 
    nextImg, 
    prevImg, 
    getDriveThumbUrl 
}) {
    if (!lightboxData.isOpen || lightboxData.images.length === 0) return null;

    return (
        <div 
            className="fixed inset-0 z-[200] bg-black/95 md:bg-black/98 backdrop-blur-md md:backdrop-blur-xl flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300"
            onTouchStart={(e) => {
                setTouchEnd(null);
                setTouchStart(e.targetTouches[0].clientX);
            }}
            onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
            onTouchEnd={() => {
                if (!touchStart || !touchEnd) return;
                const distance = touchStart - touchEnd;
                const isLeftSwipe = distance > 50;
                const isRightSwipe = distance < -50;
                if (isLeftSwipe) nextImg();
                if (isRightSwipe) prevImg();
            }}
        >
            <div className="absolute top-4 md:top-6 left-4 md:left-6 text-white/50 font-mono text-xs md:text-sm tracking-widest pointer-events-none z-[210]">
                {lightboxData.index + 1} / {lightboxData.images.length}
            </div>

            <button onClick={() => setLightboxData({isOpen: false, index: 0, images: []})} className="absolute top-4 md:top-6 right-4 md:right-6 text-white/50 hover:text-white transition-all z-[210] p-2 bg-white/10 rounded-full hover:rotate-90"><X className="w-6 h-6 md:w-8 md:h-8"/></button>
            
            <img loading="lazy" decoding="async" 
                key={lightboxData.index}
                src={lightboxData.images[lightboxData.index]?.originalUrl || lightboxData.images[lightboxData.index]?.url || getDriveThumbUrl(lightboxData.images[lightboxData.index]?.id, 'w2400')} 
                onError={(e) => {
                    // Nếu ảnh gốc chất lượng cao (=s0) bị Google Drive chặn, tự động lùi về ảnh xem trước (=w600)
                    const fallbackSrc = lightboxData.images[lightboxData.index]?.url;
                    if (e.currentTarget.src !== fallbackSrc) {
                        e.currentTarget.src = fallbackSrc;
                    }
                }}
                className="w-full h-full md:max-w-full md:max-h-full object-contain md:shadow-2xl animate-in zoom-in-95 duration-300 select-none pointer-events-none" 
                alt="Zoomed"
                draggable={false}
                referrerPolicy="no-referrer"
            />
            
            <button className="absolute left-2 md:left-6 text-white/30 hover:text-white p-3 md:p-4 rounded-full hidden sm:block hover:bg-white/10 transition-all z-[210]" onClick={prevImg}><ArrowLeft className="w-8 h-8 md:w-14 md:h-14" /></button>
            <button className="absolute right-2 md:right-6 text-white/30 hover:text-white p-3 md:p-4 rounded-full hidden sm:block hover:bg-white/10 transition-all z-[210]" onClick={nextImg}><ArrowRight className="w-8 h-8 md:w-14 md:h-14" /></button>
            
            {/* Hướng dẫn vuốt trên Mobile */}
            <div className="absolute bottom-6 sm:hidden w-full flex justify-center text-white/30 text-xs tracking-widest pointer-events-none z-[210] items-center gap-2">
                <ArrowLeft className="w-3 h-3"/> Vuốt để chuyển ảnh <ArrowRight className="w-3 h-3"/>
            </div>
        </div>
    );
}
