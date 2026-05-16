// @ts-nocheck
/* eslint-disable */
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Camera, Wand2, Copy, ArrowRight, Heart, 
    Download, Image as ImageIcon, RefreshCcw, Zap, ArrowLeft,
    MapPin, Phone, Plus, X, Folder, FolderDown, AlertCircle, User,
    Link as LinkIcon, Edit, Trash2, Star, PlayCircle, ArrowUp, ArrowDown, Mail,
    BookOpen, FileText, Calendar
} from 'lucide-react';

// === FIREBASE IMPORTS ===
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';

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

// Danh sách email được phép vào Admin.
// Thêm biến môi trường NEXT_PUBLIC_ADMIN_EMAILS trên Vercel.
// Ví dụ: admin1@gmail.com,admin2@gmail.com
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

// Danh mục Album
const ALBUM_CATEGORIES = ['Tất cả', 'Wedding', 'Váy cưới', 'Phóng sự cưới', 'Concept', 'Trẻ con và gia đình'];

// Component Icon Facebook 
const FacebookIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
);

const InstagramIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
);

const TikTokIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
);

const CheckCircleIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const DEFAULT_HERO = "https://images.unsplash.com/photo-1606800052052-a08af7148866?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80";
const DEFAULT_PROMO = "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80";
const DEFAULT_COVER = "https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

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


