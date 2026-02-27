import React, { useState } from 'react';
import { Film, Image, Pencil, Check, Layers } from 'lucide-react';
import ENDPOINTS from '../config';
import axios from 'axios';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface AssetShot {
    id: number;           // asset_shots.id
    shot_id: number;
    shot_name: string;
    shot_description: string;
    shot_status: string;
    shot_created_at: string;
    shot_file_url?: string;
    linked_at: string;
    sequence_name?: string;
    sequence_id?: number;
}

interface ShotAssetTabProps {
    shots: AssetShot[];
    loading: boolean;
    onShotUpdate?: () => void;
}

// ─── Status Config ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; fullLabel: string; color: string; icon: string }> = {
    wtg:  { label: 'wtg',  fullLabel: 'Waiting to Start',   color: 'bg-gray-600',   icon: '-'   },
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
    nef:  { label: 'nef',  fullLabel: 'Need Fixed',         color: 'bg-red-500',    icon: 'dot' },
    cap:  { label: 'cap',  fullLabel: 'Client Approved',    color: 'bg-green-400',  icon: 'dot' },
    na:   { label: 'na',   fullLabel: 'N/A',                color: 'bg-gray-400',   icon: '-'   },
    vnd:  { label: 'vnd',  fullLabel: 'Vendor',             color: 'bg-purple-800', icon: 'dot' },
};

const getStatus = (status: string) =>
    statusConfig[status] ?? { label: status, fullLabel: status, color: 'bg-gray-600', icon: 'dot' };

