
import { useEffect, useState } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import { Eye, Image, Upload,  } from 'lucide-react';
import ENDPOINTS from '../../../config';
import axios from 'axios';
import TaskTab from "../../../components/TaskTab";


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

interface ShotData {
    id: number;
    shotCode: string;
    sequence: string;
    status: StatusType;
    tags: string[];
    thumbnail: string;
    description: string;
    dueDate: string;

}
const shotFieldMap: Record<keyof ShotData, string | null> = {
    id: null,
    shotCode: "shot_name",
    sequence: "sequence_name",
    status: "status",
    tags: null,
    thumbnail: "thumbnail",
    description: "description",
    dueDate: "due_date"
};


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


// Get data from localStorage
const getInitialShotData = () => {
    const stored = localStorage.getItem("selectedShot");
    if (stored) {
        const data = JSON.parse(stored);
        return {
            id: data.id || 1,
            shotCode: data.shot_name || "Unknown Shot",
            sequence: data.sequence || "Unknown Sequence",
            status: (data.status || "wtg") as StatusType,
            tags: data.tags || [],
            thumbnail: data.thumbnail || "",
            description: data.description || "No description",
            dueDate: data.dueDate || new Date().toISOString().split('T')[0]
        };
    }
    // Fallback if no data in localStorage
    return {
        id: 1,
        shotCode: "No Shot Selected",
        sequence: "N/A",
        status: "wtg" as StatusType,
        tags: [],
        thumbnail: "",
        description: "Please select a shot first",
        dueDate: new Date().toISOString().split('T')[0]
    };
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




export default function Others_Shot() {
    const [activeTab, setActiveTab] = useState('Activity');
    const [shotData, setShotData] = useState<ShotData>(getInitialShotData());
    const [editingField, setEditingField] = useState<string | null>(null);


    const [showStatusMenu, setShowStatusMenu] = useState(false);

    const [showPreview, setShowPreview] = useState(false);


    const [showCreateShot_Task, setShowCreateShot_Task] = useState(false);
    const [showCreateShot_Note, setShowCreateShot_Note] = useState(false);
    const [showCreateShot_Versions, setShowCreateShot_Versions] = useState(false);
    const [showCreateShot_Assets, setShowCreateShot_Assets] = useState(false);

    // Activity and Comment states
    const [activities, setActivities] = useState<Activity[]>(initialActivities);
    const [commentText, setCommentText] = useState('');
    const [currentUser] = useState('Current User');


    // ++++++++++++++++++++++++++++++++++++++ storage +++++++++++++++++++++++++++++++

    const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
    const shotId = stored.id;

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

    const handleStatusChange = async (newStatus: StatusType) => {
        try {
            // 1️⃣ ยิง API อัปเดต DB
            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shotData.id,
                field: "status",
                value: newStatus
            });

            // 2️⃣ update local state
            const updated = { ...shotData, status: newStatus };
            setShotData(updated);
            setShowStatusMenu(false);

            // 3️⃣ sync localStorage
            localStorage.setItem(
                "selectedShot",
                JSON.stringify({
                    id: updated.id,
                    shot_name: updated.shotCode,
                    sequence: updated.sequence,
                    description: updated.description,
                    status: newStatus,
                    tags: updated.tags,
                    thumbnail: updated.thumbnail,
                    dueDate: updated.dueDate
                })
            );

            // 4️⃣ add activity
            const newActivity: Activity = {
                // eslint-disable-next-line react-hooks/purity
                id: Date.now(),
                user: currentUser,
                action: `updated status "${statusConfig[newStatus].label}"`,
                timestamp: new Date()
            };

            setActivities(prev => [newActivity, ...prev]);

        } catch (error) {
            console.error("❌ update status failed:", error);
            alert("Failed to update status");
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateShotField = async (
        field: keyof ShotData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
    ) => {
        const dbField = shotFieldMap[field];

        if (!dbField) {
            console.warn(`⚠️ Field "${field}" cannot be updated`);
            return;
        }

        try {
            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shotData.id,
                field: dbField, // ✅ ส่งชื่อ column จริง
                value
            });

            // update state
            setShotData(prev => ({ ...prev, [field]: value }));

            // sync localStorage
            // const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
            localStorage.setItem(
                "selectedShot",
                JSON.stringify({
                    ...stored,
                    [dbField]: value
                })
            );
        } catch (err) {
            console.error("❌ update shot failed:", err);
            alert("Update failed");
        }
    };

    const updateDescription = async (payload: { description: string }) => {
        try {
            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shotData.id,
                field: "description",
                value: payload.description
            });

            const updated = { ...shotData, description: payload.description };
            setShotData(updated);

            // sync localStorage
            // const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
            localStorage.setItem(
                "selectedShot",
                JSON.stringify({
                    ...stored,
                    description: payload.description
                })
            );
        } catch (err) {
            console.error("❌ update description failed:", err);
            alert("Failed to update description");
        }
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
    };




    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    // +++++++++++++++++++++++++++++ shot task 
    const [tasks, setTasks] = useState<Task[]>([]);


    useEffect(() => {
        console.log("🔍 shotId:", shotId);
        console.log("🔍 projectId:", projectId);
        console.log("🔍 stored data:", stored);

        if (!shotId || !projectId) {
            console.warn("⚠️ Missing shotId or projectId");
            return;
        }

        axios.post<Task[]>(ENDPOINTS.SHOT_TASK, {
            project_id: projectId,
            entity_type: "shot",
            entity_id: shotId
        })
            .then(res => {
                console.log("✅ Tasks received:", res.data);
                setTasks(res.data);
            })
            .catch(err => {
                console.error("❌ โหลด task ไม่สำเร็จ", err);
            });
    }, [shotId, projectId]); // เพิ่ม dependency

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

            case 'Shot Info':
                return (
                    <div className="space-y-4 text-gray-300">
                        <InfoRow label="Shot Code" value={shotData.shotCode} />
                        <InfoRow label="Sequence" value={shotData.sequence} />
                        <InfoRow label="Status" value={statusConfig[shotData.status].label} />
                        <InfoRow label="Due Date" value={shotData.dueDate} />
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

            case 'Notes':
                return (
                    <div className="bg-gray-700/30 p-4 rounded-lg text-gray-300">
                        <p className="text-sm text-gray-400 mb-2">Notes</p>
                        <p>- Camera should feel heavier</p>
                        <p>- Add fog in background</p>
                    </div>
                );

            case 'Versions':
                return (
                    <div className="grid grid-cols-3 gap-4">
                        <VersionCard version="v001" />
                        <VersionCard version="v002" />
                    </div>
                );

            case 'Assets':
                return (
                    <div className="space-y-2 text-gray-300">
                        <p>🎥 CameraRig_v3.fbx</p>
                        <p>🌲 Forest_Set.fbx</p>
                    </div>
                );

            case 'Publishes':
                return (
                    <div className="text-gray-300">
                        <p>Last publish: v002</p>
                        <p>Published by John Doe</p>
                    </div>
                );

            case 'Files':
                return (
                    <div className="space-y-2 text-gray-300">
                        <p>📄 storyboard.pdf</p>
                        <p>📄 reference.jpg</p>
                    </div>
                );

            case 'History':
                return (
                    <div className="space-y-2 text-gray-400 text-sm">
                        <p>Shot created by John</p>
                        <p>Status changed to In Progress</p>
                        <p>Version v002 uploaded</p>
                    </div>
                );

            default:
                return null;
        }
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
                        <div className='p-2'>
                            <span className='p-2 text-xl'>{shotData.sequence} </span>
                            <span className='p-2 text-xl'>{'>'}</span>
                            <span className='p-2 text-xl'>{shotData.shotCode}</span>
                        </div>

                        <div className="flex gap-6 w-full items-start justify-between mb-6">
                           <div className="relative w-80 h-44 rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
    {shotData.thumbnail ? (
        // ตรวจสอบว่าเป็นวิดีโอหรือรูปภาพ
        shotData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
            // แสดงวิดีโอ
            <div className="w-full h-full rounded-lg overflow-hidden">
                <video
                    src={ENDPOINTS.image_url + shotData.thumbnail}
                    className="w-full h-full object-cover"
                    controls
                    muted
                    playsInline
                >
                    Your browser does not support the video tag.
                </video>
            </div>
        ) : (
            // แสดงรูปภาพ
            <img
                src={ENDPOINTS.image_url + shotData.thumbnail}
                alt="Shot thumbnail"
                className="w-full h-full object-cover rounded-lg"
            />
        )
    ) : (
        <div className="w-full h-full rounded-lg shadow-md border-2 border-dashed border-gray-600 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                <Image className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No Thumbnail</p>
        </div>
    )}

    {/* ปุ่มเมนู - แสดงเมื่อมี thumbnail */}
    {showPreview && shotData.thumbnail && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/50 rounded-lg">
            <div className="flex gap-3">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPreview(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Eye className="w-4 h-4" />
                    ดูไฟล์
                </button>
                <label className="px-4 py-2 bg-gradient-to-r from-green-800 to-green-800 hover:from-green-500 hover:to-green-500 text-white rounded-lg flex items-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    เปลี่ยนไฟล์
                    <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={async (e) => {
                            if (!e.target.files?.[0]) return;

                            const file = e.target.files[0];
                            const formData = new FormData();

                            formData.append("shotId", shotData.id.toString());
                            formData.append("file", file);
                            formData.append("fileName", file.name);
                            formData.append("oldImageUrl", shotData.thumbnail || "");
                            formData.append("type", file.type.split('/')[0]);

                            try {
                                const res = await fetch(ENDPOINTS.UPLOAD_SHOT, {
                                    method: "POST",
                                    body: formData,
                                });

                                const data = await res.json();
                                console.log("📥 Upload Response:", data);

                                if (res.ok) {
                                    const newFileUrl = data.file?.fileUrl || data.fileUrl;

                                    setShotData(prev => ({
                                        ...prev,
                                        thumbnail: newFileUrl
                                    }));

                                    const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
                                    const updated = {
                                        ...stored,
                                        thumbnail: newFileUrl,
                                    };
                                    localStorage.setItem("selectedShot", JSON.stringify(updated));

                                    console.log("✅ Upload success! New URL:", newFileUrl);

                                } else {
                                    console.error("❌ Upload failed:", data.error);
                                    alert("Upload failed: " + (data.error || "Unknown error"));
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

    {/* Upload Input - แสดงเมื่อไม่มี thumbnail */}
    {!shotData.thumbnail && (
        <input
            type="file"
            accept="image/*,video/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={async (e) => {
                if (!e.target.files?.[0]) return;

                const file = e.target.files[0];
                const formData = new FormData();
                formData.append("shotId", shotData.id.toString());
                formData.append("file", file);
                formData.append("oldImageUrl", shotData.thumbnail || "");

                try {
                    const res = await fetch(ENDPOINTS.UPLOAD_SHOT, {
                        method: "POST",
                        body: formData,
                    });

                    const data = await res.json();
                    console.log("📥 Upload Response:", data);

                    if (res.ok) {
                        const newFileUrl = data.file?.fileUrl || data.fileUrl;

                        setShotData(prev => ({
                            ...prev,
                            thumbnail: newFileUrl
                        }));

                        const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
                        const updated = {
                            ...stored,
                            thumbnail: newFileUrl,
                        };
                        localStorage.setItem("selectedShot", JSON.stringify(updated));

                        console.log("✅ Upload success! New URL:", newFileUrl);

                    } else {
                        console.error("❌ Upload failed:", data.error);
                        alert("Upload failed: " + (data.error || "Unknown error"));
                    }
                } catch (err) {
                    console.error("❌ Upload error:", err);
                    alert("Upload error");
                }
            }}
        />
    )}
</div>

                            <div className="flex-1 space-y-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-8">
                                        <div className="min-w-[200px]">
                                            <span className="text-gray-400  font-medium block mb-1">Shot Code</span>
                                            {editingField === 'shotCode' ? (
                                                <input
                                                    value={shotData.shotCode}
                                                    autoFocus
                                                    onChange={(e) =>
                                                        setShotData(prev => ({ ...prev, shotCode: e.target.value }))
                                                    }
                                                    onBlur={() => {
                                                        updateShotField("shotCode", shotData.shotCode);
                                                        setEditingField(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            updateShotField("shotCode", shotData.shotCode);
                                                            setEditingField(null);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditingField(null);
                                                        }
                                                    }}
                                                    className="bg-gray-700 border border-blue-500 rounded px-2 py-1 text-lg text-white w-full"
                                                />
                                            ) : (
                                                <p
                                                    className="text-gray-100 font-semibold text-lg cursor-text hover:bg-gray-700 px-2 py-1 rounded"
                                                    onClick={() => setEditingField('shotCode')}
                                                >
                                                    🎬 {shotData.shotCode}
                                                </p>
                                            )}

                                        </div>

                                        <div className="min-w-[200px]">
                                            <span className="text-gray-400  font-medium block mb-1">Sequence</span>
                                            <p className="text-gray-100 font-medium flex items-center gap-2">
                                                📁 {shotData.sequence}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
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
                                            <span className="text-gray-400 block mb-1 font-medium">Due Date</span>
                                            <p className="text-gray-100">{shotData.dueDate}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-8">
                                        <div className="min-w-[200px]">
                                            <span className="text-gray-400  font-medium block mb-1">Tags</span>
                                            {shotData.tags.length > 0 ? (
                                                <div className="flex gap-2 flex-wrap">
                                                    {shotData.tags.map((tag, index) => (
                                                        <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-gray-500 text-sm italic">No tags</p>
                                            )}
                                        </div>

                                        <div>

                                            <div className="flex-1">
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
                                                            updateDescription({ description: shotData.description });
                                                            setEditingField(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" && !e.shiftKey) {
                                                                e.preventDefault();
                                                                updateDescription({ description: shotData.description });
                                                                setEditingField(null);
                                                            }
                                                            if (e.key === "Escape") {
                                                                setEditingField(null);
                                                            }
                                                        }}
                                                        className="w-full bg-gray-700 border border-blue-500 rounded px-3 py-2 text-sm text-white resize-none"
                                                    />
                                                ) : (
                                                    <p
                                                        className="text-gray-100 cursor-text hover:bg-gray-700 px-2 py-1 rounded"
                                                        onClick={() => setEditingField('description')}
                                                    >
                                                        {shotData.description || (
                                                            <span className="text-gray-500 italic">
                                                                Click to add description
                                                            </span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="flex items-center gap-6 border-t border-gray-700 pt-4">
                            {['Activity', 'Shot Info', 'Tasks', 'Notes', 'Versions', 'Assets', 'Publishes', 'Files', 'History'].map((tab) => (
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
                                    onClick={() => setShowCreateShot_Task(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                                >
                                    Add Task
                                    <span className="text-xs">▼</span>
                                </button>
                            )}

                            {activeTab === 'Notes' && (
                                <button
                                    onClick={() => setShowCreateShot_Note(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                                >
                                    Add Note
                                    <span className="text-xs">▼</span>
                                </button>
                            )}

                            {activeTab === 'Versions' && (
                                <button
                                    onClick={() => setShowCreateShot_Versions(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                                >
                                    Add Versions
                                    <span className="text-xs">▼</span>
                                </button>
                            )}

                            {activeTab === 'Assets' && (
                                <button
                                    onClick={() => setShowCreateShot_Assets(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                                >
                                    Add Assets
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

            {showCreateShot_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateShot_Task(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button
                                onClick={() => setShowCreateShot_Task(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ⚙️
                            </button>
                        </div>

                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Task Name:</label>
                                <input type="text" className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Link:</label>
                                <input
                                    type="text"
                                    value={shotData.shotCode}
                                    readOnly
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
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
                            <button
                                onClick={() => setShowCreateShot_Task(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center"
                            >
                                Cancel
                            </button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center">
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateShot_Note && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateShot_Note(false)} />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Note <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button onClick={() => setShowCreateShot_Note(false)} className="text-gray-400 hover:text-white text-xl">⚙️</button>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button onClick={() => setShowCreateShot_Note(false)} className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center">Cancel</button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center">Create Note</button>
                        </div>
                    </div>
                </div>
            )}


            {showCreateShot_Versions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateShot_Versions(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Versions <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button
                                onClick={() => setShowCreateShot_Versions(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ⚙️
                            </button>
                        </div>



                        {/* Footer */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateShot_Versions(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center"
                            >
                                Cancel
                            </button>

                            <button
                                className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center"
                            >
                                Create Versions
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {showCreateShot_Assets && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateShot_Assets(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-gray-600 flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-medium">
                                Create a new Asset
                            </h2>
                            <button
                                onClick={() => setShowCreateShot_Assets(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ⚙️
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Asset Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-9 px-3  bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-20 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Task Template
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Project
                                </label>
                                <input
                                    disabled
                                    value="Demo: Animation"
                                    className="w-full h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-400 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Shot
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
                                    className="w-full h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-400 text-sm"
                                />
                            </div>

                            <button className="text-sm text-gray-400 hover:text-gray-200">
                                More fields ▾
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-600 flex justify-between items-center">
                            <button className="text-sm text-blue-400 hover:underline">
                                Open Bulk Import
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCreateShot_Assets(false)}
                                    className="px-4 h-8 bg-gray-600 hover:bg-gray-500 text-sm rounded flex items-center justify-center"
                                >
                                    Cancel
                                </button>

                                <button
                                    className="px-4 h-8 bg-blue-600 hover:bg-blue-700 text-sm rounded text-white flex items-center justify-center"
                                >
                                    Create Asset
                                </button>
                            </div>

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
                                    <img src={selectedTask.file_url} alt="" className="w-12 h-12 object-cover rounded" />
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
                                                        src={selectedTask.file_url}
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

// const TaskItem = ({
//     title,
//     assignee,
//     status
// }: {
//     title: string;
//     assignee: string;
//     status: string;
// }) => (

// );

const VersionCard = ({ version }: { version: string }) => (
    <div className="bg-gray-700/40 p-4 rounded-lg text-center text-gray-300">
        <p className="font-semibold">{version}</p>
        <div className="h-24 bg-gray-600 mt-2 rounded" />
    </div>
);