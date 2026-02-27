import React, { useState, useEffect } from 'react';
import { Image, Pencil, Package, Check } from 'lucide-react';
import ENDPOINTS from '../config';
import axios from 'axios';

type StatusType = 'wtg' | 'ip' | 'fin';

const statusConfig = {
    wtg:   { label: 'wtg',   fullLabel: 'Waiting to Start', color: 'bg-gray-600',   icon: '-'   },
    ip:    { label: 'ip',    fullLabel: 'In Progress',       color: 'bg-blue-500',   icon: 'dot' },
    fin:   { label: 'fin',   fullLabel: 'Final',             color: 'bg-green-500',  icon: 'dot' },
    hld:   { label: 'hld',   fullLabel: 'On Hold',           color: 'bg-orange-600', icon: 'dot' },
    pndng: { label: 'pndng', fullLabel: 'Pending',           color: 'bg-yellow-400', icon: 'dot' },
    recd:  { label: 'recd',  fullLabel: 'Received',          color: 'bg-blue-400',   icon: 'dot' },
    rts:   { label: 'rts',   fullLabel: 'Ready to Start',    color: 'bg-orange-500', icon: 'dot' },
    cmpt:  { label: 'cmpt',  fullLabel: 'Complete',          color: 'bg-blue-600',   icon: 'dot' },
};

interface Asset {
    id: number;
    asset_id: number;
    asset_name: string;
    status: string;
    description: string;
    created_at: string;
    asset_shot_id?: number;
    asset_type?: string;
    thumbnail?: string;
}

// ⭐ Sequence ที่เชื่อมกับ asset
interface AssetSequence {
    id: number;
    sequence_id: number;
    sequence_name: string;
    sequence_description: string;
    sequence_status: string;
    sequence_created_at: string;
    sequence_file_url: string;
    linked_at: string;
}

interface Asset_ShotTabProps {
    shotAssets: Asset[];
    loadingAssets: boolean;
    formatDateThai: (dateString: string) => string;
    onAssetUpdate?: () => void;
}

