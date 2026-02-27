import React, { useState, useEffect } from 'react';
import { Image, Pencil, Film, Check, Box } from 'lucide-react';
import ENDPOINTS from '../config';
import axios from 'axios';

type StatusType = 'wtg' | 'ip' | 'fin';

const statusConfig = {
    wtg:  { label: 'wtg',  fullLabel: 'Waiting to Start',  color: 'bg-gray-600',   icon: '-'   },
    ip:   { label: 'ip',   fullLabel: 'In Progress',        color: 'bg-blue-500',   icon: 'dot' },
    fin:  { label: 'fin',  fullLabel: 'Final',              color: 'bg-green-500',  icon: 'dot' },
    wtc:  { label: 'wtc',  fullLabel: 'Waiting for Client', color: 'bg-yellow-500', icon: 'dot' },
    arp:  { label: 'arp',  fullLabel: 'Approval',           color: 'bg-green-600',  icon: 'dot' },
    cmpt: { label: 'cmpt', fullLabel: 'Complete',           color: 'bg-blue-600',   icon: 'dot' },
    cfrm: { label: 'cfrm', fullLabel: 'Confirmed',          color: 'bg-purple-500', icon: 'dot' },
    rts:  { label: 'rts',  fullLabel: 'Ready to Start',     color: 'bg-orange-500', icon: 'dot' },
    omt:  { label: 'omt',  fullLabel: 'Omit',               color: 'bg-gray-500',   icon: 'dot' },
    dlvr: { label: 'dlvr', fullLabel: 'Delivered',          color: 'bg-cyan-500',   icon: 'dot' },
    hld:  { label: 'hld',  fullLabel: 'On Hold',            color: 'bg-orange-600', icon: 'dot' },
    nef:  { label: 'nef',  fullLabel: 'Need fixed',         color: 'bg-red-500',    icon: 'dot' },
    cap:  { label: 'cap',  fullLabel: 'Client Approved',    color: 'bg-green-400',  icon: 'dot' },
    na:   { label: 'na',   fullLabel: 'N/A',                color: 'bg-gray-400',   icon: '-'   },
    vnd:  { label: 'vnd',  fullLabel: 'Vendor',             color: 'bg-purple-800', icon: 'dot' },
};

interface Shot {
    shot_id: number;
    shot_name: string;
    shot_status: string;
    shot_description: string;
    shot_created_at: string;
    shot_thumbnail?: string;
}

// Asset ที่เชื่อมกับ shot (จาก GET_ASSET_SHOT)
interface ShotAsset {
    id: number;
    asset_id: number;
    asset_name: string;
    status: string;
    description: string;
    asset_shot_id?: number;
}

interface ShotTabProps {
    shots: Shot[];
    loadingShots: boolean;
    formatDateThai: (dateString: string) => string;
    onShotUpdate?: () => void;
}

