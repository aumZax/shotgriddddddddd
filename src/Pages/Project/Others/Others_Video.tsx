import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Pencil, Undo2, Download, MessageSquare, Check, X, Reply, Info } from 'lucide-react';

export default function VideoReviewSystem() {
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

const [comments, setComments] = useState<Comment[]>([
    {
        id: 1,
        author: 'Chanitkan Donthaisong',
        timestamp: '00:15',
        timestampSeconds: 15,
        timeAgo: '2 months ago',
        text: 'Are the reflections around the face plate wrapping around it? Looks flat.',
        completed: false,
        replies: [
            {
                id: 101,
                author: 'Artist',
                text: 'Fixed in next version',
                timeAgo: '2 months ago'
            }
        ],
        drawings: []
    },
    {
        id: 2,
        author: 'Chanitkan Donthaisong',
        timestamp: '00:45',
        timestampSeconds: 45,
        timeAgo: '2 months ago',
        text: 'Approved. Will send to client for Final',
        completed: true,
        replies: [],
        drawings: []
    }
]);

    const [newComment, setNewComment] = useState('');

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const progressBarRef = useRef<HTMLDivElement | null>(null);

    const videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

    type Point = {
        x: number;
        y: number;
    };

    type Drawing = {
        id: number;
        path: Point[];
        color: string;
        width: number;
        timestamp: number;
    };

    type Reply = {
    id: number;
    author: string;
    text: string;
    timeAgo: string;
};

type Comment = {
    id: number;
    author: string;
    timestamp: string;
    timestampSeconds: number;
    timeAgo: string;
    text: string;
    completed: boolean;
    replies: Reply[];
    drawings: Drawing[];
};


    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                undoDrawing();
            } else if (e.key === 'd') {
                setSelectedTool(selectedTool === 'cursor' ? 'pen' : 'cursor');
            }
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

            return () => {
                video.removeEventListener('timeupdate', updateTime);
                video.removeEventListener('loadedmetadata', updateDuration);
            };
        }
    }, []);

    useEffect(() => {
        if (!isScrubbing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!progressBarRef.current) return;
            
            const rect = progressBarRef.current.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const newTime = Math.max(0, Math.min(pos * duration, duration));

            if (videoRef.current) {
                videoRef.current.currentTime = newTime;
                setCurrentTime(newTime);
            }
        };

        const handleMouseUp = () => {
            setIsScrubbing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isScrubbing, duration]);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = pos * duration;

        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsScrubbing(true);
        updateProgressTime(e);
    };

    const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isScrubbing) return;
        updateProgressTime(e);
    };

    const handleProgressMouseUp = () => {
        setIsScrubbing(false);
    };

    const updateProgressTime = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(pos * duration, duration));

        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
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
            setDrawings(prev => [
                ...prev,
                {
                    id: Date.now() + Math.random(),
                    path: currentPath,
                    color: strokeColor,
                    width: strokeWidth,
                    timestamp: currentTime
                }
            ]);
            setCurrentPath([]);
        }
    };

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // กรอง drawings ที่ใกล้เคียงกับเวลาปัจจุบัน (±0.5 วินาที)
        const tolerance = 0.5;
        const visibleDrawings = drawings.filter(drawing => 
            Math.abs(drawing.timestamp - currentTime) < tolerance
        );

        visibleDrawings.forEach(drawing => {
            if (drawing.path.length < 2) return;

            ctx.beginPath();
            ctx.strokeStyle = drawing.color;
            ctx.lineWidth = drawing.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(drawing.path[0].x, drawing.path[0].y);
            drawing.path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        });

        // วาดเส้นที่กำลังวาดอยู่
        if (currentPath.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            currentPath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    };

    const clearDrawings = () => {
        // เก็บเฉพาะ drawings ที่โพสต์ไปแล้ว
        setDrawings(drawings.filter(d => postedDrawingIds.includes(d.id)));
        setCurrentPath([]);
    };

    const undoDrawing = () => {
        // ลบ drawing ล่าสุดที่ยังไม่ได้โพสต์
        setDrawings(prev => {
            const unpostedDrawings = prev.filter(d => !postedDrawingIds.includes(d.id));
            if (unpostedDrawings.length === 0) return prev;
            
            const indexToRemove = prev.lastIndexOf(unpostedDrawings[unpostedDrawings.length - 1]);
            return prev.filter((_, index) => index !== indexToRemove);
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
                setComments(prev => prev.map(comment => {
                    if (comment.id === replyTo) {
                        return {
                            ...comment,
                            replies: [...(comment.replies || []), {
                                id: Date.now(),
                                author: 'Current User',
                                text: newComment,
                                timeAgo: 'Just now'
                            }]
                        };
                    }
                    return comment;
                }));
                setReplyTo(null);
            } else {
                // กรอง drawings ที่วาดในช่วงเวลานี้
                const tolerance = 0.5;
                const currentDrawings = drawings.filter(drawing => 
                    Math.abs(drawing.timestamp - currentTime) < tolerance
                );

                // บันทึก IDs ของ drawings ที่โพสต์ไป
                const postedIds = currentDrawings.map(d => d.id);
                setPostedDrawingIds(prev => [...prev, ...postedIds]);

                setComments(prev => [...prev, {
                    id: Date.now(),
                    author: 'Current User',
                    timestamp: formatTime(currentTime),
                    timestampSeconds: currentTime,
                    timeAgo: 'Just now',
                    text: newComment,
                    completed: false,
                    replies: [],
                    drawings: currentDrawings
                }]);
            }
            setNewComment('');
        }
    };

    const toggleComplete = (id: number) => {
        setComments(prev =>
            prev.map(comment =>
                comment.id === id
                    ? { ...comment, completed: !comment.completed }
                    : comment
            )
        );
    };

    const jumpToTimestamp = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            setCurrentTime(seconds);
        }
    };

    const saveAnnotations = () => {
        const data = {
            drawings,
            comments,
            videoUrl,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `review-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredComments = comments.filter(comment => {
        if (filterStatus === 'completed') return comment.completed;
        if (filterStatus === 'pending') return !comment.completed;
        return true;
    });

    useEffect(() => {
        drawCanvas();
    }, [drawings, currentPath, currentTime]);

    return (
        <div className="min-h-screen max-h-screen bg-[#1a1d24] text-white overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#0f1115] border-b border-gray-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold">BUNNY_080_0010</h1>
                    <span className="text-gray-400 text-sm">Animation Project</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={saveAnnotations}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Review
                    </button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-64px)]">
                {/* Main Video Area */}
                <div className="flex-1 flex flex-col bg-black overflow-hidden">
                    {/* Drawing Tools */}
                    <div className="bg-[#0f1115] border-b border-gray-800 px-4 py-2 flex items-center gap-4 flex-shrink-0">
                        <div className="flex gap-1 bg-[#1a1d24] rounded p-1">
                            <button
                                onClick={() => setSelectedTool('cursor')}
                                className={`px-3 py-2 rounded transition-colors ${selectedTool === 'cursor'
                                    ? 'bg-blue-600'
                                    : 'hover:bg-gray-700'
                                    }`}
                            >
                                <span className="text-sm">Select</span>
                            </button>
                            <button
                                onClick={() => setSelectedTool('pen')}
                                className={`p-2 rounded transition-colors ${selectedTool === 'pen'
                                    ? 'bg-blue-600'
                                    : 'hover:bg-gray-700'
                                    }`}
                                title="Draw (D)"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedTool === 'pen' && (
                            <>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-400">Size</label>
                                    <input
                                        type="range"
                                        value={strokeWidth}
                                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                                        className="w-24"
                                        min="1"
                                        max="20"
                                    />
                                    <span className="text-sm text-gray-400 w-8">{strokeWidth}px</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-400">Color</label>
                                    <input
                                        type="color"
                                        value={strokeColor}
                                        onChange={(e) => setStrokeColor(e.target.value)}
                                        className="w-10 h-8 rounded cursor-pointer"
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex-1"></div>

                        <button
                            onClick={undoDrawing}
                            className="p-2 hover:bg-gray-700 rounded"
                            title="Undo (Ctrl+Z)"
                            disabled={drawings.filter(d => !postedDrawingIds.includes(d.id)).length === 0}
                        >
                            <Undo2 className={`w-5 h-5 ${drawings.filter(d => !postedDrawingIds.includes(d.id)).length === 0 ? 'opacity-30' : ''}`} />
                        </button>
                        <button
                            onClick={clearDrawings}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded text-sm"
                            disabled={drawings.filter(d => !postedDrawingIds.includes(d.id)).length === 0}
                        >
                            Clear All
                        </button>

                        <span className="text-xs text-gray-500">
                            Shortcuts: Space = Play/Pause | D = Draw | Ctrl+Z = Undo
                        </span>
                    </div>

                    {/* Video Player */}
                    <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
                        <div className="relative w-full h-full">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="w-full h-full object-contain"
                            />
                            <canvas
                                ref={canvasRef}
                                width={1920}
                                height={1080}
                                className={`absolute top-0 left-0 w-full h-full ${selectedTool === 'pen' ? 'cursor-crosshair' : 'cursor-default'}`}
                                onMouseDown={handleCanvasMouseDown}
                                onMouseMove={handleCanvasMouseMove}
                                onMouseUp={handleCanvasMouseUp}
                                onMouseLeave={handleCanvasMouseUp}
                            />
                            <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded text-sm">
                                BBB_08_a-team_001_COMP_001.mov
                            </div>
                        </div>
                    </div>

                    {/* Video Controls */}
                    <div className="bg-[#0f1115] border-t border-gray-800 px-4 py-2 flex-shrink-0">
                        <div className="flex items-center gap-4 mb-3">
                            <button
                                onClick={togglePlay}
                                className="p-2 hover:bg-gray-700 rounded transition-colors"
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            <span className="text-sm font-mono tabular-nums">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        <div className="relative">
                            {/* Progress Bar */}
                            <div
                                ref={progressBarRef}
                                className="h-2 bg-gray-700 rounded-full cursor-pointer relative"
                                onMouseDown={handleProgressMouseDown}
                                onMouseMove={handleProgressMouseMove}
                                onMouseUp={handleProgressMouseUp}
                            >
                                <div
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />
                            </div>

                            {/* Comment Markers */}
                            <div className="relative h-4 mt-1">
                                {comments.map(comment => (
                                    <div
                                        key={comment.id}
                                        onClick={() => jumpToTimestamp(comment.timestampSeconds)}
                                        title={`${comment.timestamp} - ${comment.text}`}
                                        className="absolute top-0 -translate-x-3 p-1 rounded-full w-0 cursor-pointer"
                                        style={{
                                            left: `${(comment.timestampSeconds / duration) * 100}%`,
                                        }}
                                    >
                                        <span
                                            className={`
                                                block w-[8px] h-[8px] rounded-full
                                                ${Math.abs(comment.timestampSeconds - currentTime) < 0.3
                                                    ? 'bg-orange-600 scale-200'
                                                    : 'bg-yellow-500'}
                                            `}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar with Tabs */}
                <div className="w-96 bg-[#0f1115] border-l border-gray-800 flex flex-col">
                    {/* Tab Navigation */}
                    <div className="border-b border-gray-800 flex-shrink-0">
                        <div className="flex">
                            <button
                                onClick={() => setActiveTab('feedback')}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'feedback'
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Feedback ({comments.length})
                                </span>
                                {activeTab === 'feedback' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('info')}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'info'
                                    ? 'text-white'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Asset Info
                                </span>
                                {activeTab === 'info' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'info' ? (
                        // Asset Information Tab
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <h2 className="text-lg font-semibold mb-4">Asset Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-10 h-10 bg-purple-600 rounded flex items-center justify-center">
                                                <span className="text-sm font-semibold">C</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Comp</div>
                                                <div className="text-xs text-gray-400">Type</div>
                                            </div>
                                            <div className="ml-auto">
                                                <span className="px-3 py-1 bg-green-600 rounded text-xs font-semibold">Approved</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-800 pt-4">
                                        <div className="text-xs text-gray-400 mb-1">Shot ID</div>
                                        <div className="text-sm font-mono">C005 / S1010</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Name</div>
                                        <div className="text-sm">Compositing</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Version</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                                A
                                            </div>
                                            <div>
                                                <div className="text-sm">Version 1</div>
                                                <div className="text-xs text-gray-400">11/15/2025, 7:00:00 AM (2 months ago)</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Stage</div>
                                        <div className="text-sm">4 Final</div>
                                    </div>

                                    <div className="border-t border-gray-800 pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 bg-teal-600 rounded flex items-center justify-center">
                                                <span className="text-xs">📄</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold">Compositing</div>
                                                <div className="text-xs text-gray-400">Task</div>
                                            </div>
                                            <div className="ml-auto">
                                                <span className="px-3 py-1 bg-green-600 rounded text-xs font-semibold">Approved</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-800 pt-4">
                                        <div className="text-xs text-gray-400 mb-1">Artist</div>
                                        <div className="text-sm">ShotGrid Support</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Annotations</div>
                                        <div className="text-sm">{drawings.length} drawings</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Comments</div>
                                        <div className="text-sm">{comments.length} feedback items</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Feedback Tab
                        <>
                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold">Feedback ({filteredComments.length})</h3>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="bg-[#1a1d24] border border-gray-700 rounded px-2 py-1 text-sm"
                                    >
                                        <option value="all">All versions</option>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    {filteredComments.map(comment => (
                                        <div key={comment.id} className={`border-l-2 ${comment.completed ? 'border-green-500' : 'border-gray-700'} pl-3 pb-3`}>
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                                    {comment.author[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold">{comment.author}</div>
                                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                                        <button
                                                            onClick={() => jumpToTimestamp(comment.timestampSeconds)}
                                                            className="hover:text-blue-400 transition-colors"
                                                        >
                                                            {comment.timestamp}
                                                        </button>
                                                        · {comment.timeAgo}
                                                    </div>
                                                </div>
                                            </div>

                                            {comment.completed && (
                                                <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs mb-2">
                                                    Internal
                                                </span>
                                            )}

                                            <p className="text-sm text-gray-300 mb-2">{comment.text}</p>

                                            {/* แสดงจำนวน drawings ที่เกี่ยวข้อง */}
                                            {comment.drawings && comment.drawings.length > 0 && (
                                                <div className="text-xs text-gray-500 mb-2">
                                                    📝 {comment.drawings.length} annotation{comment.drawings.length > 1 ? 's' : ''}
                                                </div>
                                            )}

                                            {/* Replies */}
                                            {comment.replies && comment.replies.length > 0 && (
                                                <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-700 pl-3">
                                                    {comment.replies.map(reply => (
                                                        <div key={reply.id} className="text-sm">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs">
                                                                    {reply.author[0]}
                                                                </div>
                                                                <span className="font-semibold text-xs">{reply.author}</span>
                                                                <span className="text-xs text-gray-500">· {reply.timeAgo}</span>
                                                            </div>
                                                            <p className="text-gray-400 text-xs ml-8">{reply.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    onClick={() => {
                                                        setReplyTo(comment.id);
                                                        setNewComment('');
                                                    }}
                                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                                                >
                                                    <Reply className="w-3 h-3" />
                                                    REPLY
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-800 p-4 flex-shrink-0">
                                {replyTo !== null && (
                                    <div className="flex items-center justify-between mb-2 text-sm bg-blue-600/20 px-3 py-2 rounded">
                                        <span className="text-blue-400">
                                            Replying to {comments.find(c => c.id === replyTo)?.author}
                                        </span>
                                        <button onClick={() => setReplyTo(null)}>
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addComment()}
                                        placeholder={replyTo ? "Write a reply..." : "Leave feedback at current time..."}
                                        className="flex-1 bg-[#1a1d24] border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        onClick={addComment}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold transition-colors"
                                    >
                                        {replyTo ? 'REPLY' : 'POST'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}