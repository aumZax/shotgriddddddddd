import { useState, useEffect } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import ENDPOINTS from '../../../config';
import axios from 'axios';
import { Eye, Image, Upload, X } from 'lucide-react';
import TaskTab from "../../../components/TaskTab";



// Status configuration
const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-green-500', icon: 'dot' }
};

type StatusType = keyof typeof statusConfig;

interface Activity {
    id: number;
    user: string;
    action: string;
    timestamp: Date;
}

interface AssetData {
    id: number;
    asset_name: string;
    shotCode: string;
    description: string;
    status: StatusType;
    thumbnail: string;
    sequence: string;
    tags?: string[];
    dueDate?: string;
}

// ⭐ เพิ่ม type ที่ขาดหาย (เพิ่มหลังบรรทัด TaskAssignee)
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

// ⭐ อัปเดต Task type (แทนที่ Task type เดิม)
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
    reviewers?: TaskReviewer[];           // ⭐ เพิ่มบรรทัดนี้
    pipeline_step?: PipelineStep | null;  // ⭐ เพิ่มบรรทัดนี้
};

type TaskAssignee = {
    id: number;
    username: string;
};

const assetFieldMap: Record<keyof AssetData, string | null> = {
    id: null,
    asset_name: "asset_name",
    shotCode: "shot_name",
    sequence: "sequence_name",
    status: "status",
    tags: null,
    thumbnail: "thumbnail",
    description: "description",
    dueDate: "due_date"
};

const getSelectedAsset = (): AssetData | null => {
    try {
        const selectedAssetString = localStorage.getItem("selectedAsset");
        if (!selectedAssetString) return null;
        const data = JSON.parse(selectedAssetString);
        return {
            id: data.id,
            asset_name: data.asset_name || '',
            description: data.description || '',
            status: data.status || 'wtg',
            thumbnail: data.file_url || '',
            sequence: data.sequence || '',
            shotCode: data.shot_name || ''
        };
    } catch (error) {
        console.error("Error parsing selectedShot:", error);
        return null;
    }
};

const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
};