const Shot_SequenceTab: React.FC<ShotTabProps> = ({
    shots: initialShots,
    loadingShots,
    onShotUpdate
}) => {
    const [shots, setShots]                             = useState<Shot[]>(initialShots);
    const [editingShotId, setEditingShotId]             = useState<number | null>(null);
    const [editingShotName, setEditingShotName]         = useState('');
    const [editingDescId, setEditingDescId]             = useState<number | null>(null);
    const [editingDesc, setEditingDesc]                 = useState('');
    const [showStatusMenu, setShowStatusMenu]           = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition]   = useState<'top' | 'bottom'>('bottom');
    const [updating, setUpdating]                       = useState(false);

    // ⭐ State เก็บ assets ของแต่ละ shot (key = shot_id) — เหมือน allShotAssets ใน ProjectShot
    const [allShotAssets, setAllShotAssets] = useState<Record<number, ShotAsset[]>>({});

    // ⭐ State ควบคุมการ expand assets ของแต่ละ shot (key = shot_id)
    const [expandedAssets, setExpandedAssets] = useState<Record<number, boolean>>({});

    // ========================================
    // SYNC PROPS
    // ========================================
    useEffect(() => {
        setShots(initialShots);
    }, [initialShots]);

    // ⭐ ดึง assets ของทุก shot เมื่อ shots เปลี่ยน (เหมือน useEffect ใน ProjectShot)
    useEffect(() => {
        if (initialShots.length === 0) return;
        initialShots.forEach(shot => fetchShotAssets(shot.shot_id));
    }, [initialShots]);

    // ⭐ ดึง assets ของ shot — logic เหมือน fetchShotAssets ใน ProjectShot
    const fetchShotAssets = async (shotId: number) => {
        try {
            const res = await fetch(ENDPOINTS.GET_ASSET_SHOT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shotId })
            });
            if (!res.ok) return;
            const result = await res.json();
            if (result.success) {
                const assets: ShotAsset[] = result.data.map((item: any) => ({
                    id:            item.asset_id,
                    asset_id:      item.asset_id,
                    asset_name:    item.asset_name,
                    status:        item.status,
                    description:   item.description || '',
                    asset_shot_id: item.asset_shot_id,
                }));
                setAllShotAssets(prev => ({ ...prev, [shotId]: assets }));
            }
        } catch (err) {
            console.error('Fetch shot assets error:', err);
        }
    };

    // ========================================
    // FIELD MAPPING
    // ========================================
    const mapFieldToDatabase = (frontendField: string): string => {
        const fieldMap: Record<string, string> = {
            shot_name:        'shot_name',
            shot_status:      'status',
            shot_description: 'description',
            shot_thumbnail:   'file_url',
        };
        return fieldMap[frontendField] || frontendField;
    };

    // ========================================
    // UPDATE API
    // ========================================
    const updateShotField = async (shotId: number, frontendField: string, value: any) => {
        if (updating) return;
        try {
            setUpdating(true);
            const dbField = mapFieldToDatabase(frontendField);
            const response = await axios.post(ENDPOINTS.UPDATE_SHOT, { shotId, field: dbField, value });
            if (response.data.success) {
                setShots(prev => prev.map(s => s.shot_id === shotId ? { ...s, [frontendField]: value } : s));
                onShotUpdate?.();
            }
        } catch (error: any) {
            alert(`Failed to update shot: ${error.response?.data?.message || error.message}`);
            setShots(initialShots);
        } finally {
            setUpdating(false);
        }
    };

    // ========================================
    // HANDLERS
    // ========================================
    const handleUpdateShotName = async (shotId: number, newName: string) => {
        if (!newName.trim()) { alert('Shot name cannot be empty'); setEditingShotId(null); return; }
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

    // ========================================
    // LOADING
    // ========================================
    if (loadingShots) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    // ========================================
    // EMPTY
    // ========================================
    if (shots.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                    <Film className="relative w-24 h-24 text-gray-600 mx-auto mb-4" strokeWidth={1.5} />
                </div>
                <div className="text-gray-500 mb-2">No shots in this sequence</div>
                <p className="text-sm text-gray-600">Shots will appear here when created</p>
            </div>
        );
    }

    // ========================================
    // RENDER
    // ========================================
    return (
        <div className="space-y-4 overflow-visible">
            <div className="overflow-x-visible rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse relative">

                    {/* ── Header ── */}
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-40">Thumbnail</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <span>Shot Name</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case font-normal">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">{shots.length}</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Status</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                            {/* ⭐ คอลัมน์ Assets — เหมือน ProjectShot */}
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Assets</th>
                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody className="divide-y divide-gray-800/50">
                        {shots.map((shot, index) => {
                            const cfg = statusConfig[shot.shot_status as StatusType] ??
                                { label: shot.shot_status, fullLabel: shot.shot_status, color: 'bg-gray-600', icon: 'dot' };

                            // ⭐ ดึง assets ของ shot นี้ — เหมือน allShotAssets[shot.id] ใน ProjectShot
                            const currentAssets = allShotAssets[shot.shot_id] || [];

                            return (
                                <tr
                                    key={`shot-${shot.shot_id}-${index}`}
                                    className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                >
                                    {/* # */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                            {index + 1}
                                        </div>
                                    </td>

                                    {/* Thumbnail */}
                                    <td className="px-4 py-3">
                                        {shot.shot_thumbnail ? (
                                            (() => {
                                                const isVideo = /\.(mp4|webm|ogg|mov|avi)$/i.test(shot.shot_thumbnail!);
                                                return isVideo ? (
                                                    <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                        <video
                                                            src={`${ENDPOINTS.image_url}${shot.shot_thumbnail}`}
                                                            className="w-full h-full object-cover"
                                                            muted loop autoPlay
                                                        />
                                                        <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                                                            <span className="text-[9px] text-gray-300">▶</span>
                                                        </div>
                                                    </div>
                                                ) : (
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
                                                );
                                            })()
                                        ) : (
                                            <div className="w-20 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 ring-1 ring-gray-700">
                                                <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                    <Image className="w-5 h-5 text-gray-600" />
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Shot Name */}
                                    <td className="px-4 py-4 w-48">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400 text-lg flex-shrink-0">🎬</span>
                                            {editingShotId === shot.shot_id ? (
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingShotName}
                                                    onChange={e => setEditingShotName(e.target.value)}
                                                    onBlur={() => handleUpdateShotName(shot.shot_id, editingShotName)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleUpdateShotName(shot.shot_id, editingShotName);
                                                        else if (e.key === 'Escape') { setEditingShotId(null); setEditingShotName(shot.shot_name); }
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    disabled={updating}
                                                    className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none disabled:opacity-50"
                                                />
                                            ) : (
                                                <>
                                                    <span
                                                        className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-2 transition-colors font-medium cursor-pointer truncate max-w-[150px]"
                                                        title={shot.shot_name}
                                                    >
                                                        {shot.shot_name}
                                                    </span>
                                                    <div
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setEditingShotId(shot.shot_id);
                                                            setEditingShotName(shot.shot_name);
                                                        }}
                                                        className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 transition-all bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-700 rounded-xl flex-shrink-0"
                                                        title="แก้ไขชื่อ"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-4">
                                        <div className="w-20 flex-shrink-0 relative">
                                            <button
                                                onClick={e => {
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
                                                {cfg.icon === '-' ? (
                                                    <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                ) : (
                                                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} shadow-sm`} />
                                                )}
                                                <span className="text-xs text-gray-300 font-medium truncate">{cfg.label}</span>
                                            </button>

                                            {showStatusMenu === shot.shot_id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(null)} />
                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                                                        bg-gray-800 rounded-lg shadow-2xl z-[100]
                                                        max-h-[350px] overflow-y-auto
                                                        border border-gray-600 whitespace-nowrap
                                                        scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500`}
                                                    >
                                                        {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={e => { e.stopPropagation(); handleUpdateStatus(shot.shot_id, key); }}
                                                                disabled={updating}
                                                                className="flex items-center gap-5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500 disabled:opacity-50"
                                                            >
                                                                {config.icon === '-' ? (
                                                                    <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                ) : (
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
                                                                )}
                                                                <div className="text-xs text-gray-200 flex items-center gap-5">
                                                                    <span className="inline-block w-8">{config.label}</span>
                                                                    <span>{config.fullLabel}</span>
                                                                </div>
                                                                {shot.shot_status === key && (
                                                                    <Check className="w-4 h-4 text-blue-400 ml-auto" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Description */}
                                    <td className="px-4 py-4">
                                        {editingDescId === shot.shot_id ? (
                                            <textarea
                                                autoFocus
                                                value={editingDesc}
                                                onChange={e => setEditingDesc(e.target.value)}
                                                onBlur={() => handleUpdateDescription(shot.shot_id, editingDesc)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdateDescription(shot.shot_id, editingDesc); }
                                                    else if (e.key === 'Escape') { setEditingDescId(null); setEditingDesc(shot.shot_description || ''); }
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                disabled={updating}
                                                rows={2}
                                                className="w-full max-w-xs text-sm text-gray-300 bg-gray-800 border border-blue-500 rounded px-2 py-1 outline-none resize-none disabled:opacity-50"
                                            />
                                        ) : (
                                            <div
                                                onClick={e => {
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

                                    {/* ⭐ Assets */}
                                    <td className="px-4 py-4">
                                        {(() => {
                                            const LIMIT = 3;
                                            const isExpanded = !!expandedAssets[shot.shot_id];
                                            const visibleAssets = isExpanded ? currentAssets : currentAssets.slice(0, LIMIT);
                                            const hiddenCount = currentAssets.length - LIMIT;

                                            if (currentAssets.length === 0) {
                                                return <span className="text-xs text-gray-600 italic">No assets</span>;
                                            }

                                            return (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {visibleAssets.map(asset => (
                                                        <div
                                                            key={asset.asset_id}
                                                            title={asset.description || asset.asset_name}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30"
                                                        >
                                                            <span className="text-xs text-gray-300 font-medium whitespace-nowrap max-w-[100px] truncate">
                                                                {asset.asset_name}
                                                            </span>
                                                            {asset.status === 'fin' && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50 flex-shrink-0" />
                                                            )}
                                                            {asset.status === 'ip' && (
                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* ปุ่ม +N / ซ่อน */}
                                                    {currentAssets.length > LIMIT && (
                                                        <div
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setExpandedAssets(prev => ({
                                                                    ...prev,
                                                                    [shot.shot_id]: !prev[shot.shot_id]
                                                                }));
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors cursor-pointer"
                                                        >
                                                            <Box className="w-3 h-3 text-blue-400" />
                                                            <span className="text-xs font-semibold text-blue-300">
                                                                {isExpanded ? 'ซ่อน' : `+${hiddenCount}`}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>

                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Shot_SequenceTab;