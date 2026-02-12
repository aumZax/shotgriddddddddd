// 🟢 Completed Group (เสร็จสมบูรณ์)
// javascript// Shot
// ['fin', 'cmpt', 'cfrm', 'cap', 'dlvr']
// // Asset  
// ['fin', 'cmpt']
// // Sequence
// ['fin']

// 🔵 In Progress Group (กำลังดำเนินการ)
// javascript// Shot
// ['ip', 'arp', 'rts', 'wtc']

// // Asset
// ['ip', 'rts', 'recd']

// // Sequence
// ['ip']

// 🟡 Pending Group (รอดำเนินการ/พักชั่วคราว)
// javascript// Shot
// ['wtg', 'hld', 'nef']

// // Asset
// ['wtg', 'hld', 'pndng']

// // Sequence
// ['wtg']

// ⚫ Excluded (ไม่นับรวม)
// javascript// Shot
// ['omt', 'na', 'vnd']

// // Asset
// [] // ไม่มี

// // Sequence
// [] // ไม่มี
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

import  { useState } from 'react';
import { BarChart3, CheckCircle2, Clock, AlertCircle, Film, Image, ListChecks, Layers, Search } from 'lucide-react';
import Navbar_Project from "../../components/Navbar_Project";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ENDPOINTS from "../../config";


type StatusType = 'wtg' | 'ip' | 'fin';


const statusConfig: Record<
    StatusType,
    { label: string; className: string }
> = {
    wtg: {
        label: "Waiting to Start",
        className: "text-gray-400 bg-gray-500/20",
    },
    ip: {
        label: "In Progress",
        className: "text-blue-400 bg-blue-500/20",
    },
    fin: {
        label: "Final",
        className: "text-green-400 bg-green-500/20",
    },
};


const getStatusColor = (status: StatusType) => {
    return statusConfig[status]?.className ?? "text-gray-400 bg-gray-500/20";
};

const getStatusText = (status: StatusType) => {
    return statusConfig[status]?.label ?? status;
};



interface Sequence {
    id: number;
    project_id: number;
    sequence_name: string;
    description: string;
    order_index: number;
    created_at: string;
    file_url: string | null;
    status: StatusType;

    shot_count: number;
}


