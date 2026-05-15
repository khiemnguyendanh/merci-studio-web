// @ts-nocheck
/* eslint-disable */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Camera, Wand2, Copy, ArrowRight, Heart, 
    Download, Image as ImageIcon, RefreshCcw, Zap, ArrowLeft,
    MapPin, Phone, Plus, X, Folder, FolderDown, AlertCircle, User,
    Link as LinkIcon, Edit, Trash2, Star
} from 'lucide-react';

// === FIREBASE IMPORTS ===
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';

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

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// Component Icon Facebook (Tránh lỗi thư viện)
const FacebookIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);

// Component Icon Check Circle
const CheckCircleIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const DEFAULT_HERO = "https://images.unsplash.com/photo-1606800052052-a08af7148866?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80";
const DEFAULT_PROMO = "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
const DEFAULT_COVER = "https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

export default function Home() {
    // === STATES ===
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    
    // Gallery & Drive (Khách hàng)
    const [driveLink, setDriveLink] = useState('');
    const [clientLink, setClientLink] = useState('');
    const [loadedImages, setLoadedImages] = useState([]);
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Albums (Admin)
    const [albums, setAlbums] = useState([]);
    const [activeAlbumId, setActiveAlbumId] = useState(null);
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [editingAlbum, setEditingAlbum] = useState(null); 
    const [newAlbum, setNewAlbum] = useState({ title: '', sub: '', category: 'Váy cưới' });
    const [albumDriveLink, setAlbumDriveLink] = useState(''); 

    // Filter Tool
    const [filterText, setFilterText] = useState('');
    const [sourceHandle, setSourceHandle] = useState(null);
    const [destHandle, setDestHandle] = useState(null);
    const [filterLogs, setFilterLogs] = useState([]);

    const [lightboxData, setLightboxData] = useState({ isOpen: false, index: 0, images: [] });

    // === EFFECTS ===
    useEffect(() => { 
        setMounted(true); 
        if (!document.getElementById('jszip-script')) {
            const script = document.createElement('script');
            script.id = 'jszip-script';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            document.head.appendChild(script);
        }
    }, []);

    useEffect(() => {
        if (!mounted || !auth) return;
        signInAnonymously(auth).catch(() => {});
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        if (localStorage.getItem('merci_admin_logged_in') === 'true') setIsAdmin(true);
        return () => unsubAuth();
    }, [mounted]);

    useEffect(() => {
        if (!mounted || !user || !db) return;
        const unsubscribe = onSnapshot(collection(db, 'merci_albums'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => b.id.localeCompare(a.id));
            setAlbums(fetched);
        });
        return () => unsubscribe();
    }, [mounted, user]);

    useEffect(() => {
        if (!mounted) return;
        const urlParams = new URLSearchParams(window.location.search);
        const folderId = urlParams.get('folder');
        const viewMode = urlParams.get('view');
        
        if (folderId) {
            setActiveTab('gallery');
            setCurrentFolderId(folderId);
            if (viewMode === 'selected') setShowOnlySelected(true);
            fetchDrive(folderId); 
        }
    }, [mounted]);

    const nextImg = useCallback(() => {
        const imgs = lightboxData.images || [];
        if (imgs.length) setLightboxData(p => ({ ...p, index: (p.index + 1) % imgs.length }));
    }, [lightboxData.images]);

    const prevImg = useCallback(() => {
        const imgs = lightboxData.images || [];
        if (imgs.length) setLightboxData(p => ({ ...p, index: (p.index - 1 + imgs.length) % imgs.length }));
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
    const saveAlbumData = async (data) => {
        if (!db) return;
        try { await setDoc(doc(db, 'merci_albums', data.id), data); } catch (e) { console.error(e); }
    };

    const handleCreateAlbum = async () => {
        if (!newAlbum.title) return alert("Vui lòng nhập tên album");
        setIsLoading(true);
        const data = { id: `album_${Date.now()}`, ...newAlbum, images: [], coverUrl: DEFAULT_COVER };
        await saveAlbumData(data);
        setIsCreatingAlbum(false);
        setIsLoading(false);
        setNewAlbum({ title: '', sub: '', category: 'Váy cưới' });
    };

    const handleUpdateAlbum = async () => {
        if (!editingAlbum.title) return alert("Vui lòng nhập tên album");
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_albums', editingAlbum.id), {
                title: editingAlbum.title,
                sub: editingAlbum.sub,
                category: editingAlbum.category,
                coverUrl: editingAlbum.coverUrl || DEFAULT_COVER
            });
            setEditingAlbum(null);
        } catch (e) {
            console.error(e);
            alert("Đã xảy ra lỗi khi cập nhật album.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAlbum = async (id) => {
        if (!confirm("Bạn có chắc chắn muốn xóa album này? Toàn bộ ảnh bên trong sẽ bị mất vĩnh viễn!")) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'merci_albums', id));
            setEditingAlbum(null);
            if (activeAlbumId === id) setActiveAlbumId(null);
        } catch (e) {
            console.error(e);
            alert("Lỗi khi xóa album.");
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm chọn ảnh bìa mới
    const handleSetCover = async (e, imageUrl) => {
        e.stopPropagation(); 
        if (!activeAlbumId) return;
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_albums', activeAlbumId), {
                coverUrl: imageUrl
            });
            alert("Đã đặt ảnh này làm Ảnh Bìa thành công!");
        } catch (error) {
            console.error(error);
            alert("Lỗi khi cập nhật ảnh bìa.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSyncDriveToAlbum = async () => {
        if (!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");
        if (!albumDriveLink.trim()) return alert("Vui lòng dán link thư mục Google Drive!");
        
        setIsLoading(true);
        setLoadingMessage('Đang lấy ảnh từ Google Drive...');
        
        let folderId = albumDriveLink.trim();
        if (folderId.includes('folders/')) folderId = folderId.split('folders/')[1].split('?')[0];

        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${GOOGLE_API_KEY}&fields=files(id,name,thumbnailLink,webContentLink)&pageSize=100&orderBy=name`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.files && data.files.length > 0) {
                const newImgs = data.files.map((f) => ({
                    id: f.id, name: f.name,
                    url: f.thumbnailLink?.replace('=s220', '=w600'),
                    originalUrl: f.thumbnailLink?.replace('=s220', '=s0'),
                    downloadUrl: f.webContentLink
                }));
                
                const currentAlbum = albums.find(a => a.id === activeAlbumId);
                const updated = { ...currentAlbum, images: [...newImgs, ...(currentAlbum.images || [])] };
                if (newImgs.length > 0 && (!updated.coverUrl || updated.coverUrl === DEFAULT_COVER)) updated.coverUrl = newImgs[0].url;
                
                await saveAlbumData(updated);
                setAlbumDriveLink('');
                alert(`Đã thêm thành công ${newImgs.length} ảnh vào Album!`);
            } else { alert("Thư mục trống hoặc chưa bật quyền chia sẻ (Bất kỳ ai có liên kết)!"); }
        } catch (e) { alert("Lỗi khi kết nối Google Drive."); } 
        finally { setIsLoading(false); }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (loginData.username === 'khiemnguyendanh' && loginData.password === 'Merci@2026') {
            setIsAdmin(true); setShowLoginModal(false); localStorage.setItem('merci_admin_logged_in', 'true');
        } else { setLoginError('Sai tài khoản hoặc mật khẩu!'); }
    };

    // === CLIENT GALLERY HELPERS ===
    const saveClientSelectionToDB = async (folderId, newSelectedSet) => {
        if (!db || !folderId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'client_selections', folderId), {
                selectedIds: Array.from(newSelectedSet),
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch(e) { console.error("Error saving selection", e); }
        setTimeout(() => setIsSaving(false), 500); 
    };

    const loadClientSelectionFromDB = async (folderId) => {
        if (!db || !folderId) return new Set();
        try {
            const docSnap = await getDoc(doc(db, 'client_selections', folderId));
            if (docSnap.exists() && docSnap.data().selectedIds) {
                return new Set(docSnap.data().selectedIds);
            }
        } catch(e) { console.error(e); }
        return new Set();
    };

    const fetchDrive = async (id) => {
        if (!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");
        setIsLoading(true);
        setLoadingMessage('Đang lấy dữ liệu album...');
        
        let folderId = id;
        if (id.includes('folders/')) folderId = id.split('folders/')[1].split('?')[0];
        
        setCurrentFolderId(folderId);

        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${GOOGLE_API_KEY}&fields=files(id,name,thumbnailLink,webContentLink)&pageSize=100&orderBy=name`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.files && data.files.length > 0) {
                setLoadedImages(data.files.map((f) => ({
                    id: f.id, name: f.name,
                    url: f.thumbnailLink?.replace('=s220', '=w600'),
                    originalUrl: f.thumbnailLink?.replace('=s220', '=s0')
                })));
                setClientLink(`${window.location.href.split('?')[0]}?folder=${folderId}`);
                
                const savedSelections = await loadClientSelectionFromDB(folderId);
                setSelectedImages(savedSelections);

            } else {
                alert("Thư mục không có ảnh hoặc chưa bật quyền chia sẻ (Bất kỳ ai có liên kết) trên Google Drive.");
            }
        } catch (e) { alert("Lỗi khi kết nối Google Drive."); } 
        finally { setIsLoading(false); }
    };

    const toggleImageSelect = (id, event) => {
        if(event) event.stopPropagation();
        setSelectedImages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
            if (currentFolderId) saveClientSelectionToDB(currentFolderId, newSet);
            return newSet;
        });
    };

    const generateSelectedImagesLink = () => {
        if (!currentFolderId) return;
        let baseUrl = window.location.href.split('?')[0];
        const newLink = `${baseUrl}?folder=${currentFolderId}&view=selected`;
        navigator.clipboard.writeText(newLink);
        alert("Đã copy link! Bạn có thể gửi link này cho Studio để chốt ảnh, hoặc xem lại danh sách những ảnh đã thả tim.");
    };

    const handleDownloadSelected = async () => {
        if (selectedImages.size === 0) return alert("Bạn chưa chọn ảnh nào!");
        if (!window.JSZip) return alert("Thư viện nén file chưa sẵn sàng, vui lòng thử lại sau vài giây.");

        setIsLoading(true);
        setLoadingMessage('Đang nén các ảnh đã chọn thành file ZIP...');
        try {
            const JSZip = window.JSZip;
            const zip = new JSZip();
            const folderName = "Merci_Album_Da_Chon_" + new Date().toISOString().slice(0,10);
            const imgFolder = zip.folder(folderName);

            const promises = Array.from(selectedImages).map(id => {
                const img = loadedImages.find(i => i.id === id);
                if (img) {
                    return fetch(img.originalUrl)
                        .then(res => res.blob())
                        .then(blob => imgFolder?.file(img.name, blob));
                }
                return Promise.resolve();
            });

            await Promise.all(promises);
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = folderName + ".zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error(error);
            alert("Đã xảy ra lỗi trong quá trình gom file ZIP. Bạn hãy thử lại sau nhé.");
        } finally {
            setIsLoading(false);
        }
    };

    const selectSourceFolder = async () => { try { setSourceHandle(await window.showDirectoryPicker()); } catch (e) {} };
    const selectDestFolder = async () => { try { setDestHandle(await window.showDirectoryPicker()); } catch (e) {} };

    const handleCopyFiles = async () => {
        if (!sourceHandle || !destHandle) return alert("Vui lòng chọn đủ thư mục nguồn và đích!");
        if (!filterText.trim()) return alert("Vui lòng dán danh sách tên file!");

        setIsLoading(true); setLoadingMessage('Đang xử lý lọc và chép ảnh...'); setFilterLogs([]);
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
                        await writable.write(file); await writable.close();
                        count++;
                        setFilterLogs(prev => [...prev, `✅ Đã chép: ${entry.name}`]);
                    }
                }
            }
            alert(`Hoàn thành! Đã chép ${count} ảnh.`);
        } catch (e) { alert("Lỗi chép file. Hãy kiểm tra quyền truy cập thư mục."); } 
        finally { setIsLoading(false); }
    };

    const displayedImages = showOnlySelected 
        ? loadedImages.filter(img => selectedImages.has(img.id)) 
        : loadedImages;

    if (!mounted) return <div className="min-h-screen bg-slate-50" />;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 transition-opacity duration-500">
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
                            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
                            <input type="text" placeholder="Username" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" onChange={e => setLoginData({...loginData, username: e.target.value})} />
                            <input type="password" placeholder="Password" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" onChange={e => setLoginData({...loginData, password: e.target.value})} />
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Vào hệ thống</button>
                        </form>
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
                        <input type="text" placeholder="Tên Album (*)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" onChange={e => setNewAlbum({...newAlbum, title: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Mô tả phụ" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" onChange={e => setNewAlbum({...newAlbum, sub: e.target.value})} />
                            <select className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-slate-50 font-medium" value={newAlbum.category} onChange={e => setNewAlbum({...newAlbum, category: e.target.value})}>
                                {['Váy cưới', 'Ảnh cưới', 'Ảnh concept', 'Gia đình', 'Khác'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
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
                                <input type="text" placeholder="Tên Album (*)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.title} onChange={e => setEditingAlbum({...editingAlbum, title: e.target.value})} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 ml-1">MÔ TẢ PHỤ</label>
                                    <input type="text" placeholder="Mô tả phụ" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.sub || ''} onChange={e => setEditingAlbum({...editingAlbum, sub: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 ml-1">DANH MỤC</label>
                                    <select className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-slate-50 font-medium" value={editingAlbum.category} onChange={e => setEditingAlbum({...editingAlbum, category: e.target.value})}>
                                        {['Váy cưới', 'Ảnh cưới', 'Ảnh concept', 'Gia đình', 'Khác'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK ẢNH BÌA</label>
                                <input type="text" placeholder="https://..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.coverUrl || ''} onChange={e => setEditingAlbum({...editingAlbum, coverUrl: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-100">
                            <button onClick={() => handleDeleteAlbum(editingAlbum.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2">
                                <Trash2 className="w-4 h-4"/> Xóa
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => setEditingAlbum(null)} className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors">Hủy</button>
                                <button onClick={handleUpdateAlbum} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all">Lưu thay đổi</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => {
                        setActiveTab('home');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }}>
                        <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                            <Camera className="text-white" size={20} />
                        </div>
                        <h1 className="text-xl font-bold font-serif text-slate-900 tracking-tight">Merci Studio</h1>
                    </div>
                    <nav className="flex bg-slate-100/50 p-1 rounded-full overflow-x-auto no-scrollbar border border-slate-200/50">
                        {[
                            { id: 'home', label: 'Trang chủ' },
                            { id: 'create', label: 'Tạo trang' },
                            { id: 'collection', label: 'Bộ sưu tập' },
                            { id: 'gallery', label: 'Chọn ảnh' },
                            { id: 'filter', label: 'Lọc ảnh' }
                        ].map(t => (
                            <button key={t.id} onClick={() => { setActiveTab(t.id); setActiveAlbumId(null); }} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
                                {t.label}
                            </button>
                        ))}
                    </nav>
                    <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLoginModal(true)} className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                        <User size={18}/> {isAdmin ? 'Admin (Thoát)' : 'Đăng nhập'}
                    </button>
                </div>
            </header>

            <main className="flex-grow w-full">
                <div key={activeTab} className="max-w-7xl mx-auto p-6 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                    
                    {/* --- TAB: HOME --- */}
                    {activeTab === 'home' && (
                        <div className="space-y-16">
                            <div className="relative h-[60vh] rounded-[3rem] overflow-hidden shadow-2xl group">
                                <img src={DEFAULT_HERO} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" alt="Hero" />
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-6 text-center">
                                    <span className="bg-blue-600/20 backdrop-blur-md border border-white/20 px-4 py-1 rounded-full text-xs font-bold tracking-widest mb-4 uppercase">Est. 2026</span>
                                    <h2 className="text-5xl md:text-8xl font-bold font-serif mb-6 drop-shadow-lg text-white">Merci Wedding</h2>
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
                                    <div key={i} className="p-10 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                                        <div className="mx-auto mb-6 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">{item.icon}</div>
                                        <h4 className="font-bold text-xl mb-2">{item.title}</h4>
                                        <p className="text-slate-500 font-medium">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: TẠO TRANG --- */}
                    {activeTab === 'create' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8 animate-in slide-in-from-left duration-500">
                                <h2 className="text-5xl md:text-6xl font-bold leading-tight text-slate-900 tracking-tight">Gửi album chọn ảnh <span className="text-blue-600">ngay lập tức.</span></h2>
                                <p className="text-slate-500 text-xl leading-relaxed">Tiết kiệm thời gian tối đa cho Studio và Khách hàng với hệ thống chọn ảnh thông minh tích hợp Google Drive API.</p>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-widest">Link folder Google Drive</label>
                                        <input value={driveLink} onChange={e => setDriveLink(e.target.value)} type="text" placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-500 transition-colors" />
                                    </div>
                                    <button onClick={() => fetchDrive(driveLink)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group">
                                        <Wand2 className="group-hover:rotate-45 transition-transform" /> Tạo link gửi khách
                                    </button>
                                </div>
                                {clientLink && (
                                    <div className="bg-blue-50 p-6 rounded-2xl flex flex-col gap-4 border border-blue-100 animate-in zoom-in-95">
                                        <div>
                                            <span className="text-xs font-bold text-blue-700 block mb-1">LINK CHỌN ẢNH (Gửi khách hàng):</span>
                                            <div className="flex justify-between items-center gap-2">
                                                <span className="text-sm font-mono text-blue-800 truncate bg-white px-3 py-2 rounded-lg border border-blue-200 flex-1">{clientLink}</span>
                                                <button onClick={() => {navigator.clipboard.writeText(clientLink); alert("Đã copy!");}} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <img src={DEFAULT_PROMO} className="rounded-[3rem] shadow-2xl object-cover aspect-[4/3] w-full animate-in zoom-in duration-700" alt="Promo" />
                        </div>
                    )}

                    {/* --- TAB: BỘ SƯU TẬP --- */}
                    {activeTab === 'collection' && (
                        <div className="space-y-12">
                            {!activeAlbumId ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-bold font-serif text-slate-900">Bộ Sưu Tập</h2>
                                        {isAdmin && (
                                            <button onClick={() => setIsCreatingAlbum(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700">
                                                <Plus size={20}/> Album mới
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                                        {albums.map(a => (
                                            <div key={a.id} onClick={() => {setActiveAlbumId(a.id); setLightboxData(p => ({...p, images: a.images||[]}));}} className="group cursor-pointer relative">
                                                <div className="aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-6 bg-slate-200 relative shadow-md group-hover:shadow-2xl transition-all duration-500">
                                                    <img src={a.coverUrl || DEFAULT_COVER} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={a.title} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                                                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900">{a.category}</div>
                                                    
                                                    {/* Nút Edit (Chỉ hiển thị cho Admin) */}
                                                    {isAdmin && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setEditingAlbum(a); }} 
                                                            className="absolute top-6 right-6 z-20 bg-white/90 p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                                            title="Sửa Album"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <div className="absolute bottom-8 left-8 right-8 text-white">
                                                        <h3 className="text-2xl font-bold font-serif mb-1">{a.title}</h3>
                                                        <p className="text-xs font-medium opacity-80 uppercase tracking-widest">{a.images?.length || 0} tác phẩm</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-10 animate-in slide-in-from-right duration-500">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-100 pb-8">
                                        <button onClick={() => setActiveAlbumId(null)} className="flex items-center gap-2 text-slate-500 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-2xl border shadow-sm transition-all active:scale-95"><ArrowLeft size={18}/> Quay lại</button>
                                        {isAdmin && (
                                            <div className="flex flex-wrap items-center gap-3 bg-blue-50/50 p-2 rounded-2xl border border-blue-100 shadow-inner w-full md:w-auto">
                                                <input 
                                                    type="text" 
                                                    placeholder="Dán link Drive vào đây..." 
                                                    value={albumDriveLink} 
                                                    onChange={e => setAlbumDriveLink(e.target.value)} 
                                                    className="flex-1 md:w-64 px-4 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:border-blue-500"
                                                />
                                                <button onClick={handleSyncDriveToAlbum} className="bg-white hover:bg-blue-600 hover:text-white text-blue-600 px-6 py-2 rounded-xl text-sm font-bold border border-blue-200 shadow-sm transition-all flex items-center gap-2">
                                                    <RefreshCcw size={16}/> Lấy ảnh
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-5xl font-bold font-serif text-slate-900">{albums.find(a => a.id === activeAlbumId)?.title}</h2>
                                    </div>
                                    <div className="masonry-grid">
                                        {albums.find(a => a.id === activeAlbumId)?.images?.map((img: any, i: number) => {
                                            const currentAlbum = albums.find(a => a.id === activeAlbumId);
                                            const isCover = currentAlbum?.coverUrl === img.url;
                                            
                                            return (
                                                <div key={img.id} className="mb-6 relative group rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all" onClick={() => setLightboxData({isOpen: true, index: i, images: currentAlbum?.images})}>
                                                    <img src={img.url} className="w-full transition-transform duration-500 group-hover:scale-105" loading="lazy" alt="Album" />
                                                    
                                                    {/* Nút Tải xuống */}
                                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); window.open(img.originalUrl, '_blank'); }} className="bg-white/90 p-3 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-xl" title="Tải ảnh">
                                                            <Download size={20}/>
                                                        </button>
                                                    </div>

                                                    {/* Nút Đặt làm Ảnh Bìa (Chỉ hiện với Admin) */}
                                                    {isAdmin && (
                                                        <div className={`absolute top-4 left-4 transition-all z-20 ${isCover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                            <button 
                                                                onClick={(e) => handleSetCover(e, img.url)} 
                                                                className={`p-3 rounded-full shadow-xl transition-all ${isCover ? 'bg-yellow-400 text-white' : 'bg-white/90 text-slate-400 hover:bg-yellow-400 hover:text-white'}`}
                                                                title={isCover ? "Đây là ảnh bìa hiện tại" : "Đặt làm ảnh bìa"}
                                                            >
                                                                <Star size={20} className={isCover ? "fill-current" : ""} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: LỌC ẢNH --- */}
                    {activeTab === 'filter' && (
                        <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in-95 duration-500">
                            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 space-y-10">
                                <h2 className="text-4xl font-bold text-slate-900 leading-tight">Lọc ảnh và chép sang thư mục mới</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div onClick={selectSourceFolder} className={`p-8 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${sourceHandle ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white'}`}>
                                        <Folder className="text-blue-600" size={28} />
                                        <p className="font-bold truncate text-slate-700">{sourceHandle ? sourceHandle.name : 'Chọn thư mục gốc'}</p>
                                    </div>
                                    <div onClick={selectDestFolder} className={`p-8 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${destHandle ? 'bg-green-50 border-green-400' : 'bg-slate-50 border-slate-200 hover:border-green-400 hover:bg-white'}`}>
                                        <FolderDown className="text-green-600" size={28} />
                                        <p className="font-bold truncate text-slate-700">{destHandle ? destHandle.name : 'Chọn thư mục đích'}</p>
                                    </div>
                                </div>
                                <textarea className="w-full h-64 border-2 border-slate-100 p-6 rounded-[2rem] outline-none focus:border-blue-500 transition-colors font-mono text-sm shadow-inner" placeholder="Dán danh sách tên ảnh..." value={filterText} onChange={e => setFilterText(e.target.value)} />
                                <button onClick={handleCopyFiles} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                                    <Zap size={22} /> Bắt đầu lọc và sao chép
                                </button>
                            </div>
                            {filterLogs.length > 0 && (
                                <div className="bg-slate-900 text-green-400 p-8 rounded-[2rem] font-mono text-xs h-64 overflow-y-auto no-scrollbar border border-slate-800 animate-in fade-in duration-500">
                                    {filterLogs.map((log, idx) => <div key={idx} className="mb-1">{log}</div>)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- TAB: GALLERY (Chọn ảnh) --- */}
                    {activeTab === 'gallery' && (
                        <div className="space-y-10 animate-in zoom-in-95 duration-500">
                            {loadedImages.length > 0 ? (
                                <>
                                    {/* Control Bar */}
                                    <div className="sticky top-20 z-30 bg-white/90 backdrop-blur-xl p-4 border border-slate-100 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                                        <div className="flex items-center gap-4 pl-2 w-full md:w-auto">
                                            <div className="flex items-center gap-2 text-pink-500 font-bold bg-pink-50 px-4 py-2 rounded-xl whitespace-nowrap">
                                                <Heart className="w-5 h-5 fill-current" /> <span>{selectedImages.size}</span> ảnh
                                            </div>
                                            {isSaving && <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><RefreshCcw className="w-3 h-3 animate-spin"/> Đang lưu...</span>}
                                            {!isSaving && <span className="text-xs text-green-500 font-medium flex items-center gap-1"><CheckCircleIcon className="w-4 h-4"/> Đã lưu</span>}
                                        </div>

                                        {/* Toggle View Mode */}
                                        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                                            <button onClick={() => setShowOnlySelected(false)} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${!showOnlySelected ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Tất cả ảnh</button>
                                            <button onClick={() => setShowOnlySelected(true)} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all ${showOnlySelected ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>Chỉ ảnh đã chọn</button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 w-full md:w-auto justify-end flex-wrap">
                                            <button onClick={() => {
                                                const names = Array.from(selectedImages).map(id => loadedImages.find(img => img.id === id)?.name).filter(Boolean);
                                                navigator.clipboard.writeText(names.join('\n'));
                                                alert("Đã copy danh sách tên file!");
                                            }} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-bold transition-all text-slate-700 shadow-sm flex items-center justify-center flex-1 md:flex-none">
                                                <Copy className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Copy Tên</span>
                                            </button>
                                            
                                            <button onClick={generateSelectedImagesLink} className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-1 md:flex-none">
                                                <LinkIcon className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Link Đã Chọn</span>
                                            </button>

                                            <button onClick={handleDownloadSelected} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-1 md:flex-none">
                                                <Download className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Tải Ảnh ZIP</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grid Ảnh */}
                                    {displayedImages.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                            {displayedImages.map((img, idx) => {
                                                const isSelected = selectedImages.has(img.id);
                                                return (
                                                    <div key={img.id} className={`aspect-[3/4] relative group rounded-2xl overflow-hidden border-4 transition-all duration-300 ${isSelected ? 'border-pink-500 shadow-xl shadow-pink-500/20 scale-[0.98]' : 'border-transparent hover:shadow-lg'}`}>
                                                        <img 
                                                            src={img.url} 
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer" 
                                                            alt="Gallery" 
                                                            onClick={() => { setLightboxData({isOpen: true, index: idx, images: displayedImages}); }}
                                                        />
                                                        
                                                        {/* Nút thả tim to */}
                                                        <div 
                                                            onClick={(e) => toggleImageSelect(img.id, e)}
                                                            className={`absolute bottom-3 right-3 w-12 h-12 cursor-pointer rounded-full flex items-center justify-center backdrop-blur-md transition-all ${isSelected ? 'bg-pink-500 text-white scale-110 shadow-lg' : 'bg-black/40 text-white/80 hover:bg-pink-500/80 hover:text-white hover:scale-110'}`}
                                                        >
                                                            <Heart className={`w-6 h-6 ${isSelected ? 'fill-current' : ''}`}/>
                                                        </div>

                                                        {/* Tên ảnh */}
                                                        <div className="absolute top-2 left-2 right-2 flex justify-between pointer-events-none">
                                                            <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-md backdrop-blur-sm truncate">{img.name}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                            <Heart className="w-16 h-16 mx-auto text-pink-200 mb-4" />
                                            <p className="text-slate-500 font-medium">Bạn chưa chọn bức ảnh nào.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-40 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
                                    <ImageIcon size={48} className="mx-auto text-slate-300 mb-4 opacity-40" />
                                    <p className="text-slate-400 font-medium">Vui lòng dán link Drive vào mục "Tạo trang" để xem ảnh.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* LIGHTBOX FOR GALLERY & ALBUMS */}
            {lightboxData.isOpen && lightboxData.images.length > 0 && (
                <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute top-6 left-6 text-white/50 font-mono text-sm tracking-widest pointer-events-none z-[210]">
                        {lightboxData.index + 1} / {lightboxData.images.length}
                    </div>

                    <button onClick={() => setLightboxData({isOpen: false, index: 0, images: []})} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all z-[210] p-2 bg-white/10 rounded-full hover:rotate-90"><X size={32}/></button>
                    
                    <img 
                        key={lightboxData.index}
                        src={lightboxData.images[lightboxData.index].originalUrl || lightboxData.images[lightboxData.index].url} 
                        className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-300" 
                        alt="Zoomed"
                    />
                    
                    <button className="absolute left-6 text-white/30 hover:text-white p-4 rounded-full hidden md:block hover:bg-white/10 transition-all z-[210]" onClick={prevImg}><ArrowLeft size={56} /></button>
                    <button className="absolute right-6 text-white/30 hover:text-white p-4 rounded-full hidden md:block hover:bg-white/10 transition-all z-[210]" onClick={nextImg}><ArrowRight size={56} /></button>
                </div>
            )}
        </div>
    );
}