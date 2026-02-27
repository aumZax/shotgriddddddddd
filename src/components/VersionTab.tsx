/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Eye, Film, Check, X, ChevronDown, Layers } from 'lucide-react';
import ENDPOINTS from '../config';

const versionStatusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' },
    apr: { label: 'apr', fullLabel: 'Approved', color: 'bg-green-500', icon: 'dot' },
    cmpt: { label: 'cmpt', fullLabel: 'Complete', color: 'bg-blue-600', icon: 'dot' },
    cfrm: { label: 'cfrm', fullLabel: 'Confirmed', color: 'bg-purple-500', icon: 'dot' },
    nef: { label: 'nef', fullLabel: 'Need fixed', color: 'bg-red-500', icon: 'dot' },
    dlvr: { label: 'dlvr', fullLabel: 'Delivered', color: 'bg-cyan-500', icon: 'dot' },
    rts: { label: 'rts', fullLabel: 'Ready to Start', color: 'bg-orange-500', icon: 'dot' },
    rev: { label: 'rev', fullLabel: 'Pending Review', color: 'bg-yellow-600', icon: 'dot' },
    omt: { label: 'omt', fullLabel: 'Omit', color: 'bg-gray-500', icon: 'dot' },
    ren: { label: 'ren', fullLabel: 'Rendering', color: 'bg-pink-500', icon: 'dot' },
    hld: { label: 'hld', fullLabel: 'On Hold', color: 'bg-orange-600', icon: 'dot' },
    vwd: { label: 'vwd', fullLabel: 'Viewed', color: 'bg-teal-500', icon: 'dot' },
    crv: { label: 'crv', fullLabel: 'Client review', color: 'bg-purple-600', icon: 'dot' },
    na: { label: 'na', fullLabel: 'N/A', color: 'bg-gray-400', icon: '-' },
    pndng: { label: 'pndng', fullLabel: 'Pending', color: 'bg-yellow-400', icon: 'dot' },
    cap: { label: 'cap', fullLabel: 'Client Approved', color: 'bg-green-400', icon: 'dot' },
    recd: { label: 'recd', fullLabel: 'Received', color: 'bg-blue-400', icon: 'dot' },
    chk: { label: 'chk', fullLabel: 'Checking', color: 'bg-lime-500', icon: 'dot' },
    rdd: { label: 'rdd', fullLabel: 'Render done', color: 'bg-emerald-500', icon: 'dot' },
    srd: { label: 'srd', fullLabel: 'Submit render', color: 'bg-indigo-500', icon: 'dot' },
    sos: { label: 'sos', fullLabel: 'Send outsource', color: 'bg-violet-500', icon: 'dot' }
};

type VersionStatus = keyof typeof versionStatusConfig;

export interface Version {
    id: number;
    entity_type: string;
    entity_id: number;
    version_number: number;
    version_name?: string;
    status: string;
    file_url?: string;
    description?: string;
    uploaded_by?: string;
    uploaded_by_name?: string;
    created_at: string;
    task_name?: string;
}

export interface VersionTabProps {
    versions: Version[];
    isLoadingVersions: boolean;
    isMock?: boolean;
    onUpdateVersion: (versionId: number, field: string, value: any) => Promise<boolean>;
    onDeleteVersion: (versionId: number) => void;
    formatDate?: (dateStr: string) => string;
}