export default function Others_Asset() {
    const [activeTab, setActiveTab] = useState('Activity');
    const [assetData, setAssetData] = useState<AssetData | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showCreateAsset_Task, setShowCreateAsset_Task] = useState(false);
    const [showCreateAsset_Note, setShowCreateAsset_Note] = useState(false);
    const [showCreateAsset_Versions, setShowCreateAsset_Versions] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [commentText, setCommentText] = useState('');
    const [currentUser] = useState('Current User');

    const [showPreview, setShowPreview] = useState(false);



    useEffect(() => {
        const selectedAsset = getSelectedAsset();
        if (selectedAsset) {
            setAssetData(selectedAsset);
        }
    }, []);

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowStatusMenu(!showStatusMenu);
    };

    const handleStatusChange = async (newStatus: StatusType) => {
        if (!assetData) return;

        const previousStatus = assetData.status;

        setAssetData(prev => prev ? { ...prev, status: newStatus } : null);
        setShowStatusMenu(false);

        const selectedAssetString = localStorage.getItem("selectedAsset");
        if (selectedAssetString) {
            const selectedAsset = JSON.parse(selectedAssetString);
            selectedAsset.status = newStatus;
            localStorage.setItem("selectedAsset", JSON.stringify(selectedAsset));
        }

        const newActivity: Activity = {
            // eslint-disable-next-line react-hooks/purity
            id: Date.now(),
            user: currentUser,
            action: `updated status to "${statusConfig[newStatus].label}"`,
            timestamp: new Date()
        };
        setActivities([newActivity, ...activities]);

        try {
            await axios.post(ENDPOINTS.UPDATEASSET, {
                assetId: assetData.id,
                field: 'status',
                value: newStatus
            });
            console.log(`✅ Updated status to ${newStatus} for asset ${assetData.id}`);
        } catch (error) {
            console.error('❌ Error updating status:', error);
            alert('Failed to update status');
            setAssetData(prev => prev ? { ...prev, status: previousStatus } : null);
        }
    };

    const handleClickOutside = () => {
        if (showStatusMenu) setShowStatusMenu(false);
    };

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

    const updateAssetField = async (
        field: keyof AssetData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
    ) => {
        if (!assetData) {
            console.warn(`⚠️ Asset data is not loaded`);
            return;
        }

        const dbField = assetFieldMap[field];

        if (!dbField) {
            console.warn(`⚠️ Field "${field}" cannot be updated`);
            return;
        }

        try {
            await axios.post(ENDPOINTS.UPDATEASSET, {
                assetId: assetData.id,
                field: dbField,
                value
            });

            setAssetData(prev => prev ? { ...prev, [field]: value } : null);

            const stored = JSON.parse(localStorage.getItem("selectedAsset") || "{}");
            localStorage.setItem(
                "selectedAsset",
                JSON.stringify({
                    ...stored,
                    [dbField]: value
                })
            );
        } catch (err) {
            console.error("❌ update asset failed:", err);
            alert("Update failed");
        }
    };


    // ++++++++++++++++++++++++++++++++++++++ storage +++++++++++++++++++++++++++++++

    const stored = JSON.parse(localStorage.getItem("selectedAsset") || "{}");
    const AssetID = stored.id;
    console.log("🔍 AssetID:", AssetID);  // ⭐ เพิ่ม log


    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;
    console.log("🔍 projectId:", projectId);  // ⭐ เพิ่ม log


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



    // +++++++++++++++++++++++++++++ sequence task +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [tasks, setTasks] = useState<Task[]>([]);


    useEffect(() => {
        console.log("🔍 AssetID:", AssetID);
        console.log("🔍 projectId:", projectId);
        console.log("🔍 stored data:", stored);

        if (!AssetID || !projectId) {
            console.warn("⚠️ Missing AssetID or projectId");
            return;
        }

        axios.post<Task[]>(ENDPOINTS.ASSET_TASK, {
            project_id: projectId,
            entity_type: "asset",
            entity_id: AssetID
        })
            .then(res => {
                console.log("✅ Tasks received:", res.data);
                setTasks(res.data);
            })
            .catch(err => {
                console.error("❌ โหลด task ไม่สำเร็จ", err);
            });
    }, [AssetID, projectId]); // เพิ่ม dependency

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

                        <div className="space-y-3">
                            {activities.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    No activities yet
                                </div>
                            ) : (
                                activities.map((activity) => {
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
                                })
                            )}
                        </div>
                    </div>
                );

            case 'Asset Info':
                return (
                    <div className="space-y-4 text-gray-300">
                        <InfoRow label="Asset Name" value={assetData?.asset_name || '-'} />
                        <InfoRow label="Sequence" value={assetData?.sequence || '-'} />
                        <InfoRow label="Status" value={assetData?.status ? statusConfig[assetData.status].label : '-'} />
                        <InfoRow label="Description" value={assetData?.description || '-'} />
                    </div>
                );

            case 'Tasks':
                return (
                    <TaskTab
                        tasks={tasks}
                        onTaskClick={(task: Task) => setSelectedTask(task)}
                    />
                );

            case 'Versions':
                return (
                    <div className="text-center text-gray-500 py-8">
                        No versions available
                    </div>
                );

            case 'Sub Assets':
                return (
                    <div className="text-center text-gray-500 py-8">
                        No sub assets available
                    </div>
                );

            case 'Notes':
                return (
                    <div className="text-center text-gray-500 py-8">
                        No notes available
                    </div>
                );

            case 'Publishes':
                return (
                    <div className="text-center text-gray-500 py-8">
                        No publishes available
                    </div>
                );

            default:
                return null;
        }
    };

    if (!assetData) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-900">
                <div className="pt-14">
                    <Navbar_Project activeTab="other" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400">No asset selected</p>
                </div>
            </div>
        );
    }

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
                            <span className='p-2 text-xl text-gray-200'>{assetData.sequence} </span>
                            <span className='p-2 text-xl text-gray-200'>{'>'}</span>
                            <span className='p-2 text-xl text-gray-200'>{assetData.asset_name}</span>
                        </div>
                        {showPreview && assetData.thumbnail && (
                            <div
                                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                                onClick={() => setShowPreview(false)}
                            >
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-white" />
                                </button>

                                <div className="max-w-7xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
                                    {assetData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                        <video src={assetData.thumbnail} className="w-full h-full object-contain rounded-lg" controls autoPlay />
                                    ) : (
                                        <img src={assetData.thumbnail} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-6 w-full items-start justify-between mb-6">
                            <div className="relative w-80 h-44 rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
                                {assetData.thumbnail ? (
                                    // ตรวจสอบว่าเป็นวิดีโอหรือรูปภาพ
                                    assetData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                        // แสดงวิดีโอ
                                        <div className="w-full h-full rounded-lg overflow-hidden">
                                            <video
                                                src={assetData.thumbnail}
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
                                            src={ENDPOINTS.image_url+assetData.thumbnail}
                                            alt="Asset thumbnail"
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
                                {assetData.thumbnail && (
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
                                                        formData.append("assetId", assetData.id.toString());
                                                        formData.append("file", file);
                                                        formData.append("oldImageUrl", assetData.thumbnail || "");

                                                        try {
                                                            const res = await fetch(ENDPOINTS.UPLOAD_ASSET, {
                                                                method: "POST",
                                                                body: formData,
                                                            });

                                                            const data = await res.json();
                                                            console.log("📥 Upload Response:", data);

                                                            if (res.ok) {
                                                                const newFileUrl = data.file?.fileUrl || data.fileUrl;

                                                                setAssetData(prev => prev ? {
                                                                    ...prev,
                                                                    thumbnail: newFileUrl
                                                                } : null);

                                                                const stored = JSON.parse(localStorage.getItem("selectedAsset") || "{}");
                                                                const updated = {
                                                                    ...stored,
                                                                    file_url: newFileUrl,
                                                                };
                                                                localStorage.setItem("selectedAsset", JSON.stringify(updated));

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
                                {!assetData.thumbnail && (
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            if (!e.target.files?.[0]) return;

                                            const file = e.target.files[0];
                                            const formData = new FormData();
                                            formData.append("assetId", assetData.id.toString());
                                            formData.append("file", file);
                                            formData.append("oldImageUrl", assetData.thumbnail || "");

                                            try {
                                                const res = await fetch(ENDPOINTS.UPLOAD_ASSET, {
                                                    method: "POST",
                                                    body: formData,
                                                });

                                                const data = await res.json();
                                                console.log("📥 Upload Response:", data);

                                                if (res.ok) {
                                                    const newFileUrl = data.file?.fileUrl || data.fileUrl;

                                                    setAssetData(prev => prev ? {
                                                        ...prev,
                                                        thumbnail: newFileUrl
                                                    } : null);

                                                    const stored = JSON.parse(localStorage.getItem("selectedAsset") || "{}");
                                                    const updated = {
                                                        ...stored,
                                                        file_url: newFileUrl,
                                                    };
                                                    localStorage.setItem("selectedAsset", JSON.stringify(updated));

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
                                            <span className="text-gray-400 font-medium block mb-1">Asset Name</span>
                                            {editingField === 'assetName' ? (
                                                <input
                                                    value={assetData.asset_name}
                                                    autoFocus
                                                    onChange={(e) =>
                                                        setAssetData(prev => prev ? { ...prev, asset_name: e.target.value } : null)
                                                    }
                                                    onBlur={() => {
                                                        updateAssetField("asset_name", assetData.asset_name);
                                                        setEditingField(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            updateAssetField("asset_name", assetData.asset_name);
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
                                                    onClick={() => setEditingField('assetName')}
                                                >
                                                    🎬 {assetData.asset_name}
                                                </p>
                                            )}
                                        </div>

                                        <div className="min-w-[200px]">
                                            <span className="text-gray-400 font-medium block mb-1">Type Name</span>
                                            <p className="text-gray-100 font-medium flex items-center gap-2">
                                                📁 {assetData.sequence}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="min-w-[200px] relative">
                                            <span className="text-gray-400 font-medium block mb-1">Status</span>
                                            <button
                                                onClick={handleStatusClick}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-full font-medium transition-colors"
                                            >
                                                {statusConfig[assetData.status].icon === '-' ? (
                                                    <span className="text-gray-400 font-bold">-</span>
                                                ) : (
                                                    <div className={`w-2 h-2 rounded-full ${statusConfig[assetData.status].color}`}></div>
                                                )}
                                                <span>{statusConfig[assetData.status].label}</span>
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
                                        <div className="flex-1">
                                            <span className="text-gray-400 block mb-1 font-medium">Description</span>
                                            {editingField === 'description' ? (
                                                <textarea
                                                    value={assetData.description || ''}
                                                    autoFocus
                                                    onChange={(e) =>
                                                        setAssetData(prev => prev ? { ...prev, description: e.target.value } : null)
                                                    }
                                                    onBlur={() => {
                                                        updateAssetField("description", assetData.description);
                                                        setEditingField(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            updateAssetField("description", assetData.description);
                                                            setEditingField(null);
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditingField(null);
                                                        }
                                                    }}
                                                    className="bg-gray-700 border border-blue-500 rounded px-2 py-1 text-white w-full"
                                                    rows={3}
                                                />
                                            ) : (
                                                <p
                                                    className="text-gray-100 cursor-text hover:bg-gray-700 px-2 py-1 rounded"
                                                    onClick={() => setEditingField('description')}
                                                >
                                                    {assetData.description || 'No description'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <nav className="flex items-center gap-6 border-t border-gray-700 pt-4">
                            {['Activity', 'Asset Info', 'Tasks', 'Notes', 'Versions', 'Sub Assets', 'Publishes'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-2 rounded-xl bg-gray-700 transition-all ${activeTab === tab
                                        ? 'text-white border-b-2 border-blue-500 font-medium bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600'
                                        : 'text-white-400 hover:text-white bg-gradient-to-r hover:from-gray-700 hover:to-gray-700 hover:scale-105'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
                        <h3 className="text-xl text-gray-200 font-semibold flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded"></span>
                            {activeTab}

                            {activeTab === 'Tasks' && (
                                <button
                                    onClick={() => setShowCreateAsset_Task(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200"
                                >
                                    Add Task
                                    <span className="text-xs">▼</span>

                                </button>
                            )}

                            {activeTab === 'Notes' && (
                                <button
                                    onClick={() => setShowCreateAsset_Note(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200"
                                >
                                    Add Note
                                </button>
                            )}

                            {activeTab === 'Versions' && (
                                <button
                                    onClick={() => setShowCreateAsset_Versions(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200"
                                >
                                    Add Version
                                </button>
                            )}
                        </h3>


                        <div className="mt-4">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>

            {showCreateAsset_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateAsset_Task(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button
                                onClick={() => setShowCreateAsset_Task(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Task Name:</label>
                                <input
                                    type="text"
                                    className="h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">Link:</label>
                                <input
                                    type="text"
                                    value={assetData?.asset_name || ''}
                                    disabled
                                    className="h-9 px-3 bg-gray-700 border border-gray-600 rounded text-gray-400 text-sm"
                                />
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateAsset_Task(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded"
                            >
                                Cancel
                            </button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded">
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateAsset_Note && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateAsset_Note(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Note
                            </h2>
                            <button
                                onClick={() => setShowCreateAsset_Note(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateAsset_Note(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded"
                            >
                                Cancel
                            </button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded">
                                Create Note
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateAsset_Versions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateAsset_Versions(false)}
                    />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Version
                            </h2>
                            <button
                                onClick={() => setShowCreateAsset_Versions(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateAsset_Versions(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded"
                            >
                                Cancel
                            </button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded">
                                Create Version
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


