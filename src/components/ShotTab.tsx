import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Image, Pencil, Film } from 'lucide-react';
import ENDPOINTS from '../config';

type StatusType = 'wtg' | 'ip' | 'fin';

const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' }
};

interface Shot {
    shot_id: number;
    shot_name: string;
    shot_status: string;
    shot_description: string;
    shot_created_at: string;
    shot_thumbnail?: string;
}

interface ShotTabProps {
    shots: Shot[];
    loadingShots: boolean;
    formatDateThai: (dateString: string) => string;
    onShotUpdate?: () => void;
}

const ShotTab: React.FC<ShotTabProps> = ({
    shots: initialShots,
    loadingShots,
    formatDateThai,
    onShotUpdate
}) => {
    const [shots, setShots] = useState<Shot[]>(initialShots);
    const [editingShotId, setEditingShotId] = useState<number | null>(null);
    const [editingShotName, setEditingShotName] = useState("");
    const [editingDescId, setEditingDescId] = useState<number | null>(null);
    const [editingDesc, setEditingDesc] = useState("");
    const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');
    const [updating, setUpdating] = useState(false);

    React.useEffect(() => {
        console.log('🎬 ShotTab received data:', initialShots);
        setShots(initialShots);
    }, [initialShots]);

    // ฟังก์ชันอัปเดต Shot (คุณอาจต้องสร้าง endpoint นี้)
    const updateShotField = async (
        shotId: number,
        field: string,
        value: any
    ) => {
        if (updating) return;

        try {
            setUpdating(true);
            console.log('🔄 Updating shot:', { shotId, field, value });

            // TODO: เพิ่ม endpoint สำหรับอัปเดต shot
            // const response = await axios.post(ENDPOINTS.UPDATE_SHOT, {
            //     shotId,
            //     field,
            //     value
            // });

            // Optimistic update
            setShots(prev =>
                prev.map(shot =>
                    shot.shot_id === shotId
                        ? { ...shot, [field]: value }
                        : shot
                )
            );

            if (onShotUpdate) {
                onShotUpdate();
            }

            console.log('✅ Shot updated successfully');
        } catch (error: any) {
            console.error('❌ Update shot failed:', error);
            alert(`Failed to update shot: ${error.response?.data?.message || error.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateShotName = async (shotId: number, newName: string) => {
        if (!newName.trim()) {
            alert('Shot name cannot be empty');
            return;
        }
        await updateShotField(shotId, 'shot_name', newName.trim());
        setEditingShotId(null);
    };

    const handleUpdateDescription = async (shotId: number, newDesc: string) => {
        await updateShotField(shotId, 'shot_description', newDesc.trim());
        setEditingDescId(null);
    };

    const handleUpdateStatus = async (shotId: number, newStatus: StatusType) => {
        await updateShotField(shotId, 'shot_status', newStatus);
        setShowStatusMenu(null);
    };

    if (loadingShots) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (shots.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                    <Film className="relative w-24 h-24 text-gray-600 mx-auto mb-4" strokeWidth={1.5} />
                </div>
                <div className="text-gray-500 mb-2">No shots in this sequence</div>
                <p className="text-sm text-gray-600">Shots will appear here when created</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 overflow-visible">
            <div className="overflow-x-visible rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse relative">
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                                #
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                                Thumbnail
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <span>Shot Name</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                        {shots.length}
                                    </span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Created
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {shots.map((shot, index) => (
                            <tr
                                key={`shot-${shot.shot_id}-${index}`}
                                className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                            >
                                {/* Column #1: Index */}
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                        {index + 1}
                                    </div>
                                </td>

                                {/* Column #2: Thumbnail */}
                                <td className="px-4 py-3">
                                    {shot.shot_thumbnail ? (
                                        <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
                                                style={{ backgroundImage: `url(${ENDPOINTS.image_url}${shot.shot_thumbnail})` }}
                                            />
                                            <img
                                                src={`${ENDPOINTS.image_url}${shot.shot_thumbnail}`}
                                                alt={shot.shot_name}
                                                className="relative w-full h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 ring-1 ring-gray-700">
                                            <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                <Image className="w-5 h-5 text-gray-600" />
                                            </div>
                                        </div>
                                    )}
                                </td>

                                {/* Column #3: Shot Name */}
                                <td className="px-4 py-4 w-48">
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-400 text-lg flex-shrink-0">🎬</span>

                                        {editingShotId === shot.shot_id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editingShotName}
                                                onChange={(e) => setEditingShotName(e.target.value)}
                                                onBlur={() => handleUpdateShotName(shot.shot_id, editingShotName)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleUpdateShotName(shot.shot_id, editingShotName);
                                                    } else if (e.key === 'Escape') {
                                                        setEditingShotId(null);
                                                        setEditingShotName(shot.shot_name);
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={updating}
                                                className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none disabled:opacity-50"
                                            />
                                        ) : (
                                            <>
                                                <span
                                                    className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-3 transition-colors font-medium cursor-pointer truncate max-w-[150px]"
                                                    title={shot.shot_name}
                                                >
                                                    {shot.shot_name}
                                                </span>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingShotId(shot.shot_id);
                                                        setEditingShotName(shot.shot_name);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 transition-all bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl flex-shrink-0"
                                                    title="แก้ไขชื่อ"
                                                >
                                                    <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>

                                {/* Column #4: Status */}
                                <td className="px-4 py-4">
                                    <div className="w-20 flex-shrink-0 relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const spaceBelow = window.innerHeight - rect.bottom;
                                                const spaceAbove = rect.top;
                                                setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
                                                setShowStatusMenu(showStatusMenu === shot.shot_id ? null : shot.shot_id);
                                            }}
                                            disabled={updating}
                                            className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500 disabled:opacity-50"
                                        >
                                            {statusConfig[shot.shot_status as StatusType].icon === '-' ? (
                                                <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                            ) : (
                                                <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[shot.shot_status as StatusType].color} shadow-sm`}></div>
                                            )}
                                            <span className="text-xs text-gray-300 font-medium truncate">
                                                {statusConfig[shot.shot_status as StatusType].label}
                                            </span>
                                        </button>

                                        {showStatusMenu === shot.shot_id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setShowStatusMenu(null)}
                                                />
                                                <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-[100] min-w-[180px] border border-gray-600`}>
                                                    {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                        <button
                                                            key={key}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(shot.shot_id, key);
                                                            }}
                                                            disabled={updating}
                                                            className="flex items-center gap-2.5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500 disabled:opacity-50"
                                                        >
                                                            {config.icon === '-' ? (
                                                                <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                            ) : (
                                                                <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                                            )}
                                                            <div className="text-xs text-gray-200">
                                                                <span className="px-4">{config.label}</span>
                                                                <span>{config.fullLabel}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </td>

                                {/* Column #5: Description */}
                                <td className="px-4 py-4">
                                    {editingDescId === shot.shot_id ? (
                                        <textarea
                                            autoFocus
                                            value={editingDesc}
                                            onChange={(e) => setEditingDesc(e.target.value)}
                                            onBlur={() => handleUpdateDescription(shot.shot_id, editingDesc)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleUpdateDescription(shot.shot_id, editingDesc);
                                                } else if (e.key === 'Escape') {
                                                    setEditingDescId(null);
                                                    setEditingDesc(shot.shot_description || '');
                                                }
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={updating}
                                            rows={2}
                                            className="w-full max-w-xs text-sm text-gray-300 bg-gray-800 border border-blue-500 rounded px-2 py-1 outline-none resize-none disabled:opacity-50"
                                        />
                                    ) : (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingDescId(shot.shot_id);
                                                setEditingDesc(shot.shot_description || '');
                                            }}
                                            className="w-full max-w-xs text-sm text-gray-300 cursor-pointer hover:bg-gray-800/60 rounded px-2 py-1 min-h-[2.5rem] transition-colors"
                                        >
                                            {shot.shot_description || (
                                                <span className="text-gray-600 italic">คลิกเพื่อเพิ่มรายละเอียด...</span>
                                            )}
                                        </div>
                                    )}
                                </td>

                                {/* Column #6: Created Date */}
                                <td className="px-4 py-4">
                                    <div className="text-xs text-gray-400">
                                        {formatDateThai(shot.shot_created_at)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ShotTab;