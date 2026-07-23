'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Gift, X, CheckCircle, Phone, User, Sparkles, AlertCircle } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc } from 'firebase/firestore';

interface WheelSlice {
    id: string;
    text: string;
    color: string;
    weight: number;
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
        console.error('Firebase initialization error in LuckyWheelPopup:', e);
    }
}

export default function LuckyWheelPopup() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [slices, setSlices] = useState<WheelSlice[]>([
        { id: '1', text: 'Giảm 10% gói chụp', color: '#FF6B6B', weight: 4 },
        { id: '2', text: 'Tặng Album Mini', color: '#4D96FF', weight: 2 },
        { id: '3', text: 'Miễn phí Ship ảnh', color: '#6BCB77', weight: 5 },
        { id: '4', text: 'Voucher 500k', color: '#FFD93D', weight: 1 },
        { id: '5', text: 'Thêm 5 ảnh chỉnh sửa', color: '#9B5DE5', weight: 3 },
        { id: '6', text: 'Chúc bạn may mắn', color: '#F15BB5', weight: 6 },
    ]);

    const [isSpinning, setIsSpinning] = useState(false);
    const [wheelAngle, setWheelAngle] = useState(0);
    const [winner, setWinner] = useState<WheelSlice | null>(null);

    // Form states
    const [showForm, setShowForm] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedResult, setSavedResult] = useState<{
        prize: string;
        code: string;
        name: string;
        phone: string;
        date: string;
    } | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);
    const lastTickIndexRef = useRef<number>(-1);

    // Confetti canvas
    const [showConfetti, setShowConfetti] = useState(false);
    const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

    // --- LOAD USER SPIN STATUS ---
    useEffect(() => {
        // Check if user has already spun the wheel
        const userSpinResult = localStorage.getItem('merci_lucky_spin_user_result');
        if (userSpinResult) {
            try {
                setSavedResult(JSON.parse(userSpinResult));
            } catch (e) {
                console.error(e);
            }
        }
    }, [isOpen]);

    // --- LOAD PUBLISHED CONFIG & CHECK FIRST-TIME AUTO-POPUP ---
    useEffect(() => {
        const fetchPublishedSettings = async () => {
            if (!db) {
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'merci_wheel_config', 'settings');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const published = !!data.isPublished;
                    setIsPublished(published);
                    if (data.slices) {
                        setSlices(data.slices);
                    }

                    // Auto-popup logic on first visit if published
                    if (published) {
                        const userSpinResult = localStorage.getItem('merci_lucky_spin_user_result');
                        const popupShown = localStorage.getItem('merci_lucky_wheel_popup_shown');
                        
                        if (!userSpinResult && !popupShown) {
                            // First time visit and has not spun yet
                            setIsOpen(true);
                            localStorage.setItem('merci_lucky_wheel_popup_shown', 'true');
                        }
                    }
                } else {
                    setIsPublished(false);
                }
            } catch (err) {
                console.error('Error fetching published wheel config:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPublishedSettings();
    }, []);

    // Redraw wheel when slices or wheelAngle changes
    useEffect(() => {
        if (isOpen) {
            drawWheel(wheelAngle);
        }
    }, [slices, wheelAngle, isOpen]);

    // Sound effect
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
                const notes = [523.25, 659.25, 783.99, 1046.50];
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
            console.error(e);
        }
    };

    // Confetti animation
    useEffect(() => {
        if (!showConfetti || !isOpen) return;
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

        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height - height,
                size: Math.random() * 6 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speedX: Math.random() * 3 - 1.5,
                speedY: Math.random() * 4 + 3,
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 8 - 4
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
    }, [showConfetti, isOpen]);

    // Canvas drawing
    const drawWheel = (angle: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width;
        const center = size / 2;
        const radius = center - 15;

        ctx.clearRect(0, 0, size, size);

        // Shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fill();
        ctx.restore();

        const numSlices = slices.length;
        const arc = (Math.PI * 2) / numSlices;

        slices.forEach((slice, i) => {
            const startAngle = i * arc + angle;
            const endAngle = (i + 1) * arc + angle;

            ctx.beginPath();
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.lineTo(center, center);
            ctx.fillStyle = slice.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + arc / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 3;

            const textToShow = slice.text.length > 18 ? slice.text.substring(0, 16) + '...' : slice.text;
            ctx.fillText(textToShow, radius - 18, 0);
            ctx.restore();
        });

        // Peg
        ctx.beginPath();
        ctx.arc(center, center, 18, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(center, center, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#db2777'; // Pink center peg
        ctx.fill();
    };

    // Spin trigger
    const startSpin = () => {
        if (isSpinning || slices.length === 0 || savedResult) return;

        setIsSpinning(true);
        setWinner(null);
        setShowConfetti(false);

        // Weighted Selection
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
        const arc = (Math.PI * 2) / slices.length;
        const targetSliceAngle = (1.5 * Math.PI) - (selectedIndex * arc + arc / 2);
        const baseSpins = 6 + Math.random() * 2; // 6-8 spins
        const finalAngle = wheelAngle - (wheelAngle % (Math.PI * 2)) + targetSliceAngle - (baseSpins * Math.PI * 2);

        const duration = 4000;
        const startTime = performance.now();
        const startAngle = wheelAngle;
        lastTickIndexRef.current = -1;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            const currentAngle = startAngle + (finalAngle - startAngle) * easeProgress;
            
            setWheelAngle(currentAngle);

            // Tick Sound
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
                setIsSpinning(false);
                setWinner(selectedPrize);
                playAudio('win');
                setShowConfetti(true);
                
                // Show form to claim prize
                setTimeout(() => {
                    setShowForm(true);
                }, 800);
            }
        };

        requestRef.current = requestAnimationFrame(animate);
    };

    // Form Submission
    const handleClaimPrize = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerName.trim() || !customerPhone.trim() || !winner) return;

        setIsSubmitting(true);

        // Generate cross-check verification code: MC-[6 Alphanumeric characters]
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomCode = 'MC-';
        for (let i = 0; i < 6; i++) {
            randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const dateStr = new Date().toISOString();
        const payload = {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            prizeText: winner.text,
            prizeCode: randomCode,
            createdAt: dateStr
        };

        try {
            // Save to Firestore if database is available
            if (db) {
                const docId = `${Date.now()}_${customerPhone}`;
                await setDoc(doc(collection(db, 'merci_spin_registrations'), docId), payload);
            }
        } catch (err) {
            console.error('Failed to save to Firestore:', err);
        }

        // Always save to localStorage to persist user status and guarantee fallback
        const userResult = {
            prize: winner.text,
            code: randomCode,
            name: payload.name,
            phone: payload.phone,
            date: dateStr
        };

        localStorage.setItem('merci_lucky_spin_user_result', JSON.stringify(userResult));
        
        // Also save to a local registrations log in localStorage (for simulation purposes)
        const localRegs = localStorage.getItem('merci_local_registrations_log');
        const regsArray = localRegs ? JSON.parse(localRegs) : [];
        regsArray.push(userResult);
        localStorage.setItem('merci_local_registrations_log', JSON.stringify(regsArray));

        setSavedResult(userResult);
        setIsSubmitting(false);
        setShowForm(false);
    };

    // Clean up animation frame
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    if (isLoading || !isPublished) return null;

    return (
        <>
            {/* FLOATING WIDGET BUTTON */}
            <div className="fixed bottom-32 right-4 z-40">
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-pink-500 to-rose-500 text-white rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95 cursor-pointer animate-bounce"
                    title="Vòng quay may mắn"
                >
                    <span className="absolute inset-0 rounded-full bg-pink-500 animate-ping opacity-20 group-hover:opacity-40" />
                    <Gift className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                    
                    {/* Tiny badge */}
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-yellow-500 text-[10px] font-black text-white justify-center items-center">!</span>
                    </span>
                </button>
            </div>

            {/* POPUP MODAL DIALOG */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-fade-in-scale">
                        
                        {/* Confetti Overlay */}
                        {showConfetti && (
                            <canvas 
                                ref={confettiCanvasRef} 
                                className="absolute inset-0 w-full h-full pointer-events-none z-50"
                            />
                        )}

                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 z-55 p-2 bg-slate-100/60 hover:bg-slate-200/80 text-slate-500 rounded-full transition-all cursor-pointer"
                        >
                            <X size={18} />
                        </button>

                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 border-b border-pink-100/40 text-center">
                            <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                                <Sparkles size={24} className="animate-spin" style={{ animationDuration: '6s' }} />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-800">Vòng Quay May Mắn</h3>
                            <p className="text-slate-500 text-xs md:text-sm mt-1">
                                Quay thử vận may - nhận ngay ưu đãi cực khủng từ Merci Studio!
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 md:p-8 flex flex-col items-center">
                            
                            {/* CASE 1: USER ALREADY SPUN & CLAIMED PRIZE */}
                            {savedResult ? (
                                <div className="text-center py-6 px-4 space-y-6 w-full animate-fade-in-up">
                                    <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <CheckCircle size={36} />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Mã Quà Tặng Của Bạn</p>
                                        <h4 className="text-2xl md:text-3xl font-extrabold text-pink-600 bg-pink-50 border border-pink-100 rounded-2xl py-3 px-4 w-max mx-auto shadow-sm tracking-wider font-mono">
                                            {savedResult.code}
                                        </h4>
                                        <p className="text-slate-800 text-lg font-bold mt-2">
                                            Quà tặng: <span className="text-green-600">{savedResult.prize}</span>
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left text-xs md:text-sm text-slate-500 space-y-1">
                                        <p>👤 <strong>Khách hàng:</strong> {savedResult.name}</p>
                                        <p>📞 <strong>Số điện thoại:</strong> {savedResult.phone}</p>
                                        <p>📅 <strong>Thời gian quay:</strong> {new Date(savedResult.date).toLocaleString('vi-VN')}</p>
                                    </div>

                                    <div className="text-xs text-rose-500 font-semibold bg-rose-50 rounded-xl p-3 border border-rose-100 leading-relaxed flex gap-2 items-center">
                                        <AlertCircle size={16} className="flex-shrink-0" />
                                        <span>Hãy chụp màn hình lại và mang mã này đến Merci Studio để áp dụng khuyến mãi khi đặt lịch chụp!</span>
                                    </div>
                                </div>
                            ) : (
                                
                                /* CASE 2: NORMAL PLAYING */
                                <div className="w-full flex flex-col items-center">
                                    
                                    {/* Spinner view */}
                                    {!showForm ? (
                                        <div className="flex flex-col items-center w-full">
                                            <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center select-none">
                                                {/* Pointer pointer */}
                                                <div className="absolute top-0.5 z-30 flex flex-col items-center">
                                                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-red-500 drop-shadow-md" />
                                                </div>

                                                <canvas 
                                                    ref={canvasRef} 
                                                    width={360} 
                                                    height={360} 
                                                    className="w-full h-full max-w-[360px] max-h-[360px] transition-transform duration-100"
                                                />

                                                <button
                                                    onClick={startSpin}
                                                    disabled={isSpinning}
                                                    className={`absolute z-20 w-14 h-14 rounded-full font-extrabold text-xs uppercase flex items-center justify-center border-4 border-white shadow-xl transition-transform active:scale-95 cursor-pointer ${
                                                        isSpinning 
                                                            ? 'bg-slate-400 text-white cursor-not-allowed' 
                                                            : 'bg-pink-600 text-white hover:bg-pink-700 hover:scale-105 animate-pulse'
                                                    }`}
                                                >
                                                    {isSpinning ? 'Quay' : 'QUAY'}
                                                </button>
                                            </div>

                                            <p className="text-slate-400 text-xs text-center mt-6 flex items-center gap-1">
                                                <AlertCircle size={14} /> Mỗi số điện thoại chỉ được quay thưởng tối đa 1 lần.
                                            </p>
                                        </div>
                                    ) : (
                                        
                                        /* FORM INPUT STATE AFTER SPINNING */
                                        <form onSubmit={handleClaimPrize} className="w-full space-y-4 animate-fade-in-up">
                                            <div className="text-center p-4 bg-green-50 border border-green-200 rounded-2xl">
                                                <p className="text-green-800 text-xs font-bold uppercase tracking-wider">🎉 Chúc mừng bạn đã quay trúng 🎉</p>
                                                <h4 className="text-xl font-black text-green-700 mt-0.5">{winner?.text}</h4>
                                            </div>

                                            <p className="text-slate-500 text-xs md:text-sm text-center">
                                                Vui lòng điền thông tin để chúng tôi lưu mã quà tặng và gửi mã xác nhận cho bạn!
                                            </p>

                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                        <User size={12} /> Họ và Tên của bạn
                                                    </label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Nhập họ và tên..."
                                                        value={customerName}
                                                        onChange={e => setCustomerName(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-500 focus:bg-white transition-all text-slate-800"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                                        <Phone size={12} /> Số điện thoại nhận quà
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        required
                                                        placeholder="Nhập số điện thoại..."
                                                        value={customerPhone}
                                                        onChange={e => setCustomerPhone(e.target.value)}
                                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-pink-500 focus:bg-white transition-all text-slate-800"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-pink-100 hover:brightness-105 active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                {isSubmitting ? 'Đang đăng ký...' : 'Nhận mã quà tặng'}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
