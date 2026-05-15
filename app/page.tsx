'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Camera, Wand2, Copy, ArrowRight, CloudUpload, Heart, 
    Download, Image as ImageIcon, ArrowDown, RefreshCcw, Zap, ArrowLeft,
    MapPin, Phone, Mail, Instagram, Plus, X, Link as LinkIcon,
    Lock, User, Folder, FolderDown, CheckCircle2, AlertCircle
} from 'lucide-react';

// === FIREBASE IMPORTS ===
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Cấu hình Firebase đọc từ .env.local
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Khởi tạo Firebase an toàn cho Next.js
let app, auth: any, db: any;
if (typeof window !== 'undefined') {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// Component Icon Facebook tùy chỉnh
const FacebookIcon = ({ className }: { className?: string }) => (
    <svg 
        className={className} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
    >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);

export default function App() {
    // === STATES ===
    const [mounted, setMounted] = useState(false); 
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('home'); 
    const [isClientMode, setIsClientMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Đang tải dữ liệu...');
    
    const [driveLink, setDriveLink] = useState('');
    const [clientLink, setClientLink] = useState('');
    
    const [loadedImages, setLoadedImages] = useState<any[]>([]);
    const [selectedImages, setSelectedImages] = useState(new Set());
    
    const [albums, setAlbums] = useState<any[]>([]);
    const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState('Tất cả');
    const [albumDriveLink, setAlbumDriveLink] = useState(''); 
    const categories = ['Tất cả', 'Váy cưới', 'Ảnh cưới', 'Ảnh concept', 'Gia đình', 'Khác'];

    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [newAlbum, setNewAlbum] = useState({ title: '', sub: '', category: 'Váy cưới', coverUrl: '' });

    const [lightboxData, setLightboxData] = useState({ isOpen: false, index: 0 });
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');

    // === FILTER TAB STATES ===
    const [filterText, setFilterText] = useState('');
    const [sourceHandle, setSourceHandle] = useState<any>(null);
    const [destHandle, setDestHandle] = useState<any>(null);
    const [filterExtension, setFilterExtension] = useState('Tất cả');
    const [filterLogs, setFilterLogs] = useState<string[]>([]);
    const [matchedFiles, setMatchedFiles] = useState<any[]>([]);
    const [filterInputCount, setFilterInputCount] = useState(0);

    // === EFFECTS ===
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !auth) return;
        signInAnonymously(auth).catch(e => console.error("Firebase Auth Error:", e));
        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
    }, [mounted]);

    useEffect(() => {
        if (!mounted) return;
        const localData = localStorage.getItem('merci_albums_local');
        if (localData) setAlbums(JSON.parse(localData));
        if (!user || !db) return;
        const albumsRef = collection(db, 'merci_albums');
        const unsubscribe = onSnapshot(albumsRef, (snapshot) => {
            if (!snapshot.empty) {
                const fetchedAlbums: any[] = [];
                snapshot.forEach(document => {
                    fetchedAlbums.push({ id: document.id, ...document.data() });
                });
                fetchedAlbums.sort((a, b) => b.id.localeCompare(a.id));
                setAlbums(fetchedAlbums);
                localStorage.setItem('merci_albums_local', JSON.stringify(fetchedAlbums));
            }
        });
        return () => unsubscribe();
    }, [mounted, user]);

    // Keyboard Lightbox
    const nextLightboxImage = useCallback(() => {
        const currentAlbum = albums.find(a => a.id === activeAlbumId);
        const imgs = currentAlbum?.images || [];
        if (imgs.length === 0) return;
        setLightboxData(prev => ({ ...prev, index: (prev.index + 1) % imgs.length }));
    }, [albums, activeAlbumId]);

    const prevLightboxImage = useCallback(() => {
        const currentAlbum = albums.find(a => a.id === activeAlbumId);
        const imgs = currentAlbum?.images || [];
        if (imgs.length === 0) return;
        setLightboxData(prev => ({ ...prev, index: (prev.index - 1 + imgs.length) % imgs.length }));
    }, [albums, activeAlbumId]);

    const closeLightbox = useCallback(() => {
        setLightboxData({ isOpen: false, index: 0 });
        document.body.style.overflow = 'auto';
    }, []);

    useEffect(() => {
        if (!lightboxData.isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextLightboxImage();
            if (e.key === 'ArrowLeft') prevLightboxImage();
            if (e.key === 'Escape') closeLightbox();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxData.isOpen, nextLightboxImage, prevLightboxImage, closeLightbox]);

    useEffect(() => {
        if (!mounted) return;
        if (localStorage.getItem('merci_admin_logged_in') === 'true') setIsAdmin(true);
    }, [mounted]);

    // === OPTIMIZATION HELPERS ===
    const resizeImage = (file: File, maxWidth: number, quality: number): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = (maxWidth / width) * height;
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
        });
    };

    // === CORE HELPERS ===
    const saveAlbumData = async (albumData: any) => {
        const updatedAlbums = albums.some(a => a.id === albumData.id)
            ? albums.map(a => a.id === albumData.id ? albumData : a)
            : [albumData, ...albums];
        setAlbums(updatedAlbums);
        localStorage.setItem('merci_albums_local', JSON.stringify(updatedAlbums));
        if (user && db) {
            try {
                await setDoc(doc(db, 'merci_albums', albumData.id), albumData);
            } catch (e) { console.error("Cloud Save Error:", e); }
        }
    };

    const extractFolderId = (link: string) => {
        try {
            let url = new URL(link);
            let pathParts = url.pathname.split('/');
            let foldersIndex = pathParts.indexOf('folders');
            if (foldersIndex !== -1 && pathParts.length > foldersIndex + 1) return pathParts[foldersIndex + 1];
            if (url.searchParams.has('id')) return url.searchParams.get('id');
            return null;
        } catch (e) { return link.length > 15 ? link : null; }
    };

    const fetchImagesFromDrive = async (folderId: string) => {
        if(!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");
        setIsLoading(true);
        setLoadingMessage('Đang tải ảnh...');
        const query = `'${folderId}'+in+parents+and+mimeType+contains+'image/'`;
        const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${GOOGLE_API_KEY}&fields=files(id,name,thumbnailLink,webContentLink)&pageSize=100&orderBy=name`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.files && data.files.length > 0) {
                const imgs = data.files.map((file: any) => ({
                    id: file.id, name: file.name,
                    url: file.thumbnailLink?.replace('=s220', '=w600'),
                    originalUrl: file.thumbnailLink?.replace('=s220', '=s0'),
                    downloadUrl: file.webContentLink
                }));
                setLoadedImages(imgs);
            }
        } catch (error) { console.error(error); } 
        finally { setIsLoading(false); }
    };

    const handleLocalFileUpload = async (e: any) => {
        if (!activeAlbumId) return;
        const files = Array.from(e.target.files) as File[];
        if (files.length === 0) return;
        setIsLoading(true);
        setLoadingMessage('Đang tối ưu hóa ảnh...');
        try {
            const newImgs = await Promise.all(files.map(async (file) => {
                const previewUrl = await resizeImage(file, 800, 0.7);
                const originalUrl = await resizeImage(file, 1600, 0.85);
                return {
                    id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: file.name, url: previewUrl, originalUrl: originalUrl, downloadUrl: originalUrl
                };
            }));
            const current = albums.find(a => a.id === activeAlbumId);
            const updated = { ...current, images: [...newImgs, ...(current.images || [])] };
            if (newImgs.length > 0 && updated.coverUrl.includes('unsplash')) updated.coverUrl = newImgs[0].url;
            await saveAlbumData(updated);
        } catch (error) { alert("Lỗi xử lý ảnh."); } 
        finally { setIsLoading(false); e.target.value = ''; }
    };

    const handleLogin = (e: any) => {
        e.preventDefault();
        if (loginData.username === 'khiemnguyendanh' && loginData.password === 'Merci@2026') {
            setIsAdmin(true); setShowLoginModal(false);
            localStorage.setItem('merci_admin_logged_in', 'true');
        } else { setLoginError('Sai tài khoản!'); }
    };

    const saveNewAlbum = async () => {
        if (!newAlbum.title) return alert("Vui lòng nhập tên album!");
        setIsLoading(true);
        const createdAlbum = {
            id: `album_${Date.now()}`, title: newAlbum.title, sub: newAlbum.sub || '',
            category: newAlbum.category, coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
            images: []
        };
        await saveAlbumData(createdAlbum);
        setIsCreatingAlbum(false);
        setIsLoading(false);
    };

    // === PHOTO FILTER LOGIC ===
    const selectSourceFolder = async () => {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            setSourceHandle(handle);
            setFilterLogs(prev => [`📁 Đã chọn thư mục nguồn: ${handle.name}`, ...prev]);
        } catch (e) { console.error(e); }
    };

    const selectDestFolder = async () => {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            setDestHandle(handle);
            setFilterLogs(prev => [`📂 Đã chọn thư mục đích: ${handle.name}`, ...prev]);
        } catch (e) { console.error(e); }
    };

    const handleScanFiles = async () => {
        if (!sourceHandle) return alert("Vui lòng chọn thư mục nguồn!");
        if (!filterText.trim()) return alert("Vui lòng dán danh sách tên ảnh!");

        setIsLoading(true);
        setLoadingMessage('Đang quét thư mục...');
        setFilterLogs(prev => [`🔍 Bắt đầu quét thư mục...`, ...prev]);

        const namesToFilter = filterText.split('\n')
            .map(n => n.trim())
            .filter(n => n !== '');
        
        setFilterInputCount(namesToFilter.length);
        const matched: any[] = [];

        try {
            // Duyệt qua toàn bộ file trong thư mục nguồn
            for await (const entry of sourceHandle.values()) {
                if (entry.kind === 'file') {
                    const fileName = entry.name;
                    const fileNameNoExt = fileName.replace(/\.[^/.]+$/, "");
                    
                    // Kiểm tra xem tên file có trong danh sách dán vào không
                    // So sánh cả có đuôi và không đuôi, không phân biệt hoa thường
                    const isMatched = namesToFilter.some(targetName => {
                        const targetNoExt = targetName.replace(/\.[^/.]+$/, "");
                        return fileName.toLowerCase() === targetName.toLowerCase() || 
                               fileNameNoExt.toLowerCase() === targetNoExt.toLowerCase();
                    });

                    if (isMatched) {
                        // Kiểm tra định dạng nếu có chọn filter đuôi
                        if (filterExtension === 'Tất cả' || fileName.toLowerCase().endsWith(filterExtension.toLowerCase())) {
                            matched.push(entry);
                        }
                    }
                }
            }
            setMatchedFiles(matched);
            setFilterLogs(prev => [`✅ Đã quét xong. Tìm thấy ${matched.length} ảnh khớp.`, ...prev]);
        } catch (e) {
            alert("Lỗi khi quét thư mục.");
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyFiles = async () => {
        if (!destHandle) return alert("Vui lòng chọn thư mục đích!");
        if (matchedFiles.length === 0) return alert("Chưa có ảnh nào được quét khớp!");

        setIsLoading(true);
        setLoadingMessage('Đang sao chép file...');
        let successCount = 0;

        try {
            for (const fileHandle of matchedFiles) {
                const file = await fileHandle.getFile();
                // @ts-ignore
                const newFileHandle = await destHandle.getFileHandle(fileHandle.name, { create: true });
                // @ts-ignore
                const writable = await newFileHandle.createWritable();
                await writable.write(file);
                await writable.close();
                successCount++;
                setFilterLogs(prev => [`➡️ Đã chép: ${fileHandle.name}`, ...prev]);
            }
            alert(`Thành công! Đã sao chép ${successCount} ảnh sang thư mục mới.`);
            setFilterLogs(prev => [`🌟 HOÀN TẤT: Đã sao chép ${successCount} file.`, ...prev]);
        } catch (e) {
            console.error(e);
            alert("Lỗi trong quá trình sao chép. Hãy đảm bảo bạn đã cấp quyền ghi cho thư mục đích.");
        } finally {
            setIsLoading(false);
        }
    };

    // === RENDERERS ===
    if (!mounted) return <div className="min-h-screen bg-slate-50" />;

    const filteredAlbums = activeCategory === 'Tất cả' ? albums : albums.filter(a => a.category === activeCategory);

    return (
        <div className="font-sans text-slate-800 antialiased min-h-screen bg-slate-50 flex flex-col transition-colors duration-500">
            <style dangerouslySetInnerHTML={{__html: `
                .masonry-grid { column-count: 1; column-gap: 1rem; }
                @media (min-width: 640px) { .masonry-grid { column-count: 2; } }
                @media (min-width: 1024px) { .masonry-grid { column-count: 3; } }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .lightbox-image { transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease; }
            `}} />

            {isLoading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in">
                    <RefreshCcw className="animate-spin w-10 h-10 text-blue-600 mb-2" />
                    <p className="font-bold text-slate-600">{loadingMessage}</p>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
                        <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                            <Camera className="text-white" size={20} />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900" style={{fontFamily:'serif'}}>Merci Studio</h1>
                    </div>
                    
                    <nav className="flex bg-slate-100/50 p-1 rounded-full overflow-x-auto max-w-full no-scrollbar border border-slate-200/50">
                        {['home', 'create', 'collection', 'gallery', 'filter'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => {setActiveTab(t); setActiveAlbumId(null);}} 
                                className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${activeTab === t ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                {t === 'home' ? 'Trang chủ' : t === 'create' ? 'Tạo trang' : t === 'collection' ? 'Bộ sưu tập' : t === 'gallery' ? 'Chọn ảnh' : 'Lọc ảnh'}
                            </button>
                        ))}
                    </nav>

                    <div className="hidden md:flex items-center gap-2">
                        {isAdmin ? (
                            <div className="flex items-center gap-2 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-colors" onClick={() => {setIsAdmin(false); localStorage.removeItem('merci_admin_logged_in');}}>
                                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Admin</span>
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-inner">M</div>
                            </div>
                        ) : (
                            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-all px-4 py-2 hover:bg-slate-50 rounded-xl"><User size={18}/> Đăng nhập</button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                    {/* --- TAB: HOME --- */}
                    {activeTab === 'home' && (
                        <div>
                            <div className="relative h-[60vh] flex items-center justify-center bg-slate-900 overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1600" className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105" />
                                <div className="relative text-center text-white px-4 max-w-3xl">
                                    <span className="inline-block bg-blue-500/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold tracking-[0.2em] mb-4 border border-white/20 uppercase">Merci Wedding Studio</span>
                                    <h2 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-2xl" style={{fontFamily:'serif'}}>Lưu giữ khoảnh khắc</h2>
                                    <button onClick={() => setActiveTab('collection')} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-blue-600 hover:text-white transition-all transform active:scale-95">Khám phá Bộ sưu tập</button>
                                </div>
                            </div>
                            <div className="max-w-7xl mx-auto p-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { icon: <MapPin className="text-blue-600" />, title: "Hà Nội", desc: "244 Đội Cấn, Ba Đình" },
                                    { icon: <MapPin className="text-blue-600" />, title: "Bắc Ninh", desc: "650 Thân Nhân Trung, Việt Yên" },
                                    { icon: <Phone className="text-green-600" />, title: "Hotline", desc: "0888.999.545" }
                                ].map((item, i) => (
                                    <div key={i} className="p-8 bg-white rounded-[2rem] shadow-sm border border-slate-100 text-center hover:shadow-xl transition-all">
                                        <div className="mx-auto mb-4 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">{item.icon}</div>
                                        <h4 className="font-bold text-xl mb-1">{item.title}</h4>
                                        <p className="text-sm text-slate-500">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`max-w-7xl mx-auto p-6 md:p-12 ${activeTab === 'home' ? 'hidden' : ''}`}>
                        {/* --- TAB: TẠO TRANG --- */}
                        {activeTab === 'create' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                                <div className="space-y-8 animate-in slide-in-from-left duration-700">
                                    <h2 className="text-5xl font-bold leading-tight">Gửi album chọn ảnh <span className="text-blue-500">ngay lập tức.</span></h2>
                                    <p className="text-slate-500 text-xl">Tiết kiệm thời gian cho Studio và Khách hàng.</p>
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                                        <input value={driveLink} onChange={e => setDriveLink(e.target.value)} type="text" placeholder="Dán link folder Google Drive..." className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500" />
                                        <button onClick={() => {
                                            const id = extractFolderId(driveLink);
                                            if(id) setClientLink(`${window.location.origin}?folder=${id}`);
                                        }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold shadow-lg">Tạo link gửi khách</button>
                                    </div>
                                    {clientLink && (
                                        <div className="bg-blue-50 p-5 rounded-2xl flex items-center justify-between border border-blue-100">
                                            <span className="text-xs font-mono text-blue-700 truncate mr-4">{clientLink}</span>
                                            <button onClick={() => {navigator.clipboard.writeText(clientLink); alert("Đã copy!");}} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold">Copy Link</button>
                                        </div>
                                    )}
                                </div>
                                <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800" className="rounded-[3rem] shadow-2xl" />
                            </div>
                        )}

                        {/* --- TAB: BỘ SƯU TẬP --- */}
                        {activeTab === 'collection' && (
                            <div>
                                {!activeAlbumId ? (
                                    <>
                                        <div className="flex justify-between items-center mb-12">
                                            <h2 className="text-4xl font-bold" style={{fontFamily:'serif'}}>Bộ Sưu Tập</h2>
                                            {isAdmin && <button onClick={() => setIsCreatingAlbum(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg"><Plus size={20}/> Album mới</button>}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                                            {filteredAlbums.map(a => (
                                                <div key={a.id} onClick={() => setActiveAlbumId(a.id)} className="group cursor-pointer">
                                                    <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-6 bg-slate-200 relative shadow-md hover:shadow-2xl transition-all duration-500">
                                                        <img src={a.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                                                        <div className="absolute bottom-6 left-6 right-6 text-white">
                                                            <h3 className="text-2xl font-bold" style={{fontFamily:'serif'}}>{a.title}</h3>
                                                            <p className="text-xs font-medium opacity-80 mt-1">{a.images?.length || 0} tác phẩm</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-10">
                                        <div className="flex justify-between items-center border-b pb-8">
                                            <button onClick={() => setActiveAlbumId(null)} className="flex items-center gap-2 text-slate-500 bg-white px-5 py-2.5 rounded-2xl border shadow-sm"><ArrowLeft size={18}/> Trở về</button>
                                            {isAdmin && (
                                                <div className="flex gap-3 bg-blue-50/50 p-2 rounded-[2rem] border border-blue-100">
                                                    <input type="file" id="up" hidden multiple onChange={handleLocalFileUpload} />
                                                    <button onClick={() => document.getElementById('up')!.click()} className="bg-white text-blue-600 px-6 py-2.5 rounded-2xl text-sm font-bold border border-blue-100">Tải lên</button>
                                                    <input type="text" placeholder="Dán link Drive..." className="bg-transparent px-4 py-2 text-sm outline-none w-48" value={albumDriveLink} onChange={e => setAlbumDriveLink(e.target.value)} />
                                                    <button onClick={handleSyncDriveToAlbum} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-md">Đồng bộ</button>
                                                </div>
                                            )}
                                        </div>
                                        <h2 className="text-5xl font-bold text-center" style={{fontFamily:'serif'}}>{albums.find(a => a.id === activeAlbumId)?.title}</h2>
                                        <div className="masonry-grid">
                                            {albums.find(a => a.id === activeAlbumId)?.images?.map((img: any, i: number) => (
                                                <div key={img.id} className="mb-6 relative group rounded-3xl overflow-hidden cursor-pointer" onClick={() => setLightboxData({isOpen: true, index: i})}>
                                                    <img src={img.url} className="w-full" loading="lazy" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- TAB: CHỌN ẢNH (Dành cho khách) --- */}
                        {activeTab === 'gallery' && (
                            <div className="space-y-10">
                                {loadedImages.length > 0 ? (
                                    <>
                                        <div className="sticky top-24 z-30 bg-white/80 backdrop-blur-xl p-5 border border-slate-100 rounded-[2rem] flex justify-between items-center shadow-xl">
                                            <div className="flex items-center gap-3 font-bold text-xl text-pink-500 bg-pink-50 px-6 py-2 rounded-2xl"><Heart className="fill-current"/> <span>{selectedImages.size}</span> ảnh đã chọn</div>
                                            <button onClick={handleDownloadSelected} className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg">Tải xuống ZIP</button>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                            {loadedImages.map(img => (
                                                <div key={img.id} onClick={(e) => toggleImageSelect(img.id, e)} className={`aspect-[3/4] rounded-[2rem] overflow-hidden relative cursor-pointer border-4 transition-all ${selectedImages.has(img.id) ? 'border-pink-500 scale-95' : 'border-transparent'}`}>
                                                    <img src={img.url} className="w-full h-full object-cover" />
                                                    <div className={`absolute top-4 right-4 p-2 rounded-full ${selectedImages.has(img.id) ? 'bg-pink-500 text-white' : 'bg-black/20 text-white/50'}`}>
                                                        <Heart size={16} className={selectedImages.has(img.id) ? 'fill-current' : ''}/>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-40 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                                        <p>Chưa có ảnh nào được tải lên cho album này.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- TAB: LỌC ẢNH (PHOTO FILTER - NEW) --- */}
                        {activeTab === 'filter' && (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                    
                                    {/* Left: Input & Actions */}
                                    <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-10">
                                        <div className="space-y-4">
                                            <span className="px-4 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-widest">3 bước lọc ảnh</span>
                                            <h2 className="text-4xl font-bold text-slate-900 leading-tight">Chép ảnh đã chọn sang thư mục mới</h2>
                                        </div>

                                        {/* STEP 1 & 2: Folder Selection */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div 
                                                onClick={selectSourceFolder}
                                                className={`p-6 rounded-3xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${sourceHandle ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white'}`}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${sourceHandle ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                                    <Folder size={28} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">NGUỒN</p>
                                                    <p className="font-bold text-slate-700 truncate">{sourceHandle ? sourceHandle.name : 'Chọn thư mục gốc trên máy tính'}</p>
                                                </div>
                                            </div>

                                            <div 
                                                onClick={selectDestFolder}
                                                className={`p-6 rounded-3xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${destHandle ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200 hover:border-green-400 hover:bg-white'}`}
                                            >
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${destHandle ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}`}>
                                                    <FolderDown size={28} />
                                                </div>
                                                <div className="flex-1 overflow-hidden">
                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">ĐÍCH</p>
                                                    <p className="font-bold text-slate-700 truncate">{destHandle ? destHandle.name : 'Chọn thư mục chứa file sau khi lọc'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* STEP 3: Input Area */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-black text-slate-400 uppercase tracking-wider ml-1">Danh sách ảnh cần lọc</label>
                                            <textarea 
                                                className="w-full h-56 border-2 border-slate-100 p-6 rounded-[2rem] outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-relaxed" 
                                                placeholder="VD:&#10;DSC_0001&#10;DSC_0002.jpg&#10;IMG_2451"
                                                value={filterText}
                                                onChange={(e) => setFilterText(e.target.value)}
                                            />
                                        </div>

                                        {/* Bottom Actions */}
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
                                            <div className="w-full md:w-64 space-y-2">
                                                <label className="text-xs font-bold text-slate-400 ml-1">ĐUÔI ẢNH</label>
                                                <select 
                                                    value={filterExtension}
                                                    onChange={(e) => setFilterExtension(e.target.value)}
                                                    className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 bg-slate-50 font-bold"
                                                >
                                                    <option>Tất cả</option>
                                                    <option>.JPG</option>
                                                    <option>.PNG</option>
                                                    <option>.RAW</option>
                                                </select>
                                            </div>

                                            <div className="flex gap-4 w-full md:w-auto">
                                                <button 
                                                    onClick={handleScanFiles}
                                                    className="flex-1 md:flex-none px-10 py-4 rounded-2xl font-bold border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                                                >
                                                    Quét khớp
                                                </button>
                                                <button 
                                                    onClick={handleCopyFiles}
                                                    disabled={matchedFiles.length === 0}
                                                    className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${matchedFiles.length > 0 ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-slate-300 cursor-not-allowed'}`}
                                                >
                                                    <Zap size={20} /> Chép ảnh lọc
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Results Pane */}
                                    <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col h-full max-h-[850px]">
                                        <div className="flex justify-between items-center mb-8">
                                            <span className="px-4 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full border border-slate-200 uppercase tracking-widest">Kết quả</span>
                                        </div>

                                        <h3 className="text-2xl font-bold text-slate-900 mb-6">Ảnh tìm thấy</h3>

                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-slate-50 border border-slate-100 p-5 rounded-3xl text-center">
                                                <p className="text-3xl font-black text-slate-800">{filterInputCount}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">tên nhập</p>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl text-center">
                                                <p className="text-3xl font-black text-blue-600">{matchedFiles.length}</p>
                                                <p className="text-[10px] font-bold text-blue-400 uppercase mt-1">ảnh khớp</p>
                                            </div>
                                        </div>

                                        {/* Log Output */}
                                        <div className="flex-1 bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden flex flex-col">
                                            <div className="p-4 bg-slate-200/50 border-b border-slate-100 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nhật ký hoạt động</span>
                                                <button onClick={() => setFilterLogs([])} className="text-[10px] font-bold text-blue-500 hover:underline uppercase">Xóa</button>
                                            </div>
                                            <div className="flex-1 p-5 overflow-y-auto font-mono text-[12px] leading-relaxed text-slate-600 space-y-2 no-scrollbar">
                                                {filterLogs.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
                                                        <ImageIcon size={32} className="mb-3 opacity-20" />
                                                        <p>Chưa quét thư mục.</p>
                                                    </div>
                                                ) : (
                                                    filterLogs.map((log, idx) => (
                                                        <div key={idx} className="border-b border-slate-100 pb-1 animate-in slide-in-from-left duration-300">{log}</div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-8 p-5 rounded-2xl bg-orange-50 border border-orange-100 flex gap-4">
                                            <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] leading-relaxed text-orange-700 font-medium">
                                                Chức năng chép thư mục cần trình duyệt Chrome hoặc Edge desktop vì dùng File System Access API bảo mật.
                                            </p>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* LIGHTBOX */}
            {lightboxData.isOpen && activeAlbumId && (
                <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button onClick={closeLightbox} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all z-[210] p-2 bg-white/10 rounded-full"><X size={32}/></button>
                    <img 
                        key={lightboxData.index}
                        src={albums.find(a => a.id === activeAlbumId)?.images[lightboxData.index].originalUrl} 
                        className="max-w-full max-h-full object-contain shadow-2xl lightbox-image animate-in fade-in zoom-in-95 duration-500" 
                    />
                    <button className="absolute left-6 text-white/30 hover:text-white p-4 rounded-full hidden md:block" onClick={prevLightboxImage}><ArrowLeft size={56} /></button>
                    <button className="absolute right-6 text-white/30 hover:text-white p-4 rounded-full hidden md:block" onClick={nextLightboxImage}><ArrowRight size={56} /></button>
                </div>
            )}
        </div>
    );
}

// Modal đăng nhập
function setShowLoginModal(arg0: boolean) {
    throw new Error('Function not implemented.');
}