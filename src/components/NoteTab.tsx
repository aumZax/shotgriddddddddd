/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { FileText, Calendar, Users, Paperclip, Check, X, Plus, Search } from 'lucide-react';
import ENDPOINTS from '../config';

interface Note {
    id: number;
    project_id: number;
    note_type: string;
    type_id: number;
    subject: string;
    body: string;
    file_url?: string;
    author: string;
    status: string;
    visibility: string;
    created_at: string;
    tasks?: string[];
    assigned_people?: string[];
    read_status?: string;
}

interface NotesTabProps {
    notes: Note[];
    loadingNotes: boolean;
    openAssignedDropdown?: string | number | null;
    setOpenAssignedDropdown?: (id: string | number | null) => void;
    onContextMenu?: (e: React.MouseEvent, note: Note) => void;
    onDeleteNote?: (noteId: number) => void;
    onNoteClick?: (note: Note) => void;
    onNoteUpdate?: (noteId: number, field: keyof Note, value: unknown) => void;
}

interface PopupState {
    noteId: number | null;
    field: string | null;
    anchor: { top: number; bottom: number; left: number; width: number } | null;
}

interface SelectOption {
    label: string;
    value: string;
    color: string;
}

const STATUS_OPTS: SelectOption[] = [
    { label: 'เปิด', value: 'open', color: '#10b981' },
    { label: 'ปิด', value: 'closed', color: '#6b7280' },
];

const VIS_OPTS: SelectOption[] = [
    { label: 'Client', value: 'Client', color: '#8b5cf6' },
    { label: 'Internal', value: 'Internal', color: '#3b82f6' },
];

const READ_OPTS: SelectOption[] = [
    { label: 'อ่านแล้ว', value: 'read', color: '#0ea5e9' },
    { label: 'ยังไม่ได้อ่าน', value: 'unread', color: '#f59e0b' },
];

