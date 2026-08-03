'use client';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import strip1 from '@/public/home/strip-1.png';
import strip2 from '@/public/home/strip-2.png';
import strip3 from '@/public/home/strip-3.png';
import cardAlbum from '@/public/home/card-album.png';
import cardFilm from '@/public/home/card-film.png';
import cardBlog from '@/public/home/card-blog.png';

// Merci Studio — trang chủ redesign (editorial, tông kem/nâu ấm)
// Fluid responsive: không cần media query, dùng clamp() + auto-fit grid.
const serif = "'Cormorant Garamond', Georgia, serif";
const INK = '#2b241e', SUB = '#5c5044', LINE = '#d9d0c3', TAN = '#a08d76', BROWN = '#7a5c44', DARK = '#3d2f26', CREAM = '#faf7f1', BAND = '#f1ebe0';

// Ảnh trang chủ — đặt trong /public/home/ của repo
const IMG = {
    strip1,
    strip2,
    strip3,
    cardAlbum,
    cardFilm,
    cardBlog
};

const capsBtn = (filled: boolean): CSSProperties => ({
    display: 'inline-block', padding: filled ? '15px 36px' : '14px 36px', fontSize: 13, letterSpacing: 2,
    background: filled ? DARK : 'transparent', color: filled ? '#f5f0e8' : DARK,
    border: filled ? 'none' : `1px solid #b7a992`, cursor: 'pointer', fontFamily: 'inherit'
});

type HomeHubProps = {
    user: { email?: string | null } | null;
    isAdmin: boolean;
    navigateToTab: (tab: string, tool?: string) => void;
    openClientAuth: (mode: 'login' | 'register') => void;
    handleClientLogout: () => void;
    setShowClientProfileModal: (show: boolean) => void;
};

type DestinationCard = {
    tab: string;
    tag: string;
    title: string;
    desc: string;
    cta: string;
    dark: boolean;
    img: StaticImageData;
};

const feedbackImages = Array.from({ length: 17 }, (_, index) => ({
    src: `/home/feedback/${index + 1}.webp`,
    alt: `Phản hồi thực tế từ khách hàng Merci Studio ${index + 1}`
}));

