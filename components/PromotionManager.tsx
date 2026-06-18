'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Gift, Plus, Trash2, Settings, Play, Check, X, AlertCircle, 
    Sparkles, Calculator, Ticket, Edit, CheckCircle,
    Power, Calendar, Search, Users, RefreshCw, Coins
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, deleteDoc, doc, getDoc, setDoc, getDocs, where, updateDoc } from 'firebase/firestore';

interface WheelSlice {
    id: string;
    text: string;
    color: string;
    weight: number; // Tỷ lệ trúng
}

interface PromoCode {
    id: string;
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    minOrderValue: number;
    isActive: boolean;
    maxUses: number;
    usedCount: number;
    expiryDate: string;
}

interface WinnerRegistration {
    id: string;
    name: string;
    phone: string;
    prizeText: string;
    prizeCode: string;
    createdAt: string;
}

// Cấu hình Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Khởi tạo Firebase Firestore
let db: any = null;
if (typeof window !== 'undefined') {
    try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        db = getFirestore(app);
    } catch (e) {
        console.error('Firebase initialization error in PromotionManager:', e);
    }
}

export default function PromotionManager() {
    const [activeSubTab, setActiveSubTab] = useState<'wheel' | 'codes' | 'winners' | 'loyalty'>('wheel');

    // --- STATE FOR LUCKY WHEEL ---
    const [slices, setSlices] = useState<WheelSlice[]>([
        { id: '1', text: 'Giảm 10% gói chụp', color: '#FF6B6B', weight: 4 },
        { id: '2', text: 'Tặng Album Mini', color: '#4D96FF', weight: 2 },
        { id: '3', text: 'Miễn phí Ship ảnh', color: '#6BCB77', weight: 5 },
        { id: '4', text: 'Voucher 500k', color: '#FFD93D', weight: 1 },
        { id: '5', text: 'Thêm 5 ảnh chỉnh sửa', color: '#9B5DE5', weight: 3 },
        { id: '6', text: 'Chúc bạn may mắn', color: '#F15BB5', weight: 6 },
    ]);

    const [newSliceText, setNewSliceText] = useState('');
    const [newSliceColor, setNewSliceColor] = useState('#3b82f6');
    const [newSliceWeight, setNewSliceWeight] = useState(1);

    const [isSpinning, setIsSpinning] = useState(false);
    const [winner, setWinner] = useState<WheelSlice | null>(null);
    const [wheelAngle, setWheelAngle] = useState(0);

    // Publication state
    const [isPublished, setIsPublished] = useState(false);
    const [publishedSlices, setPublishedSlices] = useState<WheelSlice[]>([]);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);
    const lastTickIndexRef = useRef<number>(-1);

    // --- STATE FOR PROMO CODES ---
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
        { id: 'c1', code: 'MERCI10', type: 'percent', value: 10, minOrderValue: 200000, isActive: true, maxUses: 100, usedCount: 12, expiryDate: '2026-12-31' },
        { id: 'c2', code: 'HAPPY500K', type: 'fixed', value: 500000, minOrderValue: 5000000, isActive: true, maxUses: 10, usedCount: 2, expiryDate: '2026-08-30' },
        { id: 'c3', code: 'FREESHIP', type: 'fixed', value: 30000, minOrderValue: 0, isActive: false, maxUses: 50, usedCount: 50, expiryDate: '2026-06-01' },
    ]);

    const [showCodeForm, setShowCodeForm] = useState(false);
    const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
    const [codeForm, setCodeForm] = useState({
        code: '',
        type: 'percent' as 'percent' | 'fixed',
        value: 10,
        minOrderValue: 0,
        maxUses: 100,
        expiryDate: '2026-12-31'
    });

    // --- STATE FOR PROMO SIMULATOR ---
    const [simOrderValue, setSimOrderValue] = useState(1500000);
    const [simCodeInput, setSimCodeInput] = useState('');
    const [simResult, setSimResult] = useState<{
        success: boolean;
        message: string;
        discount?: number;
        finalTotal?: number;
    } | null>(null);

    // --- WINNERS LOG ---
    const [winners, setWinners] = useState<WinnerRegistration[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingWinners, setIsLoadingWinners] = useState(true);

    // --- LOYALTY POINTS & REFERRALS LOG ---
    const [usersList, setUsersList] = useState<any[]>([]);
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [selectedUserForPoints, setSelectedUserForPoints] = useState<any | null>(null);
    const [pointsChangeVal, setPointsChangeVal] = useState<number>(100);
    const [pointsChangeReason, setPointsChangeReason] = useState('Tặng điểm thành viên');
    const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

    useEffect(() => {
        if (activeSubTab !== 'loyalty' || !db) return;
        setIsLoadingUsers(true);
        const q = query(collection(db, 'merci_users'), orderBy('createdAt', 'desc'));
        
        const unsub = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setUsersList(list);
            setIsLoadingUsers(false);
        }, (err) => {
            console.error("Error listening to users:", err);
            setIsLoadingUsers(false);
        });

        return () => unsub();
    }, [activeSubTab, db]);

    const handleUpdateUserPoints = async () => {
        if (!selectedUserForPoints || !db) return;
        if (!pointsChangeReason.trim()) {
            alert('Vui lòng nhập lý do điều chỉnh điểm.');
            return;
        }

        setIsUpdatingPoints(true);
        try {
            const userDocRef = doc(db, 'merci_users', selectedUserForPoints.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                alert('Người dùng không tồn tại.');
                setIsUpdatingPoints(false);
                return;
            }

            const userData = userDoc.data();
            const newPoints = (userData.points || 0) + Number(pointsChangeVal);
            
            await updateDoc(userDocRef, {
                points: newPoints,
                history: [
                    ...(userData.history || []),
                    {
                        id: `tx_${Date.now()}_admin`,
                        amount: Number(pointsChangeVal),
                        type: 'admin',
                        description: pointsChangeReason.trim(),
                        createdAt: Date.now()
                    }
                ]
            });

            alert('Cập nhật điểm thành công!');
            setSelectedUserForPoints(null);
            setPointsChangeReason('Tặng điểm thành viên');
            setPointsChangeVal(100);
        } catch (error) {
            console.error('Error updating user points:', error);
            alert('Có lỗi xảy ra khi cập nhật điểm.');
        } finally {
            setIsUpdatingPoints(false);
        }
    };

    const filteredUsers = usersList.filter(u => {
        const email = (u.email || '').toLowerCase();
        const code = (u.referralCode || '').toLowerCase();
        const queryVal = searchUserQuery.toLowerCase();
        return email.includes(queryVal) || code.includes(queryVal);
    });

    // --- CONFETTI STATE ---
    const [showConfetti, setShowConfetti] = useState(false);
    const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

    // --- INITIALIZE & LOCAL STORAGE ---
    useEffect(() => {
        const savedSlices = localStorage.getItem('merci_draft_wheel_slices');
        if (savedSlices) {
            try { setSlices(JSON.parse(savedSlices)); } catch (e) { console.error(e); }
        }

        const savedCodes = localStorage.getItem('merci_draft_promo_codes');
        if (savedCodes) {
            try { setPromoCodes(JSON.parse(savedCodes)); } catch (e) { console.error(e); }
        }

        const fetchPublishedConfig = async () => {
            if (!db) {
                setIsLoadingConfig(false);
                return;
            }
            try {
                const docRef = doc(db, 'merci_wheel_config', 'settings');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setIsPublished(!!data.isPublished);
                    if (data.slices) {
                        setPublishedSlices(data.slices);
                    }
                }
            } catch (err) {
                console.error('Error loading published wheel config:', err);
            } finally {
                setIsLoadingConfig(false);
            }
        };

        fetchPublishedConfig();
    }, []);

    const saveSlicesToLocal = (updated: WheelSlice[]) => {
        setSlices(updated);
        localStorage.setItem('merci_draft_wheel_slices', JSON.stringify(updated));
    };

    const saveCodesToLocal = (updated: PromoCode[]) => {
        setPromoCodes(updated);
        localStorage.setItem('merci_draft_promo_codes', JSON.stringify(updated));
    };

    // --- PLAY SOUND EFFECT USING WEB AUDIO API ---
    const playAudio = (type: 'tick' | 'win') => {
        if (typeof window === 'undefined') return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            
            if (type === 'tick') {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                osc.start();
                osc.stop(ctx.currentTime + 0.05);
            } else if (type === 'win') {
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, index) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);
                    gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.12);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.25);
                    osc.start(ctx.currentTime + index * 0.12);
                    osc.stop(ctx.currentTime + index * 0.12 + 0.25);
                });
            }
        } catch (e) {
            console.error('AudioContext fail:', e);
        }
    };

    // --- CONFETTI CANVAS ANIMATION ---
    useEffect(() => {
        if (!showConfetti) return;
        const canvas = confettiCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = canvas.offsetWidth);
        let height = (canvas.height = canvas.offsetHeight);

        const handleResize = () => {
            if (!canvas) return;
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        };
        window.addEventListener('resize', handleResize);

        const particles: Array<{
            x: number;
            y: number;
            size: number;
            color: string;
            speedX: number;
            speedY: number;
            rotation: number;
            rotationSpeed: number;
        }> = [];

        const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#ff7849'];

        // Spawn particles
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height - height,
                size: Math.random() * 8 + 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 4 - 2,
                speedY: Math.random() * 5 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5
            });
        }

        let animationFrameId: number;
        const render = () => {
            ctx.clearRect(0, 0, width, height);
            let active = false;

            particles.forEach((p) => {
                p.y += p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotationSpeed;

                if (p.y < height) {
                    active = true;
                }

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            if (active) {
                animationFrameId = requestAnimationFrame(render);
            } else {
                setShowConfetti(false);
            }
        };

        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [showConfetti]);

    // --- FETCH WINNERS FROM FIRESTORE OR LOCALSTORAGE ---
    useEffect(() => {
        if (activeSubTab !== 'winners') return;

        setIsLoadingWinners(true);

        let unsubscribe = () => {};

        // 1. Try Firestore if active
        if (db) {
            try {
                const q = query(collection(db, 'merci_spin_registrations'), orderBy('createdAt', 'desc'));
                unsubscribe = onSnapshot(q, (snapshot) => {
                    const list: WinnerRegistration[] = [];
                    snapshot.forEach((doc) => {
                        list.push({ id: doc.id, ...doc.data() } as WinnerRegistration);
                    });
                    setWinners(list);
                    setIsLoadingWinners(false);
                }, (error) => {
                    console.error('Error fetching from Firestore, falling back:', error);
                    loadLocalWinners();
                });
            } catch (err) {
                console.error(err);
                loadLocalWinners();
            }
        } else {
            loadLocalWinners();
        }

        function loadLocalWinners() {
            const localLog = localStorage.getItem('merci_local_registrations_log');
            if (localLog) {
                try {
                    const parsed = JSON.parse(localLog);
                    const formatted = parsed.map((item: any, index: number) => ({
                        id: `local_${index}`,
                        name: item.name,
                        phone: item.phone,
                        prizeText: item.prize,
                        prizeCode: item.code,
                        createdAt: item.date
                    })).reverse(); // Newest first
                    setWinners(formatted);
                } catch (e) {
                    console.error(e);
                }
            }
            setIsLoadingWinners(false);
        }

        return () => unsubscribe();
    }, [activeSubTab]);

    // --- DELETE WINNER ENTRY ---
    const deleteWinner = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa lượt trúng thưởng này?')) return;

        if (id.startsWith('local_')) {
            const indexStr = id.replace('local_', '');
            const index = winners.length - 1 - parseInt(indexStr); // reverse indexing
            const localLog = localStorage.getItem('merci_local_registrations_log');
            if (localLog) {
                try {
                    const parsed = JSON.parse(localLog);
                    parsed.splice(index, 1);
                    localStorage.setItem('merci_local_registrations_log', JSON.stringify(parsed));
                    
                    // update UI list
                    const formatted = parsed.map((item: any, idx: number) => ({
                        id: `local_${idx}`,
                        name: item.name,
                        phone: item.phone,
                        prizeText: item.prize,
                        prizeCode: item.code,
                        createdAt: item.date
                    })).reverse();
                    setWinners(formatted);
                } catch (e) {
                    console.error(e);
                }
            }
            return;
        }

        if (db) {
            try {
                await deleteDoc(doc(db, 'merci_spin_registrations', id));
            } catch (err) {
                console.error('Failed to delete:', err);
                alert('Không thể xóa bản ghi trên Database');
            }
        }
    };

    // --- DRAW WHEEL ON CANVAS ---
    const drawWheel = (angle: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width;
        const center = size / 2;
        const radius = center - 15;

        ctx.clearRect(0, 0, size, size);

        // Draw shadow/outer border
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b'; // Slate 800 outer ring
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 5;
        ctx.fill();
        ctx.restore();

        // Draw segments
        const numSlices = slices.length;
        const arc = (Math.PI * 2) / numSlices;

        slices.forEach((slice, i) => {
            const startAngle = i * arc + angle;
            const endAngle = (i + 1) * arc + angle;

            // Draw segment slice
            ctx.beginPath();
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.lineTo(center, center);
            ctx.fillStyle = slice.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + arc / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            
            // Text shadow for readability
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;

            const textToShow = slice.text.length > 20 ? slice.text.substring(0, 18) + '...' : slice.text;
            ctx.fillText(textToShow, radius - 20, 0);
            ctx.restore();
        });

        // Draw center peg
        ctx.beginPath();
        ctx.arc(center, center, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 6;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(center, center, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6'; // Blue center
        ctx.fill();
    };

    // Redraw wheel when slices or wheelAngle changes
    useEffect(() => {
        drawWheel(wheelAngle);
    }, [slices, wheelAngle]);

    // --- SPIN LOGIC ---
    const spinWheel = () => {
        if (isSpinning || slices.length === 0) return;

        setIsSpinning(true);
        setWinner(null);
        setShowConfetti(false);

        // 1. Choose winner based on probability weights
        const totalWeight = slices.reduce((sum, s) => sum + s.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        let selectedIndex = 0;

        for (let i = 0; i < slices.length; i++) {
            randomWeight -= slices[i].weight;
            if (randomWeight <= 0) {
                selectedIndex = i;
                break;
            }
        }

        const selectedPrize = slices[selectedIndex];

        // 2. Calculate target angle
        const currentNorm = wheelAngle % (Math.PI * 2);
        const arc = (Math.PI * 2) / slices.length;

        const targetSliceAngle = (1.5 * Math.PI) - (selectedIndex * arc + arc / 2);
        
        // Spin multiple times
        const baseSpins = 5 + Math.random() * 3; // 5 to 8 full spins
        const finalAngle = wheelAngle - currentNorm + targetSliceAngle - (baseSpins * Math.PI * 2);

        // 3. Animation details
        const duration = 4000; // 4 seconds
        const startTime = performance.now();
        const startAngle = wheelAngle;
        lastTickIndexRef.current = -1;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic Easing Out
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentAngle = startAngle + (finalAngle - startAngle) * easeProgress;
            
            setWheelAngle(currentAngle);

            // Tick Sound Logic
            const relativeAngle = (1.5 * Math.PI - currentAngle) % (Math.PI * 2);
            const normalizedAngle = relativeAngle < 0 ? relativeAngle + Math.PI * 2 : relativeAngle;
            const currentSegmentIndex = Math.floor(normalizedAngle / arc) % slices.length;

            if (currentSegmentIndex !== lastTickIndexRef.current && currentSegmentIndex >= 0) {
                playAudio('tick');
                lastTickIndexRef.current = currentSegmentIndex;
            }

            if (progress < 1) {
                requestRef.current = requestAnimationFrame(animate);
            } else {
                // Done spinning
                setIsSpinning(false);
                setWinner(selectedPrize);
                playAudio('win');
                setShowConfetti(true);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
    };

    // Clean up animation frame
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // --- WHEEL CONFIG EDIT ---
    const addSlice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSliceText.trim()) return;

        const newSlice: WheelSlice = {
            id: Date.now().toString(),
            text: newSliceText.trim(),
            color: newSliceColor,
            weight: Number(newSliceWeight) || 1
        };

        const updated = [...slices, newSlice];
        saveSlicesToLocal(updated);

        setNewSliceText('');
        setNewSliceWeight(1);
    };

    const deleteSlice = (id: string) => {
        if (slices.length <= 2) {
            alert('Cần có ít nhất 2 phần thưởng để quay!');
            return;
        }
        const updated = slices.filter(s => s.id !== id);
        saveSlicesToLocal(updated);
    };

    // --- PUBLISH / UNPUBLISH WHEEL ---
    const handlePublish = async () => {
        if (!db) {
            alert('Lỗi: Firebase Database chưa được khởi tạo.');
            return;
        }
        try {
            const docRef = doc(db, 'merci_wheel_config', 'settings');
            await setDoc(docRef, {
                slices: slices,
                isPublished: true,
                updatedAt: new Date().toISOString()
            });
            setIsPublished(true);
            setPublishedSlices(slices);
            alert('Đã đăng cấu hình vòng quay lên trang chủ thành công!');
        } catch (err) {
            console.error('Lỗi khi đăng cấu hình:', err);
            alert('Lỗi: Không thể lưu cấu hình lên database.');
        }
    };

    const handleUnpublish = async () => {
        if (!db) {
            alert('Lỗi: Firebase Database chưa được khởi tạo.');
            return;
        }
        try {
            const docRef = doc(db, 'merci_wheel_config', 'settings');
            await setDoc(docRef, {
                slices: publishedSlices.length > 0 ? publishedSlices : slices,
                isPublished: false,
                updatedAt: new Date().toISOString()
            });
            setIsPublished(false);
            alert('Đã ẩn vòng quay khỏi trang chủ thành công!');
        } catch (err) {
            console.error('Lỗi khi ẩn vòng quay:', err);
            alert('Lỗi: Không thể cập nhật trạng thái ẩn.');
        }
    };

    const hasUnpublishedChanges = JSON.stringify(slices) !== JSON.stringify(publishedSlices);

    // --- PROMO CODE HANDLERS ---
    const toggleCodeStatus = (id: string) => {
        const updated = promoCodes.map(c => 
            c.id === id ? { ...c, isActive: !c.isActive } : c
        );
        saveCodesToLocal(updated);
    };

    const deleteCode = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa mã khuyến mãi này?')) {
            const updated = promoCodes.filter(c => c.id !== id);
            saveCodesToLocal(updated);
        }
    };

    const openCreateCode = () => {
        setEditingCode(null);
        setCodeForm({
            code: '',
            type: 'percent',
            value: 10,
            minOrderValue: 0,
            maxUses: 100,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
        setShowCodeForm(true);
    };

    const openEditCode = (code: PromoCode) => {
        setEditingCode(code);
        setCodeForm({
            code: code.code,
            type: code.type,
            value: code.value,
            minOrderValue: code.minOrderValue,
            maxUses: code.maxUses,
            expiryDate: code.expiryDate
        });
        setShowCodeForm(true);
    };

    const handleSaveCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!codeForm.code.trim()) return;

        const codeString = codeForm.code.trim().toUpperCase();

        if (editingCode) {
            const updated = promoCodes.map(c => 
                c.id === editingCode.id ? { 
                    ...c, 
                    code: codeString,
                    type: codeForm.type,
                    value: Number(codeForm.value),
                    minOrderValue: Number(codeForm.minOrderValue),
                    maxUses: Number(codeForm.maxUses),
                    expiryDate: codeForm.expiryDate
                } : c
            );
            saveCodesToLocal(updated);
        } else {
            const newCode: PromoCode = {
                id: Date.now().toString(),
                code: codeString,
                type: codeForm.type,
                value: Number(codeForm.value),
                minOrderValue: Number(codeForm.minOrderValue),
                isActive: true,
                maxUses: Number(codeForm.maxUses),
                usedCount: 0,
                expiryDate: codeForm.expiryDate
            };
            saveCodesToLocal([...promoCodes, newCode]);
        }
        setShowCodeForm(false);
    };

    // --- COUPON SIMULATOR ---
    const handleSimulate = () => {
        setSimResult(null);
        const codeInput = simCodeInput.trim().toUpperCase();
        if (!codeInput) {
            setSimResult({ success: false, message: 'Vui lòng nhập mã để thử!' });
            return;
        }

        const coupon = promoCodes.find(c => c.code === codeInput);
        if (!coupon) {
            setSimResult({ success: false, message: `Mã "${codeInput}" không tồn tại.` });
            return;
        }

        if (!coupon.isActive) {
            setSimResult({ success: false, message: 'Mã khuyến mãi này hiện đang bị tạm khóa.' });
            return;
        }

        // Check expiry
        const expDate = new Date(coupon.expiryDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        if (expDate < today) {
            setSimResult({ success: false, message: `Mã đã hết hạn sử dụng vào ngày ${coupon.expiryDate}.` });
            return;
        }

        // Check usage limit
        if (coupon.usedCount >= coupon.maxUses) {
            setSimResult({ success: false, message: 'Mã đã đạt giới hạn lượt sử dụng tối đa.' });
            return;
        }

        // Check minimum order value
        if (simOrderValue < coupon.minOrderValue) {
            const diff = coupon.minOrderValue - simOrderValue;
            setSimResult({ 
                success: false, 
                message: `Đơn hàng tối thiểu phải từ ${coupon.minOrderValue.toLocaleString('vi-VN')}đ. Bạn cần mua thêm ${diff.toLocaleString('vi-VN')}đ nữa.` 
            });
            return;
        }

        // Calculate discount
        let discount = 0;
        if (coupon.type === 'percent') {
            discount = Math.round((simOrderValue * coupon.value) / 100);
        } else {
            discount = coupon.value;
        }

        const finalTotal = Math.max(0, simOrderValue - discount);

        setSimResult({
            success: true,
            message: 'Áp dụng mã khuyến mãi thành công!',
            discount,
            finalTotal
        });
    };

    // --- SEARCH / FILTER WINNERS ---
    const filteredWinners = winners.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.prizeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.prizeText.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-slate-50/50 backdrop-blur-md rounded-3xl border border-slate-200/60 p-4 md:p-8 shadow-sm relative overflow-hidden">
            {/* Confetti Overlay Canvas */}
            {showConfetti && (
                <canvas 
                    ref={confettiCanvasRef} 
                    className="absolute inset-0 w-full h-full pointer-events-none z-50"
                />
            )}

            {/* Inner Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Gift className="text-pink-500 animate-pulse" size={24} />
                        Cài đặt Khuyến Mãi (Bản nháp Admin)
                    </h3>
                    <p className="text-slate-400 text-xs md:text-sm mt-1">
                        Thiết lập các chương trình vòng quay may mắn, mã giảm giá và đối chiếu đối soát khách trúng thưởng.
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto border border-slate-200 overflow-x-auto no-scrollbar">
                    <button 
                        onClick={() => setActiveSubTab('wheel')}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'wheel' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Sparkles size={16} />
                        Vòng quay
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('codes')}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'codes' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Ticket size={16} />
                        Mã giảm giá
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('winners')}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'winners' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Users size={16} />
                        Khách trúng giải
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('loyalty')}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === 'loyalty' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Coins size={16} />
                        Tích điểm & Giới thiệu
                    </button>
                </div>
            </div>

            {/* Sub-tab 1: LUCKY WHEEL */}
            {activeSubTab === 'wheel' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Wheel Interactive Section */}
                    <div className="lg:col-span-6 flex flex-col items-center justify-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative">
                        <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center select-none">
                            {/* Top Pointer */}
                            <div className="absolute top-1 z-30 flex flex-col items-center">
                                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-red-500 drop-shadow-md" />
                            </div>
                            
                            <canvas 
                                ref={canvasRef} 
                                width={400} 
                                height={400} 
                                className="w-full h-full max-w-[400px] max-h-[400px] transition-transform duration-100 ease-out"
                            />

                            {/* Center Spin Button Overlay */}
                            <button
                                onClick={spinWheel}
                                disabled={isSpinning || slices.length === 0}
                                className={`absolute z-20 w-16 h-16 rounded-full font-bold text-xs uppercase flex items-center justify-center border-4 border-white shadow-xl transition-transform active:scale-95 ${
                                    isSpinning 
                                        ? 'bg-slate-400 text-white cursor-not-allowed' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 animate-pulse'
                                }`}
                            >
                                {isSpinning ? 'Quay...' : 'QUAY'}
                            </button>
                        </div>

                        {/* Spin Result Display */}
                        {winner && (
                            <div className="mt-6 p-4 w-full text-center bg-green-50 border border-green-200 rounded-2xl animate-fade-in-up">
                                <p className="text-green-800 text-sm font-bold uppercase tracking-wider">🎉 Chúc mừng bạn đã trúng 🎉</p>
                                <h4 className="text-xl md:text-2xl font-extrabold text-green-700 mt-1">{winner.text}</h4>
                                <p className="text-xs text-slate-500 mt-1">Xác suất cài đặt: {((winner.weight / slices.reduce((s, x) => s + x.weight, 0)) * 100).toFixed(1)}%</p>
                            </div>
                        )}

                        <button
                            onClick={spinWheel}
                            disabled={isSpinning || slices.length === 0}
                            className="mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 hover:brightness-105 active:scale-98 transition-all disabled:opacity-50"
                        >
                            <Play size={18} /> Quay thử nghiệm
                        </button>
                    </div>

                    {/* Configuration Slices Panel */}
                    <div className="lg:col-span-6 space-y-6">
                        {/* Publish / Visibility Management Panel */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <Gift size={18} className="text-pink-500" />
                                Quản lý trạng thái xuất bản
                            </h4>
                            
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Trạng thái hiển thị</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${isPublished ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                                        <span className={`text-sm font-bold ${isPublished ? 'text-green-600' : 'text-slate-600'}`}>
                                            {isPublished ? 'Đang hoạt động trên trang chủ' : 'Đang ẩn khỏi trang chủ'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {isPublished 
                                            ? 'Khách hàng truy cập trang chủ sẽ tự động thấy vòng quay.' 
                                            : 'Khách hàng vãng lai không thể nhìn thấy vòng quay.'}
                                    </p>
                                </div>
                                <div className="flex gap-2 w-full md:w-auto">
                                    {isPublished ? (
                                        <button
                                            type="button"
                                            onClick={handleUnpublish}
                                            className="w-full md:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 flex items-center justify-center gap-1.5"
                                        >
                                            <X size={14} /> Tạm ẩn vòng quay
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handlePublish}
                                            className="w-full md:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-green-100 flex items-center justify-center gap-1.5"
                                        >
                                            <Check size={14} /> Đăng vòng quay
                                        </button>
                                    )}
                                </div>
                            </div>

                            {hasUnpublishedChanges && (
                                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between gap-2">
                                    <span className="font-semibold flex items-center gap-1.5">
                                        <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                                        Có thay đổi ở phần thưởng chưa được đăng lên trang chủ!
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handlePublish}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all text-[11px]"
                                    >
                                        Đăng thay đổi
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <h4 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                                <Settings size={18} className="text-slate-500" />
                                Cấu hình phần thưởng vòng quay
                            </h4>

                            {/* Add Slice Form */}
                            <form onSubmit={addSlice} className="space-y-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500">Tên phần thưởng</label>
                                        <input
                                            type="text"
                                            placeholder="Ví dụ: Giảm 200k"
                                            value={newSliceText}
                                            onChange={e => setNewSliceText(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">Màu sắc</label>
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="color"
                                                    value={newSliceColor}
                                                    onChange={e => setNewSliceColor(e.target.value)}
                                                    className="w-10 h-9 p-0 border border-slate-200 rounded-lg cursor-pointer bg-transparent"
                                                />
                                                <span className="text-xs font-mono uppercase text-slate-400">{newSliceColor}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500">Trọng số (Tỷ lệ)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={newSliceWeight}
                                                onChange={e => setNewSliceWeight(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-700"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                                    >
                                        <Plus size={14} /> Thêm phần thưởng
                                    </button>
                                </div>
                            </form>

                            {/* Slices List */}
                            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                {slices.map((slice) => {
                                    const totalW = slices.reduce((s, x) => s + x.weight, 0);
                                    const pct = ((slice.weight / totalW) * 100).toFixed(1);

                                    return (
                                        <div 
                                            key={slice.id} 
                                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                                                    style={{ backgroundColor: slice.color }}
                                                />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{slice.text}</p>
                                                    <p className="text-xs text-slate-400">
                                                        Trọng số: {slice.weight} ({pct}%)
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteSlice(slice.id)}
                                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-tab 2: PROMO CODES */}
            {activeSubTab === 'codes' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Promo Codes List */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                <Ticket size={18} className="text-slate-500" />
                                Danh sách Mã Khuyến Mãi
                            </h4>
                            <button
                                onClick={openCreateCode}
                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                                <Plus size={14} /> Tạo mã mới
                            </button>
                        </div>

                        {/* List */}
                        <div className="space-y-3">
                            {promoCodes.map((code) => {
                                const isExpired = new Date(code.expiryDate) < new Date();

                                return (
                                    <div 
                                        key={code.id}
                                        className={`p-4 border rounded-2xl transition-all flex flex-col md:flex-row justify-between gap-4 md:items-center ${
                                            code.isActive 
                                                ? 'bg-white border-slate-100 hover:border-slate-200' 
                                                : 'bg-slate-50 border-slate-200/60 opacity-70'
                                        }`}
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-sm tracking-wider px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg">
                                                    {code.code}
                                                </span>
                                                {isExpired && (
                                                    <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                                                        Hết hạn
                                                    </span>
                                                )}
                                                {!code.isActive && (
                                                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                                                        Tạm dừng
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 space-y-0.5">
                                                <p className="font-medium text-slate-700">
                                                    Giảm: <strong className="text-pink-500">{code.type === 'percent' ? `${code.value}%` : `${code.value.toLocaleString('vi-VN')}đ`}</strong> (Đơn từ {code.minOrderValue.toLocaleString('vi-VN')}đ)
                                                </p>
                                                <p>HSD: {code.expiryDate} | Đã dùng: {code.usedCount}/{code.maxUses}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-auto border-t md:border-t-0 pt-2 md:pt-0">
                                            <button
                                                onClick={() => toggleCodeStatus(code.id)}
                                                title={code.isActive ? 'Tạm ngưng mã' : 'Kích hoạt mã'}
                                                className={`p-2 rounded-xl border transition-all ${
                                                    code.isActive
                                                        ? 'text-green-600 bg-green-50 border-green-100 hover:bg-green-100'
                                                        : 'text-slate-400 bg-slate-100 border-slate-200 hover:bg-slate-200'
                                                }`}
                                            >
                                                <Power size={14} />
                                            </button>
                                            
                                            <button
                                                onClick={() => openEditCode(code)}
                                                className="p-2 text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 rounded-xl transition-all"
                                            >
                                                <Edit size={14} />
                                            </button>

                                            <button
                                                onClick={() => deleteCode(code.id)}
                                                className="p-2 text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 rounded-xl transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Simulation sandbox on Right */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl border border-slate-700 shadow-xl">
                            <h4 className="font-bold text-base flex items-center gap-2 mb-3">
                                <Calculator size={18} className="text-blue-400" />
                                Hộp thử nghiệm (Coupon Simulator)
                            </h4>
                            <p className="text-slate-400 text-xs mb-5">
                                Mô phỏng hành vi khách hàng nhập mã và kiểm tra chiết khấu trực tiếp.
                            </p>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-300">Giá trị đơn hàng mẫu (đ)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="50000"
                                            min="0"
                                            value={simOrderValue}
                                            onChange={e => setSimOrderValue(Number(e.target.value))}
                                            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 transition-all text-white"
                                        />
                                        <span className="absolute right-3 top-2.5 text-slate-500 text-xs font-bold">đ</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        Đơn tương đương: {simOrderValue.toLocaleString('vi-VN')} đ
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-300">Nhập mã khuyến mãi chạy thử</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="VÍ DỤ: MERCI10"
                                            value={simCodeInput}
                                            onChange={e => setSimCodeInput(e.target.value)}
                                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm uppercase font-mono tracking-wider outline-none focus:border-blue-500 transition-all text-white"
                                        />
                                        <button
                                            onClick={handleSimulate}
                                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                        >
                                            Áp dụng
                                        </button>
                                    </div>
                                </div>

                                {simResult && (
                                    <div className={`mt-5 p-4 rounded-2xl border ${
                                        simResult.success 
                                            ? 'bg-green-500/10 border-green-500/20 text-green-300' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-300'
                                    } animate-fade-in-up`}>
                                        <div className="flex gap-2.5 items-start">
                                            {simResult.success ? (
                                                <CheckCircle size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="text-xs space-y-1 w-full">
                                                <p className="font-bold">{simResult.message}</p>
                                                {simResult.success && simResult.discount !== undefined && simResult.finalTotal !== undefined && (
                                                    <div className="pt-2 border-t border-green-500/20 mt-2 space-y-1 text-slate-300">
                                                        <div className="flex justify-between">
                                                            <span>Giá gốc:</span>
                                                            <span className="font-semibold">{simOrderValue.toLocaleString('vi-VN')}đ</span>
                                                        </div>
                                                        <div className="flex justify-between text-green-400">
                                                            <span>Số tiền giảm:</span>
                                                            <span className="font-bold">-{simResult.discount.toLocaleString('vi-VN')}đ</span>
                                                        </div>
                                                        <div className="flex justify-between border-t border-dashed border-slate-600 pt-1.5 font-bold text-white text-sm">
                                                            <span>Tổng thanh toán:</span>
                                                            <span>{simResult.finalTotal.toLocaleString('vi-VN')}đ</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 text-slate-600 text-xs leading-relaxed space-y-2">
                            <h5 className="font-bold text-blue-800 text-sm flex items-center gap-1.5">
                                <AlertCircle size={16} /> Lưu ý lập trình
                            </h5>
                            <p>
                                Bản nháp này sử dụng lưu trữ trình duyệt (localStorage). 
                            </p>
                            <p>
                                Khi đưa vào chạy thực tế:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 font-medium">
                                <li>Cần tạo collection <code>merci_promos</code> trên Firestore.</li>
                                <li>Kiểm tra phân quyền bảo mật trong <code>firestore.rules</code> để chỉ cho phép Admin đọc/ghi mã.</li>
                                <li>Tích hợp mã giảm giá vào form Đặt lịch ở trang khách hàng để khách hàng có thể áp dụng mã trực tiếp khi book dịch vụ.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-tab 3: WINNERS LIST LOG */}
            {activeSubTab === 'winners' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm theo SĐT, Họ tên, Mã đối chiếu..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className="text-xs text-slate-400 font-bold self-end md:self-auto">
                            Tổng số: {filteredWinners.length} lượt trúng giải
                        </div>
                    </div>

                    {/* Table of Winners */}
                    {isLoadingWinners ? (
                        <div className="text-center py-20 flex flex-col items-center justify-center">
                            <RefreshCw className="w-10 h-10 text-pink-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-bold">Đang tải danh sách khách hàng trúng thưởng...</p>
                        </div>
                    ) : filteredWinners.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-2xl">
                            <Users size={40} className="mx-auto text-slate-300 mb-3 opacity-50" />
                            <p className="text-slate-800 font-bold">Không tìm thấy thông tin khách hàng nào</p>
                            <p className="text-slate-400 text-xs mt-1">Chưa có khách hàng trúng thưởng đăng ký thông tin hoặc tìm kiếm không khớp.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-150">
                            <table className="w-full border-collapse text-left text-sm text-slate-700">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Khách hàng</th>
                                        <th className="p-4">Số điện thoại</th>
                                        <th className="p-4">Quà trúng thưởng</th>
                                        <th className="p-4">Mã đối chiếu</th>
                                        <th className="p-4">Thời gian</th>
                                        <th className="p-4 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredWinners.map((w) => (
                                        <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-semibold text-slate-900">{w.name}</td>
                                            <td className="p-4 font-mono font-medium text-slate-600">{w.phone}</td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                    {w.prizeText}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono font-bold text-sm tracking-wider px-2 py-0.5 bg-pink-50 text-pink-700 border border-pink-100 rounded">
                                                    {w.prizeCode}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-400">
                                                {w.createdAt ? new Date(w.createdAt).toLocaleString('vi-VN') : 'N/A'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => deleteWinner(w.id)}
                                                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                    title="Xóa lượt trúng"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Sub-tab 4: LOYALTY POINTS & REFERRALS LOG */}
            {activeSubTab === 'loyalty' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 text-slate-700">
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm theo Email hoặc Mã giới thiệu..."
                                value={searchUserQuery}
                                onChange={e => setSearchUserQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                            />
                            {searchUserQuery && (
                                <button 
                                    onClick={() => setSearchUserQuery('')}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <div className="text-xs text-slate-400 font-bold self-end md:self-auto">
                            Tổng số: {filteredUsers.length} tài khoản
                        </div>
                    </div>

                    {/* Table of Users */}
                    {isLoadingUsers ? (
                        <div className="text-center py-20 flex flex-col items-center justify-center">
                            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-bold">Đang tải danh sách tài khoản tích điểm...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-2xl">
                            <Users size={40} className="mx-auto text-slate-300 mb-3 opacity-50" />
                            <p className="text-slate-800 font-bold">Không tìm thấy tài khoản nào</p>
                            <p className="text-slate-400 text-xs mt-1">Chưa có người dùng đăng ký hoặc tìm kiếm không khớp.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-150">
                            <table className="w-full border-collapse text-left text-sm text-slate-700">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Mã giới thiệu</th>
                                        <th className="p-4">Người giới thiệu</th>
                                        <th className="p-4 text-center">Điểm số</th>
                                        <th className="p-4">Ngày tham gia</th>
                                        <th className="p-4 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-semibold text-slate-900">{u.email}</td>
                                            <td className="p-4 font-mono font-bold text-sm tracking-wider text-blue-600 uppercase">{u.referralCode}</td>
                                            <td className="p-4">
                                                {u.referredBy ? (
                                                    <span className="font-mono text-xs tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 uppercase">
                                                        {u.referredBy}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Không có</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-amber-600 font-mono text-base">
                                                {u.points || 0}
                                            </td>
                                            <td className="p-4 text-xs text-slate-400">
                                                {u.createdAt ? new Date(u.createdAt).toLocaleString('vi-VN') : 'N/A'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUserForPoints(u);
                                                        setPointsChangeVal(100);
                                                        setPointsChangeReason('Thưởng điểm tri ân khách hàng');
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg transition-all"
                                                    title="Điều chỉnh điểm"
                                                >
                                                    Sửa điểm
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal for Create/Edit Promo Code */}
            {showCodeForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-scale">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h4 className="font-bold text-slate-800 text-lg">
                                {editingCode ? 'Cập nhật Mã Khuyến Mãi' : 'Tạo Mã Khuyến Mãi Mới'}
                            </h4>
                            <button 
                                onClick={() => setShowCodeForm(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCode} className="p-6 space-y-4 text-slate-700">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Mã giảm giá (Viết liền không dấu)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: GIAMGIA10"
                                    value={codeForm.code}
                                    onChange={e => setCodeForm({ ...codeForm, code: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-wider outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Loại giảm giá</label>
                                    <select
                                        value={codeForm.type}
                                        onChange={e => setCodeForm({ ...codeForm, type: e.target.value as 'percent' | 'fixed' })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                    >
                                        <option value="percent">Phần trăm (%)</option>
                                        <option value="fixed">Tiền mặt (đ)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Giá trị giảm</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={codeForm.value}
                                        onChange={e => setCodeForm({ ...codeForm, value: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Đơn hàng tối thiểu (đ)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={codeForm.minOrderValue}
                                        onChange={e => setCodeForm({ ...codeForm, minOrderValue: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Giới hạn lượt dùng</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={codeForm.maxUses}
                                        onChange={e => setCodeForm({ ...codeForm, maxUses: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Ngày hết hạn</label>
                                <input
                                    type="date"
                                    required
                                    value={codeForm.expiryDate}
                                    onChange={e => setCodeForm({ ...codeForm, expiryDate: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCodeForm(false)}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-100"
                                >
                                    Lưu mã
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal for Admin Adjust Points */}
            {selectedUserForPoints && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-scale">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h4 className="font-bold text-slate-800 text-lg">
                                Điều chỉnh điểm: {selectedUserForPoints.email}
                            </h4>
                            <button 
                                onClick={() => setSelectedUserForPoints(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-slate-700">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Số điểm thay đổi (cộng nhập dương, trừ nhập âm)</label>
                                <input
                                    type="number"
                                    required
                                    value={pointsChangeVal}
                                    onChange={e => setPointsChangeVal(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Lý do điều chỉnh</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Tặng sinh nhật khách hàng"
                                    value={pointsChangeReason}
                                    onChange={e => setPointsChangeReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-800"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedUserForPoints(null)}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all"
                                    disabled={isUpdatingPoints}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleUpdateUserPoints}
                                    disabled={isUpdatingPoints}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-100 disabled:opacity-50"
                                >
                                    {isUpdatingPoints ? 'Đang cập nhật...' : 'Xác nhận'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
