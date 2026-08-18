'use client';
import Image, { type StaticImageData } from 'next/image';
import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal, TiltCard } from '@/components/Motion';
import strip1 from '@/public/home/strip-1.png';
import strip2 from '@/public/home/strip-2.png';
import strip3 from '@/public/home/strip-3.png';
import cardAlbum from '@/public/home/card-album.png';
import cardFilm from '@/public/home/card-film.png';
import cardBlog from '@/public/home/card-blog.png';

// Merci Studio — trang chủ dạng landing page (editorial, tông kem/nâu ấm)
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

const kickerStyle = (color = TAN): CSSProperties => ({ fontSize: 11, letterSpacing: 3.5, color, marginBottom: 14 });
const h2Style: CSSProperties = { fontFamily: serif, fontSize: 'clamp(30px, 4.5vw, 52px)', lineHeight: 1.08, fontWeight: 500, margin: 0 };

type HomeHubProps = {
    user: { email?: string | null } | null;
    isAdmin: boolean;
    navigateToTab: (tab: string, tool?: string) => void;
    navigateToVest?: () => void;
    navigateToDress?: () => void;
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

export default function HomeHub({ user, isAdmin, navigateToTab, navigateToVest, navigateToDress, openClientAuth, handleClientLogout, setShowClientProfileModal }: HomeHubProps) {
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

    // Số liệu giới thiệu — chỉnh trực tiếp tại đây khi cần cập nhật
    const stats = [
        { value: '10+', label: 'Năm kinh nghiệm của Owner' },
        { value: '1000+', label: 'Cặp đôi đồng hành' },
        { value: '2', label: 'Cơ sở Hà Nội · Bắc Ninh' },
        { value: '5/5', label: 'Đánh giá từ các cặp đôi' }
    ];

    const services = [
        { num: '01', title: 'Chụp ảnh cưới & Pre-wedding', desc: 'Concept nghệ thuật trong studio và ngoại cảnh, tone màu duy mỹ thiết kế riêng cho từng cặp đôi.', cta: 'XEM BỘ SƯU TẬP', action: () => navigateToTab('collection') },
        { num: '02', title: 'Phóng sự cưới & Cinematic film', desc: 'Ghi lại trọn vẹn cảm xúc ngày cưới bằng những thước phim chân thực, sống động và lãng mạn.', cta: 'XEM PHIM', action: () => navigateToTab('videos') },
        { num: '03', title: 'Váy cưới Douyin', desc: 'Bộ sưu tập váy cưới phong cách Douyin thời thượng, đa dạng thiết kế cho cô dâu lựa chọn.', cta: 'XEM VÁY CƯỚI', action: () => (navigateToDress ? navigateToDress() : navigateToTab('collection')) },
        { num: '04', title: 'Vest chú rể', desc: 'Các mẫu vest lịch lãm, đầy đủ kích cỡ — sẵn sàng cho ngày trọng đại của chú rể.', cta: 'XEM VEST', action: () => (navigateToVest ? navigateToVest() : navigateToTab('collection')) },
        { num: '05', title: 'Makeup & làm tóc cô dâu', desc: 'Đội ngũ makeup chuyên nghiệp đồng hành cùng cô dâu từ buổi chụp đến lễ cưới.', cta: 'ĐẶT LỊCH', action: () => navigateToTab('booking') },
        { num: '06', title: 'Kỷ yếu · Gia đình · Sự kiện', desc: 'Lưu giữ kỷ niệm cùng bạn bè và gia đình với ekip giàu kinh nghiệm sự kiện lớn nhỏ.', cta: 'NHẬN TƯ VẤN', action: () => navigateToTab('booking') }
    ];

    const steps = [
        { num: '01', title: 'Tư vấn & giữ lịch', desc: 'Liên hệ hotline, Messenger hoặc Zalo để nhận báo giá chi tiết và giữ lịch chụp.' },
        { num: '02', title: 'Chọn concept & trang phục', desc: 'Thử váy cưới, vest tại cơ sở; chốt concept, địa điểm và timeline cùng ekip.' },
        { num: '03', title: 'Ngày chụp & ngày cưới', desc: 'Makeup, chụp ảnh và quay phim theo kịch bản đã thống nhất — bạn chỉ cần tận hưởng.' },
        { num: '04', title: 'Chọn ảnh online', desc: 'Nhận gallery riêng tư có mã bảo mật, thả tim chọn ảnh yêu thích mọi lúc mọi nơi.' },
        { num: '05', title: 'Nhận album & phim', desc: 'Ảnh phóng, album thiết kế và phim hoàn thiện được trao tận tay cô dâu chú rể.' }
    ];

    const reasons = [
        { title: 'Ekip tận tâm', desc: 'Dày dặn kinh nghiệm qua các sự kiện lớn nhỏ, chăm chút chu đáo từng chi tiết.' },
        { title: 'Màu ảnh độc bản', desc: 'Tone màu sang trọng, tự nhiên được thiết kế riêng cho mỗi concept chụp.' },
        { title: 'Bảo mật & tiện lợi', desc: 'Nhận ảnh, chọn ảnh online tiện lợi với mã bảo mật an toàn cho riêng bạn.' },
        { title: 'Trọn gói một địa chỉ', desc: 'Photo, makeup, váy cưới, vest — chuẩn bị đầy đủ cho ngày cưới tại một nơi.' }
    ];

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

    const socials = [
        { label: 'Facebook · Merci Bridal', href: 'https://www.facebook.com/mercibridalvn' },
        { label: 'Facebook · Merci Wedding', href: 'https://www.facebook.com/merciwedding.vn' },
        { label: 'Facebook · Merci Bắc Ninh', href: 'https://www.facebook.com/MerciStudioBN' },
        { label: 'TikTok · @mercibridal', href: 'https://www.tiktok.com/@mercibridal' },
        { label: 'TikTok · @mercistudiovn', href: 'https://www.tiktok.com/@mercistudiovn' },
        { label: 'Instagram · merciwedding.vn', href: 'https://www.instagram.com/merciwedding.vn/' }
    ];

    return (
        <div style={{ background: CREAM, color: INK, border: `1px solid ${LINE}` }}>
            {/* hero */}
            <div style={{ textAlign: 'center', padding: 'clamp(52px, 8vw, 88px) clamp(20px, 6vw, 120px) clamp(36px, 5vw, 56px)' }}>
                <div className="animate-in fade-in slide-in-from-bottom-4" style={{ fontSize: 12, letterSpacing: 4, color: TAN, marginBottom: 'clamp(16px, 3vw, 26px)' }}>PHOTO · MAKEUP · BRIDAL</div>
                <h1 className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '90ms', fontFamily: serif, fontSize: 'clamp(38px, 6.5vw, 82px)', lineHeight: 1.08, fontWeight: 500, margin: 0, textWrap: 'balance' }}>
                    Lưu giữ khoảnh khắc<br /><em style={{ fontWeight: 400 }}>vượt thời gian</em>
                </h1>
                <p className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '180ms', maxWidth: 580, margin: 'clamp(18px, 3vw, 30px) auto 0', fontSize: 'clamp(14px, 1.6vw, 16px)', lineHeight: 1.8, fontWeight: 300, color: SUB }}>
                    Merci Studio đồng hành cùng các cặp đôi ghi dấu những khoảnh khắc yêu thương, chân thực và đong đầy cảm xúc nhất — qua những thước phim, khung hình phóng sự cưới duy mỹ.
                </p>
                <div className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '270ms', marginTop: 'clamp(26px, 4vw, 38px)', display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
                    <button className="btn-3d" onClick={() => navigateToTab('collection')} style={capsBtn(true)}>XEM BỘ SƯU TẬP</button>
                    <button className="btn-3d" onClick={() => navigateToTab('booking')} style={capsBtn(false)}>ĐẶT LỊCH TƯ VẤN</button>
                </div>
                <div className="animate-in fade-in" style={{ animationDelay: '380ms', marginTop: 'clamp(22px, 3vw, 30px)', display: 'flex', flexWrap: 'wrap', gap: '8px 22px', justifyContent: 'center', alignItems: 'center', fontSize: 10.5, letterSpacing: 2.2, color: TAN }}>
                    <span style={{ color: BROWN }}>★★★★★ 5/5</span>
                    <span aria-hidden="true" style={{ width: 22, height: 1, background: LINE }} />
                    <span>VÁY CƯỚI DOUYIN</span>
                    <span aria-hidden="true" style={{ width: 22, height: 1, background: LINE }} />
                    <span>HÀ NỘI · BẮC NINH</span>
                </div>
            </div>
            {/* hero image strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 16, padding: '0 clamp(16px, 4vw, 64px)', alignItems: 'end', perspective: 1400 }}>
                <Reveal delay={0}>
                    <Image src={IMG.strip1} alt="Cô dâu tại Merci Studio" sizes="(max-width: 720px) 100vw, 33vw"
                        style={{ width: '100%', height: 'clamp(240px, 30vw, 360px)', objectFit: 'cover', display: 'block' }} />
                </Reveal>
                <Reveal delay={110}>
                    <Image src={IMG.strip2} alt="Cặp đôi tại Merci Studio" sizes="(max-width: 720px) 100vw, 33vw" fetchPriority="high"
                        style={{ width: '100%', height: 'clamp(280px, 35vw, 420px)', objectFit: 'cover', display: 'block' }} />
                </Reveal>
                <Reveal delay={220}>
                    <Image src={IMG.strip3} alt="Chi tiết váy cưới tại Merci Studio" sizes="(max-width: 720px) 100vw, 33vw"
                        style={{ width: '100%', height: 'clamp(240px, 30vw, 360px)', objectFit: 'cover', display: 'block' }} />
                </Reveal>
            </div>
            {/* stats band */}
            <Reveal style={{ margin: 'clamp(44px, 6vw, 72px) clamp(16px, 4vw, 64px) 0', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}>
                {stats.map((s, i) => (
                    <div key={s.label} style={{ padding: 'clamp(22px, 3vw, 34px) 18px', textAlign: 'center', borderLeft: i > 0 ? `1px solid ${LINE}` : 'none' }}>
                        <div style={{ fontFamily: serif, fontSize: 'clamp(30px, 3.6vw, 44px)', fontWeight: 500, color: DARK, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ marginTop: 10, fontSize: 10.5, letterSpacing: 2.2, color: TAN, textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                ))}
            </Reveal>
            {/* services */}
            <div style={{ padding: 'clamp(48px, 7vw, 88px) clamp(16px, 4vw, 64px)' }}>
                <Reveal style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 24px', marginBottom: 'clamp(26px, 4vw, 40px)' }}>
                    <div>
                        <div style={kickerStyle()}>DỊCH VỤ TẠI MERCI</div>
                        <h2 style={h2Style}>Trọn vẹn cho<br /><em style={{ fontWeight: 400 }}>ngày trọng đại</em></h2>
                    </div>
                    <div style={{ maxWidth: 440, fontSize: 'clamp(13.5px, 1.4vw, 15px)', lineHeight: 1.8, fontWeight: 300, color: SUB }}>
                        Từ bộ ảnh Pre-wedding, phóng sự ngày cưới đến váy cưới, vest và makeup — mọi khâu chuẩn bị được Merci chăm chút tại một địa chỉ.
                    </div>
                </Reveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', borderTop: `1px solid ${LINE}`, borderLeft: `1px solid ${LINE}` }}>
                    {services.map((sv, i) => (
                        <Reveal key={sv.num} delay={(i % 3) * 90}>
                            <div
                                className="service-row"
                                role="button"
                                tabIndex={0}
                                onClick={sv.action}
                                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); sv.action(); } }}
                                aria-label={`${sv.title}: ${sv.cta.toLocaleLowerCase('vi')}`}
                                style={{ height: '100%', padding: 'clamp(24px, 3vw, 34px) clamp(20px, 2.6vw, 30px)', borderRight: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, display: 'flex', flexDirection: 'column', gap: 12 }}
                            >
                                <div style={{ fontFamily: serif, fontSize: 30, color: TAN, lineHeight: 1 }}>{sv.num}</div>
                                <div style={{ fontFamily: serif, fontSize: 'clamp(21px, 2.2vw, 26px)', fontWeight: 500, lineHeight: 1.2 }}>{sv.title}</div>
                                <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.75, color: SUB }}>{sv.desc}</div>
                                <div style={{ marginTop: 'auto', paddingTop: 10, fontSize: 12, letterSpacing: 2, color: BROWN, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {sv.cta} <span className="service-arrow" aria-hidden="true" style={{ display: 'inline-block', transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>→</span>
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
            {/* destination cards */}
            <div style={{ background: BAND, padding: 'clamp(48px, 7vw, 88px) clamp(16px, 4vw, 64px)' }}>
                <Reveal style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 24px', marginBottom: 'clamp(28px, 4vw, 44px)' }}>
                    <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 500, margin: 0 }}>Khám phá Merci</h2>
                    <div style={{ fontSize: 12, letterSpacing: 3, color: TAN }}>ALBUM · PHIM · CẨM NANG</div>
                </Reveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: 20 }}>
                    {cards.map((c, cardIndex) => (
                        <Reveal key={c.tab} delay={cardIndex * 110}>
                            <TiltCard onClick={() => navigateToTab(c.tab)} role="button" tabIndex={0}
                                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => openCardFromKeyboard(event, c.tab)}
                                aria-label={`${c.title}: ${c.cta.replace(' →', '').toLocaleLowerCase('vi')}`}
                                maxTilt={5.5}
                                lift={12}
                                style={{
                                    display: 'flex', flexDirection: 'column', cursor: 'pointer', height: '100%',
                                    background: c.dark ? DARK : CREAM, color: c.dark ? '#ede5d8' : INK,
                                    border: `1px solid ${c.dark ? DARK : LINE}`
                                }}>
                                <div style={{ overflow: 'hidden' }}>
                                    <Image src={c.img} alt={c.title} sizes="(max-width: 720px) 100vw, 33vw"
                                        className="destination-card-image"
                                        style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '26px 28px 30px', flex: 1 }}>
                                    <div style={{ fontSize: 11, letterSpacing: 3, color: c.dark ? '#b99f80' : TAN }}>{c.tag}</div>
                                    <div style={{ fontFamily: serif, fontSize: 30, fontWeight: 500 }}>{c.title}</div>
                                    <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7, color: c.dark ? '#c9bda9' : SUB }}>{c.desc}</div>
                                    <div style={{ marginTop: 'auto', paddingTop: 14, fontSize: 13, letterSpacing: 2, color: c.dark ? '#d9b998' : BROWN }}>{c.cta}</div>
                                </div>
                            </TiltCard>
                        </Reveal>
                    ))}
                </div>
            </div>
            {/* process */}
            <div style={{ padding: 'clamp(48px, 7vw, 88px) clamp(16px, 4vw, 64px)' }}>
                <Reveal style={{ textAlign: 'center', marginBottom: 'clamp(30px, 4.5vw, 48px)' }}>
                    <div style={kickerStyle()}>QUY TRÌNH LÀM VIỆC</div>
                    <h2 style={{ ...h2Style, textWrap: 'balance' }}>Hành trình cùng Merci,<br /><em style={{ fontWeight: 400 }}>nhẹ nhàng từng bước</em></h2>
                </Reveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 'clamp(18px, 2.5vw, 28px)' }}>
                    {steps.map((st, i) => (
                        <Reveal key={st.num} delay={i * 90}>
                            <div style={{ borderTop: `2px solid ${i === steps.length - 1 ? BROWN : LINE}`, paddingTop: 18, height: '100%' }}>
                                <div style={{ fontFamily: serif, fontSize: 34, color: i === steps.length - 1 ? BROWN : TAN, lineHeight: 1 }}>{st.num}</div>
                                <div style={{ marginTop: 10, fontSize: 15.5, fontWeight: 600, letterSpacing: 0.2 }}>{st.title}</div>
                                <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 300, lineHeight: 1.75, color: SUB }}>{st.desc}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
            {/* why merci */}
            <div style={{ background: BAND, padding: 'clamp(48px, 7vw, 88px) clamp(16px, 4vw, 64px)' }}>
                <Reveal style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 24px', marginBottom: 'clamp(26px, 4vw, 40px)' }}>
                    <div>
                        <div style={kickerStyle()}>VÌ SAO CHỌN MERCI</div>
                        <h2 style={h2Style}>Được tin tưởng<br /><em style={{ fontWeight: 400 }}>bởi các cặp đôi</em></h2>
                    </div>
                    <div style={{ fontSize: 12, letterSpacing: 3, color: TAN }}>TẬN TÂM · DUY MỸ · TIỆN LỢI</div>
                </Reveal>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 'clamp(14px, 2vw, 20px)' }}>
                    {reasons.map((r, i) => (
                        <Reveal key={r.title} delay={i * 90}>
                            <div className="card-3d" style={{ background: CREAM, border: `1px solid ${LINE}`, padding: 'clamp(22px, 2.8vw, 30px)', height: '100%' }}>
                                <div style={{ fontFamily: serif, fontSize: 'clamp(20px, 2vw, 24px)', fontWeight: 500 }}>{r.title}</div>
                                <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 300, lineHeight: 1.75, color: SUB }}>{r.desc}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
            {/* customer feedback */}
            <section style={{ padding: 'clamp(54px, 8vw, 96px) 0', overflow: 'hidden', borderBottom: `1px solid ${LINE}` }}>
                <Reveal style={{ padding: '0 clamp(20px, 5vw, 72px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '28px 60px', alignItems: 'end' }}>
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
                            <span style={{ fontSize: 11, letterSpacing: 2 }}>VÀ CÒN NHIỀU HƠN THẾ</span>
                        </div>
                    </div>
                </Reveal>

                <div className="feedback-rail" aria-label="Phản hồi của khách hàng Merci Studio">
                    {feedbackImages.map((feedback, index) => (
                        <TiltCard
                            as="button"
                            type="button"
                            key={feedback.src}
                            onClick={() => setActiveFeedback(feedback)}
                            className="feedback-card"
                            aria-label={`Xem phản hồi khách hàng ${index + 1}`}
                            maxTilt={5}
                            lift={8}
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
                        </TiltCard>
                    ))}
                </div>

                <div style={{ padding: '18px clamp(20px, 5vw, 72px) 0', display: 'flex', alignItems: 'center', gap: 14, color: TAN, fontSize: 10, letterSpacing: 2.5 }}>
                    <span>VUỐT ĐỂ XEM THÊM</span>
                    <span style={{ flex: 1, height: 1, background: LINE }} />
                    <span>MERCI COUPLES</span>
                </div>
            </section>
            {/* CTA band */}
            <div style={{ background: DARK, color: '#ede5d8', padding: 'clamp(52px, 8vw, 92px) clamp(20px, 5vw, 72px)', textAlign: 'center' }}>
                <Reveal>
                    <div style={{ fontSize: 11, letterSpacing: 3.5, color: '#b99f80', marginBottom: 16 }}>MERCI STUDIO</div>
                    <h2 style={{ fontFamily: serif, fontSize: 'clamp(32px, 5vw, 58px)', lineHeight: 1.1, fontWeight: 500, margin: 0, textWrap: 'balance' }}>
                        Sẵn sàng cho<br /><em style={{ fontWeight: 400 }}>ngày trọng đại của bạn?</em>
                    </h2>
                    <p style={{ maxWidth: 520, margin: '18px auto 0', fontSize: 'clamp(13.5px, 1.5vw, 15.5px)', lineHeight: 1.8, fontWeight: 300, color: '#c9bda9' }}>
                        Nhắn cho Merci qua Messenger, Zalo hoặc để lại thông tin — chúng tôi sẽ tư vấn concept và báo giá chi tiết dành riêng cho bạn.
                    </p>
                    <div style={{ marginTop: 'clamp(26px, 4vw, 36px)', display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
                        <button className="btn-3d" onClick={() => navigateToTab('booking')} style={{ ...capsBtn(true), background: '#f5f0e8', color: DARK }}>ĐẶT LỊCH TƯ VẤN</button>
                        <a className="btn-3d" href="tel:0888999545" style={{ ...capsBtn(false), color: '#ede5d8', border: '1px solid #6b5a49', textDecoration: 'none' }}>GỌI 0888.999.545</a>
                    </div>
                    <div style={{ marginTop: 22, fontSize: 10.5, letterSpacing: 2.2, color: '#a08d76' }}>HOTLINE 0888.999.545 · 0877.999.545 — PHẢN HỒI NHANH QUA MESSENGER & ZALO</div>
                </Reveal>
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
                    <button className="btn-3d" onClick={onAuthClick} style={capsBtn(true)}>
                        {user ? (isAdmin ? 'ĐĂNG XUẤT (ADMIN)' : 'TÀI KHOẢN') : 'ĐĂNG NHẬP / ĐĂNG KÝ'}
                    </button>
                    {tools.map(t => (
                        <button className="btn-3d" key={t.tool} onClick={() => navigateToTab('tool', t.tool)} style={capsBtn(false)}>{t.label}</button>
                    ))}
                </div>
            </div>
            {/* contact footer */}
            <Reveal style={{ padding: 'clamp(44px, 6vw, 72px) clamp(20px, 5vw, 64px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '40px 48px' }}>
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
                    <div><a className="footer-link" href="tel:0888999545" style={{ color: SUB, textDecoration: 'none' }}>0888.999.545</a> — <a className="footer-link" href="tel:0877999545" style={{ color: SUB, textDecoration: 'none' }}>0877.999.545</a></div>
                    <div><a className="footer-link" href="mailto:vaycuoidouyin@gmail.com" style={{ color: SUB, textDecoration: 'none' }}>vaycuoidouyin@gmail.com</a></div>
                    <div><a className="footer-link" href="https://zalo.me/0888999545" target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>Zalo · 0888.999.545</a></div>
                    <div><a className="footer-link" href="https://m.me/mercibridalvn" target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>Messenger · Merci Bridal</a></div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 300, lineHeight: 2.1, color: SUB }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, color: TAN, marginBottom: 10 }}>KẾT NỐI VỚI MERCI</div>
                    {socials.map(s => (
                        <div key={s.href}>
                            <a className="footer-link" href={s.href} target="_blank" rel="noreferrer" style={{ color: BROWN, textDecoration: 'none' }}>{s.label}</a>
                        </div>
                    ))}
                </div>
            </Reveal>

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