const getCategoryHash = (category) => category === 'Tất cả' ? '' : `#${createSlug(category)}`;
const getCategoryFromHash = (hash) => {
    const cleanHash = (hash || '').replace(/^#/, '');
    return ALBUM_CATEGORIES.find(cat => createSlug(cat) === cleanHash) || '';
};

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
    
    // Khách hàng & Filter
    const [driveLink, setDriveLink] = useState('');
    const [clientLink, setClientLink] = useState('');
    const [savedClientPages, setSavedClientPages] = useState([]);
    const [loadedImages, setLoadedImages] = useState([]);
    const [selectedImages, setSelectedImages] = useState(new Set());
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Albums (Admin & Khách)
    const [albums, setAlbums] = useState([]);
    const [activeAlbumId, setActiveAlbumId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('Tất cả');
    const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
    const [editingAlbum, setEditingAlbum] = useState(null); 
    const [newAlbum, setNewAlbum] = useState({ title: '', sub: '', category: 'Wedding', driveLink: '' });
    const [albumDriveLink, setAlbumDriveLink] = useState(''); 
    const [pendingSlug, setPendingSlug] = useState(null);

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
    const [newBlog, setNewBlog] = useState({ title: '', slug: '', metaDesc: '', content: '', coverUrl: '' });

    // Filter Tool
    const [filterText, setFilterText] = useState('');
    const [sourceHandle, setSourceHandle] = useState(null);
    const [destHandle, setDestHandle] = useState(null);
    const [filterLogs, setFilterLogs] = useState([]);

    const [lightboxData, setLightboxData] = useState({ isOpen: false, index: 0, images: [] });
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [albumPage, setAlbumPage] = useState(1);
    const [galleryPage, setGalleryPage] = useState(1);

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

    // Nhận diện URL Pathname (Link Đẹp dạng /ten-album hoặc /ten-bai-viet)
    useEffect(() => {
        if (!mounted) return;
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const folderId = urlParams.get('folder');
            const viewMode = urlParams.get('view');
            
            const pathname = window.location.pathname.replace(/^\/|\/$/g, '');
            
            if (folderId) {
                setActiveTab('gallery');
                setCurrentFolderId(folderId);
                if (viewMode === 'selected') setShowOnlySelected(true);
                fetchDrive(folderId); 
            } else if (window.location.hash) {
                const categoryFromHash = getCategoryFromHash(window.location.hash);
                if (categoryFromHash) {
                    setActiveTab('collection');
                    setActiveCategory(categoryFromHash);
                }
            } else if (pathname && pathname !== '') {
                setPendingSlug(pathname);
            }
        } catch (e) { console.warn("URL Parsing bypass"); }
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

    useEffect(() => {
        if (!mounted || !db) return;
        
        const unsubAlbums = onSnapshot(collection(db, 'merci_albums'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setAlbums(fetched);
        });

        const unsubVideos = onSnapshot(collection(db, 'merci_videos'), (snapshot) => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data();
                return { id: d.id, ...data, order: data.order !== undefined ? data.order : parseInt(d.id.split('_')[1] || 0) };
            });
            fetched.sort((a, b) => b.order - a.order);
            setVideos(fetched);
        });

        const unsubBlogs = onSnapshot(collection(db, 'merci_blogs'), (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            fetched.sort((a, b) => b.createdAt - a.createdAt); // Sắp xếp bài mới nhất lên đầu
            setBlogs(fetched);
        });

        return () => { unsubAlbums(); unsubVideos(); unsubBlogs(); };
    }, [mounted]);

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

    // Cập nhật Title SEO khi xem Blog/Album
    useEffect(() => {
        if (activeTab === 'blog' && activeBlogId) {
            const blog = blogs.find(b => b.id === activeBlogId);
            if (blog) document.title = `${blog.title} | Merci Studio`;
        } else if (activeTab === 'collection' && activeAlbumId) {
            const album = albums.find(a => a.id === activeAlbumId);
            if (album) document.title = `${album.title} | Merci Studio`;
        } else {
            document.title = 'Merci Wedding Studio';
        }
    }, [activeTab, activeBlogId, activeAlbumId, blogs, albums]);

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
        const data = { 
            id: `album_${Date.now()}`, 
            title: newAlbum.title,
            slug: createSlug(newAlbum.title) || `album-${Date.now()}`, 
            sub: newAlbum.sub,
            category: newAlbum.category,
            images: [], 
            coverUrl: DEFAULT_COVER,
            order: Date.now(),
            driveLink: ''
        };
        await saveAlbumData(data);
        setIsCreatingAlbum(false);
        setIsLoading(false);
        setNewAlbum({ title: '', sub: '', category: 'Wedding', driveLink: '' });
    };

    const handleUpdateAlbum = async () => {
        if (!editingAlbum.title) return alert("Vui lòng nhập tên album");
        setIsLoading(true);
        try {
            await updateDoc(doc(db, 'merci_albums', editingAlbum.id), {
                title: editingAlbum.title,
                slug: createSlug(editingAlbum.title) || editingAlbum.slug, 
                sub: editingAlbum.sub,
                category: editingAlbum.category,
                coverUrl: editingAlbum.coverUrl || DEFAULT_COVER,
                driveLink: editingAlbum.driveLink || ''
            });
            if(activeAlbumId === editingAlbum.id) {
                setAlbumDriveLink(editingAlbum.driveLink || '');
            }
            setEditingAlbum(null);
        } catch (e) { alert("Đã xảy ra lỗi khi cập nhật album."); } 
        finally { setIsLoading(false); }
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
        try { await deleteDoc(doc(db, 'merci_videos', id)); } catch(e) { alert("Lỗi xóa video."); }
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

    // === HELPERS (Admin Blogs) ===
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
            createdAt: editingBlog ? editingBlog.createdAt : Date.now()
        };

        try {
            await setDoc(doc(db, 'merci_blogs', data.id), data);
            setIsAddingBlog(false);
            setEditingBlog(null);
            setNewBlog({ title: '', slug: '', metaDesc: '', content: '', coverUrl: '' });
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
        catch(e) { alert("Lỗi xóa bài viết."); }
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
            coverUrl: blog.coverUrl
        });
        setIsAddingBlog(true);
    };

    // Tải ảnh đơn có watermark
    const handleDownloadWithWatermark = async (imageUrl, imageName, event) => {
        event.stopPropagation(); 
        setIsLoading(true);
        setLoadingMessage('Đang đóng dấu bản quyền...');
        
        const addWatermarkAndDownload = (srcUrl) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; 
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const fontSize = Math.max(30, img.width / 25);
                    ctx.font = `bold ${fontSize}px serif`;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'bottom';
                    ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    ctx.shadowBlur = Math.max(5, fontSize / 4);
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.fillText('© MERCI STUDIO', canvas.width - (fontSize / 2), canvas.height - (fontSize / 2));

                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/jpeg', 0.95);
                    a.download = `${imageName ? imageName.replace(/\.[^/.]+$/, "") : 'image'}_merci.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } catch (e) {
                    alert("Hệ thống đang tải ảnh gốc cho bạn...");
                    window.open(imageUrl, '_blank');
                }
                setIsLoading(false);
            };
            img.onerror = () => {
                alert("Đang mở liên kết tải gốc...");
                window.open(imageUrl, '_blank');
                setIsLoading(false);
            };
            img.src = srcUrl;
        };

        if (imageUrl.startsWith('data:')) {
            addWatermarkAndDownload(imageUrl);
        } else {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                addWatermarkAndDownload(objectUrl);
            } catch (err) {
                addWatermarkAndDownload(imageUrl);
            }
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
                `&fields=nextPageToken,files(id,name,thumbnailLink,webContentLink)` +
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

    // === GOOGLE DRIVE IMAGE HELPERS: LINK ẢNH ỔN ĐỊNH HƠN THUMBNAIL LINK CŨ ===
    const extractDriveFolderId = (input) => {
        let folderId = (input || '').trim();
        if (!folderId) return '';
        if (folderId.includes('folders/')) folderId = folderId.split('folders/')[1].split('?')[0].split('/')[0];
        return folderId;
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
        // Không lưu thumbnailLink cũ làm link chính vì link này dễ hết hạn / vỡ ảnh.
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
        } catch (error) {
            console.error('Google login error:', error);
            alert('Không đăng nhập được Google. Hãy kiểm tra Firebase Authentication đã bật Google provider chưa.');
        }
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
            setSavedClientPages(pages);
        } catch (error) {
            console.error('Load client pages error:', error);
        }
    }, [user?.uid]);

    useEffect(() => {
        loadSavedClientPages();
    }, [loadSavedClientPages]);

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

    // === CLIENT GALLERY HELPERS ===
    const saveClientSelectionToDB = async (folderId, newSelectedSet) => {
        if (!db || !folderId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, 'client_selections', folderId), {
                selectedIds: Array.from(newSelectedSet),
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch(e) {}
        setTimeout(() => setIsSaving(false), 500); 
    };

    const loadClientSelectionFromDB = async (folderId) => {
        if (!db || !folderId) return new Set();
        try {
            const docSnap = await getDoc(doc(db, 'client_selections', folderId));
            if (docSnap.exists() && docSnap.data().selectedIds) {
                return new Set(docSnap.data().selectedIds);
            }
        } catch(e) {}
        return new Set();
    };

    const fetchDrive = async (id, options = { savePage: false }) => {
        if (!GOOGLE_API_KEY) return alert("Thiếu Google API Key!");
        if (!id || !id.trim()) return alert("Vui lòng dán link thư mục Google Drive!");

        setIsLoading(true);
        setLoadingMessage('Đang lấy toàn bộ dữ liệu album...');
        
        const folderId = extractDriveFolderId(id);
        
        setCurrentFolderId(folderId);

        try {
            const files = await getAllDriveImages(folderId);

            if (files.length > 0) {
                setLoadedImages(files.map(normalizeDriveImage));

                const newClientLink = `${window.location.origin}?folder=${folderId}`;
                setClientLink(newClientLink);

                if (options?.savePage && user?.uid) {
                    await setDoc(doc(db, 'client_pages', folderId), {
                        folderId,
                        link: newClientLink,
                        ownerUid: user.uid,
                        ownerEmail: user.email || '',
                        title: `Album chọn ảnh ${new Date().toLocaleDateString('vi-VN')}`,
                        imageCount: files.length,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    }, { merge: true });
                    loadSavedClientPages();
                }
                
                const savedSelections = await loadClientSelectionFromDB(folderId);
                setSelectedImages(savedSelections);

            } else {
                alert("Thư mục không có ảnh hoặc chưa bật quyền chia sẻ: Bất kỳ ai có liên kết.");
            }
        } catch (e) {
            console.error(e);
            alert("Lỗi khi kết nối Google Drive: " + e.message);
        } finally {
            setIsLoading(false);
        }
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
        const newLink = `${window.location.origin}?folder=${currentFolderId}&view=selected`;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(newLink).then(() => alert("Đã copy link! Bạn có thể gửi link này cho Studio để chốt ảnh."));
        } else {
            prompt("Copy đường link sau để chia sẻ:", newLink);
        }
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
            alert("Đã xảy ra lỗi trong quá trình gom file ZIP. Bạn hãy thử lại sau nhé.");
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

    const currentViewAlbum = albums.find(a => a.id === activeAlbumId);
    const filteredAlbums = activeCategory === 'Tất cả' ? albums : albums.filter(a => a.category === activeCategory);
    const displayedImages = showOnlySelected ? loadedImages.filter(img => selectedImages.has(img.id)) : loadedImages;
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

    const PaginationControls = ({ currentPage, totalPages, totalItems, onPageChange, label }) => {
        if (totalItems <= IMAGES_PER_PAGE) return null;

        const startItem = (currentPage - 1) * IMAGES_PER_PAGE + 1;
        const endItem = Math.min(currentPage * IMAGES_PER_PAGE, totalItems);

        return (
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-3 md:p-4 shadow-sm">
                <div className="text-xs md:text-sm text-slate-500 font-medium">
                    {label}: <span className="font-bold text-slate-900">{startItem}-{endItem}</span> / {totalItems} ảnh
                    <span className="ml-2 text-blue-600 font-bold">Trang {currentPage}/{totalPages}</span>
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                        Trước
                    </button>

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

                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-xl text-xs md:text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-50 hover:bg-slate-100 text-slate-700"
                    >
                        Sau
                    </button>
                </div>
            </div>
        );
    };

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
                            <input type="email" placeholder="Email Admin" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
                            <input type="password" placeholder="Mật khẩu Firebase" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
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
                                {ALBUM_CATEGORIES.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c}>{c}</option>)}
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
                                        {ALBUM_CATEGORIES.filter(c => c !== 'Tất cả').map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK ẢNH BÌA</label>
                                <input type="text" placeholder="https://..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.coverUrl || ''} onChange={e => setEditingAlbum({...editingAlbum, coverUrl: e.target.value})} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK GOOGLE DRIVE (Tùy chọn)</label>
                                <input type="text" placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={editingAlbum.driveLink || ''} onChange={e => setEditingAlbum({...editingAlbum, driveLink: e.target.value})} />
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

            {/* Video Add Modal */}
            {isAddingVideo && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md space-y-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-2xl">Thêm Video YouTube</h3>
                            <button onClick={() => setIsAddingVideo(false)} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Tiêu đề Video" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} />
                            <input type="text" placeholder="Link YouTube (VD: https://youtube.com/...)" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors" value={newVideo.url} onChange={e => setNewVideo({...newVideo, url: e.target.value})} />
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
                            <button onClick={() => { setIsAddingBlog(false); setEditingBlog(null); setNewBlog({title: '', slug: '', metaDesc: '', content: '', coverUrl: ''}); }} className="text-slate-400 hover:text-slate-700"><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">TIÊU ĐỀ BÀI VIẾT (*)</label>
                                <input type="text" placeholder="Kinh nghiệm chụp ảnh cưới..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.title} onChange={e => setNewBlog({...newBlog, title: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">ĐƯỜNG DẪN TÙY CHỈNH (SLUG - Để trống sẽ tự tạo)</label>
                                <input type="text" placeholder="kinh-nghiem-chup-anh-cuoi" className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.slug} onChange={e => setNewBlog({...newBlog, slug: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">MÔ TẢ NGẮN (META DESCRIPTION - Tốt cho SEO)</label>
                                <textarea rows={2} placeholder="Tóm tắt ngắn gọn nội dung bài viết..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.metaDesc} onChange={e => setNewBlog({...newBlog, metaDesc: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">LINK ẢNH BÌA</label>
                                <input type="text" placeholder="https://..." className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1" value={newBlog.coverUrl} onChange={e => setNewBlog({...newBlog, coverUrl: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1 flex items-center gap-2">NỘI DUNG BÀI VIẾT (Mỗi lần xuống dòng là 1 đoạn văn)</label>
                                <textarea rows={10} placeholder="Nhập nội dung bài viết vào đây..." className="w-full border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-blue-500 transition-colors mt-1 leading-relaxed" value={newBlog.content} onChange={e => setNewBlog({...newBlog, content: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                            <button onClick={() => { setIsAddingBlog(false); setEditingBlog(null); }} className="px-6 py-2.5 font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Hủy</button>
                            <button onClick={handleSaveBlog} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all">{editingBlog ? 'Lưu thay đổi' : 'Đăng bài'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Menu Header */}
            {activeTab !== 'home' && (
                <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 shadow-sm">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
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
                            <button onClick={() => isAdmin ? handleLogout() : setShowLoginModal(true)} className="md:hidden flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                                <User size={18}/> {isAdmin ? 'Thoát' : 'Đăng nhập'}
                            </button>
                        </div>

                        <div className="w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                            <nav className="flex bg-slate-100/50 p-1 rounded-full w-max md:w-auto mx-auto border border-slate-200/50">
                                {[
                                    { id: 'home', label: 'Trang chủ' },
                                    { id: 'create', label: 'Tạo trang' },
                                    { id: 'collection', label: 'Bộ sưu tập' },
                                    { id: 'videos', label: 'Video' },
                                    { id: 'blog', label: 'Blog' },
                                    { id: 'gallery', label: 'Chọn ảnh' },
                                    { id: 'filter', label: 'Lọc ảnh' }
                                ].map(t => (
                                    <button key={t.id} onClick={() => { 
                                        setActiveTab(t.id); 
                                        setActiveAlbumId(null); 
                                        setActiveBlogId(null);
                                        window.history.pushState({}, document.title, '/'); 
                                    }} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white shadow-md text-blue-600 scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <button onClick={() => isAdmin ? handleLogout() : setShowLoginModal(true)} className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                            <User size={18}/> {isAdmin ? 'Admin (Thoát)' : 'Đăng nhập'}
                        </button>
                    </div>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-grow w-full">
                <div key={activeTab} className="max-w-7xl mx-auto p-4 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                    
                    {/* --- TAB: BIO HOME TỐI GIẢN --- */}
                    {activeTab === 'home' && (
                        <div className="min-h-[80vh] flex flex-col items-center justify-center py-10 px-4 animate-in zoom-in-95 duration-700">
                            <div className="w-full max-w-sm space-y-8 text-center bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden">
                                
                                {/* Background Design Element */}
                                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-100 via-pink-50 to-white -z-10"></div>

                                {/* Avatar */}
                                <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden shadow-xl ring-4 ring-white mt-4">
                                    <img src={DEFAULT_HERO} className="w-full h-full object-cover" alt="Merci Studio Avatar" referrerPolicy="no-referrer"/>
                                </div>
                                
                                {/* Title & Bio */}
                                <div>
                                    <h1 className="text-3xl font-bold font-serif text-slate-900 mb-2">Merci Studio</h1>
                                    <p className="text-slate-500 text-sm px-4">Lưu giữ khoảnh khắc vượt thời gian. Bấm vào các link bên dưới để xem thêm.</p>
                                </div>

                                {/* Link Buttons */}
                                <div className="space-y-4">
                                    <button onClick={() => setActiveTab('collection')} className="w-full py-4 px-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:scale-105 transition-transform flex items-center justify-center gap-3">
                                        <ImageIcon className="w-5 h-5"/> Xem Bộ Sưu Tập Ảnh
                                    </button>
                                    
                                    <button onClick={() => setActiveTab('videos')} className="w-full py-4 px-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl font-bold shadow-sm hover:scale-105 hover:border-slate-300 transition-all flex items-center justify-center gap-3">
                                        <PlayCircle className="w-5 h-5 text-red-500"/> Xem Phim Phóng Sự
                                    </button>

                                    <button onClick={() => setActiveTab('blog')} className="w-full py-4 px-4 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-3 shadow-sm">
                                        <BookOpen className="w-5 h-5"/> Blog Cưới & Kinh Nghiệm
                                    </button>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <a href="https://www.facebook.com/merciwedding.vn" target="_blank" rel="noreferrer" className="py-4 px-4 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-600 hover:text-white transition-colors flex flex-col items-center justify-center gap-2 shadow-sm">
                                            <FacebookIcon className="w-6 h-6"/> <span className="text-xs">Facebook</span>
                                        </a>
                                        
                                        <a href="https://www.tiktok.com/@mercistudiovn" target="_blank" rel="noreferrer" className="py-4 px-4 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-black hover:text-white transition-colors flex flex-col items-center justify-center gap-2 shadow-sm">
                                            <TikTokIcon className="w-6 h-6"/> <span className="text-xs">TikTok</span>
                                        </a>
                                    </div>
                                    
                                    <a href="https://www.instagram.com/merciwedding.vn/" target="_blank" rel="noreferrer" className="w-full py-4 px-4 bg-pink-50 text-pink-600 rounded-2xl font-bold hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm">
                                        <InstagramIcon className="w-5 h-5"/> Follow Instagram
                                    </a>
                                </div>

                                {/* Utilities Section (Các tính năng ra ngoài) */}
                                <div className="pt-6 border-t border-slate-100">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tiện ích Khách hàng & Studio</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setActiveTab('create')} className="py-3 px-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-colors flex flex-col items-center gap-2 shadow-sm">
                                            <Wand2 className="w-5 h-5"/> <span className="text-[11px]">Tạo Trang</span>
                                        </button>
                                        <button onClick={() => setActiveTab('gallery')} className="py-3 px-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-600 hover:text-white transition-colors flex flex-col items-center gap-2 shadow-sm">
                                            <ImageIcon className="w-5 h-5"/> <span className="text-[11px]">Chọn Ảnh</span>
                                        </button>
                                        <button onClick={() => setActiveTab('filter')} className="col-span-2 py-3 px-3 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-600 hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm">
                                            <Zap className="w-5 h-5"/> <span className="text-xs">Công Cụ Lọc Ảnh</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Contact Footer */}
                                <div className="pt-6 border-t border-slate-100">
                                    <div className="text-[11px] text-slate-500 space-y-3 font-medium">
                                        <p className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4 text-blue-400"/> 244 Đội Cấn, Ba Đình, HN</p>
                                        <p className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4 text-blue-400"/> 650 Thân Nhân Trung, Việt Yên, BN</p>
                                        <p className="flex items-center justify-center gap-2"><Phone className="w-4 h-4 text-green-500"/> 0888.999.545 - 0877.999.545</p>
                                        <p className="flex items-center justify-center gap-2 truncate"><Mail className="w-4 h-4 text-purple-400 shrink-0"/> vaycuoidouyin@gmail.com</p>
                                    </div>
                                </div>
                                
                                {/* Nút ẩn dành cho Admin */}
                                <button onClick={() => setShowLoginModal(true)} className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                    <User size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: TẠO TRANG --- */}
                    {activeTab === 'create' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
                            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-left duration-500">
                                <h2 className="text-4xl md:text-6xl font-bold leading-tight text-slate-900 tracking-tight">Gửi album chọn ảnh <span className="text-blue-600">ngay lập tức.</span></h2>
                                <p className="text-slate-500 text-base md:text-xl leading-relaxed">Tiết kiệm thời gian tối đa cho Studio và Khách hàng với hệ thống chọn ảnh thông minh tích hợp Google Drive API.</p>
                                {!user && (
                                    <button onClick={handleGoogleLogin} className="bg-white border-2 border-slate-100 px-5 py-3 rounded-2xl font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2 w-fit">
                                        <User className="w-5 h-5"/> Đăng nhập Google để lưu các link đã tạo
                                    </button>
                                )}
                                <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-4 md:space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase ml-1 tracking-widest">Link folder Google Drive</label>
                                        <input value={driveLink} onChange={e => setDriveLink(e.target.value)} type="text" placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 p-3 md:p-4 rounded-xl md:rounded-2xl outline-none focus:border-blue-500 transition-colors text-sm md:text-base" />
                                    </div>
                                    <button onClick={() => fetchDrive(driveLink, { savePage: true })} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 group text-sm md:text-base">
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
                                                        navigator.clipboard.writeText(clientLink).then(()=> alert("Đã copy!"));
                                                    } else {
                                                        prompt("Copy link:", clientLink);
                                                    }
                                                }} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <img src={DEFAULT_PROMO} className="rounded-[2rem] md:rounded-[3rem] shadow-2xl object-cover aspect-[4/3] w-full animate-in zoom-in duration-700" alt="Promo" loading="lazy" referrerPolicy="no-referrer" />
                        </div>
                    )}

                    {/* --- TAB: VIDEO --- */}
                    {activeTab === 'videos' && (
                        <div className="space-y-8 md:space-y-12 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900">Phim Phóng Sự & Concept</h2>
                                {isAdmin && (
                                    <button onClick={() => setIsAddingVideo(true)} className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700 text-sm md:text-base">
                                        <Plus size={18}/> <span className="hidden sm:inline">Thêm Video</span>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                                {videos.length > 0 ? videos.map(vid => (
                                    <div key={vid.id} onClick={() => setVideoModal({isOpen: true, youtubeId: vid.youtubeId})} className="group cursor-pointer relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 bg-slate-900">
                                        <img src={`https://img.youtube.com/vi/${vid.youtubeId}/maxresdefault.jpg`} className="w-full aspect-video object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt={vid.title} referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-center justify-center">
                                            <PlayCircle className="w-16 h-16 text-white/80 group-hover:text-white transition-all group-hover:scale-110 drop-shadow-lg" />
                                        </div>
                                        <div className="absolute bottom-6 left-6 right-6 text-white">
                                            <h3 className="text-xl md:text-2xl font-bold font-serif leading-tight drop-shadow-md">{vid.title}</h3>
                                        </div>
                                        {/* Nút thao tác Admin (Sắp xếp, Xóa) */}
                                        {isAdmin && (
                                            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                <button onClick={(e) => handleMoveVideo(vid.id, 'up', e)} className="bg-white/90 p-2 md:p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110" title="Lên trên">
                                                    <ArrowUp className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => handleMoveVideo(vid.id, 'down', e)} className="bg-white/90 p-2 md:p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110" title="Xuống dưới">
                                                    <ArrowDown className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => handleDeleteVideo(vid.id, e)} className="bg-white/90 p-2 md:p-2.5 rounded-full text-red-600 hover:text-red-800 shadow-lg hover:scale-110" title="Xóa Video">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )) : (
                                    <div className="col-span-full text-center py-20 text-slate-400">
                                        <PlayCircle className="w-12 h-12 mx-auto mb-3 opacity-30"/>
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
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-3xl md:text-4xl font-bold font-serif text-slate-900">Blog Cưới</h2>
                                        {isAdmin && (
                                            <button onClick={() => setIsAddingBlog(true)} className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700 text-sm md:text-base">
                                                <FileText size={18}/> <span className="hidden sm:inline">Viết bài mới</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                                        {blogs.length > 0 ? blogs.map(blog => (
                                            <div key={blog.id} onClick={() => {
                                                setActiveBlogId(blog.id);
                                                const slugToUse = blog.slug || createSlug(blog.title) || blog.id;
                                                window.history.pushState({}, '', `/${slugToUse}`);
                                            }} className="group cursor-pointer bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                                <div className="aspect-[16/10] overflow-hidden relative">
                                                    <img src={blog.coverUrl || DEFAULT_PROMO} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={blog.title} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.target.src = DEFAULT_PROMO; }} />
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
                                                <div className="p-6 flex flex-col flex-grow">
                                                    <div className="flex items-center gap-2 text-xs text-blue-600 font-bold tracking-widest uppercase mb-3">
                                                        <Calendar className="w-4 h-4"/> {new Date(blog.createdAt).toLocaleDateString('vi-VN')}
                                                    </div>
                                                    <h3 className="text-xl md:text-2xl font-bold font-serif text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{blog.title}</h3>
                                                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 mb-6 flex-grow">{blog.metaDesc || blog.content}</p>
                                                    <span className="text-blue-600 font-semibold text-sm flex items-center gap-1 mt-auto">Đọc tiếp <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="col-span-full text-center py-20 text-slate-400">
                                                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                                                <p className="text-sm md:text-base">Chưa có bài viết nào.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="animate-in slide-in-from-right duration-500 max-w-4xl mx-auto bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
                                        <button onClick={() => {
                                            setActiveBlogId(null);
                                            window.history.pushState({}, document.title, '/'); 
                                        }} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium">
                                            <ArrowLeft size={20}/> Quay lại danh sách
                                        </button>
                                        
                                        <button onClick={() => {
                                            const slugToUse = currentViewBlog?.slug || createSlug(currentViewBlog?.title) || currentViewBlog?.id;
                                            const link = `${window.location.origin}/${slugToUse}`;
                                            if(navigator.clipboard && window.isSecureContext) {
                                                navigator.clipboard.writeText(link).then(() => alert("Đã copy link bài viết này!"));
                                            } else {
                                                prompt("Copy link:", link);
                                            }
                                        }} className="flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all font-semibold text-sm">
                                            <LinkIcon size={16}/> Copy Link
                                        </button>
                                    </div>

                                    {currentViewBlog && (
                                        <article className="prose prose-slate prose-lg md:prose-xl max-w-none">
                                            <div className="flex items-center gap-2 text-sm text-blue-600 font-bold tracking-widest uppercase mb-4">
                                                <Calendar className="w-4 h-4"/> {new Date(currentViewBlog.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                            <h1 className="text-3xl md:text-5xl font-bold font-serif text-slate-900 leading-tight mb-8">
                                                {currentViewBlog.title}
                                            </h1>
                                            {currentViewBlog.coverUrl && (
                                                <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden mb-10 shadow-md">
                                                    <img src={currentViewBlog.coverUrl} className="w-full h-full object-cover" alt={currentViewBlog.title} referrerPolicy="no-referrer" />
                                                </div>
                                            )}
                                            
                                            {/* Phần nội dung bài viết hỗ trợ xuống dòng */}
                                            <div className="text-slate-700 leading-relaxed space-y-6 text-base md:text-lg">
                                                {currentViewBlog.content.split('\n').map((paragraph, idx) => (
                                                    paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx}/>
                                                ))}
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
                                            <button onClick={() => setIsCreatingAlbum(true)} className="bg-blue-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-blue-700 text-sm md:text-base">
                                                <Plus size={18}/> <span className="hidden sm:inline">Album mới</span>
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex overflow-x-auto gap-2 md:gap-3 mb-6 md:mb-8 no-scrollbar pb-2">
                                        {ALBUM_CATEGORIES.map(cat => (
                                            <button 
                                                key={cat} 
                                                onClick={() => { setActiveCategory(cat); if (cat === 'Tất cả') window.history.pushState({}, '', window.location.pathname); else window.history.pushState({}, '', `${window.location.pathname}${getCategoryHash(cat)}`); }} 
                                                className={`px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all duration-300 ${activeCategory === cat ? 'bg-slate-900 text-white shadow-md scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'}`}
                                            >
                                                {cat === 'Tất cả' ? cat : `#${cat}`}
                                            </button>
                                        ))}
                                    </div>

                                    {activeCategory !== 'Tất cả' && (
                                        <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Link gửi khách theo hashtag</p>
                                                <p className="font-mono text-sm text-blue-700 truncate">{`${window.location.origin}/${getCategoryHash(activeCategory)}`}</p>
                                            </div>
                                            <button onClick={() => {
                                                const link = `${window.location.origin}/${getCategoryHash(activeCategory)}`;
                                                if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(() => alert('Đã copy link hashtag!'));
                                                else prompt('Copy link:', link);
                                            }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                                                <Copy className="w-4 h-4"/> Copy link #{activeCategory}
                                            </button>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
                                        {filteredAlbums.length > 0 ? filteredAlbums.map(a => (
                                            <div key={a.id} onClick={() => {
                                                setActiveAlbumId(a.id); 
                                                setAlbumDriveLink(a.driveLink || '');
                                                setLightboxData(p => ({...p, images: a.images||[]}));
                                                // Thay đổi URL trình duyệt cho ĐẸP
                                                const slugToUse = a.slug || createSlug(a.title) || a.id;
                                                window.history.pushState({}, '', `/${slugToUse}`);
                                            }} className="group cursor-pointer relative">
                                                <div className="aspect-[4/5] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden mb-4 md:mb-6 bg-slate-200 relative shadow-md group-hover:shadow-2xl transition-all duration-500">
                                                    <img src={a.coverUrl || (a.coverId ? getDriveThumbUrl(a.coverId, 'w1200') : DEFAULT_COVER)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={a.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = a.coverId ? getDriveThumbUrl(a.coverId, 'w600') : DEFAULT_COVER; }} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity"></div>
                                                    <div className="absolute top-4 md:top-6 left-4 md:left-6 bg-white/95 backdrop-blur-md px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm">{a.category}</div>
                                                    
                                                    {/* Các nút thao tác Admin (Sắp xếp Lên/Xuống, Sửa) */}
                                                    {isAdmin && (
                                                        <div className="absolute top-4 md:top-6 right-4 md:right-6 z-20 flex flex-col gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                            {/* Chỉ hiện mũi tên Lên/Xuống nếu đang ở tab 'Tất cả' */}
                                                            {activeCategory === 'Tất cả' && (
                                                                <>
                                                                    <button onClick={(e) => handleMoveAlbum(a.id, 'up', e)} className="bg-white/90 p-2 md:p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110" title="Lên trên">
                                                                        <ArrowUp className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={(e) => handleMoveAlbum(a.id, 'down', e)} className="bg-white/90 p-2 md:p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110" title="Xuống dưới">
                                                                        <ArrowDown className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button onClick={(e) => { e.stopPropagation(); setEditingAlbum(a); }} className="bg-white/90 p-2 md:p-2.5 rounded-full text-slate-700 hover:text-blue-600 shadow-lg hover:scale-110" title="Sửa Album">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 right-6 md:right-8 text-white">
                                                        <h3 className="text-2xl md:text-3xl font-bold font-serif mb-1 md:mb-2 leading-tight">{a.title}</h3>
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] md:text-xs font-medium opacity-90 uppercase tracking-widest">{a.images?.length || 0} tác phẩm</p>
                                                            {a.sub && <p className="text-[10px] md:text-xs opacity-70 truncate max-w-[50%]">{a.sub}</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="col-span-full text-center py-20 text-slate-400">
                                                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                                                <p className="text-sm md:text-base">Chưa có album nào trong danh mục này.</p>
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
                                                window.history.pushState({}, document.title, '/'); // Xóa link ảo khi Back
                                            }} className="flex items-center justify-center gap-2 text-slate-500 bg-white hover:bg-slate-50 px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border shadow-sm transition-all active:scale-95 text-sm md:text-base flex-1 md:flex-none">
                                                <ArrowLeft size={18}/> Quay lại
                                            </button>
                                            
                                            {/* Link Album MỚI (Dạng Slug đẹp) */}
                                            <button onClick={() => {
                                                const slugToUse = currentViewAlbum?.slug || createSlug(currentViewAlbum?.title) || currentViewAlbum?.id;
                                                const link = `${window.location.origin}/${slugToUse}`;
                                                if(navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(link).then(() => alert("Đã copy link Album này!"));
                                                } else {
                                                    prompt("Copy link:", link);
                                                }
                                            }} className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-blue-100 shadow-sm transition-all font-semibold flex-1 md:flex-none text-sm md:text-base">
                                                <LinkIcon size={18}/> <span className="hidden sm:inline">Copy Link</span>
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
                                                    <RefreshCcw size={16}/> Reload Drive
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-center px-4">
                                        <h2 className="text-3xl md:text-5xl font-bold font-serif text-slate-900 mb-2">{currentViewAlbum?.title}</h2>
                                        <p className="text-slate-500 text-sm md:text-base">{currentViewAlbum?.sub}</p>
                                    </div>

                                    <PaginationControls
                                        currentPage={safeAlbumPage}
                                        totalPages={albumTotalPages}
                                        totalItems={albumImages.length}
                                        onPageChange={setAlbumPage}
                                        label="Bộ sưu tập"
                                    />

                                    <div className="masonry-grid">
                                        {paginatedAlbumImages.map((img: any, i: number) => {
                                            const isCover = currentViewAlbum?.coverId === img.id || currentViewAlbum?.coverUrl === img.url;
                                            const originalIndex = albumStartIndex + i;
                                            
                                            return (
                                                <div key={img.id} className="mb-4 md:mb-6 relative group rounded-[1.5rem] md:rounded-[2rem] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all" onClick={() => setLightboxData({isOpen: true, index: originalIndex, images: albumImages})}>
                                                    <img src={img.url || getDriveThumbUrl(img.id, 'w1200')} className="w-full transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" alt={img.name || "Album"} referrerPolicy="no-referrer" onError={(e) => handleImageError(e, img)} />
                                                    
                                                    {/* Nút Tải xuống */}
                                                    <div className="absolute top-3 right-3 md:top-4 md:right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:translate-y-2 md:group-hover:translate-y-0 z-20">
                                                        <button onClick={(e) => handleDownloadWithWatermark(img.originalUrl, img.name, e)} className="bg-white/90 p-2 md:p-3 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-xl" title="Tải ảnh">
                                                            <Download size={16} className="md:w-5 md:h-5"/>
                                                        </button>
                                                    </div>

                                                    {/* Nút Đặt làm Ảnh Bìa (Chỉ hiện với Admin) */}
                                                    {isAdmin && (
                                                        <div className={`absolute top-3 left-3 md:top-4 md:left-4 transition-all z-20 ${isCover ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                                                            <button 
                                                                onClick={(e) => handleSetCover(e, img.url)} 
                                                                className={`p-2 md:p-3 rounded-full shadow-xl transition-all ${isCover ? 'bg-yellow-400 text-white' : 'bg-white/90 text-slate-400 hover:bg-yellow-400 hover:text-white'}`}
                                                                title={isCover ? "Đây là ảnh bìa hiện tại" : "Đặt làm ảnh bìa"}
                                                            >
                                                                <Star size={16} className={`md:w-5 md:h-5 ${isCover ? "fill-current" : ""}`} />
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
                    {activeTab === 'filter' && (
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
                    {activeTab === 'gallery' && (
                        <div className="space-y-8 md:space-y-10 animate-in zoom-in-95 duration-500">
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-5 md:p-6 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-2xl md:text-3xl font-bold font-serif text-slate-900">Các link chọn ảnh đã tạo</h2>
                                        <p className="text-sm text-slate-500">Danh sách này lưu theo tài khoản Google đang đăng nhập.</p>
                                    </div>
                                    {!user ? (
                                        <button onClick={handleGoogleLogin} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                            <User className="w-4 h-4"/> Đăng nhập Google
                                        </button>
                                    ) : (
                                        <button onClick={loadSavedClientPages} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                            <RefreshCcw className="w-4 h-4"/> Tải lại danh sách
                                        </button>
                                    )}
                                </div>
                                {user && savedClientPages.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {savedClientPages.map(page => (
                                            <div key={page.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50 flex flex-col gap-3">
                                                <div>
                                                    <p className="font-bold text-slate-900">{page.title || 'Album chọn ảnh'}</p>
                                                    <p className="text-xs text-slate-500">{page.imageCount || 0} ảnh · {page.ownerEmail}</p>
                                                    <p className="font-mono text-xs text-blue-700 truncate mt-1">{page.link}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => fetchDrive(page.folderId)} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-colors">Mở</button>
                                                    <button onClick={() => {
                                                        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(page.link).then(() => alert('Đã copy link!'));
                                                        else prompt('Copy link:', page.link);
                                                    }} className="flex-1 bg-slate-900 text-white rounded-xl px-3 py-2 text-xs font-bold hover:bg-blue-600 transition-colors">Copy</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {loadedImages.length > 0 ? (
                                <>
                                    {/* Control Bar */}
                                    <div className="sticky top-16 md:top-20 z-30 bg-white/95 backdrop-blur-xl p-3 md:p-4 border border-slate-100 rounded-2xl md:rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 shadow-xl">
                                        <div className="flex items-center justify-between w-full md:w-auto px-1 md:pl-2">
                                            <div className="flex items-center gap-2 text-pink-500 font-bold bg-pink-50 px-3 md:px-4 py-1.5 md:py-2 rounded-xl whitespace-nowrap text-sm md:text-base">
                                                <Heart className="w-4 h-4 md:w-5 md:h-5 fill-current" /> <span>{selectedImages.size}</span> ảnh
                                            </div>
                                            {isSaving && <span className="text-[10px] md:text-xs text-slate-400 font-medium flex items-center gap-1"><RefreshCcw className="w-3 h-3 animate-spin"/> Đang lưu...</span>}
                                            {!isSaving && <span className="text-[10px] md:text-xs text-green-500 font-medium flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 md:w-4 md:h-4"/> Đã lưu</span>}
                                        </div>

                                        {/* Toggle View Mode */}
                                        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                                            <button onClick={() => setShowOnlySelected(false)} className={`flex-1 md:flex-none px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${!showOnlySelected ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Tất cả ảnh</button>
                                            <button onClick={() => setShowOnlySelected(true)} className={`flex-1 md:flex-none px-4 md:px-6 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${showOnlySelected ? 'bg-white shadow-sm text-pink-600' : 'text-slate-500'}`}>Chỉ ảnh đã chọn</button>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 w-full md:w-auto justify-end flex-wrap">
                                            <button onClick={() => {
                                                const names = Array.from(selectedImages).map(id => loadedImages.find(img => img.id === id)?.name).filter(Boolean);
                                                if(navigator.clipboard && window.isSecureContext) {
                                                    navigator.clipboard.writeText(names.join('\n')).then(()=> alert("Đã copy danh sách tên file!"));
                                                } else {
                                                    prompt("Copy danh sách:", names.join('\n'));
                                                }
                                            }} className="bg-slate-100 hover:bg-slate-200 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all text-slate-700 shadow-sm flex items-center justify-center flex-1 md:flex-none">
                                                <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"/> <span>Copy Tên</span>
                                            </button>
                                            
                                            <button onClick={generateSelectedImagesLink} className="bg-pink-100 hover:bg-pink-200 text-pink-700 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-1 md:flex-none">
                                                <LinkIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"/> <span>Link Chốt</span>
                                            </button>

                                            <button onClick={handleDownloadSelected} className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all shadow-sm flex items-center justify-center flex-1 md:flex-none">
                                                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2"/> <span>Tải ZIP</span>
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
                                                const isSelected = selectedImages.has(img.id);
                                                const originalIndex = galleryStartIndex + idx;
                                                return (
                                                    <div key={img.id} className={`aspect-[3/4] relative group rounded-xl md:rounded-2xl overflow-hidden border-2 md:border-4 transition-all duration-300 ${isSelected ? 'border-pink-500 shadow-xl shadow-pink-500/20 scale-[0.98]' : 'border-transparent hover:shadow-lg'}`}>
                                                        <img 
                                                            src={img.url || getDriveThumbUrl(img.id, 'w1200')} 
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer" 
                                                            alt={img.name || "Gallery"} 
                                                            loading="lazy" decoding="async"
                                                            referrerPolicy="no-referrer"
                                                            onError={(e) => handleImageError(e, img)}
                                                            onClick={() => { setLightboxData({isOpen: true, index: originalIndex, images: displayedImages}); }}
                                                        />
                                                        
                                                        {/* Nút thả tim to */}
                                                        <div 
                                                            onClick={(e) => toggleImageSelect(img.id, e)}
                                                            className={`absolute bottom-2 right-2 md:bottom-3 md:right-3 w-10 h-10 md:w-12 md:h-12 cursor-pointer rounded-full flex items-center justify-center backdrop-blur-md transition-all ${isSelected ? 'bg-pink-500 text-white scale-110 shadow-lg' : 'bg-black/40 text-white/80 hover:bg-pink-500/80 hover:text-white md:hover:scale-110'}`}
                                                        >
                                                            <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isSelected ? 'fill-current' : ''}`}/>
                                                        </div>

                                                        {/* Tên ảnh */}
                                                        <div className="absolute top-1 left-1 right-1 md:top-2 md:left-2 md:right-2 flex justify-between pointer-events-none">
                                                            <span className="bg-black/50 text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md backdrop-blur-sm truncate">{img.name}</span>
                                                        </div>
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
                                <div className="text-center py-20 md:py-40 bg-white rounded-[2rem] md:rounded-[3rem] border border-dashed border-slate-200 shadow-sm mx-2">
                                    <ImageIcon size={48} className="mx-auto text-slate-300 mb-4 opacity-40" />
                                    <p className="text-slate-400 font-medium text-sm md:text-base px-4">Vui lòng dán link Drive vào mục "Tạo trang" để xem ảnh.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* LIGHTBOX FOR GALLERY & ALBUMS */}
            {lightboxData.isOpen && lightboxData.images.length > 0 && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/95 md:bg-black/98 backdrop-blur-md md:backdrop-blur-xl flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300"
                    onTouchStart={(e) => {
                        setTouchEnd(null);
                        setTouchStart(e.targetTouches[0].clientX);
                    }}
                    onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
                    onTouchEnd={() => {
                        if (!touchStart || !touchEnd) return;
                        const distance = touchStart - touchEnd;
                        const isLeftSwipe = distance > 50;
                        const isRightSwipe = distance < -50;
                        if (isLeftSwipe) nextImg();
                        if (isRightSwipe) prevImg();
                    }}
                >
                    <div className="absolute top-4 md:top-6 left-4 md:left-6 text-white/50 font-mono text-xs md:text-sm tracking-widest pointer-events-none z-[210]">
                        {lightboxData.index + 1} / {lightboxData.images.length}
                    </div>

                    <button onClick={() => setLightboxData({isOpen: false, index: 0, images: []})} className="absolute top-4 md:top-6 right-4 md:right-6 text-white/50 hover:text-white transition-all z-[210] p-2 bg-white/10 rounded-full hover:rotate-90"><X className="w-6 h-6 md:w-8 md:h-8"/></button>
                    
                    <img 
                        key={lightboxData.index}
                        src={lightboxData.images[lightboxData.index]?.originalUrl || lightboxData.images[lightboxData.index]?.url || getDriveThumbUrl(lightboxData.images[lightboxData.index]?.id, 'w2400')} 
                        onError={(e) => {
                            // Nếu ảnh gốc chất lượng cao (=s0) bị Google Drive chặn, tự động lùi về ảnh xem trước (=w600)
                            const fallbackSrc = lightboxData.images[lightboxData.index]?.url;
                            if (e.target.src !== fallbackSrc) {
                                e.target.src = fallbackSrc;
                            }
                        }}
                        className="w-full h-full md:max-w-full md:max-h-full object-contain md:shadow-2xl animate-in zoom-in-95 duration-300 select-none pointer-events-none" 
                        alt="Zoomed"
                        draggable={false}
                        referrerPolicy="no-referrer"
                    />
                    
                    <button className="absolute left-2 md:left-6 text-white/30 hover:text-white p-3 md:p-4 rounded-full hidden sm:block hover:bg-white/10 transition-all z-[210]" onClick={prevImg}><ArrowLeft className="w-8 h-8 md:w-14 md:h-14" /></button>
                    <button className="absolute right-2 md:right-6 text-white/30 hover:text-white p-3 md:p-4 rounded-full hidden sm:block hover:bg-white/10 transition-all z-[210]" onClick={nextImg}><ArrowRight className="w-8 h-8 md:w-14 md:h-14" /></button>
                    
                    {/* Hướng dẫn vuốt trên Mobile */}
                    <div className="absolute bottom-6 sm:hidden w-full flex justify-center text-white/30 text-xs tracking-widest pointer-events-none z-[210] items-center gap-2">
                        <ArrowLeft className="w-3 h-3"/> Vuốt để chuyển ảnh <ArrowRight className="w-3 h-3"/>
                    </div>
                </div>
            )}

            {/* LIGHTBOX FOR YOUTUBE VIDEOS */}
            {videoModal.isOpen && (
                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button onClick={() => setVideoModal({isOpen: false, youtubeId: ''})} className="absolute top-6 right-6 text-white/50 hover:text-white transition-all z-[310] p-2 bg-white/10 rounded-full hover:rotate-90"><X className="w-8 h-8"/></button>
                    <div className="w-full max-w-5xl aspect-video rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 bg-black">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            src={`https://www.youtube.com/embed/${videoModal.youtubeId}?autoplay=1`} 
                            frameBorder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowFullScreen>
                        </iframe>
                    </div>
                </div>
            )}
        </div>
    );
}