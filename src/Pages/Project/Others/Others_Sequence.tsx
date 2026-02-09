import { useEffect, useState } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import { useNavigate } from 'react-router-dom';
import ENDPOINTS from "../../../config";
import { Eye, Image, Upload, X } from 'lucide-react';
import TaskTab from "../../../components/TaskTab";
import axios from 'axios';


// Status configuration
const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-green-500', icon: 'dot' }
};

type StatusType = keyof typeof statusConfig;

// ⭐ เพิ่ม type ที่ขาดหาย
type TaskReviewer = {
    id: number;
    username: string;
};

type PipelineStep = {
    id: number;
    step_name: string;
    step_code: string;
    color_hex: string;
    entity_type?: 'shot' | 'asset';
};

// ⭐ อัปเดต Task type
type Task = {
    id: number;
    project_id: number;
    entity_type: string;
    entity_id: number;
    task_name: string;
    status: string;
    start_date: string;
    due_date: string;
    created_at: string;
    description: string;
    file_url: string;
    assignees: TaskAssignee[];
    reviewers?: TaskReviewer[];
    pipeline_step?: PipelineStep | null;
};

type TaskAssignee = {
    id: number;
    username: string;
};

export default function Others_Sequence() {
    const [activeTab, setActiveTab] = useState('Sequence Info');
    const [shotData, setShotData] = useState({
        id: 0,
        shotCode: "",
        sequence: "",
        status: "wtg" as StatusType,
        tags: [],
        thumbnail: "",
        description: "",
        dueDate: "-"
    });

    const [showPreview, setShowPreview] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showCreateSequence_Task, setShowCreateSequence_Task] = useState(false);
    const [showCreateSequence_Note, setShowCreateSequence_Note] = useState(false);

    // ++++++++++++++++++++++++++++++++++++++ storage +++++++++++++++++++++++++++++++
    const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
    const sequenceId = stored.sequenceId;

    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;

    // ++++++++++++++++++++++++++++++++++++++++ right panel
    const [rightPanelTab, setRightPanelTab] = useState('notes');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(600);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 400 && newWidth <= 1000) {
                setRightPanelWidth(newWidth);
            }
        }
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowStatusMenu(!showStatusMenu);
    };

    const handleStatusChange = async (newStatus: StatusType) => {
        try {
            setShotData(prev => ({ ...prev, status: newStatus }));
            setShowStatusMenu(false);
            await updateSequence({ status: newStatus });
        } catch (error) {
            console.error("❌ update status failed:", error);
            alert("Failed to update status");
        }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = () => {
        if (showStatusMenu) setShowStatusMenu(false);
    };

    // +++++++++++++++++++++++++++++ sequence task
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        if (!sequenceId || !projectId) {
            console.warn("⚠️ Missing sequenceId or projectId");
            return;
        }

        axios.post<Task[]>(ENDPOINTS.SEQUENCE_TASK, {
            project_id: projectId,
            entity_type: "sequence",
            entity_id: sequenceId
        })
            .then(res => {
                console.log("✅ Tasks received:", res.data);
                setTasks(res.data);
            })
            .catch(err => {
                console.error("❌ โหลด task ไม่สำเร็จ", err);
            });
    }, [sequenceId, projectId]);

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Date
    const formatDateThai = (dateString: string) => {
        if (!dateString) return '-';

        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        return date.toLocaleDateString('th-TH', options);
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ right
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    useEffect(() => {
        if (selectedTask) {
            setIsPanelOpen(false);
            const t = setTimeout(() => setIsPanelOpen(true), 10);
            return () => clearTimeout(t);
        }
    }, [selectedTask]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Sequence Info':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow label="Sequence" value={shotData.sequence} />
                        <InfoRow label="Status" value={statusConfig[shotData.status].label} />
                        <InfoRow label="Due Date" value={formatDate(shotData.dueDate)} />
                        <div className="md:col-span-2">
                            <InfoRow label="Description" value={shotData.description} />
                        </div>
                    </div>
                );

            case 'Tasks':
                return (
                    <TaskTab
                        tasks={tasks}
                        onTaskClick={(task: Task) => setSelectedTask(task)}
                    />
                );

            case 'Shots':
                return (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl border border-gray-600/50 shadow-lg">
                        <p className="text-gray-300">Shots content will be displayed here</p>
                    </div>
                );

            case 'Assets':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all hover:shadow-lg cursor-pointer">
                            <p className="flex items-center gap-3 text-gray-200">
                                <span className="text-2xl">🎥</span>
                                <span className="font-medium">Asset Example 1</span>
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all hover:shadow-lg cursor-pointer">
                            <p className="flex items-center gap-3 text-gray-200">
                                <span className="text-2xl">🌲</span>
                                <span className="font-medium">Asset Example 2</span>
                            </p>
                        </div>
                    </div>
                );

            case 'Notes':
                return (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl border border-gray-600/50 shadow-lg">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">📝</span>
                            <p className="text-sm text-gray-400 font-medium">บันทึกย่อ</p>
                        </div>
                        <div className="space-y-2 text-gray-300">
                            <p className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Camera should feel heavier</span>
                            </p>
                            <p className="flex items-start gap-2">
                                <span className="text-blue-400 mt-1">•</span>
                                <span>Add fog in background</span>
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // ดึงข้อมูล sequence จาก localStorage
    const navigate = useNavigate();

    useEffect(() => {
        const stored = localStorage.getItem("sequenceData");

        if (!stored) {
            console.warn("sequenceData not found");
            navigate("/Project_Sequence");
            return;
        }

        const seq = JSON.parse(stored);

        setShotData({
            id: seq.sequenceId,
            shotCode: "",
            sequence: seq.sequenceName,
            status: seq.status,
            tags: [],
            thumbnail: seq.thumbnail,
            description: seq.description || "",
            dueDate: seq.createdAt
        });
    }, []);

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

    const [editingField, setEditingField] = useState<null | 'sequence' | 'description'>(null);

    const updateSequence = (payload: any) => {
        return fetch(ENDPOINTS.UPDATE_SEQUENCE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: shotData.id,
                ...payload
            })
        })
            .then(() => {
                const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");

                const updated = {
                    ...stored,
                    sequenceName: payload.sequence_name ?? stored.sequenceName,
                    description: payload.description ?? stored.description,
                    status: payload.status ?? stored.status
                };

                localStorage.setItem("sequenceData", JSON.stringify(updated));
            })
            .catch(console.error);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800" 
            onClick={handleClickOutside}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsResizing(false)}
        >
            <div className="pt-14">
                <Navbar_Project activeTab="other" />
            </div>

            <div className="pt-12 flex-1">
                <div className="p-6 max-w-[1600px] mx-auto">
                    {/* Header Card - ปรับให้กระชับขึ้น */}
                    <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700/50">
                        {/* Breadcrumb */}
                        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                            <span className="hover:text-white cursor-pointer transition-colors">📁 Sequences</span>
                            <span className="text-gray-600">›</span>
                            <span className="font-bold text-white">🎬 {shotData.sequence}</span>
                        </div>

                        {/* Preview Modal */}
                        {showPreview && shotData.thumbnail && (
                            <div
                                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                                onClick={() => setShowPreview(false)}
                            >
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                                >
                                    <X className="w-6 h-6 text-white" />
                                </button>

                                <div className="max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                    <img
                                        src={ENDPOINTS.image_url + shotData.thumbnail}
                                        alt="Preview"
                                        className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Main Content */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Thumbnail */}
                            <div className="col-span-3">
                                <div className="relative w-full aspect-video rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 overflow-hidden shadow-lg border border-gray-700/50">
                                    {shotData.thumbnail ? (
                                        <img
                                            src={ENDPOINTS.image_url + shotData.thumbnail}
                                            alt="Sequence thumbnail"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                            <Image className="w-8 h-8 text-gray-500" />
                                            <p className="text-gray-500 text-xs">No preview</p>
                                        </div>
                                    )}

                                    {/* Hover Controls */}
                                    {shotData.thumbnail && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all bg-black/60">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowPreview(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 text-xs font-medium"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    View
                                                </button>
                                                <label className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                                                    <Upload className="w-3 h-3" />
                                                    Change
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            if (!e.target.files?.[0]) return;

                                                            const formData = new FormData();
                                                            formData.append("file", e.target.files[0]);
                                                            formData.append("sequenceId", String(shotData.id));
                                                            formData.append("oldImageUrl", shotData.thumbnail || "");

                                                            try {
                                                                const res = await fetch(ENDPOINTS.UPLOAD_SEQUENCE, {
                                                                    method: "POST",
                                                                    body: formData,
                                                                });

                                                                const data = await res.json();

                                                                if (res.ok) {
                                                                    setShotData(prev => ({ ...prev, thumbnail: data.file.fileUrl }));

                                                                    const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
                                                                    const updated = { ...stored, thumbnail: data.file.fileUrl };
                                                                    localStorage.setItem("sequenceData", JSON.stringify(updated));
                                                                } else {
                                                                    alert("Upload failed: " + data.error);
                                                                }
                                                            } catch (err) {
                                                                console.error("❌ Upload error:", err);
                                                                alert("Upload error");
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {!shotData.thumbnail && (
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0]) return;

                                                const formData = new FormData();
                                                formData.append("file", e.target.files[0]);
                                                formData.append("sequenceId", String(shotData.id));
                                                formData.append("oldImageUrl", shotData.thumbnail || "");

                                                try {
                                                    const res = await fetch(ENDPOINTS.UPLOAD_SEQUENCE, {
                                                        method: "POST",
                                                        body: formData,
                                                    });

                                                    const data = await res.json();

                                                    if (res.ok) {
                                                        setShotData(prev => ({ ...prev, thumbnail: data.file.fileUrl }));

                                                        const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
                                                        const updated = { ...stored, thumbnail: data.file.fileUrl };
                                                        localStorage.setItem("sequenceData", JSON.stringify(updated));
                                                    }
                                                } catch (err) {
                                                    console.error("❌ Upload error:", err);
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="col-span-9 grid grid-cols-3 gap-3">
                                {/* Sequence Name */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📁</span>
                                        Sequence
                                    </label>
                                    {editingField === 'sequence' ? (
                                        <input
                                            value={shotData.sequence}
                                            autoFocus
                                            onChange={(e) => setShotData(prev => ({ ...prev, sequence: e.target.value }))}
                                            onBlur={() => {
                                                updateSequence({ sequence_name: shotData.sequence });
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    updateSequence({ sequence_name: shotData.sequence });
                                                    setEditingField(null);
                                                }
                                                if (e.key === "Escape") setEditingField(null);
                                            }}
                                            className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1.5 text-white text-sm font-semibold"
                                        />
                                    ) : (
                                        <p
                                            className="text-white font-semibold cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors"
                                            onClick={() => setEditingField('sequence')}
                                        >
                                            {shotData.sequence}
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 relative">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>🎯</span>
                                        Status
                                    </label>
                                    <button
                                        onClick={handleStatusClick}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-all w-full justify-between text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            {statusConfig[shotData.status].icon === '-' ? (
                                                <span className="text-gray-400 font-bold">-</span>
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${statusConfig[shotData.status].color}`}></div>
                                            )}
                                            <span className="text-sm">{statusConfig[shotData.status].label}</span>
                                        </div>
                                        <span className="text-xs">▼</span>
                                    </button>

                                    {showStatusMenu && (
                                        <div className="absolute left-0 top-full mt-1 bg-gray-800 rounded-lg shadow-2xl z-50 w-full border border-gray-700">
                                            {(Object.entries(statusConfig) as [StatusType, { label: string; color: string; icon: string }][]).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(key);
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-left transition-colors"
                                                >
                                                    {config.icon === '-' ? (
                                                        <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                    ) : (
                                                        <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                                                    )}
                                                    <span className="text-xs text-gray-200">{config.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Due Date */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📅</span>
                                        Due Date
                                    </label>
                                    <p className="text-white font-semibold px-2 py-1.5 text-sm">{formatDate(shotData.dueDate)}</p>
                                </div>

                                {/* Description - ใช้ 3 คอลัมน์ */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 col-span-3">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📝</span>
                                        Description
                                    </label>
                                    {editingField === 'description' ? (
                                        <textarea
                                            value={shotData.description}
                                            autoFocus
                                            rows={2}
                                            onChange={(e) => setShotData(prev => ({ ...prev, description: e.target.value }))}
                                            onBlur={() => {
                                                updateSequence({ description: shotData.description });
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    updateSequence({ description: shotData.description });
                                                    setEditingField(null);
                                                }
                                                if (e.key === "Escape") setEditingField(null);
                                            }}
                                            className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1.5 text-white text-xs resize-none"
                                        />
                                    ) : (
                                        <p
                                            className="text-white text-xs cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors line-clamp-2"
                                            onClick={() => setEditingField('description')}
                                        >
                                            {shotData.description || <span className="text-gray-500 italic">Click to add...</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <nav className="flex items-center gap-2 border-t border-gray-700/50 pt-4 mt-4 overflow-x-auto pb-1">
                            {['Sequence Info', 'Tasks', 'Shots', 'Assets', 'Notes'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                                        activeTab === tab
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content Section */}
                    <div className="mt-4 p-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg text-white font-bold flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                {activeTab}
                            </h3>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {activeTab === 'Tasks' && (
                                    <button
                                        onClick={() => setShowCreateSequence_Task(true)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
                                    >
                                        <span>+</span>
                                        Add Task
                                    </button>
                                )}

                                {activeTab === 'Notes' && (
                                    <button
                                        onClick={() => setShowCreateSequence_Note(true)}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5"
                                    >
                                        <span>+</span>
                                        Add Note
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="max-h-[400px] overflow-y-auto">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateSequence_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateSequence_Task(false)} />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button onClick={() => setShowCreateSequence_Task(false)} className="text-gray-400 hover:text-white text-xl">⚙️</button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Task Name:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Link:</label>
                                <input type="text" value={shotData.sequence} readOnly className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Pipeline Step:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Start Date:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Due Date:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Assigned To:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Reviewer:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Project:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <div></div>
                                <button className="text-sm text-gray-400 hover:text-gray-200 text-left flex items-center gap-1">
                                    More fields <span>▾</span>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button onClick={() => setShowCreateSequence_Task(false)} className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center">
                                Cancel
                            </button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center">
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Note Modal */}
            {showCreateSequence_Note && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateSequence_Note(false)} />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Note <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button onClick={() => setShowCreateSequence_Note(false)} className="text-gray-400 hover:text-white text-xl">⚙️</button>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button onClick={() => setShowCreateSequence_Note(false)} className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center">Cancel</button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center">Create Note</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Right Panel - Floating Card */}
            {selectedTask && (
                <div
                    className={`
                        fixed right-0 top-26 bottom-0
                        bg-[#2a2d35] shadow-2xl flex z-40
                        transform transition-transform duration-300 ease-out
                        ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
                    `}
                    style={{ width: `${rightPanelWidth}px` }}
                >
                    {/* Resize Handle */}
                    <div
                        className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
                        onMouseDown={handleMouseDown}
                    />

                    {/* Panel Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="bg-[#1a1d24] border-b border-gray-700">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <img src={ENDPOINTS.image_url + selectedTask.file_url} alt="" className="w-12 h-12 object-cover rounded" />
                                    <div>
                                        <div className="text-sm text-gray-400">
                                            Sequence › {selectedTask.task_name.split('/')[0].trim()}
                                        </div>
                                        <h2 className="text-xl text-white font-normal mt-1">
                                            {selectedTask?.task_name.split('/').pop()?.trim()}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPanelOpen(false);
                                        setTimeout(() => setSelectedTask(null), 300);
                                    }}
                                    className="text-gray-400 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Status bar */}
                            <div className="flex items-center gap-4 px-4 py-3">
                                <span className={`px-3 py-1 rounded text-xs font-medium ${
                                    selectedTask.status === 'wtg'
                                        ? 'text-gray-400 bg-gray-500/20'
                                        : selectedTask.status === 'ip'
                                            ? 'text-blue-400 bg-blue-500/20'
                                            : 'text-green-400 bg-green-500/20'
                                }`}>
                                    {selectedTask.status}
                                </span>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>📅</span>
                                    <span>ครบกำหนด {formatDateThai(selectedTask.due_date)}</span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-t border-gray-700">
                                <button
                                    onClick={() => setRightPanelTab('notes')}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                                        rightPanelTab === 'notes'
                                            ? 'text-white border-b-2 border-blue-500'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>📝</span>
                                    <span>NOTES</span>
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('versions')}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                                        rightPanelTab === 'versions'
                                            ? 'text-white border-b-2 border-blue-500'
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>💎</span>
                                    <span>VERSIONS</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto p-4">
                            {rightPanelTab === 'notes' && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Write a note..."
                                        className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500 mb-4"
                                    />
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Type to filter"
                                            className="flex-1 px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500"
                                        />
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any label</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any time</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any note</option>
                                        </select>
                                    </div>
                                    <div className="text-center text-gray-500 py-12">
                                        No notes
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === 'versions' && (
                                <div>
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any type</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any asset type</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any status</option>
                                        </select>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm">
                                            <input type="checkbox" id="latestVersion" />
                                            <label htmlFor="latestVersion">Latest version</label>
                                        </div>
                                        <div className="flex-1"></div>
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">⊞</button>
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">☰</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2, 3, 4].map((v) => (
                                            <div key={v} className="bg-[#1a1d24] rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors">
                                                <div className="relative aspect-video bg-gray-800">
                                                    <img
                                                        src={ENDPOINTS.image_url + selectedTask.file_url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                                                        v{v}
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <div className="text-sm text-white mb-1">Version v{v}</div>
                                                    <div className="text-xs text-gray-400 mb-2">{selectedTask.task_name.split('/')[0].trim()}</div>
                                                    <div className="text-xs text-gray-500 mb-2">Sequence task</div>
                                                    <div className="text-xs text-gray-400">Task</div>
                                                    <div className={`mt-2 h-1 rounded ${v === 3 ? 'bg-emerald-500' : v === 2 ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                                        <div className="text-4xl text-gray-600 mb-2">☁️</div>
                                        <div className="text-sm text-gray-400">Drag and drop your files here, or browse</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-gray-200">{value}</p>
    </div>
);