// @ts-nocheck
/* eslint-disable */
'use client';
import React from 'react';
import { X } from 'lucide-react';

export default function VideoLightbox({ videoModal, setVideoModal }) {
    if (!videoModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <button onClick={() => setVideoModal({isOpen: false, youtubeId: ''})} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all z-[310] p-2 bg-white/10 rounded-full hover:rotate-90"><X className="w-8 h-8"/></button>
            <div className="w-full max-w-5xl aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-black">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${videoModal.youtubeId}?autoplay=1`} 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen>
                </iframe>
            </div>
        </div>
    );
}
