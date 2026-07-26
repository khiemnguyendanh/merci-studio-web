'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type VideoModal = {
    isOpen: boolean;
    youtubeId: string;
};

type VideoLightboxProps = {
    videoModal: VideoModal;
    setVideoModal: (modal: VideoModal) => void;
};

export default function VideoLightbox({ videoModal, setVideoModal }: VideoLightboxProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const close = () => setVideoModal({ isOpen: false, youtubeId: '' });

    useEffect(() => {
        if (!videoModal.isOpen) return;
        const closeModal = () => setVideoModal({ isOpen: false, youtubeId: '' });
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [videoModal.isOpen, setVideoModal]);

    if (!videoModal.isOpen) return null;

    const youtubeId = videoModal.youtubeId.replace(/[^a-zA-Z0-9_-]/g, '');

    return (
        <div role="dialog" aria-modal="true" aria-label="Xem phim cưới" onClick={close} className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
            <button ref={closeButtonRef} type="button" onClick={close} aria-label="Đóng video" className="absolute top-6 right-6 text-white/50 hover:text-white transition-all z-[310] p-2 bg-white/10 rounded-full hover:rotate-90"><X className="w-8 h-8"/></button>
            <div onClick={(event) => event.stopPropagation()} className="w-full max-w-5xl aspect-video rounded-2xl md:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-black">
                <iframe 
                    title="Phim cưới Merci Studio"
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen>
                </iframe>
            </div>
        </div>
    );
}
