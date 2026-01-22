
import { useState } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import { Image } from 'lucide-react';
import ENDPOINTS from '../../../config';
import axios from 'axios';

// Status configuration
const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-green-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-gray-500', icon: 'dot' }
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

    const [showCreateShot_Task, setShowCreateShot_Task] = useState(false);
    const [showCreateShot_Note, setShowCreateShot_Note] = useState(false);
    const [showCreateShot_Versions, setShowCreateShot_Versions] = useState(false);
    const [showCreateShot_Assets, setShowCreateShot_Assets] = useState(false);

    // Activity and Comment states
    const [activities, setActivities] = useState<Activity[]>(initialActivities);
    const [commentText, setCommentText] = useState('');
    const [currentUser] = useState('Current User');

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
        const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
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
            const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
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
                    <div className="space-y-3">
                        <TaskItem title="Block animation" assignee="John" status="In Progress" />
                        <TaskItem title="Lighting pass" assignee="Jane" status="Waiting" />
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
        <div className="min-h-screen flex flex-col bg-gray-900" onClick={handleClickOutside}>
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
                            <div className="relative">
                                {shotData.thumbnail ? (
                                    <img
                                        src={shotData.thumbnail}
                                        alt="Shot thumbnail"
                                        className="w-80 h-44 object-cover rounded-lg shadow-md border-2 border-gray-700"
                                    />
                                ) : (
                                    <div className="w-80 h-44 rounded-lg shadow-md border-2 border-dashed border-gray-600 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                                            <Image className="w-8 h-8 text-gray-500" />
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium">No Thumbnail</p>
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
                                        formData.append("shotId", shotData.id.toString());
                                        formData.append("file", e.target.files[0]);
                                        formData.append("oldImageUrl", shotData.thumbnail || "");

                                        try {
                                            const res = await fetch(ENDPOINTS.UPLOAD_SHOT, {
                                                method: "POST",
                                                body: formData,
                                            });

                                            const data = await res.json();
                                            console.log("📥 Response:", data);

                                            if (res.ok) {
                                                // ✅ อัปเดต state
                                                setShotData(prev => ({ ...prev, thumbnail: data.file.fileUrl }));

                                                // ✅ อัปเดต localStorage
                                                const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");

                                                const updated = {
                                                    ...stored,
                                                    thumbnail: data.file.fileUrl,
                                                };

                                                localStorage.setItem("selectedShot", JSON.stringify(updated));


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
                                    className={`pb-2 transition-all ${activeTab === tab
                                        ? 'text-white border-b-2 border-blue-500 font-medium bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600 hover:shadow-blue-500/50 hover:scale-105'
                                        : 'text-gray-400 hover:text-white  bg-gradient-to-r hover:from-gray-700 hover:to-gray-700 hover:scale-105'
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





        </div>
    );
}





const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-gray-200">{value}</p>
    </div>
);

const TaskItem = ({
    title,
    assignee,
    status
}: {
    title: string;
    assignee: string;
    status: string;
}) => (
    <div className="bg-gray-700/40 p-3 rounded-lg flex justify-between text-gray-300">
        <span>{title}</span>
        <span className="text-sm text-gray-400">
            {assignee} · {status}
        </span>
    </div>
);

const VersionCard = ({ version }: { version: string }) => (
    <div className="bg-gray-700/40 p-4 rounded-lg text-center text-gray-300">
        <p className="font-semibold">{version}</p>
        <div className="h-24 bg-gray-600 mt-2 rounded" />
    </div>
);