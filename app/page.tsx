'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Camera, Wand2, Copy, ArrowRight, CloudUpload, Heart, 
    Download, Image as ImageIcon, RefreshCcw, Zap, ArrowLeft,
    MapPin, Phone, Mail, Plus, X, Folder, FolderDown, AlertCircle, User
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);

// Component Icon Instagram tùy chỉnh để tránh lỗi build
const InstagramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
);

export default function Home() {
    // === STATES ===
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('home');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    
    // Gallery & Drive
    const [driveLink, setDriveLink] = useState('');
    const [clientLink, setClientLink] = useState('');
    const [loadedImages, setLoadedImages] = useState<any[]>([]);
    const [selectedImages, setSelectedImages] = useState(new Set());
    
    // Albums
    const [albums, setAlbums] = useState<any[]>([]);
    const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [newAlbum, setNewAlbum] = useState({ title: '', sub: '', category: 'Váy cưới' });

    // Filter Tool
    const [filterText, setFilterText] = useState('');
    const [sourceHandle, setSourceHandle] = useState<any>(null);
    const [destHandle, setDestHandle] = useState<any>(null);
    const [matchedFiles, setMatchedFiles] = useState<any[]>([]);
    const [filterLogs, setFilterLogs] = useState<string[]>([]);

    const [lightboxData, setLightboxData] = useState({ isOpen: false, index: 0 });

    // === EFFECTS ===
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted || !auth) return;
        signInAnonymously(auth).catch(() => {});
        onAuthStateChanged(auth, setUser);
        if (localStorage.getItem('merci_admin_logged_in') === 'true') setIsAdmin(true);
    }, [mounted]);

    useEffect(() => {
        if (!mounted || !user || !db) return;
        const unsubscribe = onSnapshot(collection(db, 'merci_albums'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAlbums(fetched);
        });
        return () => unsubscribe();
    }, [mounted, user]);

    // Keyboard Lightbox Navigation
    const nextImg = useCallback(() => {
        const currentAlbum = albums.find(a => a.id === activeAlbumId);
        const imgs = currentAlbum?.images || [];
        if (imgs.length) setLightboxData(p => ({ ...p, index: (p.index + 1) % imgs.length }));
    }, [albums, activeAlbumId]);

    const prevImg = useCallback(() => {
        const currentAlbum = albums.find(a => a.id === activeAlbumId);
        const imgs = currentAlbum?.images || [];
        if (imgs.length) setLightboxData(p => ({ ...p, index: (p.index - 1 + imgs.length) % imgs.length }));
    }, [albums, activeAlbumId]);

    useEffect(() => {
        if (!lightboxData.isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextImg();
            if (e.key === 'ArrowLeft') prevImg();
            if (e.key === 'Escape') setLightboxData({ isOpen: false, index: 0 });
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [lightboxData.isOpen, nextImg, prevImg]);

    // === HELPERS ===
    const resizeImage = (file: File, maxW: number): Promise<string> => {
        return new Promise((res) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ratio = Math.min(maxW / img.width, 1);
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    res(canvas.toDataURL('image/jpeg', 0.8));
                };
            };
        });
    };

    const saveAlbumData = async (data: any) => {
        if (!db) return;
        try {
            await setDoc(doc(db, 'merci_albums', data.id), data);
        } catch (e) {
            console.error("Lỗi lưu Firebase:", e);
        }
    };

    const handleCreateAlbum = async () => {
        if (!newAlbum.title) return alert("Vui lòng nhập tên album");
        setIsLoading(true);
        const data = { 
            id: `album_${Date.now()}`, 
            ...newAlbum, 
            images: [], 
            coverUrl: '3.jpg'
        };
        await saveAlbumData(data);
        setIsCreatingAlbum(false);
        setIsLoading(false);
    };

    const handleLocalFileUpload = async (e: any) => {
        if (!activeAlbumId) return;
        const files = Array.from(e.target.files) as File[];
        if (files.length === 0) return;
        
        setIsLoading(true);
        setLoadingMessage('Đang nén và tối ưu hóa ảnh...');

        try {
            const newImgs = await Promise.all(files.map(async (file) => {
                const previewUrl = await resizeImage(file, 800);
                const originalUrl = await resizeImage(file, 1600);
                return {
                    id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    name: file.name, 
                    url: previewUrl, 
                    originalUrl: originalUrl, 
                    downloadUrl: originalUrl
                };
            }));

            const current = albums.find(a => a.id === activeAlbumId);
            const updated = { ...current, images: [...newImgs, ...(current.images || [])] };
            if (newImgs.length > 0 && updated.coverUrl === '3.jpg') updated.coverUrl = newImgs[0].url;
            
            await saveAlbumData(updated);
            alert(`Đã tải lên thành công ${newImgs.length} ảnh!`);
        } catch (error) {
            console.error(error);
            alert("Lỗi xử lý ảnh.");
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginData.username === 'khiemnguyendanh' && loginData.password === 'Merci@2026') {
            setIsAdmin(true);
            setShowLoginModal(false);
            localStorage.setItem('merci_admin_logged_in', 'true');
        } else {
            setLoginError('Sai tài khoản hoặc mật khẩu!');
        }
    };

    const fetchDrive = async (id: string) => {
        if (!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");
        setIsLoading(true);
        setLoadingMessage('Đang tải ảnh từ Google Drive...');
        const folderId = id.includes('folders/') ? id.split('folders/')[1].split('?')[0] : id;
        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${GOOGLE_API_KEY}&fields=files(id,name,thumbnailLink,webContentLink)&pageSize=100&orderBy=name`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.files) {
                setLoadedImages(data.files.map((f: any) => ({
                    id: f.id, name: f.name,
                    url: f.thumbnailLink?.replace('=s220', '=w600'),
                    originalUrl: f.thumbnailLink?.replace('=s220', '=s0')
                })));
                setClientLink(`${window.location.origin}?folder=${folderId}`);
            }
        } catch (e) { alert("Lỗi khi kết nối Google Drive."); } 
        finally { setIsLoading(false); }
    };

    const handleCopyFiles = async () => {
        if (!sourceHandle || !destHandle) return alert("Vui lòng chọn đủ thư mục nguồn và đích!");
        if (!filterText.trim()) return alert("Vui lòng dán danh sách tên file!");

        setIsLoading(true);
        setLoadingMessage('Đang xử lý lọc và chép ảnh...');
        setFilterLogs([]);

        const names = filterText.split('\n').map(n => n.trim().toLowerCase()).filter(n => n);
        let count = 0;

        try {
            for await (const entry of sourceHandle.values()) {
                if (entry.kind === 'file') {
                    const fileName = entry.name.toLowerCase();
                    const nameNoExt = entry.name.replace(/\.[^/.]+$/, "").toLowerCase();
                    if (names.includes(fileName) || names.includes(nameNoExt)) {
                        const file = await entry.getFile();
                        const newFileHandle = await destHandle.getFileHandle(entry.name, { create: true });
                        const writable = await newFileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                        count++;
                        setFilterLogs(prev => [...prev, `✅ Đã chép: ${entry.name}`]);
                    }
                }
            }
            alert(`Hoàn thành! Đã chép ${count} ảnh.`);
        } catch (e) { alert("Lỗi chép file. Hãy kiểm tra quyền truy cập thư mục."); } 
        finally { setIsLoading(false); }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <style dangerouslySetInnerHTML={{__html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .masonry-grid { column-count: 1; column-gap: 1.5rem; }
                @media (min-width: 768px) { .masonry-grid { column-count: 2; } }
                @media (min-width: 1024px) { .masonry-grid { column-count: 3; } }
            `}} />

            {isLoading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-in fade-in">
                    <RefreshCcw className="animate-spin text-blue-600 w-12 h-12 mb-4" />
                    <p className="font-bold text-lg">{loadingMessage || 'Đang xử lý...'}</p>
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
                            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
                            <input type="text" placeholder="Username" className="w-full border p-3 rounded-xl outline-none" onChange={e => setLoginData({...loginData, username: e.target.value})} />
                            <input type="password" placeholder="Password" className="w-full border p-3 rounded-xl outline-none" onChange={e => setLoginData({...loginData, password: e.target.value})} />
                            <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold">Vào hệ thống</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Album Modal */}
            {isCreatingAlbum && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl">
                        <h3 className="font-bold text-2xl">Tạo Album Mới</h3>
                        <input type="text" placeholder="Tên Album (*)" className="w-full border p-3 rounded-xl outline-none" onChange={e => setNewAlbum({...newAlbum, title: e.target.value})} />
                        <select className="w-full border p-3 rounded-xl outline-none bg-slate-50" onChange={e => setNewAlbum({...newAlbum, category: e.target.value})}>
                            {['Váy cưới', 'Ảnh cưới', 'Ảnh concept', 'Gia đình', 'Khác'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsCreatingAlbum(false)} className="px-6 py-3">Hủy</button>
                            <button onClick={handleCreateAlbum} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Khởi tạo</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setActiveTab('home')}>
                        <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                            <Camera className="text-white" size={20} />
                        </div>
                        <h1 className="text-xl font-bold font-serif">Merci Studio</h1>
                    </div>
                    <nav className="flex bg-slate-100 p-1 rounded-full overflow-x-auto no-scrollbar">
                        {[
                            { id: 'home', label: 'Trang chủ' },
                            { id: 'create', label: 'Tạo trang' },
                            { id: 'collection', label: 'Bộ sưu tập' },
                            { id: 'gallery', label: 'Chọn ảnh' },
                            { id: 'filter', label: 'Lọc ảnh' }
                        ].map(t => (
                            <button key={t.id} onClick={() => { setActiveTab(t.id); setActiveAlbumId(null); }} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>
                                {t.label}
                            </button>
                        ))}
                    </nav>
                    <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLoginModal(true)} className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <User size={18}/> {isAdmin ? 'Admin (Thoát)' : 'Đăng nhập'}
                    </button>
                </div>
            </header>

            <main className="flex-grow w-full">
                <div key={activeTab} className="max-w-7xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* --- TAB: HOME --- */}
                    {activeTab === 'home' && (
                        <div className="space-y-16">
                            <div className="relative h-[60vh] rounded-[3rem] overflow-hidden shadow-2xl group">
                                <img src="3.jpg" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-6 text-center">
                                    <span className="bg-blue-600/20 backdrop-blur-md border border-white/20 px-4 py-1 rounded-full text-xs font-bold tracking-widest mb-4 uppercase">Est. 2026</span>
                                    <h2 className="text-5xl md:text-8xl font-bold font-serif mb-6 drop-shadow-lg">Merci Wedding</h2>
                                    <p className="max-w-2xl text-lg md:text-xl opacity-90 mb-10 font-light">Nơi những rung động được lưu giữ trọn vẹn trong từng khung hình nghệ thuật.</p>
                                    <button onClick={() => setActiveTab('collection')} className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-600 hover:text-white transition-all transform active:scale-95">Khám phá ngay</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { icon: <MapPin className="text-blue-600" />, title: "Địa chỉ", desc: "244 Đội Cấn, Ba Đình, HN" },
                                    { icon: <Phone className="text-green-600" />, title: "Hotline", desc: "0888.999.545" },
                                    { icon: <FacebookIcon className="text-blue-800 w-6 h-6" />, title: "Fanpage", desc: "Merci Wedding VN" }
                                ].map((item, i) => (
                                    <div key={i} className="p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 text-center hover:shadow-xl hover:-translate-y-2 transition-all">
                                        <div className="mx-auto mb-6 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">{item.icon}</div>
                                        <h4 className="font-bold text-xl mb-2">{item.title}</h4>
                                        <p className="text-slate-500">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: TẠO TRANG --- */}
                    {activeTab === 'create' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <h2 className="text-5xl md:text-6xl font-bold leading-tight">Gửi album chọn ảnh <span className="text-blue-600">ngay lập tức.</span></h2>
                                <p className="text-slate-500 text-xl leading-relaxed">Tiết kiệm thời gian tối đa cho Studio và Khách hàng với hệ thống chọn ảnh thông minh tích hợp Google Drive API.</p>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1">Link folder Google Drive</label>
                                        <input value={driveLink} onChange={e => setDriveLink(e.target.value)} type="text" placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <button onClick={() => fetchDrive(driveLink)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group">
                                        <Wand2 className="group-hover:rotate-45 transition-transform" /> Tạo link gửi khách
                                    </button>
                                </div>
                                {clientLink && (
                                    <div className="bg-blue-50 p-6 rounded-2xl flex items-center justify-between border border-blue-100 animate-in zoom-in-95">
                                        <span className="text-xs font-mono font-medium text-blue-700 truncate mr-4">{clientLink}</span>
                                        <button onClick={() => {navigator.clipboard.writeText(clientLink); alert("Đã copy!");}} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md">Copy Link</button>
                                    </div>
                                )}
                            </div>
                            <img src="3.jpg" className="rounded-[3rem] shadow-2xl object-cover aspect-[4/3] w-full" alt="Merci Wedding Photo" />
                        </div>
                    )}

                    {/* --- TAB: BỘ SƯU TẬP --- */}
                    {activeTab === 'collection' && (
                        <div className="space-y-12">
                            {!activeAlbumId ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-bold font-serif">Bộ Sưu Tập</h2>
                                        {isAdmin && (
                                            <button onClick={() => setIsCreatingAlbum(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                                                <Plus size={20}/> Album mới
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                                        {albums.map(a => (
                                            <div key={a.id} onClick={() => setActiveAlbumId(a.id)} className="group cursor-pointer">
                                                <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-6 bg-slate-200 relative shadow-md group-hover:shadow-2xl transition-all duration-500">
                                                    <img src={a.coverUrl || '3.jpg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900">{a.category}</div>
                                                    <div className="absolute bottom-8 left-8 right-8 text-white">
                                                        <h3 className="text-2xl font-bold font-serif mb-1">{a.title}</h3>
                                                        <p className="text-xs font-medium opacity-80 uppercase tracking-tighter">{a.images?.length || 0} tác phẩm</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-10">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-8">
                                        <button onClick={() => setActiveAlbumId(null)} className="flex items-center gap-2 text-slate-500 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-2xl border shadow-sm transition-all"><ArrowLeft size={18}/> Quay lại</button>
                                        {isAdmin && (
                                            <div className="flex items-center gap-3 bg-blue-50/50 p-2 rounded-2xl border border-blue-100">
                                                <input type="file" id="up" hidden multiple onChange={handleLocalFileUpload} />
                                                <button onClick={() => document.getElementById('up')?.click()} className="bg-white hover:bg-blue-50 text-blue-600 px-6 py-2.5 rounded-xl text-sm font-bold border border-blue-100 shadow-sm transition-all flex items-center gap-2">
                                                    <CloudUpload size={18}/> Tải lên máy
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h2 className="text-5xl font-bold font-serif">{albums.find(a => a.id === activeAlbumId)?.title}</h2>
                                        <p className="text-slate-400 font-medium">{albums.find(a => a.id === activeAlbumId)?.sub}</p>
                                    </div>
                                    <div className="masonry-grid">
                                        {albums.find(a => a.id === activeAlbumId)?.images?.map((img: any, i: number) => (
                                            <div key={img.id} className="mb-6 relative group rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all" onClick={() => setLightboxData({isOpen: true, index: i})}>
                                                <img src={img.url} className="w-full transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={(e) => { e.stopPropagation(); window.open(img.originalUrl, '_blank'); }} className="bg-white/90 p-3 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-xl">
                                                        <Download size={20}/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: LỌC ẢNH --- */}
                    {activeTab === 'filter' && (
                        <div className="max-w-4xl mx-auto space-y-10">
                            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-10">
                                <div className="space-y-4">
                                    <span className="px-4 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-widest">Công cụ Studio</span>
                                    <h2 className="text-4xl font-bold text-slate-900 leading-tight">Chép ảnh đã chọn sang thư mục mới</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div onClick={async () => { /* @ts-ignore */ setSourceHandle(await window.showDirectoryPicker()); }} className={`p-8 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${sourceHandle ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white'}`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${sourceHandle ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}><Folder size={28} /></div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">NGUỒN</p>
                                            <p className="font-bold text-slate-700 truncate">{sourceHandle ? sourceHandle.name : 'Chọn thư mục gốc'}</p>
                                        </div>
                                    </div>
                                    <div onClick={async () => { /* @ts-ignore */ setDestHandle(await window.showDirectoryPicker()); }} className={`p-8 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${destHandle ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200 hover:border-green-400 hover:bg-white'}`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${destHandle ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'}`}><FolderDown size={28} /></div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">ĐÍCH</p>
                                            <p className="font-bold text-slate-700 truncate">{destHandle ? destHandle.name : 'Chọn thư mục đích'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-black text-slate-400 uppercase tracking-wider ml-1">Danh sách tên ảnh (Copy từ trang chọn ảnh)</label>
                                    <textarea className="w-full h-64 border-2 border-slate-100 p-6 rounded-[2rem] outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-relaxed" placeholder="Ví dụ:&#10;MERCI_001.jpg&#10;MERCI_005.jpg&#10;..." value={filterText} onChange={e => setFilterText(e.target.value)} />
                                </div>

                                <button onClick={handleCopyFiles} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                                    <Zap size={22} /> Bắt đầu lọc và sao chép
                                </button>
                            </div>

                            {filterLogs.length > 0 && (
                                <div className="bg-slate-900 text-green-400 p-8 rounded-[2rem] font-mono text-xs h-64 overflow-y-auto no-scrollbar shadow-2xl border border-slate-800 animate-in fade-in duration-500">
                                    <p className="text-slate-500 mb-4 border-b border-slate-800 pb-2 uppercase font-black tracking-widest text-[10px]">Tiến trình hệ thống</p>
                                    {filterLogs.map((log, idx) => <div key={idx} className="mb-1">{log}</div>)}
                                </div>
                            )}

                            <div className="p-6 rounded-2xl bg-orange-50 border border-orange-100 flex gap-4">
                                <AlertCircle className="text-orange-500 shrink-0" />
                                <p className="text-xs text-orange-700 leading-relaxed font-medium">Lưu ý: Tính năng tương tác file trực tiếp yêu cầu trình duyệt Chrome hoặc Edge bản Desktop để đảm bảo quyền riêng tư và bảo mật (File System Access API).</p>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: GALLERY (Chọn ảnh) --- */}
                    {activeTab === 'gallery' && (
                        <div className="space-y-10">
                            {loadedImages.length > 0 ? (
                                <>
                                    <div className="sticky top-24 z-30 bg-white/90 backdrop-blur-xl p-5 border border-slate-100 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                                        <div className="flex items-center gap-3 font-bold text-xl text-pink-500 bg-pink-50 px-6 py-2 rounded-2xl"><Heart className="fill-current"/> <span>{selectedImages.size}</span> ảnh đã chọn</div>
                                        <div className="flex gap-3 w-full md:w-auto">
                                            <button onClick={() => {
                                                const ns = Array.from(selectedImages).map(id => loadedImages.find(i => i.id === id).name);
                                                navigator.clipboard.writeText(ns.join('\n'));
                                                alert("Đã copy danh sách tên file!");
                                            }} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 px-8 py-3 rounded-2xl text-sm font-bold transition-all">Copy tên</button>
                                            <button onClick={() => alert("Chức năng tải ZIP yêu cầu cấu hình Firebase Storage hoặc xử lý Blob nâng cao.")} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all">Tải xuống ZIP</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {loadedImages.map(img => (
                                            <div key={img.id} onClick={() => {
                                                const next = new Set(selectedImages);
                                                if (next.has(img.id)) next.delete(img.id); else next.add(img.id);
                                                setSelectedImages(next);
                                            }} className={`aspect-[3/4] rounded-[2rem] overflow-hidden relative cursor-pointer border-4 transition-all duration-300 ${selectedImages.has(img.id) ? 'border-pink-500 scale-95 shadow-xl' : 'border-transparent hover:shadow-lg'}`}>
                                                <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                                                <div className={`absolute top-4 right-4 p-2 rounded-full transition-all ${selectedImages.has(img.id) ? 'bg-pink-500 text-white scale-110 shadow-lg' : 'bg-black/20 text-white/50 backdrop-blur-sm'}`}>
                                                    <Heart size={16} className={selectedImages.has(img.id) ? 'fill-current' : ''}/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-40 bg-white rounded-[3rem] border border-dashed border-slate-200">
                                    <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500 font-medium">Chưa có ảnh nào được tải lên hoặc link Drive chưa hợp lệ.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* LIGHTBOX */}
            {lightboxData.isOpen && activeAlbumId && (
                <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button onClick={() => setLightboxData({isOpen: false, index: 0})} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all z-[210] p-2 bg-white/10 rounded-full"><X size={32}/></button>
                    <img 
                        key={lightboxData.index}
                        src={albums.find(a => a.id === activeAlbumId)?.images[lightboxData.index].originalUrl} 
                        className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-500" 
                    />
                    <button className="absolute left-6 text-white/30 hover:text-white p-4 rounded-full hidden md:block" onClick={prevImg}><ArrowLeft size={56} /></button>
                    <button className="absolute right-6 text-white/30 hover:text-white p-4 rounded-full hidden md:block" onClick={nextImg}><ArrowRight size={56} /></button>
                </div>
            )}
        </div>
    );
}