const Asset_ShotTab: React.FC<Asset_ShotTabProps> = ({
    shotAssets: initialAssets,
    loadingAssets,
    onAssetUpdate,
}) => {
    const [assets, setAssets]                         = useState<Asset[]>(initialAssets);
    const [editingAssetId, setEditingAssetId]         = useState<number | null>(null);
    const [editingAssetName, setEditingAssetName]     = useState('');
    const [editingDescId, setEditingDescId]           = useState<number | null>(null);
    const [editingDesc, setEditingDesc]               = useState('');
    const [showStatusMenu, setShowStatusMenu]         = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');
    const [updating, setUpdating]                     = useState(false);

    // ⭐ State สำหรับ sequences ของแต่ละ asset (key = asset_id)
    const [assetSequencesMap, setAssetSequencesMap] = useState<Record<number, AssetSequence[]>>({});

    useEffect(() => {
        setAssets(initialAssets);
    }, [initialAssets]);

    // ⭐ ดึง sequences ของทุก asset เมื่อ assets เปลี่ยน
    useEffect(() => {
        if (assets.length === 0) return;
        assets.forEach(asset => {
            fetchSequencesForAsset(asset.asset_id);
        });
    }, [assets.length]);

    // ⭐ ฟังก์ชันดึง sequences ของ asset
    const fetchSequencesForAsset = async (assetId: number) => {
        try {
            const res = await axios.post(ENDPOINTS.GET_ASSET_SEQUENCES_JOIN, { assetId });
            if (Array.isArray(res.data)) {
                setAssetSequencesMap(prev => ({ ...prev, [assetId]: res.data }));
            } else if (res.data && Array.isArray(res.data.data)) {
                setAssetSequencesMap(prev => ({ ...prev, [assetId]: res.data.data }));
            } else {
                setAssetSequencesMap(prev => ({ ...prev, [assetId]: [] }));
            }
        } catch {
            setAssetSequencesMap(prev => ({ ...prev, [assetId]: [] }));
        }
    };

    // ─── API ────────────────────────────────────────────────────────────────────
    const updateAssetField = async (assetId: number, field: string, value: any) => {
        if (updating) return;
        try {
            setUpdating(true);
            const response = await axios.post(ENDPOINTS.UPDATE_ASSET, { assetId, field, value });
            if (response.data.success) {
                setAssets(prev =>
                    prev.map(a => a.asset_id === assetId ? { ...a, [field]: value } : a)
                );
                onAssetUpdate?.();
            }
        } catch (error: any) {
            console.error('❌ Update asset failed:', error);
            alert(`Failed to update asset: ${error.response?.data?.message ?? error.message}`);
        } finally {
            setUpdating(false);
        }
    };

    // ─── Handlers ───────────────────────────────────────────────────────────────
    const handleUpdateAssetName = async (assetId: number, newName: string) => {
        if (!newName.trim()) { alert('Asset name cannot be empty'); return; }
        await updateAssetField(assetId, 'asset_name', newName.trim());
        setEditingAssetId(null);
    };

    const handleUpdateDescription = async (assetId: number, newDesc: string) => {
        await updateAssetField(assetId, 'description', newDesc.trim());
        setEditingDescId(null);
    };

    const handleUpdateStatus = async (assetId: number, newStatus: StatusType) => {
        await updateAssetField(assetId, 'status', newStatus);
        setShowStatusMenu(null);
    };

    // ─── Loading ────────────────────────────────────────────────────────────────
    if (loadingAssets) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    // ─── Empty ──────────────────────────────────────────────────────────────────
    if (assets.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                    <Package className="relative w-24 h-24 text-gray-600 mx-auto mb-4" strokeWidth={1.5} />
                </div>
                <div className="text-gray-500 mb-2">No assets linked to this shot</div>
                <p className="text-sm text-gray-600">Assets will appear here when linked</p>
            </div>
        );
    }

    // ─── Status dot helper ───────────────────────────────────────────────────────
    const getStatusDot = (status: string) => {
        if (status === 'fin') return <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50 flex-shrink-0" />;
        if (status === 'ip')  return <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 flex-shrink-0" />;
        return <div className="w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />;
    };

    // ─── Table ──────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4 overflow-visible">
            <div className="overflow-x-visible rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse relative">

                    {/* ── Header ── */}
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">Thumbnail</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <span>Asset Name</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case font-normal">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">{assets.length}</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-48">Status</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                            {/* ⭐ คอลัมน์ Sequences ใหม่ */}
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Sequences</th>
                        </tr>
                    </thead>

                    {/* ── Body ── */}
                    <tbody className="divide-y divide-gray-800/50">
                        {assets.map((asset, index) => {
                            const cfg = statusConfig[asset.status as StatusType] ??
                                { label: asset.status, fullLabel: asset.status, color: 'bg-gray-600', icon: 'dot' };

                            // ⭐ ดึง sequences ของ asset นี้
                            const sequences = assetSequencesMap[asset.asset_id] ?? [];

                            return (
                                <tr
                                    key={`asset-${asset.id}-${index}`}
                                    className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                >
                                    {/* # */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                            {index + 1}
                                        </div>
                                    </td>

                                    {/* Thumbnail — รองรับ video */}
                                    <td className="px-4 py-3">
                                        {(() => {
                                            const url = asset.thumbnail;
                                            const isVideo = url && /\.(mp4|webm|ogg|mov|avi)$/i.test(url);
                                            const isImage = url && !isVideo;

                                            if (isVideo) return (
                                                <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                    <video
                                                        src={`${ENDPOINTS.image_url}${url}`}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        loop
                                                        autoPlay
                                                    />
                                                    <div className="absolute bottom-1 right-1 bg-black/60 rounded px-1 py-0.5">
                                                        <span className="text-[9px] text-gray-300">▶</span>
                                                    </div>
                                                </div>
                                            );

                                            if (isImage) return (
                                                <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                    <div
                                                        className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
                                                        style={{ backgroundImage: `url(${ENDPOINTS.image_url}${url})` }}
                                                    />
                                                    <img
                                                        src={`${ENDPOINTS.image_url}${url}`}
                                                        alt={asset.asset_name}
                                                        className="relative w-full h-full object-contain"
                                                    />
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

                                    {/* Asset Name — editable */}
                                    <td className="px-4 py-4 w-48">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400 text-lg flex-shrink-0">✓</span>

                                            {editingAssetId === asset.asset_id ? (
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editingAssetName}
                                                    onChange={e => setEditingAssetName(e.target.value)}
                                                    onBlur={() => handleUpdateAssetName(asset.asset_id, editingAssetName)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleUpdateAssetName(asset.asset_id, editingAssetName);
                                                        else if (e.key === 'Escape') { setEditingAssetId(null); setEditingAssetName(asset.asset_name); }
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    disabled={updating}
                                                    className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none disabled:opacity-50"
                                                />
                                            ) : (
                                                <>
                                                    <span
                                                        className="text-blue-400 font-medium truncate max-w-[150px] hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-2 transition-colors cursor-pointer"
                                                        title={asset.asset_name}
                                                    >
                                                        {asset.asset_name}
                                                    </span>
                                                    <div
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setEditingAssetId(asset.asset_id);
                                                            setEditingAssetName(asset.asset_name);
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

                                    {/* Type — badge only */}
                                    <td className="px-4 py-4">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                            <span className="text-xs font-medium text-purple-300 whitespace-nowrap">
                                                {asset.asset_type || 'No Type'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Status — dropdown */}
                                    <td className="px-4 py-4">
                                        <div className="w-20 flex-shrink-0 relative">
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    const spaceAbove = rect.top;
                                                    setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
                                                    setShowStatusMenu(showStatusMenu === asset.asset_id ? null : asset.asset_id);
                                                }}
                                                disabled={updating}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500 border border-gray-700/60 disabled:opacity-50"
                                            >
                                                {cfg.icon === '-' ? (
                                                    <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                ) : (
                                                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} shadow-sm flex-shrink-0`} />
                                                )}
                                                <span className="text-xs text-gray-300 font-medium">{cfg.label}</span>
                                            </button>

                                            {showStatusMenu === asset.asset_id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(null)} />
                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}
                                                        bg-gray-800 rounded-lg shadow-2xl z-[100]
                                                        max-h-[350px] overflow-y-auto
                                                        border border-gray-600 whitespace-nowrap
                                                        scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500`}
                                                    >
                                                        {(Object.entries(statusConfig) as [StatusType, typeof statusConfig[keyof typeof statusConfig]][]).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={e => { e.stopPropagation(); handleUpdateStatus(asset.asset_id, key); }}
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
                                                                {asset.status === key && (
                                                                    <Check className="w-4 h-4 text-blue-400 ml-auto" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Description — editable */}
                                    <td className="px-4 py-4">
                                        {editingDescId === asset.asset_id ? (
                                            <textarea
                                                autoFocus
                                                value={editingDesc}
                                                onChange={e => setEditingDesc(e.target.value)}
                                                onBlur={() => handleUpdateDescription(asset.asset_id, editingDesc)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdateDescription(asset.asset_id, editingDesc); }
                                                    else if (e.key === 'Escape') { setEditingDescId(null); setEditingDesc(asset.description || ''); }
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
                                                    setEditingDescId(asset.asset_id);
                                                    setEditingDesc(asset.description || '');
                                                }}
                                                className="w-full max-w-xs text-sm text-gray-300 cursor-pointer hover:bg-gray-800/60 rounded px-2 py-1 min-h-[2.5rem] transition-colors"
                                            >
                                                {asset.description || (
                                                    <span className="text-gray-600 italic">คลิกเพื่อเพิ่มรายละเอียด...</span>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    {/* ⭐ Sequences — แสดงรายชื่อ sequences ที่เชื่อมกับ asset */}
                                    <td className="px-4 py-4">
                                        {sequences.length === 0 ? (
                                            <span className="text-xs text-gray-600 italic">No sequences</span>
                                        ) : sequences.length <= 2 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {sequences.map(seq => (
                                                    <div
                                                        key={seq.sequence_id}
                                                        title={seq.sequence_description || seq.sequence_name}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-700/20 rounded-md border border-purple-600/30"
                                                    >
                                                        <span className="text-xs text-purple-300 font-medium whitespace-nowrap">
                                                            {seq.sequence_name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {/* Badge จำนวน */}
                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                                    <span className="text-xs font-semibold text-purple-300">{sequences.length} seqs</span>
                                                </div>
                                                {/* แสดงสอง sequence แรก */}
                                                {sequences.slice(0, 2).map(seq => (
                                                    <div
                                                        key={seq.sequence_id}
                                                        title={seq.sequence_description || seq.sequence_name}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-700/20 rounded-md border border-purple-600/30"
                                                    >
                                                        <span className="text-xs text-purple-300 font-medium whitespace-nowrap max-w-[80px] truncate">
                                                            {seq.sequence_name}
                                                        </span>
                                                        {getStatusDot(seq.sequence_status)}
                                                    </div>
                                                ))}
                                                <span className="text-gray-500 text-xs">...</span>
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

export default Asset_ShotTab;