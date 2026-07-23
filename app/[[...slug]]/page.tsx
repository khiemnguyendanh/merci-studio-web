// @ts-nocheck
/* eslint-disable */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import {
    Camera, Wand2, Copy, ArrowRight, Heart,
    Download, Image as ImageIcon, RefreshCcw, Zap, ArrowLeft,
    MapPin, Phone, Plus, X, Folder, FolderDown, AlertCircle, User,
    Link as LinkIcon, Edit, Trash2, Star, PlayCircle, ArrowUp, ArrowDown, Mail, Eye,
    BookOpen, FileText, Calendar, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react';
import PromotionManager from '@/components/PromotionManager';
import LuckyWheelPopup from '@/components/LuckyWheelPopup';
import HomeHub from '@/components/HomeHub';

// === FIREBASE IMPORTS ===
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs, increment, runTransaction } from 'firebase/firestore';

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Khởi tạo Firebase
let app, auth, db;
if (typeof window !== 'undefined') {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
}



const getLightboxImageUrl = (img, getDriveThumbUrl, size = 'w2400') => {
    if (!img) return DEFAULT_COVER;
    if (typeof img === 'string') return img;

    return (
        img.originalUrl ||
        img.url ||
        img.fullUrl ||
        img.src ||
        img.thumbnailUrl ||
        (img.id && typeof getDriveThumbUrl === 'function' ? getDriveThumbUrl(img.id, size) : '') ||
        DEFAULT_COVER
    );
};

const getLightboxImageName = (img, fallback = 'Merci Studio') => {
    if (!img || typeof img === 'string') return fallback;
    return img.name || img.title || img.alt || fallback;
};

function SmoothImageLightbox({
    lightboxData,
    setLightboxData,
    touchStart,
    setTouchStart,
    touchEnd,
    setTouchEnd,
    nextImg,
    prevImg,
    getDriveThumbUrl,
    direction = 0,
    showFileName = false,
    effectiveSelectedImages,
    toggleImageSelect
}) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isChanging, setIsChanging] = useState(false);

    const images = lightboxData?.images || [];
    const currentIndex = Number(lightboxData?.index || 0);
    const currentImage = images[currentIndex];
    const currentUrl = getLightboxImageUrl(currentImage, getDriveThumbUrl, 'w2400');
    const currentName = showFileName ? getLightboxImageName(currentImage, 'Merci Studio') : 'Merci Studio';

    const closeLightbox = () => {
        setLightboxData({ isOpen: false, index: 0, images: [] });
    };

    useEffect(() => {
        if (!lightboxData?.isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [lightboxData?.isOpen]);

    useEffect(() => {
        if (!lightboxData?.isOpen || !images.length) return;

        setImageLoaded(false);
        setIsChanging(true);

        const preloadIndexes = [
            currentIndex,
            (currentIndex + 1) % images.length,
            (currentIndex - 1 + images.length) % images.length,
            (currentIndex + 2) % images.length,
            (currentIndex - 2 + images.length) % images.length
        ];

        const uniqueUrls = Array.from(new Set(
            preloadIndexes
                .map(index => getLightboxImageUrl(images[index], getDriveThumbUrl, 'w2400'))
                .filter(Boolean)
        ));

        uniqueUrls.forEach(src => {
            const img = new window.Image();
            img.decoding = 'async';
            img.loading = 'eager';
            img.src = src;
        });

        const timer = window.setTimeout(() => setIsChanging(false), 180);
        return () => window.clearTimeout(timer);
    }, [lightboxData?.isOpen, currentIndex, images, getDriveThumbUrl]);

    if (!lightboxData?.isOpen || !images.length) return null;

    const handleTouchStart = (e) => {
        setTouchStart(e.targetTouches?.[0]?.clientX || 0);
        setTouchEnd(null);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches?.[0]?.clientX || 0);
    };

    const handleTouchEnd = () => {
        if (touchStart === null || touchEnd === null) return;

        const distance = touchStart - touchEnd;
        const minSwipeDistance = 45;

        if (distance > minSwipeDistance) nextImg();
        if (distance < -minSwipeDistance) prevImg();

        setTouchStart(null);
        setTouchEnd(null);
    };

    const goPrev = (e) => {
        e.stopPropagation();
        prevImg();
    };

    const goNext = (e) => {
        e.stopPropagation();
        nextImg();
    };

    const translateX = imageLoaded ? 0 : direction === 1 ? 22 : direction === -1 ? -22 : 0;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center select-none"
            onClick={closeLightbox}
        >
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-b from-black/70 to-transparent">
                <div className="text-white">
                    <div className="text-sm md:text-base font-bold line-clamp-1 max-w-[68vw]" title={currentName || 'Merci Studio'}>
                        {currentName || 'Merci Studio'}
                    </div>
                    <div className="text-xs text-white/60 mt-0.5">
                        Ảnh {currentIndex + 1} / {images.length}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {toggleImageSelect && currentImage?.id && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleImageSelect(currentImage.id, e);
                            }}
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                                effectiveSelectedImages?.has(currentImage.id)
                                    ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30 scale-105'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            aria-label="Thả tim ảnh"
                        >
                            <Heart className={`w-5 h-5 ${effectiveSelectedImages?.has(currentImage.id) ? 'fill-current' : ''}`} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            closeLightbox();
                        }}
                        className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 hover:rotate-90"
                        aria-label="Đóng ảnh"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {images.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={goPrev}
                        className="hidden md:flex absolute left-6 z-20 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-all active:scale-95"
                        aria-label="Ảnh trước"
                    >
                        <ArrowLeft className="w-7 h-7" />
                    </button>

                    <button
                        type="button"
                        onClick={goNext}
                        className="hidden md:flex absolute right-6 z-20 w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-all active:scale-95"
                        aria-label="Ảnh sau"
                    >
                        <ArrowRight className="w-7 h-7" />
                    </button>
                </>
            )}

            <div
                className="relative w-full h-full flex items-center justify-center p-3 md:p-10 pt-20 pb-24"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    </div>
                )}

                <img
                    key={`${currentIndex}-${currentUrl}`}
                    src={currentUrl}
                    alt={currentName}
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    onError={(e) => {
                        const img = currentImage;
                        const fallback = typeof img === 'object'
                            ? (img.thumbnailUrl || img.url || DEFAULT_COVER)
                            : DEFAULT_COVER;
                        if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                    }}
                    className="max-w-full max-h-full object-contain rounded-xl md:rounded-2xl shadow-2xl will-change-transform"
                    style={{
                        opacity: imageLoaded ? 1 : 0,
                        transform: `translate3d(${translateX}px,0,0) scale(${imageLoaded ? 1 : 0.985})`,
                        transition: 'opacity 240ms ease, transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
                        imageRendering: 'auto'
                    }}
                />

                {isChanging && imageLoaded && (
                    <div className="pointer-events-none absolute inset-0 bg-black/5 transition-opacity" />
                )}
            </div>

            {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-20 px-4">
                    <div className="mx-auto max-w-4xl overflow-x-auto no-scrollbar">
                        <div className="flex justify-center gap-2 min-w-max px-2">
                            {images.slice(Math.max(0, currentIndex - 4), Math.min(images.length, currentIndex + 5)).map((img, localIndex) => {
                                const realIndex = Math.max(0, currentIndex - 4) + localIndex;
                                const thumbUrl = getLightboxImageUrl(img, getDriveThumbUrl, 'w300');
                                const isActive = realIndex === currentIndex;

                                return (
                                    <button
                                        key={`${realIndex}-${thumbUrl}`}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxData(prev => ({
                                                ...prev,
                                                index: realIndex
                                            }));
                                        }}
                                        className={`w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border-2 transition-all relative ${isActive
                                            ? 'border-white scale-105 opacity-100'
                                            : 'border-white/20 opacity-55 hover:opacity-90'
                                            }`}
                                        aria-label={`Xem ảnh ${realIndex + 1}`}
                                    >
                                        <img
                                            src={thumbUrl}
                                            alt=""
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
                                        {effectiveSelectedImages?.has(img.id) && (
                                            <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full p-0.5 shadow-md z-10 pointer-events-none">
                                                <Heart className="w-2.5 h-2.5 fill-current" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <p className="text-center text-white/45 text-[11px] mt-3 md:hidden">
                        Vuốt trái/phải để chuyển ảnh
                    </p>
                </div>
            )}
        </div>
    );
}

const ImageLightbox = SmoothImageLightbox;
const VideoLightbox = dynamic(() => import('@/components/VideoLightbox'), { ssr: false });

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// Danh sách email được phép vào Admin.
// Thêm biến môi trường NEXT_PUBLIC_ADMIN_EMAILS trên Vercel.
// Ví dụ: admin1@gmail.com,admin2@gmail.com
const ADMIN_EMAILS = Array.from(new Set([
    'khiemnguyendanh@gmail.com',
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(Boolean)
]));

// Danh mục Album
const ALBUM_CATEGORIES = ['Tất cả', 'Wedding', 'Phóng sự cưới', 'Kỷ Yếu', 'Baby / Family', 'Event', 'Concept'];

// Component Icon Facebook 
const FacebookIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const InstagramIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
);

const TikTokIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

const CheckCircleIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const DEFAULT_HERO = "https://images.unsplash.com/photo-1606800052052-a08af7148866?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80";
const DEFAULT_PROMO = "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
const DEFAULT_COVER = "https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
const WATERMARK_LOGO_SRC = "/merci-logo-watermark.png";

