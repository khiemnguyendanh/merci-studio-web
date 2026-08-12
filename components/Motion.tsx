'use client';

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ElementType,
    type PointerEvent as ReactPointerEvent,
    type ReactNode
} from 'react';

/**
 * Hiệu ứng 3D dùng chung toàn site.
 * - TiltCard: thẻ nghiêng theo con trỏ + lớp glare bắt sáng (đi cùng CSS .tilt-3d/.tilt-glare).
 * - Reveal: nội dung trồi lên có chiều sâu khi cuộn tới (đi cùng CSS .reveal-3d).
 * Cả hai tự vô hiệu trên màn hình cảm ứng và khi bật prefers-reduced-motion.
 */

const FINE_HOVER = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function canTilt() {
    return window.matchMedia(FINE_HOVER).matches && !window.matchMedia(REDUCED_MOTION).matches;
}

type TiltCardOwnProps = {
    as?: ElementType;
    /** Góc nghiêng tối đa mỗi trục (độ) */
    maxTilt?: number;
    /** Độ nổi translateZ khi hover (px) */
    lift?: number;
    /** Bật/tắt lớp glare phủ toàn thẻ; tắt khi muốn tự đặt <span className="tilt-glare" /> bên trong vùng bo góc */
    glare?: boolean;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
};

type TiltCardProps = TiltCardOwnProps & Record<string, unknown>;

export function TiltCard({
    as,
    maxTilt = 6,
    lift = 10,
    glare = true,
    className,
    style,
    children,
    ...rest
}: TiltCardProps) {
    const Tag = (as ?? 'div') as ElementType;
    const ref = useRef<HTMLElement | null>(null);
    const frame = useRef<number | null>(null);
    const point = useRef<{ x: number; y: number } | null>(null);
    const active = useRef(false);

    const applyFrame = useCallback(() => {
        frame.current = null;
        const el = ref.current;
        const p = point.current;
        if (!el || !p) return;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = Math.min(Math.max((p.x - rect.left) / rect.width, 0), 1);
        const py = Math.min(Math.max((p.y - rect.top) / rect.height, 0), 1);
        el.style.setProperty('--ry', `${((px - 0.5) * 2 * maxTilt).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - py) * 2 * maxTilt).toFixed(2)}deg`);
        el.style.setProperty('--tz', `${lift}px`);
        el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        el.style.setProperty('--glare-o', '1');
    }, [maxTilt, lift]);

    const reset = useCallback(() => {
        active.current = false;
        point.current = null;
        if (frame.current !== null) {
            cancelAnimationFrame(frame.current);
            frame.current = null;
        }
        const el = ref.current;
        if (!el) return;
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.style.setProperty('--tz', '0px');
        el.style.setProperty('--glare-o', '0');
    }, []);

    useEffect(() => reset, [reset]);

    const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        if (!active.current) {
            if (!canTilt()) return;
            active.current = true;
            ref.current?.classList.add('is-tilting');
        }
        point.current = { x: event.clientX, y: event.clientY };
        if (frame.current === null) frame.current = requestAnimationFrame(applyFrame);
    }, [applyFrame]);

    return (
        <Tag
            {...(rest as Record<string, unknown>)}
            ref={ref}
            className={className ? `tilt-3d ${className}` : 'tilt-3d'}
            style={style}
            onPointerMove={handlePointerMove}
            onPointerLeave={reset}
            onPointerCancel={reset}
            onDragStartCapture={reset}
        >
            {children}
            {glare ? <span aria-hidden="true" className="tilt-glare" /> : null}
        </Tag>
    );
}

type RevealProps = {
    as?: ElementType;
    /** Trễ hiệu ứng (ms) để tạo nhịp so le giữa các phần tử */
    delay?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
} & Record<string, unknown>;

export function Reveal({ as, delay = 0, className, style, children, ...rest }: RevealProps) {
    const Tag = (as ?? 'div') as ElementType;
    const ref = useRef<HTMLElement | null>(null);
    // 'static': chưa can thiệp (SSR + phần tử đang trong khung nhìn) → luôn hiển thị
    const [phase, setPhase] = useState<'static' | 'hidden' | 'shown'>('static');

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') return;
        if (window.matchMedia(REDUCED_MOTION).matches) return;
        const rect = el.getBoundingClientRect();
        // Đang trong khung nhìn sẵn thì giữ nguyên, tránh chớp ẩn/hiện
        if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) return;
        setPhase('hidden');
        const io = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setPhase('shown');
                        io.disconnect();
                    }
                }
            },
            { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const revealClass = phase === 'static' ? '' : phase === 'hidden' ? 'reveal-3d' : 'reveal-3d is-inview';
    const mergedClassName = [className, revealClass].filter(Boolean).join(' ') || undefined;
    const mergedStyle = delay
        ? ({ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties)
        : style;

    return (
        <Tag {...(rest as Record<string, unknown>)} ref={ref} className={mergedClassName} style={mergedStyle}>
            {children}
        </Tag>
    );
}
