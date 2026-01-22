import { useState, useEffect } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import ENDPOINTS from '../../../config';
import axios from 'axios';
import { Image } from 'lucide-react';

// Status configuration
const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-green-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-gray-500', icon: 'dot' }
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
                    <div className="text-center text-gray-500 py-8">
                        No tasks available
                    </div>
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
        <div className="min-h-screen flex flex-col bg-gray-900" onClick={handleClickOutside}>
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

                        <div className="flex gap-6 w-full items-start justify-between mb-6">
                            <div className="relative w-80 h-44 rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
                                {assetData.thumbnail ? (
                                    <img
                                        src={assetData.thumbnail}
                                        alt="Asset thumbnail"
                                        className="w-full h-full object-cover rounded-lg "
                                    />
                                ) : (
                                    <div className="w-full h-full  rounded-lg shadow-md border-2 border-dashed border-gray-600 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                                            <Image className="w-8 h-8 text-gray-500" />
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium">No Thumbnail</p>
                                    </div>
                                )}
                                
                                {/* Upload Input - คลิกที่รูปทั้งหมดเพื่ออัปโหลด */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        if (!e.target.files?.[0]) return;

                                        const formData = new FormData();
                                        formData.append("assetId", assetData.id.toString());
                                        formData.append("file", e.target.files[0]);
                                        formData.append("oldImageUrl", assetData.thumbnail || "");

                                        try {
                                            const res = await fetch(ENDPOINTS.UPLOAD_ASSET, {
                                                method: "POST",
                                                body: formData,
                                            });

                                            const data = await res.json();
                                            console.log("📥 Upload Response:", data);

                                            if (res.ok) {
                                                const newFileUrl = data.file.fileUrl;
                                                
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
                                                alert("Upload failed: " + data.error);
                                            }
                                        } catch (err) {
                                            console.error("❌ Upload error:", err);
                                            alert("Upload error");
                                        }
                                    }}
                                />
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
                                            <span className="text-gray-400 font-medium block mb-1">Sequence / Shot</span>
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
                                    </div>

                                    <div className="flex items-start gap-8">
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
                                    className={`pb-2 px-3 py-1 rounded transition-all ${activeTab === tab
                                        ? 'text-white border-b-2 border-blue-500 font-medium bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="mt-6 p-6 bg-gray-800 rounded-lg shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl text-gray-200 font-semibold flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded"></span>
                                {activeTab}
                            </h3>

                            {activeTab === 'Tasks' && (
                                <button
                                    onClick={() => setShowCreateAsset_Task(true)}
                                    className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200"
                                >
                                    Add Task
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
                        </div>

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
        </div>
    );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-gray-200">{value}</p>
    </div>
);