const DatePickerContent = ({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void; }) => {
    const toInputVal = (d: string) => {
        if (!d) return '';
        const dt = new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    };
    const [draft, setDraft] = useState(toInputVal(value));
    const handleSave = () => { if (draft) { onSave(draft + 'T00:00:00.000Z'); onClose(); } };
    const presets = [{ label: 'วันนี้', days: 0 }, { label: 'เมื่อวาน', days: -1 }, { label: '7 วันที่แล้ว', days: -7 }, { label: '30 วันที่แล้ว', days: -30 }];
    const setPreset = (days: number) => {
        const d = new Date(); d.setDate(d.getDate() + days);
        setDraft(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    };
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                    <button key={p.label} onClick={() => setPreset(p.days)} className="px-2.5 py-1 rounded-md text-gray-400 text-xs transition-all border border-white/[0.06]" style={{ background: 'linear-gradient(to bottom right, #1f2937, #374151)' }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #2563eb, #3b82f6)'; (e.currentTarget as HTMLButtonElement).style.color = '#93c5fd'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.3)'; }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #1f2937, #374151)'; (e.currentTarget as HTMLButtonElement).style.color = ''; (e.currentTarget as HTMLButtonElement).style.borderColor = ''; }}>{p.label}</button>
                ))}
            </div>
            <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }} className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all [color-scheme:dark]" />
            </div>
            {draft && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-500/10 border border-blue-500/[0.12]">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-blue-300">{new Date(draft + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={handleSave} disabled={!draft} className="flex-1 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all" style={{ background: 'linear-gradient(to bottom right, #2563eb, #3b82f6)' }} onMouseEnter={e => { if (!(e.currentTarget as HTMLButtonElement).disabled) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #3b82f6, #60a5fa)'; }} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #2563eb, #3b82f6)'}>บันทึก</button>
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 text-sm transition-all" style={{ background: 'linear-gradient(to bottom right, #374151, #4b5563)' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #4b5563, #6b7280)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #374151, #4b5563)'}>ยกเลิก</button>
            </div>
        </div>
    );
};

const FloatingPanel = ({ title, anchor, onClose, children, width = 280 }: {
    title: string;
    anchor: { top: number; bottom: number; left: number; width: number };
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}) => {
    const MARGIN = 8;

    // คำนวณพื้นที่ที่มีทั้งสองฝั่งตั้งแต่ต้น ไม่ต้องรอ measure
    const spaceAbove = anchor.top - MARGIN;
    const spaceBelow = window.innerHeight - anchor.bottom - MARGIN;
    const canGoUp = spaceAbove >= spaceBelow; // เลือกฝั่งที่มีพื้นที่มากกว่า

    const maxPanelHeight = canGoUp ? spaceAbove : spaceBelow;
    const top = canGoUp ? MARGIN : anchor.bottom + MARGIN; // ถ้าขึ้น ให้ชิดบนจอ
    const left = Math.min(anchor.left, window.innerWidth - width - MARGIN);

    return (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed z-[9999] rounded-xl shadow-2xl flex flex-col"
                style={{
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                    // ถ้าขึ้น ให้ bottom ชนกับ anchor แทน
                    ...(canGoUp ? { bottom: `${window.innerHeight - anchor.top + MARGIN}px`, top: 'auto' } : {}),
                    maxHeight: `${maxPanelHeight}px`,
                    background: '#1a1d27',
                    border: '1px solid rgba(255,255,255,0.08)',
                    animation: 'panelUp .15s cubic-bezier(.16,1,.3,1) both'
                }}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-200">{title}</span>
                    <button onClick={onClose} className="flex items-center justify-center rounded-md text-white transition-all"
                        style={{ background: 'linear-gradient(to bottom right, #dc2626, #ef4444)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'linear-gradient(to bottom right, #ef4444, #f87171)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(to bottom right, #dc2626, #ef4444)')}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-2 overflow-y-auto">{children}</div>
            </div>
            <style>{`@keyframes panelUp { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
        </>
    );
};

const SelectList = ({ options, value, onSelect }: { options: SelectOption[]; value: string; onSelect: (v: string) => void; showNone?: boolean; }) => {
    const isActive = (v: string) => v === value || (v === 'open' && (value === 'opn' || value === 'open'));
    return (
        <ul className="flex flex-col gap-0.5">
            {options.map((opt) => (
                <li key={opt.value}>
                    <button onClick={() => onSelect(opt.value)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive(opt.value) ? 'text-white bg-gradient-to-br from-gray-700 to-gray-700 hover:from-gray-600 hover:to-gray-700' : 'text-gray-400 hover:text-gray-200 bg-gradient-to-br from-gray-800 to-gray-800 hover:from-gray-600 hover:to-gray-700'}`}>
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                        <span className="flex-1 text-left">{opt.label}</span>
                        {isActive(opt.value) && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                </li>
            ))}
        </ul>
    );
};

const AssignedPeopleContent = ({ people, onSave, onClose }: { people: string[]; onSave: (p: string[]) => void; onClose: () => void; }) => {
    const [list, setList] = useState([...people]);
    const [query, setQuery] = useState('');
    const [available, setAvailable] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        const fetchPeople = async () => {
            try { const res = await fetch(ENDPOINTS.GETALLPEOPLE); const data = await res.json(); setAvailable(data.map((p: { name: string }) => p.name)); }
            catch (err) { console.error('[AssignedPeople] fetch error:', err); }
            finally { setLoading(false); }
        };
        fetchPeople();
    }, []);
    const filtered = available.filter((p) => p.toLowerCase().includes(query.toLowerCase()) && !list.includes(p));
    const toggle = (p: string) => setList((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
    const handleSave = () => { onSave(list); onClose(); };
    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 pointer-events-none" />
                <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาเพื่อเพิ่ม..." className="w-full bg-[#0f1117] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            {list.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    {list.map((p) => (
                        <div key={p} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-br from-gray-800 to-gray-700 group/row">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold ring-1 ring-white/10 flex-shrink-0">{p[0].toUpperCase()}</div>
                            <span className="flex-1 text-sm text-gray-200 truncate">{p}</span>
                            <button onClick={() => setList(list.filter((x) => x !== p))} className="p-2.5 transition-all duration-300 bg-gradient-to-r from-red-500 to-red-500 hover:from-red-400 hover:to-red-400 rounded-2xl self-start shadow-lg hover:shadow-xl hover:scale-110"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    ))}
                </div>
            )}
            {filtered.length > 0 && (
                <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider px-1 mt-1">แนะนำ</p>
                    {filtered.slice(0, 5).map((p) => (
                        <button key={p} onClick={() => toggle(p)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-200 transition-all bg-gradient-to-br from-gray-800 to-gray-800 hover:from-gray-600 hover:to-gray-700">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-400 text-xs font-bold ring-1 ring-white/5 flex-shrink-0">{p[0].toUpperCase()}</div>
                            <span className="flex-1 text-sm text-left">{p}</span>
                            <Plus className="w-3.5 h-3.5 opacity-40" />
                        </button>
                    ))}
                </div>
            )}
            {list.length === 0 && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-4">
                    {loading ? <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /> : <><Users className="w-8 h-8 text-gray-800" /><p className="text-xs text-gray-600">ค้นหาเพื่อเพิ่มผู้รับมอบหมาย</p></>}
                </div>
            )}
            <button onClick={handleSave} className="w-full mt-1 py-2 rounded-lg text-white text-sm font-semibold transition-all" style={{ background: 'linear-gradient(to bottom right, #2563eb, #3b82f6)' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #3b82f6, #60a5fa)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(to bottom right, #2563eb, #3b82f6)'}>บันทึก</button>
        </div>
    );
};

interface BadgeStyle { textClass: string; bg: string; ring: string; }
const statusBadge = (s: string): BadgeStyle => s === 'open' || s === 'opn' ? { textClass: 'text-emerald-300', bg: 'rgba(5,150,105,0.15)', ring: 'rgba(16,185,129,0.25)' } : { textClass: 'text-gray-500', bg: 'rgba(55,65,81,0.30)', ring: 'rgba(255,255,255,0.08)' };
const visBadge = (v: string): BadgeStyle => v === 'Client' ? { textClass: 'text-violet-300', bg: 'rgba(109,40,217,0.18)', ring: 'rgba(139,92,246,0.25)' } : v === 'Internal' ? { textClass: 'text-blue-300', bg: 'rgba(37,99,235,0.18)', ring: 'rgba(59,130,246,0.25)' } : { textClass: 'text-gray-500', bg: 'rgba(55,65,81,0.30)', ring: 'rgba(255,255,255,0.08)' };
const readBadge = (r: string): BadgeStyle => r === 'read' ? { textClass: 'text-sky-300', bg: 'rgba(2,132,199,0.18)', ring: 'rgba(14,165,233,0.25)' } : { textClass: 'text-amber-300', bg: 'rgba(180,83,9,0.18)', ring: 'rgba(245,158,11,0.20)' };
const dotColor = (opts: SelectOption[], val: string): string => opts.find((o) => o.value === val || (o.value === 'open' && (val === 'opn' || val === 'open')))?.color ?? '#6b7280';
const statusLabel = (s: string) => s === 'open' || s === 'opn' ? 'เปิด' : 'ปิด';
const readLabel = (r: string) => r === 'read' ? 'อ่านแล้ว' : r === 'unread' ? 'ยังไม่ได้อ่าน' : r;

const NotesTab = ({ notes: initialNotes, loadingNotes, onContextMenu, onNoteClick, onNoteUpdate }: NotesTabProps) => {
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [popup, setPopup] = useState<PopupState>({ noteId: null, field: null, anchor: null });

    useEffect(() => { setNotes(initialNotes); }, [initialNotes]);

    const save = useCallback(async (noteId: number, field: keyof Note, value: unknown) => {
        const previous = notes.find((n) => n.id === noteId);
        setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, [field]: value } : n)));
        setPopup({ noteId: null, field: null, anchor: null });
        try {
            const res = await fetch(`${ENDPOINTS.EDIT_NOTE}/${noteId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field, value }) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            onNoteUpdate?.(noteId, field, value);
        } catch (err) {
            console.error('[NotesTab] EDIT_NOTE failed:', err);
            if (previous) setNotes((prev) => prev.map((n) => (n.id === noteId ? previous : n)));
        }
    }, [notes, onNoteUpdate]);

    // ── เมื่อ click row → เปิด detail + mark read_status = 'read' อัตโนมัติ ──
    const handleNoteClick = useCallback((note: Note) => {
        onNoteClick?.(note);
        if (note.read_status !== 'read') {
            save(note.id, 'read_status', 'read');
        }
    }, [onNoteClick, save]);

    // ── stopImmediatePropagation หยุด native DOM event ไม่ให้ขึ้นถึง <tr onClick> ──
    const openPopup = (e: React.MouseEvent, noteId: number, field: string) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPopup({
            noteId,
            field,
            anchor: {
                top: rect.top,
                bottom: rect.bottom,   // เพิ่ม bottom
                left: rect.left,
                width: rect.width
            }
        });
    };
    const closePopup = () => setPopup({ noteId: null, field: null, anchor: null });
    const isOpen = (noteId: number, field: string) => popup.noteId === noteId && popup.field === field;

    const openPct = () => {
        if (!notes.length) return '0.00';
        return ((notes.filter((n) => n.status === 'open' || n.status === 'opn').length / notes.length) * 100).toFixed(2);
    };
    const earliest = () => {
        if (!notes.length) return '-';
        return new Date(Math.min(...notes.map((n) => +new Date(n.created_at)))).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };
    const dateTH = (d: string) => d ? new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

    // pill ใช้ inline-flex — ขนาดพอดี content ไม่กินพื้นที่ td
    const pill = 'inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full text-[11.5px] font-medium cursor-pointer select-none transition-opacity hover:opacity-80';

    const dotPill = (opts: SelectOption[], val: string, badge: BadgeStyle, label: string) => (
        <span className={`${pill} ${badge.textClass}`} style={{ backgroundColor: badge.bg, boxShadow: `0 0 0 1px ${badge.ring}` }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor(opts, val) }} />
            {label}
        </span>
    );

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">#</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /><span>หัวข้อ</span></div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case"><span>จำนวน:</span><span className="px-2 py-0.5 rounded-md bg-gradient-to-br from-blue-600 to-blue-500 text-blue-100 font-semibold">{notes.length}</span></div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ผู้เขียน</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /><span>วันที่สร้าง</span></div>
                                <div className="mt-2 text-xs text-gray-500 normal-case flex items-center gap-2"><span>แรกสุด:</span><span className="text-gray-300 font-mono">{earliest()}</span></div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">การมองเห็น</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div>สถานะ</div>
                                <div className="mt-2 text-xs text-gray-500 normal-case flex items-center gap-2"><span>เปิด:</span><span className="px-2 py-0.5 rounded-md bg-gradient-to-br from-emerald-600 to-emerald-500 text-emerald-100 font-semibold">{openPct()}%</span></div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>ผู้รับมอบหมาย</span></div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /><span>ไฟล์แนบ</span></div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">สถานะการอ่าน</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {loadingNotes ? (
                            <tr><td colSpan={9} className="py-24 text-center"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /><p className="text-sm text-gray-500">กำลังโหลด...</p></div></td></tr>
                        ) : !notes.length ? (
                            <tr><td colSpan={9} className="py-24 text-center"><div className="flex flex-col items-center gap-3"><FileText className="w-16 h-16 text-gray-700" strokeWidth={1.5} /><p className="text-gray-500">ยังไม่มีบันทึก</p></div></td></tr>
                        ) : notes.map((note, idx) => (
                            <tr
                                key={note.id}
                                onClick={() => handleNoteClick(note)}
                                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); closePopup(); onContextMenu?.(e, note); }}
                                className="group transition-all duration-200"
                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(59,130,246,0.04)'}
                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                            >
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 text-sm font-medium transition-all idx-cell">{idx + 1}</div>
                                </td>

                                <td className="px-4 py-4 max-w-xs">
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium text-blue-400 truncate">{note.subject}</div>
                                        <div className="text-xs text-gray-500 line-clamp-2">{note.body || <span className="italic">—</span>}</div>
                                    </div>
                                </td>

                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-blue-500/30">{note.author?.[0]?.toUpperCase() ?? '?'}</div>
                                        <span className="text-sm text-gray-300">{note.author}</span>
                                    </div>
                                </td>

                                {/* Date — span inline พอดี content เท่านั้น */}
                                <td className="px-4 py-4">
                                    <span onClick={(e) => openPopup(e, note.id, 'created_at')} className="inline-flex items-center gap-2 text-sm cursor-pointer hover:opacity-75 transition-opacity">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span className="text-gray-300 font-mono">{dateTH(note.created_at)}</span>
                                    </span>
                                    {isOpen(note.id, 'created_at') && popup.anchor && (
                                        <FloatingPanel title="วันที่สร้าง" anchor={popup.anchor} onClose={closePopup} width={260}>
                                            <DatePickerContent value={note.created_at} onSave={(v) => save(note.id, 'created_at', v)} onClose={closePopup} />
                                        </FloatingPanel>
                                    )}
                                </td>

                                {/* Visibility */}
                                <td className="px-4 py-4">
                                    <span onClick={(e) => openPopup(e, note.id, 'visibility')} className="inline-flex">
                                        {note.visibility
                                            ? dotPill(VIS_OPTS, note.visibility, visBadge(note.visibility), note.visibility)
                                            : <span className={`${pill} text-gray-600`} style={{ backgroundColor: 'rgba(55,65,81,0.20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>ไม่ระบุ</span>}
                                    </span>
                                    {isOpen(note.id, 'visibility') && popup.anchor && (
                                        <FloatingPanel title="การมองเห็น" anchor={popup.anchor} onClose={closePopup} width={240}>
                                            <SelectList options={VIS_OPTS} value={note.visibility ?? ''} onSelect={(v) => save(note.id, 'visibility', v)} />
                                        </FloatingPanel>
                                    )}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4">
                                    <span onClick={(e) => openPopup(e, note.id, 'status')} className="inline-flex">
                                        {dotPill(STATUS_OPTS, note.status, statusBadge(note.status), statusLabel(note.status))}
                                    </span>
                                    {isOpen(note.id, 'status') && popup.anchor && (
                                        <FloatingPanel title="สถานะ" anchor={popup.anchor} onClose={closePopup} width={220}>
                                            <SelectList options={STATUS_OPTS} value={note.status} onSelect={(v) => save(note.id, 'status', v)} showNone={false} />
                                        </FloatingPanel>
                                    )}
                                </td>

                                {/* Assigned People */}
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <span onClick={(e) => openPopup(e, note.id, 'assigned_people')} className="inline-flex items-center gap-1 flex-nowrap  cursor-pointer">
                                        {note.assigned_people?.length ? (
                                            <>
                                                {note.assigned_people.map((p, i) => (
                                                    <span key={i} className="h-7 flex items-center px-2.5 rounded-lg bg-gradient-to-br from-gray-800 to-gray-700 border border-white/[0.07] text-xs text-gray-300">{p}</span>
                                                ))}
                                                <span className="h-7 w-7 flex items-center justify-center rounded-lg border border-dashed border-white/10 hover:border-blue-500/40 text-gray-600 hover:text-blue-400 transition-all"><Plus className="w-3 h-3" /></span>
                                            </>
                                        ) : (
                                            <span className="h-7 flex items-center gap-1.5 px-2.5 rounded-lg border border-dashed border-white/[0.07] hover:border-blue-500/25 text-gray-600 hover:text-blue-400 text-xs transition-all"><Plus className="w-3 h-3" /> เพิ่ม</span>
                                        )}
                                    </span>
                                    {isOpen(note.id, 'assigned_people') && popup.anchor && (
                                        <FloatingPanel title="ผู้รับมอบหมาย" anchor={popup.anchor} onClose={closePopup} width={300}>
                                            <AssignedPeopleContent people={note.assigned_people ?? []} onSave={(v) => save(note.id, 'assigned_people', v)} onClose={closePopup} />
                                        </FloatingPanel>
                                    )}
                                </td>

                                {/* Attachment */}
                                <td className="px-4 py-4">
                                    {note.file_url ? (
                                        <a href={ENDPOINTS.image_url + note.file_url} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-emerald-100 transition-all ring-1 ring-emerald-500/30" style={{ background: 'linear-gradient(to bottom right, #065f46, #047857)' }} onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(to bottom right, #047857, #059669)'} onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(to bottom right, #065f46, #047857)'}>
                                            <Paperclip className="w-4 h-4" /><span className="text-xs font-medium">ดูไฟล์</span>
                                        </a>
                                    ) : (
                                        <span className="text-gray-600 text-sm italic">ไม่มี</span>
                                    )}
                                </td>

                                {/* Read Status */}
                                <td className="px-4 py-4">
                                    <span onClick={(e) => openPopup(e, note.id, 'read_status')} className="inline-flex">
                                        {note.read_status
                                            ? dotPill(READ_OPTS, note.read_status, readBadge(note.read_status), readLabel(note.read_status))
                                            : <span className={`${pill} text-gray-600`} style={{ backgroundColor: 'rgba(55,65,81,0.20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}>ไม่มี</span>}
                                    </span>
                                    {isOpen(note.id, 'read_status') && popup.anchor && (
                                        <FloatingPanel title="สถานะการอ่าน" anchor={popup.anchor} onClose={closePopup} width={230}>
                                            <SelectList options={READ_OPTS} value={note.read_status ?? ''} onSelect={(v) => save(note.id, 'read_status', v)} />
                                        </FloatingPanel>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default NotesTab;