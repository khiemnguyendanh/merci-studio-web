'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Reveal, TiltCard } from '@/components/Motion';

const feedbackImages = Array.from({ length: 17 }, (_, index) => ({
    src: `/home/feedback/${index + 1}.webp`,
    alt: `Phản hồi thực tế từ khách hàng Merci Studio ${index + 1}`
}));

export default function FeedbackPage() {
    const [activeFeedback, setActiveFeedback] = useState<(typeof feedbackImages)[number] | null>(null);

    useEffect(() => {
        if (!activeFeedback) return;
        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setActiveFeedback(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [activeFeedback]);

    return (
        <div className="feedback-page">
            <header className="feedback-page-header">
                <div>
                    <p className="feedback-page-kicker">LOVE NOTES · 5/5</p>
                    <h1>Những lời thương<br /><em>được gửi lại</em></h1>
                </div>
                <div className="feedback-page-intro">
                    <p>Không có lời giới thiệu nào chân thật hơn cảm nhận của những cô dâu, chú rể đã đồng hành cùng Merci. Mỗi tin nhắn là một kỷ niệm chúng tôi luôn trân trọng.</p>
                    <div className="feedback-page-rating"><span aria-label="5 trên 5 sao">★★★★★</span><i /><small>VÀ CÒN NHIỀU HƠN THẾ</small></div>
                </div>
            </header>

            <div className="feedback-page-grid">
                {feedbackImages.map((feedback, index) => (
                    <Reveal key={feedback.src} delay={(index % 3) * 90}>
                        <TiltCard as="button" type="button" onClick={() => setActiveFeedback(feedback)} className="feedback-card" style={{ width: '100%' }} aria-label={`Xem phản hồi khách hàng ${index + 1}`} maxTilt={5} lift={8}>
                            <span className="feedback-card-number">{String(index + 1).padStart(2, '0')}</span>
                            <Image src={feedback.src} alt={feedback.alt} width={1080} height={1350} sizes="(max-width: 640px) 92vw, (max-width: 1100px) 45vw, 30vw" className="feedback-card-image" />
                            <span className="feedback-card-caption">Lời nhắn từ khách hàng</span>
                        </TiltCard>
                    </Reveal>
                ))}
            </div>

            {activeFeedback && (
                <div role="dialog" aria-modal="true" aria-label="Phản hồi của khách hàng Merci Studio" className="feedback-modal" onClick={() => setActiveFeedback(null)}>
                    <button type="button" className="feedback-modal-close" onClick={() => setActiveFeedback(null)} aria-label="Đóng ảnh phản hồi"><span aria-hidden="true">×</span></button>
                    <div className="feedback-modal-frame" onClick={(event) => event.stopPropagation()}>
                        <Image src={activeFeedback.src} alt={activeFeedback.alt} width={1080} height={1350} sizes="(max-width: 720px) 94vw, 70vh" className="feedback-modal-image" priority />
                    </div>
                </div>
            )}
        </div>
    );
}
