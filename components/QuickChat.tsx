'use client';

/**
 * Bong bóng liên hệ nhanh nổi ở góc trái dưới màn hình:
 * Messenger (Mercibridal) và Zalo hotline.
 * Style + animation nằm ở globals.css (.quick-chat-*).
 */
export default function QuickChat() {
    return (
        <div className="fixed left-4 bottom-5 z-50 flex flex-col gap-2.5" aria-label="Liên hệ nhanh Merci Studio">
            <a
                href="https://m.me/mercibridalvn"
                target="_blank"
                rel="noopener noreferrer"
                className="quick-chat-bubble"
                style={{ background: 'linear-gradient(135deg, #0498fa 0%, #7a3cff 55%, #ff5c87 100%)' }}
                aria-label="Chat Messenger với Merci Bridal"
                title="Chat Messenger với Merci Bridal"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.15.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.08.36-.09.53-.05.91.25 1.88.39 2.91.39 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm6 7.46-2.94 4.67c-.47.74-1.47.93-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.67c.47-.74 1.47-.93 2.17-.4l2.34 1.75c.21.16.51.16.72 0l3.16-2.4c.42-.32.97.18.69.63z" />
                </svg>
                <span className="quick-chat-label">Chat Messenger</span>
            </a>
            <a
                href="https://zalo.me/0888999545"
                target="_blank"
                rel="noopener noreferrer"
                className="quick-chat-bubble"
                style={{ background: '#0068ff' }}
                aria-label="Chat Zalo hotline 0888.999.545"
                title="Chat Zalo hotline 0888.999.545"
            >
                <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em', fontStyle: 'italic' }}>Zalo</span>
                <span className="quick-chat-label">Zalo 0888.999.545</span>
            </a>
        </div>
    );
}