export default function Project_Detail() {
    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "instant", // หรือ "smooth"
        });
    }, []);


    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');



    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [loadingSequences, setLoadingSequences] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingProjectImage, setLoadingProjectImage] = useState(true);
    const [loadingSequenceImages, setLoadingSequenceImages] = useState<Record<number, boolean>>({});
    
    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    console.log("🔍 Project Data from localStorage:", projectData); // เพิ่มบรรทัดนี้
    const projectId = projectData?.projectId;
    const projectName = projectData?.projectName;
    const projectThumbnail = projectData?.thumbnail;
    const projectCreatedAt = projectData?.createdAt;

    const projectCreatedBy = projectData?.createdBy;
    console.log("📌 CreatedBy:", projectCreatedBy); // เพิ่มบรรทัดนี้
    console.log("📌 CreatedAt:", projectCreatedAt); // เพิ่มบรรทัดนี้

    useEffect(() => {
        if (!projectId) return;

        const fetchSequences = async () => {
            try {
                setLoadingSequences(true);

                const res = await fetch(ENDPOINTS.PROJECT_SEQUENCES, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ projectId }),
                });

                if (!res.ok) {
                    throw new Error("Failed to fetch sequences");
                }

                const data = await res.json();
                setSequences(data);
            } catch (error) {
                console.error("Failed to load sequences", error);
            } finally {
                setLoadingSequences(false);
            }
        };

        fetchSequences();
    }, [projectId]);


    // คำสถิติ Shots, Assets, Sequences ++++++++++++++++++++++++++++++
    useEffect(() => {
        if (!projectId) return;

        const fetchAllStats = async () => {
            try {
                setLoadingStats(true);

                // Fetch all stats in parallel
                const [sequenceRes, shotRes, assetRes] = await Promise.all([
                    fetch(ENDPOINTS.PROJECT_SEQUENCE_STATS, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId }),
                    }),
                    fetch(ENDPOINTS.PROJECT_SHOT_STATS, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId }),
                    }),
                    fetch(ENDPOINTS.PROJECT_ASSET_STATS, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId }),
                    })
                ]);

                if (!sequenceRes.ok || !shotRes.ok || !assetRes.ok) {
                    throw new Error("Failed to fetch stats");
                }

                const [sequenceData, shotData, assetData] = await Promise.all([
                    sequenceRes.json(),
                    shotRes.json(),
                    assetRes.json()
                ]);

                setSequenceStats(sequenceData);
                setShotStats(shotData);
                setAssetStats(assetData);
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoadingStats(false);
            }
        };

        fetchAllStats();
    }, [projectId]);

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    const [shotStats, setShotStats] = useState({
        totalShots: 0,
        completedShots: 0,
        inProgressShots: 0,
        pendingShots: 0,
    });

    const [assetStats, setAssetStats] = useState({
        totalAssets: 0,
        completedAssets: 0,
        inProgressAssets: 0,
        pendingAssets: 0,
    });

    const [sequenceStats, setSequenceStats] = useState({
        totalSequences: 0,
        completedSequences: 0,
        inProgressSequences: 0,
        pendingSequences: 0,
    });



    const shotPercentage =
        shotStats.totalShots === 0
            ? 0
            : Math.round(
                (shotStats.completedShots / shotStats.totalShots) * 100
            );

    const assetPercentage =
        assetStats.totalAssets === 0
            ? 0
            : Math.round(
                (assetStats.completedAssets / assetStats.totalAssets) * 100
            );

    const sequencePercentage =
        sequenceStats.totalSequences === 0
            ? 0
            : Math.round(
                (sequenceStats.completedSequences / sequenceStats.totalSequences) * 100
            );


    // คำนวณ remaining +++++++++++++++++++++++++++++++++++
    const remainingShots = shotStats.totalShots - shotStats.completedShots;
    const remainingAssets = assetStats.totalAssets - assetStats.completedAssets;
    const remainingSequences = sequenceStats.totalSequences - sequenceStats.completedSequences;

    // สถานะรวม +++++++++++++++++++++++++++++++++++
    const totalCompleted = Number(shotStats.completedShots) + Number(assetStats.completedAssets);
    const totalInProgress = Number(shotStats.inProgressShots) + Number(assetStats.inProgressAssets);
    const totalPending = Number(shotStats.pendingShots) + Number(assetStats.pendingAssets);

    // Filter sequences
    const filteredSequences = sequences.filter(seq => {
        const matchesSearch =
            seq.sequence_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (seq.description || "").toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            filterStatus === 'all' || seq.status === filterStatus;

        return matchesSearch && matchesStatus;
    });



    const handleOpenSequence = (seq: Sequence) => {
        localStorage.setItem(
            "sequenceData",
            JSON.stringify({
                sequenceId: seq.id,
                sequenceName: seq.sequence_name,
                description: seq.description,
                status: seq.status,
                thumbnail: seq.file_url,
                createdAt: seq.created_at,
                projectId
            })
        );

        navigate("/Project_Sequence/Others_Sequence");
    };


    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";

        return new Date(dateStr).toLocaleString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const handleProjectImageLoad = () => {
        setLoadingProjectImage(false);
    };

    const handleSequenceImageLoad = (sequenceId: number) => {
        setLoadingSequenceImages(prev => ({
            ...prev,
            [sequenceId]: false
        }));
    };

    const handleSequenceImageError = (sequenceId: number) => {
        setLoadingSequenceImages(prev => ({
            ...prev,
            [sequenceId]: false
        }));
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <div className="pt-14">
                <Navbar_Project />
            </div>
            <div className="h-10"></div>
            <div className="max-w-7xl mx-auto p-5">
                {/* Project Header */}
                <div className="mb-6 bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700/50 shadow-2xl">
                   <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:min-h-auto"> 
                        {/* Left: Thumbnail */}
                        <div className="lg:col-span-2 relative h-72 lg:h-auto items-center justify-center overflow-hidden bg-gray-900/50">
                            {projectThumbnail ? (
                                <div className="relative w-full h-full p-6">
                                    {/* Decorative corners */}
                                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-purple-500/40"></div>
                                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-purple-500/40"></div>
                                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-purple-500/40"></div>
                                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-purple-500/40"></div>
                                    
                                    {/* Loading Overlay */}
                                    {loadingProjectImage && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 border-3 border-gray-400 border-t-purple-500 rounded-full animate-spin" />
                                                <p className="text-gray-300 text-sm">Loading Image...</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Background blur effect */}
                                    <img
                                        src={ENDPOINTS.image_url+projectThumbnail}
                                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-20"
                                        alt=""
                                        onLoad={handleProjectImageLoad}
                                    />
                                    
                                    {/* Main image with proper sizing */}
                                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                                        <img
                                            src={ENDPOINTS.image_url+projectThumbnail}
                                            alt={projectName}
                                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                                            onLoad={handleProjectImageLoad}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center shadow-lg border border-gray-600/30">
                                        <Image className="w-12 h-12 text-gray-500" />
                                    </div>
                                    <p className="text-gray-400 text-sm font-medium">No Thumbnail</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Info */}
                        <div className="lg:col-span-3 p-8 lg:p-10 flex flex-col justify-center space-y-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm">
                            {/* Title with underline effect */}
                            <div className="space-y-2">
                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight break-words">
                                    {projectName}
                                </h1>
                                <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                            </div>
                            
                            {/* Info badges */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 group">
                                    <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-700/80 to-gray-700/50 rounded-xl border border-gray-600/50 hover:border-purple-500/50 transition-all duration-300 shadow-lg backdrop-blur-sm">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 animate-pulse flex-shrink-0"></div>
                                        <span className="text-gray-400 text-sm whitespace-nowrap">สร้างโดย:</span>
                                        <span className="text-white font-semibold break-words">{projectCreatedBy}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3 group">
                                    <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-gradient-to-r from-gray-700/80 to-gray-700/50 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg backdrop-blur-sm">
                                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 animate-pulse flex-shrink-0"></div>
                                        <span className="text-gray-400 text-sm whitespace-nowrap">วันที่สร้าง:</span>
                                        <span className="text-white font-semibold break-words">{formatDate(projectCreatedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative element */}
                            <div className="flex gap-2 pt-2">
                                <div className="h-1 w-12 bg-purple-500/50 rounded-full"></div>
                                <div className="h-1 w-8 bg-blue-500/50 rounded-full"></div>
                                <div className="h-1 w-6 bg-pink-500/50 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content - Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Sequences (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Sequences Section with Filters */}
                        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center">
                                    <Layers className="w-5 h-5 mr-2 text-purple-400" />
                                    Sequences ({filteredSequences.length})
                                </h2>
                            </div>

                            {/* Search and Filter */}
                            <div className="flex gap-3 mb-4">
                                <div className="flex-1 relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="ค้นหา Sequence..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-gray-700 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                                    />
                                </div>
                                <div className="relative">
                                   <select
    value={filterStatus}
    onChange={(e) => setFilterStatus(e.target.value)}
    className="appearance-none bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-lg pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 cursor-pointer hover:from-gray-600 hover:to-gray-700 hover:border-purple-500/50 shadow-lg"
>
    <option value="all" className="bg-gray-800">All</option>
    <option value="wtg" className="bg-gray-800">Waiting to Start</option>
    <option value="ip" className="bg-gray-800">In Progress</option>
    <option value="fin" className="bg-gray-800">Final</option>
</select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Sequences List - Scrollable */}
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar relative">
                                {/* Loading State */}
                                {loadingSequences && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                            <p className="text-gray-300 text-sm">Loading...</p>
                                        </div>
                                    </div>
                                )}

                                {/* No Results */}
                                {!loadingSequences && filteredSequences.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                        <Layers className="w-16 h-16 mb-4 opacity-30" />
                                        <p className="text-lg font-medium">ไม่พบ Sequence</p>
                                        <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือเปลี่ยนตัวกรอง</p>
                                    </div>
                                )}

                                {/* Sequences Items */}
                                {!loadingSequences && filteredSequences.map((seq) => (
                                    <div
                                        key={seq.id}
                                        className="bg-gray-750 rounded-lg border border-gray-700 hover:border-purple-500 transition-all cursor-pointer overflow-hidden"
                                        onClick={() => handleOpenSequence(seq)}
                                    >
                                        <div className="flex">
                                            {/* Thumbnail */}
                                            <div className="relative w-32 h-24 flex-shrink-0">
                                                {seq.file_url ? (
                                                    <>
                                                        {/* Loading Overlay for Sequence Image */}
                                                        {loadingSequenceImages[seq.id] !== false && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 z-10">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <div className="w-8 h-8 border-2 border-gray-500 border-t-purple-400 rounded-full animate-spin" />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <img
                                                            src={ENDPOINTS.image_url+seq.file_url}
                                                            alt={seq.sequence_name}
                                                            className="w-full h-full object-cover"
                                                            onLoad={() => handleSequenceImageLoad(seq.id)}
                                                            onError={() => handleSequenceImageError(seq.id)}
                                                        />
                                                    </>
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 ">
                                                        <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                                                            <Image className="w-6 h-6 text-gray-500" />
                                                        </div>
                                                        <p className="text-gray-500 text-xs font-medium">
                                                            No Thumbnail
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 p-3">
                                                <div className="flex items-start justify-between mb-1">
                                                    <h3 className="text-sm font-semibold text-white">{seq.sequence_name}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(seq.status)} whitespace-nowrap ml-2`}>
                                                        {getStatusText(seq.status)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                                                    {seq.description?.trim() ? (
                                                        seq.description
                                                    ) : (
                                                        <span className="italic text-gray-500">Null</span>
                                                    )}
                                                </p>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs">
                                                        {seq.shot_count === 0
                                                            ? (<span className='text-gray-400'> ยังไม่มี Shot </span>)
                                                            : (<span className='text-blue-300'> {seq.shot_count} Shots </span>)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Stats & Activities (1/3 width) */}
                    <div className="space-y-6">
                        {/* Stats Cards - Stacked */}
                        <div className="space-y-4 relative">
                            {/* Loading Overlay for Stats */}
                            {loadingStats && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20 rounded-lg">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                        <p className="text-gray-300 text-sm">Loading...</p>
                                    </div>
                                </div>
                            )}

                            {/* Sequences Card */}
                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                        <ListChecks className="w-6 h-6 text-purple-400 mr-2" />
                                        <div>
                                            <h3 className="text-gray-400 text-xs">Total Sequences</h3>
                                            <span className="text-xl font-bold text-white">
                                                {sequenceStats.totalSequences}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-purple-400">{sequencePercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${sequencePercentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{sequenceStats.completedSequences} เสร็จแล้ว</span>
                                    <span>{remainingSequences} remaining</span>
                                </div>
                            </div>

                            {/* Shots Card */}
                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                        <Film className="w-6 h-6 text-blue-400 mr-2" />
                                        <div>
                                            <h3 className="text-gray-400 text-xs">Total Shots</h3>
                                            <span className="text-xl font-bold text-white">{shotStats.totalShots}</span>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-blue-400">{shotPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${shotPercentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{shotStats.completedShots} เสร็จแล้ว</span>
                                    <span>{remainingShots} remaining</span>
                                </div>
                            </div>

                            {/* Assets Card */}
                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-green-500 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                        <Image className="w-6 h-6 text-green-400 mr-2" />
                                        <div>
                                            <h3 className="text-gray-400 text-xs">Total Assets</h3>
                                            <span className="text-xl font-bold text-white">
                                                {assetStats.totalAssets}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xl font-bold text-green-400">{assetPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                                    <div
                                        className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${assetPercentage}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{assetStats.completedAssets} เสร็จแล้ว</span>
                                    <span>{remainingAssets} remaining</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Overview */}
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 relative">
                            {/* Loading Overlay for Status Overview */}
                            {loadingStats && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20 rounded-lg">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                        <p className="text-gray-300 text-sm">Loading...</p>
                                    </div>
                                </div>
                            )}

                            <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                                <BarChart3 className="w-4 h-4 mr-2 text-purple-400" />
                                สถานะโดยรวม Shot & Asset
                            </h3>
                            <div className="space-y-2">
                                {/* Completed */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                        <CheckCircle2 className="w-4 h-4 text-green-400 mr-2" />
                                        <span className="text-gray-400">Final</span>
                                    </div>
                                    <span className="text-green-400 font-semibold">
                                        {totalCompleted}
                                    </span>
                                </div>

                                {/* In Progress */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 text-blue-400 mr-2" />
                                        <span className="text-gray-400">In Progress</span>
                                    </div>
                                    <span className="text-blue-400 font-semibold">
                                        {totalInProgress}
                                    </span>
                                </div>

                                {/* Pending */}
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center">
                                        <AlertCircle className="w-4 h-4 text-yellow-400 mr-2" />
                                        <span className="text-gray-400">Waiting to Start</span>
                                    </div>
                                    <span className="text-yellow-400 font-semibold">
                                        {totalPending}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #374151;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #6b7280;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #9333ea;
                }
            `}</style>
        </div>
    );
}