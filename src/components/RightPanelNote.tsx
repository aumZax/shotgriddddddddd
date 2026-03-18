/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react';
import { Paperclip, Send, Trash2, User, X } from 'lucide-react';
import ENDPOINTS from '../config';

interface Note {
    id: number;
    project_id: number;
    note_type: string;
    type_id: number;
    subject: string;
    body: string;
    file_url?: string;        // legacy single
    file_urls?: string[];     // multi-file
    author: string;
    status: string;
    visibility: string;
    created_at: string;
    tasks?: string[];
    assigned_people?: string[];
}

interface NoteReply {
    id: number;
    note_id: number;
    author: string;
    body: string;
    file_url?: string;        // legacy single
    file_urls?: string[];     // multi-file
    created_at: string;
}

interface RightPanelNoteProps {
    selectedNote: Note;
    isPanelOpen: boolean;
    rightPanelWidth: number;
    entityName: string;
    entityLabel: string;
    onClose: () => void;
    onResize: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const formatDateThai = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('th-TH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const visBadge = (v: string) =>
    v === 'Client'
        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

const isImage = (url?: string) => !!url?.match(/\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i);
const isVid   = (url?: string) => !!url?.match(/\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i);

/** normalise file_url / file_urls → always string[]
 *  Handles:
 *    - string[]  already parsed array
 *    - "a||b||c" GROUP_CONCAT with || separator (from backend)
 *    - "a,b,c"   GROUP_CONCAT with , separator
 *    - JSON string "[\"a\",\"b\"]"
 *    - single string
 *    - null / undefined
 */
const normaliseUrls = (file_url?: string | null, file_urls?: string[] | string | null): string[] => {
    // 1. try file_urls first
    if (file_urls != null) {
        if (Array.isArray(file_urls)) {
            const r = file_urls.filter(Boolean);
            if (r.length > 0) return r;
        }
        if (typeof file_urls === 'string' && file_urls.trim()) {
            const s = file_urls.trim();
            // JSON array
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed.filter(Boolean);
            } catch { /* not JSON */ }
            // || separator (backend GROUP_CONCAT)
            if (s.includes('||')) return s.split('||').map(u => u.trim()).filter(Boolean);
            // , separator
            if (s.includes(',')) return s.split(',').map(u => u.trim()).filter(Boolean);
            // single url
            return [s];
        }
    }
    // 2. fallback to legacy file_url
    if (file_url && typeof file_url === 'string' && file_url.trim()) return [file_url.trim()];
    return [];
};

// ── FileGrid: renders 1-N files without changing the surrounding UI ────────────
interface FileGridProps {
    urls: string[];
    maxThumbHeight?: string; // tailwind class, e.g. 'max-h-56'
}

const FileGrid: React.FC<FileGridProps> = ({ urls, maxThumbHeight = 'max-h-56' }) => {
    // safety: ensure urls is always a real array
    const safeUrls = Array.isArray(urls) ? urls.filter(Boolean) : [];
    if (safeUrls.length === 0) return null;
    // shadow the prop so the rest of the component uses safeUrls
    urls = safeUrls;

    // single file → existing behaviour (centred, full width)
    if (urls.length === 1) {
        const url = urls[0];
        const full = ENDPOINTS.image_url + url;
        if (isVid(url)) {
            return (
                <video
                    src={full}
                    className={`${maxThumbHeight} rounded-lg object-contain`}
                    controls
                />
            );
        }
        if (isImage(url)) {
            return (
                <img
                    src={full}
                    alt=""
                    className={`${maxThumbHeight} rounded-lg object-contain`}
                />
            );
        }
        return (
            <a
                href={full}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm transition-all"
            >
                <Paperclip className="w-4 h-4" />
                ดูไฟล์แนบ
            </a>
        );
    }

    // multiple files → grid layout
    // images/videos: 2-col responsive grid; other files: list
    const mediaUrls = urls.filter(u => isImage(u) || isVid(u));
    const otherUrls = urls.filter(u => !isImage(u) && !isVid(u));

    return (
        <div className="w-full space-y-2">
            {mediaUrls.length > 0 && (
                <div className={`grid gap-1.5 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {mediaUrls.map((url, i) => {
                        const full = ENDPOINTS.image_url + url;
                        return isVid(url) ? (
                            <video
                                key={i}
                                src={full}
                                controls
                                className="w-full max-h-40 rounded-lg object-cover bg-black"
                            />
                        ) : (
                            <img
                                key={i}
                                src={full}
                                alt=""
                                className="w-full max-h-40 rounded-lg object-cover"
                            />
                        );
                    })}
                </div>
            )}
            {otherUrls.length > 0 && (
                <div className="flex flex-col gap-1">
                    {otherUrls.map((url, i) => (
                        <a
                            key={i}
                            href={ENDPOINTS.image_url + url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm transition-all"
                        >
                            <Paperclip className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{url.split('/').pop()}</span>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── ReplyFilePreviewBar ────────────────────────────────────────────────────────
interface ReplyFilePreviewBarProps {
    files: File[];
    previews: string[];
    onRemove: (index: number) => void;
}

const ReplyFilePreviewBar: React.FC<ReplyFilePreviewBarProps> = ({ files, previews, onRemove }) => {
    if (files.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 px-1">
            {files.map((file, i) => (
                <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 max-w-[180px]"
                >
                    {previews[i] ? (
                        <img src={previews[i]} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                        <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-300 truncate flex-1">{file.name}</span>
                    <button
                        onClick={() => onRemove(i)}
                        className="text-red-200 bg-gradient-to-br from-red-500 to-red-500 hover:from-red-600 hover:to-red-600 rounded-2xl flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const RightPanelNote: React.FC<RightPanelNoteProps> = ({
    selectedNote,
    isPanelOpen,
    rightPanelWidth,
    entityName,
    entityLabel,
    onClose,
    onResize,
}) => {
    const currentUser = localStorage.getItem('currentUser') || 'Manager';
    const bottomRef = useRef<HTMLDivElement>(null);

    const [replies, setReplies] = useState<NoteReply[]>([]);
    const [loadingReplies, setLoadingReplies] = useState(false);

    const [replyBody, setReplyBody] = useState('');
    const [replyFiles, setReplyFiles]       = useState<File[]>([]);
    const [replyPreviews, setReplyPreviews] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ── fetch replies ──────────────────────────────────────────
    const fetchReplies = async () => {
        setLoadingReplies(true);
        try {
            const res = await fetch(ENDPOINTS.GET_NOTE_COMMENTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noteId: selectedNote.id }),
            });
            const data = await res.json();
            setReplies(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('fetch replies error:', err);
        } finally {
            setLoadingReplies(false);
        }
    };

    useEffect(() => {
        if (selectedNote?.id) fetchReplies();
        setReplyBody('');
        setReplyFiles([]);
        setReplyPreviews([]);
    }, [selectedNote?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies]);

    // ── file picker helpers ────────────────────────────────────
    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const arr = Array.from(incoming);
        const previews = arr.map(f =>
            f.type.startsWith('image/') ? URL.createObjectURL(f) : ''
        );
        setReplyFiles(prev => [...prev, ...arr]);
        setReplyPreviews(prev => [...prev, ...previews]);
    };

    const removeFile = (index: number) => {
        setReplyFiles(prev => prev.filter((_, i) => i !== index));
        setReplyPreviews(prev => {
            if (prev[index]) URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    // ── submit reply ───────────────────────────────────────────
const handleSubmit = async () => {
    if (!replyBody.trim() || submitting) return;
    setSubmitting(true);
    try {
        let fileUrls: string[] = [];

        if (replyFiles.length > 0) {
            // สร้าง formData เดียว ใส่ไฟล์ทั้งหมด
            const formData = new FormData();
            replyFiles.forEach(file => formData.append('file', file)); 

            let uploadEndpoint = '';
            if (entityLabel === 'Sequence') {
                formData.append('sequenceId', String(selectedNote.type_id));
                uploadEndpoint = ENDPOINTS.UPLOAD_SEQUENCE;
            } else if (entityLabel === 'Shot') {
                formData.append('shotId', String(selectedNote.type_id));
                uploadEndpoint = ENDPOINTS.UPLOAD_SHOT;
            } else if (entityLabel === 'Asset') {
                formData.append('assetId', String(selectedNote.type_id));
                uploadEndpoint = ENDPOINTS.UPLOAD_ASSET;
            }

            if (uploadEndpoint) {
                const uploadRes = await fetch(uploadEndpoint, { method: 'POST', body: formData });
                if (!uploadRes.ok) {
                    const errText = await uploadRes.text();
                    throw new Error(`Upload failed: ${errText.slice(0, 200)}`);
                }
                const uploadData = await uploadRes.json();
                // รองรับทั้ง { files: [...] } และ { file: {...} }
                fileUrls = uploadData?.files?.map((f: { fileUrl: string }) => f.fileUrl).filter(Boolean)
                    ?? (uploadData?.file?.fileUrl ? [uploadData.file.fileUrl] : []);
            }
        }

        const res = await fetch(ENDPOINTS.CREATE_NOTE_COMMENT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                noteId: selectedNote.id,
                author: currentUser,
                body: replyBody.trim(),
                fileUrl:  fileUrls[0] ?? null,
                fileUrls: fileUrls.length > 0 ? fileUrls : undefined,
            }),
        });

        if (!res.ok) throw new Error('Create reply failed');
        const newReply = await res.json();
        setReplies(prev => [...prev, newReply]);
        setReplyBody('');
        setReplyFiles([]);
        setReplyPreviews([]);
    } catch (err) {
        console.error('submit reply error:', err);
        alert('ไม่สามารถส่ง reply ได้');
    } finally {
        setSubmitting(false);
    }
};

    // ── delete reply ───────────────────────────────────────────
    const handleDeleteReply = async (replyId: number) => {
        setIsDeleting(true);
        try {
            await fetch(`${ENDPOINTS.DELETE_NOTE_COMMENT}/${replyId}`, { method: 'DELETE' });
            setReplies(prev => prev.filter(r => r.id !== replyId));
            setDeleteConfirm(null);
        } catch (err) {
            alert('ไม่สามารถลบได้');
        } finally {
            setIsDeleting(false);
        }
    };

    // normalised urls for the main note
    const noteUrls = normaliseUrls(selectedNote.file_url, selectedNote.file_urls);

    return (
        <>
            <div
                className={`
                    fixed right-0 top-26 bottom-0
                    bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
                    shadow-2xl flex z-40 border-l border-slate-700/30
                    transform transition-transform duration-300 ease-out
                    ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
                `}
                style={{ width: `${rightPanelWidth}px` }}
            >
                {/* Resize Handle */}
                <div
                    className="w-2 bg-gradient-to-b from-slate-700/80 via-slate-600/80 to-slate-700/80 hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 cursor-col-resize transition-all duration-300"
                    onMouseDown={onResize}
                />

                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* ── Header ── */}
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/60 shadow-xl flex-shrink-0">
                        <div className="flex items-start justify-between px-5 py-4 gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400 mb-1">
                                    {entityLabel} › {entityName}
                                </p>
                                <h2 className="text-lg font-bold text-white leading-snug truncate">
                                    {selectedNote.subject}
                                </h2>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${visBadge(selectedNote.visibility)}`}>
                                        {selectedNote.visibility}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {formatDateThai(selectedNote.created_at)}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-red-600 hover:to-red-700 rounded-2xl transition-all flex-shrink-0"
                            >
                                <X className="w-5 h-5 text-slate-400 hover:text-white" />
                            </button>
                        </div>
                    </div>

                    {/* ── Scrollable content ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                        {/* ═══ MAIN NOTE CARD ═══ */}
                        <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 shadow-lg overflow-hidden">
                            {/* thumbnail / file area */}
                            {noteUrls.length > 0 ? (
                                <div className="w-full bg-slate-950 flex items-center justify-center p-3">
                                    <FileGrid urls={noteUrls} maxThumbHeight="max-h-56" />
                                </div>
                            ) : null}

                            {/* body */}
                            <div className="p-4">
                                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                                    {selectedNote.body || <span className="italic text-slate-500">ไม่มีเนื้อหา</span>}
                                </p>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                        {selectedNote.author?.[0]?.toUpperCase() ?? '?'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-300">{selectedNote.author}</p>
                                        <p className="text-[10px] text-slate-500">{formatDateThai(selectedNote.created_at)}</p>
                                    </div>
                                    {selectedNote.assigned_people && selectedNote.assigned_people.length > 0 && (
                                        <div className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                                            <User className="w-3 h-3" />
                                            <span>{selectedNote.assigned_people.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ═══ DIVIDER ═══ */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-700/60" />
                            <span className="text-xs text-slate-500 font-medium">
                                {loadingReplies ? 'กำลังโหลด...' : `${replies.length} ความคิดเห็น`}
                            </span>
                            <div className="flex-1 h-px bg-slate-700/60" />
                        </div>

                        {/* ═══ REPLIES ═══ */}
                        {loadingReplies ? (
                            <div className="flex justify-center py-8">
                                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {replies.map(reply => {
                                    const replyUrls = normaliseUrls(reply.file_url, reply.file_urls);
                                    return (
                                        <div key={reply.id} className="group flex gap-3 items-start">
                                            {/* avatar */}
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow-md">
                                                {reply.author?.[0]?.toUpperCase() ?? '?'}
                                            </div>

                                            {/* bubble */}
                                            <div className="flex-1 min-w-0">
                                                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <p className="text-xs font-semibold text-slate-300">{reply.author}</p>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-slate-600">{formatDateThai(reply.created_at)}</p>
                                                            <button
                                                                onClick={() => setDeleteConfirm({ id: reply.id })}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20 bg-gradient-to-br from-red-500 to-red-500 hover:from-red-600 hover:to-red-600"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 text-red-200" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                                                        {reply.body}
                                                    </p>
                                                    {/* reply files */}
                                                    {replyUrls.length > 0 && (
                                                        <div className="mt-2">
                                                            <FileGrid urls={replyUrls} maxThumbHeight="max-h-40" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={bottomRef} />
                            </div>
                        )}
                    </div>

                    {/* ── Reply Input (fixed bottom) ── */}
                    <div className="flex-shrink-0 border-t border-slate-700/60 bg-slate-900/90 backdrop-blur-sm px-4 py-3 space-y-2">
                        {/* file previews (multi) */}
                        <ReplyFilePreviewBar
                            files={replyFiles}
                            previews={replyPreviews}
                            onRemove={removeFile}
                        />

                        {/* input row */}
                        <div className="flex items-end gap-2">
                            {/* avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mb-0.5 shadow">
                                {currentUser?.[0]?.toUpperCase() ?? '?'}
                            </div>

                            {/* textarea */}
                            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 flex items-end gap-2 focus-within:border-blue-500/60 transition-colors">
                                <textarea
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                    placeholder="ตอบกลับ... (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)"
                                    rows={1}
                                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none resize-none max-h-32 leading-relaxed"
                                    style={{ minHeight: '24px' }}
                                />

                                {/* attach files (multiple) */}
                                <label className="flex-shrink-0 cursor-pointer text-slate-500 hover:text-blue-400 transition-colors mb-0.5">
                                    <Paperclip className="w-4 h-4" />
                                    <input
                                        type="file"
                                        accept="image/*,video/*,.pdf,.doc,.docx"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            addFiles(e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>

                            {/* send button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!replyBody.trim() || submitting}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex-shrink-0"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 text-white scale-200" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-zinc-100">ลบความคิดเห็น</h3>
                                <p className="text-sm text-zinc-400 mt-0.5">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg text-zinc-200 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleDeleteReply(deleteConfirm.id)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-red-700 hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                {isDeleting ? 'กำลังลบ...' : 'ลบ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default RightPanelNote;