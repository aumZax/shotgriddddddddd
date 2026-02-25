import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Pencil, Undo2, MessageSquare, X, Info, Trash2, ChevronRight, ChevronLeft, Volume2, VolumeX, Repeat, MousePointer } from 'lucide-react';
import ENDPOINTS from '../../../config';

// ── Types ──────────────────────────────────────────────────────────────────
type Point = { x: number; y: number };
type Drawing = { id: number; path: Point[]; color: string; width: number; timestamp: number };
type Comment = {
    id: number;
    author: string;
    author_id?: number;
    timestamp: string;
    timestampSeconds: number;
    timestamps?: number[];
    timeAgo: string;
    text: string;
    completed: boolean;
    drawings: Drawing[];
};
type User = { id: number; username: string };

// ── Helpers ─────────────────────────────────────────────────────────────────
const getVideoData = () => {
    const stored = localStorage.getItem("selectedVideo");
    if (stored) return JSON.parse(stored);
    return {
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        shotCode: "Unknown",
        sequence: "Unknown",
        status: "wtg",
        description: "",
        dueDate: "",
        shotId: null,
        versionId: null,
        versionUploadedBy: null,
        versionCreatedAt: null,
        versionDescription: null,
        versionName: null,      // ← เพิ่ม
        versionStatus: null,    // ← เพิ่ม
    };
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    wtg: { bg: 'bg-gray-700/60', text: 'text-gray-300', dot: 'bg-gray-400' },
    ip: { bg: 'bg-blue-900/50', text: 'text-blue-300', dot: 'bg-blue-400' },
    fin: { bg: 'bg-emerald-900/50', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    wtc: { bg: 'bg-yellow-900/50', text: 'text-yellow-300', dot: 'bg-yellow-400' },
    arp: { bg: 'bg-green-900/50', text: 'text-green-300', dot: 'bg-green-400' },
    nef: { bg: 'bg-red-900/50', text: 'text-red-300', dot: 'bg-red-400' },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function VideoReviewSystem() {
    const videoData = getVideoData();

    // video state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [prevVolume, setPrevVolume] = useState(1);
    const [isLooping, setIsLooping] = useState(true);
    const [isScrubbing, setIsScrubbing] = useState(false);

    // drawing state
    const [selectedTool, setSelectedTool] = useState('cursor');
    const [strokeColor, setStrokeColor] = useState('#FF0000');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [postedDrawingIds, setPostedDrawingIds] = useState<number[]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);

    // comment state
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    // user selector
    const [users, setUsers] = useState<User[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<User | null>(null);

    // ui state
    const [activeTab, setActiveTab] = useState('feedback');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // refs
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const progressBarRef = useRef<HTMLDivElement | null>(null);

    const videoUrl = videoData.videoUrl;
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editingText, setEditingText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    useEffect(() => {
        if (!videoData.versionId) return;
        setIsLoadingComments(true);  // ← เพิ่ม
        fetch(ENDPOINTS.VIDEO_COMMENTS_LIST, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version_id: videoData.versionId }),
        })
            .then(r => r.json())
            .then((data: any[]) => {
                // ... โค้ดเดิม ...
            })
            .catch(console.error)
            .finally(() => setIsLoadingComments(false));  // ← เพิ่ม
    }, [videoData.versionId]);

    // ── Load users ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetch(ENDPOINTS.PROJECT_USERS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        })
            .then(r => r.json())
            .then(setUsers)
            .catch(console.error);
    }, []);

    // ── Load comments from DB ───────────────────────────────────────────────
    useEffect(() => {
        if (!videoData.versionId) return;
        fetch(ENDPOINTS.VIDEO_COMMENTS_LIST, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version_id: videoData.versionId }),
        })
            .then(r => r.json())
            .then((data: any[]) => {
                const mapped: Comment[] = data.map(c => {
                    // ดึง timestamps ที่ไม่ซ้ำกันจาก annotations
                    const timestamps = c.annotations?.length > 0
                        ? [...new Set((c.annotations as any[]).map((a: any) => a.timestamp as number))].sort((a, b) => a - b)
                        : [c.video_time];

                    return {
                        id: c.id,
                        author: c.author_name,
                        author_id: c.author_id,
                        timestampSeconds: timestamps[0],
                        timestamps: timestamps,        // ← หลายจุด
                        timestamp: timestamps.map((t: number) => formatTime(t)).join(', '),
                        timeAgo: new Date(c.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        }),
                        text: c.text,
                        completed: false,
                        drawings: (c.annotations || []).map((a: any, i: number) => ({
                            id: c.id * 10000 + i,  // ← unique per comment
                            path: a.path,
                            color: a.color,
                            width: a.width,
                            timestamp: a.timestamp,
                        })),
                    };
                });
                setComments(mapped);

                const allIds = mapped.flatMap(c => c.drawings.map(d => d.id));
                setPostedDrawingIds(allIds);
                setDrawings(mapped.flatMap(c => c.drawings));
            })
            .catch(console.error);
    }, [videoData.versionId]);

    // ── Video event listeners ────────────────────────────────────────────────
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const updateTime = () => setCurrentTime(video.currentTime);
        const updateDuration = () => setDuration(video.duration);
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateDuration);

        const onCanPlay = () => setIsVideoReady(true);
        const onWaiting = () => setIsVideoReady(false);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('waiting', onWaiting);
        return () => {
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('canplay', onCanPlay);      // ← เพิ่ม
            video.removeEventListener('waiting', onWaiting);      // ← เพิ่ม
        };
    }, []);

    // ── Scrubbing ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isScrubbing) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!progressBarRef.current) return;
            const rect = progressBarRef.current.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const t = Math.max(0, Math.min(pos * duration, duration));
            if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); }
        };
        const handleMouseUp = () => setIsScrubbing(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isScrubbing, duration]);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
            else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undoDrawing(); }
            else if (e.key === 'd') { setSelectedTool(t => t === 'cursor' ? 'pen' : 'cursor'); }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying]);

    // ── Canvas drawing ───────────────────────────────────────────────────────
    useEffect(() => { drawCanvas(); }, [drawings, currentPath, currentTime]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatVersionDate = (dateStr: string): string => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const h = d.getHours() % 12 || 12;
        const mins = d.getMinutes().toString().padStart(2, '0');
        const ampm = d.getHours() >= 12 ? 'pm' : 'am';

        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();

        return `${day}/${month}/${year} ${days[d.getDay()]} at ${h}:${mins}${ampm}`;
    };

    // ── Video controls ───────────────────────────────────────────────────────
    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
        setIsPlaying(p => !p);
    };

    const handleVolumeChange = (v: number) => {
        const clamped = Math.max(0, Math.min(1, v));
        setVolume(clamped);
        if (videoRef.current) videoRef.current.volume = clamped;
    };

    const toggleMute = () => {
        if (volume > 0) { setPrevVolume(volume); handleVolumeChange(0); }
        else handleVolumeChange(prevVolume);
    };

    const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { setIsScrubbing(true); updateProgressTime(e); };
    const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if (isScrubbing) updateProgressTime(e); };
    const handleProgressMouseUp = () => setIsScrubbing(false);

    const updateProgressTime = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const t = Math.max(0, Math.min(((e.clientX - rect.left) / rect.width) * duration, duration));
        if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); }
    };

    const jumpToTimestamp = (seconds: number) => {
        if (videoRef.current) { videoRef.current.currentTime = seconds; setCurrentTime(seconds); }
    };

    // ── Canvas ───────────────────────────────────────────────────────────────
    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (selectedTool !== 'pen') return;
        setIsDrawing(true);
        setCurrentPath([getCanvasPoint(e)]);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || selectedTool !== 'pen') return;
        setCurrentPath(prev => [...prev, getCanvasPoint(e)]);
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath.length > 0) {
            setDrawings(prev => [...prev, {
                id: Date.now() + Math.random(),
                path: currentPath, color: strokeColor, width: strokeWidth, timestamp: currentTime,
            }]);
            setCurrentPath([]);
        }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawings
            .filter(d => Math.abs(d.timestamp - currentTime) < 0.5)
            .forEach(d => {
                if (d.path.length < 2) return;
                ctx.beginPath();
                ctx.strokeStyle = d.color; ctx.lineWidth = d.width;
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.moveTo(d.path[0].x, d.path[0].y);
                d.path.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.stroke();
            });
        if (currentPath.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    };

    const clearDrawings = () => {
        setDrawings(drawings.filter(d => postedDrawingIds.includes(d.id)));
        setCurrentPath([]);
    };

    const undoDrawing = () => {
        setDrawings(prev => {
            const unposted = prev.filter(d => !postedDrawingIds.includes(d.id));
            if (unposted.length === 0) return prev;
            const last = unposted[unposted.length - 1];
            return prev.filter(d => d.id !== last.id);
        });
    };

    // ── Post comment ─────────────────────────────────────────────────────────
    const addComment = async () => {
        if (!newComment.trim() || !selectedAuthor) return;

        setIsPosting(true);
        try {
            const currentDrawings = drawings.filter(d => !postedDrawingIds.includes(d.id));
            const uniqueTimestamps = [...new Set(currentDrawings.map(d => d.timestamp))].sort((a, b) => a - b);

            // ← แก้ตรงนี้: ถ้าไม่มี drawing ให้ใช้ currentTime แทน
            const videoTimeToSend = uniqueTimestamps.length > 0 ? uniqueTimestamps : [currentTime];
            const primaryTime = videoTimeToSend[0];

            const res = await fetch(ENDPOINTS.VIDEO_COMMENTS_CREATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    version_id: videoData.versionId,
                    author_id: selectedAuthor.id,
                    text: newComment,
                    video_time: videoTimeToSend,   // ← ไม่มีวันว่างแล้ว
                    annotations: currentDrawings.map(d => ({
                        path: d.path,
                        color: d.color,
                        width: d.width,
                        timestamp: d.timestamp,
                    })),
                }),
            });

            // ← เช็ค response ก่อน parse JSON
            if (!res.ok) {
                const text = await res.text();
                console.error('Server error:', text);
                throw new Error(`Server error ${res.status}`);
            }

            const data = await res.json();
            if (!data.success) throw new Error('Post failed');

            setPostedDrawingIds(prev => [...prev, ...currentDrawings.map(d => d.id)]);
            setComments(prev => [...prev, {
                id: data.commentId,
                author: selectedAuthor.username,
                author_id: selectedAuthor.id,
                timestamp: videoTimeToSend.map(t => formatTime(t)).join(', '),
                timestampSeconds: primaryTime,
                timestamps: videoTimeToSend,
                timeAgo: 'Just now',
                text: newComment,
                completed: false,
                drawings: currentDrawings,
            }]);
            setNewComment('');
        } catch (err) {
            console.error('Post comment error:', err);
            alert('ไม่สามารถบันทึก comment ได้');
        } finally {
            setIsPosting(false);
        }
    };

    // ── Derived ──────────────────────────────────────────────────────────────
    const unpostedCount = drawings.filter(d => !postedDrawingIds.includes(d.id)).length;

    const updateComment = async (commentId: number) => {
        setIsUpdating(true);  // ← เพิ่ม
        try {
            const res = await fetch(ENDPOINTS.VIDEO_COMMENTS_UPDATE, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment_id: commentId, text: editingText }),
            });
            const data = await res.json();
            if (!data.success) throw new Error('Update failed');

            setComments(prev => prev.map(c =>
                c.id === commentId ? { ...c, text: editingText } : c
            ));
            setEditingCommentId(null);
            setEditingText('');
        } catch (err) {
            alert('ไม่สามารถแก้ไข comment ได้');
        } finally {
            setIsUpdating(false);  // ← เพิ่ม
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen max-h-screen bg-[#0d0f14] text-white overflow-hidden flex flex-col font-sans">

            {/* ── Header ── */}
            <header className="h-14 bg-[#0a0c10]/95 backdrop-blur border-b border-white/[0.06] px-5 flex items-center justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xl font-semibold text-white leading-tight">{videoData.versionName}</span>
                        <span className="text-[11px] text-gray-400 leading-tight">
                            {videoData.shotCode}
                        </span>
                    </div>
                    {videoData.versionStatus && (
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusColors[videoData.versionStatus]?.bg ?? statusColors['wtg'].bg} ${statusColors[videoData.versionStatus]?.text ?? statusColors['wtg'].text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusColors[videoData.versionStatus]?.dot ?? statusColors['wtg'].dot}`} />
                            {videoData.versionStatus.toUpperCase()}
                        </div>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* ── Main Video Area ── */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                    {/* Drawing Toolbar */}
                    <div className="h-11 bg-[#0d0f14] border-b border-white/[0.05] px-4 flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setSelectedTool('cursor')}
                                className={`py-1 rounded-md text-slate-50 transition-all ${selectedTool === 'cursor'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 scale-110'
                                    : 'bg-gradient-to-r from-gray-700 to-gray-600 scale-90'}`}
                            >
                                <MousePointer className="w-4 h-4 scale-150" />
                            </button>
                            <button
                                onClick={() => setSelectedTool('pen')}
                                title="Draw (D)"
                                className={`py-1 rounded-md transition-all text-slate-50 ${selectedTool === 'pen'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 scale-110'
                                    : 'bg-gradient-to-r from-gray-600 to-gray-500 scale-90'}`}
                            >
                                <Pencil className="w-4 h-4 scale-150" />
                            </button>
                        </div>

                        {selectedTool === 'pen' && (
                            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                                {/* Size */}
                                <div className="flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg px-3 py-1.5">
                                    <div className="rounded-full bg-white/40 flex-shrink-0 transition-all"
                                        style={{ width: Math.max(4, Math.min(strokeWidth * 0.8, 14)), height: Math.max(4, Math.min(strokeWidth * 0.8, 14)) }} />
                                    <div className="relative flex items-center w-20 h-4">
                                        <div className="absolute w-full h-[3px] rounded-full bg-white/10 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                                                style={{ width: `${((strokeWidth - 1) / 19) * 100}%` }} />
                                        </div>
                                        <input type="range" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
                                            min="1" max="20" className="absolute w-full opacity-0 cursor-pointer h-4" />
                                        <div className="absolute w-3 h-3 rounded-full bg-white shadow-md pointer-events-none"
                                            style={{ left: `calc(${((strokeWidth - 1) / 19) * 100}% - ${((strokeWidth - 1) / 19) * 12}px)`, boxShadow: '0 0 6px rgba(34,211,238,0.6)' }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-white/30 w-4 text-right">{strokeWidth}</span>
                                </div>
                                {/* Color */}
                                <div className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg px-3 py-1.5">
                                    <div className="relative w-5 h-5 rounded-[5px] overflow-hidden cursor-pointer"
                                        style={{ boxShadow: `0 0 8px ${strokeColor}66, 0 0 0 1px ${strokeColor}44` }}>
                                        <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)}
                                            className="absolute inset-0 w-8 h-8 -top-1 -left-1 cursor-pointer opacity-0" />
                                        <div className="w-full h-full" style={{ background: strokeColor }} />
                                    </div>
                                    <span className="text-[10px] font-mono text-white/25">{strokeColor}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center gap-1.5">
                            <button onClick={undoDrawing} disabled={unpostedCount === 0} title="Undo (Ctrl+Z)"
                                className={`p-1.5 rounded-lg text-slate-50 ${unpostedCount === 0 ? 'bg-gradient-to-r from-gray-700 to-gray-600 opacity-40 cursor-not-allowed' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}>
                                <Undo2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={clearDrawings} disabled={unpostedCount === 0}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-50 ${unpostedCount === 0 ? 'bg-gradient-to-r from-gray-700 to-gray-600 opacity-40 cursor-not-allowed' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}>
                                <Trash2 className="w-3 h-3 scale-150" /> Clear
                            </button>
                            <div className="w-px h-4 bg-white/[0.26] mx-1" />
                            <span className="text-[10px] text-gray-600">Space · D · Ctrl+Z</span>
                        </div>
                    </div>

                    {/* Video */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
                        <div className="relative w-full h-full">
                            <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain"
                                loop={isLooping} crossOrigin="anonymous" playsInline />
                            <canvas ref={canvasRef} width={1920} height={1080}
                                className={`absolute inset-0 w-full h-full ${selectedTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'}`}
                                onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} />

                            {!isVideoReady && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                                        <span className="text-xs text-gray-400">Loading video…</span>
                                    </div>
                                </div>
                            )}

                            <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between px-2.5 py-1 rounded-lg">
                                <div className="flex items-center gap-1.5 border border-white/[0.10] bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[11px] text-gray-300 font-mono">{videoData.versionName}</span>
                                </div>
                                {unpostedCount > 0 && (
                                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-400 to-cyan-400 px-2.5 py-1 rounded-lg">
                                        <Pencil className="w-3 h-3" />
                                        <span className="text-sm font-medium">{unpostedCount} unsaved</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Video Controls */}
                    <div className="bg-[#161a21] border-t border-white/[0.05] px-5 py-3 flex-shrink-0">
                        <div className="flex items-center gap-4 mb-3">
                            <div onClick={togglePlay}
                                className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-400 hover:to-red-400 flex items-center justify-center w-8 h-8 cursor-pointer transition-all hover:scale-105 active:scale-95">
                                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                            </div>
                            <span className="font-mono tabular-nums text-gray-400">
                                <span className="text-white">{formatTime(currentTime)}</span>
                                <span className="text-gray-600 mx-1">/</span>
                                {formatTime(duration)}
                            </span>
                            <div className="flex-1" />
                            <div onClick={() => setIsLooping(o => !o)} title="Loop" className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${isLooping ? 'border border-cyan-400 text-cyan-400' : 'bg-white/[0.06] border border-white/[0.10] text-gray-500 hover:text-white'}`}>
                                <Repeat size={14} />
                            </div>
                            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5">
                                <div onClick={toggleMute} className="text-gray-500 hover:text-cyan-400 cursor-pointer transition-colors">
                                    {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </div>
                                <div className="relative flex items-center w-20 h-4">
                                    <div className="absolute inset-y-0 left-0 flex items-center w-full pointer-events-none">
                                        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" style={{ width: `${volume * 100}%` }} />
                                        </div>
                                    </div>
                                    <input type="range" min="0" max="100" value={volume * 100}
                                        onChange={e => handleVolumeChange(Number(e.target.value) / 100)}
                                        className="relative w-full opacity-0 cursor-pointer h-4 z-10" />
                                </div>
                                <span className="text-sm font-mono text-gray-500 w-7 text-right tabular-nums">
                                    {Math.round(volume * 100)}<span className="px-0.5">%</span>
                                </span>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="relative group" ref={progressBarRef}
                            onMouseDown={handleProgressMouseDown} onMouseMove={handleProgressMouseMove} onMouseUp={handleProgressMouseUp}>
                            <div className="h-1.5 bg-white/[0.06] rounded-full cursor-pointer relative overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-none"
                                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
                            </div>
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                style={{ left: `${(currentTime / duration) * 100 || 0}%` }} />

                            {/* Unposted drawing marks */}
                            {drawings.filter(d => !postedDrawingIds.includes(d.id)).map(d => (
                                <div key={d.id}
                                    onClick={e => e.altKey
                                        ? setDrawings(prev => prev.filter(dr => dr.id !== d.id))
                                        : jumpToTimestamp(d.timestamp)}
                                    title={`${formatTime(d.timestamp)} — unsaved (Alt+click to delete)`}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                                    style={{ left: `${(d.timestamp / duration) * 100}%` }}>
                                    <span className={`block w-2 h-2 rounded-full border-2 border-slate-50 transition-transform hover:scale-150 ${Math.abs(d.timestamp - currentTime) < 0.3 ? 'bg-slate-50 scale-125' : 'bg-gray-950 scale-100'}`} />
                                </div>
                            ))}

                            {/* Posted drawing marks */}
                            {comments.flatMap(c => c.drawings.map(d => (
                                <div key={`posted-${c.id}-${d.id}`}
                                    onClick={() => jumpToTimestamp(d.timestamp)}
                                    title={`${formatTime(d.timestamp)} — ${c.text}`}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                                    style={{ left: `${(d.timestamp / duration) * 100}%` }}>
                                    <span className={`block w-2 h-2 rounded-full transition-transform hover:scale-150 ${Math.abs(d.timestamp - currentTime) < 0.3 ? 'bg-orange-500 scale-125' : 'bg-yellow-300 scale-100'}`} />
                                </div>
                            )))}
                        </div>
                    </div>
                </div>

                {/* ── Sidebar + Toggle ── */}
                <div className="relative flex-shrink-0 flex">
                    <div className="w-px bg-white/[0.20]" />

                    <div onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? 'Hide panel' : 'Show panel'}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 w-7 h-20 rounded-full bg-[#1f2227] border border-white/[0.20] hover:border-cyan-400/50 hover:bg-[#0d1117] flex items-center justify-center shadow-lg cursor-pointer transition-all group">
                        {sidebarOpen
                            ? <ChevronRight className="text-slate-50 group-hover:text-cyan-400 transition-colors" />
                            : <ChevronLeft className="text-slate-50 group-hover:text-cyan-400 transition-colors" />}
                    </div>

                    <div className="h-full bg-[#0a0c10] border-l border-white/[0.05] flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
                        style={{ width: sidebarOpen ? 360 : 0 }}>
                        <div className="w-[360px] flex flex-col h-full">

                            {/* Tab bar */}
                            <div className="flex flex-shrink-0">
                                {[
                                    { key: 'feedback', icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Feedback', count: comments.length },
                                    { key: 'info', icon: <Info className="w-3.5 h-3.5" />, label: 'Shot Info', count: null },
                                ].map(tab => (
                                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center text-slate-50 gap-1.5 px-3 py-3 text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gradient-to-r from-gray-700 to-gray-600'}`}>
                                        {tab.icon}
                                        {tab.label}
                                        {tab.count !== null && (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-gray-400'}`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* ── Asset Info Tab ── */}
                            {activeTab === 'info' ? (
                                <div className="flex-1 overflow-y-auto p-5">
                                    {/* เพิ่ม block นี้ระหว่าง Shot Details กับ Review Stats */}
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-6 mb-4">Version Details</h2>
                                    <div className="space-y-px">
                                        {[
                                            { label: 'Version Name', value: videoData.versionName || '—', mono: true },
                                            { label: 'Uploaded By', value: videoData.versionUploadedBy || '—', mono: false },
                                            { label: 'Upload Date', value: videoData.versionCreatedAt ? formatVersionDate(videoData.versionCreatedAt) : '—', mono: false },
                                            { label: 'Description', value: videoData.versionDescription || '—', mono: false },
                                        ].map(row => (
                                            <div key={row.label} className="flex items-start justify-between py-2.5 border-b border-white/[0.04]">
                                                <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">{row.label}</span>
                                                <span className={`text-[12px] text-gray-200 text-right ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                                            </div>
                                        ))}
                                        {videoData.versionStatus && (
                                            <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                                                <span className="text-[11px] text-gray-500">Version Badge</span>
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[videoData.versionStatus]?.bg ?? statusColors['wtg'].bg} ${statusColors[videoData.versionStatus]?.text ?? statusColors['wtg'].text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors[videoData.versionStatus]?.dot ?? statusColors['wtg'].dot}`} />
                                                    {videoData.versionStatus.toUpperCase()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-6 mb-4">Review Stats</h2>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                                            <div className="text-2xl font-bold text-white">{drawings.length}</div>
                                            <div className="text-[11px] text-gray-500 mt-0.5">Annotations</div>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                                            <div className="text-2xl font-bold text-white">{comments.length}</div>
                                            <div className="text-[11px] text-gray-500 mt-0.5">Comments</div>
                                        </div>
                                    </div>
                                </div>

                            ) : (
                                /* ── Feedback Tab ── */
                                <>
                                    <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                            {comments.length} Comments
                                        </span>
                                    </div>

                                    {/* Comment list */}
                                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                                        {isLoadingComments ? (
                                            <div className="flex flex-col items-center justify-center h-40 gap-3">
                                                <div className="w-6 h-6 border-2 border-white/10 border-t-cyan-400 rounded-full animate-spin" />
                                                <p className="text-xs text-gray-600">Loading comments…</p>
                                            </div>
                                        ) : comments.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                                <MessageSquare className="w-8 h-8 text-gray-700 mb-2" />
                                                <p className="text-xs text-gray-600">No feedback yet</p>
                                                <p className="text-[11px] text-gray-700 mt-0.5">Select your name and leave a note</p>
                                            </div>
                                        ) : null}
                                        {comments.map(comment => (
                                            <div key={comment.id}
                                                className={`rounded-xl border p-3 transition-all ${comment.completed ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]'}`}>
                                                <div className="flex items-start gap-2.5 mb-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                                                        {comment.author[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-white truncate">{comment.author}</span>
                                                            {comment.completed && (
                                                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Done</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                            {(comment.timestamps ?? [comment.timestampSeconds]).map(ts => (
                                                                <button key={ts} onClick={() => jumpToTimestamp(ts)}
                                                                    className="h-6 flex items-center px-2 text-slate-300 hover:text-slate-100 font-mono font-medium transition-colors rounded-2xl bg-gradient-to-r from-gray-700 to-gray-600">
                                                                    <span className="text-md">{formatTime(ts)}</span>
                                                                </button>
                                                            ))}
                                                            <span className="text-gray-700">·</span>
                                                            <span className="text-md text-gray-600">{comment.timeAgo}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* แทนที่ <p className="text-lg text-gray-300 ..."> */}
                                                {editingCommentId === comment.id ? (
                                                    <div className="ml-9 mb-2 flex gap-2">
                                                        <input
                                                            autoFocus
                                                            value={editingText}
                                                            onChange={e => setEditingText(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') updateComment(comment.id);
                                                                if (e.key === 'Escape') setEditingCommentId(null);
                                                            }}
                                                            className="flex-1 bg-white/[0.06] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                                                        />
                                                        <button
                                                            onClick={() => updateComment(comment.id)}
                                                            disabled={isUpdating}  // ← เพิ่ม
                                                            className="px-2.5 py-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg text-xs text-white font-medium disabled:opacity-50 flex items-center gap-1.5"
                                                        >
                                                            {isUpdating ? (
                                                                <>
                                                                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                                                                    <span>Saving…</span>
                                                                </>
                                                            ) : 'Save'}
                                                        </button>

                                                        {/* Cancel ก็ disable ระหว่าง saving */}
                                                        <button
                                                            onClick={() => setEditingCommentId(null)}
                                                            disabled={isUpdating}  // ← เพิ่ม
                                                            className="px-2.5 py-1 bg-white/[0.06] rounded-lg text-xs text-gray-400 hover:text-white disabled:opacity-50"
                                                        >
                                                            Cancel
                                                        </button>

                                                    </div>
                                                ) : (
                                                    <p
                                                        className="text-xs text-gray-300 leading-relaxed mb-2 ml-9 cursor-pointer hover:text-white border border-white/[0.12] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400/50"
                                                        onDoubleClick={() => {
                                                            setEditingCommentId(comment.id);
                                                            setEditingText(comment.text);
                                                        }}
                                                    >
                                                        {comment.text}
                                                    </p>
                                                )}
                                                {comment.drawings?.length > 0 && (
                                                    <div className="ml-9 mb-2 flex items-center gap-1 text-[10px] text-gray-600">
                                                        <Pencil className="w-2.5 h-2.5" />
                                                        {comment.drawings.length} annotation{comment.drawings.length > 1 ? 's' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* ── Comment Input ── */}
                                    <div className="border-t border-white/[0.05] p-3 flex-shrink-0 bg-[#0a0c10]">

                                        {/* Version Info Banner */}
                                        {videoData.versionUploadedBy && (
                                            <div className="mb-2 px-2.5 py-2 bg-white/[0.03] border border-white/[0.07] rounded-xl">
                                                <div className="flex items-start gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                                                        {videoData.versionUploadedBy[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] text-gray-300">
                                                            <span className="text-white font-medium">Version by {videoData.versionUploadedBy}</span>
                                                            {videoData.versionCreatedAt && (
                                                                <span className="text-gray-500"> • {formatVersionDate(videoData.versionCreatedAt)}</span>
                                                            )}
                                                        </div>
                                                        {videoData.versionDescription && (
                                                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed truncate">
                                                                {videoData.versionDescription}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── User Selector ── */}
                                        <div className="mb-2">
                                            <select
                                                value={selectedAuthor?.id ?? ''}
                                                onChange={e => {
                                                    const user = users.find(u => u.id === Number(e.target.value));
                                                    setSelectedAuthor(user || null);
                                                }}
                                                className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-400/50"
                                            >
                                                <option value="">— Select your name —</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.username}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* ── Input Row ── */}
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2 focus-within:border-cyan-400/40 transition-colors">
                                                <div className="text-[10px] text-gray-600 mb-1 font-mono">
                                                    {(() => {
                                                        const unposted = drawings.filter(d => !postedDrawingIds.includes(d.id));
                                                        const times = [...new Set(unposted.map(d => formatTime(d.timestamp)))];
                                                        return times.length > 0 ? times.join(', ') : formatTime(currentTime);
                                                    })()}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={newComment}
                                                    onChange={e => setNewComment(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && !isPosting && addComment()}
                                                    placeholder={selectedAuthor ? 'Leave feedback…' : 'Select your name first…'}
                                                    disabled={!selectedAuthor}
                                                    className="w-full bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none disabled:opacity-40"
                                                />
                                            </div>
                                            <button
                                                onClick={addComment}
                                                disabled={!selectedAuthor || !newComment.trim() || isPosting}
                                                className="px-3 py-2 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 rounded-xl text-xs font-semibold transition-all hover:shadow-lg hover:shadow-cyan-400/20 active:scale-95 flex-shrink-0 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {isPosting ? '…' : 'Post'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}