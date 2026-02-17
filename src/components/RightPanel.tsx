import React from 'react';
import { X, Calendar, Edit3, Package, Image, User, File, Clock, FileText } from 'lucide-react';
import axios from 'axios';
import ENDPOINTS from '../config';

// Types
type StatusType = keyof typeof statusConfig;

const statusConfig = {
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

type TaskAssignee = {
    id: number;
    username: string;
};

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
    reviewers: TaskReviewer[];
    pipeline_step: PipelineStep | null;
};

type Version = {
    id: number;
    entity_type: string;
    entity_id: number;
    version_number: number;
    version_name?: string;
    file_url: string;
    thumbnail_url?: string;
    status: string;
    uploaded_by: number;
    created_at: string;
    file_size?: number;
    notes?: string;
    description?: string;
    uploaded_by_name?: string;
};

interface RightPanelProps {
    selectedTask: Task | null;
    isPanelOpen: boolean;
    rightPanelWidth: number;
    activeTab: string;
    taskVersions: Version[];
    isLoadingVersions: boolean;
    projectUsers: { id: number; username: string }[];
    onClose: () => void;
    onResize: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTabChange: React.Dispatch<React.SetStateAction<string>>;
    onUpdateVersion?: (versionId: number, field: string, value: any) => Promise<boolean>;
    onAddVersionSuccess?: () => void;
    onDeleteVersionSuccess?: () => void; // ⭐ เพิ่ม callback หลังลบสำเร็จ
}