const VersionTab: React.FC<VersionTabProps> = ({
    versions,
    isLoadingVersions,
    isMock = false,
    onUpdateVersion,
    onDeleteVersion,
    formatDate,
}) => {

    const [previewVersion, setPreviewVersion] = useState<Version | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');
    const [editingField, setEditingField] = useState<{ id: number; field: string } | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [updating, setUpdating] = useState(false);

    // ── Context Menu State ──
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        version: Version;
    } | null>(null);

    // ── Delete Confirm State ──
    const [deleteConfirm, setDeleteConfirm] = useState<{
        versionId: number;
        versionName: string;
    } | null>(null);

    const formatDateDefault = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('th-TH', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };
    const dateFormatter = formatDate || formatDateDefault;
    const isVideo = (url?: string) => !!url?.match(/\.(mp4|webm|ogg|mov|avi)$/i);
    const isMockRow = (id: number) => id < 0;

    const handleStatusChange = async (versionId: number, newStatus: VersionStatus) => {
        if (updating || isMockRow(versionId)) return;
        setUpdating(true);
        try {
            await onUpdateVersion(versionId, 'status', newStatus);
        } finally {
            setUpdating(false);
            setShowStatusMenu(null);
        }
    };

    const handleFieldSave = async (versionId: number, field: string) => {
        if (isMockRow(versionId)) { setEditingField(null); return; }
        if (updating) return;
        setUpdating(true);
        try {
            await onUpdateVersion(versionId, field, editingValue);
        } finally {
            setUpdating(false);
            setEditingField(null);
        }
    };

    const startEdit = (versionId: number, field: string, currentValue: string) => {
        if (isMockRow(versionId)) return;
        setEditingField({ id: versionId, field });
        setEditingValue(currentValue || '');
    };

    // ── Right-click handler ──
    const handleContextMenu = (e: React.MouseEvent, version: Version) => {
        if (isMockRow(version.id)) return;
        if (version.version_number === 1) return;  // ← เพิ่มบรรทัดนี้
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, version });
    };

    // ── Close context menu on outside click ──
    const closeContextMenu = () => setContextMenu(null);

    if (isLoadingVersions) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-3 overflow-visible" onClick={closeContextMenu}>

            {isMock && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs">
                    <Layers className="w-4 h-4 flex-shrink-0" />
                    <span>ยังไม่มีข้อมูล — แสดงตัวอย่างข้อมูลจำลอง (Versions จริงจะปรากฎเมื่ออัปโหลด)</span>
                </div>
            )}

            {/* Preview Modal */}
            {previewVersion?.file_url && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setPreviewVersion(null)}
                >
                    <button
                        onClick={() => setPreviewVersion(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <div
                        className="max-w-5xl max-h-[85vh] w-full h-full flex flex-col items-center justify-center gap-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="text-white font-semibold text-lg">
                            {previewVersion.version_name || `Version ${previewVersion.version_number}`}
                        </p>
                        {isVideo(previewVersion.file_url) ? (
                            <video
                                src={ENDPOINTS.image_url + previewVersion.file_url}
                                className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                controls autoPlay
                            />
                        ) : (
                            <img
                                src={ENDPOINTS.image_url + previewVersion.file_url}
                                alt="Preview"
                                className="w-full h-full object-contain rounded-2xl shadow-2xl"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ── Context Menu ── */}
            {contextMenu && (
                <div
                    className="fixed z-[90] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                versionId: contextMenu.version.id,
                                versionName: contextMenu.version.version_name || `Version ${contextMenu.version.version_number}`,
                            });
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700 rounded-lg"
                    >
                        🗑️ Delete Version
                    </button>
                </div>
            )}

            {/* ── Delete Confirm Dialog ── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div
                        className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                                    <span className="text-3xl">⚠️</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">Delete Version</h3>
                                    <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                                </div>
                            </div>

                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">Are you sure you want to delete this version?</p>
                                <p className="font-semibold text-zinc-100 truncate">
                                    "{deleteConfirm.versionName}"
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 rounded-lg bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        onDeleteVersion(deleteConfirm.versionId);
                                        setDeleteConfirm(null);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete Version
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-visible rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse relative">

                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-40">Preview</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <span>Version</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                        {versions.length}
                                    </span>
                                    {isMock && (
                                        <span className="px-2 py-0.5 rounded-md bg-yellow-500/20 text-yellow-400 font-semibold">
                                            ตัวอย่าง
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-44">Status</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Uploaded By</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-40">Date</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-800/50">
                        {versions.filter(version => version.version_number !== 1)
                            .map((version, index) => {
                                const statusKey = (version.status || 'wtg') as VersionStatus;
                                const statusInfo = versionStatusConfig[statusKey] ?? versionStatusConfig.wtg;
                                const mock = isMockRow(version.id);

                                return (
                                    <tr
                                        key={`ver-${version.id}-${index}`}
                                        onContextMenu={e => handleContextMenu(e, version)}
                                        className={`group transition-all duration-200 cursor-context-menu ${mock
                                                ? 'opacity-55'
                                                : 'hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent'
                                            }`}
                                    >
                                        {/* # */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                                {index + 1}
                                            </div>
                                        </td>

                                        {/* PREVIEW */}
                                        <td className="px-4 py-3">
                                            <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                {version.file_url ? (
                                                    <>
                                                        {isVideo(version.file_url) ? (
                                                            <video
                                                                src={ENDPOINTS.image_url + version.file_url}
                                                                className="w-full h-full object-cover"
                                                                muted
                                                            />
                                                        ) : (
                                                            <>
                                                                <div
                                                                    className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
                                                                    style={{ backgroundImage: `url(${ENDPOINTS.image_url}${version.file_url})` }}
                                                                />
                                                                <img
                                                                    src={ENDPOINTS.image_url + version.file_url}
                                                                    alt={version.version_name}
                                                                    className="relative w-full h-full object-contain z-10"
                                                                />
                                                            </>
                                                        )}
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/50 z-20">
                                                            <button
                                                                onClick={() => setPreviewVersion(version)}
                                                                className="p-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg"
                                                            >
                                                                <Eye className="w-4 h-4 text-white" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700">
                                                        <Film className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
                                                        <span className="text-gray-600 text-[10px] mt-1">v{version.version_number}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* VERSION NAME */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-400 text-base flex-shrink-0">🎞️</span>
                                                {editingField?.id === version.id && editingField.field === 'version_name' ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingValue}
                                                        onChange={e => setEditingValue(e.target.value)}
                                                        onBlur={() => handleFieldSave(version.id, 'version_name')}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleFieldSave(version.id, 'version_name');
                                                            if (e.key === 'Escape') setEditingField(null);
                                                        }}
                                                        disabled={updating}
                                                        className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none disabled:opacity-50"
                                                    />
                                                ) : (
                                                    <div
                                                        className={mock ? 'cursor-default' : 'cursor-pointer'}
                                                        onClick={() => startEdit(version.id, 'version_name', version.version_name || '')}
                                                    >
                                                        <p className="text-blue-400 hover:text-blue-300 font-medium text-sm truncate max-w-[160px]">
                                                            {version.version_name || `Version ${version.version_number}`}
                                                        </p>
                                                        <p className="text-gray-500 text-xs">
                                                            v{version.version_number}
                                                            {version.task_name && ` · ${version.task_name}`}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* STATUS */}
                                        <td className="px-4 py-4">
                                            <div className="w-28 flex-shrink-0 relative">
                                                <button
                                                    onClick={e => {
                                                        if (mock) return;
                                                        e.stopPropagation();
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setStatusMenuPosition(
                                                            window.innerHeight - rect.bottom < 200 && rect.top > window.innerHeight - rect.bottom
                                                                ? 'top' : 'bottom'
                                                        );
                                                        setShowStatusMenu(showStatusMenu === version.id ? null : version.id);
                                                    }}
                                                    disabled={updating || mock}
                                                    className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600 disabled:opacity-60 disabled:cursor-default"
                                                >
                                                    {statusInfo.icon === '-' ? (
                                                        <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                    ) : (
                                                        <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} shadow-sm`} />
                                                    )}
                                                    <span className="text-xs text-gray-300 font-medium truncate flex-1 text-left">
                                                        {statusInfo.label}
                                                    </span>
                                                    {!mock && <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                                                </button>

                                                {showStatusMenu === version.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(null)} />
                                                        <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-[100] max-h-[300px] overflow-y-auto border border-gray-600 whitespace-nowrap`}>
                                                            {(Object.entries(versionStatusConfig) as [VersionStatus, typeof versionStatusConfig[VersionStatus]][]).map(([key, cfg]) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={e => { e.stopPropagation(); handleStatusChange(version.id, key); }}
                                                                    disabled={updating}
                                                                    className="flex items-center gap-4 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500 disabled:opacity-50"
                                                                >
                                                                    {cfg.icon === '-' ? (
                                                                        <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                    ) : (
                                                                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                                                                    )}
                                                                    <div className="text-xs text-gray-200 flex items-center gap-4">
                                                                        <span className="inline-block w-8">{cfg.label}</span>
                                                                        <span>{cfg.fullLabel}</span>
                                                                    </div>
                                                                    {version.status === key && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* UPLOADED BY */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 hover:bg-gray-800/60 rounded px-2 py-1 transition-colors">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-white text-xs font-semibold">
                                                        {version.uploaded_by_name ? version.uploaded_by_name[0].toUpperCase() : '?'}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-gray-300 truncate max-w-[100px]">
                                                    {version.uploaded_by_name || (
                                                        <span className="text-gray-600 italic text-xs">Unknown</span>
                                                    )}
                                                </span>
                                            </div>
                                        </td>

                                        {/* DESCRIPTION */}
                                        <td className="px-4 py-4">
                                            {editingField?.id === version.id && editingField.field === 'description' ? (
                                                <textarea
                                                    autoFocus
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onBlur={() => handleFieldSave(version.id, 'description')}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleFieldSave(version.id, 'description');
                                                        }
                                                        if (e.key === 'Escape') setEditingField(null);
                                                    }}
                                                    disabled={updating}
                                                    rows={2}
                                                    className="w-full max-w-xs text-sm text-gray-300 bg-gray-800 border border-blue-500 rounded px-2 py-1 outline-none resize-none disabled:opacity-50"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(version.id, 'description', version.description || '')}
                                                    className="w-full max-w-xs text-sm text-gray-300 cursor-pointer hover:bg-gray-800/60 rounded px-2 py-1 min-h-[2.5rem] transition-colors"
                                                >
                                                    {version.description || (
                                                        <span className="text-gray-600 italic">
                                                            {mock ? '—' : 'คลิกเพื่อเพิ่มรายละเอียด...'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* DATE */}
                                        <td className="px-4 py-4">
                                            <span className="text-xs text-gray-500">{dateFormatter(version.created_at)}</span>
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

export default VersionTab;