'use client';

import { useEffect, useState } from 'react';
import { CloudUpload, RefreshCcw, X } from 'lucide-react';
import { apiFetch } from '@/lib/client/api';

type ScanAlbum = {
    folderId: string;
    folderName: string;
    albumId: string;
    title: string;
    exists: boolean;
    total: number;
    newFiles: string[];
};
type ScanResult = { rootName: string; category: string; albums: ScanAlbum[] };
type UploadResult = { added: number; deferred: number; missing: number };

const BATCH = 6;

type Props = {
    open: boolean;
    onClose: () => void;
    categories: string[];
    defaultCategory: string;
    onSynced: () => void;
};

// Admin dán link folder Drive -> web nén ảnh MỚI (WebP 1920px + thumbnail) và đưa lên R2.
// Ảnh web không nén được (HEIC...) vào hàng chờ, xử lý trên máy bằng DONG-BO-ANH-CHO.bat.
export default function DriveR2Sync({ open, onClose, categories, defaultCategory, onSynced }: Props) {
    const [link, setLink] = useState('');
    const [category, setCategory] = useState(defaultCategory);
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [summary, setSummary] = useState('');
    const [pending, setPending] = useState<number | null>(null);

    const [openedFor, setOpenedFor] = useState('');
    if (open && openedFor !== defaultCategory) {
        setOpenedFor(defaultCategory);
        setCategory(defaultCategory);
    }

    useEffect(() => {
        if (!open) return;
        apiFetch('/api/admin/drive-r2-sync', { method: 'POST', body: JSON.stringify({ action: 'pending' }) })
            .then((d) => setPending(Number(d.pending) || 0))
            .catch(() => setPending(null));
    }, [open]);

    if (!open) return null;

    const reset = () => { setScan(null); setSummary(''); setError(''); setProgress(''); };
    const close = () => { if (!busy) { reset(); setOpenedFor(''); onClose(); } };
    const totalNew = scan ? scan.albums.reduce((n, a) => n + a.newFiles.length, 0) : 0;

    const runScan = async () => {
        if (!link.trim()) return setError('Vui lòng dán link thư mục Google Drive.');
        if (!category.trim()) return setError('Vui lòng chọn danh mục.');
        reset();
        setBusy(true);
        setProgress('Đang quét thư mục Drive...');
        try {
            const data = await apiFetch('/api/admin/drive-r2-sync', {
                method: 'POST',
                body: JSON.stringify({ action: 'scan', link: link.trim(), category: category.trim() })
            }) as unknown as ScanResult;
            setScan(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setBusy(false);
            setProgress('');
        }
    };

    const runUpload = async () => {
        if (!scan) return;
        setBusy(true);
        setError('');
        let done = 0;
        let added = 0;
        let deferred = 0;
        let failed = 0;
        try {
            for (const album of scan.albums) {
                for (let i = 0; i < album.newFiles.length; i += BATCH) {
                    const fileIds = album.newFiles.slice(i, i + BATCH);
                    setProgress(`Đang nén & đưa lên ${done + fileIds.length}/${totalNew} ảnh — ${album.folderName}`);
                    try {
                        const r = await apiFetch('/api/admin/drive-r2-sync', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'upload', folderId: album.folderId, category: scan.category, fileIds })
                        }) as unknown as UploadResult;
                        added += r.added;
                        deferred += r.deferred;
                    } catch (e) {
                        console.error('drive-r2-sync batch', e);
                        failed += fileIds.length;
                    }
                    done += fileIds.length;
                }
            }
            setSummary(
                `Đã lên web ${added} ảnh.` +
                (deferred ? ` ${deferred} ảnh (HEIC/chưa nén được) đang chờ máy tính xử lý.` : '') +
                (failed ? ` ${failed} ảnh lỗi — bấm quét lại để thử tiếp.` : '')
            );
            if (deferred) setPending((p) => (p ?? 0) + deferred);
            setScan(null);
            if (added) onSynced();
        } finally {
            setBusy(false);
            setProgress('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-2xl">Đồng bộ Drive → R2</h3>
                    <button onClick={close} disabled={busy} className="text-slate-400 hover:text-slate-700 disabled:opacity-40"><X /></button>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Dán link folder Drive (để quyền &quot;Bất kỳ ai có liên kết&quot;). Folder có thư mục con thì mỗi thư mục con là 1 album.
                    Chỉ ảnh <b>mới</b> được nén WebP và đưa lên web, ảnh đã có sẽ bỏ qua.
                </p>

                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="https://drive.google.com/drive/folders/..."
                        className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none focus:border-emerald-500 transition-colors"
                        value={link}
                        disabled={busy}
                        onChange={(e) => { setLink(e.target.value); setScan(null); }}
                    />
                    <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">DANH MỤC</label>
                        <input
                            list="drive-r2-category-options"
                            type="text"
                            placeholder="VD: Wedding"
                            className="w-full border-2 border-slate-100 p-3 rounded-xl outline-none bg-slate-50 font-medium focus:border-emerald-500 transition-colors mt-1"
                            value={category}
                            disabled={busy}
                            onChange={(e) => { setCategory(e.target.value); setScan(null); }}
                        />
                        <datalist id="drive-r2-category-options">
                            {categories.map((c) => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                </div>

                {scan && (
                    <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 text-sm max-h-60 overflow-y-auto">
                        {scan.albums.map((a) => (
                            <div key={a.folderId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-800 truncate">{a.title}</p>
                                    <p className="text-xs text-slate-400">{a.exists ? 'Album đã có' : 'Album mới'} · {a.total} ảnh trên Drive</p>
                                </div>
                                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${a.newFiles.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                    {a.newFiles.length ? `+${a.newFiles.length} mới` : 'Đủ rồi'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {progress && (
                    <p className="text-sm font-bold text-emerald-600 animate-pulse text-center bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">{progress}</p>
                )}
                {error && <p className="text-sm font-semibold text-red-600 bg-red-50 py-2 px-3 rounded-xl border border-red-100">{error}</p>}
                {summary && <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-100">{summary}</p>}
                {pending ? (
                    <p className="text-xs text-amber-700 bg-amber-50 py-2 px-3 rounded-xl border border-amber-100">
                        Còn {pending} ảnh chờ xử lý trên máy tính (HEIC hoặc ảnh Google chưa tạo bản xem trước).
                        Bật máy, double-click <b>DONG-BO-ANH-CHO.bat</b> để đưa nốt lên web.
                    </p>
                ) : null}

                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={close} disabled={busy} className="px-5 py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-40">Đóng</button>
                    {scan && totalNew > 0 ? (
                        <button disabled={busy} onClick={runUpload} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all">
                            {busy ? <RefreshCcw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                            {busy ? 'Đang chạy...' : `Đưa ${totalNew} ảnh lên web`}
                        </button>
                    ) : (
                        <button disabled={busy} onClick={runScan} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all">
                            {busy ? <RefreshCcw size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                            {busy ? 'Đang quét...' : scan ? 'Quét lại' : 'Quét ảnh mới'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