const RightPanel: React.FC<RightPanelProps> = ({
    selectedTask,
    isPanelOpen,
    rightPanelWidth,
    activeTab,
    taskVersions,
    isLoadingVersions,
    projectUsers,
    onClose,
    onResize,
    onTabChange,
    onUpdateVersion,
    onAddVersionSuccess,
    onDeleteVersionSuccess,
}) => {
    if (!selectedTask) return null;


    // States for editing
    const [editingVersionId, setEditingVersionId] = React.useState<number | null>(null);
    const [editingField, setEditingField] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState<string>('');
    const [showStatusMenu, setShowStatusMenu] = React.useState<number | null>(null);
    const [showUserMenu, setShowUserMenu] = React.useState<number | null>(null);
    const [userSearchTerm, setUserSearchTerm] = React.useState<string>('');
    const [showAddVersionModal, setShowAddVersionModal] = React.useState(false);
    const [isUploadingVersion, setIsUploadingVersion] = React.useState(false);
    const [addVersionForm, setAddVersionForm] = React.useState({
        version_name: '',
        description: '',
        file_url: '',
        status: 'wtg' as StatusType,
        uploaded_by: 0,
        file_size: 0,
    });

    // ⭐ States สำหรับระบบ Right-Click Delete
    const [contextMenu, setContextMenu] = React.useState<{
        visible: boolean;
        x: number;
        y: number;
        version: Version;
    } | null>(null);

    const [deleteConfirm, setDeleteConfirm] = React.useState<{
        versionId: number;
        versionName: string;
    } | null>(null);

    const [isDeletingVersion, setIsDeletingVersion] = React.useState(false);

    // ⭐ ปิด context menu เมื่อคลิกที่อื่น
    // ✅ แก้เป็น: ใช้ capture phase + mousedown + ลบ return ใน useEffect ให้ถูก
    React.useEffect(() => {
        if (!contextMenu) return;
        const closeMenu = () => setContextMenu(null);
        document.addEventListener('mousedown', closeMenu, true); // true = capture phase
        document.addEventListener('contextmenu', closeMenu, true);
        return () => {
            document.removeEventListener('mousedown', closeMenu, true);
            document.removeEventListener('contextmenu', closeMenu, true);
        };
    }, [contextMenu]);


    // ⭐ Handler เปิด Context Menu
    const handleVersionContextMenu = (e: React.MouseEvent, version: Version) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            version,
        });
    };

    // ⭐ Handler ลบ Version จริง
    const handleDeleteVersion = async (versionId: number) => {
        setIsDeletingVersion(true);
        try {
            await axios.delete(ENDPOINTS.DELETE_VERSION, {
                data: { versionId },
            });

            setDeleteConfirm(null);
            onDeleteVersionSuccess?.(); // refresh รายการ versions
        } catch (err) {
            console.error('❌ Delete version failed:', err);
        } finally {
            setIsDeletingVersion(false);
        }
    };

    const handleAddVersion = async () => {
        if (!selectedTask || !addVersionForm.version_name.trim()) return;
        setIsUploadingVersion(true);
        try {
            const res = await axios.post(`${ENDPOINTS.ADD_VERSION}`, {
                task_id: selectedTask.id,
                entity_type: 'task',
                entity_id: selectedTask.id,
                version_name: addVersionForm.version_name.trim(),
                description: addVersionForm.description.trim() || undefined,
                file_url: addVersionForm.file_url.trim() || undefined,
                status: addVersionForm.status,
                uploaded_by: addVersionForm.uploaded_by || undefined,
                file_size: addVersionForm.file_size || undefined,
            });

            console.log('✅ Version added:', res.data);

            setShowAddVersionModal(false);
            setAddVersionForm({ version_name: '', description: '', file_url: '', status: 'wtg', uploaded_by: 0, file_size: 0 });
            onAddVersionSuccess?.();
        } catch (err) {
            console.error('❌ Add version error:', err);
        } finally {
            setIsUploadingVersion(false);
        }
    };


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

    const getStatusStyle = (status: string) => {
        const config = statusConfig[status as StatusType];
        if (!config) return {
            bg: 'bg-gray-500/30',
            text: 'text-gray-300',
            border: 'border-gray-500/50',
            gradient: 'from-gray-500 to-gray-600',
            solidBg: 'bg-gray-500'
        };

        const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string; solidBg: string }> = {
            'bg-gray-600': { bg: 'bg-gray-500/30', text: 'text-gray-300', border: 'border-gray-500/50', gradient: 'from-gray-500 to-gray-600', solidBg: 'bg-gray-500' },
            'bg-gray-500': { bg: 'bg-gray-500/30', text: 'text-gray-300', border: 'border-gray-500/50', gradient: 'from-gray-500 to-gray-600', solidBg: 'bg-gray-500' },
            'bg-gray-400': { bg: 'bg-gray-400/30', text: 'text-gray-300', border: 'border-gray-400/50', gradient: 'from-gray-400 to-gray-500', solidBg: 'bg-gray-400' },
            'bg-blue-500': { bg: 'bg-blue-500/30', text: 'text-blue-300', border: 'border-blue-500/50', gradient: 'from-blue-500 to-cyan-500', solidBg: 'bg-blue-500' },
            'bg-blue-600': { bg: 'bg-blue-600/30', text: 'text-blue-300', border: 'border-blue-600/50', gradient: 'from-blue-600 to-blue-700', solidBg: 'bg-blue-600' },
            'bg-blue-400': { bg: 'bg-blue-400/30', text: 'text-blue-300', border: 'border-blue-400/50', gradient: 'from-blue-400 to-blue-500', solidBg: 'bg-blue-400' },
            'bg-green-500': { bg: 'bg-green-500/30', text: 'text-green-300', border: 'border-green-500/50', gradient: 'from-green-500 to-emerald-500', solidBg: 'bg-green-500' },
            'bg-green-400': { bg: 'bg-green-400/30', text: 'text-green-300', border: 'border-green-400/50', gradient: 'from-green-400 to-green-500', solidBg: 'bg-green-400' },
            'bg-purple-500': { bg: 'bg-purple-500/30', text: 'text-purple-300', border: 'border-purple-500/50', gradient: 'from-purple-500 to-purple-600', solidBg: 'bg-purple-500' },
            'bg-purple-600': { bg: 'bg-purple-600/30', text: 'text-purple-300', border: 'border-purple-600/50', gradient: 'from-purple-600 to-purple-700', solidBg: 'bg-purple-600' },
            'bg-red-500': { bg: 'bg-red-500/30', text: 'text-red-300', border: 'border-red-500/50', gradient: 'from-red-500 to-red-600', solidBg: 'bg-red-500' },
            'bg-cyan-500': { bg: 'bg-cyan-500/30', text: 'text-cyan-300', border: 'border-cyan-500/50', gradient: 'from-cyan-500 to-blue-500', solidBg: 'bg-cyan-500' },
            'bg-orange-500': { bg: 'bg-orange-500/30', text: 'text-orange-300', border: 'border-orange-500/50', gradient: 'from-orange-500 to-orange-600', solidBg: 'bg-orange-500' },
            'bg-orange-600': { bg: 'bg-orange-600/30', text: 'text-orange-300', border: 'border-orange-600/50', gradient: 'from-orange-600 to-orange-700', solidBg: 'bg-orange-600' },
            'bg-yellow-600': { bg: 'bg-yellow-600/30', text: 'text-yellow-300', border: 'border-yellow-600/50', gradient: 'from-yellow-600 to-yellow-700', solidBg: 'bg-yellow-600' },
            'bg-yellow-400': { bg: 'bg-yellow-400/30', text: 'text-yellow-300', border: 'border-yellow-400/50', gradient: 'from-yellow-400 to-yellow-500', solidBg: 'bg-yellow-400' },
            'bg-pink-500': { bg: 'bg-pink-500/30', text: 'text-pink-300', border: 'border-pink-500/50', gradient: 'from-pink-500 to-pink-600', solidBg: 'bg-pink-500' },
            'bg-teal-500': { bg: 'bg-teal-500/30', text: 'text-teal-300', border: 'border-teal-500/50', gradient: 'from-teal-500 to-teal-600', solidBg: 'bg-teal-500' },
            'bg-lime-500': { bg: 'bg-lime-500/30', text: 'text-lime-300', border: 'border-lime-500/50', gradient: 'from-lime-500 to-lime-600', solidBg: 'bg-lime-500' },
            'bg-emerald-500': { bg: 'bg-emerald-500/30', text: 'text-emerald-300', border: 'border-emerald-500/50', gradient: 'from-emerald-500 to-green-500', solidBg: 'bg-emerald-500' },
            'bg-indigo-500': { bg: 'bg-indigo-500/30', text: 'text-indigo-300', border: 'border-indigo-500/50', gradient: 'from-indigo-500 to-indigo-600', solidBg: 'bg-indigo-500' },
            'bg-violet-500': { bg: 'bg-violet-500/30', text: 'text-violet-300', border: 'border-violet-500/50', gradient: 'from-violet-500 to-violet-600', solidBg: 'bg-violet-500' },
        };

        return colorMap[config.color] || {
            bg: 'bg-gray-500/30',
            text: 'text-gray-300',
            border: 'border-gray-500/50',
            gradient: 'from-gray-500 to-gray-600',
            solidBg: 'bg-gray-500'
        };
    };

    const taskStatusStyle = getStatusStyle(selectedTask.status);

    const handleUpdateVersion = async (versionId: number, field: string, value: any) => {
        if (!onUpdateVersion) return;

        const success = await onUpdateVersion(versionId, field, value);
        if (success) {
            setEditingVersionId(null);
            setEditingField(null);
            setShowStatusMenu(null);
            setShowUserMenu(null);
            setUserSearchTerm('');
        }
    };

    const startEditing = (versionId: number, field: string, currentValue: string) => {
        setEditingVersionId(versionId);
        setEditingField(field);
        setEditValue(currentValue);
    };

    const cancelEditing = () => {
        setEditingVersionId(null);
        setEditingField(null);
        setEditValue('');
        setShowUserMenu(null);
        setUserSearchTerm('');
    };

    const getFilteredUsers = () => {
        if (!userSearchTerm.trim()) return projectUsers;
        return projectUsers.filter(user =>
            user.username.toLowerCase().includes(userSearchTerm.toLowerCase())
        );
    };


    return (
        <div
            className={`
                fixed right-0 top-26 bottom-0
                bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex z-40
                transform transition-transform duration-300 ease-out border-l border-slate-700/30
                ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
            style={{ width: `${rightPanelWidth}px` }}
        >
            {/* Resize Handle */}
            <div
                className="w-2 bg-gradient-to-b from-slate-700/80 via-slate-600/80 to-slate-700/80 hover:from-blue-500 hover:via-blue-400 hover:to-blue-500 cursor-col-resize transition-all duration-300 shadow-lg"
                onMouseDown={onResize}
            />

            {/* Panel Content */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/60 shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-5">

                            {/* Thumbnail */}
                            <div className="relative group shrink-0">
                                {selectedTask.file_url ? (
                                    <img
                                        src={selectedTask.file_url}
                                        alt=""
                                        className="w-28 h-28 object-cover rounded-2xl shadow-2xl 
                        ring-2 ring-slate-600/60 
                        group-hover:ring-blue-500/80 group-hover:scale-105
                        transition-all duration-300"
                                    />
                                ) : (
                                    <div className="w-28 h-28 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-800 to-slate-700 ring-2 ring-slate-700/60 shadow-xl">
                                        <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center shadow-inner">
                                            <Image className="w-6 h-6 text-slate-500" />
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 rounded-2xl 
                    bg-gradient-to-t from-black/30 via-transparent to-transparent
                    opacity-0 group-hover:opacity-100 
                    transition-all duration-300" />
                            </div>

                            {/* Info */}
                            <div className="flex flex-col gap-2.5">

                                {/* Task Name */}
                                <h2 className="text-xl md:text-2xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">
                                    {selectedTask?.task_name.split('/').pop()?.trim()}
                                </h2>

                                {/* Status + Description + Due */}
                                <div className="flex flex-col gap-2.5">

                                    {/* Status */}
                                    <div className='flex items-center gap-3'>
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status:</span>
                                        <span className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide ${taskStatusStyle.text} ${taskStatusStyle.bg} border ${taskStatusStyle.border} w-fit shadow-lg backdrop-blur-sm`}>
                                            {selectedTask.status}
                                        </span>
                                    </div>

                                    {/* Pipeline Step */}
                                    <div className='flex items-center gap-3'>
                                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pipeline:</span>
                                        {selectedTask.pipeline_step ? (
                                            <div
                                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide w-fit flex items-center gap-2.5 shadow-lg backdrop-blur-sm"
                                                style={{
                                                    backgroundColor: `${selectedTask.pipeline_step.color_hex}20`,
                                                    borderColor: `${selectedTask.pipeline_step.color_hex}60`,
                                                    color: selectedTask.pipeline_step.color_hex,
                                                    border: '2px solid'
                                                }}
                                            >
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                                                    style={{
                                                        backgroundColor: selectedTask.pipeline_step.color_hex,
                                                        boxShadow: `0 0 8px ${selectedTask.pipeline_step.color_hex}80, 0 0 12px ${selectedTask.pipeline_step.color_hex}40`
                                                    }}
                                                />
                                                {selectedTask.pipeline_step.step_name}
                                            </div>
                                        ) : (
                                            <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide text-slate-500 bg-slate-700/40 border-2 border-slate-600/50 w-fit italic shadow-lg">
                                                ไม่ระบุ
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {selectedTask.description && (
                                        <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 px-4 py-2.5 rounded-xl max-w-xl shadow-lg border border-slate-600/30 backdrop-blur-sm">
                                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2" title={selectedTask.description}>
                                                <span className="font-bold text-slate-200">Description:</span> {selectedTask.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Due Date */}
                                    <div className="flex items-center gap-2.5 text-sm text-white bg-gradient-to-r from-slate-700/60 to-slate-600/60 px-4 py-2 rounded-xl w-fit shadow-lg border border-slate-600/30 backdrop-blur-sm">
                                        <Calendar className="w-4 h-4 opacity-90 flex-shrink-0 drop-shadow" />
                                        <span className="whitespace-nowrap font-semibold tracking-wide">
                                            ครบกำหนด {formatDateThai(selectedTask.due_date)}
                                        </span>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2.5 transition-all duration-300 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-red-600 hover:to-red-700 rounded-2xl self-start shadow-lg hover:shadow-xl hover:scale-110"
                        >
                            <X className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-t border-slate-700/40">
                        <button
                            onClick={() => onTabChange('notes')}
                            className={`flex items-center gap-2.5 px-7 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'notes'
                                ? 'text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 bg-gradient-to-r from-slate-800 to-slate-700'
                                }`}
                        >
                            <Edit3 className="w-4 h-4" />
                            <span>Notes</span>
                            {activeTab === 'notes' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 shadow-lg shadow-blue-500/50"></div>
                            )}
                        </button>
                        <button
                            onClick={() => onTabChange('versions')}
                            className={`flex items-center gap-2.5 px-7 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'versions'
                                ? 'text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 bg-gradient-to-r from-slate-800 to-slate-700'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            <span>Versions</span>
                            {activeTab === 'versions' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 shadow-lg shadow-blue-500/50"></div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                    {activeTab === 'notes' && (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Write a note..."
                                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700/60 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-lg backdrop-blur-sm"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Type to filter"
                                    className="px-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all shadow-lg backdrop-blur-sm"
                                />
                                <select className="px-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer shadow-lg backdrop-blur-sm">
                                    <option>Any label</option>
                                </select>
                                <select className="px-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer shadow-lg backdrop-blur-sm">
                                    <option>Any time</option>
                                </select>
                                <select className="px-4 py-2.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer shadow-lg backdrop-blur-sm">
                                    <option>Any note</option>
                                </select>
                            </div>
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700/60 shadow-xl backdrop-blur-sm">
                                <FileText className="w-20 h-20 mb-4 text-slate-600 drop-shadow-lg" strokeWidth={1.5} />
                                <p className="text-sm font-semibold tracking-wide">No notes</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'versions' && (
                        <div className="space-y-4">

                            {isLoadingVersions ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6 shadow-2xl shadow-blue-500/30"></div>
                                    <span className="text-slate-300 text-sm font-semibold tracking-wide">กำลังโหลด versions...</span>
                                </div>
                            ) : taskVersions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700/60 shadow-xl backdrop-blur-sm">
                                    <Package className="w-24 h-24 mb-6 text-slate-600 drop-shadow-2xl" strokeWidth={1.5} />
                                    <p className="text-base font-bold mb-2 tracking-wide">No versions yet</p>
                                    <p className="text-xs text-slate-600 mb-6">Upload your first version below</p>
                                    <button
                                        onClick={() => setShowAddVersionModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200 mb-2"
                                    >
                                        <span className="text-lg leading-none">+</span>
                                        Add Version
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Add Version Button */}
                                    <button
                                        onClick={() => setShowAddVersionModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200 mb-2"
                                    >
                                        <span className="text-lg leading-none">+</span>
                                        Add Version
                                    </button>

                                    {taskVersions.map((version, index) => {
                                        const versionStatusStyle = getStatusStyle(version.status);

                                        return (
                                            // ⭐ เพิ่ม onContextMenu ที่ version card
                                            <div
                                                key={version.id}
                                                onContextMenu={(e) => handleVersionContextMenu(e, version)}
                                                className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-visible border border-gray-700/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 group"
                                            >
                                                <div className="flex gap-2 p-2">
                                                    {/* รูปภาพ */}
                                                    <div className="relative w-48 h-32 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden rounded-lg">
                                                        {version.file_url ? (
                                                            <img
                                                                src={version.file_url}
                                                                alt={`Version ${version.version_number}`}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                        ) : null}
                                                        <div className={`${version.file_url ? 'hidden' : ''} absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 ring-1 ring-gray-700`}>
                                                            <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-gray-600" />
                                                            </div>
                                                        </div>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                        {/* Version Badge */}
                                                        {index === 0 && (
                                                            <div className="absolute top-2 right-2 animate-pulse bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-0.5 rounded-full text-xs text-white font-bold shadow-lg uppercase tracking-wide">
                                                                Current
                                                            </div>
                                                        )}

                                                        {/* Status Bar */}
                                                        <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${versionStatusStyle.gradient}`}></div>
                                                    </div>

                                                    {/* ข้อมูล */}
                                                    <div className="flex-1 min-w-0 space-y-2.5">
                                                        {/* Header Row: Version Name + Status */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            {/* Version Name - Editable */}
                                                            {editingVersionId === version.id && editingField === 'version_name' ? (
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => {
                                                                        if (editValue.trim() && editValue !== (version.version_name || `Version ${version.version_number}`)) {
                                                                            handleUpdateVersion(version.id, 'version_name', editValue.trim());
                                                                        } else {
                                                                            cancelEditing();
                                                                        }
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.currentTarget.blur();
                                                                        } else if (e.key === 'Escape') {
                                                                            cancelEditing();
                                                                        }
                                                                    }}
                                                                    className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none"
                                                                />
                                                            ) : (
                                                                <div
                                                                    onClick={() => startEditing(version.id, 'version_name', version.version_name || `Version ${version.version_number}`)}
                                                                    className="flex-1 text-sm text-white font-semibold truncate cursor-pointer hover:text-blue-400 transition-colors"
                                                                    title="คลิกเพื่อแก้ไข"
                                                                >
                                                                    {version.version_name || `Version ${version.version_number}`}
                                                                </div>
                                                            )}

                                                            {/* Status Badge */}
                                                            <div className="relative flex-shrink-0">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowStatusMenu(showStatusMenu === version.id ? null : version.id);
                                                                    }}
                                                                    className={`px-2.5 py-1 rounded-lg text-md font-bold tracking-wide shadow-lg bg-gradient-to-r ${versionStatusStyle.gradient} text-white hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap`}
                                                                >
                                                                    {statusConfig[version.status as StatusType]?.label || version.status}
                                                                </button>

                                                                {/* Status Dropdown */}
                                                                {showStatusMenu === version.id && (
                                                                    <>
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setShowStatusMenu(null);
                                                                            }}
                                                                        />
                                                                        <div className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-2xl z-[100] min-w-[180px] max-h-[300px] overflow-y-auto border border-blue-500/40">
                                                                            {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                                <button
                                                                                    key={key}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleUpdateVersion(version.id, 'status', key);
                                                                                    }}
                                                                                    className="flex items-center gap-3 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500"
                                                                                >
                                                                                    {config.icon === '-' ? (
                                                                                        <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                                    ) : (
                                                                                        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                                                                    )}
                                                                                    <div className="text-xs text-gray-200 flex items-center gap-3">
                                                                                        <span className="inline-block w-8">{config.label}</span>
                                                                                        <span className="text-[10px]">{config.fullLabel}</span>
                                                                                    </div>
                                                                                    {version.status === key && (
                                                                                        <span className="ml-auto text-blue-400">✓</span>
                                                                                    )}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Description - Editable */}
                                                        {editingVersionId === version.id && editingField === 'description' ? (
                                                            <textarea
                                                                autoFocus
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                onBlur={() => {
                                                                    handleUpdateVersion(version.id, 'description', editValue.trim());
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        e.currentTarget.blur();
                                                                    } else if (e.key === 'Escape') {
                                                                        cancelEditing();
                                                                    }
                                                                }}
                                                                rows={2}
                                                                className="w-full px-2 py-1 bg-gray-800 border border-blue-500 rounded text-gray-300 text-xs outline-none resize-none"
                                                            />
                                                        ) : (
                                                            <div
                                                                onClick={() => startEditing(version.id, 'description', version.description || '')}
                                                                className="text-xs text-gray-400 line-clamp-2 leading-relaxed cursor-pointer hover:text-gray-300 transition-colors min-h-[2rem]"
                                                                title={version.description ? "คลิกเพื่อแก้ไข" : "คลิกเพื่อเพิ่มคำอธิบาย"}
                                                            >
                                                                {version.description || 'คลิกเพื่อเพิ่มคำอธิบาย...'}
                                                            </div>
                                                        )}

                                                        {/* Meta Info Row */}
                                                        <div className="flex items-center gap-4 text-xs flex-wrap text-slate-50">
                                                            {/* Uploaded By */}
                                                            <div className="flex items-center gap-1.5 relative">
                                                                <User className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowUserMenu(showUserMenu === version.id ? null : version.id);
                                                                        setUserSearchTerm('');
                                                                    }}
                                                                    className="truncate hover:text-blue-200 transition-colors cursor-pointer underline bg-gradient-to-br from-gray-500 to-gray-600 hover:from-blue-600 hover:to-blue-700 rounded-xl"
                                                                    title="คลิกเพื่อเปลี่ยนผู้อัปโหลด"
                                                                >
                                                                    {version.uploaded_by_name || 'Unknown'}
                                                                </button>

                                                                {/* User Dropdown */}
                                                                {showUserMenu === version.id && (
                                                                    <div className="absolute top-full left-0 mt-2 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 rounded-xl shadow-2xl z-[100] w-72 border border-slate-600/50 overflow-hidden ring-1 ring-white/5">
                                                                        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700/50">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <User className="w-4 h-4 text-slate-400" />
                                                                                <span className="text-sm font-semibold text-slate-200">
                                                                                    เลือกผู้อัปโหลด
                                                                                </span>
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                placeholder="ค้นหาชื่อ..."
                                                                                value={userSearchTerm}
                                                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                                                            />
                                                                        </div>
                                                                        <div className="max-h-64 overflow-y-auto">
                                                                            {getFilteredUsers().length === 0 ? (
                                                                                <div className="p-4 text-center text-slate-500 text-sm">
                                                                                    ไม่พบผู้ใช้
                                                                                </div>
                                                                            ) : (
                                                                                getFilteredUsers().map((user) => (
                                                                                    <button
                                                                                        key={user.id}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateVersion(version.id, 'uploaded_by', user.id);
                                                                                        }}
                                                                                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                                    >
                                                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${version.uploaded_by === user.id
                                                                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-400/50'
                                                                                            : 'bg-gradient-to-br from-slate-600 to-slate-700 text-white'
                                                                                            }`}>
                                                                                            {user.username[0].toUpperCase()}
                                                                                        </div>
                                                                                        <span className="flex-1 text-sm font-medium text-slate-200">
                                                                                            {user.username}
                                                                                        </span>
                                                                                        {version.uploaded_by === user.id && (
                                                                                            <span className="text-blue-400 text-sm">✓</span>
                                                                                        )}
                                                                                    </button>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* File size */}
                                                            {version.file_size && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <File className="w-3.5 h-3.5" />
                                                                    <span>{(version.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                                                </div>
                                                            )}

                                                            {/* Date */}
                                                            <div className="flex items-center gap-1.5">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span>{formatDateThai(version.created_at)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

               {/* ⭐ Context Menu (Right-Click Menu) */}
            {contextMenu && (
                <div
                    className="fixed z-[150] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                versionId: contextMenu.version.id,
                                versionName: contextMenu.version.version_name || `Version ${contextMenu.version.version_number}`,
                            });
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                    >
                        🗑️ Delete Version
                    </button>
                </div>
            )}

            {/* ⭐ Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                                    <span className="text-3xl">⚠️</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">
                                        Delete Version
                                    </h3>
                                    <p className="text-sm text-zinc-400">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">
                                    Are you sure you want to delete this version?
                                </p>
                                <p className="font-semibold text-zinc-100 truncate">
                                    "{deleteConfirm.versionName}"
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={isDeletingVersion}
                                    className="px-4 py-2 rounded-lg bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700 transition-colors font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteVersion(deleteConfirm.versionId)}
                                    disabled={isDeletingVersion}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isDeletingVersion && (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {isDeletingVersion ? 'Deleting...' : 'Delete Version'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Version Modal */}
            {showAddVersionModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddVersionModal(false)}
                    />
                    <div className="relative bg-gradient-to-br from-[#1e2128] to-[#24272f] rounded-2xl border border-gray-700/60 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 bg-[#1a1d24]">
                            <div className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-semibold text-base">Add New Version</span>
                            </div>
                            <button
                                onClick={() => setShowAddVersionModal(false)}
                                className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                    Version Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. v1 - First Draft"
                                    value={addVersionForm.version_name}
                                    onChange={(e) => setAddVersionForm(f => ({ ...f, version_name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">File URL</label>
                                <input
                                    type="text"
                                    placeholder="https://... (optional)"
                                    value={addVersionForm.file_url}
                                    onChange={(e) => setAddVersionForm(f => ({ ...f, file_url: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Description</label>
                                <textarea
                                    placeholder="What changed in this version..."
                                    value={addVersionForm.description}
                                    onChange={(e) => setAddVersionForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</label>
                                    <select
                                        value={addVersionForm.status}
                                        onChange={(e) => setAddVersionForm(f => ({ ...f, status: e.target.value as StatusType }))}
                                        className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all cursor-pointer"
                                    >
                                        {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string }][]).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label} – {cfg.fullLabel}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Uploaded By</label>
                                    <select
                                        value={addVersionForm.uploaded_by}
                                        onChange={(e) => setAddVersionForm(f => ({ ...f, uploaded_by: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all cursor-pointer"
                                    >
                                        <option value={0}>— Select user —</option>
                                        {projectUsers.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700/50 bg-[#1a1d24]">
                            <button
                                onClick={() => setShowAddVersionModal(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddVersion}
                                disabled={isUploadingVersion || !addVersionForm.version_name.trim()}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all"
                            >
                                {isUploadingVersion ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Package className="w-4 h-4" />
                                )}
                                {isUploadingVersion ? 'Adding...' : 'Add Version'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

         
        </div>
    );
};

export default RightPanel;