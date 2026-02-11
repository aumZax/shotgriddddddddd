import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Image, Pencil, Package } from 'lucide-react';
import axios from 'axios';
import ENDPOINTS from '../config';

type StatusType = 'wtg' | 'ip' | 'fin';

const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' }
};

interface Asset {
    id: number;
    asset_name: string;
    status: string;
    description: string;
    created_at: string;
    asset_shot_id?: number;
    asset_type?: string;
    thumbnail?: string;
}

interface AssetTabProps {
    shotAssets: Asset[];
    loadingAssets: boolean;
    formatDateThai: (dateString: string) => string;
}

// Group assets by type
const groupAssetsByType = (assets: Asset[]) => {
    const grouped: Record<string, Asset[]> = {};
    
    assets.forEach(asset => {
        const type = asset.asset_type || 'No Type';
        if (!grouped[type]) {
            grouped[type] = [];
        }
        grouped[type].push(asset);
    });
    
    return grouped;
};

const AssetTab: React.FC<AssetTabProps> = ({ 
    shotAssets: initialAssets, 
    loadingAssets, 
}) => {
    const [assets, setAssets] = useState<Asset[]>(initialAssets);
    const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
    const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
    const [editingAssetName, setEditingAssetName] = useState("");
    const [editingDescId, setEditingDescId] = useState<number | null>(null);
    const [editingDesc, setEditingDesc] = useState("");
    const [showStatusMenu, setShowStatusMenu] = useState<{
        type: string;
        assetId: number;
        index: number;
    } | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');

    useEffect(() => {
        console.log('📦 AssetTab received data:', initialAssets);
        setAssets(initialAssets);
        
        // Expand all types by default
        const grouped = groupAssetsByType(initialAssets);
        const expanded: Record<string, boolean> = {};
        Object.keys(grouped).forEach(type => {
            expanded[type] = true;
        });
        setExpandedTypes(expanded);
    }, [initialAssets]);

    const toggleType = (type: string) => {
        setExpandedTypes(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const updateAsset = async (assetId: number, field: string, value: any) => {
        try {
            console.log('🔄 Updating asset:', { assetId, field, value });
            
            const response = await axios.post(`${ENDPOINTS.UPDATE_ASSET_TABS}`, {
                assetId,
                field,
                value
            });

            console.log('✅ Update response:', response.data);

            // อัพเดท state
            setAssets(prev =>
                prev.map(asset =>
                    asset.id === assetId ? { ...asset, [field]: value } : asset
                )
            );

            return true;
        } catch (err) {
            console.error('❌ Failed to update asset:', err);
            return false;
        }
    };

    const handleStatusChange = async (assetId: number, newStatus: StatusType) => {
        try {
            console.log('🔄 Changing status:', { assetId, newStatus });
            
            const success = await updateAsset(assetId, 'status', newStatus);
            
            if (success) {
                console.log('✅ Status changed successfully');
                // State จะถูกอัพเดทใน updateAsset แล้ว
            } else {
                console.error('❌ Failed to change status');
            }
            
            setShowStatusMenu(null);
        } catch (err) {
            console.error('❌ Error in handleStatusChange:', err);
        }
    };

    const groupedAssets = groupAssetsByType(assets);

    if (loadingAssets) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (assets.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                    <Package className="relative w-24 h-24 text-gray-600 mx-auto mb-4" strokeWidth={1.5} />
                </div>
                <div className="text-gray-500 mb-2">No assets linked to this shot</div>
                <p className="text-sm text-gray-600">Assets will appear here when linked</p>
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
                                    <span>Asset Name</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                        {assets.length}
                                    </span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Description
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {Object.entries(groupedAssets).map(([type, assetsInType], typeIndex) => (
                            <React.Fragment key={`type-${type}-${typeIndex}`}>
                                {/* Type Header Row */}
                                <tr 
                                    className="bg-gradient-to-r from-blue-500/10 to-transparent hover:from-blue-500/20 cursor-pointer transition-all"
                                    onClick={() => toggleType(type)}
                                >
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {expandedTypes[type] ? (
                                                <ChevronDown className="w-5 h-5 text-blue-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-blue-400" />
                                            )}
                                            <span className="text-sm font-bold text-blue-300 uppercase tracking-wider">
                                                {type}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-xs font-semibold text-blue-400">
                                                {assetsInType.length}
                                            </span>
                                        </div>
                                    </td>
                                </tr>

                                {/* Asset Rows */}
                                {expandedTypes[type] && assetsInType.map((asset, index) => (
                                    <tr
                                        key={`asset-${asset.id}-${index}`}
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
                                            {asset.thumbnail ? (
                                                <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                    <div
                                                        className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
                                                        style={{ backgroundImage: `url(${ENDPOINTS.image_url}${asset.thumbnail})` }}
                                                    />
                                                    <img
                                                        src={`${ENDPOINTS.image_url}${asset.thumbnail}`}
                                                        alt={asset.asset_name}
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

                                        {/* Column #3: Asset Name */}
                                        <td className="px-4 py-4 w-48">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-400 text-lg flex-shrink-0">✓</span>

                                                {editingAssetId === asset.id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingAssetName}
                                                        onChange={(e) => setEditingAssetName(e.target.value)}
                                                        onBlur={async () => {
                                                            if (editingAssetName.trim() && editingAssetName !== asset.asset_name) {
                                                                await updateAsset(asset.id, 'asset_name', editingAssetName.trim());
                                                            }
                                                            setEditingAssetId(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur();
                                                            } else if (e.key === 'Escape') {
                                                                setEditingAssetId(null);
                                                                setEditingAssetName(asset.asset_name);
                                                            }
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none"
                                                    />
                                                ) : (
                                                    <>
                                                        <span
                                                            className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-3 transition-colors font-medium cursor-pointer truncate max-w-[150px]"
                                                            title={asset.asset_name}
                                                        >
                                                            {asset.asset_name}
                                                        </span>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingAssetId(asset.id);
                                                                setEditingAssetName(asset.asset_name);
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

                                        {/* Column #4: Type */}
                                        <td className="px-4 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                                <span className="text-xs font-medium text-purple-300">
                                                    {asset.asset_type || 'No Type'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Column #5: Status */}
                                        <td className="px-4 py-4">
                                            <div className="w-20 flex-shrink-0 relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                        const spaceAbove = rect.top;
                                                        setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
                                                        
                                                        // ถ้ากดที่เดิม ให้ปิด ถ้ากดที่ใหม่ ให้เปิด
                                                        setShowStatusMenu(
                                                            showStatusMenu?.type === type && 
                                                            showStatusMenu?.assetId === asset.id && 
                                                            showStatusMenu?.index === index
                                                                ? null
                                                                : { type: type, assetId: asset.id, index: index }
                                                        );
                                                    }}
                                                    className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500"
                                                >
                                                    {statusConfig[asset.status as StatusType].icon === '-' ? (
                                                        <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                    ) : (
                                                        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[asset.status as StatusType].color} shadow-sm`}></div>
                                                    )}
                                                    <span className="text-xs text-gray-300 font-medium truncate">
                                                        {statusConfig[asset.status as StatusType].label}
                                                    </span>
                                                </button>

                                                {showStatusMenu?.type === type && 
                                                 showStatusMenu?.assetId === asset.id && 
                                                 showStatusMenu?.index === index && (
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
                                                                        handleStatusChange(asset.id, key);
                                                                    }}
                                                                    className="flex items-center gap-2.5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500"
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

                                        {/* Column #6: Description */}
                                        <td className="px-4 py-4">
                                            {editingDescId === asset.id ? (
                                                <textarea
                                                    autoFocus
                                                    value={editingDesc}
                                                    onChange={(e) => setEditingDesc(e.target.value)}
                                                    onBlur={async () => {
                                                        const newDesc = editingDesc.trim();
                                                        if (newDesc !== asset.description) {
                                                            await updateAsset(asset.id, 'description', newDesc);
                                                        }
                                                        setEditingDescId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            e.currentTarget.blur();
                                                        } else if (e.key === 'Escape') {
                                                            setEditingDescId(null);
                                                            setEditingDesc(asset.description || '');
                                                        }
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    rows={2}
                                                    className="w-full max-w-xs text-sm text-gray-300 bg-gray-800 border border-blue-500 rounded px-2 py-1 outline-none resize-none"
                                                />
                                            ) : (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingDescId(asset.id);
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
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AssetTab;