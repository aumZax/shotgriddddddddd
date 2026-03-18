import { useEffect, useRef, useState } from 'react';
import { Image, Paperclip, Send, Trash2, User, X } from 'lucide-react';
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
}

interface NoteReply {
    id: number;
    note_id: number;
    author: string;
    body: string;
    file_url?: string;
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
    const [replyFile, setReplyFile] = useState<File | null>(null);
    const [replyFilePreview, setReplyFilePreview] = useState('');
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
        setReplyFile(null);
        setReplyFilePreview('');
    }, [selectedNote?.id]);

    // scroll to bottom เมื่อ replies เพิ่ม
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies]);

    // ── submit reply ───────────────────────────────────────────
    const handleSubmit = async () => {
        if (!replyBody.trim() || submitting) return;
        setSubmitting(true);
        try {
            let fileUrl: string | null = null;

            if (replyFile) {
                const formData = new FormData();
                formData.append('file', replyFile);
                formData.append('fileName', replyFile.name);
                formData.append('type', 'note');

                // upload ผ่าน shot endpoint (ปรับตาม entity_type ได้)
                formData.append('shotId', String(selectedNote.type_id));
                const uploadRes = await fetch(ENDPOINTS.UPLOAD_SHOT, {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();
                fileUrl = uploadData?.files?.[0]?.fileUrl ?? uploadData?.file?.fileUrl ?? null;
            }

            const res = await fetch(ENDPOINTS.CREATE_NOTE_COMMENT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    noteId: selectedNote.id,
                    author: currentUser,
                    body: replyBody.trim(),
                    fileUrl,
                }),
            });

            if (!res.ok) throw new Error('Create reply failed');
            const newReply = await res.json();
            setReplies(prev => [...prev, newReply]);
            setReplyBody('');
            setReplyFile(null);
            setReplyFilePreview('');
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

    const isImage = (url?: string) => !!url?.match(/\.(jpe?g|png|gif|webp|avif)(\?.*)?$/i);
    const isVid = (url?: string) => !!url?.match(/\.(mp4|webm|ogg|mov|avi)(\?.*)?$/i);

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
                        {/* Breadcrumb + close */}
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
                            {/* thumbnail */}
                            {selectedNote.file_url && (
                                <div className="w-full bg-slate-950 flex items-center justify-center p-3">
                                    {isVid(selectedNote.file_url) ? (
                                        <video
                                            src={ENDPOINTS.image_url + selectedNote.file_url}
                                            className="max-h-56 rounded-lg object-contain"
                                            controls
                                        />
                                    ) : isImage(selectedNote.file_url) ? (
                                        <img
                                            src={ENDPOINTS.image_url + selectedNote.file_url}
                                            alt=""
                                            className="max-h-56 rounded-lg object-contain"
                                        />
                                    ) : (
                                        <a
                                            href={ENDPOINTS.image_url + selectedNote.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm transition-all"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                            ดูไฟล์แนบ
                                        </a>
                                    )}
                                </div>
                            )}

                            {!selectedNote.file_url && (
                                <div className="flex items-center justify-center py-8 bg-slate-950/40">
                                    <div className="flex flex-col items-center gap-2 text-slate-600">
                                        <Image className="w-10 h-10" />
                                        <p className="text-xs">ไม่มีไฟล์แนบ</p>
                                    </div>
                                </div>
                            )}

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
                                {replies.map(reply => (
                                    <div
                                        key={reply.id}
                                        className="group flex gap-3 items-start"
                                    >
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
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/20"
                                                            title="ลบ"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                                                    {reply.body}
                                                </p>
                                                {/* reply file */}
                                                {reply.file_url && (
                                                    <div className="mt-2">
                                                        {isImage(reply.file_url) ? (
                                                            <img
                                                                src={ENDPOINTS.image_url + reply.file_url}
                                                                alt=""
                                                                className="max-h-40 rounded-lg object-contain border border-slate-700"
                                                            />
                                                        ) : isVid(reply.file_url) ? (
                                                            <video
                                                                src={ENDPOINTS.image_url + reply.file_url}
                                                                controls
                                                                className="max-h-40 rounded-lg w-full"
                                                            />
                                                        ) : (
                                                            <a
                                                                href={ENDPOINTS.image_url + reply.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-1"
                                                            >
                                                                <Paperclip className="w-3.5 h-3.5" />
                                                                ดูไฟล์แนบ
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>
                        )}
                    </div>

                    {/* ── Reply Input (fixed bottom) ── */}
                    <div className="flex-shrink-0 border-t border-slate-700/60 bg-slate-900/90 backdrop-blur-sm px-4 py-3 space-y-2">
                        {/* file preview */}
                        {replyFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                                {replyFilePreview ? (
                                    <img src={replyFilePreview} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                ) : (
                                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                )}
                                <span className="text-xs text-slate-300 truncate flex-1">{replyFile.name}</span>
                                <button
                                    onClick={() => { setReplyFile(null); setReplyFilePreview(''); }}
                                    className="text-slate-500 hover:text-red-400 flex-shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

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

                                {/* attach file */}
                                <label className="flex-shrink-0 cursor-pointer text-slate-500 hover:text-blue-400 transition-colors mb-0.5">
                                    <Paperclip className="w-4 h-4" />
                                    <input
                                        type="file"
                                        accept="image/*,video/*,.pdf,.doc,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setReplyFile(file);
                                            setReplyFilePreview(
                                                file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
                                            );
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>

                            {/* send button */}
                            <button
                                onClick={handleSubmit}
                                disabled={!replyBody.trim() || submitting}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 flex-shrink-0"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 text-white" />
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