// --- HÀM TẠO SLUG (Link đẹp) TỪ TÊN ---
const createSlug = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase()
        .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ặ|ẵ|â|ấ|ầ|ẩ|ậ|ẫ/g, 'a')
        .replace(/é|è|ẻ|ẹ|ẽ|ê|ế|ề|ể|ệ|ễ/g, 'e')
        .replace(/i|í|ì|ỉ|ị|ĩ/g, 'i')
        .replace(/ó|ò|ỏ|ọ|õ|ô|ố|ồ|ổ|ộ|ỗ|ơ|ớ|ờ|ở|ợ|ỡ/g, 'o')
        .replace(/ú|ù|ủ|ụ|ũ|ư|ứ|ừ|ử|ự|ữ/g, 'u')
        .replace(/ý|ỳ|ỷ|ỵ|ỹ/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const trackPixelEvent = (eventName, params = {}) => {
    if (typeof window !== 'undefined') {
        if (window.fbq) {
            try {
                window.fbq('track', eventName, params);
            } catch (e) {
                console.warn("FB Pixel event failed:", e);
            }
        }
        if (window.gtag) {
            try {
                window.gtag('event', eventName, params);
            } catch (e) {
                console.warn("GA Event failed:", e);
            }
        }
    }
};


const getCategoryHash = (category) => category === 'Tất cả' ? '' : `#${createSlug(category)}`;
const getCategoryFromHash = (hash) => {
    const cleanHash = (hash || '').replace(/^#/, '');
    return ALBUM_CATEGORIES.find(cat => createSlug(cat) === cleanHash) || cleanHash || '';
};

const normalizeTextList = (input) => {
    const raw = Array.isArray(input)
        ? input
        : String(input || '')
            .split(/[,，、;；#\n\r]+/)
            .map(item => item.trim())
            .filter(Boolean);

    const unique = [];
    raw.forEach(item => {
        const tag = String(item || '').replace(/^#/, '').trim();
        if (!tag) return;
        const exists = unique.some(current => createSlug(current) === createSlug(tag));
        if (!exists) unique.push(tag.length > 40 ? tag.slice(0, 40) : tag);
    });

    return unique;
};

const normalizeAlbumCategories = (input) => normalizeTextList(input);
const normalizeAlbumHashtags = (input) => normalizeTextList(input);

const getAlbumMainCategory = (albumOrInput, fallback = 'Wedding') => {
    if (!albumOrInput) return fallback;

    if (typeof albumOrInput === 'string') {
        return normalizeAlbumCategories(albumOrInput)[0] || fallback;
    }

    const legacyCategories = normalizeAlbumCategories(albumOrInput.categories || []);
    const legacyCategory = normalizeAlbumCategories(albumOrInput.category || '');
    const category = legacyCategory[0] || legacyCategories[0] || fallback;

    return category || fallback;
};

const getAlbumCategories = (albumOrInput) => {
    const category = getAlbumMainCategory(albumOrInput, '');
    return category ? [category] : [];
};

const getAlbumCategoryText = (albumOrInput, fallback = 'Wedding') => {
    return getAlbumMainCategory(albumOrInput, fallback);
};

const getAlbumHashtags = (albumOrInput) => {
    if (!albumOrInput) return [];

    if (Array.isArray(albumOrInput) || typeof albumOrInput === 'string') {
        return normalizeAlbumHashtags(albumOrInput);
    }

    // Ưu tiên field hashtag mới. Nếu album cũ chưa có hashtag thì trả rỗng,
    // không trộn danh mục chính vào hashtag nữa.
    return normalizeAlbumHashtags(albumOrInput.hashtags || albumOrInput.tags || []);
};

const albumMatchesCategory = (album, category) => {
    if (!category || category === 'Tất cả') return true;
    const mainCategory = getAlbumMainCategory(album, '');
    return mainCategory === category || createSlug(mainCategory) === createSlug(category);
};

const albumMatchesHashtagQuery = (album, query) => {
    const terms = normalizeAlbumHashtags(query);
    if (!terms.length) return true;

    const albumHashtags = getAlbumHashtags(album);
    if (!albumHashtags.length) return false;

    return terms.some(term =>
        albumHashtags.some(tag =>
            createSlug(tag).includes(createSlug(term)) ||
            createSlug(term).includes(createSlug(tag))
        )
    );
};


function AnalyticsDashboard({ sessions = [], bookings = [], albums = [], getDriveThumbUrl }) {
    const now = Date.now();
    
    // helper: local date string (YYYY-MM-DD)
    const getLocalDateString = (timestamp) => {
        const d = new Date(timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString(now);

    // 1. KPI: VISITORS
    const visitorsToday = sessions.filter(s => getLocalDateString(s.createdAt) === todayStr).length;
    const sevenDaysAgoTime = now - 7 * 24 * 60 * 60 * 1000;
    const visitors7d = sessions.filter(s => s.createdAt >= sevenDaysAgoTime).length;
    const thirtyDaysAgoTime = now - 30 * 24 * 60 * 60 * 1000;
    const visitors30d = sessions.filter(s => s.createdAt >= thirtyDaysAgoTime).length;

    // 2. KPI: BOOKINGS
    const bookingsToday = bookings.filter(b => getLocalDateString(b.createdAt) === todayStr).length;
    const bookings7d = bookings.filter(b => b.createdAt >= sevenDaysAgoTime).length;
    const bookingsTotal = bookings.length;

    // 3. KPI: CONVERSION 7d
    const conversion7d = visitors7d > 0 ? ((bookings7d / visitors7d) * 100) : 0;

    // 4. KPI: TOTAL VISITORS 30D (Unique Sessions)
    const totalUnique30d = visitors30d;

    // --- BIỂU ĐỒ 14 NGÀY ---
    // Generate dates for the last 14 days
    const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(now - (13 - i) * 24 * 60 * 60 * 1000);
        return {
            dateStr: getLocalDateString(d.getTime()),
            label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` // e.g. "25/05"
        };
    });

    const bookings14Days = last14Days.map(day => {
        const count = bookings.filter(b => getLocalDateString(b.createdAt) === day.dateStr).length;
        return { ...day, count };
    });

    const sessions14Days = last14Days.map(day => {
        const count = sessions.filter(s => getLocalDateString(s.createdAt) === day.dateStr).length;
        return { ...day, count };
    });

    const maxBookings = Math.max(...bookings14Days.map(d => d.count), 1);
    const maxSessions = Math.max(...sessions14Days.map(d => d.count), 1);

    // --- CHUYÊN MỤC TRUY CẬP NHIỀU NHẤT (30 ngày qua) ---
    const sessions30d = sessions.filter(s => s.createdAt >= thirtyDaysAgoTime);
    const sectionsData = [
        { name: 'Trang chủ', count: sessions30d.filter(s => s.visitedHome).length, key: 'home' },
        { name: 'Bộ sưu tập', count: sessions30d.filter(s => s.visitedCollection).length, key: 'collection' },
        { name: 'Video phóng sự', count: sessions30d.filter(s => s.visitedVideos).length, key: 'videos' },
        { name: 'Blog & Kinh nghiệm', count: sessions30d.filter(s => s.visitedBlog).length, key: 'blog' },
        { name: 'Trang đặt lịch', count: sessions30d.filter(s => s.visitedBooking).length, key: 'booking' }
    ];

    // Tính toán thời lượng xem trung bình cho mỗi chuyên mục
    const getSectionTimeStats = (sectionKey, visitorCount) => {
        const totalSecs = sessions30d.reduce((sum, s) => sum + (s.timeSpent?.[sectionKey] || 0), 0);
        const avgSecs = visitorCount > 0 ? Math.round(totalSecs / visitorCount) : 0;
        return avgSecs;
    };

    const formatDuration = (totalSeconds) => {
        if (!totalSeconds || totalSeconds <= 0) return '0s';
        if (totalSeconds < 60) return `${totalSeconds}s`;
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return secs > 0 ? `${mins}p ${secs}s` : `${mins}p`;
    };

    const sectionsDataWithTime = sectionsData.map(sec => ({
        ...sec,
        avgSecs: getSectionTimeStats(sec.key, sec.count)
    }));

    const sortedSections = [...sectionsDataWithTime].sort((a, b) => b.count - a.count);
    const maxSectionCount = Math.max(...sectionsData.map(s => s.count), 1);

    // --- PHỄU CHUYỂN ĐỔI (7 ngày qua) ---
    const sessions7d = sessions.filter(s => s.createdAt >= sevenDaysAgoTime);
    const funnelSteps = [
        { label: '1. Vào trang chủ', count: sessions7d.filter(s => s.visitedHome).length },
        { label: '2. Mở chuyên mục', count: sessions7d.filter(s => s.visitedCollection).length },
        { label: '3. Vào booking', count: sessions7d.filter(s => s.visitedBooking).length },
        { label: '4. Hoàn thành form', count: sessions7d.filter(s => s.completedBooking).length }
    ];
    const funnelBase = funnelSteps[0].count || 1;

    // --- THỐNG KÊ LƯỢT XEM ALBUM ẢNH ---
    const topAlbums = albums.slice(0, 8);
    const maxAlbumViews = Math.max(...topAlbums.map(a => a.views || 0), 1);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* CARD 1: Visitors Hôm Nay */}
                <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visitors Hôm Nay</p>
                    <p className="text-3xl md:text-4xl font-black text-slate-900 mt-2">{visitorsToday}</p>
                    <p className="text-xs text-slate-500 mt-3 font-medium">
                        7d: <span className="font-bold text-slate-800">{visitors7d}</span> · 30d: <span className="font-bold text-slate-800">{visitors30d}</span>
                    </p>
                </div>

                {/* CARD 2: Booking Hôm Nay */}
                <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Booking Hôm Nay</p>
                    <p className="text-3xl md:text-4xl font-black text-slate-900 mt-2">{bookingsToday}</p>
                    <p className="text-xs text-slate-500 mt-3 font-medium">
                        7d: <span className="font-bold text-slate-800">{bookings7d}</span> · Total: <span className="font-bold text-slate-800">{bookingsTotal}</span>
                    </p>
                </div>

                {/* CARD 3: Conversion 7d */}
                <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion 7d</p>
                    <p className="text-3xl md:text-4xl font-black text-slate-900 mt-2">{conversion7d.toFixed(2)}%</p>
                    <p className="text-xs text-slate-500 mt-3 font-medium">
                        <span className="font-bold text-blue-600">{bookings7d}/{visitors7d}</span> sessions
                    </p>
                </div>

                {/* CARD 4: Unique Sessions 30d */}
                <div className="bg-white border border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visitors 30 ngày</p>
                    <p className="text-3xl md:text-4xl font-black text-slate-900 mt-2">{totalUnique30d}</p>
                    <p className="text-xs text-slate-500 mt-3 font-medium">
                        Lượt truy cập duy nhất trong 30 ngày
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Biểu đồ Booking */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                         <span className="text-red-500">📈</span>
                         <h3 className="text-lg font-bold text-slate-800">Booking 14 ngày gần nhất</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-medium ml-7 mb-6">Số booking mỗi ngày</p>
                    <div className="flex items-end justify-between h-44 w-full px-2 pt-6 border-b border-slate-100 relative">
                        {bookings14Days.map((d, index) => {
                            const pct = (d.count / maxBookings) * 100;
                            return (
                                <div key={d.dateStr} className="flex flex-col items-center flex-1 group relative">
                                    {d.count > 0 && (
                                        <span className="text-[10px] md:text-xs font-black text-slate-800 mb-1 absolute bottom-full">
                                            {d.count}
                                        </span>
                                    )}
                                    <div 
                                        className="w-3 md:w-5 bg-slate-900 rounded-t transition-all duration-500 ease-out hover:bg-blue-600" 
                                        style={{ height: `${pct > 0 ? Math.max(pct, 5) : 0}%` }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between w-full text-[9px] md:text-[10px] text-slate-400 font-semibold px-2 mt-2">
                        {bookings14Days.map(d => (
                            <span key={d.dateStr} className="flex-1 text-center truncate">
                                {d.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Biểu đồ Visitors */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                         <span className="text-blue-500">👥</span>
                         <h3 className="text-lg font-bold text-slate-800">Visitors 14 ngày</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-medium ml-7 mb-6">Unique sessions/ngày</p>
                    <div className="flex items-end justify-between h-44 w-full px-2 pt-6 border-b border-slate-100 relative">
                        {sessions14Days.map((d, index) => {
                            const pct = (d.count / maxSessions) * 100;
                            return (
                                <div key={d.dateStr} className="flex flex-col items-center flex-1 group relative">
                                    {d.count > 0 && (
                                        <span className="text-[10px] md:text-xs font-black text-slate-800 mb-1 absolute bottom-full">
                                            {d.count}
                                        </span>
                                    )}
                                    <div 
                                        className="w-3 md:w-5 bg-blue-600 rounded-t transition-all duration-500 ease-out hover:bg-blue-700" 
                                        style={{ height: `${pct > 0 ? Math.max(pct, 5) : 0}%` }}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between w-full text-[9px] md:text-[10px] text-slate-400 font-semibold px-2 mt-2">
                        {sessions14Days.map(d => (
                            <span key={d.dateStr} className="flex-1 text-center truncate">
                                {d.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Popular Sections & Funnel Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Popular Sections */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">🔥 Chuyên mục xem nhiều nhất</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Lượt truy cập chuyên mục và thời lượng xem TB (30 ngày qua)</p>
                    </div>
                    <div className="space-y-4">
                        {sortedSections.map((sec, index) => {
                            const percent = (sec.count / maxSectionCount) * 100;
                            return (
                                <div key={sec.name} className="space-y-1.5">
                                    <div className="flex justify-between text-xs md:text-sm font-bold text-slate-700 font-sans">
                                        <span>{index + 1}. {sec.name}</span>
                                        <div className="flex items-center gap-3">
                                            <span>{sec.count} <span className="text-slate-400 font-medium">lượt</span></span>
                                            <span className="text-slate-300 font-normal">|</span>
                                            <span className="text-indigo-600 text-xs font-black">TB: {formatDuration(sec.avgSecs)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-50 h-5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-indigo-600 h-full rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${percent}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Funnel Chuyển đổi */}
                <div className="bg-white border border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">🔄 Funnel chuyển đổi (7 ngày qua)</h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">Từ landing tới submit booking — % drop-off ở mỗi bước</p>
                    </div>
                    <div className="space-y-4">
                        {funnelSteps.map((step, index) => {
                            const percentOfBase = (step.count / funnelBase) * 100;
                            return (
                                <div key={step.label} className="space-y-1.5">
                                    <div className="flex justify-between text-xs md:text-sm font-bold text-slate-700 font-sans">
                                        <span>{step.label}</span>
                                        <div className="flex gap-4">
                                            <span>{step.count} <span className="text-slate-400 font-medium">sessions</span></span>
                                            <span className="text-blue-600 font-black min-w-[36px] text-right font-sans">
                                                {index === 0 ? '-' : `${percentOfBase.toFixed(1)}%`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-50 h-5 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-slate-900 h-full rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${percentOfBase}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    // === STATES ===
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [loginError, setLoginError] = useState('');

    // Đăng nhập / đăng ký khách hàng
    const [showClientLoginModal, setShowClientLoginModal] = useState(false);
    const [clientAuthMode, setClientAuthMode] = useState('login'); // login | register
    const [clientAuthData, setClientAuthData] = useState({ email: '', password: '' });
    const [clientAuthError, setClientAuthError] = useState('');

    // Tích điểm & Mã giới thiệu
    const [userProfile, setUserProfile] = useState(null);
    const [showClientProfileModal, setShowClientProfileModal] = useState(false);
    const [referralInput, setReferralInput] = useState('');
    const [referralError, setReferralError] = useState('');
    const [referralSuccess, setReferralSuccess] = useState('');
    const [isApplyingReferral, setIsApplyingReferral] = useState(false);

    // Khách hàng & Filter
    const [driveLink, setDriveLink] = useState('');
    const [clientLink, setClientLink] = useState('');
    const [savedClientPages, setSavedClientPages] = useState([]);
    const [loadedImages, setLoadedImages] = useState([]);
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [allSelections, setAllSelections] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState('mine'); // 'mine', 'all', or specific userKey
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [clientFolders, setClientFolders] = useState([]);
    const [activeClientFolderId, setActiveClientFolderId] = useState(null);
    const [currentSelectionKey, setCurrentSelectionKey] = useState(null);
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [cachedFolderImages, setCachedFolderImages] = useState({});

    // Albums (Admin & Khách)
    const [albums, setAlbums] = useState([]);
    const [activeAlbumId, setActiveAlbumId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('Tất cả');
    const [albumHashtagQuery, setAlbumHashtagQuery] = useState('');
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [editingAlbum, setEditingAlbum] = useState(null);
    const [newAlbum, setNewAlbum] = useState({ title: '', sub: '', category: 'Wedding', hashtags: '', driveLink: '' });
    const [albumDriveLink, setAlbumDriveLink] = useState('');
    const [pendingSlug, setPendingSlug] = useState(null);

    // Sync Albums state
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncDriveLink, setSyncDriveLink] = useState('');
    const [syncCategory, setSyncCategory] = useState('Wedding');
    const [syncHashtags, setSyncHashtags] = useState('');
    const [isSyncingAlbums, setIsSyncingAlbums] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');

    // Videos
    const [videos, setVideos] = useState([]);
    const [isAddingVideo, setIsAddingVideo] = useState(false);
    const [newVideo, setNewVideo] = useState({ title: '', url: '' });
    const [videoModal, setVideoModal] = useState({ isOpen: false, youtubeId: '' });

    // Blogs
    const [blogs, setBlogs] = useState([]);
    const [activeBlogId, setActiveBlogId] = useState(null);
    const [isAddingBlog, setIsAddingBlog] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);
    const [newBlog, setNewBlog] = useState({ title: '', slug: '', metaDesc: '', content: '', coverUrl: '', hashtags: '' });
    const [activeBlogHashtag, setActiveBlogHashtag] = useState('Tất cả');
    const [aiBlogPrompt, setAiBlogPrompt] = useState('');
    const [aiBlogKeyword, setAiBlogKeyword] = useState('');
    const [aiProvider, setAiProvider] = useState('gemini'); // gemini | openai
    const [blogImageUrl, setBlogImageUrl] = useState('');
    const [blogImageCaption, setBlogImageCaption] = useState('');
    const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
    const [bulkBlogTopics, setBulkBlogTopics] = useState('');
    const [isBulkGeneratingBlog, setIsBulkGeneratingBlog] = useState(false);
    const [bulkBlogProgress, setBulkBlogProgress] = useState('');
    const [bulkGeneratedBlogs, setBulkGeneratedBlogs] = useState([]);
    const [autoKeyword, setAutoKeyword] = useState('');
    const [autoArticleCount, setAutoArticleCount] = useState(6);
    const [isGeneratingTopicIdeas, setIsGeneratingTopicIdeas] = useState(false);

    // Trend Search States
    const [trendKeyword, setTrendKeyword] = useState('');
    const [isSearchingTrends, setIsSearchingTrends] = useState(false);
    const [searchTrendsResult, setSearchTrendsResult] = useState([]);
    const [isGeneratingTrendTopics, setIsGeneratingTrendTopics] = useState(false);

    const [blogDriveFolderLink, setBlogDriveFolderLink] = useState('');
    const [blogDriveImages, setBlogDriveImages] = useState([]);
    const [blogDriveSubfolders, setBlogDriveSubfolders] = useState([]);
    const [isLoadingBlogDriveImages, setIsLoadingBlogDriveImages] = useState(false);


    // Filter Tool
    const [filterText, setFilterText] = useState('');
    const [sourceHandle, setSourceHandle] = useState(null);
    const [destHandle, setDestHandle] = useState(null);
    const [filterLogs, setFilterLogs] = useState([]);
    const [filterTargetExt, setFilterTargetExt] = useState('original');
    const [filterCustomExt, setFilterCustomExt] = useState('');
    const [showSavedPages, setShowSavedPages] = useState(false);
    const [imageNotes, setImageNotes] = useState({});
    const [noteModalData, setNoteModalData] = useState({ isOpen: false, img: null, noteText: '' });

    const [lightboxData, setLightboxData] = useState({ isOpen: false, index: 0, images: [] });
    const [lightboxDirection, setLightboxDirection] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [albumPage, setAlbumPage] = useState(1);
    const [galleryPage, setGalleryPage] = useState(1);
    const [activeToolTab, setActiveToolTab] = useState('create');
    const [draggingAlbumId, setDraggingAlbumId] = useState(null);
    const [dragOverAlbumId, setDragOverAlbumId] = useState(null);
    const [draggingVideoId, setDraggingVideoId] = useState(null);
    const [dragOverVideoId, setDragOverVideoId] = useState(null);

    // Booking states
    const [bookingForm, setBookingForm] = useState({ name: '', phone: '', service: 'Chụp ảnh cưới (Wedding)', date: '', notes: '' });
    const [bookings, setBookings] = useState([]);
    const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

    // Session states for Dashboard
    const [sessions, setSessions] = useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    // === EFFECTS ===
    useEffect(() => {
        setMounted(true);

    }, []);

    const updateSessionStep = useCallback(async (stepField) => {
        if (typeof window === 'undefined' || !db) return;
        const sessionId = sessionStorage.getItem('merci_session_id');
        if (!sessionId) return;

        const localStepKey = `merci_step_${stepField}`;
        if (sessionStorage.getItem(localStepKey)) return;

        try {
            await updateDoc(doc(db, 'merci_sessions', sessionId), {
                [stepField]: true,
                updatedAt: Date.now()
            });
            sessionStorage.setItem(localStepKey, 'true');
        } catch (err) {
            console.error(`Error updating session step ${stepField}:`, err);
        }
    }, []);

    const recordAlbumView = useCallback(async (albumId) => {
        if (typeof window === 'undefined' || !db || !albumId) return;
        const sessionId = sessionStorage.getItem('merci_session_id');
        if (!sessionId) return;

        const lastViewedAlbumKey = `merci_last_viewed_album`;
        const lastViewedTimeKey = `merci_last_viewed_time`;
        const lastAlbum = sessionStorage.getItem(lastViewedAlbumKey);
        const lastTime = parseInt(sessionStorage.getItem(lastViewedTimeKey) || '0');
        const now = Date.now();

        if (lastAlbum === albumId && now - lastTime < 10000) return;

        sessionStorage.setItem(lastViewedAlbumKey, albumId);
        sessionStorage.setItem(lastViewedTimeKey, String(now));

        try {
            let localViews = {};
            try {
                const stored = sessionStorage.getItem('merci_album_views');
                if (stored) localViews = JSON.parse(stored);
            } catch (e) {}

            localViews[albumId] = (localViews[albumId] || 0) + 1;
            sessionStorage.setItem('merci_album_views', JSON.stringify(localViews));

            await updateDoc(doc(db, 'merci_sessions', sessionId), {
                [`albumViews.${albumId}`]: increment(1),
                updatedAt: Date.now()
            });

            await updateDoc(doc(db, 'merci_albums', albumId), {
                views: increment(1)
            });
        } catch (err) {
            console.error("Error recording album view:", err);
        }
    }, []);

    // Tự động khởi tạo và theo dõi session
    useEffect(() => {
        if (!mounted || !db) return;

        const initSession = async () => {
            let sessionId = sessionStorage.getItem('merci_session_id');
            if (!sessionId) {
                sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
                sessionStorage.setItem('merci_session_id', sessionId);
                sessionStorage.setItem('merci_step_visitedHome', 'true');

                const todayStr = new Date().toISOString().split('T')[0];
                const sessionData = {
                    id: sessionId,
                    createdAt: Date.now(),
                    dateStr: todayStr,
                    visitedHome: true,
                    visitedCollection: false,
                    visitedVideos: false,
                    visitedBlog: false,
                    visitedBooking: false,
                    completedBooking: false,
                    albumViews: {},
                    timeSpent: { home: 0, collection: 0, videos: 0, blog: 0, booking: 0 },
                    updatedAt: Date.now()
                };

                try {
                    await setDoc(doc(db, 'merci_sessions', sessionId), sessionData);
                } catch (err) {
                    console.error("Error creating tracking session:", err);
                }
            }
        };

        initSession();
    }, [mounted, db]);

    // Theo dõi thay đổi tab/nội dung để update bước phễu và bắn Pixel
    useEffect(() => {
        if (!mounted || !db) return;

        if (activeTab === 'collection' || activeAlbumId) {
            updateSessionStep('visitedCollection');
            if (activeAlbumId) {
                recordAlbumView(activeAlbumId);
                const album = albums.find(a => a.id === activeAlbumId);
                if (album) {
                    trackPixelEvent('ViewContent', {
                        content_name: album.title,
                        content_category: 'Album'
                    });
                }
            }
        } else if (activeTab === 'videos') {
            updateSessionStep('visitedVideos');
            trackPixelEvent('ViewContent', {
                content_category: 'Videos'
            });
        } else if (activeTab === 'blog' || activeBlogId) {
            updateSessionStep('visitedBlog');
            if (activeBlogId) {
                const blog = blogs.find(b => b.id === activeBlogId);
                if (blog) {
                    trackPixelEvent('ViewContent', {
                        content_name: blog.title,
                        content_category: 'Blog'
                    });
                }
            }
        } else if (activeTab === 'booking') {
            updateSessionStep('visitedBooking');
            trackPixelEvent('InitiateCheckout');
        }
    }, [activeTab, activeAlbumId, activeBlogId, albums, blogs, mounted, db, updateSessionStep, recordAlbumView]);

    // Theo dõi và tính toán thời lượng xem trang (Time Spent)
    useEffect(() => {
        if (!mounted || !db) return;
        const sessionId = sessionStorage.getItem('merci_session_id');
        if (!sessionId) return;

        let localTimes = { home: 0, collection: 0, videos: 0, blog: 0, booking: 0 };
        try {
            const stored = sessionStorage.getItem('merci_time_spent');
            if (stored) localTimes = JSON.parse(stored);
        } catch (e) {}

        let active = activeTab;
        let secondsCounter = 0;

        const interval = setInterval(() => {
            if (document.hidden) return;

            const keyMap = {
                home: 'home',
                collection: 'collection',
                videos: 'videos',
                blog: 'blog',
                booking: 'booking'
            };
            const key = keyMap[active] || 'home';
            localTimes[key] = (localTimes[key] || 0) + 1;
            secondsCounter += 1;

            sessionStorage.setItem('merci_time_spent', JSON.stringify(localTimes));

            if (secondsCounter >= 15) {
                secondsCounter = 0;
                updateDoc(doc(db, 'merci_sessions', sessionId), {
                    timeSpent: localTimes,
                    updatedAt: Date.now()
                }).catch(err => console.error("Error syncing time spent:", err));
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            updateDoc(doc(db, 'merci_sessions', sessionId), {
                timeSpent: localTimes,
                updatedAt: Date.now()
            }).catch(err => {});
        };
    }, [activeTab, mounted, db]);

    useEffect(() => {
        if (!mounted || !auth) return;

        const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            const email = currentUser?.email?.toLowerCase() || '';
            const isFirebaseAdmin = Boolean(
                currentUser &&
                !currentUser.isAnonymous &&
                ADMIN_EMAILS.includes(email)
            );

            setIsAdmin(isFirebaseAdmin);
        });


        return () => unsubAuth();
    }, [mounted]);

    const ensureUserProfile = async (uid, email) => {
        if (!db) return;
        const userDocRef = doc(db, 'merci_users', uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            let referralCode = '';
            let isUnique = false;
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            for (let attempt = 0; attempt < 10; attempt++) {
                referralCode = '';
                for (let i = 0; i < 6; i++) {
                    referralCode += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                const q = query(collection(db, 'merci_users'), where('referralCode', '==', referralCode));
                const snap = await getDocs(q);
                if (snap.empty) {
                    isUnique = true;
                    break;
                }
            }
            if (!isUnique) {
                referralCode = 'M' + String(Date.now()).slice(-5);
            }

            const newUserProfile = {
                uid,
                email: email || '',
                points: 50,
                referralCode,
                referredBy: '',
                createdAt: Date.now(),
                history: [
                    {
                        id: `tx_${Date.now()}_signup`,
                        amount: 50,
                        type: 'signup',
                        description: 'Tặng điểm đăng ký thành viên mới',
                        createdAt: Date.now()
                    }
                ]
            };
            await setDoc(userDocRef, newUserProfile);
        }
    };

    useEffect(() => {
        if (!mounted || !db || !user?.uid) {
            setUserProfile(null);
            return;
        }

        let unsubProfile = () => {};

        const setupProfile = async () => {
            try {
                await ensureUserProfile(user.uid, user.email);
                unsubProfile = onSnapshot(doc(db, 'merci_users', user.uid), (snapshot) => {
                    if (snapshot.exists()) {
                        setUserProfile(snapshot.data());
                    }
                });
            } catch (err) {
                console.error("Error setting up user profile:", err);
            }
        };

        setupProfile();

        return () => {
            unsubProfile();
        };
    }, [mounted, db, user?.uid]);

    const handleApplyReferralCode = async () => {
        setReferralError('');
        setReferralSuccess('');
        if (!referralInput.trim()) {
            setReferralError('Vui lòng nhập mã giới thiệu.');
            return;
        }
        if (!db || !user?.uid || !userProfile) return;

        const codeToApply = referralInput.trim().toUpperCase();

        if (codeToApply === userProfile.referralCode) {
            setReferralError('Bạn không thể tự nhập mã giới thiệu của mình.');
            return;
        }

        if (userProfile.referredBy) {
            setReferralError('Bạn đã sử dụng mã giới thiệu rồi.');
            return;
        }

        setIsApplyingReferral(true);

        try {
            const q = query(collection(db, 'merci_users'), where('referralCode', '==', codeToApply));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setReferralError('Mã giới thiệu không tồn tại.');
                setIsApplyingReferral(false);
                return;
            }

            const referrerDoc = snap.docs[0];
            const referrerData = referrerDoc.data();
            const referrerUid = referrerDoc.id;

            const userDocRef = doc(db, 'merci_users', user.uid);
            const referrerDocRef = doc(db, 'merci_users', referrerUid);

            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userDocRef);
                const referrerSnap = await transaction.get(referrerDocRef);

                if (!userSnap.exists() || !referrerSnap.exists()) {
                    throw new Error('Tài khoản không hợp lệ.');
                }

                const userData = userSnap.data();
                if (userData.referredBy) {
                    throw new Error('Bạn đã nhập mã giới thiệu rồi.');
                }

                transaction.update(userDocRef, {
                    referredBy: codeToApply,
                    points: (userData.points || 0) + 50,
                    history: [
                        ...(userData.history || []),
                        {
                            id: `tx_${Date.now()}_referred`,
                            amount: 50,
                            type: 'referred',
                            description: `Nhận điểm giới thiệu từ mã ${codeToApply}`,
                            createdAt: Date.now()
                        }
                    ]
                });

                const referrerPrevData = referrerSnap.data();
                transaction.update(referrerDocRef, {
                    points: (referrerPrevData.points || 0) + 100,
                    history: [
                        ...(referrerPrevData.history || []),
                        {
                            id: `tx_${Date.now()}_referrer`,
                            amount: 100,
                            type: 'referrer',
                            description: `Giới thiệu thành viên mới ${userData.email || 'Ẩn danh'}`,
                            createdAt: Date.now()
                        }
                    ]
                });
            });

            setReferralSuccess('Áp dụng mã giới thiệu thành công! Bạn nhận được 50 điểm.');
            setReferralInput('');
        } catch (error) {
            console.error('Error applying referral code:', error);
            setReferralError(error?.message || 'Có lỗi xảy ra khi áp dụng mã giới thiệu.');
        } finally {
            setIsApplyingReferral(false);
        }
    };

    // Nhận diện URL Pathname (Link Đẹp dạng /ten-album hoặc /ten-bai-viet)
    useEffect(() => {
        if (!mounted) return;

        const parseUrl = () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const folderId = urlParams.get('folder');
                const foldersParam = urlParams.get('folders');
                const viewMode = urlParams.get('view');
                const pathname = window.location.pathname.replace(/^\/|\/$/g, '');

                if (foldersParam) {
                    setActiveTab('tool');
                    setActiveToolTab('gallery');
                    if (viewMode === 'selected') setShowOnlySelected(true);
                    fetchDrive(foldersParam.split(',').map(v => decodeURIComponent(v)).join('\n'));
                } else if (folderId) {
                    setActiveTab('tool');
                    setActiveToolTab('gallery');
                    setCurrentFolderId(folderId);
                    setActiveClientFolderId(folderId);
                    setCurrentSelectionKey(folderId);
                    if (viewMode === 'selected') setShowOnlySelected(true);
                    fetchDrive(folderId);
                } else {
                    const routeMap = {
                        'bo-su-tap': { tab: 'collection' },
                        'blog': { tab: 'blog' },
                        'video': { tab: 'videos' },
                        'tool': { tab: 'tool', tool: 'create' },
                        'tao-trang': { tab: 'tool', tool: 'create' },
                        'chon-anh': { tab: 'tool', tool: 'gallery' },
                        'loc-anh': { tab: 'tool', tool: 'filter' },
                        'dat-lich': { tab: 'booking' },
                        'booking': { tab: 'booking' },
                        'thong-ke': { tab: 'dashboard' },
                        'khuyen-mai': { tab: 'promotion' }
                    };
                    const route = routeMap[pathname];
                    if (route) {
                        setActiveTab(route.tab);
                        setActiveAlbumId(null);
                        setActiveBlogId(null);
                        if (route.tool) setActiveToolTab(route.tool);
                        if (route.tab === 'collection' && window.location.hash) {
                            const categoryFromHash = getCategoryFromHash(window.location.hash);
                            if (categoryFromHash) setActiveCategory(categoryFromHash);
                        }
                    } else if (window.location.hash) {
                        const categoryFromHash = getCategoryFromHash(window.location.hash);
                        if (categoryFromHash) {
                            setActiveTab('collection');
                            setActiveCategory(categoryFromHash);
                            setActiveAlbumId(null);
                        }
                    } else if (pathname && pathname !== '') {
                        setPendingSlug(pathname);
                    } else {
                        setActiveTab('home');
                        setActiveAlbumId(null);
                        setActiveBlogId(null);
                    }
                }
            } catch (e) { console.warn("URL Parsing bypass"); }
        };

        parseUrl();

        window.addEventListener('popstate', parseUrl);
        return () => window.removeEventListener('popstate', parseUrl);
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return;
        const handleHashChange = () => {
            const categoryFromHash = getCategoryFromHash(window.location.hash);
            if (categoryFromHash) {
                setActiveTab('collection');
                setActiveCategory(categoryFromHash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [mounted]);

    // Albums - Cần load ngay vì xuất hiện ở Home và cần cho pendingSlug
    useEffect(() => {
        if (!mounted || !db) return;
        const unsubAlbums = onSnapshot(collection(db, 'merci_albums'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => (b.views || 0) - (a.views || 0));
            setAlbums(fetched);
        });
        return () => unsubAlbums();
    }, [mounted]);

    // Videos - Chỉ load khi vào tab Video hoặc là Admin
    useEffect(() => {
        if (!mounted || !db) return;
        if (activeTab !== 'videos' && !isAdmin) return;

        const unsubVideos = onSnapshot(collection(db, 'merci_videos'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setVideos(fetched);
        });
        return () => unsubVideos();
    }, [mounted, activeTab, isAdmin]);

    // Blogs - Load khi vào tab Blog, có pendingSlug hoặc là Admin
    useEffect(() => {
        if (!mounted || !db) return;
        if (activeTab !== 'blog' && !pendingSlug && !isAdmin) return;

        const unsubBlogs = onSnapshot(collection(db, 'merci_blogs'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => b.createdAt - a.createdAt);
            setBlogs(fetched);
        });
        return () => unsubBlogs();
    }, [mounted, activeTab, pendingSlug, isAdmin]);

    // Load Bookings for Admin
    useEffect(() => {
        if (!mounted || !db) return;
        if ((activeTab !== 'booking' && activeTab !== 'dashboard') || !isAdmin) return;

        const unsubBookings = onSnapshot(collection(db, 'merci_bookings'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => b.createdAt - a.createdAt);
            setBookings(fetched);
        }, (error) => {
            console.error("Error listening to bookings:", error);
        });
        return () => unsubBookings();
    }, [mounted, activeTab, isAdmin]);

    // Load Sessions for Admin Dashboard
    useEffect(() => {
        if (!mounted || !db || !isAdmin || activeTab !== 'dashboard') return;

        setIsLoadingSessions(true);
        const thirtyDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
        const q = query(
            collection(db, 'merci_sessions'),
            where('createdAt', '>=', thirtyDaysAgo)
        );

        getDocs(q).then((snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setSessions(fetched);
        }).catch(err => {
            console.error("Error fetching sessions:", err);
        }).finally(() => {
            setIsLoadingSessions(false);
        });
    }, [mounted, db, isAdmin, activeTab]);

    // Hiển thị Album hoặc Blog dựa trên Link URL đẹp
    useEffect(() => {
        if (pendingSlug) {
            const foundAlbum = albums.find(a => a.slug === pendingSlug || createSlug(a.title) === pendingSlug || a.id === pendingSlug);
            const foundBlog = blogs.find(b => b.slug === pendingSlug || createSlug(b.title) === pendingSlug || b.id === pendingSlug);

            if (foundAlbum) {
                setActiveTab('collection');
                setActiveAlbumId(foundAlbum.id);
                setAlbumDriveLink(foundAlbum.driveLink || '');
                setPendingSlug(null);
            } else if (foundBlog) {
                setActiveTab('blog');
                setActiveBlogId(foundBlog.id);
                setPendingSlug(null);
            }
        }
    }, [albums, blogs, pendingSlug]);

    // Cập nhật Title + Meta SEO khi xem Blog/Album
    useEffect(() => {
        const upsertMeta = (name, content) => {
            let tag = document.querySelector(`meta[name="${name}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('name', name);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', content || '');
        };

        const upsertCanonical = (href) => {
            let tag = document.querySelector('link[rel="canonical"]');
            if (!tag) {
                tag = document.createElement('link');
                tag.setAttribute('rel', 'canonical');
                document.head.appendChild(tag);
            }
            tag.setAttribute('href', href || window.location.href);
        };

        if (activeTab === 'blog' && activeBlogId) {
            const blog = blogs.find(b => b.id === activeBlogId);
            if (blog) {
                const slugToUse = blog.slug || createSlug(blog.title) || blog.id;
                document.title = `${blog.title} | Merci Studio`;
                upsertMeta('description', blog.metaDesc || blog.title);
                upsertCanonical(`${window.location.origin}/${slugToUse}`);
            }
        } else if (activeTab === 'collection' && activeAlbumId) {
            const album = albums.find(a => a.id === activeAlbumId);
            if (album) {
                document.title = `${album.title} | Merci Studio`;
                upsertMeta('description', album.sub || `${album.title} - Bộ sưu tập ảnh của Merci Studio`);
                upsertCanonical(window.location.href);
            }
        } else if (activeTab === 'booking') {
            document.title = 'Đặt lịch & Liên hệ tư vấn | Merci Studio';
            upsertMeta('description', 'Đặt lịch chụp ảnh cưới, phóng sự cưới, kỷ yếu tại Merci Studio. Liên hệ tư vấn dịch vụ chụp ảnh cưới chuyên nghiệp.');
            upsertCanonical(`${window.location.origin}/dat-lich`);
        } else {
            document.title = 'Merci Wedding Studio';
            upsertMeta('description', 'Merci Studio - chụp ảnh cưới, kỷ yếu, gia đình, photobooth và váy cưới.');
            upsertCanonical(window.location.origin);
        }
    }, [activeTab, activeBlogId, activeAlbumId, blogs, albums]);

    const nextImg = useCallback(() => {
        const imgs = lightboxData.images || [];
        if (imgs.length) {
            setLightboxDirection(1);
            setLightboxData(p => ({ ...p, index: (p.index + 1) % imgs.length }));
        }
    }, [lightboxData.images]);

    const prevImg = useCallback(() => {
        const imgs = lightboxData.images || [];
        if (imgs.length) {
            setLightboxDirection(-1);
            setLightboxData(p => ({ ...p, index: (p.index - 1 + imgs.length) % imgs.length }));
        }
    }, [lightboxData.images]);

    useEffect(() => {
        if (!lightboxData.isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'ArrowRight') nextImg();
            if (e.key === 'ArrowLeft') prevImg();
            if (e.key === 'Escape') setLightboxData({ isOpen: false, index: 0, images: [] });
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxData.isOpen, nextImg, prevImg]);


    // === HELPERS (Admin Albums) ===
    const handleAddViewsToAllAlbums = async () => {
        if (!db || !albums || albums.length === 0) return alert("Không có album nào để cập nhật");
        if (!confirm(`Bạn có chắc chắn muốn cộng thêm 1000 lượt xem cho tất cả ${albums.length} album?`)) return;
        setIsLoading(true);
        let count = 0;
        try {
            for (const album of albums) {
                const docRef = doc(db, 'merci_albums', album.id);
                const currentViews = album.views || 0;
                await updateDoc(docRef, {
                    views: currentViews + 1000
                });
                count++;
            }
            alert(`Đã cộng thêm 1000 lượt xem cho ${count} album thành công!`);
        } catch (e) {
            console.error(e);
            alert("Đã xảy ra lỗi khi cập nhật lượt xem.");
        } finally {
            setIsLoading(false);
        }
    };

    const saveAlbumData = async (data) => {
        if (!db) return;
        try { await setDoc(doc(db, 'merci_albums', data.id), data); } catch (e) { console.error(e); }
    };

    const handleCreateAlbum = async () => {
        if (!newAlbum.title) return alert("Vui lòng nhập tên album");
        setIsLoading(true);
        const mainCategory = getAlbumMainCategory(newAlbum.category || 'Wedding', 'Wedding');
        const albumHashtags = normalizeAlbumHashtags(newAlbum.hashtags || '');
        const data = {
            id: `album_${Date.now()}`,
            title: newAlbum.title,
            slug: createSlug(newAlbum.title) || `album-${Date.now()}`,
            sub: newAlbum.sub,
            category: mainCategory,
            categories: [mainCategory],
            hashtags: albumHashtags,
            images: [],
            coverUrl: DEFAULT_COVER,
            order: Date.now(),
            driveLink: ''
        };
        await saveAlbumData(data);
        setIsCreatingAlbum(false);
        setIsLoading(false);
        setNewAlbum({ title: '', sub: '', category: 'Wedding', hashtags: '', driveLink: '' });
    };

    const handleUpdateAlbum = async () => {
        if (!editingAlbum.title) return alert("Vui lòng nhập tên album");
        setIsLoading(true);
        try {
            const mainCategory = getAlbumMainCategory(editingAlbum.category || editingAlbum.categories || 'Wedding', 'Wedding');
            const albumHashtags = normalizeAlbumHashtags(editingAlbum.hashtags || '');
            await updateDoc(doc(db, 'merci_albums', editingAlbum.id), {
                title: editingAlbum.title,
                slug: createSlug(editingAlbum.title) || editingAlbum.slug,
                sub: editingAlbum.sub,
                category: mainCategory,
                categories: [mainCategory],
                hashtags: albumHashtags,
                coverUrl: editingAlbum.coverUrl || DEFAULT_COVER,
                driveLink: editingAlbum.driveLink || ''
            });
            if (activeAlbumId === editingAlbum.id) {
                setAlbumDriveLink(editingAlbum.driveLink || '');
            }
            setEditingAlbum(null);
        } catch (e) { alert("Đã xảy ra lỗi khi cập nhật album."); }
        finally { setIsLoading(false); }
    };

    const handleSyncAlbumsFromDrive = async () => {
        const folderId = extractDriveFolderId(syncDriveLink);
        if (!folderId) return alert('Link Google Drive không hợp lệ.');
        if (!GOOGLE_API_KEY) return alert('Thiếu Google API Key!');

        const mainCategory = getAlbumMainCategory(syncCategory || 'Wedding', 'Wedding');
        const categoryList = [mainCategory];
        const syncAlbumHashtags = normalizeAlbumHashtags(syncHashtags || '');

        if (!confirm(
            `Hệ thống sẽ quét toàn bộ thư mục con trong Drive gốc, tạo/cập nhật album và tự nạp ảnh luôn vào từng album.\n\n` +
            `Bạn sẽ không cần vào từng album bấm Reload Drive nữa.\n\nTiếp tục?`
        )) return;

        setIsSyncingAlbums(true);
        setIsLoading(true);
        setSyncProgress('Đang quét thư mục con...');
        setLoadingMessage('Đang quét thư mục con Google Drive...');

        try {
            const childFolders = await getDriveChildFolders(folderId);

            if (!childFolders.length) {
                alert('Thư mục này không có thư mục con nào hoặc bạn chưa cấp quyền xem: Bất kỳ ai có liên kết đều có thể xem.');
                setIsSyncingAlbums(false);
                setIsLoading(false);
                setSyncProgress('');
                return;
            }

            let addedCount = 0;
            let updatedCount = 0;
            let emptyCount = 0;
            let errorCount = 0;

            for (let index = 0; index < childFolders.length; index += 1) {
                const folder = childFolders[index];
                const folderLink = `https://drive.google.com/drive/folders/${folder.id}`;

                setSyncProgress(`Đang đồng bộ ${index + 1}/${childFolders.length}: ${folder.name}...`);
                setLoadingMessage(`Đang lấy ảnh album ${index + 1}/${childFolders.length}: ${folder.name}...`);

                try {
                    const files = await getAllDriveImages(folder.id);
                    const newImgs = files.map(normalizeDriveImage);

                    if (!newImgs.length) {
                        emptyCount += 1;
                    }

                    const existingAlbum = albums.find(a =>
                        (a.driveLink && a.driveLink.includes(folder.id)) ||
                        a.id === `album_drive_${folder.id}` ||
                        (a.title || '').trim().toLowerCase() === (folder.name || '').trim().toLowerCase()
                    );

                    const existingCoverId = existingAlbum
                        ? (existingAlbum.images || []).find(img =>
                            img.url === existingAlbum.coverUrl ||
                            img.originalUrl === existingAlbum.coverUrl ||
                            img.id === existingAlbum.coverId
                        )?.id
                        : '';

                    const coverStillExists = existingCoverId
                        ? newImgs.find(img => img.id === existingCoverId)
                        : null;

                    const coverImage = coverStillExists || newImgs[0];

                    if (existingAlbum) {
                        await updateDoc(doc(db, 'merci_albums', existingAlbum.id), {
                            title: existingAlbum.title || folder.name,
                            slug: existingAlbum.slug || createSlug(existingAlbum.title || folder.name),
                            sub: existingAlbum.sub || 'Bộ sưu tập',
                            category: getAlbumMainCategory(existingAlbum, categoryList[0] || 'Wedding'),
                            categories: [getAlbumMainCategory(existingAlbum, categoryList[0] || 'Wedding')],
                            hashtags: getAlbumHashtags(existingAlbum).length
                                ? getAlbumHashtags(existingAlbum)
                                : syncAlbumHashtags,
                            driveLink: folderLink,
                            images: newImgs,
                            coverUrl: coverImage?.url || existingAlbum.coverUrl || DEFAULT_COVER,
                            coverId: coverImage?.id || existingAlbum.coverId || '',
                            updatedAt: Date.now()
                        });

                        updatedCount += 1;
                    } else {
                        const newId = `album_drive_${folder.id}`;
                        const albumData = {
                            id: newId,
                            title: folder.name,
                            sub: 'Bộ sưu tập',
                            category: categoryList[0] || 'Wedding',
                            categories: categoryList,
                            hashtags: syncAlbumHashtags,
                            driveLink: folderLink,
                            images: newImgs,
                            coverUrl: coverImage?.url || DEFAULT_COVER,
                            coverId: coverImage?.id || '',
                            slug: createSlug(folder.name),
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            order: Date.now() - index
                        };

                        await setDoc(doc(db, 'merci_albums', newId), albumData);
                        addedCount += 1;
                    }
                } catch (folderError) {
                    errorCount += 1;
                    console.error('Lỗi đồng bộ folder:', folder, folderError);
                }
            }

            setSyncProgress('');
            alert(
                `Đồng bộ Drive hoàn tất!\n\n` +
                `Album mới: ${addedCount}\n` +
                `Album đã cập nhật ảnh: ${updatedCount}\n` +
                `Folder không có ảnh: ${emptyCount}` +
                `${errorCount ? `\nFolder lỗi: ${errorCount}` : ''}`
            );

            setSyncDriveLink('');
            setSyncHashtags('');
            setShowSyncModal(false);
        } catch (error) {
            console.error('Lỗi đồng bộ album:', error);
            alert('Lỗi đồng bộ: ' + error.message);
            setSyncProgress('');
        } finally {
            setIsSyncingAlbums(false);
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleDeleteAlbum = async (id) => {
        if (!confirm("Bạn có chắc chắn muốn xóa album này?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'merci_albums', id));
            setEditingAlbum(null);
            if (activeAlbumId === id) setActiveAlbumId(null);
        } catch (e) { alert("Lỗi khi xóa album."); }
        finally { setIsLoading(false); }
    };

    const handleSetCover = async (e, imageUrl) => {
        e.stopPropagation();
        if (!activeAlbumId) return;
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_albums', activeAlbumId), { coverUrl: imageUrl, coverId: activeAlbumId ? (albumImages.find(img => img.url === imageUrl)?.id || '') : '' });
            alert("Đã đặt ảnh này làm Ảnh Bìa thành công!");
        } catch (error) { alert("Lỗi khi cập nhật ảnh bìa."); }
        finally { setIsLoading(false); }
    };

    const handleMoveAlbum = async (id, direction, e) => {
        e.stopPropagation();
        const index = albums.findIndex(a => a.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === albums.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentItem = albums[index];
        const targetItem = albums[targetIndex];

        let order1 = currentItem.order;
        let order2 = targetItem.order;

        if (order1 === order2) order1 += (direction === 'up' ? -1 : 1);

        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_albums', currentItem.id), { order: order2 });
            await updateDoc(doc(db, 'merci_albums', targetItem.id), { order: order1 });
        } catch (err) { alert("Lỗi khi đổi vị trí."); }
        finally { setIsLoading(false); }
    };

    const handleAlbumDrop = async (targetAlbumId, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAdmin || !draggingAlbumId || draggingAlbumId === targetAlbumId) {
            setDraggingAlbumId(null);
            setDragOverAlbumId(null);
            return;
        }

        const visibleAlbums = activeCategory === 'Tất cả'
            ? albums
            : albums.filter(a => albumMatchesCategory(a, activeCategory));

        const fromIndex = visibleAlbums.findIndex(item => item.id === draggingAlbumId);
        const toIndex = visibleAlbums.findIndex(item => item.id === targetAlbumId);
        if (fromIndex === -1 || toIndex === -1) {
            setDraggingAlbumId(null);
            setDragOverAlbumId(null);
            return;
        }

        const reordered = [...visibleAlbums];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        setIsLoading(true);
        setLoadingMessage('Đang lưu thứ tự album...');
        try {
            const baseOrder = Date.now();
            await Promise.all(reordered.map((item, index) =>
                updateDoc(doc(db, 'merci_albums', item.id), {
                    order: baseOrder + (reordered.length - index) * 1000,
                    updatedAt: Date.now()
                })
            ));
        } catch (error) {
            console.error('Album drag drop error:', error);
            alert('Lỗi khi lưu thứ tự album.');
        } finally {
            setDraggingAlbumId(null);
            setDragOverAlbumId(null);
            setIsLoading(false);
        }
    };

    // === HELPERS (Booking & Telegram) ===
    const handleCreateBooking = async (e) => {
        e.preventDefault();
        if (!bookingForm.name || !bookingForm.phone) {
            alert("Vui lòng điền đầy đủ Họ tên và Số điện thoại!");
            return;
        }
        setIsSubmittingBooking(true);
        try {
            const bookingId = `booking_${Date.now()}`;
            const bookingData = {
                id: bookingId,
                name: bookingForm.name,
                phone: bookingForm.phone,
                service: bookingForm.service,
                date: bookingForm.date || 'Chưa chọn',
                notes: bookingForm.notes || 'Không có',
                status: 'Chưa xử lý',
                ownerUid: user?.uid || null,
                createdAt: Date.now()
            };
            
            // 1. Save to Firebase
            await setDoc(doc(db, 'merci_bookings', bookingId), bookingData);

            // Update tracking session step & fire Pixel Lead event
            updateSessionStep('completedBooking');
            trackPixelEvent('Lead', {
                content_name: bookingForm.service,
                value: 0,
                currency: 'VND'
            });
            
            // 2. Call API to send Telegram message
            try {
                const res = await fetch('/api/send-booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });
                if (!res.ok) {
                    console.warn("Telegram alert failed on server-side.");
                }
            } catch (err) {
                console.error("Telegram notification failed:", err);
            }

            alert("Đặt lịch thành công! Merci Studio sẽ liên hệ lại với bạn sớm nhất.");
            setBookingForm({ name: '', phone: '', service: 'Chụp ảnh cưới (Wedding)', date: '', notes: '' });
        } catch (error) {
            console.error("Booking submission error:", error);
            alert("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại!");
        } finally {
            setIsSubmittingBooking(false);
        }
    };

    const handleUpdateBookingStatus = async (bookingId, currentStatus) => {
        let nextStatus = 'Chưa xử lý';
        if (currentStatus === 'Chưa xử lý') nextStatus = 'Đã tư vấn';
        else if (currentStatus === 'Đã tư vấn') nextStatus = 'Đã hoàn thành';

        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_bookings', bookingId), { status: nextStatus });

            if (nextStatus === 'Đã hoàn thành') {
                const bookingDoc = await getDoc(doc(db, 'merci_bookings', bookingId));
                if (bookingDoc.exists()) {
                    const bookingData = bookingDoc.data();
                    if (bookingData.ownerUid) {
                        const userDocRef = doc(db, 'merci_users', bookingData.ownerUid);
                        const userSnap = await getDoc(userDocRef);
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            await updateDoc(userDocRef, {
                                points: (userData.points || 0) + 200,
                                history: [
                                    ...(userData.history || []),
                                    {
                                        id: `tx_${Date.now()}_booking_${bookingId}`,
                                        amount: 200,
                                        type: 'booking',
                                        description: `Hoàn thành lịch hẹn dịch vụ ${bookingData.service || ''}`,
                                        createdAt: Date.now()
                                    }
                                ]
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Update booking status error:", err);
            alert("Lỗi khi cập nhật trạng thái!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteBooking = async (bookingId) => {
        if (!confirm("Bạn có chắc muốn xóa yêu cầu đặt lịch này không?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'merci_bookings', bookingId));
        } catch (err) {
            console.error("Delete booking error:", err);
            alert("Lỗi khi xóa!");
        } finally {
            setIsLoading(false);
        }
    };

    // === HELPERS (Admin Videos) ===
    const extractYoutubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleAddVideo = async () => {
        if (!newVideo.title || !newVideo.url) return alert("Vui lòng nhập đủ thông tin!");
        const yId = extractYoutubeId(newVideo.url);
        if (!yId) return alert("Link YouTube không hợp lệ!");

        setIsLoading(true);
        const data = {
            id: `video_${Date.now()}`,
            title: newVideo.title,
            youtubeId: yId,
            createdAt: new Date().toISOString(),
            order: Date.now()
        };
        try {
            await setDoc(doc(db, 'merci_videos', data.id), data);
            setIsAddingVideo(false);
            setNewVideo({ title: '', url: '' });
        } catch (e) { alert("Lỗi lưu video."); }
        finally { setIsLoading(false); }
    };

    const handleDeleteVideo = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Xóa video này?")) return;
        try { await deleteDoc(doc(db, 'merci_videos', id)); } catch (e) { alert("Lỗi xóa video."); }
    };

    const handleMoveVideo = async (id, direction, e) => {
        e.stopPropagation();
        const index = videos.findIndex(v => v.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === videos.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const currentItem = videos[index];
        const targetItem = videos[targetIndex];

        let order1 = currentItem.order;
        let order2 = targetItem.order;

        if (order1 === order2) order1 += (direction === 'up' ? -1 : 1);

        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_videos', currentItem.id), { order: order2 });
            await updateDoc(doc(db, 'merci_videos', targetItem.id), { order: order1 });
        } catch (err) { alert("Lỗi khi đổi vị trí."); }
        finally { setIsLoading(false); }
    };

    const handleVideoDrop = async (targetVideoId, e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAdmin || !draggingVideoId || draggingVideoId === targetVideoId) {
            setDraggingVideoId(null);
            setDragOverVideoId(null);
            return;
        }

        const fromIndex = videos.findIndex(item => item.id === draggingVideoId);
        const toIndex = videos.findIndex(item => item.id === targetVideoId);
        if (fromIndex === -1 || toIndex === -1) {
            setDraggingVideoId(null);
            setDragOverVideoId(null);
            return;
        }

        const reordered = [...videos];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);

        setIsLoading(true);
        setLoadingMessage('Đang lưu thứ tự video...');
        try {
            const baseOrder = Date.now();
            await Promise.all(reordered.map((item, index) =>
                updateDoc(doc(db, 'merci_videos', item.id), {
                    order: baseOrder + (reordered.length - index) * 1000
                })
            ));
        } catch (error) {
            console.error('Video drag drop error:', error);
            alert('Lỗi khi lưu thứ tự video.');
        } finally {
            setDraggingVideoId(null);
            setDragOverVideoId(null);
            setIsLoading(false);
        }
    };

    // === HELPERS (Admin Blogs) ===
    const normalizeBlogHashtags = (input) => {
        const raw = Array.isArray(input)
            ? input
            : String(input || '')
                .split(/[,，、;；#\n\r]+/)
                .map(item => item.trim())
                .filter(Boolean);

        return Array.from(new Set(
            raw
                .map(tag => tag.replace(/^#/, '').trim())
                .filter(Boolean)
                .map(tag => tag.length > 40 ? tag.slice(0, 40) : tag)
        ));
    };

    const getBlogHashtags = (blog) => {
        return normalizeBlogHashtags(blog?.hashtags || blog?.tags || []);
    };

    const getAllBlogHashtags = () => {
        const tags = blogs.flatMap(blog => getBlogHashtags(blog));
        return ['Tất cả', ...Array.from(new Set(tags))];
    };

    const getFilteredBlogsByHashtag = () => {
        if (activeBlogHashtag === 'Tất cả') return blogs;

        return blogs.filter(blog =>
            getBlogHashtags(blog)
                .map(tag => tag.toLowerCase())
                .includes(activeBlogHashtag.toLowerCase())
        );
    };

    const addHashtagToBlogInput = (tag) => {
        const current = normalizeBlogHashtags(newBlog.hashtags);
        const cleanTag = String(tag || '').replace(/^#/, '').trim();
        if (!cleanTag) return;

        const next = Array.from(new Set([...current, cleanTag]));
        setNewBlog(prev => ({ ...prev, hashtags: next.join(', ') }));
    };

    const resetNewBlogForm = () => {
        setNewBlog({ title: '', slug: '', metaDesc: '', content: '', coverUrl: '', hashtags: '' });
    };

    const handleSaveBlog = async () => {
        if (!newBlog.title || !newBlog.content) return alert("Vui lòng nhập tiêu đề và nội dung!");
        setIsLoading(true);

        const generatedSlug = newBlog.slug ? createSlug(newBlog.slug) : createSlug(newBlog.title);

        const data = {
            id: editingBlog ? editingBlog.id : `blog_${Date.now()}`,
            title: newBlog.title,
            slug: generatedSlug,
            metaDesc: newBlog.metaDesc || '',
            content: newBlog.content,
            coverUrl: newBlog.coverUrl || DEFAULT_COVER,
            hashtags: normalizeBlogHashtags(newBlog.hashtags),
            createdAt: editingBlog ? editingBlog.createdAt : Date.now(),
            updatedAt: Date.now()
        };

        try {
            await setDoc(doc(db, 'merci_blogs', data.id), data);
            setIsAddingBlog(false);
            setEditingBlog(null);
            resetNewBlogForm();
        } catch (e) { alert("Lỗi lưu bài viết."); }
        finally { setIsLoading(false); }
    };

    const handleDeleteBlog = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Xóa bài viết này?")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'merci_blogs', id));
            if (activeBlogId === id) setActiveBlogId(null);
        }
        catch (e) { alert("Lỗi xóa bài viết."); }
        finally { setIsLoading(false); }
    };

    const openEditBlog = (blog, e) => {
        e.stopPropagation();
        setEditingBlog(blog);
        setNewBlog({
            title: blog.title,
            slug: blog.slug,
            metaDesc: blog.metaDesc || '',
            content: blog.content,
            coverUrl: blog.coverUrl,
            hashtags: getBlogHashtags(blog).join(', ')
        });
        setIsAddingBlog(true);
    };

    const openNewBlogModal = () => {
        setEditingBlog(null);
        resetNewBlogForm();
        setAiBlogPrompt('');
        setAiBlogKeyword('');
        setBlogImageUrl('');
        setBlogImageCaption('');
        setIsAddingBlog(true);
    };

    const insertTextIntoBlogContent = (textToInsert) => {
        setNewBlog(prev => {
            const current = prev.content || '';
            const nextContent = `${current}${current.trim() ? '\n\n' : ''}${textToInsert}\n`;
            return { ...prev, content: nextContent };
        });
    };

    const handleInsertBlogImage = () => {
        const url = blogImageUrl.trim();
        if (!url) return alert('Vui lòng nhập link ảnh cần chèn.');
        if (!/^https?:\/\//i.test(url)) return alert('Link ảnh cần bắt đầu bằng http:// hoặc https://');

        const caption = blogImageCaption.trim() || 'Ảnh minh họa Merci Studio';
        insertTextIntoBlogContent(`![${caption}](${url})`);

        if (!newBlog.coverUrl) {
            setNewBlog(prev => ({ ...prev, coverUrl: url }));
        }

        setBlogImageUrl('');
        setBlogImageCaption('');
    };

    const getAiProviderLabel = () => aiProvider === 'openai' ? 'ChatGPT' : 'Gemini';

    const getDriveChildFolders = async (parentFolderId) => {
        if (!GOOGLE_API_KEY || !parentFolderId) return [];

        const childFolders = [];
        let pageToken = '';

        do {
            const q = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
            const url =
                `https://www.googleapis.com/drive/v3/files` +
                `?q=${encodeURIComponent(q)}` +
                `&key=${GOOGLE_API_KEY}` +
                `&fields=nextPageToken,files(id,name,mimeType)` +
                `&pageSize=100` +
                `&orderBy=name` +
                (pageToken ? `&pageToken=${pageToken}` : '');

            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.error('Google Drive child folder error:', data.error);
                throw new Error(data.error.message || 'Không lấy được folder con Google Drive');
            }

            childFolders.push(...(data.files || []));
            pageToken = data.nextPageToken || '';
        } while (pageToken);

        return childFolders;
    };

    const handleLoadBlogDriveImages = async () => {
        const folderId = extractDriveFolderId(blogDriveFolderLink);
        if (!folderId) return alert('Vui lòng dán link folder Google Drive cha hoặc folder kho ảnh blog.');
        if (!GOOGLE_API_KEY) return alert('Thiếu NEXT_PUBLIC_GOOGLE_API_KEY để đọc ảnh Google Drive.');

        setIsLoadingBlogDriveImages(true);
        setIsLoading(true);
        setLoadingMessage('Đang lấy kho ảnh Google Drive cho blog...');

        try {
            const childFolders = await getDriveChildFolders(folderId);
            const readySubfolders = [];
            const allImages = [];

            if (childFolders.length > 0) {
                for (let index = 0; index < childFolders.length; index += 1) {
                    const folder = childFolders[index];
                    setLoadingMessage(`Đang lấy ảnh folder con ${index + 1}/${childFolders.length}: ${folder.name || 'Folder con'}`);

                    try {
                        const files = await getAllDriveImages(folder.id);
                        const images = files.map(file => ({
                            ...normalizeDriveImage(file),
                            sourceFolderId: folder.id,
                            sourceFolderName: folder.name || `Folder con ${index + 1}`
                        }));

                        if (images.length > 0) {
                            readySubfolders.push({
                                id: folder.id,
                                name: folder.name || `Folder con ${index + 1}`,
                                images
                            });
                            allImages.push(...images);
                        }
                    } catch (error) {
                        console.warn('Không lấy được ảnh folder con:', folder, error);
                    }
                }
            }

            // Nếu folder cha không có folder con hoặc folder con không có ảnh,
            // dùng chính folder đã dán như một kho ảnh phẳng.
            if (allImages.length === 0) {
                setLoadingMessage('Đang lấy ảnh trực tiếp trong folder đã dán...');
                const files = await getAllDriveImages(folderId);
                const parentInfo = await getDriveFolderInfo(folderId);
                const images = files.map(file => ({
                    ...normalizeDriveImage(file),
                    sourceFolderId: folderId,
                    sourceFolderName: parentInfo?.name || 'Kho ảnh blog'
                }));

                setBlogDriveImages(images);
                setBlogDriveSubfolders([]);

                if (images.length === 0) {
                    alert('Folder Drive này chưa có ảnh hoặc chưa bật quyền chia sẻ: Bất kỳ ai có liên kết đều có thể xem.');
                } else {
                    alert(`Đã lấy ${images.length} ảnh trong kho. Bài hàng loạt sẽ tự xoay ảnh trong kho này.`);
                }
                return;
            }

            setBlogDriveImages(allImages);
            setBlogDriveSubfolders(readySubfolders);

            alert(`Đã lấy ${allImages.length} ảnh từ ${readySubfolders.length} folder con. Khi viết hàng loạt, mỗi bài sẽ tự lấy ảnh trong 1 folder con riêng.`);
        } catch (error) {
            console.error('Load blog Drive images error:', error);
            alert('Không lấy được ảnh từ kho Drive: ' + error.message);
        } finally {
            setIsLoadingBlogDriveImages(false);
            setIsLoading(false);
        }
    };

    const getBlogDriveImagesForArticle = (articleIndex = null) => {
        const foldersWithImages = (blogDriveSubfolders || []).filter(folder => Array.isArray(folder.images) && folder.images.length > 0);

        if (foldersWithImages.length > 0 && articleIndex !== null && articleIndex !== undefined) {
            const folderIndex = Math.abs(Number(articleIndex) || 0) % foldersWithImages.length;
            return foldersWithImages[folderIndex].images;
        }

        return blogDriveImages || [];
    };

    const getBlogDriveFolderNameForArticle = (articleIndex = 0) => {
        const foldersWithImages = (blogDriveSubfolders || []).filter(folder => Array.isArray(folder.images) && folder.images.length > 0);
        if (!foldersWithImages.length) return '';
        const folderIndex = Math.abs(Number(articleIndex) || 0) % foldersWithImages.length;
        return foldersWithImages[folderIndex]?.name || '';
    };

    const getBlogDriveImageUrl = (index = 0, articleIndex = null) => {
        const imagePool = getBlogDriveImagesForArticle(articleIndex);
        if (!imagePool.length) return '';

        const safeIndex = Math.abs(Number(index) || 0) % imagePool.length;
        const img = imagePool[safeIndex];

        return img?.originalUrl || img?.url || img?.thumbnailUrl || '';
    };

    const pickBlogDriveImage = (index = 0, articleIndex = null) => {
        return getBlogDriveImageUrl(index, articleIndex);
    };

    const handleUseBlogDriveImage = (img) => {
        const imageUrl = img?.originalUrl || img?.url || img?.thumbnailUrl || '';
        if (!imageUrl) return;
        setNewBlog(prev => ({ ...prev, coverUrl: imageUrl }));
        setBlogImageUrl(imageUrl);
    };

    const handleGenerateBlogWithAI = async (publishNow = false) => {
        if (!aiBlogPrompt.trim()) {
            alert(`Vui lòng nhập chủ đề bài viết cho ${getAiProviderLabel()}.`);
            return;
        }

        if (publishNow && !confirm(`${getAiProviderLabel()} sẽ viết và đăng bài ngay lên website. Bạn chắc chắn muốn đăng luôn?`)) {
            return;
        }

        setIsGeneratingBlog(true);
        setIsLoading(true);
        setLoadingMessage(publishNow ? `${getAiProviderLabel()} đang viết bài chuẩn SEO và đăng lên blog...` : `${getAiProviderLabel()} đang viết nháp bài chuẩn SEO...`);

        try {
            const response = await fetch('/api/generate-blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: aiProvider,
                    topic: aiBlogPrompt,
                    mainKeyword: aiBlogKeyword,
                    brandName: 'Merci Studio',
                    serviceArea: 'Bắc Ninh, Bắc Giang, Hà Nội',
                    services: ['ảnh cưới', 'kỷ yếu', 'couple', 'baby family', 'photobooth', 'makeup', 'váy cưới'],
                    tone: 'tự nhiên, chuyên nghiệp, dễ đọc, có tính chuyển đổi booking'
                })
            });

            const result = await response.json();

            if (!response.ok || !result?.title || !result?.content) {
                throw new Error(result?.error || `${getAiProviderLabel()} chưa tạo được bài viết hợp lệ.`);
            }

            const coverFromDrive = getBlogDriveImageUrl(0, 0);

            const generatedBlog = {
                title: result.title,
                slug: createSlug(result.slug || result.title),
                metaDesc: result.metaDesc || '',
                content: injectDriveImagesIntoBlogContent(result.content || '', result.title, 1, 0),
                coverUrl: result.coverUrl || coverFromDrive || newBlog.coverUrl || DEFAULT_COVER,
                hashtags: normalizeBlogHashtags(result.hashtags || [aiBlogKeyword || aiBlogPrompt, 'Merci Studio', 'Bắc Ninh'])
            };

            if (publishNow) {
                const data = {
                    id: `blog_${Date.now()}`,
                    ...generatedBlog,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                await setDoc(doc(db, 'merci_blogs', data.id), data);
                setIsAddingBlog(false);
                setEditingBlog(null);
                resetNewBlogForm();
                setAiBlogPrompt('');
                setAiBlogKeyword('');
                alert(`${getAiProviderLabel()} đã viết và đăng bài lên blog thành công!`);
            } else {
                setNewBlog(generatedBlog);
                alert(`${getAiProviderLabel()} đã viết xong bản nháp. Hãy đọc lại rồi bấm Đăng bài.`);
            }
        } catch (error) {
            console.error('AI blog generation error:', error);
            alert(`Không tạo được bài viết bằng ${getAiProviderLabel()}: ${error.message}`);
        } finally {
            setIsGeneratingBlog(false);
            setIsLoading(false);
        }
    };

    const handleSearchTrends = async () => {
        const kw = trendKeyword.trim();
        if (!kw) return alert('Vui lòng nhập chủ đề tìm kiếm trend.');
        setIsSearchingTrends(true);
        setSearchTrendsResult([]);
        try {
            const res = await fetch('/api/search-trends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: kw })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSearchTrendsResult(data.items || []);
        } catch (error) {
            console.error('handleSearchTrends:', error);
            alert('Lỗi: ' + error.message);
        } finally {
            setIsSearchingTrends(false);
        }
    };

    const handleGenerateTrendTopics = async (trend) => {
        if (!confirm(`Tạo ý tưởng bài viết từ trend: "${trend.title}"?`)) return;
        setIsGeneratingTrendTopics(true);
        try {
            const res = await fetch('/api/generate-trend-topics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trendTitle: trend.title
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const newTopics = data.items.map((i) => `${i.topic} | ${i.mainKeyword}`).join('\n');
            setBulkBlogTopics(prev => prev ? prev + '\n' + newTopics : newTopics);
            alert(`Đã thêm ${data.items.length} ý tưởng vào ô nhập hàng loạt bên dưới!`);
        } catch (error) {
            console.error('handleGenerateTrendTopics:', error);
            alert('Lỗi: ' + error.message);
        } finally {
            setIsGeneratingTrendTopics(false);
        }
    };

    const parseBulkBlogTopics = () => {
        return bulkBlogTopics
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const parts = line.split('|').map(part => part.trim()).filter(Boolean);
                return {
                    topic: parts[0] || '',
                    mainKeyword: parts[1] || parts[0] || ''
                };
            })
            .filter(item => item.topic);
    };

    const handleGenerateRelatedTopics = async () => {
        const keyword = autoKeyword.trim();
        const count = Math.min(20, Math.max(1, Number(autoArticleCount) || 1));

        if (!keyword) {
            alert('Vui lòng nhập từ khóa gốc để AI tự tạo các bài liên quan.');
            return;
        }

        setIsGeneratingTopicIdeas(true);
        setIsLoading(true);
        setLoadingMessage(`${getAiProviderLabel()} đang lên danh sách ${count} bài liên quan đến: ${keyword}`);

        try {
            const response = await fetch('/api/generate-blog-topics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: aiProvider,
                    keyword,
                    count,
                    brandName: 'Merci Studio',
                    serviceArea: 'Bắc Ninh, Bắc Giang, Hà Nội',
                    services: ['ảnh cưới', 'kỷ yếu', 'couple', 'baby family', 'photobooth', 'makeup', 'váy cưới']
                })
            });

            const result = await response.json();

            if (!response.ok || !Array.isArray(result?.items) || result.items.length === 0) {
                throw new Error(result?.error || `${getAiProviderLabel()} chưa tạo được danh sách bài liên quan.`);
            }

            const lines = result.items
                .slice(0, count)
                .map(item => `${item.topic || item.title || keyword} | ${item.mainKeyword || item.keyword || keyword}`)
                .join('\n');

            setBulkBlogTopics(prev => {
                const current = prev.trim();
                return current ? `${current}\n${lines}` : lines;
            });

            alert(`Đã tạo ${Math.min(result.items.length, count)} chủ đề liên quan. Bạn có thể chỉnh lại rồi bấm viết hàng loạt.`);
        } catch (error) {
            console.error('Generate related blog topics error:', error);
            alert(`Không tạo được danh sách bài liên quan: ${error.message}`);
        } finally {
            setIsGeneratingTopicIdeas(false);
            setIsLoading(false);
        }
    };

    const cleanAiContent = (content = '') => {
        return String(content || '')
            .replace(/```markdown/gi, '')
            .replace(/```md/gi, '')
            .replace(/```/g, '')
            .trim();
    };

    const injectDriveImagesIntoBlogContent = (content = '', title = 'Merci Studio', startIndex = 0, articleIndex = null) => {
        let cleanContent = cleanAiContent(content);

        const imagePool = getBlogDriveImagesForArticle(articleIndex);

        // Nếu chưa nạp kho ảnh Drive, xóa các placeholder ảnh để bài không hiện link lỗi.
        if (!imagePool.length) {
            return cleanContent
                .replace(/^!\[(.*?)\]\(LINK_ANH_CAN_THAY\)\s*$/gim, '')
                .replace(/^!\[(.*?)\]\(link_anh_can_thay\)\s*$/gim, '')
                .replace(/^!\[(.*?)\]\(IMAGE_URL\)\s*$/gim, '')
                .replace(/^!\[(.*?)\]\(image_url\)\s*$/gim, '')
                .replace(/^!\[(.*?)\]\(\s*\)\s*$/gim, '')
                .trim();
        }

        let imageCursor = Number(startIndex) || 0;

        // Thay placeholder ảnh do AI tạo bằng ảnh thật lấy từ kho Google Drive.
        cleanContent = cleanContent.replace(
            /^!\[(.*?)\]\((LINK_ANH_CAN_THAY|link_anh_can_thay|IMAGE_URL|image_url|)\)\s*$/gim,
            (_, alt) => {
                const imageUrl = getBlogDriveImageUrl(imageCursor++, articleIndex);
                if (!imageUrl) return '';
                return `![${alt || title}](${imageUrl})`;
            }
        );

        // Nếu AI đã có ảnh thật trong nội dung thì giữ nguyên.
        const alreadyHasRealImage = /!\[(.*?)\]\((https?:\/\/.*?)\)/i.test(cleanContent);
        if (alreadyHasRealImage) return cleanContent;

        // Nếu bài chưa có ảnh, tự chèn ảnh sau một số H2 để bài không bị toàn text.
        const lines = cleanContent.split('\n');
        const nextLines = [];
        let h2Count = 0;
        let insertedCount = 0;

        const maxImages = Math.min(
            imagePool.length,
            lines.length > 90 ? 4 : 3
        );

        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            nextLines.push(line);

            if (line.trim().startsWith('## ')) {
                h2Count += 1;

                // Chèn ảnh sau H2 số 1, 3, 5... để trải đều bài.
                if (insertedCount < maxImages && h2Count % 2 === 1) {
                    const imageUrl = getBlogDriveImageUrl(imageCursor++, articleIndex);
                    if (imageUrl) {
                        const alt = `${title} - hình ảnh minh họa ${insertedCount + 1}`;
                        nextLines.push('');
                        nextLines.push(`![${alt}](${imageUrl})`);
                        nextLines.push('');
                        insertedCount += 1;
                    }
                }
            }
        }

        // Nếu bài ít H2, chèn ít nhất 1 ảnh sau đoạn mở bài.
        if (insertedCount === 0) {
            const imageUrl = getBlogDriveImageUrl(imageCursor++, articleIndex);
            if (imageUrl) {
                const firstBlankIndex = nextLines.findIndex((line, index) => index > 0 && !line.trim());
                const insertAt = firstBlankIndex > 0 ? firstBlankIndex + 1 : Math.min(3, nextLines.length);

                nextLines.splice(
                    insertAt,
                    0,
                    '',
                    `![${title} - hình ảnh minh họa](${imageUrl})`,
                    ''
                );
            }
        }

        return nextLines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
    };

    const generateSingleBlogData = async ({ topic, mainKeyword }, imageIndex = 0) => {
        const response = await fetch('/api/generate-blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: aiProvider,
                topic,
                mainKeyword,
                brandName: 'Merci Studio',
                serviceArea: 'Bắc Ninh, Bắc Giang, Hà Nội',
                services: ['ảnh cưới', 'kỷ yếu', 'couple', 'baby family', 'photobooth', 'makeup', 'váy cưới'],
                tone: 'tự nhiên, chuyên nghiệp, dễ đọc, có tính chuyển đổi booking'
            })
        });

        let result = null;

        try {
            result = await response.json();
        } catch (error) {
            const rawText = await response.text().catch(() => '');
            console.error('API generate-blog không trả JSON:', rawText);
            throw new Error('API generate-blog không trả về JSON. Kiểm tra file app/api/generate-blog/route.js');
        }

        if (!response.ok) {
            throw new Error(result?.error || `${getAiProviderLabel()} API lỗi.`);
        }

        if (!result?.title || !result?.content) {
            console.error('Response thiếu dữ liệu:', result);
            throw new Error(`${getAiProviderLabel()} chưa tạo được bài viết hợp lệ.`);
        }

        const coverFromDrive = getBlogDriveImageUrl(0, imageIndex);
        const coverUrl = result.coverUrl || coverFromDrive || DEFAULT_COVER;
        const sourceImageFolderName = getBlogDriveFolderNameForArticle(imageIndex);

        return {
            title: result.title,
            slug: createSlug(result.slug || result.title),
            metaDesc: result.metaDesc || '',
            content: injectDriveImagesIntoBlogContent(result.content || '', result.title, 1, imageIndex),
            coverUrl,
            hashtags: normalizeBlogHashtags(result.hashtags || [mainKeyword || topic, 'Merci Studio', 'Bắc Ninh']),
            aiProvider,
            sourceTopic: topic,
            sourceKeyword: mainKeyword || topic,
            sourceImageFolderName
        };
    };


    const handleBulkGenerateBlogs = async (publishNow = false) => {
        const items = parseBulkBlogTopics();
        if (items.length === 0) {
            alert('Vui lòng nhập danh sách chủ đề, mỗi dòng 1 bài. Ví dụ: Chụp ảnh cưới Bắc Ninh | chụp ảnh cưới Bắc Ninh');
            return;
        }

        if (items.length > 20) {
            alert('Để tránh quá tải API, mỗi lần chỉ nên tạo tối đa 20 bài. Hãy chia nhỏ danh sách.');
            return;
        }

        if (publishNow && !confirm(`Bạn sắp dùng ${getAiProviderLabel()} viết và đăng ${items.length} bài lên website. Tiếp tục?`)) {
            return;
        }

        setIsBulkGeneratingBlog(true);
        setIsLoading(true);
        setBulkGeneratedBlogs([]);

        const generated = [];
        const failed = [];

        try {
            for (let index = 0; index < items.length; index += 1) {
                const item = items[index];
                const progressText = `${getAiProviderLabel()} đang xử lý bài ${index + 1}/${items.length}: ${item.topic}`;
                setBulkBlogProgress(progressText);
                setLoadingMessage(progressText);

                try {
                    const blogData = await generateSingleBlogData(item, index);
                    generated.push(blogData);
                    setBulkGeneratedBlogs([...generated]);

                    if (publishNow) {
                        const now = Date.now();
                        await setDoc(doc(db, 'merci_blogs', `blog_${now}_${index}`), {
                            ...blogData,
                            id: `blog_${now}_${index}`,
                            createdAt: now,
                            updatedAt: now
                        });
                    }
                } catch (error) {
                    console.error('Bulk blog item error:', item, error);
                    failed.push(`${item.topic}: ${error.message}`);
                }
            }

            if (publishNow) {
                alert(`Đã đăng ${generated.length}/${items.length} bài.${failed.length ? `\nLỗi ${failed.length} bài:\n${failed.join('\n')}` : ''}`);
                if (generated.length > 0) {
                    setBulkBlogTopics('');
                }
            } else {
                alert(`Đã viết nháp ${generated.length}/${items.length} bài. Bạn có thể bấm “Đưa vào form sửa” để kiểm tra từng bài rồi đăng.`);
            }
        } finally {
            setIsBulkGeneratingBlog(false);
            setIsLoading(false);
            setBulkBlogProgress('');
        }
    };

    const useBulkDraftInForm = (blog) => {
        setNewBlog({
            title: blog.title || '',
            slug: blog.slug || '',
            metaDesc: blog.metaDesc || '',
            content: blog.content || '',
            coverUrl: blog.coverUrl || '',
            hashtags: normalizeBlogHashtags(blog.hashtags || []).join(', ')
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Tải ảnh đơn có watermark logo - KHÔNG mở link ảnh gốc nếu đóng dấu lỗi
    // Dùng proxy nội bộ để tải ảnh Google Drive qua server Next.js.
    // Lý do: fetch trực tiếp Google Drive trên trình duyệt hay bị CORS,
    // làm canvas không đóng dấu được và code cũ bị nhảy sang link ảnh gốc.
    const buildDriveMediaUrl = (fileId) => {
        if (!fileId) return '';
        return `/api/drive-image?id=${encodeURIComponent(fileId)}`;
    };

    const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const loadImageElement = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        // Dùng dataURL/blob nội bộ để tránh canvas bị tainted bởi Google Drive CORS
        img.src = src;
    });

    const getImageDownloadSources = (imageInput) => {
        const img = typeof imageInput === 'string' ? { originalUrl: imageInput } : (imageInput || {});
        const sources = [
            // Ưu tiên proxy nội bộ để tránh CORS và luôn đóng dấu được.
            img.id ? buildDriveMediaUrl(img.id) : '',
            // Các nguồn dưới chỉ là dự phòng, không bao giờ mở tab link gốc.
            img.originalUrl,
            img.url,
            img.thumbnailUrl,
            img.id ? `https://drive.google.com/thumbnail?id=${img.id}&sz=w2400` : ''
        ].filter(Boolean);

        return Array.from(new Set(sources));
    };

    const fetchImageAsDataUrl = async (imageInput) => {
        const sources = getImageDownloadSources(imageInput);
        let lastError = null;

        for (const src of sources) {
            try {
                if (src.startsWith('data:')) return src;

                const res = await fetch(src, { mode: 'cors', cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const blob = await res.blob();
                if (!blob || !blob.type.startsWith('image/')) throw new Error('Không phải file ảnh');

                return await blobToDataUrl(blob);
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error('Không tải được ảnh để đóng dấu');
    };

    const drawMerciLogoWatermark = async (ctx, width, height) => {
        try {
            const logo = await loadImageElement(WATERMARK_LOGO_SRC);
            const logoWidth = logo.naturalWidth || logo.width || 1;
            const logoHeight = logo.naturalHeight || logo.height || 1;
            const logoRatio = logoWidth / logoHeight;

            // Logo nằm giữa phía dưới, mờ nhẹ để không phá ảnh.
            let targetWidth = Math.min(Math.max(width * 0.48, 320), width * 0.72);
            let targetHeight = targetWidth / logoRatio;
            const maxLogoHeight = height * 0.16;

            if (targetHeight > maxLogoHeight) {
                targetHeight = maxLogoHeight;
                targetWidth = targetHeight * logoRatio;
            }

            const paddingBottom = Math.max(34, height * 0.045);
            const x = (width - targetWidth) / 2;
            const y = height - paddingBottom - targetHeight;

            ctx.save();
            ctx.globalAlpha = 0.38;
            ctx.shadowColor = 'rgba(0,0,0,0.28)';
            ctx.shadowBlur = Math.max(6, Math.round(width * 0.004));
            ctx.drawImage(logo, x, y, targetWidth, targetHeight);
            ctx.restore();
        } catch (error) {
            console.warn('Không tải được logo watermark, bỏ qua watermark logo:', error);
        }
    };

    const createWatermarkedImageBlob = async (imageInput) => {
        const dataUrl = await fetchImageAsDataUrl(imageInput);
        const img = await loadImageElement(dataUrl);

        const canvas = document.createElement('canvas');
        // Giữ nguyên kích thước gốc của ảnh Google Drive, không resize.
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Chèn watermark bằng logo mờ ở giữa phía dưới ảnh.
        await drawMerciLogoWatermark(ctx, canvas.width, canvas.height);

        // Xuất JPEG quality cao. Canvas vẫn phải encode lại ảnh vì có chèn chữ,
        // nhưng giữ nguyên độ phân giải gốc và dùng quality 0.98 để hạn chế giảm chất lượng.
        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Không xuất được ảnh đã đóng dấu'));
            }, 'image/jpeg', 0.98);
        });
    };

    const getFileNameWithoutExt = (name = 'image') => {
        return name.replace(/\.[^/.]+$/, '') || 'image';
    };

    const downloadBlob = (blob, fileName) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
    };

    // Chỉ dùng cho BỘ SƯU TẬP: tải ảnh có logo watermark Merci Studio
    const handleDownloadWithWatermark = async (imageOrUrl, imageName, event) => {
        if (event) event.stopPropagation();

        setIsLoading(true);
        setLoadingMessage('Đang chèn logo Merci Studio...');

        try {
            const imageId =
                typeof imageOrUrl === 'object'
                    ? imageOrUrl?.id
                    : '';

            const sourceUrl = imageId
                ? `/api/drive-image?id=${encodeURIComponent(imageId)}`
                : imageOrUrl;

            const response = await fetch(sourceUrl, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Không tải được ảnh: ${response.status}`);
            }

            const blob = await response.blob();

            let bitmap;
            if ('createImageBitmap' in window) {
                bitmap = await createImageBitmap(blob);
            } else {
                bitmap = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = URL.createObjectURL(blob);
                });
            }

            const width = bitmap.width;
            const height = bitmap.height;

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Không tạo được canvas');

            ctx.drawImage(bitmap, 0, 0, width, height);

            // Chèn watermark bằng logo mờ ở giữa phía dưới ảnh.
            await drawMerciLogoWatermark(ctx, width, height);

            const outputBlob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (result) => {
                        if (result) resolve(result);
                        else reject(new Error('Không xuất được ảnh đã chèn chữ'));
                    },
                    'image/jpeg',
                    0.98
                );
            });

            const randStr = `merci_photo_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            const isToolTab = activeTab === 'tool';
            const originalName = imageName || (typeof imageOrUrl === 'object' ? imageOrUrl?.name : 'image');
            const targetName = isToolTab ? `${getFileNameWithoutExt(originalName)}_merci_studio.jpg` : `${randStr}.jpg`;
            downloadBlob(
                outputBlob,
                targetName
            );
        } catch (error) {
            console.error('Watermark download error:', error);
            alert('Ảnh này chưa tải được bản có logo Merci Studio. Hãy kiểm tra quyền chia sẻ Google Drive hoặc thử reload album.');
        } finally {
            setIsLoading(false);
        }
    };

    // === GOOGLE DRIVE HELPER: LẤY TOÀN BỘ ẢNH, KHÔNG BỊ GIỚI HẠN 100 ẢNH ===
    const getAllDriveImages = async (folderId) => {
        if (!GOOGLE_API_KEY) {
            throw new Error("Thiếu Google API Key!");
        }

        const allFiles = [];
        let pageToken = '';

        do {
            const url =
                `https://www.googleapis.com/drive/v3/files` +
                `?q='${folderId}'+in+parents+and+mimeType+contains+'image/'` +
                `&key=${GOOGLE_API_KEY}` +
                `&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webContentLink)` +
                `&pageSize=100` +
                `&orderBy=name` +
                (pageToken ? `&pageToken=${pageToken}` : '');

            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                console.error("Google Drive API Error:", data.error);
                throw new Error(data.error.message || "Lỗi Google Drive API");
            }

            allFiles.push(...(data.files || []));
            pageToken = data.nextPageToken || '';
        } while (pageToken);

        return allFiles;
    };

    // Lấy tên thật của folder Google Drive để hiển thị cho khách thay vì Folder 1, Folder 2...
    const getDriveFolderInfo = async (folderId) => {
        if (!GOOGLE_API_KEY || !folderId) return null;

        const url =
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}` +
            `?key=${GOOGLE_API_KEY}` +
            `&fields=id,name,mimeType`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.warn('Không lấy được tên folder Drive:', folderId, data.error);
            return null;
        }

        return data;
    };

    const enrichDriveFolders = async (folders) => {
        const enriched = await Promise.all((folders || []).map(async (folder, index) => {
            const info = await getDriveFolderInfo(folder.id);
            return {
                ...folder,
                name: info?.name || folder.name || `Folder ${index + 1}`
            };
        }));

        return enriched;
    };

    const getDefaultClientPageTitle = (folders = []) => {
        const cleanFolders = (folders || []).filter(Boolean);

        if (cleanFolders.length === 1) {
            return cleanFolders[0]?.name || 'Album chọn ảnh';
        }

        if (cleanFolders.length > 1) {
            const names = cleanFolders.map(folder => folder?.name).filter(Boolean);
            if (names.length > 0) {
                return `${names.slice(0, 2).join(' + ')}${cleanFolders.length > 2 ? ` +${cleanFolders.length - 2}` : ''}`;
            }
            return `Album chọn ảnh ${cleanFolders.length} folder`;
        }

        return 'Album chọn ảnh';
    };

    const getGroupedPagesByMonth = (pages) => {
        const groups = {};
        (pages || []).forEach(page => {
            const date = new Date(page.createdAt || Date.now());
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            const groupKey = `Tháng ${month}/${year}`;
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(page);
        });
        return groups;
    };

    const getClientPageDisplayTitle = (page) => {
        const savedTitle = (page?.title || '').trim();
        const isOldDefaultTitle = /^Album chọn ảnh/i.test(savedTitle);
        const folders = page?.folders && page.folders.length ? page.folders : [];

        if (savedTitle && !isOldDefaultTitle) return savedTitle;
        if (folders.length > 0) return getDefaultClientPageTitle(folders);
        return savedTitle || 'Album chọn ảnh';
    };

    const safeZipFolderName = (name) => {
        const clean = (name || 'Folder')
            .toString()
            .replace(/[\/:*?"<>|]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
        return clean || 'Folder';
    };

    const dedupeZipFileName = (usedNames, fileName, fallbackName) => {
        const original = (fileName || fallbackName || 'image.jpg').toString();
        const dotIndex = original.lastIndexOf('.');
        const base = dotIndex > 0 ? original.slice(0, dotIndex) : original;
        const ext = dotIndex > 0 ? original.slice(dotIndex) : '.jpg';
        let candidate = original;
        let count = 1;

        while (usedNames.has(candidate.toLowerCase())) {
            candidate = `${base}_${count}${ext}`;
            count += 1;
        }

        usedNames.add(candidate.toLowerCase());
        return candidate;
    };

    // === GOOGLE DRIVE IMAGE HELPERS: LINK ẢNH ỔN ĐỊNH HƠN THUMBNAIL LINK CŨ ===
    const extractDriveFolderId = (input) => {
        let folderId = (input || '').trim();
        if (!folderId) return '';
        if (folderId.includes('folders/')) folderId = folderId.split('folders/')[1].split('?')[0].split('/')[0];
        return folderId;
    };

    const getSubfolders = async (folderId) => {
        if (!GOOGLE_API_KEY || !folderId) return [];
        const url =
            `https://www.googleapis.com/drive/v3/files` +
            `?q='${encodeURIComponent(folderId)}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false` +
            `&key=${GOOGLE_API_KEY}` +
            `&fields=files(id,name,mimeType)` +
            `&pageSize=100` +
            `&orderBy=name`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) {
                console.warn('Không lấy được danh sách thư mục con:', folderId, data.error);
                return [];
            }
            return data.files || [];
        } catch (e) {
            console.error('Lỗi khi getSubfolders:', e);
            return [];
        }
    };

    const getDriveThumbUrl = (fileId, size = 'w1200') => {
        if (!fileId) return DEFAULT_COVER;
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;
    };

    const getDriveDownloadUrl = (fileId) => {
        if (!fileId) return DEFAULT_COVER;
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    };

    const normalizeDriveImage = (f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType || '',
        url: getDriveThumbUrl(f.id, 'w1200'),
        originalUrl: getDriveThumbUrl(f.id, 'w2400'),
        downloadUrl: f.webContentLink || getDriveDownloadUrl(f.id),
        thumbnailUrl: f.thumbnailLink || getDriveThumbUrl(f.id, 'w600')
    });

    const handleImageError = (e, img) => {
        const target = e.currentTarget;
        const fallbackUrl = img?.thumbnailUrl || getDriveThumbUrl(img?.id, 'w600');
        const finalFallback = DEFAULT_COVER;

        if (target.dataset.fallback !== '1' && fallbackUrl && target.src !== fallbackUrl) {
            target.dataset.fallback = '1';
            target.src = fallbackUrl;
            return;
        }

        if (target.dataset.finalFallback !== '1') {
            target.dataset.finalFallback = '1';
            target.src = finalFallback;
        }
    };

    const handleSyncDriveToAlbum = async () => {
        if (!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");

        const currentAlbum = albums.find(a => a.id === activeAlbumId);
        if (!currentAlbum) return alert("Không tìm thấy album hiện tại.");

        const sourceDriveLink = albumDriveLink.trim() || currentAlbum.driveLink || '';
        if (!sourceDriveLink) return alert("Vui lòng dán link thư mục Google Drive!");

        setIsLoading(true);
        setLoadingMessage('Đang reload album từ Google Drive...');

        const folderId = extractDriveFolderId(sourceDriveLink);

        try {
            const files = await getAllDriveImages(folderId);

            if (files.length > 0) {
                const newImgs = files.map(normalizeDriveImage);
                const existingCoverId = (currentAlbum.images || []).find(img => img.url === currentAlbum.coverUrl || img.id === currentAlbum.coverId)?.id;
                const coverStillExists = newImgs.find(img => img.id === existingCoverId);
                const coverImage = coverStillExists || newImgs[0];

                const updated = {
                    ...currentAlbum,
                    // Reload Drive: chỉ giữ đúng các ảnh đang có trong folder Drive hiện tại.
                    // Ảnh đã xóa khỏi folder sẽ bị xóa khỏi album, ảnh mới sẽ được thêm vào.
                    images: newImgs,
                    driveLink: sourceDriveLink,
                    coverUrl: coverImage?.url || DEFAULT_COVER,
                    coverId: coverImage?.id || ''
                };

                await saveAlbumData(updated);
                setAlbumDriveLink(sourceDriveLink);
                setAlbumPage(1);
                alert(`Đã reload thành công ${newImgs.length} ảnh từ Google Drive!`);
            } else {
                const confirmClear = confirm("Thư mục Drive hiện không có ảnh. Bạn có muốn làm trống album này trên web không?");
                if (confirmClear) {
                    await saveAlbumData({
                        ...currentAlbum,
                        images: [],
                        driveLink: sourceDriveLink,
                        coverUrl: DEFAULT_COVER,
                        coverId: ''
                    });
                    setAlbumPage(1);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi khi kết nối Google Drive: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!auth) return alert('Firebase Auth chưa sẵn sàng. Vui lòng thử lại.');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            setShowClientLoginModal(false);
            setClientAuthError('');
        } catch (error) {
            console.error('Google login error:', error);
            alert('Không đăng nhập được Google. Hãy kiểm tra Firebase Authentication đã bật Google provider chưa.');
        }
    };

    const handleClientEmailAuth = async (e) => {
        e.preventDefault();
        setClientAuthError('');

        if (!auth) {
            setClientAuthError('Firebase Auth chưa sẵn sàng. Vui lòng thử lại.');
            return;
        }

        const email = clientAuthData.email.trim().toLowerCase();
        const password = clientAuthData.password;

        if (!email || !password) {
            setClientAuthError('Vui lòng nhập email và mật khẩu.');
            return;
        }

        if (password.length < 6) {
            setClientAuthError('Mật khẩu cần tối thiểu 6 ký tự.');
            return;
        }

        try {
            if (clientAuthMode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            setShowClientLoginModal(false);
            setClientAuthData({ email: '', password: '' });
        } catch (error) {
            console.error('Client auth error:', error);
            const code = error?.code || '';
            if (code.includes('email-already-in-use')) setClientAuthError('Email này đã có tài khoản. Hãy bấm Đăng nhập.');
            else if (code.includes('user-not-found') || code.includes('invalid-credential') || code.includes('wrong-password')) setClientAuthError('Email hoặc mật khẩu chưa đúng.');
            else if (code.includes('operation-not-allowed')) setClientAuthError('Firebase chưa bật phương thức Email/Password hoặc Google.');
            else setClientAuthError('Không đăng nhập/đăng ký được. Vui lòng thử lại.');
        }
    };

    const openClientAuth = (mode = 'login') => {
        setClientAuthMode(mode);
        setClientAuthError('');
        setShowClientLoginModal(true);
    };

    const loadSavedClientPages = useCallback(async () => {
        if (!db || !user?.uid) {
            setSavedClientPages([]);
            return;
        }
        try {
            const q = query(collection(db, 'client_pages'), where('ownerUid', '==', user.uid));
            const snap = await getDocs(q);
            const pages = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            const enrichedPages = await Promise.all(pages.map(async (page) => {
                if (page.folders && page.folders.length) return page;

                const folderIds = (page.folderIds && page.folderIds.length ? page.folderIds : [page.folderId]).filter(Boolean);
                if (!folderIds.length) return page;

                try {
                    const folders = await enrichDriveFolders(folderIds.map(id => ({ id, source: id })));
                    const oldDefaultTitle = /^Album chọn ảnh/i.test((page.title || '').trim());
                    const nextPage = { ...page, folders };

                    if (oldDefaultTitle && folders.length === 1 && folders[0]?.name) {
                        nextPage.title = folders[0].name;
                    }

                    return nextPage;
                } catch (error) {
                    console.warn('Không lấy được tên folder cho link đã lưu:', page.id, error);
                    return page;
                }
            }));

            setSavedClientPages(enrichedPages);
        } catch (error) {
            console.warn('Load client pages skipped or blocked by Firestore Rules:', error);
            setSavedClientPages([]);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadSavedClientPages();
    }, [loadSavedClientPages]);

    const handleRenameClientPage = async (page) => {
        if (!db || !user?.uid || !page?.id) return;

        const currentTitle = getClientPageDisplayTitle(page);
        const nextTitle = prompt('Nhập tên dễ nhớ cho link chọn ảnh:', currentTitle);

        if (nextTitle === null) return;

        const cleanTitle = nextTitle.trim();
        if (!cleanTitle) return alert('Tên link không được để trống.');

        try {
            await updateDoc(doc(db, 'client_pages', page.id), {
                title: cleanTitle,
                updatedAt: Date.now()
            });

            setSavedClientPages(prev => prev.map(item => (
                item.id === page.id ? { ...item, title: cleanTitle, updatedAt: Date.now() } : item
            )));
        } catch (error) {
            console.error('Rename client page error:', error);
            alert('Không đổi được tên link. Hãy kiểm tra quyền Firestore hoặc đăng nhập lại.');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        if (!auth) {
            setLoginError('Firebase Auth chưa sẵn sàng. Vui lòng thử lại.');
            return;
        }

        const email = loginData.email.trim().toLowerCase();
        const password = loginData.password;

        if (!email || !password) {
            setLoginError('Vui lòng nhập email và mật khẩu.');
            return;
        }

        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            const loggedInEmail = credential.user?.email?.toLowerCase() || '';

            if (!ADMIN_EMAILS.includes(loggedInEmail)) {
                await signOut(auth);
                setIsAdmin(false);
                setLoginError('Email này không có quyền Admin.');
                return;
            }

            setIsAdmin(true);
            setShowLoginModal(false);
            setLoginData({ email: '', password: '' });
        } catch (error) {
            console.error('Admin login error:', error);
            setLoginError('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được bật trong Firebase Auth.');
        }
    };

    const handleLogout = async () => {
        setIsAdmin(false);
        setShowLoginModal(false);

        if (auth) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
    };

    const handleClientLogout = async () => {
        setShowClientLoginModal(false);
        setSavedClientPages([]);
        if (auth) {
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Client logout error:', error);
            }
        }
    };

    // === CLIENT GALLERY HELPERS ===
    const getOrInitGuestId = () => {
        if (typeof window === 'undefined') return '';
        let guestId = localStorage.getItem('merci_guest_id');
        if (!guestId) {
            guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('merci_guest_id', guestId);
        }
        return guestId;
    };

    const fetchAllSelectionsForFolder = async (folderId) => {
        if (!db || !folderId) return;
        try {
            const q = query(collection(db, 'client_selections'), where('folderId', '==', folderId));
            const querySnapshot = await getDocs(q);
            const list = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setAllSelections(list);
        } catch (e) {
            console.error('Error fetching all selections:', e);
        }
    };

    const saveClientSelectionToDB = async (folderId, newSelectedSet, currentNotes = imageNotes) => {
        if (!folderId) return;
        setIsSaving(true);
        setSaveError('');

        // Save to localStorage immediately as a fallback
        try {
            const localData = {
                selectedIds: Array.from(newSelectedSet),
                imageNotes: currentNotes,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(`merci_selection_${folderId}`, JSON.stringify(localData));
        } catch (localErr) {
            console.error('Error saving to localStorage:', localErr);
        }

        if (db) {
            try {
                let userKey = '';
                let userEmail = '';
                let userName = '';
                let userType = 'guest';

                if (user) {
                    userEmail = user.email || '';
                    userKey = user.email || '';
                    userName = user.email || '';
                    userType = 'gmail';
                } else {
                    const guestId = getOrInitGuestId();
                    userKey = guestId;
                    const shortId = guestId.substring(guestId.length - 4);
                    userName = `Khách vãng lai (${shortId})`;
                    userType = 'guest';
                }

                const docId = `${folderId}_${userKey}`;

                await setDoc(doc(db, 'client_selections', docId), {
                    folderId: folderId,
                    userKey: userKey,
                    userEmail: userEmail,
                    userName: userName,
                    userType: userType,
                    selectedIds: Array.from(newSelectedSet),
                    imageNotes: currentNotes,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                // Refresh the allSelections list to immediately reflect current user's selections
                fetchAllSelectionsForFolder(folderId);
            } catch (e) {
                console.error('Error saving client selection:', e);
                setSaveError(e.message || 'Lỗi phân quyền Firestore');
            }
        }
        setTimeout(() => setIsSaving(false), 500);
    };

    const loadClientSelectionFromDB = async (folderId) => {
        let selectedSet = new Set();
        let notes = {};

        // 1. Try to load from localStorage first
        try {
            const localRaw = localStorage.getItem(`merci_selection_${folderId}`);
            if (localRaw) {
                const localData = JSON.parse(localRaw);
                selectedSet = new Set(localData.selectedIds || []);
                notes = localData.imageNotes || {};
            }
        } catch (e) {
            console.warn('Error reading from localStorage:', e);
        }

        // 2. Try to load from Firestore and merge if available
        if (db && folderId) {
            try {
                let userKey = '';
                if (user) {
                    userKey = user.email || '';
                } else {
                    userKey = getOrInitGuestId();
                }

                const docId = `${folderId}_${userKey}`;
                const docSnap = await getDoc(doc(db, 'client_selections', docId));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const dbSelectedIds = data.selectedIds || [];
                    const dbNotes = data.imageNotes || {};
                    if (dbSelectedIds.length > 0 || Object.keys(dbNotes).length > 0) {
                        selectedSet = new Set(dbSelectedIds);
                        notes = dbNotes;
                    }
                }
            } catch (e) {
                console.warn('Error reading from Firestore selection:', e);
            }

            // Load all selections to populate filter options in UI
            await fetchAllSelectionsForFolder(folderId);
        }

        // 3. Merge/override with URL parameter selected (takes priority for shared links)
        try {
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const selectedParam = urlParams.get('selected');
                if (selectedParam) {
                    const urlIds = selectedParam.split(',').map(decodeURIComponent);
                    if (urlIds.length > 0) {
                        selectedSet = new Set(urlIds);
                    }
                }
            }
        } catch (e) {
            console.warn('Error reading selection from URL:', e);
        }

        return { selectedSet, notes };
    };

    const getDriveFolderInputs = (input) => {
        const lines = (input || '')
            .split(/[\r\n,]+/)
            .map(item => item.trim())
            .filter(Boolean);

        const unique = [];
        const seen = new Set();

        lines.forEach((line, index) => {
            const folderId = extractDriveFolderId(line);
            if (!folderId || seen.has(folderId)) return;
            seen.add(folderId);
            unique.push({
                id: folderId,
                name: `Folder ${unique.length + 1}`,
                source: line
            });
        });

        return unique;
    };

    const getClientPageKey = (folders) => {
        const ids = (folders || []).map(f => f.id || f).filter(Boolean);
        return ids.length <= 1 ? (ids[0] || '') : `multi_${ids.join('_')}`;
    };

    const buildClientPageLink = (folders, viewMode = '', selectedSet = null) => {
        const origin = window.location.origin;
        const ids = (folders || []).map(f => f.id || f).filter(Boolean);
        
        let selectedQuery = '';
        if (selectedSet && selectedSet.size > 0) {
            selectedQuery = `&selected=${Array.from(selectedSet).map(id => encodeURIComponent(id)).join(',')}`;
        }

        if (ids.length <= 1) return `${origin}?folder=${ids[0] || ''}${viewMode ? `&view=${viewMode}` : ''}${selectedQuery}`;
        return `${origin}?folders=${ids.map(id => encodeURIComponent(id)).join(',')}${viewMode ? `&view=${viewMode}` : ''}${selectedQuery}`;
    };

    const loadDriveFolderImages = async (folderId, options = { silent: false }) => {
        if (!folderId) return [];

        // Check state cache first
        if (cachedFolderImages[folderId]) {
            setCurrentFolderId(folderId);
            setActiveClientFolderId(folderId);
            setLoadedImages(cachedFolderImages[folderId]);
            setGalleryPage(1);
            return cachedFolderImages[folderId];
        }

        if (!options?.silent) {
            setIsLoading(true);
            setLoadingMessage('Đang lấy dữ liệu folder...');
        }

        try {
            const files = await getAllDriveImages(folderId);
            const imgs = files.map(normalizeDriveImage);
            setCurrentFolderId(folderId);
            setActiveClientFolderId(folderId);
            setLoadedImages(imgs);
            setGalleryPage(1);
            
            // Save to cache state
            setCachedFolderImages(prev => ({ ...prev, [folderId]: imgs }));
            
            // Silently save back to Firestore cache
            if (currentSelectionKey) {
                setDoc(doc(db, 'client_pages', currentSelectionKey), {
                    folderImages: {
                        ...cachedFolderImages,
                        [folderId]: imgs
                    }
                }, { merge: true }).catch(err => console.error("Lỗi khi lưu cache folderImages:", err));
            }
            
            return imgs;
        } finally {
            if (!options?.silent) setIsLoading(false);
        }
    };

    const handleSwitchClientFolder = async (folderId) => {
        if (!folderId || folderId === activeClientFolderId) return;
        try {
            await loadDriveFolderImages(folderId);
        } catch (e) {
            console.error(e);
            alert('Không tải được folder này: ' + e.message);
        }
    };

    const fetchDrive = async (id, options = { savePage: false }) => {
        if (!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");
        if (!id || !id.trim()) return alert("Vui lòng dán ít nhất 1 link thư mục Google Drive!");

        const rawFolders = getDriveFolderInputs(id);
        if (rawFolders.length === 0) return alert("Không nhận diện được folder Google Drive. Hãy dán link folder, mỗi dòng 1 folder con.");

        const tempIds = rawFolders.map(rf => rf.id).filter(Boolean);
        const pageKey = tempIds.length <= 1 ? (tempIds[0] || '') : `multi_${tempIds.join('_')}`;

        setIsLoading(true);
        setLoadingMessage('Đang tải dữ liệu trang...');

        try {
            // Check Firestore Cache
            const pageDoc = await getDoc(doc(db, 'client_pages', pageKey));
            if (pageDoc.exists()) {
                const pageData = pageDoc.data();
                if (pageData.folders && pageData.folders.length > 0) {
                    const cachedFolders = pageData.folders;
                    setClientFolders(cachedFolders);
                    setCurrentSelectionKey(pageKey);
                    
                    const activeId = activeClientFolderId || cachedFolders[0].id;
                    setCurrentFolderId(activeId);
                    setActiveClientFolderId(activeId);
                    
                    const cachedImagesMap = pageData.folderImages || {};
                    setCachedFolderImages(cachedImagesMap);
                    
                    const cachedImages = cachedImagesMap[activeId] || [];
                    if (cachedImages.length > 0) {
                        setLoadedImages(cachedImages);
                    } else {
                        // Fallback silently if cache is empty
                        const files = await getAllDriveImages(activeId);
                        const imgs = files.map(normalizeDriveImage);
                        setLoadedImages(imgs);
                        
                        const updatedFolderImages = {
                            ...cachedImagesMap,
                            [activeId]: imgs
                        };
                        setCachedFolderImages(updatedFolderImages);
                        await setDoc(doc(db, 'client_pages', pageKey), { folderImages: updatedFolderImages }, { merge: true });
                    }

                    const newClientLink = buildClientPageLink(cachedFolders);
                    setClientLink(newClientLink);

                    const { selectedSet, notes } = await loadClientSelectionFromDB(pageKey);
                    setSelectedImages(selectedSet);
                    setImageNotes(notes);
                    
                    setIsLoading(false);
                    return; // Loaded from cache successfully!
                }
            }
        } catch (e) {
            console.warn("Lỗi khi tải cache từ Firestore, chuyển sang tải trực tiếp từ Drive:", e);
        }

        // Proceed with direct Drive fetch
        setLoadingMessage(rawFolders.length > 1 ? 'Đang lấy tên folder Drive và tạo trang...' : 'Đang lấy toàn bộ dữ liệu album...');

        try {
            let foldersToEnrich = [];
            for (const rf of rawFolders) {
                let directFiles = [];
                try {
                    directFiles = await getAllDriveImages(rf.id);
                } catch (e) {
                    console.warn('Không lấy được ảnh trực tiếp cho folder:', rf.id, e);
                }

                if (directFiles.length === 0) {
                    try {
                        const subs = await getSubfolders(rf.id);
                        if (subs.length > 0) {
                            subs.forEach(sub => {
                                foldersToEnrich.push({
                                    id: sub.id,
                                    name: sub.name,
                                    source: `https://drive.google.com/drive/folders/${sub.id}`
                                });
                            });
                            continue;
                        }
                    } catch (e) {
                        console.warn('Không lấy được thư mục con cho folder:', rf.id, e);
                    }
                }
                foldersToEnrich.push(rf);
            }

            if (foldersToEnrich.length === 0) {
                foldersToEnrich = rawFolders;
            }

            const folders = await enrichDriveFolders(foldersToEnrich);
            const finalPageKey = getClientPageKey(folders);

            // Check if finalPageKey exists in Firestore cache (useful if pageKey was parent folder ID or different)
            if (finalPageKey && finalPageKey !== pageKey) {
                try {
                    const finalPageDoc = await getDoc(doc(db, 'client_pages', finalPageKey));
                    if (finalPageDoc.exists()) {
                        const pageData = finalPageDoc.data();
                        if (pageData.folders && pageData.folders.length > 0) {
                            const cachedFolders = pageData.folders;
                            setClientFolders(cachedFolders);
                            setCurrentSelectionKey(finalPageKey);
                            
                            const activeId = activeClientFolderId || cachedFolders[0].id;
                            setCurrentFolderId(activeId);
                            setActiveClientFolderId(activeId);
                            
                            const cachedImagesMap = pageData.folderImages || {};
                            setCachedFolderImages(cachedImagesMap);
                            
                            const cachedImages = cachedImagesMap[activeId] || [];
                            if (cachedImages.length > 0) {
                                setLoadedImages(cachedImages);
                            } else {
                                const files = await getAllDriveImages(activeId);
                                const imgs = files.map(normalizeDriveImage);
                                setLoadedImages(imgs);
                                
                                const updatedFolderImages = {
                                    ...cachedImagesMap,
                                    [activeId]: imgs
                                };
                                setCachedFolderImages(updatedFolderImages);
                                await setDoc(doc(db, 'client_pages', finalPageKey), { folderImages: updatedFolderImages }, { merge: true });
                            }

                            const newClientLink = buildClientPageLink(cachedFolders);
                            setClientLink(newClientLink);

                            const { selectedSet, notes } = await loadClientSelectionFromDB(finalPageKey);
                            setSelectedImages(selectedSet);
                            setImageNotes(notes);
                            
                            setIsLoading(false);
                            return; // Loaded from cache successfully!
                        }
                    }
                } catch (e) {
                    console.warn("Lỗi khi tải cache phụ từ Firestore:", e);
                }
            }

            setClientFolders(folders);
            setCurrentSelectionKey(finalPageKey);
            setCurrentFolderId(folders[0].id);
            setActiveClientFolderId(folders[0].id);

            const firstFiles = await getAllDriveImages(folders[0].id);

            if (firstFiles.length > 0 || folders.length > 1) {
                const firstImgs = firstFiles.map(normalizeDriveImage);
                setLoadedImages(firstImgs);

                const newClientLink = buildClientPageLink(folders);
                setClientLink(newClientLink);

                // Prepare cached images map
                const folderImages = {
                    [folders[0].id]: firstImgs
                };
                setCachedFolderImages(folderImages);

                if (options?.savePage && user?.uid) {
                    let totalImageCount = firstFiles.length;

                    if (folders.length > 1) {
                        const counts = await Promise.all(
                            folders.slice(1).map(async (folder) => {
                                try {
                                    const files = await getAllDriveImages(folder.id);
                                    folderImages[folder.id] = files.map(normalizeDriveImage);
                                    return files.length;
                                } catch (e) {
                                    console.warn('Không đếm được folder:', folder.id, e);
                                    return 0;
                                }
                            })
                        );
                        totalImageCount += counts.reduce((sum, count) => sum + count, 0);
                    }

                    await setDoc(doc(db, 'client_pages', finalPageKey), {
                        folderId: folders[0].id,
                        folderIds: folders.map(f => f.id),
                        folders,
                        folderImages, // Save images in document cache!
                        link: newClientLink,
                        ownerUid: user.uid,
                        ownerEmail: user.email || '',
                        title: getDefaultClientPageTitle(folders),
                        imageCount: totalImageCount,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }, { merge: true });
                    loadSavedClientPages();
                } else {
                    // Pre-cache other folders in state
                    if (folders.length > 1) {
                        await Promise.all(
                            folders.slice(1).map(async (folder) => {
                                try {
                                    const files = await getAllDriveImages(folder.id);
                                    folderImages[folder.id] = files.map(normalizeDriveImage);
                                } catch (e) {
                                    console.warn('Không tải được folder con:', folder.id, e);
                                }
                            })
                        );
                        setCachedFolderImages(folderImages);
                    }
                }

                const { selectedSet, notes } = await loadClientSelectionFromDB(finalPageKey);
                setSelectedImages(selectedSet);
                setImageNotes(notes);

                if (firstFiles.length === 0) {
                    alert("Folder đầu tiên không có ảnh. Bạn có thể chuyển sang folder con khác trong phần Chọn ảnh.");
                }
            } else {
                setLoadedImages([]);
                alert("Thư mục không có ảnh hoặc chưa bật quyền chia sẻ: Bất kỳ ai có liên kết.");
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi khi kết nối Google Drive: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshClientPage = async () => {
        if (!currentSelectionKey) return alert("Không tìm thấy thông tin trang để làm mới.");

        setIsLoading(true);
        setLoadingMessage('Đang đồng bộ dữ liệu từ Google Drive...');

        try {
            const activeId = activeClientFolderId || clientFolders[0]?.id;
            if (!activeId) throw new Error("Không xác định được thư mục cần làm mới.");

            const files = await getAllDriveImages(activeId);
            const imgs = files.map(normalizeDriveImage);

            setLoadedImages(imgs);
            
            const nextCached = {
                ...cachedFolderImages,
                [activeId]: imgs
            };
            setCachedFolderImages(nextCached);

            await setDoc(doc(db, 'client_pages', currentSelectionKey), {
                folderImages: nextCached,
                updatedAt: Date.now()
            }, { merge: true });

            alert("Đã đồng bộ hình ảnh mới nhất từ Google Drive!");
        } catch (e) {
            console.error(e);
            alert("Lỗi khi đồng bộ dữ liệu: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleImageSelect = (id, event) => {
        if (event) event.stopPropagation();
        if (selectedFilter !== 'mine') {
            alert("Bạn chỉ có thể thả tim trên danh sách 'Cá nhân (Của bạn)'. Vui lòng chuyển bộ lọc về 'Cá nhân' để thay đổi lựa chọn.");
            return;
        }
        setSelectedImages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            if (currentSelectionKey || currentFolderId) saveClientSelectionToDB(currentSelectionKey || currentFolderId, newSet);
            return newSet;
        });
    };

    const handleSaveNote = async (imgId, noteText) => {
        if (selectedFilter !== 'mine') {
            alert("Bạn chỉ có thể viết ghi chú trên danh sách 'Cá nhân (Của bạn)'. Vui lòng chuyển bộ lọc về 'Cá nhân' để thay đổi ghi chú.");
            return;
        }
        const nextNotes = { ...imageNotes, [imgId]: noteText };
        setImageNotes(nextNotes);
        if (currentSelectionKey || currentFolderId) {
            await saveClientSelectionToDB(currentSelectionKey || currentFolderId, selectedImages, nextNotes);
        }
    };

    const openImageNoteModal = (img) => {
        setNoteModalData({
            isOpen: true,
            img,
            noteText: effectiveImageNotes[img.id] || ''
        });
    };

    const generateSelectedImagesLink = () => {
        if (!currentFolderId) return;
        const foldersForLink = clientFolders.length > 0 ? clientFolders : [{ id: currentFolderId, name: 'Folder 1' }];
        const newLink = buildClientPageLink(foldersForLink, 'selected', selectedImages);

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(newLink).then(() => alert("Đã copy link! Bạn có thể gửi link này cho Studio để chốt ảnh."));
        } else {
            prompt("Copy đường link sau để chia sẻ:", newLink);
        }
    };

    // Tải ZIP ở phần Chọn ảnh: giữ file gốc Google Drive, KHÔNG đóng dấu watermark
    const getOriginalDriveFileSources = (img) => {
        const sources = [
            img?.id ? buildDriveMediaUrl(img.id) : '',
            img?.downloadUrl,
            img?.id ? getDriveDownloadUrl(img.id) : '',
            img?.originalUrl,
            img?.url
        ].filter(Boolean);

        return Array.from(new Set(sources));
    };

    const fetchOriginalDriveFileBlob = async (img) => {
        const sources = getOriginalDriveFileSources(img);
        let lastError = null;

        for (const src of sources) {
            try {
                const res = await fetch(src, { mode: 'cors', cache: 'no-store' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const blob = await res.blob();
                if (!blob || blob.size === 0) throw new Error('File rỗng');

                return blob;
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError || new Error('Không tải được file gốc từ Google Drive');
    };

    // Tải từng ảnh ở phần Chọn ảnh: tải file gốc Google Drive, KHÔNG watermark
    const handleDownloadOriginalImage = async (img, event) => {
        event?.stopPropagation?.();
        if (!img) return;

        try {
            // Tải trực tiếp từ Google Drive bằng cách mở link tải trong tab mới để tiết kiệm tối đa băng thông cho Vercel.
            const downloadUrl = img.downloadUrl || getDriveDownloadUrl(img.id);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Single original download error:', error);
            alert('Không tải được file gốc từ Google Drive. Hãy kiểm tra thư mục đã bật quyền: Bất kỳ ai có liên kết đều có thể xem.');
        }
    };

    const handleDownloadSelected = async () => {
        if (effectiveSelectedImages.size === 0) return alert("Không có ảnh nào được chọn trong bộ lọc hiện tại!");
        if (!window.JSZip) return alert("Thư viện nén file chưa sẵn sàng, vui lòng thử lại sau vài giây.");

        setIsLoading(true);
        setLoadingMessage('Đang tải file gốc từ Google Drive và nén ZIP...');
        try {
            const JSZip = window.JSZip;
            const zip = new JSZip();
            const folderName = "Merci_Album_Da_Chon_" + new Date().toISOString().slice(0, 10);
            const imgFolder = zip.folder(folderName);
            const selectedIds = Array.from(effectiveSelectedImages);
            const selectedIdSet = effectiveSelectedImages;
            const allFolders = clientFolders.length > 0 ? clientFolders : [{ id: currentFolderId, name: 'Ảnh đã chọn' }];
            let downloadedCount = 0;
            const usedNames = new Set();

            for (const folder of allFolders) {
                if (!folder?.id) continue;
                setLoadingMessage(`Đang tìm ảnh đã chọn trong ${folder.name || 'folder'}...`);
                const folderImages = folder.id === activeClientFolderId && loadedImages.length > 0
                    ? loadedImages
                    : (await getAllDriveImages(folder.id)).map(normalizeDriveImage);

                for (const img of folderImages) {
                    if (!selectedIdSet.has(img.id)) continue;
                    downloadedCount += 1;
                    setLoadingMessage(`Đang tải file gốc đã chọn ${downloadedCount}/${selectedIds.length}...`);
                    const originalBlob = await fetchOriginalDriveFileBlob(img);
                    const ext = img.name?.slice(img.name.lastIndexOf('.')) || '.jpg';
                    const randStr = `merci_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    const targetName = (activeTab === 'tool') ? img.name : `${randStr}${ext}`;
                    const fileName = dedupeZipFileName(usedNames, targetName, `image_${downloadedCount}.jpg`);
                    imgFolder?.file(fileName, originalBlob);
                }
            }

            if (downloadedCount === 0) {
                alert('Không tìm thấy ảnh đã chọn trong các folder hiện tại. Hãy thử tải lại link chọn ảnh.');
                return;
            }

            setLoadingMessage('Đang nén file ZIP gốc...');
            const content = await zip.generateAsync({ type: "blob" });
            const objectUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = folderName + "_file_goc.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            console.error('ZIP original download error:', error);
            alert("Đã xảy ra lỗi khi tải file gốc / gom file ZIP. Hãy kiểm tra quyền chia sẻ Google Drive rồi thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    // Tải toàn bộ ảnh trong tất cả folder con của link chọn ảnh: file gốc Google Drive, KHÔNG watermark
    const handleDownloadAllOriginal = async () => {
        if (!window.JSZip) return alert("Thư viện nén file chưa sẵn sàng, vui lòng thử lại sau vài giây.");

        const allFolders = clientFolders.length > 0 ? clientFolders : [{ id: currentFolderId, name: 'Tat ca anh' }];
        if (!allFolders.some(folder => folder?.id)) return alert('Chưa có folder Google Drive để tải.');

        setIsLoading(true);
        setLoadingMessage('Đang chuẩn bị tải toàn bộ ảnh gốc...');

        try {
            const JSZip = window.JSZip;
            const zip = new JSZip();
            const rootName = "Merci_Toan_Bo_Anh_" + new Date().toISOString().slice(0, 10);
            const rootFolder = zip.folder(rootName);
            let totalDownloaded = 0;

            for (let folderIndex = 0; folderIndex < allFolders.length; folderIndex++) {
                const folder = allFolders[folderIndex];
                if (!folder?.id) continue;

                const folderName = safeZipFolderName(folder.name || `Folder ${folderIndex + 1}`);
                setLoadingMessage(`Đang lấy danh sách ảnh: ${folderName}...`);
                const folderImages = folder.id === activeClientFolderId && loadedImages.length > 0
                    ? loadedImages
                    : (await getAllDriveImages(folder.id)).map(normalizeDriveImage);

                const targetFolder = allFolders.length > 1 ? rootFolder?.folder(folderName) : rootFolder;
                const usedNames = new Set();

                for (let index = 0; index < folderImages.length; index++) {
                    const img = folderImages[index];
                    setLoadingMessage(`Đang tải ${folderName}: ${index + 1}/${folderImages.length} ảnh gốc...`);
                    const originalBlob = await fetchOriginalDriveFileBlob(img);
                    const ext = img.name?.slice(img.name.lastIndexOf('.')) || '.jpg';
                    const randStr = `merci_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    const targetName = (activeTab === 'tool') ? img.name : `${randStr}${ext}`;
                    const fileName = dedupeZipFileName(usedNames, targetName, `image_${index + 1}.jpg`);
                    targetFolder?.file(fileName, originalBlob);
                    totalDownloaded += 1;
                }
            }

            if (totalDownloaded === 0) {
                alert('Không có ảnh nào để tải trong các folder hiện tại.');
                return;
            }

            setLoadingMessage(`Đang nén ${totalDownloaded} ảnh gốc thành file ZIP...`);
            const content = await zip.generateAsync({ type: "blob" });
            const objectUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = rootName + "_file_goc.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) {
            console.error('ZIP all original download error:', error);
            alert("Đã xảy ra lỗi khi tải toàn bộ ảnh gốc. Hãy kiểm tra quyền chia sẻ Google Drive rồi thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    const selectSourceFolder = async () => {
        try {
            if (window.showDirectoryPicker) {
                setSourceHandle(await window.showDirectoryPicker());
            } else {
                alert("Trình duyệt của bạn không hỗ trợ tính năng chọn thư mục.");
            }
        } catch (e) { }
    };

    const selectDestFolder = async () => {
        try {
            if (window.showDirectoryPicker) {
                setDestHandle(await window.showDirectoryPicker());
            } else {
                alert("Trình duyệt của bạn không hỗ trợ tính năng chọn thư mục.");
            }
        } catch (e) { }
    };

    const handleCopyFiles = async () => {
        if (!sourceHandle || !destHandle) return alert("Vui lòng chọn đủ thư mục nguồn và đích!");
        if (!filterText.trim()) return alert("Vui lòng dán danh sách tên file!");

        setIsLoading(true); setLoadingMessage('Đang xử lý lọc và chép ảnh...'); setFilterLogs([]);
        const names = filterText.split(/[\r\n,]+/).map(n => n.trim().toLowerCase()).filter(Boolean);
        const baseNames = filterText.split(/[\r\n,]+/).map(n => n.trim().replace(/\.[^/.]+$/, "").toLowerCase()).filter(Boolean);

        const targetExt = filterTargetExt === 'custom' 
            ? filterCustomExt.trim().toLowerCase() 
            : filterTargetExt.toLowerCase();

        let count = 0;

        try {
            for await (const entry of sourceHandle.values()) {
                if (entry.kind === 'file') {
                    const fileName = entry.name.toLowerCase();
                    const nameNoExt = entry.name.replace(/\.[^/.]+$/, "").toLowerCase();
                    const fileExt = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase() : '';

                    if (filterTargetExt === 'original') {
                        if (names.includes(fileName) || baseNames.includes(nameNoExt)) {
                            const file = await entry.getFile();
                            const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
                            const writable = await newFileHandle.createWritable();
                            await writable.write(file); await writable.close();
                            count++;
                            setFilterLogs(prev => [...prev, `✅ Đã chép: ${entry.name}`]);
                        }
                    } else {
                        const targetExtClean = targetExt.startsWith('.') ? targetExt.slice(1) : targetExt;
                        if (baseNames.includes(nameNoExt) && fileExt === targetExtClean) {
                            const file = await entry.getFile();
                            const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
                            const writable = await newFileHandle.createWritable();
                            await writable.write(file); await writable.close();
                            count++;
                            setFilterLogs(prev => [...prev, `✅ Đã chép: ${entry.name}`]);
                        }
                    }
                }
            }
            alert(`Hoàn thành! Đã chép ${count} ảnh.`);
        } catch (e) { 
            console.error(e);
            alert("Lỗi chép file. Hãy kiểm tra quyền truy cập thư mục."); 
        } finally { 
            setIsLoading(false); 
        }
    };

    const currentViewAlbum = albums.find(a => a.id === activeAlbumId);
    const albumCategoryFilters = ['Tất cả', ...Array.from(new Set([
        ...ALBUM_CATEGORIES.filter(c => c !== 'Tất cả'),
        ...albums.map(a => getAlbumMainCategory(a, '')).filter(Boolean)
    ]))];
    const albumHashtagFilters = Array.from(new Set(
        albums.flatMap(a => getAlbumHashtags(a)).filter(Boolean)
    ));
    const filteredAlbums = albums.filter(a =>
        albumMatchesCategory(a, activeCategory) &&
        albumMatchesHashtagQuery(a, albumHashtagQuery)
    );
    const effectiveSelectedImages = (() => {
        if (selectedFilter === 'mine') return selectedImages;
        if (selectedFilter === 'all') {
            const merged = new Set();
            allSelections.forEach(sel => {
                if (sel.selectedIds) sel.selectedIds.forEach(id => merged.add(id));
            });
            selectedImages.forEach(id => merged.add(id));
            return merged;
        }
        const found = allSelections.find(sel => sel.userKey === selectedFilter);
        return found && found.selectedIds ? new Set(found.selectedIds) : new Set();
    })();

    const effectiveImageNotes = (() => {
        if (selectedFilter === 'mine') return imageNotes;
        if (selectedFilter === 'all') {
            const merged = { ...imageNotes };
            allSelections.forEach(sel => {
                if (sel.imageNotes) Object.assign(merged, sel.imageNotes);
            });
            return merged;
        }
        const found = allSelections.find(sel => sel.userKey === selectedFilter);
        return found && found.imageNotes ? found.imageNotes : {};
    })();

    const displayedImages = showOnlySelected ? loadedImages.filter(img => effectiveSelectedImages.has(img.id)) : loadedImages;
    const currentViewBlog = blogs.find(b => b.id === activeBlogId);

    const IMAGES_PER_PAGE = 50;

    const albumImages = currentViewAlbum?.images || [];
    const albumTotalPages = Math.max(1, Math.ceil(albumImages.length / IMAGES_PER_PAGE));
    const safeAlbumPage = Math.min(Math.max(albumPage, 1), albumTotalPages);
    const albumStartIndex = (safeAlbumPage - 1) * IMAGES_PER_PAGE;
    const paginatedAlbumImages = albumImages.slice(albumStartIndex, albumStartIndex + IMAGES_PER_PAGE);

    const galleryTotalPages = Math.max(1, Math.ceil(displayedImages.length / IMAGES_PER_PAGE));
    const safeGalleryPage = Math.min(Math.max(galleryPage, 1), galleryTotalPages);
    const galleryStartIndex = (safeGalleryPage - 1) * IMAGES_PER_PAGE;
    const paginatedDisplayedImages = displayedImages.slice(galleryStartIndex, galleryStartIndex + IMAGES_PER_PAGE);

    useEffect(() => {
        setAlbumPage(1);
    }, [activeAlbumId, albumImages.length]);

    useEffect(() => {
        setGalleryPage(1);
    }, [currentFolderId, showOnlySelected, loadedImages.length]);

    useEffect(() => {
        setSelectedFilter('mine');
    }, [currentSelectionKey]);

    const getPageNumbers = (currentPage, totalPages) => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

        const pages = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        if (start > 2) pages.push('...');
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);

        return pages;
    };

    const getRouteForTab = (tabId, toolTab = activeToolTab) => {
        const routes = {
            home: '/',
            collection: '/bo-su-tap',
            blog: '/blog',
            videos: '/video',
            tool: '/tool',
            booking: '/dat-lich',
            dashboard: '/thong-ke',
            promotion: '/khuyen-mai'
        };
        if (tabId === 'tool') {
            if (toolTab === 'create') return '/tao-trang';
            if (toolTab === 'gallery') return '/chon-anh';
            if (toolTab === 'filter') return '/loc-anh';
            return '/tool';
        }
        return routes[tabId] || '/';
    };

    const navigateToTab = (tabId, toolTab = null) => {
        setActiveTab(tabId);
        setActiveAlbumId(null);
        setActiveBlogId(null);
        if (toolTab) setActiveToolTab(toolTab);
        const nextPath = getRouteForTab(tabId, toolTab || activeToolTab);
        window.history.pushState({}, document.title, nextPath);
    };

    const PaginationControls = ({ currentPage, totalPages, totalItems, onPageChange, label }) => {
        if (totalItems <= IMAGES_PER_PAGE) return null;

        const startItem = (currentPage - 1) * IMAGES_PER_PAGE + 1;
        const endItem = Math.min(currentPage * IMAGES_PER_PAGE, totalItems);

        return (
            <div className="flex flex-row items-center justify-between gap-2 bg-white border border-slate-100 rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-sm">
                <div className="text-xs md:text-sm text-slate-500 font-medium">
                    <span className="hidden sm:inline">{label}: </span>
                    <span className="font-bold text-slate-900">{startItem}-{endItem}</span> / {totalItems} <span className="hidden sm:inline">ảnh</span>
                    <span className="ml-1.5 text-blue-600 font-bold">Trang {currentPage}/{totalPages}</span>
                </div>

                <div className="flex items-center justify-center gap-1 flex-wrap">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                        Trước
                    </button>

                    {/* Desktop-only page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                        {getPageNumbers(currentPage, totalPages).map((page, index) => (
                            page === '...' ? (
                                <span key={`dots-${index}`} className="px-2 text-slate-400 font-bold">...</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={`min-w-9 px-3 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border'}`}
                                >
                                    {page}
                                </button>
                            )
                        ))}
                    </div>

                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                        Sau
                    </button>
                </div>
            </div>
        );
    };

    if (!mounted) return <div className="min-h-screen bg-slate-50" />;

    return (
        <div lang="vi" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 transition-opacity duration-500 vi-safe-font">
            <Script strategy="lazyOnload" src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" />
            <style dangerouslySetInnerHTML={{
                __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .vi-safe-font { font-family: Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; font-feature-settings: normal; font-variant-ligatures: normal; word-break: normal; overflow-wrap: anywhere; }
                .blog-content, .blog-content * { font-family: Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important; }
                .masonry-grid { column-count: 2; column-gap: 0.55rem; }
                .masonry-item { break-inside: avoid; -webkit-column-break-inside: avoid; page-break-inside: avoid; display: inline-block; width: 100%; }
                @media (min-width: 640px) { .masonry-grid { column-count: 2; column-gap: 0.75rem; } }
                @media (min-width: 768px) { .masonry-grid { column-count: 3; column-gap: 1rem; } }
                @media (min-width: 1024px) { .masonry-grid { column-count: 4; column-gap: 1.25rem; } }
                @media (min-width: 1280px) { .masonry-grid { column-count: 5; column-gap: 1.35rem; } }
            `}} />

            {isLoading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in">
                    <RefreshCcw className="animate-spin text-blue-600 w-12 h-12 mb-4" />
                    <p className="font-bold text-lg">{loadingMessage || 'Đang xử lý...'}</p>
                </div>
            )}

            {/* Client Login / Register Modal */}
            {showClientLoginModal && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#100d18] text-white p-7 md:p-9 rounded-[2rem] w-full max-w-md shadow-2xl border border-white/10 animate-in zoom-in-95">
                        <div className="flex justify-between items-start mb-7">
                            <div>
                                <h3 className="font-bold text-3xl md:text-4xl font-serif leading-tight">Chào mừng trở lại</h3>
                                <p className="text-slate-300 text-sm md:text-base mt-3 leading-relaxed">Đăng nhập một lần để quản lý trang. Nếu dùng email Admin, hệ thống sẽ tự mở quyền quản trị.</p>
                            </div>
                            <button onClick={() => setShowClientLoginModal(false)} className="text-slate-300 hover:text-white p-1"><X /></button>
                        </div>

                        <button onClick={handleGoogleLogin} className="w-full border border-white/15 hover:border-white/40 rounded-2xl py-3.5 font-bold text-lg flex items-center justify-center gap-3 transition-all bg-transparent hover:bg-white/5">
                            <span className="text-2xl font-black text-blue-400">G</span> Tiếp tục với Google
                        </button>

                        <div className="flex items-center gap-4 my-6 text-xs text-slate-400 uppercase tracking-widest">
                            <div className="h-px bg-white/10 flex-1"></div>
                            <span>Hoặc tiếp tục với Email</span>
                            <div className="h-px bg-white/10 flex-1"></div>
                        </div>

                        <form onSubmit={handleClientEmailAuth} className="space-y-5">
                            {clientAuthError && <p className="text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-sm font-medium">{clientAuthError}</p>}
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Email hoặc tên đăng nhập</label>
                                <input
                                    type="email"
                                    placeholder="ban@vidu.com"
                                    className="w-full bg-transparent border border-white/15 p-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors text-white placeholder:text-slate-500"
                                    value={clientAuthData.email}
                                    onChange={e => setClientAuthData({ ...clientAuthData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Mật khẩu</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-transparent border border-white/15 p-3.5 rounded-xl outline-none focus:border-blue-500 transition-colors text-white placeholder:text-slate-500"
                                    value={clientAuthData.password}
                                    onChange={e => setClientAuthData({ ...clientAuthData, password: e.target.value })}
                                />
                                {clientAuthMode === 'login' && <button type="button" className="block ml-auto mt-2 text-sm text-blue-400 hover:text-blue-300">Quên mật khẩu?</button>}
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                                {clientAuthMode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
                            </button>
                        </form>

                        <div className="text-center mt-6 text-slate-300">
                            {clientAuthMode === 'register' ? (
                                <span>Đã có tài khoản? <button onClick={() => { setClientAuthMode('login'); setClientAuthError(''); }} className="text-blue-400 font-semibold hover:text-blue-300">Đăng nhập</button></span>
                            ) : (
                                <span>Chưa có tài khoản? <button onClick={() => { setClientAuthMode('register'); setClientAuthError(''); }} className="text-blue-400 font-semibold hover:text-blue-300">Tạo tài khoản</button></span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Client Profile Modal (Loyalty Points & Referral) */}
            {showClientProfileModal && userProfile && (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#100d18] text-white p-7 md:p-9 rounded-[2rem] w-full max-w-lg shadow-2xl border border-white/10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-2xl font-serif">Tài khoản của bạn</h3>
                            <button onClick={() => { setShowClientProfileModal(false); setReferralError(''); setReferralSuccess(''); }} className="text-slate-400 hover:text-white p-1 transition-colors"><X /></button>
                        </div>

                        {/* Account Basic Info */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 mb-6">
                            <div className="bg-blue-600/10 border border-blue-500/20 p-3 rounded-xl text-blue-400">
                                <User size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email đăng nhập</p>
                                <p className="text-base font-bold text-slate-200">{userProfile.email || user.email}</p>
                            </div>
                        </div>

                        {/* Point Card */}
                        <div className="bg-gradient-to-br from-amber-500/20 via-orange-600/15 to-transparent border border-amber-500/20 rounded-[2rem] p-6 mb-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -z-10"></div>
                            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1.5">Điểm thưởng tích lũy</p>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="text-5xl font-black font-serif text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 animate-pulse">
                                    {userProfile.points || 0}
                                </span>
                                <span className="text-amber-400 text-lg font-bold">Điểm</span>
                            </div>
                            <p className="text-xs text-slate-400">Đổi mã giảm giá hoặc nhận quà tại Merci Studio</p>
                        </div>

                        {/* Referral Code Card */}
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Mã giới thiệu của bạn</p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-white/5 border border-dashed border-white/10 rounded-xl p-3 text-center font-mono text-xl font-black text-blue-400 tracking-wider">
                                    {userProfile.referralCode}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(userProfile.referralCode);
                                        alert('Đã sao chép mã giới thiệu vào bộ nhớ tạm!');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 rounded-xl font-bold transition-all active:scale-95"
                                >
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                                Chia sẻ mã này cho bạn bè. Khi họ đăng ký và nhập mã, bạn nhận <span className="text-amber-400 font-bold">+100 điểm</span> và bạn bè nhận <span className="text-amber-400 font-bold">+50 điểm</span>.
                            </p>
                        </div>

                        {/* Enter Referral Code Block */}
                        {!userProfile.referredBy ? (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Bạn được giới thiệu?</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nhập mã của bạn bè..."
                                        value={referralInput}
                                        onChange={(e) => setReferralInput(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-colors text-white placeholder:text-slate-500 uppercase tracking-widest text-center font-bold"
                                    />
                                    <button
                                        onClick={handleApplyReferralCode}
                                        disabled={isApplyingReferral}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 rounded-xl font-bold transition-all active:scale-95"
                                    >
                                        {isApplyingReferral ? 'Đang áp dụng...' : 'Áp dụng'}
                                    </button>
                                </div>
                                {referralError && <p className="text-red-400 text-xs mt-2 font-medium">{referralError}</p>}
                                {referralSuccess && <p className="text-emerald-400 text-xs mt-2 font-medium">{referralSuccess}</p>}
                            </div>
                        ) : (
                            <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3 text-emerald-400">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                <p className="text-xs font-semibold">Bạn đã sử dụng mã giới thiệu: <span className="font-bold uppercase font-mono">{userProfile.referredBy}</span></p>
                            </div>
                        )}

                        {/* Points Transaction History */}
                        <div className="mb-6">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-3">Lịch sử tích lũy điểm</p>
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 max-h-48 overflow-y-auto space-y-3 no-scrollbar">
                                {userProfile.history && userProfile.history.length > 0 ? (
                                    [...userProfile.history]
                                        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                                        .map((tx) => (
                                            <div key={tx.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                                <div>
                                                    <p className="font-semibold text-slate-200">{tx.description}</p>
                                                    <p className="text-[10px] text-slate-500">{new Date(tx.createdAt || Date.now()).toLocaleDateString('vi-VN')}</p>
                                                </div>
                                                <span className={`font-bold font-mono text-base ${tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                                                </span>
                                            </div>
                                        ))
                                ) : (
                                    <p className="text-xs text-slate-500 text-center py-4">Chưa có giao dịch điểm nào.</p>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleClientLogout}
                                className="flex-1 bg-white/5 hover:bg-red-600/10 hover:text-red-400 border border-white/10 hover:border-red-500/20 py-3 rounded-xl font-bold transition-all text-slate-300"
                            >
                                Đăng xuất
                            </button>
                            <button
                                onClick={() => { setShowClientProfileModal(false); setReferralError(''); setReferralSuccess(''); }}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Note Modal */}
            {noteModalData.isOpen && noteModalData.img && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col gap-5">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg md:text-xl text-slate-900 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-pink-500" /> Yêu cầu chỉnh sửa
                            </h3>
                            <button onClick={() => setNoteModalData({ isOpen: false, img: null, noteText: '' })} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image Preview */}
                        <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-inner relative bg-slate-50">
                            <img
                                src={noteModalData.img.url || getDriveThumbUrl(noteModalData.img.id, 'w1200')}
                                className="w-full h-full object-cover"
                                alt="Preview"
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                                {noteModalData.img.name}
                            </div>
                        </div>

                        {/* Input Note */}
                        <div className="space-y-2">
                            <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Nhập nội dung chỉnh sửa (VD: Xoá mụn, làm mịn da...)</label>
                            <textarea
                                value={noteModalData.noteText}
                                onChange={e => setNoteModalData({ ...noteModalData, noteText: e.target.value })}
                                rows={4}
                                placeholder={selectedFilter !== 'mine' ? "Không có ghi chú nào từ người dùng này." : "Ghi chú chi tiết những gì bạn muốn thiết kế/chỉnh sửa cho bức ảnh này..."}
                                className="w-full border-2 border-slate-100 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:border-pink-500 transition-colors text-sm md:text-base resize-none font-medium shadow-inner disabled:bg-slate-50 disabled:text-slate-500"
                                disabled={selectedFilter !== 'mine'}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setNoteModalData({ isOpen: false, img: null, noteText: '' })}
                                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 py-3 rounded-xl md:rounded-2xl font-bold transition-all text-sm"
                            >
                                {selectedFilter !== 'mine' ? 'Đóng' : 'Hủy'}
                            </button>
                            {selectedFilter === 'mine' && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleSaveNote(noteModalData.img.id, noteModalData.noteText);
                                        setNoteModalData({ isOpen: false, img: null, noteText: '' });
                                    }}
                                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-xl md:rounded-2xl font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-all text-sm"
                                >
                                    Lưu ghi chú
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between mb-6">
                            <h3 className="font-bold text-2xl">Đăng nhập Admin</h3>
                            <button onClick={() => setShowLoginModal(false)}><X /></button>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
                            <input type="email" placeholder="Email Admin" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} />
                            <input type="password" placeholder="Mật khẩu Firebase" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Vào hệ thống</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Sync Drive Albums Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-2xl">Đồng Bộ Drive</h3>
                            <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Nhập link thư mục Drive Gốc. Web sẽ quét toàn bộ thư mục con bên trong để tạo thành các Album mới.
                        </p>

                        <div className="space-y-4">
                            <input type="text" placeholder="Link Google Drive (Thư mục gốc)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-emerald-500 transition-colors" value={syncDriveLink} onChange={e => setSyncDriveLink(e.target.value)} />

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">DANH MỤC CHÍNH</label>
                                <input
                                    list="sync-album-category-options"
                                    type="text"
                                    placeholder="VD: Wedding"
                                    className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-slate-50 font-medium focus:border-emerald-500 transition-colors mt-1"
                                    value={syncCategory}
                                    onChange={e => setSyncCategory(e.target.value)}
                                />
                                <datalist id="sync-album-category-options">
                                    {albumCategoryFilters.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c} />)}
                                </datalist>
                                <p className="text-xs text-slate-400 mt-1">Đây là mục chính của album. Hashtag sẽ nhập riêng bên dưới.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">HASHTAG PHỤ CHO ALBUM</label>
                                <textarea
                                    rows={2}
                                    placeholder="VD: váy cưới, sinh nhật, sexy, beauty"
                                    className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-white font-medium focus:border-emerald-500 transition-colors mt-1 resize-none"
                                    value={syncHashtags}
                                    onChange={e => setSyncHashtags(e.target.value)}
                                />
                                {normalizeAlbumHashtags(syncHashtags).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {normalizeAlbumHashtags(syncHashtags).map(tag => (
                                            <span key={tag} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">#{tag}</span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 mt-1">Nhập nhiều hashtag phụ, cách nhau bằng dấu phẩy hoặc xuống dòng. Ví dụ: váy cưới, beauty, ngoài trời.</p>
                            </div>
                        </div>

                        {syncProgress && (
                            <p className="text-sm font-bold text-emerald-600 animate-pulse text-center bg-emerald-50 py-2 rounded-xl border border-emerald-100">
                                {syncProgress}
                            </p>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <button onClick={() => setShowSyncModal(false)} className="px-6 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors">Hủy</button>
                            <button disabled={isSyncingAlbums} onClick={handleSyncAlbumsFromDrive} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all">
                                {isSyncingAlbums ? <RefreshCcw size={16} className="animate-spin" /> : <FolderDown size={16} />}
                                {isSyncingAlbums ? 'Đang chạy...' : 'Bắt đầu đồng bộ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Album Modal */}
            {isCreatingAlbum && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-2xl">Tạo Album Mới</h3>
                            <button onClick={() => setIsCreatingAlbum(false)} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>
                        <input type="text" placeholder="Tên Album (*)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" onChange={e => setNewAlbum({ ...newAlbum, title: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Mô tả phụ" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" onChange={e => setNewAlbum({ ...newAlbum, sub: e.target.value })} />
                            <div>
                                <input
                                    list="new-album-category-options"
                                    type="text"
                                    placeholder="VD: Wedding"
                                    className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-slate-50 font-medium focus:border-blue-500 transition-colors"
                                    value={newAlbum.category}
                                    onChange={e => setNewAlbum({ ...newAlbum, category: e.target.value })}
                                />
                                <datalist id="new-album-category-options">
                                    {albumCategoryFilters.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c} />)}
                                </datalist>
                                <p className="text-[11px] text-slate-400 mt-1 ml-1">Đây là mục chính của album. Hashtag sẽ nhập riêng bên dưới.</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">HASHTAG PHỤ</label>
                            <textarea
                                rows={2}
                                placeholder="VD: váy cưới, sinh nhật, sexy, beauty"
                                className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-white font-medium focus:border-blue-500 transition-colors mt-1 resize-none"
                                value={newAlbum.hashtags || ''}
                                onChange={e => setNewAlbum({ ...newAlbum, hashtags: e.target.value })}
                            />
                            {normalizeAlbumHashtags(newAlbum.hashtags || '').length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {normalizeAlbumHashtags(newAlbum.hashtags || '').map(tag => (
                                        <span key={tag} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">#{tag}</span>
                                    ))}
                                </div>
                            )}
                            <p className="text-[11px] text-slate-400 mt-1 ml-1">Hashtag phụ dùng để lọc/search chi tiết, có thể nhập nhiều hashtag cách nhau bằng dấu phẩy hoặc xuống dòng.</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => setIsCreatingAlbum(false)} className="px-6 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors">Hủy</button>
                            <button onClick={handleCreateAlbum} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg transition-all">Khởi tạo</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Album Modal */}
            {editingAlbum && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-2xl text-blue-600">Sửa Album</h3>
                            <button onClick={() => setEditingAlbum(null)} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">TÊN ALBUM</label>
                                <input type="text" placeholder="Tên Album (*)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.title} onChange={e => setEditingAlbum({ ...editingAlbum, title: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 ml-1">MÔ TẢ PHỤ</label>
                                    <input type="text" placeholder="Mô tả phụ" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.sub || ''} onChange={e => setEditingAlbum({ ...editingAlbum, sub: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 ml-1">DANH MỤC</label>
                                    <input
                                        list="edit-album-category-options"
                                        type="text"
                                        placeholder="VD: Wedding"
                                        className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-slate-50 font-medium focus:border-blue-500 transition-colors"
                                        value={getAlbumMainCategory(editingAlbum, '')}
                                        onChange={e => setEditingAlbum({ ...editingAlbum, category: e.target.value })}
                                    />
                                    <datalist id="edit-album-category-options">
                                        {albumCategoryFilters.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c} />)}
                                    </datalist>
                                    <p className="text-[11px] text-slate-400 mt-1 ml-1">Đây là mục chính của album. Hashtag sẽ nhập riêng bên dưới.</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">HASHTAG PHỤ</label>
                                <textarea
                                    rows={2}
                                    placeholder="VD: váy cưới, sinh nhật, sexy, beauty"
                                    className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-white font-medium focus:border-blue-500 transition-colors mt-1 resize-none"
                                    value={Array.isArray(editingAlbum.hashtags) ? editingAlbum.hashtags.join(', ') : (editingAlbum.hashtags || '')}
                                    onChange={e => setEditingAlbum({ ...editingAlbum, hashtags: e.target.value })}
                                />
                                {normalizeAlbumHashtags(editingAlbum.hashtags || '').length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {normalizeAlbumHashtags(editingAlbum.hashtags || '').map(tag => (
                                            <span key={tag} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">#{tag}</span>
                                        ))}
                                    </div>
                                )}
                                <p className="text-[11px] text-slate-400 mt-1 ml-1">Có thể nhập nhiều hashtag phụ, cách nhau bằng dấu phẩy hoặc xuống dòng.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK ẢNH BÌA</label>
                                <input type="text" placeholder="https://..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.coverUrl || ''} onChange={e => setEditingAlbum({ ...editingAlbum, coverUrl: e.target.value })} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK GOOGLE DRIVE (Tùy chọn)</label>
                                <input type="text" placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.driveLink || ''} onChange={e => setEditingAlbum({ ...editingAlbum, driveLink: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => handleDeleteAlbum(editingAlbum.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> Xóa
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingAlbum(null)} className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors">Hủy</button>
                                <button onClick={handleUpdateAlbum} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all">Lưu thay đổi</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Add Modal */}
            {isAddingVideo && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-2xl">Thêm Video YouTube</h3>
                            <button onClick={() => setIsAddingVideo(false)} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Tiêu đề Video" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} />
                            <input type="text" placeholder="Link YouTube (VD: https://youtube.com/...)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={newVideo.url} onChange={e => setNewVideo({ ...newVideo, url: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => setIsAddingVideo(false)} className="px-6 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors">Hủy</button>
                            <button onClick={handleAddVideo} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-bold shadow-lg transition-all">Thêm Video</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Blog Add/Edit Modal */}
            {isAddingBlog && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-2xl text-slate-900">{editingBlog ? 'Sửa Bài Viết' : 'Viết Blog Mới'}</h3>
                            <button onClick={() => { setIsAddingBlog(false); setEditingBlog(null); resetNewBlogForm(); setAiBlogPrompt(''); setAiBlogKeyword(''); }} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>
                        <div className="space-y-4">
                            {!editingBlog && (
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 md:p-5 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-blue-600 text-white p-2 rounded-xl shrink-0">
                                            <Wand2 size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900">AI viết bài chuẩn SEO</p>
                                            <p className="text-xs md:text-sm text-slate-500">Chọn Gemini hoặc ChatGPT, nhập chủ đề, AI sẽ tự tạo tiêu đề, slug, meta description và nội dung có H2/H3 để bạn duyệt trước khi đăng.</p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-4 gap-3">
                                        <select
                                            className="w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors font-bold text-slate-700"
                                            value={aiProvider}
                                            onChange={e => setAiProvider(e.target.value)}
                                        >
                                            <option value="gemini">Google Gemini</option>
                                            <option value="openai">ChatGPT / OpenAI</option>
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="VD: Chụp ảnh cưới ở Bắc Ninh cần chuẩn bị gì?"
                                            className="md:col-span-2 w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                            value={aiBlogPrompt}
                                            onChange={e => setAiBlogPrompt(e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Từ khóa chính"
                                            className="w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                            value={aiBlogKeyword}
                                            onChange={e => setAiBlogKeyword(e.target.value)}
                                        />
                                    </div>

                                    <div className="bg-white border border-blue-100 rounded-2xl p-3 md:p-4 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="bg-emerald-600 text-white p-2 rounded-xl shrink-0">
                                                <FolderDown size={17} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-900">Kho ảnh Google Drive cho AI Blog</p>
                                                <p className="text-xs text-slate-500">Dán link folder Drive cha có nhiều folder con. Khi viết/đăng hàng loạt, mỗi bài sẽ tự lấy ảnh trong một folder con riêng. Nếu folder không có folder con, hệ thống sẽ dùng ảnh trực tiếp trong folder đó.</p>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-[1fr_auto] gap-2">
                                            <input
                                                type="text"
                                                placeholder="Dán link folder Google Drive cha chứa nhiều folder con ảnh"
                                                className="w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                                value={blogDriveFolderLink}
                                                onChange={e => setBlogDriveFolderLink(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                disabled={isLoadingBlogDriveImages}
                                                onClick={handleLoadBlogDriveImages}
                                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <RefreshCcw size={16} className={isLoadingBlogDriveImages ? 'animate-spin' : ''} /> Lấy ảnh kho
                                            </button>
                                        </div>

                                        {blogDriveImages.length > 0 && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-bold text-emerald-700">Đã sẵn sàng {blogDriveImages.length} ảnh{blogDriveSubfolders.length > 0 ? ` / ${blogDriveSubfolders.length} folder con` : ''}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewBlog(prev => ({ ...prev, coverUrl: pickBlogDriveImage(Date.now()) }))}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                                                    >
                                                        Lấy ngẫu nhiên làm ảnh bìa
                                                    </button>
                                                </div>
                                                {blogDriveSubfolders.length > 0 && (
                                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                        {blogDriveSubfolders.slice(0, 10).map((folder, index) => (
                                                            <span key={folder.id || index} className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                {folder.name} · {folder.images?.length || 0} ảnh
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                    {blogDriveImages.slice(0, 12).map((img, index) => (
                                                        <button
                                                            key={img.id || index}
                                                            type="button"
                                                            onClick={() => handleUseBlogDriveImage(img)}
                                                            className="relative shrink-0 w-20 h-14 rounded-xl overflow-hidden border-2 border-transparent hover:border-blue-500 bg-slate-100"
                                                            title={img.name || 'Ảnh kho Drive'}
                                                        >
                                                            <img loading="lazy" decoding="async"
                                                                src={img.thumbnailUrl || img.url}
                                                                alt={img.name || 'Ảnh kho Drive'}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                                referrerPolicy="no-referrer"
                                                                onError={(e) => handleImageError(e, img)}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            disabled={isGeneratingBlog}
                                            onClick={() => handleGenerateBlogWithAI(false)}
                                            className="flex-1 bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Wand2 size={17} /> {getAiProviderLabel()} viết nháp
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isGeneratingBlog}
                                            onClick={() => handleGenerateBlogWithAI(true)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                            <Zap size={17} /> {getAiProviderLabel()} viết & đăng ngay
                                        </button>
                                    </div>

                                    <div className="text-[11px] md:text-xs text-slate-500 leading-relaxed">
                                        Gợi ý chủ đề: “kinh nghiệm chụp ảnh cưới ở Bắc Ninh”, “concept kỷ yếu cấp 3”, “photobooth tiệc cưới”, “váy cưới thiết kế cao cấp”.
                                    </div>

                                    <div className="border-t border-purple-100 pt-4 space-y-3">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="text-sm font-black text-purple-900">Tìm Trend Mới Nhất (AI Google Search)</p>
                                                <p className="text-xs text-purple-600">Nhập chủ đề để AI lướt web tìm xu hướng nóng hổi nhất trong ngày.</p>
                                            </div>
                                        </div>

                                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 md:p-4 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="VD: mùa kỷ yếu, váy cưới, giới trẻ..."
                                                    className="w-full border-2 border-purple-100 bg-white p-3 rounded-xl outline-none focus:border-purple-500 transition-colors text-sm"
                                                    value={trendKeyword}
                                                    onChange={e => setTrendKeyword(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isSearchingTrends}
                                                    onClick={handleSearchTrends}
                                                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isSearchingTrends ? <RefreshCcw className="animate-spin" size={17} /> : <Wand2 size={17} />}
                                                    {isSearchingTrends ? 'Đang search...' : 'Tìm Trend'}
                                                </button>
                                            </div>

                                            {searchTrendsResult.length > 0 && (
                                                <div className="space-y-2 mt-3">
                                                    <p className="text-xs font-bold text-slate-700">Kết quả xu hướng:</p>
                                                    {searchTrendsResult.map((trend, idx) => (
                                                        <div key={idx} className="bg-white border border-purple-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shadow-sm">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 leading-tight">{trend.title}</p>
                                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{trend.description}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                disabled={isGeneratingTrendTopics}
                                                                onClick={() => handleGenerateTrendTopics(trend)}
                                                                className="shrink-0 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                                                            >
                                                                {isGeneratingTrendTopics ? 'Đang tạo...' : 'Tạo ý tưởng'}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="border-t border-blue-100 pt-4 space-y-3">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Viết / đăng bài hàng loạt</p>
                                                <p className="text-xs text-slate-500">Nhập 1 từ khóa, chọn số lượng bài để AI tự tạo danh sách bài liên quan.</p>
                                            </div>
                                            {bulkBlogProgress && (
                                                <span className="text-[11px] font-bold text-blue-600 bg-white px-3 py-1 rounded-full border border-blue-100">
                                                    {bulkBlogProgress}
                                                </span>
                                            )}
                                        </div>

                                        <div className="bg-white border border-blue-100 rounded-2xl p-3 md:p-4 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-[1fr_150px] gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Từ khóa gốc, ví dụ: chụp ảnh cưới Bắc Ninh"
                                                    className="w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm"
                                                    value={autoKeyword}
                                                    onChange={e => setAutoKeyword(e.target.value)}
                                                />
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={20}
                                                    placeholder="Số bài"
                                                    className="w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm font-bold"
                                                    value={autoArticleCount}
                                                    onChange={e => setAutoArticleCount(e.target.value)}
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                disabled={isGeneratingTopicIdeas}
                                                onClick={handleGenerateRelatedTopics}
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Wand2 size={17} /> Tự tạo danh sách bài liên quan bằng {getAiProviderLabel()}
                                            </button>

                                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                                Ví dụ nhập “chụp ảnh cưới Bắc Ninh”, chọn 10 bài. AI sẽ tự tạo các chủ đề như kinh nghiệm chuẩn bị, chi phí, concept, địa điểm, checklist... rồi đưa xuống ô hàng loạt bên dưới.
                                            </p>
                                        </div>

                                        <textarea
                                            rows={5}
                                            placeholder={`VD:
Bí kíp chụp ảnh cưới studio Bắc Ninh 2026 | chụp ảnh cưới studio Bắc Ninh
Concept kỷ yếu cấp 3 đẹp tự nhiên | chụp ảnh kỷ yếu Bắc Ninh
Photobooth tiệc cưới Bắc Ninh có đáng thuê không | photobooth tiệc cưới Bắc Ninh`}
                                            className="w-full border-2 border-blue-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors text-sm leading-relaxed"
                                            value={bulkBlogTopics}
                                            onChange={e => setBulkBlogTopics(e.target.value)}
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                disabled={isBulkGeneratingBlog}
                                                onClick={() => handleBulkGenerateBlogs(false)}
                                                className="bg-white border-2 border-blue-100 hover:border-blue-500 disabled:opacity-50 text-slate-900 px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Wand2 size={17} /> Viết nháp hàng loạt
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isBulkGeneratingBlog}
                                                onClick={() => handleBulkGenerateBlogs(true)}
                                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Zap size={17} /> Viết & đăng hàng loạt
                                            </button>
                                        </div>

                                        {bulkGeneratedBlogs.length > 0 && (
                                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                                {bulkGeneratedBlogs.map((blog, index) => (
                                                    <div key={`${blog.slug}-${index}`} className="bg-white border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="vi-safe-font font-bold text-sm text-slate-900 truncate">{index + 1}. {blog.title}</p>
                                                            <p className="text-[11px] text-slate-500 truncate">/{blog.slug}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => useBulkDraftInForm(blog)}
                                                            className="shrink-0 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg"
                                                        >
                                                            Đưa vào form sửa
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">TIÊU ĐỀ BÀI VIẾT (*)</label>
                                <input type="text" placeholder="Kinh nghiệm chụp ảnh cưới..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.title} onChange={e => setNewBlog({ ...newBlog, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">ĐƯỜNG DẪN TÙY CHỈNH (SLUG - Để trống sẽ tự tạo)</label>
                                <input type="text" placeholder="kinh-nghiem-chup-anh-cuoi" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.slug} onChange={e => setNewBlog({ ...newBlog, slug: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">MÔ TẢ NGẮN (META DESCRIPTION - Tốt cho SEO)</label>
                                <textarea rows={2} placeholder="Tóm tắt ngắn gọn nội dung bài viết..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.metaDesc} onChange={e => setNewBlog({ ...newBlog, metaDesc: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK ẢNH BÌA</label>
                                <input type="text" placeholder="https://..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.coverUrl} onChange={e => setNewBlog({ ...newBlog, coverUrl: e.target.value })} />
                                {(newBlog.coverUrl || editingBlog?.coverUrl) && (
                                    <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-[16/7]">
                                        <img loading="lazy" decoding="async" src={newBlog.coverUrl || DEFAULT_COVER} alt="Xem trước ảnh bìa" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = DEFAULT_COVER; }} />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">HASHTAG BÀI VIẾT</label>
                                <input
                                    type="text"
                                    placeholder="VD: chụp ảnh cưới, Bắc Ninh, studio, kỷ yếu"
                                    className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1"
                                    value={Array.isArray(newBlog.hashtags) ? newBlog.hashtags.join(', ') : (newBlog.hashtags || '')}
                                    onChange={e => setNewBlog({ ...newBlog, hashtags: e.target.value })}
                                />
                                <p className="text-xs text-slate-400 mt-1">Nhập cách nhau bằng dấu phẩy. Ví dụ: chụp ảnh cưới, Bắc Ninh, concept studio</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {['chụp ảnh cưới', 'Bắc Ninh', 'Việt Yên', 'kỷ yếu', 'photobooth', 'váy cưới', 'makeup', 'baby family'].map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => addHashtagToBlogInput(tag)}
                                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chèn ảnh vào nội dung bài viết</p>
                                    <p className="text-xs text-slate-400 mt-1">Dán link ảnh, nhập chú thích/alt text rồi bấm chèn. Ảnh sẽ hiện ngay trong bài bằng cú pháp Markdown.</p>
                                </div>
                                <div className="grid md:grid-cols-5 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Link ảnh: https://..."
                                        className="md:col-span-2 w-full border-2 border-slate-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                        value={blogImageUrl}
                                        onChange={e => setBlogImageUrl(e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Chú thích / alt SEO cho ảnh"
                                        className="md:col-span-2 w-full border-2 border-slate-100 bg-white p-3 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                        value={blogImageCaption}
                                        onChange={e => setBlogImageCaption(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleInsertBlogImage}
                                        className="bg-slate-900 hover:bg-blue-600 text-white px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <ImageIcon size={17} /> Chèn ảnh
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">NỘI DUNG BÀI VIẾT (Hỗ trợ ## H2, ### H3, - bullet, ![alt](link ảnh))</label>
                                <textarea rows={10} placeholder="Nhập nội dung bài viết vào đây..." className="w-full border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1 leading-relaxed" value={newBlog.content} onChange={e => setNewBlog({ ...newBlog, content: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                            <button onClick={() => { setIsAddingBlog(false); setEditingBlog(null); setBlogImageUrl(''); setBlogImageCaption(''); }} className="px-6 py-2.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Hủy</button>
                            <button onClick={handleSaveBlog} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all">{editingBlog ? 'Lưu thay đổi' : 'Đăng bài'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Header */}
            {activeTab !== 'home' && (
                <header className="relative md:sticky md:top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 py-2.5 px-4 md:p-4 shadow-sm">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
                        <div className="flex justify-between items-center w-full md:w-auto">
                            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
                                setActiveTab('home');
                                setActiveAlbumId(null);
                                setActiveBlogId(null);
                                window.history.pushState({}, document.title, '/');
                            }}>
                                <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                                    <Camera className="text-white" size={20} />
                                </div>
                                <h1 className="text-xl font-bold font-serif text-slate-900 tracking-tight">Merci Studio</h1>
                            </div>
                            <button onClick={() => user ? (isAdmin ? handleClientLogout() : setShowClientProfileModal(true)) : openClientAuth('login')} className="md:hidden flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                                <User size={18} /> {user ? (isAdmin ? 'Admin' : 'Tài khoản') : 'Đăng nhập'}
                            </button>
                        </div>

                        <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                            <nav className="flex bg-slate-100/50 p-1 rounded-full w-max md:w-auto mx-auto border border-slate-200/50">
                                {[
                                    { id: 'home', label: 'Trang chủ' },
                                    { id: 'collection', label: 'Bộ sưu tập' },
                                    { id: 'videos', label: 'Video' },
                                    { id: 'blog', label: 'Blog' },
                                    { id: 'tool', label: 'Công cụ' },
                                    { id: 'booking', label: 'Đặt lịch' },
                                    ...(isAdmin ? [{ id: 'dashboard', label: 'Thống kê' }, { id: 'promotion', label: 'Khuyến mãi' }] : [])
                                ].map(t => (
                                    <button key={t.id} onClick={() => navigateToTab(t.id, t.id === 'tool' ? activeToolTab : null)} className={`px-3.5 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="hidden md:flex items-center gap-2">
                            <button onClick={() => user ? (isAdmin ? handleClientLogout() : setShowClientProfileModal(true)) : openClientAuth('login')} className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-colors ${isAdmin ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                <User size={18} /> {user ? `${user.email || 'Tài khoản'}${isAdmin ? ' · Admin' : ''}` : 'Đăng nhập'}
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-grow w-full">
                <div key={`${activeTab}-${activeToolTab}`} className="max-w-7xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

                    {/* --- TAB: BIO HOME TỐI GIẢN --- */}
                    {activeTab === 'home' && (
                        <HomeHub
                            user={user}
                            isAdmin={isAdmin}
                            navigateToTab={navigateToTab}
                            openClientAuth={openClientAuth}
                            handleClientLogout={handleClientLogout}
                            setShowClientProfileModal={setShowClientProfileModal}
                            heroSrc={DEFAULT_HERO}
                        />
                    )}

                    {activeTab === 'tool' && (
                        <div className="mb-3 md:mb-8 bg-white border border-slate-100 rounded-xl md:rounded-[2rem] p-2.5 md:p-4 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                                <div className="px-2">
                                    <p className="hidden sm:block text-xs font-bold uppercase tracking-widest text-blue-600">Tool Studio</p>
                                    <h2 className="text-base md:text-2xl font-black text-slate-900">Tạo trang · Chọn ảnh · Lọc ảnh</h2>
                                </div>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 p-1 rounded-xl md:rounded-2xl border border-slate-100">
                                    {[
                                        { id: 'create', label: 'Tạo trang', path: '/tao-trang' },
                                        { id: 'gallery', label: 'Chọn ảnh', path: '/chon-anh' },
                                        { id: 'filter', label: 'Lọc ảnh', path: '/loc-anh' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setActiveToolTab(item.id);
                                                window.history.pushState({}, document.title, item.path);
                                            }}
                                            className={`px-3 md:px-5 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold whitespace-nowrap transition-all ${activeToolTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-blue-600 hover:bg-white'}`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: TẠO TRANG --- */}
                    {activeTab === 'tool' && activeToolTab === 'create' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
                            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-left duration-500">
                                <h2 className="text-4xl md:text-6xl font-bold leading-tight text-slate-900 tracking-tight">Gửi album chọn ảnh <span className="text-blue-600">ngay lập tức.</span></h2>
                                <p className="text-slate-500 text-base md:text-xl leading-relaxed">Tiết kiệm thời gian tối đa cho Studio và Khách hàng với hệ thống chọn ảnh thông minh tích hợp Google Drive API.</p>
                                {!user && (
                                    <button onClick={() => openClientAuth('login')} className="bg-white border-2 border-slate-100 px-5 py-3 rounded-2xl font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2 w-fit">
                                        <User className="w-5 h-5" /> Đăng nhập / đăng ký khách hàng
                                    </button>
                                )}
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-4 md:space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase ml-1 tracking-widest">Link folder Google Drive</label>
                                        <textarea
                                            value={driveLink}
                                            onChange={e => setDriveLink(e.target.value)}
                                            rows={5}
                                            placeholder={'Dán link folder Google Drive. Nếu có nhiều folder con, mỗi dòng là 1 folder:\nhttps://drive.google.com/drive/folders/...\nhttps://drive.google.com/drive/folders/...'}
                                            className="w-full border-2 border-slate-100 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:border-blue-500 transition-colors text-sm md:text-base resize-none"
                                        />
                                        <p className="text-xs text-slate-400 font-medium ml-1">Có thể dán 1 folder hoặc nhiều folder con. Trang chọn ảnh sẽ có nút chuyển qua lại giữa các folder.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                alert("Vui lòng đăng nhập tài khoản trước khi tạo link để hệ thống lưu trữ và quản lý trang chọn ảnh của bạn!");
                                                openClientAuth('login');
                                                return;
                                            }
                                            fetchDrive(driveLink, { savePage: true });
                                        }}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group text-sm md:text-base"
                                    >
                                        <Wand2 className="group-hover:rotate-45 transition-transform" /> Tạo link gửi khách
                                    </button>
                                </div>
                                {clientLink && (
                                    <div className="bg-blue-50 p-5 md:p-6 rounded-2xl flex flex-col gap-3 md:gap-4 border border-blue-100 animate-in zoom-in-95">
                                        <div>
                                            <span className="text-[10px] md:text-xs font-bold text-blue-700 block mb-1">LINK CHỌN ẢNH (Gửi khách hàng):</span>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-xs md:text-sm font-mono text-blue-800 truncate bg-white px-3 py-2 rounded-lg border border-blue-200 flex-1">{clientLink}</span>
                                                <button onClick={() => {
                                                    if (navigator.clipboard) {
                                                        navigator.clipboard.writeText(clientLink).then(() => alert("Đã copy!"));
                                                    } else {
                                                        prompt("Copy link:", clientLink);
                                                    }
                                                }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <img src={DEFAULT_PROMO} className="rounded-[2rem] md:rounded-[3rem] shadow-2xl object-cover aspect-[4/3] w-full animate-in zoom-in duration-700" alt="Promo" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                        </div>
                    )}

                    {/* --- TAB: VIDEO --- */}
                    {activeTab === 'videos' && (
                        <div className="space-y-8 md:space-y-12 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900">Phim Phóng Sự & Concept</h2>
                                {isAdmin && (
                                    <button onClick={() => setIsAddingVideo(true)} className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700 text-sm md:text-base">
                                        <Plus size={18} /> <span className="hidden sm:inline">Thêm Video</span>
                                    </button>
                                )}
                            </div>

                            {isAdmin && videos.length > 1 && (
                                <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-3 md:p-4 text-xs md:text-sm font-bold flex items-center gap-2">
                                    <span className="text-lg leading-none">⋮⋮</span> Giữ chuột vào card video rồi kéo thả để đổi thứ tự. Thứ tự sẽ tự lưu vào Firestore.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                                {videos.length > 0 ? videos.map(vid => (
                                    <div
                                        key={vid.id}
                                        draggable={isAdmin}
                                        onDragStart={(e) => {
                                            if (!isAdmin) return;
                                            setDraggingVideoId(vid.id);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragOver={(e) => {
                                            if (!isAdmin || !draggingVideoId) return;
                                            e.preventDefault();
                                            setDragOverVideoId(vid.id);
                                        }}
                                        onDragLeave={() => dragOverVideoId === vid.id && setDragOverVideoId(null)}
                                        onDrop={(e) => handleVideoDrop(vid.id, e)}
                                        onDragEnd={() => { setDraggingVideoId(null); setDragOverVideoId(null); }}
                                        onClick={() => setVideoModal({ isOpen: true, youtubeId: vid.youtubeId })}
                                        className={`group cursor-pointer relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 bg-slate-900 ${draggingVideoId === vid.id ? 'opacity-50 scale-95' : ''} ${dragOverVideoId === vid.id ? 'ring-4 ring-blue-400' : ''}`}
                                    >
                                        <img loading="lazy" decoding="async" src={`https://img.youtube.com/vi/${vid.youtubeId}/maxresdefault.jpg`} className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt={vid.title} referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-center justify-center">
                                            <PlayCircle className="w-16 h-16 text-white/80 group-hover:text-white transition-all group-hover:scale-110 drop-shadow-lg" />
                                        </div>
                                        <div className="absolute bottom-6 left-6 right-6 text-white">
                                            <h3 className="text-xl md:text-2xl font-bold font-serif leading-tight drop-shadow-md">{vid.title}</h3>
                                        </div>
                                        {/* Nút thao tác Admin: kéo thả + xóa */}
                                        {isAdmin && (
                                            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                <div className="bg-white/90 px-2.5 py-2 rounded-full text-slate-700 shadow-lg cursor-grab active:cursor-grabbing font-black text-xs tracking-widest" title="Giữ và kéo để sắp xếp">
                                                    ⋮⋮
                                                </div>
                                                <button onClick={(e) => handleDeleteVideo(vid.id, e)} className="bg-white/90 p-2 md:p-2.5 rounded-full text-red-600 hover:text-red-800 shadow-lg hover:scale-110" title="Xóa Video">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center py-20 text-slate-400">
                                        <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p className="text-sm md:text-base">Chưa có video nào.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: BLOG CHUẨN SEO --- */}
                    {activeTab === 'blog' && (
                        <div className="space-y-8 md:space-y-12">
                            {!activeBlogId ? (
                                <>
                                    <div className="flex justify-between items-center gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Blog Merci Studio</p>
                                            <h2 className="text-2xl md:text-4xl font-bold font-sans text-slate-900">Blog Cưới</h2>
                                        </div>
                                        {isAdmin && (
                                            <button onClick={openNewBlogModal} className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700 text-sm md:text-base">
                                                <FileText size={18} /> <span className="hidden sm:inline">Viết bài mới</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="mb-2 md:mb-4">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Lọc bài viết</p>
                                                <h3 className="text-lg md:text-2xl font-black text-slate-900">Hashtag Blog</h3>
                                            </div>
                                            {activeBlogHashtag !== 'Tất cả' && (
                                                <button onClick={() => setActiveBlogHashtag('Tất cả')} className="text-xs font-bold text-slate-500 hover:text-blue-600">Xóa lọc</button>
                                            )}
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                            {getAllBlogHashtags().map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => setActiveBlogHashtag(tag)}
                                                    className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all ${activeBlogHashtag === tag ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-blue-50 hover:text-blue-600'}`}
                                                >
                                                    {tag === 'Tất cả' ? 'Tất cả' : `#${tag}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8">
                                        {getFilteredBlogsByHashtag().length > 0 ? getFilteredBlogsByHashtag().map(blog => (
                                            <div key={blog.id} onClick={() => {
                                                setActiveBlogId(blog.id);
                                                const slugToUse = blog.slug || createSlug(blog.title) || blog.id;
                                                window.history.pushState({}, '', `/${slugToUse}`);
                                            }} className="group cursor-pointer bg-white rounded-2xl md:rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                                <div className="aspect-[4/3] md:aspect-[16/10] overflow-hidden relative">
                                                    <img src={blog.coverUrl || DEFAULT_PROMO} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={blog.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => { e.target.src = DEFAULT_PROMO; }} />
                                                    {isAdmin && (
                                                        <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                            <button onClick={(e) => openEditBlog(blog, e)} className="bg-white/90 p-2 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={(e) => handleDeleteBlog(blog.id, e)} className="bg-white/90 p-2 rounded-full text-red-600 hover:text-red-800 shadow-lg hover:scale-110">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 md:p-6 flex flex-col flex-grow">
                                                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-blue-600 font-bold tracking-widest uppercase mb-2 md:mb-3">
                                                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" /> {new Date(blog.createdAt).toLocaleDateString('vi-VN')}
                                                    </div>
                                                    {getBlogHashtags(blog).length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {getBlogHashtags(blog).slice(0, 3).map(tag => (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveBlogHashtag(tag);
                                                                    }}
                                                                    className="text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                                                >
                                                                    #{tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <h3 className="vi-safe-font text-sm md:text-2xl font-black font-sans text-slate-900 mb-2 md:mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">{blog.title}</h3>
                                                    <p className="text-slate-500 text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 mb-3 md:mb-6 flex-grow">{blog.metaDesc || blog.content}</p>
                                                    <span className="text-blue-600 font-semibold text-xs md:text-sm flex items-center gap-1 mt-auto">Đọc tiếp <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="col-span-full text-center py-20 text-slate-400">
                                                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm md:text-base">Chưa có bài viết nào với hashtag này.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in slide-in-from-right duration-500 max-w-4xl mx-auto bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
                                        <button onClick={() => {
                                            setActiveBlogId(null);
                                            window.history.pushState({}, document.title, '/blog');
                                        }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                                            <ArrowLeft size={20} /> Quay lại danh sách
                                        </button>

                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {isAdmin && currentViewBlog && (
                                                <>
                                                    <button onClick={(e) => openEditBlog(currentViewBlog, e)} className="flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all font-semibold text-sm">
                                                        <Edit size={16} /> Sửa bài
                                                    </button>
                                                    <button onClick={(e) => handleDeleteBlog(currentViewBlog.id, e)} className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-all font-semibold text-sm">
                                                        <Trash2 size={16} /> Xóa
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => {
                                                const slugToUse = currentViewBlog?.slug || createSlug(currentViewBlog?.title) || currentViewBlog?.id;
                                                const link = `${window.location.origin}/${slugToUse}`;
                                                if (navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(link).then(() => alert("Đã copy link bài viết này!"));
                                                } else {
                                                    prompt("Copy link:", link);
                                                }
                                            }} className="flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all font-semibold text-sm">
                                                <LinkIcon size={16} /> Copy Link
                                            </button>
                                        </div>
                                    </div>

                                    {currentViewBlog && (
                                        <article className="blog-content prose prose-slate prose-lg md:prose-xl max-w-none">
                                            <div className="flex items-center gap-2 text-sm text-blue-600 font-bold tracking-widest uppercase mb-4">
                                                <Calendar className="w-4 h-4" /> {new Date(currentViewBlog.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                            <h1 className="vi-safe-font text-3xl md:text-5xl font-black font-sans text-slate-900 leading-tight mb-8">
                                                {currentViewBlog.title}
                                            </h1>
                                            {getBlogHashtags(currentViewBlog).length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-8">
                                                    {getBlogHashtags(currentViewBlog).map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => {
                                                                setActiveBlogId(null);
                                                                setActiveBlogHashtag(tag);
                                                                window.history.pushState({}, '', '/blog');
                                                            }}
                                                            className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs md:text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors"
                                                        >
                                                            #{tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {currentViewBlog.coverUrl && (
                                                <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden mb-10 shadow-md">
                                                    <img loading="lazy" decoding="async" src={currentViewBlog.coverUrl} className="w-full h-full object-cover" alt={currentViewBlog.title} referrerPolicy="no-referrer" />
                                                </div>
                                            )}

                                            {/* Phần nội dung bài viết hỗ trợ Markdown đơn giản để tốt hơn cho SEO */}
                                            <div className="text-slate-700 leading-relaxed space-y-5 text-base md:text-lg">
                                                {currentViewBlog.content.split('\n').map((line, idx) => {
                                                    const textLine = line.trim();
                                                    if (!textLine) return <br key={idx} />;

                                                    const imageMatch = textLine.match(/^!\[(.*?)\]\((.*?)\)$/);
                                                    if (imageMatch) {
                                                        const altText = imageMatch[1] || currentViewBlog.title;
                                                        const imageUrl = imageMatch[2];
                                                        return (
                                                            <figure key={idx} className="my-8">
                                                                <img src={imageUrl} alt={altText} className="w-full rounded-2xl shadow-sm object-cover" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                                                                {altText && <figcaption className="text-center text-sm text-slate-400 mt-2">{altText}</figcaption>}
                                                            </figure>
                                                        );
                                                    }

                                                    if (textLine.startsWith('### ')) {
                                                        return <h3 key={idx} className="text-xl md:text-2xl font-bold text-slate-900 mt-8 mb-3">{textLine.replace(/^###\s+/, '')}</h3>;
                                                    }

                                                    if (textLine.startsWith('## ')) {
                                                        return <h2 key={idx} className="text-2xl md:text-3xl font-bold text-slate-900 mt-10 mb-4">{textLine.replace(/^##\s+/, '')}</h2>;
                                                    }

                                                    if (textLine.startsWith('- ')) {
                                                        return <p key={idx} className="pl-4 border-l-4 border-blue-100">• {textLine.replace(/^-\s+/, '')}</p>;
                                                    }

                                                    return <p key={idx}>{textLine}</p>;
                                                })}
                                            </div>
                                        </article>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: BỘ SƯU TẬP --- */}
                    {activeTab === 'collection' && (
                        <div className="space-y-8 md:space-y-12">
                            {!activeAlbumId ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900">Bộ Sưu Tập</h2>
                                        {isAdmin && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={handleAddViewsToAllAlbums} className="bg-amber-600 text-white px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-amber-700 text-sm md:text-base" title="Cộng thêm 1000 lượt xem cho toàn bộ album">
                                                    <Eye size={18} /> <span className="hidden sm:inline">+1000 Lượt xem</span>
                                                </button>
                                                <button onClick={() => setShowSyncModal(true)} className="bg-emerald-600 text-white px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-emerald-700 text-sm md:text-base">
                                                    <FolderDown size={18} /> <span className="hidden sm:inline">Đồng bộ Drive</span>
                                                </button>
                                                <button onClick={() => setIsCreatingAlbum(true)} className="bg-blue-600 text-white px-4 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700 text-sm md:text-base">
                                                    <Plus size={18} /> <span className="hidden sm:inline">Album mới</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex overflow-x-auto gap-2 md:gap-3 mb-6 md:mb-8 no-scrollbar pb-2">
                                        {albumCategoryFilters.map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => { setActiveCategory(cat); if (cat === 'Tất cả') window.history.pushState({}, '', '/bo-su-tap'); else window.history.pushState({}, '', `/bo-su-tap${getCategoryHash(cat)}`); }}
                                                className={`px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-300 ${createSlug(activeCategory) === createSlug(cat) ? 'bg-slate-900 text-white shadow-md scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 mb-6 md:mb-8 shadow-sm space-y-3">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Lọc / search theo hashtag phụ</label>
                                                <input
                                                    type="text"
                                                    placeholder="VD: váy cưới, sinh nhật, sexy, beauty..."
                                                    value={albumHashtagQuery}
                                                    onChange={e => setAlbumHashtagQuery(e.target.value)}
                                                    className="w-full mt-1 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors text-sm font-medium"
                                                />
                                            </div>
                                            {albumHashtagQuery && (
                                                <button
                                                    onClick={() => setAlbumHashtagQuery('')}
                                                    className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
                                                >
                                                    Xóa lọc
                                                </button>
                                            )}
                                        </div>

                                        {albumHashtagFilters.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {albumHashtagFilters.slice(0, 24).map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => setAlbumHashtagQuery(tag)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${createSlug(albumHashtagQuery) === createSlug(tag)
                                                            ? 'bg-blue-600 text-white shadow-md'
                                                            : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                                                            }`}
                                                    >
                                                        #{tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {isAdmin && activeCategory !== 'Tất cả' && (
                                        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Link gửi khách theo danh mục chính</p>
                                                <p className="font-mono text-sm text-blue-700 truncate">{`${window.location.origin}/bo-su-tap${getCategoryHash(activeCategory)}`}</p>
                                            </div>
                                            <button onClick={() => {
                                                const link = `${window.location.origin}/bo-su-tap${getCategoryHash(activeCategory)}`;
                                                if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(() => alert('Đã copy link danh mục!'));
                                                else prompt('Copy link:', link);
                                            }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                                                <Copy className="w-4 h-4" /> Copy link {activeCategory}
                                            </button>
                                        </div>
                                    )}

                                    {isAdmin && filteredAlbums.length > 1 && (
                                        <div className="bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl p-3 md:p-4 text-xs md:text-sm font-bold flex items-center gap-2">
                                            <span className="text-lg leading-none">⋮⋮</span> Giữ chuột vào card album rồi kéo thả để đổi thứ tự. Thứ tự sẽ tự lưu vào Firestore.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
                                        {filteredAlbums.length > 0 ? filteredAlbums.map(a => (
                                            <div
                                                key={a.id}
                                                draggable={isAdmin}
                                                onDragStart={(e) => {
                                                    if (!isAdmin) return;
                                                    setDraggingAlbumId(a.id);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragOver={(e) => {
                                                    if (!isAdmin || !draggingAlbumId) return;
                                                    e.preventDefault();
                                                    setDragOverAlbumId(a.id);
                                                }}
                                                onDragLeave={() => dragOverAlbumId === a.id && setDragOverAlbumId(null)}
                                                onDrop={(e) => handleAlbumDrop(a.id, e)}
                                                onDragEnd={() => { setDraggingAlbumId(null); setDragOverAlbumId(null); }}
                                                onClick={() => {
                                                    setActiveAlbumId(a.id);
                                                    setAlbumDriveLink(a.driveLink || '');
                                                    setLightboxData(p => ({ ...p, images: a.images || [] }));
                                                    const slugToUse = a.slug || createSlug(a.title) || a.id;
                                                    window.history.pushState({}, '', `/${slugToUse}`);
                                                }}
                                                className={`group cursor-pointer relative transition-all duration-200 ${draggingAlbumId === a.id ? 'opacity-50 scale-95' : ''} ${dragOverAlbumId === a.id ? 'ring-4 ring-blue-400 rounded-2xl md:rounded-[2.5rem]' : ''}`}
                                            >
                                                <div className="aspect-[4/5] rounded-2xl md:rounded-[2.5rem] overflow-hidden mb-2 md:mb-3 bg-slate-200 relative shadow-md group-hover:shadow-2xl transition-all duration-500">
                                                    <img src={a.coverUrl || (a.coverId ? getDriveThumbUrl(a.coverId, 'w1200') : DEFAULT_COVER)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={a.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = a.coverId ? getDriveThumbUrl(a.coverId, 'w600') : DEFAULT_COVER; }} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
                                                    <div className="absolute top-2 md:top-6 left-2 md:left-6 z-10 flex flex-col items-start gap-1 max-w-[88%]">
                                                        <span className="bg-white/95 backdrop-blur-md px-2 md:px-3 py-0.5 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                                                            {getAlbumMainCategory(a, 'Wedding')}
                                                        </span>
                                                    </div>

                                                    {/* Các nút thao tác Admin: kéo thả + sửa */}
                                                    {isAdmin && (
                                                        <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                            <div className="bg-white/90 px-2.5 py-2 rounded-full text-slate-700 shadow-lg cursor-grab active:cursor-grabbing font-black text-xs tracking-widest" title="Giữ và kéo để sắp xếp">
                                                                ⋮⋮
                                                            </div>
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingAlbum(a); }} className="bg-white/90 p-2 md:p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110" title="Sửa Album">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-3 md:bottom-8 left-3 md:left-8 right-3 md:right-8 text-white">
                                                        <h3 className="text-sm md:text-3xl font-bold font-sans mb-1 md:mb-2 leading-tight">{a.title}</h3>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[8px] md:text-xs font-medium opacity-90 uppercase tracking-widest"><span>{a.images?.length || 0} tác phẩm</span><span className="opacity-50"> · </span><span className="inline-flex items-center gap-0.5 md:gap-1"><Eye size={10} className="md:w-3.5 md:h-3.5 inline shrink-0" /> {a.views || 0}</span></p>
                                                            {a.sub && <p className="hidden md:block text-xs opacity-70 truncate max-w-[50%]">{a.sub}</p>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {getAlbumHashtags(a).length > 0 && (
                                                    <div className="px-1 md:px-2 min-h-[28px] md:min-h-[34px] flex flex-wrap items-start gap-1.5 md:gap-2">
                                                        {getAlbumHashtags(a).slice(0, 5).map(tag => (
                                                            <span key={tag} className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-extrabold shadow-sm">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {getAlbumHashtags(a).length > 5 && (
                                                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-extrabold shadow-sm">
                                                                +{getAlbumHashtags(a).length - 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="col-span-full text-center py-20 text-slate-400">
                                                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                                <p className="text-sm md:text-base">Chưa có album nào phù hợp với bộ lọc hiện tại.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-8 md:space-y-10 animate-in slide-in-from-right duration-500">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 border-b border-slate-100 pb-6 md:pb-8">
                                        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                                            <button onClick={() => {
                                                setActiveAlbumId(null);
                                                window.history.pushState({}, document.title, `/bo-su-tap${getCategoryHash(activeCategory)}`);
                                            }} className="flex items-center justify-center gap-2 text-slate-500 bg-white hover:bg-slate-50 px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border shadow-sm transition-all active:scale-95 text-sm md:text-base flex-1 md:flex-none">
                                                <ArrowLeft size={18} /> Quay lại
                                            </button>

                                            {/* Link Album MỚI (Dạng Slug đẹp) */}
                                            <button onClick={() => {
                                                const slugToUse = currentViewAlbum?.slug || createSlug(currentViewAlbum?.title) || currentViewAlbum?.id;
                                                const link = `${window.location.origin}/${slugToUse}`;
                                                if (navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(link).then(() => alert("Đã copy link Album này!"));
                                                } else {
                                                    prompt("Copy link:", link);
                                                }
                                            }} className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-blue-100 shadow-sm transition-all font-semibold flex-1 md:flex-none text-sm md:text-base">
                                                <LinkIcon size={18} /> <span className="hidden sm:inline">Copy Link</span>
                                            </button>
                                        </div>

                                        {isAdmin && (
                                            <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-blue-50/50 p-2 rounded-xl md:rounded-2xl border border-blue-100 shadow-inner w-full md:w-auto">
                                                <input
                                                    type="text"
                                                    placeholder="Dán link Drive..."
                                                    value={albumDriveLink}
                                                    onChange={e => setAlbumDriveLink(e.target.value)}
                                                    className="flex-1 md:w-64 px-3 md:px-4 py-2 border border-slate-200 rounded-lg md:rounded-xl outline-none text-xs md:text-sm focus:border-blue-500"
                                                />
                                                <button onClick={handleSyncDriveToAlbum} className="bg-white hover:bg-blue-600 hover:text-white text-blue-600 px-4 md:px-6 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border border-blue-200 shadow-sm transition-all flex items-center justify-center gap-2 w-full sm:w-auto">
                                                    <RefreshCcw size={16} /> Reload Drive
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center px-4 flex flex-col items-center gap-2">
                                        <h2 className="text-3xl md:text-5xl font-bold font-serif text-slate-900 mb-2">{currentViewAlbum?.title}</h2>
                                        {currentViewAlbum?.sub && <p className="text-slate-500 text-sm md:text-base">{currentViewAlbum?.sub}</p>}
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs md:text-sm font-semibold mt-1">
                                            <Eye size={14} className="opacity-80" />
                                            <span>{currentViewAlbum?.views || 0} lượt xem</span>
                                        </div>
                                    </div>

                                    <PaginationControls
                                        currentPage={safeAlbumPage}
                                        totalPages={albumTotalPages}
                                        totalItems={albumImages.length}
                                        onPageChange={setAlbumPage}
                                        label="Bộ sưu tập"
                                    />

                                    <div className={paginatedAlbumImages.length <= 8 ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto" : "masonry-grid"}>
                                        {paginatedAlbumImages.map((img: any, i: number) => {
                                            const isCover = currentViewAlbum?.coverId === img.id || currentViewAlbum?.coverUrl === img.url;
                                            const originalIndex = albumStartIndex + i;
                                            const isFewAlbumImages = paginatedAlbumImages.length <= 8;

                                            return (
                                                <div key={img.id} className={`${isFewAlbumImages ? 'relative group rounded-2xl md:rounded-[1.75rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all bg-white aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]' : 'masonry-item mb-2.5 sm:mb-3 md:mb-4 relative group rounded-2xl md:rounded-[1.75rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all bg-white'}`} onClick={() => setLightboxData({ isOpen: true, index: originalIndex, images: albumImages })}>
                                                    <img src={img.url || getDriveThumbUrl(img.id, 'w1200')} className={`${isFewAlbumImages ? 'w-full h-full object-cover block transition-transform duration-500 group-hover:scale-105' : 'w-full h-auto block transition-transform duration-500 group-hover:scale-105'}`} loading="lazy" decoding="async" alt={img.name || "Album"} referrerPolicy="no-referrer" onError={(e) => handleImageError(e, img)} />

                                                    {/* Nút Tải xuống */}
                                                    <div className="absolute top-2 right-2 md:top-4 md:right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-y-2 md:group-hover:translate-y-0 z-20">
                                                        <button onClick={(e) => handleDownloadWithWatermark(img, img.name, e)} className="bg-white/90 p-1.5 md:p-3 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-xl" title="Tải ảnh">
                                                            <Download size={14} className="md:w-5 md:h-5" />
                                                        </button>
                                                    </div>

                                                    {/* Nút Đặt làm Ảnh Bìa (Chỉ hiện với Admin) */}
                                                    {isAdmin && (
                                                        <div className={`absolute top-2 left-2 md:top-4 md:left-4 transition-all z-20 ${isCover ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                                                            <button
                                                                onClick={(e) => handleSetCover(e, img.url)}
                                                                className={`p-1.5 md:p-3 rounded-full shadow-xl transition-all ${isCover ? 'bg-yellow-400 text-white' : 'bg-white/90 text-slate-400 hover:bg-yellow-400 hover:text-white'}`}
                                                                title={isCover ? "Đây là ảnh bìa hiện tại" : "Đặt làm ảnh bìa"}
                                                            >
                                                                <Star size={14} className={`md:w-5 md:h-5 ${isCover ? "fill-current" : ""}`} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <PaginationControls
                                        currentPage={safeAlbumPage}
                                        totalPages={albumTotalPages}
                                        totalItems={albumImages.length}
                                        onPageChange={setAlbumPage}
                                        label="Bộ sưu tập"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: LỌC ẢNH --- */}
                    {activeTab === 'tool' && activeToolTab === 'filter' && (
                        <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 animate-in zoom-in-95 duration-500">
                            <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 space-y-6 md:space-y-10">
                                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">Lọc ảnh và chép sang thư mục mới</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                    <div onClick={selectSourceFolder} className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-4 md:gap-5 ${sourceHandle ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white'}`}>
                                        <Folder className="text-blue-600" size={24} />
                                        <p className="font-bold truncate text-slate-700 text-sm md:text-base">{sourceHandle ? sourceHandle.name : 'Chọn thư mục gốc'}</p>
                                    </div>
                                    <div onClick={selectDestFolder} className={`p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-4 md:gap-5 ${destHandle ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200 hover:border-green-400 hover:bg-white'}`}>
                                        <FolderDown className="text-green-600" size={24} />
                                        <p className="font-bold truncate text-slate-700 text-sm md:text-base">{destHandle ? destHandle.name : 'Chọn thư mục đích'}</p>
                                    </div>
                                </div>
                                <textarea className="w-full h-48 md:h-64 border-2 border-slate-100 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] outline-none focus:border-blue-500 transition-colors font-mono text-xs md:text-sm shadow-inner" placeholder="Dán danh sách tên ảnh..." value={filterText} onChange={e => setFilterText(e.target.value)} />
                                
                                {/* Lựa chọn đuôi file */}
                                <div className="space-y-3 bg-slate-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100">
                                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Đuôi file cần sao chép (ARW, CR3, JPG...)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'original', label: 'Giữ nguyên đuôi' },
                                            { id: 'arw', label: 'Sony (.ARW)' },
                                            { id: 'cr3', label: 'Canon (.CR3)' },
                                            { id: 'nef', label: 'Nikon (.NEF)' },
                                            { id: 'jpg', label: 'Ảnh gốc (.JPG)' },
                                            { id: 'custom', label: 'Đuôi tự chọn...' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setFilterTargetExt(opt.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${filterTargetExt === opt.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 shadow-sm'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {filterTargetExt === 'custom' && (
                                        <input
                                            type="text"
                                            value={filterCustomExt}
                                            onChange={e => setFilterCustomExt(e.target.value)}
                                            placeholder="Nhập đuôi file (ví dụ: png, cr2, raw...)"
                                            className="w-full mt-2 border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors text-xs md:text-sm font-bold bg-white"
                                        />
                                    )}
                                </div>

                                <button onClick={handleCopyFiles} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base">
                                    <Zap size={20} className="md:w-[22px] md:h-[22px]" /> Bắt đầu lọc và sao chép
                                </button>
                            </div>
                            {filterLogs.length > 0 && (
                                <div className="bg-slate-900 text-green-400 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] font-mono text-[10px] md:text-xs h-48 md:h-64 overflow-y-auto no-scrollbar border border-slate-800 animate-in fade-in duration-500">
                                    {filterLogs.map((log, idx) => <div key={idx} className="mb-1">{log}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: GALLERY (Chọn ảnh) --- */}
                    {activeTab === 'tool' && activeToolTab === 'gallery' && (
                        <div className="space-y-8 md:space-y-10 animate-in zoom-in-95 duration-500">
                            <div className="bg-white border border-slate-100 rounded-2xl md:rounded-[2rem] p-3.5 md:p-6 shadow-sm">
                                <div className="flex items-center justify-between gap-3 mb-3 md:mb-4 cursor-pointer select-none" onClick={() => setShowSavedPages(!showSavedPages)}>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm md:text-3xl font-bold font-sans text-slate-900">Các link chọn ảnh đã tạo</h2>
                                        {user && (
                                            <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                                                {savedClientPages.length}
                                            </span>
                                        )}
                                        {showSavedPages ? <ChevronUp className="w-5 h-5 md:w-6 md:h-6 text-slate-400" /> : <ChevronDown className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />}
                                    </div>
                                    {showSavedPages && (
                                        <div className="flex gap-2">
                                            {!user ? (
                                                <button onClick={(e) => { e.stopPropagation(); openClientAuth('login'); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5" /> Đăng nhập / đăng ký
                                                </button>
                                            ) : (
                                                <button onClick={(e) => { e.stopPropagation(); loadSavedClientPages(); }} className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-2">
                                                    <RefreshCcw className="w-3.5 h-3.5" /> Tải lại danh sách
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {showSavedPages && (
                                    <p className="text-xs md:text-sm text-slate-500 mb-4 -mt-2">Danh sách này lưu theo tài khoản Google đang đăng nhập.</p>
                                )}

                                {showSavedPages && !user && (
                                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                        <p className="text-sm text-slate-400 font-medium">Vui lòng đăng nhập để xem danh sách link đã tạo.</p>
                                    </div>
                                )}

                                {showSavedPages && user && savedClientPages.length === 0 && (
                                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                        <p className="text-sm text-slate-400 font-medium">Chưa có link chọn ảnh nào được tạo.</p>
                                    </div>
                                )}

                                {showSavedPages && user && savedClientPages.length > 0 && (
                                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                                        {Object.entries(getGroupedPagesByMonth(savedClientPages)).map(([month, pages]) => (
                                            <div key={month} className="space-y-3">
                                                <div className="flex items-center gap-2 border-b border-slate-100 pb-1 mt-2">
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{month}</h3>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{pages.length} link</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {pages.map(page => (
                                                        <div key={page.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col gap-3 hover:shadow-md hover:bg-white hover:border-blue-100 transition-all duration-300">
                                                            <div>
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <p className="font-bold text-slate-900 leading-snug">{getClientPageDisplayTitle(page)}</p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRenameClientPage(page)}
                                                                        className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                                                                        title="Đổi tên link chọn ảnh"
                                                                    >
                                                                        <Edit className="w-3 h-3" /> Sửa tên
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-1">{page.imageCount || 0} ảnh · {page.ownerEmail}</p>
                                                                <p className="font-mono text-xs text-blue-700 truncate mt-1">{page.link}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => {
                                                                    const pageFolders = page.folders && page.folders.length ? page.folders : [];
                                                                    const folderInput = pageFolders.length
                                                                        ? pageFolders.map(folder => folder.source || folder.id).filter(Boolean).join('\n')
                                                                        : (page.folderIds && page.folderIds.length ? page.folderIds : [page.folderId]).filter(Boolean).join('\n');
                                                                    fetchDrive(folderInput);
                                                                }} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-colors">Mở</button>
                                                                <button onClick={() => {
                                                                    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(page.link).then(() => alert('Đã copy link!'));
                                                                    else prompt('Copy link:', page.link);
                                                                }} className="flex-1 bg-slate-900 text-white rounded-xl px-3 py-2 text-xs font-bold hover:bg-blue-600 transition-colors">Copy</button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {loadedImages.length > 0 ? (
                                <>
                                    {clientFolders.length > 1 && (
                                        <div className="bg-white border border-slate-100 rounded-2xl p-2.5 md:p-4 shadow-sm">
                                            <div className="flex items-center justify-between gap-3 mb-2.5 md:mb-3">
                                                <div>
                                                    <h3 className="text-sm md:text-base font-bold text-slate-900">Folder con trong trang chọn ảnh</h3>
                                                    <p className="hidden sm:block text-xs text-slate-500">Bấm để chuyển qua lại giữa các folder. Ảnh đã chọn vẫn được lưu chung trong link này.</p>
                                                </div>
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{clientFolders.length} folder</span>
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                {clientFolders.map((folder, index) => (
                                                    <button
                                                        key={folder.id}
                                                        type="button"
                                                        onClick={() => handleSwitchClientFolder(folder.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-bold whitespace-nowrap transition-all ${activeClientFolderId === folder.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        {folder.name || `Folder ${index + 1}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Control Bar */}
                                    <div className="sticky top-2 md:top-20 z-30 bg-white/95 backdrop-blur-xl p-2 md:p-4 border border-slate-100 rounded-xl md:rounded-[2rem] flex flex-col justify-between gap-2 md:gap-4 shadow-xl">
                                        <div className="flex flex-row items-center justify-between w-full md:w-auto gap-2">
                                            {/* Info and Save state */}
                                            <div className="flex items-center gap-1.5 px-1 md:pl-2">
                                                <div className="flex items-center gap-1 text-pink-500 font-bold bg-pink-50 px-2.5 py-1.5 md:px-4 md:py-2 rounded-xl whitespace-nowrap text-xs md:text-base">
                                                    <Heart className="w-3.5 h-3.5 md:w-5 md:h-5 fill-current" /> <span>{effectiveSelectedImages.size}</span><span className="hidden sm:inline"> ảnh</span>
                                                </div>
                                                {isSaving ? (
                                                    <span className="text-[10px] md:text-xs text-slate-400 font-medium flex items-center gap-1">
                                                        <RefreshCcw className="w-3 h-3 animate-spin" />
                                                        <span className="hidden sm:inline">Đang lưu...</span>
                                                        <span className="sm:hidden">Lưu...</span>
                                                    </span>
                                                ) : saveError ? (
                                                    <span className="text-[10px] md:text-xs text-amber-500 font-medium flex items-center gap-1 cursor-help" title={`Đã lưu tạm thời trên thiết bị của bạn. Lỗi kết nối máy chủ: ${saveError}`}>
                                                        <CheckCircleIcon className="w-3.5 h-3.5 text-amber-500" />
                                                        <span className="hidden sm:inline">Đã lưu (Thiết bị)</span>
                                                        <span className="sm:hidden">Lưu thiết bị</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] md:text-xs text-green-500 font-medium flex items-center gap-1">
                                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                                        <span>Đã lưu</span>
                                                    </span>
                                                )}
                                            </div>

                                            {/* Bộ lọc theo người chọn */}
                                            {allSelections.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs md:text-sm">
                                                    <span className="text-slate-400 font-bold hidden lg:inline whitespace-nowrap">Người chọn:</span>
                                                    <select
                                                        value={selectedFilter}
                                                        onChange={(e) => setSelectedFilter(e.target.value)}
                                                        className="px-2.5 py-1.5 md:px-3 md:py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700 text-xs cursor-pointer max-w-[130px] md:max-w-[160px] truncate"
                                                    >
                                                        <option value="mine">Cá nhân (Bạn)</option>
                                                        <option value="all">Tất cả ({allSelections.length})</option>
                                                        {allSelections.map(sel => (
                                                            <option key={sel.userKey} value={sel.userKey}>
                                                                {sel.userName || sel.userEmail || 'Khách vãng lai'} ({sel.selectedIds?.length || 0})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            {/* Toggle View Mode */}
                                            <div className="flex bg-slate-100 p-0.5 md:p-1 rounded-xl">
                                                <button onClick={() => setShowOnlySelected(false)} className={`px-2.5 md:px-6 py-1 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${!showOnlySelected ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                                                    Tất cả<span className="hidden sm:inline"> ảnh</span>
                                                </button>
                                                <button onClick={() => setShowOnlySelected(true)} className={`px-2.5 md:px-6 py-1 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${showOnlySelected ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>
                                                    <span className="sm:hidden">Đã chọn</span>
                                                    <span className="hidden sm:inline">Chỉ ảnh đã chọn</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 w-full md:w-auto justify-start md:justify-end overflow-x-auto no-scrollbar pb-1 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0 scroll-smooth snap-x">
                                            {currentSelectionKey && (
                                                <button onClick={handleRefreshClientPage} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg md:px-4 md:py-2 md:rounded-xl text-xs md:text-sm font-bold transition-all text-slate-700 shadow-sm flex items-center justify-center flex-shrink-0 snap-start">
                                                    <RefreshCcw className="w-3.5 h-3.5 mr-1.5 text-blue-600 animate-pulse" /> <span>Làm mới Drive</span>
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                const names = Array.from(effectiveSelectedImages).map(id => loadedImages.find(img => img.id === id)?.name).filter(Boolean);
                                                if (navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(names.join('\n')).then(() => alert("Đã copy danh sách tên file!"));
                                                } else {
                                                    prompt("Copy danh sách:", names.join('\n'));
                                                }
                                            }} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg md:px-4 md:py-2 md:rounded-xl text-xs md:text-sm font-bold transition-all text-slate-700 shadow-sm flex items-center justify-center flex-shrink-0 snap-start">
                                                <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> <span>Copy Tên</span>
                                            </button>

                                            <button onClick={() => {
                                                const selectedList = Array.from(effectiveSelectedImages).map(id => {
                                                    const img = loadedImages.find(item => item.id === id);
                                                    if (!img) return null;
                                                    const note = effectiveImageNotes[id];
                                                    return note ? `${img.name} (Yêu cầu sửa: ${note})` : img.name;
                                                }).filter(Boolean);
                                                if (navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(selectedList.join('\n')).then(() => alert("Đã copy danh sách kèm ghi chú sửa ảnh!"));
                                                } else {
                                                    prompt("Copy danh sách kèm ghi chú:", selectedList.join('\n'));
                                                }
                                            }} className="bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg md:px-4 md:py-2 md:rounded-xl text-xs md:text-sm font-bold transition-all text-slate-700 shadow-sm flex items-center justify-center flex-shrink-0 snap-start">
                                                <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-pink-500" /> <span>Copy + Note</span>
                                            </button>

                                            <button onClick={handleDownloadAllOriginal} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg md:px-4 md:py-2 md:rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-shrink-0 snap-start">
                                                <FolderDown className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> <span>Tải tất cả</span>
                                            </button>

                                            <button onClick={generateSelectedImagesLink} className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 py-1.5 rounded-lg md:px-4 md:py-2 md:rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-shrink-0 snap-start">
                                                <LinkIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> <span>Link Chốt</span>
                                            </button>

                                            <button onClick={handleDownloadSelected} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg md:px-4 md:py-2 md:rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-shrink-0 snap-start">
                                                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> <span>Tải ảnh đã chọn</span>
                                            </button>
                                        </div>
                                    </div>

                                    <PaginationControls
                                        currentPage={safeGalleryPage}
                                        totalPages={galleryTotalPages}
                                        totalItems={displayedImages.length}
                                        onPageChange={setGalleryPage}
                                        label={showOnlySelected ? 'Ảnh đã chọn' : 'Trang chọn ảnh'}
                                    />

                                    {/* Grid Ảnh */}
                                    {displayedImages.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
                                            {paginatedDisplayedImages.map((img, idx) => {
                                                const isSelected = effectiveSelectedImages.has(img.id);
                                                const originalIndex = galleryStartIndex + idx;
                                                return (
                                                    <div key={img.id} className="flex flex-col gap-2">
                                                        <div className={`aspect-[3/4] relative group rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 transition-all duration-300 ${isSelected ? 'border-pink-500 shadow-xl shadow-pink-500/20 scale-[0.98]' : 'border-transparent hover:shadow-lg'}`}>
                                                        <img loading="lazy" decoding="async"
                                                            src={img.url || getDriveThumbUrl(img.id, 'w1200')}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                                                            alt={img.name || "Gallery"}
                                                            loading="lazy" decoding="async"
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => handleImageError(e, img)}
                                                            onClick={() => { setLightboxData({ isOpen: true, index: originalIndex, images: displayedImages }); }}
                                                        />

                                                        {/* Nút thả tim to */}
                                                        <div
                                                            onClick={(e) => toggleImageSelect(img.id, e)}
                                                            className={`absolute bottom-2 right-2 md:bottom-3 md:right-3 w-10 h-10 md:w-12 md:h-12 cursor-pointer rounded-full flex items-center justify-center backdrop-blur-md transition-all ${isSelected ? 'bg-pink-500 text-white scale-110 shadow-lg' : 'bg-black/40 text-white/80 hover:bg-pink-500/80 hover:text-white md:hover:scale-110'}`}
                                                        >
                                                            <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isSelected ? 'fill-current' : ''}`} />
                                                        </div>

                                                        {/* Nút tải từng ảnh gốc - không watermark */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDownloadOriginalImage(img, e)}
                                                            className="absolute bottom-2 left-2 md:bottom-3 md:left-3 w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-md flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                                                            title="Tải file gốc"
                                                        >
                                                            <Download className="w-4 h-4 md:w-5 md:h-5" />
                                                        </button>

                                                        {/* Nút viết note/ghi chú */}
                                                        {isSelected && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openImageNoteModal(img);
                                                                }}
                                                                className={`absolute top-1 right-1 md:top-2 md:right-2 w-7 h-7 md:w-9 md:h-9 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center transition-all ${effectiveImageNotes[img.id] ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-white/90 text-slate-800 hover:bg-pink-500 hover:text-white'}`}
                                                                title="Thêm yêu cầu sửa ảnh"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                                            </button>
                                                        )}

                                                        {/* Tên ảnh */}
                                                        <div className="absolute top-1 left-1 right-1 md:top-2 md:left-2 md:right-2 flex justify-between pointer-events-none">
                                                            <span className="bg-black/50 text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md backdrop-blur-sm truncate" title={img.name || `Ảnh ${originalIndex + 1}`}>
                                                                {img.name || `Ảnh ${originalIndex + 1}`}
                                                            </span>
                                                        </div>
                                                        </div>

                                                        {/* Ghi chú chỉnh sửa dưới ảnh */}
                                                        {isSelected && effectiveImageNotes[img.id] && (
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openImageNoteModal(img);
                                                                }}
                                                                className="bg-pink-50 border border-pink-100 rounded-xl p-2 md:p-2.5 text-[10px] md:text-xs text-pink-700 font-semibold leading-relaxed break-words shadow-sm hover:bg-pink-100/80 cursor-pointer transition-all animate-in slide-in-from-bottom duration-300 flex justify-between items-start gap-1"
                                                                title="Bấm để sửa ghi chú"
                                                            >
                                                                <div className="flex-1">
                                                                    <span className="font-bold block text-[8px] md:text-[9px] text-pink-400 uppercase tracking-widest mb-0.5">Yêu cầu sửa:</span>
                                                                    {effectiveImageNotes[img.id]}
                                                                </div>
                                                                <Edit className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                                                            </div>
                                                        )}

                                                        {isSelected && !effectiveImageNotes[img.id] && showOnlySelected && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openImageNoteModal(img);
                                                                }}
                                                                className="w-full text-center py-2 border border-dashed border-slate-200 hover:border-pink-300 hover:text-pink-600 rounded-xl text-[10px] md:text-xs font-bold text-slate-400 transition-all bg-white shadow-sm flex items-center justify-center gap-1"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" /> Ghi chú sửa ảnh
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16 md:py-20 bg-white rounded-2xl md:rounded-3xl border border-dashed border-slate-200 mx-2">
                                            <Heart className="w-12 h-12 md:w-16 md:h-16 mx-auto text-pink-200 mb-4" />
                                            <p className="text-slate-500 font-medium text-sm md:text-base">Bạn chưa chọn bức ảnh nào.</p>
                                        </div>
                                    )}

                                    {displayedImages.length > 0 && (
                                        <PaginationControls
                                            currentPage={safeGalleryPage}
                                            totalPages={galleryTotalPages}
                                            totalItems={displayedImages.length}
                                            onPageChange={setGalleryPage}
                                            label={showOnlySelected ? 'Ảnh đã chọn' : 'Trang chọn ảnh'}
                                        />
                                    )}
                                </>
                            ) : (
                                currentFolderId ? (
                                    <div className="text-center py-20 md:py-40 bg-white rounded-[2rem] md:rounded-[3rem] border border-dashed border-pink-200 shadow-sm mx-2 space-y-4">
                                        <AlertCircle size={48} className="mx-auto text-pink-500 animate-bounce" />
                                        <h3 className="text-xl font-bold text-slate-900">Không tìm thấy ảnh hoặc thư mục chưa chia sẻ</h3>
                                        <p className="text-slate-500 font-medium text-sm md:text-base max-w-md mx-auto px-4 leading-relaxed">
                                            Thư mục hình ảnh hiện chưa được bật quyền chia sẻ công khai (**Bất kỳ ai có liên kết đều có thể xem**) hoặc liên kết đã bị thay đổi. Vui lòng liên hệ với **Merci Studio** để được hỗ trợ kiểm tra lại!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 md:py-40 bg-white rounded-[2rem] md:rounded-[3rem] border border-dashed border-slate-200 shadow-sm mx-2">
                                        <ImageIcon size={48} className="mx-auto text-slate-300 mb-4 opacity-40" />
                                        <p className="text-slate-400 font-medium text-sm md:text-base px-4">Vui lòng dán link Drive vào mục "Tạo trang" để xem ảnh.</p>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* --- TAB: ADMIN DASHBOARD THỐNG KÊ --- */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 md:space-y-12">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Merci Studio Analytics</p>
                                    <h2 className="text-2xl md:text-4xl font-bold font-sans text-slate-900 mt-1">Thống Kê Hoạt Động</h2>
                                    <p className="text-slate-500 text-sm mt-1">Theo dõi hoạt động truy cập và hiệu quả của các chuyên mục.</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-xs md:text-sm font-bold text-blue-700">
                                    Chế độ Admin: Thống kê thời gian thực
                                </div>
                            </div>

                            {!isAdmin ? (
                                <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
                                    <p className="text-slate-900 font-bold text-lg">Từ chối truy cập</p>
                                    <p className="text-slate-400 text-sm mt-1">Bạn cần đăng nhập bằng tài khoản Admin để xem thống kê.</p>
                                    <button onClick={() => openClientAuth('login')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                                        Đăng nhập Admin
                                    </button>
                                </div>
                            ) : isLoadingSessions ? (
                                <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                                    <RefreshCcw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                                    <p className="text-slate-500 font-bold">Đang tải dữ liệu thống kê...</p>
                                </div>
                            ) : (
                                <AnalyticsDashboard sessions={sessions} bookings={bookings} albums={albums} getDriveThumbUrl={getDriveThumbUrl} />
                            )}
                        </div>
                    )}

                    {/* --- TAB: ADMIN PROMOTION --- */}
                    {activeTab === 'promotion' && (
                        <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Merci Studio Promotion</p>
                                    <h2 className="text-2xl md:text-4xl font-bold font-sans text-slate-900 mt-1">Chương Trình Khuyến Mãi</h2>
                                    <p className="text-slate-500 text-sm mt-1">Chương trình khuyến mãi nháp dành riêng cho Admin cấu hình.</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-xs md:text-sm font-bold text-blue-700">
                                    Chế độ Admin: Quản lý khuyến mãi
                                </div>
                            </div>

                            {!isAdmin ? (
                                <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
                                    <p className="text-slate-900 font-bold text-lg">Từ chối truy cập</p>
                                    <p className="text-slate-400 text-sm mt-1">Bạn cần đăng nhập bằng tài khoản Admin để quản lý khuyến mãi.</p>
                                    <button onClick={() => openClientAuth('login')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                                        Đăng nhập Admin
                                    </button>
                                </div>
                            ) : (
                                <PromotionManager />
                            )}
                        </div>
                    )}

                    {/* --- TAB: ĐẶT LỊCH / BÁO GIÁ --- */}
                    {activeTab === 'booking' && (
                        <div className="space-y-8 md:space-y-12">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Merci Studio Booking</p>
                                    <h2 className="text-2xl md:text-4xl font-bold font-sans text-slate-900 mt-1">Đặt Lịch &amp; Tư Vấn</h2>
                                    <p className="text-slate-500 text-sm mt-1">Hãy để Merci Studio đồng hành và ghi lại những khoảnh khắc tuyệt vời nhất của bạn.</p>
                                </div>
                                {isAdmin && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2 text-xs md:text-sm font-bold text-blue-700">
                                        Chế độ Admin: Quản lý danh sách đặt lịch
                                    </div>
                                )}
                            </div>

                            {/* Main Content Area */}
                            {isAdmin ? (
                                /* ADMIN BOOKING MANAGEMENT */
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng lượt đặt</p>
                                            <p className="text-3xl font-black text-slate-900 mt-1">{bookings.length}</p>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chưa xử lý</p>
                                            <p className="text-3xl font-black text-amber-600 mt-1">{bookings.filter(b => b.status === 'Chưa xử lý').length}</p>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đã tư vấn</p>
                                            <p className="text-3xl font-black text-emerald-600 mt-1">{bookings.filter(b => b.status === 'Đã tư vấn').length}</p>
                                        </div>
                                    </div>

                                    {bookings.length > 0 ? (
                                        <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                            <th className="px-6 py-4">Khách hàng</th>
                                                            <th className="px-6 py-4">Thông tin liên hệ</th>
                                                            <th className="px-6 py-4">Dịch vụ &amp; Ngày</th>
                                                            <th className="px-6 py-4">Ghi chú</th>
                                                            <th className="px-6 py-4">Trạng thái</th>
                                                            <th className="px-6 py-4 text-right">Thao tác</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                                                        {[...bookings].sort((a,b) => b.createdAt - a.createdAt).map((b) => (
                                                            <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-5">
                                                                    <p className="font-bold text-slate-900 text-base">{b.name}</p>
                                                                    <p className="text-xs text-slate-400 mt-0.5">ID: {b.id}</p>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <div className="flex items-center gap-1.5 text-blue-600 font-bold hover:underline">
                                                                        <Phone size={14} />
                                                                        <a href={`tel:${b.phone}`}>{b.phone}</a>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full text-xs font-bold block w-fit">
                                                                        {b.service}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1.5">
                                                                        <Calendar size={13} />
                                                                        <span>{b.date}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 max-w-xs truncate font-normal text-slate-500" title={b.notes}>
                                                                    {b.notes}
                                                                </td>
                                                                <td className="px-6 py-5">
                                                                    <button
                                                                        onClick={() => handleUpdateBookingStatus(b.id, b.status)}
                                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                                                            b.status === 'Đã tư vấn'
                                                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                        }`}
                                                                        title="Nhấp để đổi trạng thái"
                                                                    >
                                                                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Đã tư vấn' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
                                                                        {b.status}
                                                                    </button>
                                                                </td>
                                                                <td className="px-6 py-5 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => handleUpdateBookingStatus(b.id, b.status)}
                                                                            className="bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 p-2 rounded-xl transition-all"
                                                                            title="Đổi trạng thái xử lý"
                                                                        >
                                                                            <RefreshCcw size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteBooking(b.id)}
                                                                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all"
                                                                            title="Xóa yêu cầu"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-200">
                                            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3 opacity-50" />
                                            <p className="text-slate-400 font-medium">Chưa có lượt đặt lịch nào từ khách hàng.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* CLIENT BOOKING FORM */
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-500">
                                    {/* Left Side: Text and Premium Cards */}
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="bg-gradient-to-tr from-slate-900 to-blue-950 text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden">
                                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl"></div>
                                            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl"></div>
                                            
                                            <h3 className="text-2xl font-bold font-serif mb-4">Lý do chọn Merci Studio?</h3>
                                            <ul className="space-y-4 text-slate-300 text-sm font-medium">
                                                <li className="flex items-start gap-3">
                                                    <div className="p-1 rounded-lg bg-white/10 text-blue-400 shrink-0 mt-0.5">
                                                        <Zap size={16} />
                                                    </div>
                                                    <span><strong>Chuyên Nghiệp:</strong> Ekip phục vụ tận tâm, dày dặn kinh nghiệm trong các sự kiện lớn nhỏ.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <div className="p-1 rounded-lg bg-white/10 text-blue-400 shrink-0 mt-0.5">
                                                        <Camera size={16} />
                                                    </div>
                                                    <span><strong>Màu Ảnh Độc Bản:</strong> Tone màu sang trọng, tự nhiên được thiết kế riêng cho mỗi concept.</span>
                                                </li>
                                                <li className="flex items-start gap-3">
                                                    <div className="p-1 rounded-lg bg-white/10 text-blue-400 shrink-0 mt-0.5">
                                                        <Wand2 size={16} />
                                                    </div>
                                                    <span><strong>Bảo Mật &amp; Tiện Lợi:</strong> Nhận ảnh, chọn ảnh online tiện lợi với mã bảo mật an toàn.</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm space-y-6">
                                            <h4 className="text-lg font-black text-slate-900">Liên hệ trực tiếp</h4>
                                            <div className="space-y-6">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Phone size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Hotline tư vấn</p>
                                                        <div className="text-sm font-black text-slate-800 space-y-1 mt-0.5">
                                                            <p><a href="tel:0888999545" className="hover:text-blue-600 transition-colors">0888.999.545</a></p>
                                                            <p><a href="tel:0877999545" className="hover:text-blue-600 transition-colors">0877.999.545</a></p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Hệ thống cơ sở</p>
                                                        <div className="text-sm font-black text-slate-800 space-y-3 mt-1.5">
                                                            <div>
                                                                <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Cơ sở 1</p>
                                                                <p className="font-sans text-slate-700 font-bold text-xs mt-0.5">244 Đội Cấn - Ba Đình - Hà Nội</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Cơ sở 2</p>
                                                                <p className="font-sans text-slate-700 font-bold text-xs mt-0.5">650 Thân Nhân Trung - Việt Yên - Bắc Ninh</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Form */}
                                    <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-10 shadow-lg relative overflow-hidden">
                                        <form onSubmit={handleCreateBooking} className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Họ và tên *</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                        <User size={18} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="VD: Nguyễn Văn A"
                                                        value={bookingForm.name}
                                                        onChange={e => setBookingForm(prev => ({ ...prev, name: e.target.value }))}
                                                        className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-800 bg-slate-50/50"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Số điện thoại *</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                            <Phone size={18} />
                                                        </div>
                                                        <input
                                                            type="tel"
                                                            required
                                                            placeholder="VD: 09xxxxxxxx"
                                                            value={bookingForm.phone}
                                                            onChange={e => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                                                            className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-800 bg-slate-50/50"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Ngày dự kiến chụp</label>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                            <Calendar size={18} />
                                                        </div>
                                                        <input
                                                            type="date"
                                                            value={bookingForm.date}
                                                            onChange={e => setBookingForm(prev => ({ ...prev, date: e.target.value }))}
                                                            className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-800 bg-slate-50/50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Dịch vụ quan tâm *</label>
                                                <select
                                                    value={bookingForm.service}
                                                    onChange={e => setBookingForm(prev => ({ ...prev, service: e.target.value }))}
                                                    className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-colors font-semibold text-slate-800 bg-slate-50/50 appearance-none cursor-pointer"
                                                    style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 16px center', backgroundRepeat: 'no-repeat', backgroundSize: '16px' }}
                                                >
                                                    <option value="Chụp ảnh cưới (Wedding)">Chụp ảnh cưới (Wedding)</option>
                                                    <option value="Chụp ảnh ngoại cảnh / couple">Chụp ngoại cảnh / couple</option>
                                                    <option value="Phóng sự cưới (Pre-wedding)">Phóng sự cưới (Pre-wedding)</option>
                                                    <option value="Kỷ yếu / Sự kiện / Graduation">Kỷ yếu / Sự kiện / Graduation</option>
                                                    <option value="Dịch vụ khác / Cần tư vấn thêm">Dịch vụ khác / Cần tư vấn thêm</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Ghi chú yêu cầu riêng</label>
                                                <textarea
                                                    rows={4}
                                                    placeholder="Hãy cho Merci biết thêm về ý tưởng chụp, địa điểm mong muốn hoặc các lưu ý khác..."
                                                    value={bookingForm.notes}
                                                    onChange={e => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                                                    className="w-full px-4 py-3.5 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-800 bg-slate-50/50 resize-none"
                                                ></textarea>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmittingBooking}
                                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.99] hover:shadow-xl transition-all flex items-center justify-center gap-2 text-base disabled:opacity-50"
                                            >
                                                {isSubmittingBooking ? (
                                                    <>
                                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                                        <span>Đang gửi yêu cầu...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Wand2 className="w-5 h-5" />
                                                        <span>Gửi yêu cầu &amp; Đăng ký tư vấn</span>
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* LIGHTBOX FOR GALLERY & ALBUMS */}
            <ImageLightbox
                lightboxData={lightboxData}
                setLightboxData={setLightboxData}
                touchStart={touchStart}
                setTouchStart={setTouchStart}
                touchEnd={touchEnd}
                setTouchEnd={setTouchEnd}
                nextImg={nextImg}
                prevImg={prevImg}
                getDriveThumbUrl={getDriveThumbUrl}
                direction={lightboxDirection}
                showFileName={activeTab === 'tool' && activeToolTab === 'gallery'}
                effectiveSelectedImages={effectiveSelectedImages}
                toggleImageSelect={toggleImageSelect}
            />

            {/* LIGHTBOX FOR YOUTUBE VIDEOS */}
            <VideoLightbox videoModal={videoModal} setVideoModal={setVideoModal} />
            <div className="fixed right-4 bottom-5 z-50 flex flex-col gap-2">
                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-slate-900 text-white shadow-xl flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all"
                    aria-label="Lên đầu trang"
                    title="Lên đầu trang"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>

                <button
                    type="button"
                    onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
                    className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-white text-slate-900 border border-slate-200 shadow-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 active:scale-95 transition-all"
                    aria-label="Xuống cuối trang"
                    title="Xuống cuối trang"
                >
                    <ArrowDown className="w-5 h-5" />
                </button>
            </div>

            {/* POPUP VÒNG QUAY MAY MẮN CHO KHÁCH HÀNG */}
            <LuckyWheelPopup />

        </div>
    );
}