// ─── Component ─────────────────────────────────────────────────────────────────
const ShotAssetTab: React.FC<ShotAssetTabProps> = ({ shots: initialShots, loading, onShotUpdate }) => {
    const [shots, setShots] = useState<AssetShot[]>(initialShots);
    const [editingShotId, setEditingShotId]     = useState<number | null>(null);
    const [editingShotName, setEditingShotName] = useState('');
    const [editingDescId, setEditingDescId]     = useState<number | null>(null);
    const [editingDesc, setEditingDesc]         = useState('');
    const [showStatusMenu, setShowStatusMenu]   = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');
    const [updating, setUpdating] = useState(false);

    React.useEffect(() => {
        setShots(initialShots);
    }, [initialShots]);

    // ─── API ────────────────────────────────────────────────────────────────────
    const updateShotField = async (shotId: number, field: string, value: any) => {
        if (updating) return;
        try {
            setUpdating(true);

            // Map frontend field names → database field names
            const fieldMap: Record<string, string> = {
                shot_name:        'shot_name',
                shot_status:      'status',
                shot_description: 'description',
            };
            const dbField = fieldMap[field] ?? field;

            const response = await axios.post(ENDPOINTS.UPDATE_SHOT, {
                shotId,
                field: dbField,
                value,
            });

            if (response.data.message === 'Shot updated successfully' || response.data.success) {
                setShots(prev =>
                    prev.map(s => s.shot_id === shotId ? { ...s, [field]: value } : s)
                );
                onShotUpdate?.();
            }
        } catch (error: any) {
            console.error('❌ Update shot failed:', error);
            alert(`Failed to update shot: ${error.response?.data?.message ?? error.message}`);
            setShots(initialShots);
        } finally {
            setUpdating(false);
        }
    };

    // ─── Handlers ───────────────────────────────────────────────────────────────
    const handleUpdateShotName = async (shotId: number, newName: string) => {
        if (!newName.trim()) { alert('Shot name cannot be empty'); setEditingShotId(null); return; }
        await updateShotField(shotId, 'shot_name', newName.trim());
        setEditingShotId(null);
    };

    const handleUpdateDescription = async (shotId: number, newDesc: string) => {
        await updateShotField(shotId, 'shot_description', newDesc.trim());
        setEditingDescId(null);
    };

    const handleUpdateStatus = async (shotId: number, newStatus: string) => {
        await updateShotField(shotId, 'shot_status', newStatus);
        setShowStatusMenu(null);
    };

    // ─── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    // ─── Empty ──────────────────────────────────────────────────────────────────
    if (!shots.length) {
        return (
            <div className="text-center py-12">
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                    <Film className="relative w-20 h-20 text-gray-600 mx-auto mb-4" strokeWidth={1.5} />
                </div>
                <p className="text-gray-500 mt-4">No shots linked to this asset</p>
                <p className="text-xs text-gray-600 mt-1">Shots will appear here when linked via the asset_shots table</p>
            </div>
        );
    }

    // ─── Table ──────────────────────────────────────────────────────────────────
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
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case font-normal">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">{shots.length}</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-48">Status</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-40">Sequence</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody className="divide-y divide-gray-800/50">
                        {shots.map((shot, index) => {
                            const cfg = getStatus(shot.shot_status);
                            return (
                                <tr
                                    key={`asset-shot-${shot.id}-${index}`}
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
                                        {(() => {
                                            const url = shot.shot_file_url;
                                            const isVideo = url && /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
                                            const isImage = url && !isVideo;

                                            if (isVideo) return (
                                                <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                    <video src={`${ENDPOINTS.image_url}${url}`} className="w-full h-full object-cover" muted loop autoPlay />
                                                    <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                                                        <span className="text-[9px] text-gray-300">▶</span>
                                                    </div>
                                                </div>
                                            );

                                            if (isImage) return (
                                                <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                    <div className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50" style={{ backgroundImage: `url(${ENDPOINTS.image_url}${url})` }} />
                                                    <img src={`${ENDPOINTS.image_url}${url}`} alt={shot.shot_name} className="relative w-full h-full object-contain" />
                                                </div>
                                            );

                                            return (
                                                <div className="w-20 h-16 rounded-lg flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 ring-1 ring-gray-700">
                                                    <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                        <Image className="w-5 h-5 text-gray-600" />
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    {/* Shot Name — editable */}
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
                                                        className="text-blue-400 font-medium truncate max-w-[150px] hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-2 transition-colors cursor-pointer"
                                                        title={shot.shot_name}
                                                    >
                                                        {shot.shot_name}
                                                    </span>
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setEditingShotId(shot.shot_id);
                                                            setEditingShotName(shot.shot_name);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 transition-all bg-gray-800 border border-gray-700 hover:border-gray-500 hover:bg-gray-700 rounded-xl flex-shrink-0"
                                                        title="แก้ไขชื่อ"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status — dropdown */}
                                    <td className="px-4 py-4">
                                        <div className="w-48 flex-shrink-0 relative">
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
                                                className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500 border border-gray-700/60 disabled:opacity-50"
                                            >
                                                {cfg.icon === '-' ? (
                                                    <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                ) : (
                                                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} shadow-sm flex-shrink-0`} />
                                                )}
                                                <span className="text-xs text-gray-300 font-medium truncate">{cfg.label}</span>
                                                <span className="hidden sm:inline text-xs text-gray-500 truncate">· {cfg.fullLabel}</span>
                                            </button>

                                            {/* Dropdown */}
                                            {showStatusMenu === shot.shot_id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(null)} />
                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                                                        bg-gray-800 rounded-lg shadow-2xl z-[100]
                                                        max-h-[350px] overflow-y-auto
                                                        border border-gray-600 whitespace-nowrap
                                                        scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500`}
                                                    >
                                                        {Object.entries(statusConfig).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={e => { e.stopPropagation(); handleUpdateStatus(shot.shot_id, key); }}
                                                                disabled={updating}
                                                                className="flex items-center gap-5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500 disabled:opacity-50"
                                                            >
                                                                {config.icon === '-' ? (
                                                                    <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                ) : (
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${config.color} flex-shrink-0`} />
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

                                    {/* Sequence — read only */}
                                    <td className="px-4 py-4">
                                        {shot.sequence_name ? (
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800/80 border border-gray-700/60 max-w-[150px]">
                                                <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                                <span
                                                    className="text-xs text-purple-300 font-medium truncate"
                                                    title={shot.sequence_name}
                                                >
                                                    {shot.sequence_name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-600 italic px-2">—</span>
                                        )}
                                    </td>

                                    {/* Description — editable */}
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
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ShotAssetTab;