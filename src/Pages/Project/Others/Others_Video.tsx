import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Pencil, Undo2, MessageSquare, X, Reply, Info, Trash2, ChevronRight, ChevronLeft, Volume2, VolumeX, Repeat } from 'lucide-react';

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

export default function VideoReviewSystem() {
    const videoData = getVideoData();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [selectedTool, setSelectedTool] = useState('cursor');
    const [strokeColor, setStrokeColor] = useState('#FF0000');
    const [strokeWidth, setStrokeWidth] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [postedDrawingIds, setPostedDrawingIds] = useState<number[]>([]);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [replyTo, setReplyTo] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('feedback');
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [volume, setVolume] = useState(1);

    const videoUrl = videoData.videoUrl;
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const progressBarRef = useRef<HTMLDivElement | null>(null);
    const [prevVolume, setPrevVolume] = useState(1);
    const [isLooping, setIsLooping] = useState(false);

    type Point = { x: number; y: number };
    type Drawing = { id: number; path: Point[]; color: string; width: number; timestamp: number };
    type Reply = { id: number; author: string; text: string; timeAgo: string };
    type Comment = {
        id: number; author: string; timestamp: string;
        timestampSeconds: number; timestamps?: number[]; // optional
        timeAgo: string; text: string; completed: boolean;
        replies: Reply[]; drawings: Drawing[]
    };

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
            else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undoDrawing(); }
            else if (e.key === 'd') { setSelectedTool(selectedTool === 'cursor' ? 'pen' : 'cursor'); }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [selectedTool, isPlaying]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            const updateTime = () => setCurrentTime(video.currentTime);
            const updateDuration = () => setDuration(video.duration);
            video.addEventListener('timeupdate', updateTime);
            video.addEventListener('loadedmetadata', updateDuration);
            return () => { video.removeEventListener('timeupdate', updateTime); video.removeEventListener('loadedmetadata', updateDuration); };
        }
    }, []);

    useEffect(() => {
        if (!isScrubbing) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!progressBarRef.current) return;
            const rect = progressBarRef.current.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const newTime = Math.max(0, Math.min(pos * duration, duration));
            if (videoRef.current) { videoRef.current.currentTime = newTime; setCurrentTime(newTime); }
        };
        const handleMouseUp = () => setIsScrubbing(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }, [isScrubbing, duration]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause(); else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, newVolume));
        setVolume(clampedVolume);
        if (videoRef.current) videoRef.current.volume = clampedVolume;
    };

    const toggleMute = () => {
        if (volume > 0) {
            setPrevVolume(volume);
            handleVolumeChange(0);
        } else {
            handleVolumeChange(prevVolume);
        }
    };
    const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => { setIsScrubbing(true); updateProgressTime(e); };
    const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if (!isScrubbing) return; updateProgressTime(e); };
    const handleProgressMouseUp = () => setIsScrubbing(false);

    const updateProgressTime = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(pos * duration, duration));
        if (videoRef.current) { videoRef.current.currentTime = newTime; setCurrentTime(newTime); }
    };

    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (selectedTool !== 'pen' || !canvasRef.current) return;
        setIsDrawing(true);
        const { x, y } = getCanvasPoint(e);
        setCurrentPath([{ x, y }]);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || selectedTool !== 'pen' || !canvasRef.current) return;
        const { x, y } = getCanvasPoint(e);
        setCurrentPath(prev => [...prev, { x, y }]);
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        if (currentPath.length > 0) {
            setDrawings(prev => [...prev, { id: Date.now() + Math.random(), path: currentPath, color: strokeColor, width: strokeWidth, timestamp: currentTime }]);
            setCurrentPath([]);
        }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const tolerance = 0.5;
        drawings.filter(d => Math.abs(d.timestamp - currentTime) < tolerance).forEach(drawing => {
            if (drawing.path.length < 2) return;
            ctx.beginPath(); ctx.strokeStyle = drawing.color; ctx.lineWidth = drawing.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.moveTo(drawing.path[0].x, drawing.path[0].y);
            drawing.path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });
        if (currentPath.length > 1) {
            ctx.beginPath(); ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    };

    const clearDrawings = () => { setDrawings(drawings.filter(d => postedDrawingIds.includes(d.id))); setCurrentPath([]); };

    const undoDrawing = () => {
        setDrawings(prev => {
            const unposted = prev.filter(d => !postedDrawingIds.includes(d.id));
            if (unposted.length === 0) return prev;
            const idx = prev.lastIndexOf(unposted[unposted.length - 1]);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const addComment = () => {
        if (newComment.trim()) {
            if (replyTo !== null) {
                setComments(prev => prev.map(c => c.id === replyTo ? { ...c, replies: [...(c.replies || []), { id: Date.now(), author: 'Current User', text: newComment, timeAgo: 'Just now' }] } : c));
                setReplyTo(null);
            } else {
                const currentDrawings = drawings.filter(d => !postedDrawingIds.includes(d.id));
                const uniqueTimestamps = [...new Set(currentDrawings.map(d => d.timestamp))].sort((a, b) => a - b);
                setPostedDrawingIds(prev => [...prev, ...currentDrawings.map(d => d.id)]);
                setComments(prev => [...prev, {
                    id: Date.now(),
                    author: 'Current User',
                    timestamp: uniqueTimestamps.map(t => formatTime(t)).join(', '),
                    timestampSeconds: uniqueTimestamps[0] ?? currentTime,
                    timestamps: uniqueTimestamps,
                    timeAgo: 'Just now',
                    text: newComment,
                    completed: false,
                    replies: [],
                    drawings: currentDrawings
                }]);
                // ลบ setPostedDrawingIds และ setComments ซ้ำออกทั้งหมด
            }
            setNewComment('');
        }
    };

    const jumpToTimestamp = (seconds: number) => {
        if (videoRef.current) { videoRef.current.currentTime = seconds; setCurrentTime(seconds); }
    };

    const filteredComments = comments.filter(c => {
        if (filterStatus === 'completed') return c.completed;
        if (filterStatus === 'pending') return !c.completed;
        return true;
    });

    useEffect(() => { drawCanvas(); }, [drawings, currentPath, currentTime]);

    const unpostedCount = drawings.filter(d => !postedDrawingIds.includes(d.id)).length;
    const statusStyle = statusColors[videoData.status] || statusColors['wtg'];

    return (
        <div className="min-h-screen max-h-screen bg-[#0d0f14] text-white overflow-hidden flex flex-col font-sans">

            {/* ── Header ── */}
            <header className="h-14 bg-[#0a0c10]/95 backdrop-blur border-b border-white/[0.06] px-5 flex items-center justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5">
                        <div>
                            <h1 className="text-sm font-semibold text-white leading-none">{videoData.shotCode}</h1>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text} ml-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                        {videoData.status.toUpperCase()}
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">

                {/* ── Main Video Area ── */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">

                    {/* Drawing Toolbar */}
                    <div className="h-11 bg-[#0d0f14] border-b border-white/[0.05] px-4 flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedTool('cursor')}
                                className={`px-3 py-1 rounded-md text-slate-50 font-medium transition-all ${selectedTool === 'cursor'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                                    : 'bg-gradient-to-r from-gray-700 to-gray-600'}`}
                            >
                                Select
                            </button>
                            <button
                                onClick={() => setSelectedTool('pen')}
                                title="Draw (D)"
                                className={`px-3 py-1 rounded-md transition-all text-slate-50 ${selectedTool === 'pen'
                                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                                    : 'bg-gradient-to-r from-gray-600 to-gray-500'}`}
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        </div>

                        {selectedTool === 'pen' && (
                            <div className="flex items-center gap-3 pl-2 border-l border-white/[0.26]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500">Size</span>
                                    <input type="range" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-20 accent-cyan-400" min="1" max="20" />
                                    <span className="text-[11px] text-gray-400 w-6">{strokeWidth}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500">Color</span>
                                    <div className="relative w-6 h-6 rounded-md overflow-hidden border border-white/20 cursor-pointer">
                                        <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="absolute inset-0 w-8 h-8 -top-1 -left-1 cursor-pointer opacity-0" />
                                        <div className="w-full h-full rounded-md" style={{ background: strokeColor }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1" />

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={undoDrawing}
                                disabled={unpostedCount === 0}
                                title="Undo (Ctrl+Z)"
                                className={`p-1.5 rounded-lg transition-all text-slate-50 ${unpostedCount === 0
                                    ? 'bg-gradient-to-r from-gray-700 to-gray-600 opacity-40 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={clearDrawings}
                                disabled={unpostedCount === 0}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all text-slate-50 ${unpostedCount === 0
                                    ? 'bg-gradient-to-r from-gray-700 to-gray-600 opacity-40 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}
                            >
                                <Trash2 className="w-3 h-3" />
                                Clear
                            </button>
                            <div className="w-px h-4 bg-white/[0.26] mx-1" />
                            <span className="text-[10px] text-gray-600">Space · D · Ctrl+Z</span>
                        </div>
                    </div>

                    {/* Video */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
                        <div className="relative w-full h-full">
                            <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain" loop={isLooping} />
                            <canvas
                                ref={canvasRef} width={1920} height={1080}
                                className={`absolute inset-0 w-full h-full ${selectedTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'}`}
                                onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
                            />
                            <div className="absolute bottom-2 left-4 right-4 
                                    flex items-center justify-between
                                    px-2.5 py-1 rounded-lg">

                                {/* ซ้าย */}
                                <div className="flex items-center gap-1.5 border border-white/[0.10] bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[11px] text-gray-300 font-mono">
                                        {videoData.shotCode}
                                    </span>
                                </div>

                                {/* ขวา */}
                                {unpostedCount > 0 && (
                                    <div className="flex items-center gap-1.5 
                                        bg-gradient-to-r from-blue-400 to-cyan-400 
                                        px-2.5 py-1 rounded-lg">
                                        <Pencil className="w-3 h-3" />
                                        <span className="text-sm font-medium">
                                            {unpostedCount} unsaved
                                        </span>
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>

                    {/* Video Controls */}
                    <div className="bg-[#161a21] border-t border-white/[0.05] px-5 py-3 flex-shrink-0">
                    
                        <div className="flex items-center gap-4 mb-3">
                            <div onClick={togglePlay} className="rounded-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-400 hover:to-red-400 flex items-center justify-center transition-all hover:scale-105 active:scale-95 w-8 h-8">
                                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                            </div>
                            <span className="font-mono tabular-nums text-gray-400">
                                <span className="text-white">{formatTime(currentTime)}</span>
                                <span className="text-gray-600 mx-1">/</span>
                                {formatTime(duration)}
                            </span>
                            <div className="flex-1" />
                            <div
                                onClick={() => setIsLooping(o => !o)}
                                title="Loop"
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isLooping
                                    ? 'border border-cyan-400 text-cyan-400'
                                    : 'bg-white/[0.06] border border-white/[0.10] text-gray-500 hover:text-white'
                                    }`}
                            >
                                <Repeat size={14} />
                            </div>

                            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5">
                                {/* Icon ซ้าย — คลิก toggle mute */}
                                <div
                                    onClick={toggleMute}
                                    title={volume === 0 ? "Unmute" : "Mute"}
                                    className="text-gray-500 hover:text-cyan-400 transition-colors"
                                >
                                    {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </div>

                                {/* Slider */}
                                <div className="relative flex items-center w-20 h-4 group">
                                    <div className="absolute inset-y-0 left-0 flex items-center w-full pointer-events-none">
                                        <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all"
                                                style={{ width: `${volume * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume * 100}
                                        onChange={e => handleVolumeChange(Number(e.target.value) / 100)}
                                        className="relative w-full opacity-0 cursor-pointer h-4 z-10"
                                        title="Volume"
                                    />
                                </div>


                                {/* % label */}
                                <span className="text-sm font-mono text-gray-500 w-7 text-right tabular-nums">
                                    {Math.round(volume * 100)}
                                    <span className="px-0.5">%</span>
                                </span>
                            </div>
                        </div>

                        <div className="relative group"
                            ref={progressBarRef}
                            onMouseDown={handleProgressMouseDown}
                            onMouseMove={handleProgressMouseMove}
                            onMouseUp={handleProgressMouseUp}
                        >
                            <div className="h-1.5 bg-white/[0.06] rounded-full cursor-pointer relative overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-none" style={{ width: `${(currentTime / duration) * 100 || 0}%` }} />
                            </div>
                            <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                style={{ left: `${(currentTime / duration) * 100 || 0}%` }}
                            />

                            {/* Unposted drawings — mark โปร่งๆ */}
                            {drawings.filter(d => !postedDrawingIds.includes(d.id)).map(d => (
                                <div
                                    key={d.id}
                                    onClick={(e) => {
                                        if (e.altKey) {
                                            setDrawings(prev => prev.filter(drawing => drawing.id !== d.id));
                                        } else {
                                            jumpToTimestamp(d.timestamp);
                                        }
                                    }}
                                    title={`${formatTime(d.timestamp)} — unsaved (Alt+click to delete)`}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                                    style={{ left: `${(d.timestamp / duration) * 100}%` }}
                                >
                                    <span className={`block w-2 h-2 rounded-full border-2 border-slate-50 transition-transform hover:scale-300 ${Math.abs(d.timestamp - currentTime) < 0.3 ? 'bg-slate-50 scale-250' : 'bg-gray-950 scale-200'}`} />
                                </div>
                            ))}

                            {/* Posted drawings — mark เต็ม */}
                            {comments.flatMap(c =>
                                c.drawings.map(d => (
                                    <div
                                        key={d.id}
                                        onClick={() => jumpToTimestamp(d.timestamp)}
                                        title={`${formatTime(d.timestamp)} — ${c.text}`}
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10"
                                        style={{ left: `${(d.timestamp / duration) * 100}%` }}
                                    >
                                        <span className={`block w-2 h-2 rounded-full transition-transform hover:scale-300 ${Math.abs(d.timestamp - currentTime) < 0.3 ? 'bg-orange-500 scale-250' : 'bg-yellow-300 scale-200'}`} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Sidebar + Toggle ── */}
                <div className="relative flex-shrink-0 flex">
                    <div className="w-px bg-white/[0.20]" />

                    {/* Toggle button — floats on the left edge */}
                    <div
                        onClick={() => setSidebarOpen(o => !o)}
                        title={sidebarOpen ? 'Hide panel' : 'Show panel'}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-30
                            w-7 h-20 rounded-full
                            bg-[#1f2227] border border-white/[0.20]
                            hover:border-cyan-400/50 hover:bg-[#0d1117]
                            flex items-center justify-center
                            shadow-lg shadow-black/40
                            transition-all duration-200
                            group"
                    >
                        {sidebarOpen
                            ? <ChevronRight className=" text-slate-50 group-hover:text-cyan-400 transition-colors" />
                            : <ChevronLeft className=" text-slate-50 group-hover:text-cyan-400 transition-colors" />}
                    </div>

                    {/* Sidebar panel */}
                    <div
                        className="h-full bg-[#0a0c10] border-l border-white/[0.05] flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
                        style={{ width: sidebarOpen ? 360 : 0 }}
                    >
                        {/* Fixed-width inner so content doesn't warp during slide */}
                        <div className="w-[360px] flex flex-col h-full">

                            {/* Tab bar */}
                            <div className="flex flex-shrink-0">
                                {[
                                    { key: 'feedback', icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Feedback', count: comments.length },
                                    { key: 'info', icon: <Info className="w-3.5 h-3.5" />, label: 'Asset Info', count: null },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center text-slate-50 gap-1.5 px-3 py-3 text-xs font-medium transition-all relative ${activeTab === tab.key
                                            ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                                            : 'bg-gradient-to-r from-gray-700 to-gray-600'}`}
                                    >
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

                            {/* Asset Info Tab */}
                            {activeTab === 'info' ? (
                                <div className="flex-1 overflow-y-auto p-5">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Shot Details</h2>
                                    <div className="space-y-px">
                                        {[
                                            { label: 'Shot Code', value: videoData.shotCode, mono: true },
                                            { label: 'Sequence', value: videoData.sequence },
                                            { label: 'Due Date', value: videoData.dueDate || '—' },
                                            { label: 'Description', value: videoData.description || '—' },
                                        ].map(row => (
                                            <div key={row.label} className="flex items-start justify-between py-2.5 border-b border-white/[0.04]">
                                                <span className="text-[11px] text-gray-500 w-24 flex-shrink-0">{row.label}</span>
                                                <span className={`text-[12px] text-gray-200 text-right ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04]">
                                            <span className="text-[11px] text-gray-500">Status</span>
                                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                                {videoData.status.toUpperCase()}
                                            </div>
                                        </div>
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
                                /* Feedback Tab */
                                <>
                                    <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-shrink-0">
                                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{filteredComments.length} Comments</span>
                                        <select
                                            value={filterStatus}
                                            onChange={e => setFilterStatus(e.target.value)}
                                            className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2 py-1 text-[11px] text-gray-300 focus:outline-none focus:border-cyan-400/50"
                                        >
                                            <option value="all">All</option>
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                                        {filteredComments.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-40 text-center">
                                                <MessageSquare className="w-8 h-8 text-gray-700 mb-2" />
                                                <p className="text-xs text-gray-600">No feedback yet</p>
                                                <p className="text-[11px] text-gray-700 mt-0.5">Pause and type to leave a note</p>
                                            </div>
                                        )}
                                        {filteredComments.map(comment => (
                                            <div key={comment.id} className={`rounded-xl border p-3 transition-all ${comment.completed ? 'bg-emerald-950/20 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]'}`}>
                                                <div className="flex items-start gap-2.5 mb-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                                                        {comment.author[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-white truncate">{comment.author}</span>
                                                            {comment.completed && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-medium">Done</span>}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                            {(comment.timestamps ?? [comment.timestampSeconds]).map(ts => (
                                                                <button
                                                                    key={ts}
                                                                    onClick={() => jumpToTimestamp(ts)}
                                                                    className="h-6 flex items-center px-2 text-slate-300 hover:text-slate-100 font-mono font-medium transition-colors rounded-2xl bg-gradient-to-r from-gray-700 to-gray-600"
                                                                >
                                                                    <span className='text-md'>{formatTime(ts)}</span>
                                                                </button>
                                                            ))}
                                                            <span className="text-gray-700">·</span>
                                                            <span className="text-md text-gray-600">{comment.timeAgo}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-lg text-gray-300 leading-relaxed mb-2 ml-9">{comment.text}</p>

                                                {comment.drawings?.length > 0 && (
                                                    <div className="ml-9 mb-2 flex items-center gap-1 text-[10px] text-gray-600">
                                                        <Pencil className="w-2.5 h-2.5" />
                                                        {comment.drawings.length} annotation{comment.drawings.length > 1 ? 's' : ''}
                                                    </div>
                                                )}

                                                {comment.replies?.length > 0 && (
                                                    <div className="ml-9 mt-2 space-y-2 pl-3 border-l border-white/[0.06]">
                                                        {comment.replies.map(reply => (
                                                            <div key={reply.id}>
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center text-[9px] font-bold">{reply.author[0]}</div>
                                                                    <span className="text-[11px] font-semibold text-gray-300">{reply.author}</span>
                                                                    <span className="text-[10px] text-gray-600">· {reply.timeAgo}</span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-400 ml-5.5">{reply.text}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="ml-9 mt-2">
                                                    <button
                                                        onClick={() => { setReplyTo(comment.id); setNewComment(''); }}
                                                        className="flex items-center gap-1 text-[10px] text-slate-50 rounded-2xl px-2 py-0.5 transition-colors bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500"
                                                    >
                                                        <Reply className="w-3 h-3" />
                                                        Reply
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Comment Input */}
                                    <div className="border-t border-white/[0.05] p-3 flex-shrink-0 bg-[#0a0c10]">
                                        {replyTo !== null && (
                                            <div className="flex items-center justify-between mb-2 px-2.5 py-1.5 bg-blue-400/10 border border-cyan-400/20 rounded-lg">
                                                <span className="text-[11px] text-cyan-400 flex items-center gap-1">
                                                    <Reply className="w-3 h-3" />
                                                    Replying to <span className="font-semibold ml-1">{comments.find(c => c.id === replyTo)?.author}</span>
                                                </span>
                                                <button onClick={() => setReplyTo(null)} className="text-slate-50 rounded-lg p-0.5 hover:opacity-80 transition-opacity bg-gradient-to-r from-gray-600 to-gray-500">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
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
                                                    onKeyPress={e => e.key === 'Enter' && addComment()}
                                                    placeholder={replyTo ? "Write a reply…" : "Leave feedback…"}
                                                    className="w-full bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none"
                                                />
                                            </div>
                                            <button
                                                onClick={addComment}
                                                className="px-3 py-2 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 rounded-xl text-xs font-semibold transition-all hover:shadow-lg hover:shadow-cyan-400/20 active:scale-95 flex-shrink-0 text-white"
                                            >
                                                {replyTo ? 'Reply' : 'Post'}
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