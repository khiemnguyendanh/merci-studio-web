'use client';

import { useState, type CSSProperties } from 'react';
import pricing from '@/lib/pricing-2026.json';

// Bảng giá 2026 - dữ liệu lấy từ file báo giá gốc của tiệm (lib/pricing-2026.json).
const serif = "'Cormorant Garamond', Georgia, serif";
const INK = '#2b241e', SUB = '#5c5044', LINE = '#d9d0c3', TAN = '#7d6a52', BROWN = '#7a5c44', DARK = '#3d2f26', CREAM = '#faf7f1';

type Pkg = { name: string; price: string; note: string; sections: { title: string; items: string[] }[] };
type Group = { id: string; title: string; packages: Pkg[]; footnote: string[] };

const groups = pricing.groups as Group[];
const tabLabel: Record<string, string> = {
    prewedding: 'Ảnh cưới',
    'phong-su': 'Phóng sự cưới',
    film: 'Quay phim cưới',
    concept: 'Concept · Baby',
    'gia-dinh-su-kien': 'Gia đình · Sự kiện'
};

function zaloLink(pkg: string) {
    return `https://zalo.me/0888999545?text=${encodeURIComponent(`Merci ơi, mình muốn tư vấn ${pkg}`)}`;
}

export default function PricingSection({ onBook }: { onBook: () => void }) {
    const [active, setActive] = useState(groups[0].id);
    const [open, setOpen] = useState<string | null>(null);
    const group = groups.find((g) => g.id === active) || groups[0];

    const chip = (on: boolean): CSSProperties => ({
        padding: '10px 18px', fontSize: 12, letterSpacing: 1.6, cursor: 'pointer', fontFamily: 'inherit',
        background: on ? DARK : 'transparent', color: on ? '#f5f0e8' : DARK, border: `1px solid ${on ? DARK : '#b7a992'}`,
        whiteSpace: 'nowrap'
    });

    return (
        <section id="bang-gia" style={{ padding: 'clamp(48px, 7vw, 88px) clamp(16px, 4vw, 64px)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px 24px', marginBottom: 'clamp(22px, 3vw, 32px)' }}>
                <div>
                    <div style={{ fontSize: 11, letterSpacing: 3.5, color: TAN, marginBottom: 14 }}>BẢNG GIÁ 2026</div>
                    <h2 style={{ fontFamily: serif, fontSize: 'clamp(30px, 4.5vw, 52px)', lineHeight: 1.08, fontWeight: 500, margin: 0 }}>
                        Gói dịch vụ<br /><em style={{ fontWeight: 400 }}>minh bạch, trọn vẹn</em>
                    </h2>
                </div>
                <div style={{ maxWidth: 440, fontSize: 'clamp(13.5px, 1.4vw, 15px)', lineHeight: 1.8, fontWeight: 300, color: SUB }}>
                    Giá đã gồm trang phục, makeup và ekip theo từng gói. Bấm vào gói để xem chi tiết hoặc nhắn Merci để được tư vấn gói hợp với bạn.
                </div>
            </div>

            <div role="tablist" aria-label="Nhóm dịch vụ" className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 'clamp(20px, 3vw, 28px)' }}>
                {groups.map((g) => (
                    <button key={g.id} role="tab" aria-selected={g.id === active} type="button" onClick={() => { setActive(g.id); setOpen(null); }} style={chip(g.id === active)}>
                        {tabLabel[g.id] || g.title}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(250px, 100%), 1fr))', gap: 14 }}>
                {group.packages.map((p) => {
                    const key = `${group.id}:${p.name}`;
                    const isOpen = open === key;
                    return (
                        <div key={key} className="card-3d" style={{ background: CREAM, border: `1px solid ${isOpen ? BROWN : LINE}`, padding: 'clamp(20px, 2.4vw, 26px)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11, letterSpacing: 2.4, color: TAN }}>{p.name}</div>
                            <div style={{ fontFamily: serif, fontSize: 'clamp(28px, 3vw, 34px)', fontWeight: 600, color: DARK, lineHeight: 1 }}>
                                {p.price}<span style={{ fontSize: 15, fontWeight: 500, marginLeft: 4 }}>đ</span>
                            </div>
                            {p.note && <div style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.6, color: SUB }}>{p.note}</div>}
                            {isOpen && (
                                <div style={{ marginTop: 6, borderTop: `1px solid ${LINE}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {p.sections.map((s) => (
                                        <div key={s.title}>
                                            <div style={{ fontSize: 10.5, letterSpacing: 2, color: TAN, marginBottom: 6, textTransform: 'uppercase' }}>{s.title}</div>
                                            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.7, color: INK, fontWeight: 300 }}>
                                                {s.items.map((it) => <li key={it}>{it}</li>)}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, letterSpacing: 1.6 }}>
                                <button type="button" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: BROWN, fontFamily: 'inherit', letterSpacing: 1.6, fontSize: 12 }}>
                                    {isOpen ? 'THU GỌN ↑' : 'XEM CHI TIẾT ↓'}
                                </button>
                                <a href={zaloLink(`${tabLabel[group.id] || group.title} - ${p.name}`)} target="_blank" rel="noreferrer" style={{ color: DARK, textDecoration: 'none', fontWeight: 600 }}>
                                    TƯ VẤN GÓI NÀY →
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>

            {group.footnote.length > 0 && (
                <div style={{ marginTop: 18, fontSize: 12, lineHeight: 1.7, color: TAN, fontWeight: 300 }}>
                    {group.footnote.map((n) => <div key={n}>* {n}</div>)}
                </div>
            )}
            <div style={{ marginTop: 22 }}>
                <button className="btn-3d" type="button" onClick={onBook} style={{ padding: '14px 32px', fontSize: 13, letterSpacing: 2, background: DARK, color: '#f5f0e8', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    ĐẶT LỊCH TƯ VẤN MIỄN PHÍ
                </button>
            </div>
        </section>
    );
}
