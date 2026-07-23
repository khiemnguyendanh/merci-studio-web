// @ts-nocheck
'use client';
import React from 'react';

// Merci Studio — trang chủ redesign (editorial, tông kem/nâu ấm)
// Fluid responsive: không cần media query, dùng clamp() + auto-fit grid.
const serif = "'Cormorant Garamond', Georgia, serif";
const INK = '#2b241e', SUB = '#5c5044', LINE = '#d9d0c3', TAN = '#a08d76', BROWN = '#7a5c44', DARK = '#3d2f26', CREAM = '#faf7f1', BAND = '#f1ebe0';

// Ảnh trang chủ — đặt trong /public/home/ của repo
const IMG = {
    strip1: '/home/strip-1.png',
    strip2: '/home/strip-2.png',
    strip3: '/home/strip-3.png',
    cardAlbum: '/home/card-album.png',
    cardFilm: '/home/card-film.png',
    cardBlog: '/home/card-blog.png'
};

const capsBtn = (filled) => ({
    display: 'inline-block', padding: filled ? '15px 36px' : '14px 36px', fontSize: 13, letterSpacing: 2,
    background: filled ? DARK : 'transparent', color: filled ? '#f5f0e8' : DARK,
    border: filled ? 'none' : `1px solid #b7a992`, cursor: 'pointer', fontFamily: 'inherit'
});

export default function HomeHub({ user, isAdmin, navigateToTab, openClientAuth, handleClientLogout, setShowClientProfileModal, heroSrc }) {
    const onAuthClick = () => user ? (isAdmin ? handleClientLogout() : setShowClientProfileModal(true)) : openClientAuth('login');

    const cards = [
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
                <img src={IMG.strip1} alt="Cô dâu — Merci Studio" loading="lazy" decoding="async"
                    style={{ width: '100%', height: 'clamp(240px, 30vw, 360px)', objectFit: 'cover', display: 'block' }} />
                <img src={IMG.strip2} alt="Cặp đôi — Merci Studio" loading="lazy" decoding="async"
                    style={{ width: '100%', height: 'clamp(280px, 35vw, 420px)', objectFit: 'cover', display: 'block' }} />
                <img src={IMG.strip3} alt="Chi tiết — Merci Studio" loading="lazy" decoding="async"
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
                            onKeyDown={(e) => e.key === 'Enter' && navigateToTab(c.tab)}
                            style={{
                                display: 'flex', flexDirection: 'column', cursor: 'pointer',
                                background: c.dark ? DARK : CREAM, color: c.dark ? '#ede5d8' : INK,
                                border: `1px solid ${c.dark ? DARK : LINE}`
                            }}>
                            <img src={c.img} alt={c.title} loading="lazy" decoding="async"
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
        </div>
    );
}
