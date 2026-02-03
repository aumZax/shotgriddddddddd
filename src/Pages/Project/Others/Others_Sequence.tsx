import { useEffect, useState } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import { useNavigate } from 'react-router-dom';
import ENDPOINTS from "../../../config";
import { Image } from 'lucide-react';
import TaskTab from "../../../components/TaskTab";
import axios from 'axios';


// Status configuration
const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-green-500', icon: 'dot' }
};

type StatusType = keyof typeof statusConfig;

// Activity type
interface Activity {
    id: number;
    user: string;
    action: string;
    timestamp: Date;
}


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
    assignees: TaskAssignee[]; // ⭐ สำคัญ
};

type TaskAssignee = {
    id: number;
    username: string;
};






// Initial activities
const initialActivities: Activity[] = [
    {
        id: 1,
        user: "John Doe",
        action: 'updated status to "In Progress"',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
        id: 2,
        user: "Jane Smith",
        action: "added a new version",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
    },
    {
        id: 3,
        user: "Mike Johnson",
        action: "commented on this shot",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
];

// Helper function to format time ago
const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
};

export default function Others_Sequence() {
    const [activeTab, setActiveTab] = useState('Activity');
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



    const [showStatusMenu, setShowStatusMenu] = useState(false);

    //Buttonnnnnnnnnnnnnnnnnnnnnnnn
    const [showCreateSequence_Task, setShowCreateSequence_Task] = useState(false);
    const [showCreateSequence_Note, setShowCreateSequence_Note] = useState(false);

    // Activity and Comment states
    const [activities, setActivities] = useState<Activity[]>(initialActivities);
    const [commentText, setCommentText] = useState('');
    const [currentUser] = useState('Current User');



    // ++++++++++++++++++++++++++++++++++++++ storage +++++++++++++++++++++++++++++++

    const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
    const sequenceId = stored.sequenceId;
    console.log(sequenceId)


    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;
    // const projectName = projectData?.projectName;


    // ++++++++++++++++++++++++++++++++++++++++ right
    const [rightPanelTab, setRightPanelTab] = useState('notes'); // ← เพิ่มบรรทัดนี้

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

    const handleStatusChange = (newStatus: StatusType) => {
        setShotData(prev => ({ ...prev, status: newStatus }));
        setShowStatusMenu(false);

        updateSequence({ status: newStatus }); // 👈 เพิ่ม

        const newActivity: Activity = {
            id: Date.now(),
            user: currentUser,
            action: `updated status "${statusConfig[newStatus].label}"`,
            timestamp: new Date()
        };
        setActivities([newActivity, ...activities]);
    };


    // Close dropdown when clicking outside
    const handleClickOutside = () => {
        if (showStatusMenu) setShowStatusMenu(false);
    };

    // Comment handlers
    const handleSubmitComment = async () => {
        if (!commentText.trim()) return;

        const newComment: Activity = {
            id: Date.now(),
            user: currentUser,
            action: `commented: "${commentText}"`,
            timestamp: new Date()
        };

        setActivities([newComment, ...activities]);
        setCommentText('');

        // API call จะเพิ่มตรงนี้
        // await fetch('/api/comments', {
        //     method: 'POST',
        //     body: JSON.stringify({
        //         sequenceId: shotData.id,
        //         userId: currentUser,
        //         text: commentText
        //     })
        // });
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };



    // +++++++++++++++++++++++++++++ sequence task +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [tasks, setTasks] = useState<Task[]>([]);


    useEffect(() => {
        console.log("🔍 sequenceId:", sequenceId);
        console.log("🔍 projectId:", projectId);
        console.log("🔍 stored data:", stored);

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
    }, [sequenceId, projectId]); // เพิ่ม dependency

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Date  ++++++++++++++++++++++++++++++++++++++++++
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
            case 'Activity':
                return (
                    <div className="space-y-4">
                        {/* Comment Input Section */}
                        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                    {currentUser.charAt(0)}
                                </div>

                                <div className="flex-1">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Add a comment... (Press Enter to submit)"
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                                        rows={3}
                                    />

                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-gray-500">
                                            Press Enter to submit, Shift+Enter for new line
                                        </p>
                                        <button
                                            onClick={handleSubmitComment}
                                            disabled={!commentText.trim()}
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
                                        >
                                            Comment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activities List */}
                        <div className="space-y-3">
                            {activities.map((activity) => {
                                const isCurrentUser = activity.user === currentUser;
                                const borderColor = isCurrentUser ? 'border-orange-500' : 'border-gray-600';
                                const userColor = isCurrentUser ? 'text-orange-400' : 'text-gray-400';

                                return (
                                    <div
                                        key={activity.id}
                                        className={`p-4 bg-gray-700/50 rounded-lg border-l-4 ${borderColor} transition-all hover:bg-gray-700/70`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                                                {activity.user.charAt(0)}
                                            </div>

                                            <div className="flex-1">
                                                <p className="text-gray-300 text-sm">
                                                    <span className={`font-semibold ${userColor}`}>
                                                        {activity.user}
                                                    </span>{' '}
                                                    {activity.action}
                                                </p>
                                                <p className="text-gray-500 text-xs mt-1">
                                                    {formatTimeAgo(activity.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'Sequence Info':
                return (
                    <div className="space-y-4 text-gray-300">
                        <InfoRow label="Sequence" value={shotData.sequence} />
                        <InfoRow label="Status" value={statusConfig[shotData.status].label} />
                        <InfoRow label="Due Date" value={formatDate(shotData.dueDate)} />
                        <InfoRow label="Description" value={shotData.description} />
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
                    <div className="space-y-2 text-gray-300">
                        <p>Shots</p>
                    </div>
                );

            case 'Assets':
                return (
                    <div className="space-y-2 text-gray-300">
                        <p>Assets</p>
                    </div>
                );


            case 'Notes':
                return (
                    <div className="bg-gray-700/30 p-4 rounded-lg text-gray-300">
                        <p className="text-sm text-gray-400 mb-2">Notes</p>
                        <p>- Camera should feel heavier</p>
                        <p>- Add fog in background</p>
                    </div>
                );


            default:
                return null;
        }
    };



    // ดึงข้อมูล sequence จาก localStorage ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
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
            shotCode: "", // ยังไม่มี shots
            sequence: seq.sequenceName,
            status: seq.status,
            tags: [],
            thumbnail: seq.thumbnail,
            description: seq.description || "",
            dueDate: seq.createdAt // 👈 ใช้จริง
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
        fetch(ENDPOINTS.UPDATE_SEQUENCE, {
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
        <div className="min-h-screen flex flex-col bg-gray-900" onClick={handleClickOutside}
            onMouseMove={handleMouseMove}  // ← เพิ่มตรงนี้
            onMouseUp={() => setIsResizing(false)}  // ← เพิ่มตรงนี้ด้วย
        >
            <div className="pt-14">
                <Navbar_Project activeTab="other" />
            </div>

            <div className="pt-12 flex-1">


                <div className="p-6">
                    <div className="w-full bg-gray-800 p-6 rounded-lg shadow-lg">


                        <div className="flex gap-6 w-full items-start justify-between mb-6">
                            <div className="relative">
                                {shotData.thumbnail ? (
                                    <img
                                        src={ENDPOINTS.image_url+shotData.thumbnail}
                                        alt="Shot thumbnail"
                                        className="w-80 h-44 object-cover rounded-lg shadow-md border-2 border-gray-700"
                                    />
                                ) : (
                                    <div className="w-80 h-44 rounded-lg shadow-md border-2 border-dashed border-gray-600 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-700/30 flex items-center justify-center group-hover:bg-gray-600/40 transition-all duration-300 animate-pulse">
                                            <Image className="w-8 h-8 text-gray-500 group-hover:text-gray-400 transition-colors duration-300" />
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium group-hover:text-gray-400 transition-colors duration-300">Click to add thumbnail</p>
                                    </div>
                                )}

                                {/* Upload Button */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute bottom-2 right-2 opacity-0 w-full h-full cursor-pointer"
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
                                            console.log("📥 Response:", data);

                                            if (res.ok) {
                                                // ✅ อัปเดต state
                                                setShotData(prev => ({ ...prev, thumbnail: data.file.fileUrl }));

                                                // ✅ อัปเดต localStorage
                                                const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
                                                const updated = {
                                                    ...stored,
                                                    thumbnail: data.file.fileUrl,  // ← เพิ่มบรรทัดนี้
                                                };
                                                localStorage.setItem("sequenceData", JSON.stringify(updated));

                                                console.log("✅ Upload success! New URL:", data.file.fileUrl);
                                            } else {
                                                console.error("❌ Upload failed:", data.error);
                                                alert("Upload failed: " + data.error);
                                            }
                                        } catch (err) {
                                            console.error("❌ Upload error:", err);
                                            // alert("Upload error: " + err.message);
                                        }
                                    }}
                                />
                            </div>


                            <div className="flex-1 space-y-4">
                                <div className="flex-1 space-y-3">

                                    <div className="flex items-center gap-8">


                                        <div className="min-w-[200px]">
                                            <span className="text-gray-400  font-medium block mb-1">Sequence</span>
                                            {editingField === 'sequence' ? (
                                                <input
                                                    value={shotData.sequence}
                                                    autoFocus
                                                    onChange={(e) =>
                                                        setShotData(prev => ({ ...prev, sequence: e.target.value }))
                                                    }
                                                    onBlur={() => {
                                                        updateSequence({ sequence_name: shotData.sequence });
                                                        setEditingField(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            updateSequence({ sequence_name: shotData.sequence });
                                                            setEditingField(null);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditingField(null);
                                                        }
                                                    }}
                                                    className="bg-gray-700 border border-blue-500 rounded px-2 text-sm text-white"
                                                />
                                            ) : (
                                                <p
                                                    className="text-gray-100 font-medium flex items-center gap-2 cursor-text hover:bg-gray-700 px-2 rounded"
                                                    onClick={() => setEditingField('sequence')}
                                                >
                                                    📁 {shotData.sequence}
                                                </p>
                                            )}

                                        </div>

                                        <div>
                                            <span className="text-gray-400 block mb-1 font-medium">Due Date</span>
                                            <p className="text-gray-100">
                                                {formatDate(shotData.dueDate)}
                                            </p>

                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 pt-5">
                                        <div className="min-w-[200px] relative">
                                            <span className="text-gray-400  font-medium block mb-1">Status</span>
                                            <button
                                                onClick={handleStatusClick}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-full font-medium transition-colors"
                                            >
                                                {statusConfig[shotData.status].icon === '-' ? (
                                                    <span className="text-gray-400 font-bold">-</span>
                                                ) : (
                                                    <div className={`w-2 h-2 rounded-full ${statusConfig[shotData.status].color}`}></div>
                                                )}
                                                <span>{statusConfig[shotData.status].label}</span>
                                                <span className="text-xs ml-1">▼</span>
                                            </button>

                                            {showStatusMenu && (
                                                <div className="absolute left-0 top-full mt-1 bg-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] border border-gray-600">
                                                    {(Object.entries(statusConfig) as [StatusType, { label: string; color: string; icon: string }][]).map(([key, config]) => (
                                                        <button
                                                            key={key}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStatusChange(key);
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg text-left transition-colors"
                                                        >
                                                            {config.icon === '-' ? (
                                                                <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                            ) : (
                                                                <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                                                            )}
                                                            <span className="text-sm text-gray-200">{config.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <span className="text-gray-400 block mb-1 font-medium">Description</span>
                                            {editingField === 'description' ? (
                                                <textarea
                                                    value={shotData.description}
                                                    autoFocus
                                                    rows={3}
                                                    onChange={(e) =>
                                                        setShotData(prev => ({ ...prev, description: e.target.value }))
                                                    }
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
                                                        if (e.key === "Escape") {
                                                            setEditingField(null);
                                                        }
                                                    }}
                                                    className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-white resize-none"
                                                />
                                            ) : (
                                                <p
                                                    className="text-gray-100 cursor-text hover:bg-gray-700 px-2 py-1 rounded"
                                                    onClick={() => setEditingField('description')}
                                                >
                                                    {shotData.description || "—"}
                                                </p>
                                            )}

                                        </div>

                                    </div>
                                </div>
                            </div>


                        </div>


                        <nav className="flex items-center gap-6 border-t border-gray-700 pt-4">
                            {['Activity', 'Sequence Info', 'Tasks', 'Shots', 'Assets', 'Notes'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-2 rounded-xl bg-gray-700 transition-all ${activeTab === tab
                                        ? 'text-white border-b-2 border-blue-500 font-medium bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600 hover:shadow-blue-500/50 hover:scale-105'
                                        : 'text-white-400 hover:text-white bg-gradient-to-r hover:from-gray-700 hover:to-gray-700 hover:scale-105'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
                        <h3 className="text-xl text-gray-200 mb-4 font-semibold flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded"></span>
                            {activeTab}


                            {/* Action button (per tab) */}
                            {activeTab === 'Tasks' && (
                                <button
                                    onClick={() => setShowCreateSequence_Task(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                                >
                                    Add Task
                                    <span className="text-xs">▼</span>
                                </button>
                            )}

                            {activeTab === 'Notes' && (
                                <button
                                    onClick={() => setShowCreateSequence_Note(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                                >
                                    Add Note
                                    <span className="text-xs">▼</span>
                                </button>
                            )}




                        </h3>

                        <div className="mt-4">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>





            {showCreateSequence_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateSequence_Task(false)}
                    />

                    {/* Modal */}
                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button
                                onClick={() => setShowCreateSequence_Task(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ⚙️
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Task Name:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Link:
                                </label>
                                <input
                                    type="text"
                                    value={shotData.shotCode}
                                    onChange={(e) =>
                                        setShotData(prev => ({
                                            ...prev,
                                            shotCode: e.target.value
                                        }))
                                    }
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />

                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Pipeline Step:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Start Date:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Due Date:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Assigned To:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Reviewer:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Project:
                                </label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <div></div>
                                <button className="text-sm text-gray-400 hover:text-gray-200 text-left flex items-center gap-1">
                                    More fields <span>▾</span>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateSequence_Task(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center"
                            >
                                Cancel
                            </button>

                            <button
                                className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {showCreateSequence_Note && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateSequence_Note(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Note <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button
                                onClick={() => setShowCreateSequence_Note(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ⚙️
                            </button>
                        </div>



                        {/* Footer */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateSequence_Note(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center"
                            >
                                Cancel
                            </button>

                            <button
                                className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center"
                            >
                                Create Task
                            </button>
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
                                    <img src={ENDPOINTS.image_url+selectedTask.file_url} alt="" className="w-12 h-12 object-cover rounded" />
                                    <div>
                                        <div className="text-sm text-gray-400">
                                            Napo (Animation demo) › C005 › {selectedTask.task_name.split('/')[0].trim()}
                                        </div>
                                        <h2 className="text-xl text-white font-normal mt-1">
                                            {selectedTask?.task_name.split('/').pop()?.trim()}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPanelOpen(false);
                                        setTimeout(() => setSelectedTask(null), 300); // ตรงกับ duration
                                    }}

                                    className="text-gray-400 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Status bar */}
                            <div className="flex items-center gap-4 px-4 py-3">
                                <span className={`px-3 py-1 rounded text-xs font-medium ${selectedTask.status === 'wtg'
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
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${rightPanelTab === 'notes'
                                        ? 'text-white border-b-2 border-blue-500'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <span>📝</span>
                                    <span>NOTES</span>
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('versions')}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${rightPanelTab === 'versions'
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
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">
                                            ⊞
                                        </button>
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">
                                            ☰
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2, 3, 4].map((v) => (
                                            <div key={v} className="bg-[#1a1d24] rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors">
                                                <div className="relative aspect-video bg-gray-800">
                                                    <img
                                                        src={ENDPOINTS.image_url+selectedTask.file_url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                                                        v{v}
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <div className="text-sm text-white mb-1">Animation v{v}</div>
                                                    <div className="text-xs text-gray-400 mb-2">{selectedTask.task_name.split('/')[0].trim()}</div>
                                                    <div className="text-xs text-gray-500 mb-2">Napo (Animation demo) / C...</div>
                                                    <div className="text-xs text-gray-400">Animation</div>
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