export default function HomeHub({ user, isAdmin, navigateToTab, openClientAuth, handleClientLogout, setShowClientProfileModal }: HomeHubProps) {
    const [activeFeedback, setActiveFeedback] = useState<(typeof feedbackImages)[number] | null>(null);

    useEffect(() => {
        if (!activeFeedback) return;
        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') setActiveFeedback(null);
        };
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [activeFeedback]);

    const onAuthClick = () => user ? (isAdmin ? handleClientLogout() : setShowClientProfileModal(true)) : openClientAuth('login');
    const openCardFromKeyboard = (event: KeyboardEvent<HTMLDivElement>, tab: string) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        navigateToTab(tab);
    };

    const cards: DestinationCard[] = [
        { tab: 'collection', tag: 'STUDIO GALLERY', title: 'Bộ sưu tập ảnh', desc: 'Album Pre-wedding nghệ thuật và phóng sự ngày cưới cảm xúc của các cặp đôi.', cta: 'XEM ALBUM →', dark: false, img: IMG.cardAlbum },
        { tab: 'videos', tag: 'CINEMATIC FILMS', title: 'Phim phóng sự cưới', desc: 'Những thước phim ghi lại câu chuyện tình yêu sống động, lãng mạn và chân thực.', cta: 'XEM PHIM →', dark: true, img: IMG.cardFilm },
        { tab: 'blog', tag: 'WEDDING TIPS', title: 'Blog & kinh nghiệm cưới', desc: 'Lời khuyên và cẩm nang giúp ngày trọng đại của bạn diễn ra hoàn hảo nhất.', cta: 'ĐỌC BÀI VIẾT →', dark: false, img: IMG.cardBlog }
    ];
    const tools = [
        { tool: 'create', label: 'TẠO TRANG' },
        { tool: 'gallery', label: 'CHỌN ẢNH' },
        { tool: 'filter', label: 'LỌC ẢNH' }
    ];

    return (
        <div style={{ background: CREAM, color: INK, border: `1px solid ${LINE}` }}>
            {/* hero */}
            <div style={{ textAlign: 'center', padding: 'clamp(52px, 8vw, 88px) clamp(20px, 6vw, 120px) clamp(36px, 5vw, 56px)' }}>
                <div style={{ fontSize: 12, letterSpacing: 4, color: TAN, marginBottom: 'clamp(16px, 3vw, 26px)' }}>PHOTO · MAKEUP · BRIDAL</div>
                <h1 style={{ fontFamily: serif, fontSize: 'clamp(38px, 6.5vw, 82px)', lineHeight: 1.08, fontWeight: 500, margin: 0, textWrap: 'balance' }}>
                    Lưu giữ khoảnh khắc<br /><em style={{ fontWeight: 400 }}>vượt thời gian</em>
                </h1>
                <p style={{ maxWidth: 580, margin: 'clamp(18px, 3vw, 30px) auto 0', fontSize: 'clamp(14px, 1.6vw, 16px)', lineHeight: 1.8, fontWeight: 300, color: SUB }}>
                    Merci Studio đồng hành cùng các cặp đôi ghi dấu những khoảnh khắc yêu thương, chân thực và đong đầy cảm xúc nhất — qua những thước phim, khung hình phóng sự cưới duy mỹ.
                </p>
                <div style={{ marginTop: 'clamp(26px, 4vw, 38px)', display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
                    <button onClick={() => navigateToTab('collection')} style={capsBtn(true)}>XEM BỘ SƯU TẬP</button>
                    <button onClick={() => navigateToTab('booking')} style={capsBtn(false)}>ĐẶT LỊCH TƯ VẤN</button>
                </div>
            </div>
            {/* hero image strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16, padding: '0 clamp(16px, 4vw, 64px)', alignItems: 'end' }}>
                <Image src={IMG.strip1} alt="Cô dâu tại Merci Studio" sizes="(max-width: 720px) 100vw, 33vw"
                    style={{ width: '100%', height: 'clamp(240px, 30vw, 360px)', objectFit: 'cover', display: 'block' }} />
                <Image src={IMG.strip2} alt="Cặp đôi tại Merci Studio" sizes="(max-width: 720px) 100vw, 33vw" fetchPriority="high"
                    style={{ width: '100%', height: 'clamp(280px, 35vw, 420px)', objectFit: 'cover', display: 'block' }} />
                <Image src={IMG.strip3} alt="Chi tiết váy cưới tại Merci Studio" sizes="(max-width: 720px) 100vw, 33vw"
                    style={{ width: '100%', height: 'clamp(240px, 30vw, 360px)', objectFit: 'cover', display: 'block' }} />
            </div>
            {/* destination cards */}
            <div style={{ background: BAND, marginTop: 'clamp(48px, 7vw, 88px)', padding: 'clamp(48px, 7vw, 88px) clamp(16px, 4vw, 64px)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 24px', marginBottom: 'clamp(28px, 4vw, 44px)' }}>
                    <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 500, margin: 0 }}>Khám phá Merci</h2>
                    <div style={{ fontSize: 12, letterSpacing: 3, color: TAN }}>ALBUM · PHIM · CẨM NANG</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
                    {cards.map(c => (
                        <div key={c.tab} onClick={() => navigateToTab(c.tab)} role="button" tabIndex={0}
                            onKeyDown={(event) => openCardFromKeyboard(event, c.tab)}
                            aria-label={`${c.title}: ${c.cta.replace(' →', '').toLocaleLowerCase('vi')}`}
                            style={{
                                display: 'flex', flexDirection: 'column', cursor: 'pointer',
                                background: c.dark ? DARK : CREAM, color: c.dark ? '#ede5d8' : INK,
                                border: `1px solid ${c.dark ? DARK : LINE}`
                            }}>
                            <Image src={c.img} alt={c.title} sizes="(max-width: 720px) 100vw, 33vw"
                                style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '26px 28px 30px', flex: 1 }}>
                            <div style={{ fontSize: 11, letterSpacing: 3, color: c.dark ? '#b99f80' : TAN }}>{c.tag}</div>
                            <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 500 }}>{c.title}</div>
                            <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7, color: c.dark ? '#c9bda9' : SUB }}>{c.desc}</div>
                            <div style={{ marginTop: 'auto', paddingTop: 14, fontSize: 13, letterSpacing: 2, color: c.dark ? '#d9b998' : BROWN }}>{c.cta}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* customer feedback */}
            <section style={{ padding: 'clamp(54px, 8vw, 96px) 0', overflow: 'hidden', borderBottom: `1px solid ${LINE}` }}>
                <div style={{ padding: '0 clamp(20px, 5vw, 72px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '28px 60px', alignItems: 'end' }}>
                    <div>
                        <div style={{ fontSize: 11, letterSpacing: 3.5, color: TAN, marginBottom: 14 }}>LOVE NOTES · 5/5</div>
                        <h2 style={{ fontFamily: serif, fontSize: 'clamp(34px, 5vw, 60px)', lineHeight: 1.05, fontWeight: 500, margin: 0 }}>
                            Những lời thương<br /><em style={{ fontWeight: 400 }}>được gửi lại</em>
                        </h2>
                    </div>
                    <div style={{ maxWidth: 520, justifySelf: 'end' }}>
                        <p style={{ margin: 0, color: SUB, fontSize: 'clamp(14px, 1.5vw, 16px)', lineHeight: 1.8, fontWeight: 300 }}>
                            Không có lời giới thiệu nào chân thật hơn cảm nhận của những cô dâu, chú rể đã đồng hành cùng Merci. Mỗi tin nhắn là một kỷ niệm chúng tôi luôn trân trọng.
                        </p>
                        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, color: BROWN }}>
                            <span aria-label="5 trên 5 sao" style={{ letterSpacing: 4, fontSize: 16 }}>★★★★★</span>
                            <span style={{ width: 36, height: 1, background: LINE }} />
                            <span style={{ fontSize: 11, letterSpacing: 2 }}>17 CÂU CHUYỆN THẬT</span>
                        </div>
                    </div>
                </div>

                <div className="feedback-rail" aria-label="Phản hồi của khách hàng Merci Studio">
                    {feedbackImages.map((feedback, index) => (
                        <button
                            type="button"
                            key={feedback.src}
                            onClick={() => setActiveFeedback(feedback)}
                            className="feedback-card"
                            aria-label={`Xem phản hồi khách hàng ${index + 1}`}
                        >
                            <span className="feedback-card-number">{String(index + 1).padStart(2, '0')}</span>
                            <Image
                                src={feedback.src}
                                alt={feedback.alt}
                                width={1080}
                                height={1350}
                                sizes="(max-width: 640px) 78vw, 340px"
                                className="feedback-card-image"
                            />
                            <span className="feedback-card-caption">Lời nhắn từ khách hàng</span>
                        </button>
                    ))}
                </div>

                <div style={{ padding: '18px clamp(20px, 5vw, 72px) 0', display: 'flex', alignItems: 'center', gap: 14, color: TAN, fontSize: 10, letterSpacing: 2.5 }}>
                    <span>VUỐT ĐỂ XEM THÊM</span>
                    <span style={{ flex: 1, height: 1, background: LINE }} />
                    <span>MERCI COUPLES</span>
                </div>
            </section>
            {/* utilities */}
            <div style={{ padding: 'clamp(40px, 6vw, 64px) clamp(20px, 5vw, 64px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '20px 40px', borderBottom: `1px solid ${LINE}` }}>
                <div>
                    <div style={{ fontSize: 11, letterSpacing: 3, color: TAN, marginBottom: 8 }}>DÀNH CHO KHÁCH HÀNG &amp; STUDIO</div>
                    <div style={{ fontFamily: serif, fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 500 }}>
                        {user ? `Xin chào, ${user.email}` : 'Khu vực khách hàng'}
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <button onClick={onAuthClick} style={capsBtn(true)}>
                        {user ? (isAdmin ? 'ĐĂNG XUẤT (ADMIN)' : 'TÀI KHOẢN') : 'ĐĂNG NHẬP / ĐĂNG KÝ'}
                    </button>
                    {tools.map(t => (
                        <button key={t.tool} onClick={() => navigateToTab('tool', t.tool)} style={capsBtn(false)}>{t.label}</button>
                    ))}
                </div>
            </div>
            {/* contact footer */}
            <div style={{ padding: 'clamp(44px, 6vw, 72px) clamp(20px, 5vw, 64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '40px 48px' }}>
                <div>
                    <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 600 }}>Merci Studio</div>
                    <div style={{ marginTop: 12, fontSize: 14, fontWeight: 300, color: SUB, lineHeight: 1.7 }}>
                        “Lưu giữ khoảnh khắc vượt thời gian”<br />Hẹn gặp bạn tại studio.
                    </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 2.1, color: SUB }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, color: TAN, marginBottom: 10 }}>ĐỊA CHỈ</div>
                    <div>244 Đội Cấn, Ba Đình, Hà Nội</div>
                    <div>650 Thân Nhân Trung, Việt Yên, Bắc Ninh</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 2.1, color: SUB }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, color: TAN, marginBottom: 10 }}>LIÊN HỆ</div>
                    <div>0888.999.545 — 0877.999.545</div>
                    <div>vaycuoidouyin@gmail.com</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 8, fontSize: 13, letterSpacing: 1 }}>
                        <a href="https://www.facebook.com/merciwedding.vn" target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>Facebook</a>
                        <a href="https://www.instagram.com/merciwedding.vn/" target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>Instagram</a>
                        <a href="https://www.tiktok.com/@mercistudiovn" target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>TikTok</a>
                        <a href="https://zalo.me/0888999545" target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>Zalo</a>
                    </div>
                </div>
            </div>

            {activeFeedback && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Phản hồi của khách hàng Merci Studio"
                    className="feedback-modal"
                    onClick={() => setActiveFeedback(null)}
                >
                    <button type="button" className="feedback-modal-close" onClick={() => setActiveFeedback(null)} aria-label="Đóng ảnh phản hồi">
                        <span aria-hidden="true">×</span>
                    </button>
                    <div className="feedback-modal-frame" onClick={(event) => event.stopPropagation()}>
                        <Image
                            src={activeFeedback.src}
                            alt={activeFeedback.alt}
                            width={1080}
                            height={1350}
                            sizes="(max-width: 720px) 94vw, 70vh"
                            className="feedback-modal-image"
                            priority
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
