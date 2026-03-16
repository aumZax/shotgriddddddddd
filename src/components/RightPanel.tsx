import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Edit3, Package, User, File, Clock, FileText, Trash2, Check, Eye } from 'lucide-react';
import axios from 'axios';
import ENDPOINTS from '../config';
import { useNavigate } from 'react-router-dom';

// Types
type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: "wtg", fullLabel: "Waiting to Start", color: "bg-gray-600", icon: '-' },
    ip: { label: "ip", fullLabel: "In Progress", color: "bg-blue-500", icon: 'dot' },
    fin: { label: "fin", fullLabel: "Final", color: "bg-green-500", icon: 'dot' },
    na: { label: "na", fullLabel: "N/A", color: "bg-gray-400", icon: '-' },
    rev: { label: "rev", fullLabel: "Pending Review", color: "bg-yellow-600", icon: 'dot' },
    vwd: { label: "vwd", fullLabel: "Viewed", color: "bg-teal-500", icon: 'dot' },
    apr: { label: "apr", fullLabel: "Approved", color: "bg-green-500", icon: 'dot' },
    nef: { label: "nef", fullLabel: "Need fixed", color: "bg-red-500", icon: 'dot' },
    cmpt: { label: "cmpt", fullLabel: "Complete", color: "bg-blue-600", icon: 'dot' },
    crv: { label: "crv", fullLabel: "Client review", color: "bg-purple-600", icon: 'dot' },
    cfrm: { label: "cfrm", fullLabel: "Confirmed", color: "bg-purple-500", icon: 'dot' },
    dlvr: { label: "dlvr", fullLabel: "Delivered", color: "bg-cyan-500", icon: 'dot' },
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
    reviewers?: TaskReviewer[];
    pipeline_step?: PipelineStep | null;
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
    uploaded_by: number | null;
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
    onDeleteVersionSuccess?: (newThumbnail?: string | null) => void;
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
    const navigate = useNavigate();
    // ✅ FIX 1: hooks ทั้งหมดต้องอยู่บนสุด ก่อน early return ทุกกรณี
    const [editingVersionId, setEditingVersionId] = React.useState<number | null>(null);
    const [editingField, setEditingField] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState<string>('');
    const [showStatusMenu, setShowStatusMenu] = React.useState<number | null>(null);
    const [showUserMenu, setShowUserMenu] = React.useState<number | null>(null);
    const [userSearchTerm, setUserSearchTerm] = React.useState<string>('');
    const [showAddVersionModal, setShowAddVersionModal] = React.useState(false);
    const [isUploadingVersion, setIsUploadingVersion] = React.useState(false);
    // Allow URL query params / hashes (e.g. video.mp4?token=...) to still be recognized as video
    const isVideo = (url?: string) => !!url?.match(/\.(mp4|webm|ogg|mov|avi)([\?#].*)?$/i);
    const [allPeople, setAllPeople] = React.useState<{ id: number; name: string; email: string }[]>([]);
    const [uploaderQuery, setUploaderQuery] = React.useState('');
    const [uploaderOpen, setUploaderOpen] = React.useState(false);
    const [selectedUploader, setSelectedUploader] = React.useState<{ id: number; name: string } | null>(null);
    const [versionFile, setVersionFile] = React.useState<File | null>(null);
    const [versionFilePreview, setVersionFilePreview] = React.useState<string>('');
    const [isDragging, setIsDragging] = React.useState(false);
    const [uploaderDropdownPos, setUploaderDropdownPos] = React.useState({ top: 0, left: 0, width: 0 });
    const uploaderInputRef = React.useRef<HTMLDivElement>(null);


    const [showAddNoteModal, setShowAddNoteModal] = React.useState(false);
    const [addNoteForm, setAddNoteForm] = React.useState({ subject: '', body: '', type: 'Internal' as 'Client' | 'Internal' });
    const [isCreatingNote, setIsCreatingNote] = React.useState(false);

    const [noteAssignees, setNoteAssignees] = React.useState<{ id: number; name: string }[]>([]);
    const [noteAssigneeQuery, setNoteAssigneeQuery] = React.useState('');
    const [noteAssigneeOpen, setNoteAssigneeOpen] = React.useState(false);
    const [noteAssigneeDropdownPos, setNoteAssigneeDropdownPos] = React.useState({ top: 0, left: 0, width: 0 });
    const noteAssigneeInputRef = React.useRef<HTMLDivElement>(null);

    const currentUser = localStorage.getItem('currentUser') || 'Manager';
    const projectData = JSON.parse(localStorage.getItem('projectData') || 'null');

    const [noteFiles, setNoteFiles] = React.useState<File[]>([]);

    const projectId = projectData?.projectId;

    const [addVersionForm, setAddVersionForm] = React.useState({
        version_name: '',
        description: '',
        status: 'wtg' as StatusType,
        file_size: 0,
    });




    const [noteContextMenu, setNoteContextMenu] = React.useState<{
        visible: boolean;
        x: number;
        y: number;
        note: any;
    } | null>(null);

    const [deleteNoteConfirm, setDeleteNoteConfirm] = React.useState<{
        noteId: number;
        subject: string;
    } | null>(null);

    const [isDeletingNote, setIsDeletingNote] = React.useState(false);

    const handleDeleteNote = async (noteId: number) => {
        if (!selectedTask) return; // เพิ่มบรรทัดนี้
        setIsDeletingNote(true);
        try {
            await axios.delete(`${ENDPOINTS.DELETE_NOTE}/${noteId}`);
            setDeleteNoteConfirm(null);
            const res = await fetch(ENDPOINTS.GET_TASK_NOTES_RIGHTPANEL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: selectedTask.id }),
            });
            const data = await res.json();
            setTaskNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('❌ Delete note failed:', err);
            alert('ไม่สามารถลบ Note ได้');
        } finally {
            setIsDeletingNote(false);
        }
    };











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


    const [taskNotes, setTaskNotes] = React.useState<any[]>([]);
    const [isLoadingNotes, setIsLoadingNotes] = React.useState(false);

    React.useEffect(() => {
        if (!selectedTask) return;
        setIsLoadingNotes(true);
        fetch(ENDPOINTS.GET_TASK_NOTES_RIGHTPANEL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: selectedTask.id }),
        })
            .then(r => r.json())
            .then(data => setTaskNotes(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setIsLoadingNotes(false));
    }, [selectedTask?.id]);


    React.useEffect(() => {
        if (!noteContextMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-note-context-menu="true"]') ||
                target.closest('[data-delete-note-confirm="true"]')) return;
            setNoteContextMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [noteContextMenu]);


    React.useEffect(() => {
        fetch(ENDPOINTS.GETALLPEOPLE)
            .then(r => r.json())
            .then(data => setAllPeople(data))
            .catch(console.error);
    }, []);


    // Close context menu only if click is outside of it
    React.useEffect(() => {
        if (!contextMenu) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking inside context menu or delete confirm modal
            if (target.closest('[data-context-menu="true"]') ||
                target.closest('[data-delete-confirm="true"]')) {
                return;
            }
            setContextMenu(null);
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [contextMenu]);

    // ✅ FIX 1: early return หลัง hooks ทั้งหมดเท่านั้น
    if (!selectedTask) return null;

    // ✅ FIX 3: ใช้ createPortal เพื่อ render context menu ออกนอก overflow:hidden
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



    // ✅ handleDeleteVersion - เรียก callback ตรงๆ เช่นกัน
const handleDeleteVersion = async (versionId: number) => {
    setIsDeletingVersion(true);
    try {
        const entityType = selectedTask?.entity_type;
        const entityId = selectedTask?.entity_id;

        let newThumbnail: string | null = null;

        if (entityType === 'asset' && entityId) {
            const res = await axios.delete(
                `${ENDPOINTS.DELETE_ASSET_VERSION}/${versionId}`,
                { data: { entityId } }
            );
            newThumbnail = res.data?.newThumbnail ?? null;
        } else if (entityType === 'shot' && entityId) {
            const res = await axios.delete(
                `${ENDPOINTS.DELETE_SHOT_VERSION}/${versionId}`,
                { data: { entityId } }
            );
            newThumbnail = res.data?.newThumbnail ?? null;
        } else {
            await axios.delete(ENDPOINTS.DELETE_VERSION, {
                data: { versionId },
            });
        }

        setDeleteConfirm(null);
        onDeleteVersionSuccess?.(newThumbnail);
    } catch (err) {
        alert("ไม่สามารถลบ Version ได้");
    } finally {
        setIsDeletingVersion(false);
    }
};
    // ✅ handleAddVersion - เรียก callback ตรงๆ ไม่ต้อง await refreshTaskVersions
    const handleAddVersion = async () => {
        if (!selectedTask || !addVersionForm.version_name.trim()) return;
        if (!selectedUploader) {
            alert('กรุณาระบุผู้อัปโหลด');
            return;
        }

        // ตรวจสอบชื่อซ้ำ
        const baseName = addVersionForm.version_name.trim();
        const isDuplicate = taskVersions.some(
            v => v.version_name?.trim().toLowerCase() === baseName.toLowerCase()
        );

        let finalVersionName = baseName;

        if (isDuplicate) {
            const duplicateCount = taskVersions.filter(v => {
                const stripped = v.version_name?.replace(/\s\(\d+\)$/, '').trim().toLowerCase();
                return stripped === baseName.toLowerCase();
            }).length;
            finalVersionName = `${baseName} (${duplicateCount + 1})`;
        }

        setIsUploadingVersion(true);
        try {
            let fileUrl: string | undefined = undefined;
            let fileId: string | undefined = undefined;

            if (versionFile) {
                const formData = new FormData();
                formData.append('file', versionFile);
                formData.append('fileName', versionFile.name);
                formData.append('type', 'version');

                let uploadEndpoint = '';
                if (selectedTask.entity_type === 'shot') {
                    formData.append('shotId', selectedTask.entity_id.toString());
                    uploadEndpoint = ENDPOINTS.UPLOAD_SHOT;
                } else {
                    formData.append('assetId', selectedTask.entity_id.toString());
                    uploadEndpoint = ENDPOINTS.UPLOAD_ASSET;
                }

                const uploadRes = await fetch(uploadEndpoint, {
                    method: 'POST',
                    body: formData,
                });
                if (!uploadRes.ok) throw new Error('Upload failed');
                const uploadData = await uploadRes.json();

                fileUrl = uploadData?.files?.[0]?.fileUrl ?? uploadData?.file?.fileUrl;
                fileId = uploadData?.files?.[0]?.id?.toString() ?? uploadData?.file?.id?.toString();
            }

            await axios.post(`${ENDPOINTS.ADD_VERSION_TASK}`, {
                task_id: selectedTask.id,
                version_name: finalVersionName, // ← ใช้ชื่อที่ตรวจแล้ว
                description: addVersionForm.description.trim() || undefined,
                file_url: fileUrl,
                file_id: fileId,
                status: addVersionForm.status,
                uploaded_by: selectedUploader.id,
                file_size: versionFile?.size || undefined,
            });

            setShowAddVersionModal(false);
            setAddVersionForm({ version_name: '', description: '', status: 'wtg', file_size: 0 });
            setVersionFile(null);
            setVersionFilePreview('');
            setSelectedUploader(null);
            setUploaderQuery('');
            onAddVersionSuccess?.();
        } catch (err) {
            console.error('❌ Add version error:', err);
            alert('ไม่สามารถสร้าง version ได้');
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

    const handleAddNote = async () => {
        if (!selectedTask || !addNoteForm.subject.trim()) return;
        setIsCreatingNote(true);
        try {
            // ✅ เพิ่มส่วนนี้: อัพโหลดไฟล์ก่อน
            let uploadedFileUrl: string | null = null;
            const fileToUpload = noteFiles[0];

            if (fileToUpload) {
                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append('fileName', fileToUpload.name);
                formData.append('type', 'note');

                let uploadEndpoint = '';
                if (selectedTask.entity_type === 'shot') {
                    formData.append('shotId', selectedTask.entity_id.toString());
                    uploadEndpoint = ENDPOINTS.UPLOAD_SHOT;
                } else {
                    formData.append('assetId', selectedTask.entity_id.toString());
                    uploadEndpoint = ENDPOINTS.UPLOAD_ASSET;
                }

                const uploadRes = await fetch(uploadEndpoint, { method: 'POST', body: formData });
                if (!uploadRes.ok) throw new Error('File upload failed');
                const uploadData = await uploadRes.json();
                uploadedFileUrl = uploadData?.files?.[0]?.fileUrl ?? uploadData?.file?.fileUrl ?? null;
            }

            // ส่วนที่เหลือเหมือนเดิม แค่เพิ่ม fileUrl
            await fetch(ENDPOINTS.CREATE_SHOT_NOTE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: projectId ?? null,
                    noteType: selectedTask.entity_type,
                    typeId: selectedTask.entity_id,
                    subject: addNoteForm.subject.trim(),
                    body: addNoteForm.body,
                    fileUrl: uploadedFileUrl, // ✅ เพิ่มบรรทัดนี้
                    author: currentUser,
                    status: 'opn',
                    visibility: addNoteForm.type,
                    tasks: [selectedTask.id],
                    assignedPeople: noteAssignees.length > 0 ? noteAssignees.map(p => p.id) : null,
                })
            });

            setShowAddNoteModal(false);
            setAddNoteForm({ subject: '', body: '', type: 'Internal' });
            setNoteAssignees([]);
            setNoteAssigneeQuery('');
            setNoteFiles([]); // ✅ reset files
            // refresh notes...
            const res = await fetch(ENDPOINTS.GET_TASK_NOTES_RIGHTPANEL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: selectedTask.id }),
            });
            const data = await res.json();
            setTaskNotes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Create note error:', err);
            alert('ไม่สามารถสร้าง note ได้');
        } finally {
            setIsCreatingNote(false);
        }
    };

    return (
        <>
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
                        <div className="flex items-start justify-between px-5 py-4 gap-3">
                            <div className="flex flex-col gap-2 min-w-0 flex-1">

                                {/* Task Name */}
                                <h2 className="text-lg font-bold text-white leading-tight tracking-tight truncate">
                                    {selectedTask?.task_name.split('/').pop()?.trim()}
                                </h2>

                                {/* Status + Pipeline */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${taskStatusStyle.text} ${taskStatusStyle.bg} border ${taskStatusStyle.border} shadow`}>
                                        {selectedTask.status}
                                    </span>
                                    {selectedTask.pipeline_step ? (
                                        <div
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border-2"
                                            style={{
                                                backgroundColor: `${selectedTask.pipeline_step.color_hex}20`,
                                                borderColor: `${selectedTask.pipeline_step.color_hex}60`,
                                                color: selectedTask.pipeline_step.color_hex,
                                            }}
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: selectedTask.pipeline_step.color_hex }}
                                            />
                                            {selectedTask.pipeline_step.step_name}
                                        </div>
                                    ) : (
                                        <span className="px-2.5 py-1 rounded-lg text-xs text-slate-500 bg-slate-700/40 border border-slate-600/50 italic">ไม่ระบุ</span>
                                    )}
                                </div>

                                {/* Due Date */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>ครบกำหนด {formatDateThai(selectedTask.due_date)}</span>
                                </div>

                                {/* Description */}
                                {selectedTask.description && (
                                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap break-words max-w-sm" title={selectedTask.description}>
                                        {selectedTask.description}
                                    </p>
                                )}
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
                            <div className="space-y-3">



                                {isLoadingNotes ? (
                                    <div className="flex justify-center py-10">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : taskNotes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/40 rounded-2xl border-2 border-dashed border-slate-700/60 shadow-xl backdrop-blur-sm">
                                        <FileText className="w-16 h-16 mb-3 text-slate-600" strokeWidth={1.5} />
                                        <p className="text-sm font-semibold mb-4">No notes linked to this task</p>
                                        <button
                                            onClick={() => setShowAddNoteModal(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200"
                                        >
                                            <span className="text-lg leading-none">+</span>
                                            Add Note
                                        </button>

                                    </div>
                                ) : (
                                    <><button
                                        onClick={() => setShowAddNoteModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200 mb-2"
                                    >
                                        <span className="text-lg leading-none">+</span>
                                        Add Note
                                    </button>


                                        {taskNotes.map(note => {
                                            const isUnread = note.read_status !== 'read';
                                            const handleNoteClick = async () => {
                                                const newStatus = isUnread ? 'read' : 'unread';
                                                setTaskNotes(prev =>
                                                    prev.map(n => n.id === note.id ? { ...n, read_status: newStatus } : n)
                                                );
                                                try {
                                                    await fetch(`${ENDPOINTS.EDIT_NOTE}/${note.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ field: 'read_status', value: newStatus }),
                                                    });
                                                } catch (err) {
                                                    console.error('mark read failed:', err);
                                                    setTaskNotes(prev =>
                                                        prev.map(n => n.id === note.id ? { ...n, read_status: isUnread ? 'unread' : 'read' } : n)
                                                    );
                                                }
                                            };

                                            return (
                                                <div
                                                    key={note.id}
                                                    onClick={handleNoteClick}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setNoteContextMenu({
                                                            visible: true,
                                                            x: e.clientX,
                                                            y: e.clientY,
                                                            note,
                                                        });
                                                    }}
                                                    className={`rounded-xl p-4 border space-y-2 transition-all cursor-pointer${isUnread
                                                        ? 'bg-slate-800/80 border-blue-500/40 shadow-md shadow-blue-500/10'
                                                        : 'bg-slate-800/40 border-slate-700/40 opacity-70'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {/* dot indicator */}
                                                            {isUnread && (
                                                                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 mt-0.5 animate-pulse" />
                                                            )}
                                                            <p className="text-sm font-semibold text-white truncate">{note.subject}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            {/* read badge */}
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium${isUnread
                                                                ? 'bg-amber-500/20 text-amber-300'
                                                                : 'bg-sky-500/20 text-sky-300'
                                                                }`}>
                                                                {isUnread ? 'unread' : 'read'}
                                                            </span>
                                                            {/* visibility badge */}
                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium
                                    ${note.visibility === 'Client'
                                                                    ? 'bg-purple-500/20 text-purple-300'
                                                                    : 'bg-blue-500/20 text-blue-300'
                                                                }`}>
                                                                {note.visibility}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {note.body && <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap break-words">{note.body}</p>}
                                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                                        <span>✍️ {note.author}</span>
                                                        {note.assigned_people?.length > 0 && (
                                                            <span>👥 {note.assigned_people.join(', ')}</span>
                                                        )}
                                                        <span className="ml-auto">{new Date(note.created_at).toLocaleDateString('th-TH')}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                    </>

                                )}
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
                                                <div
                                                    key={version.id}
                                                    onContextMenu={(e) => handleVersionContextMenu(e, version)}
                                                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-visible border border-gray-700/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 group"
                                                >
                                                    <div className="flex gap-2 p-2">
                                                        {/* รูปภาพ */}
                                                        <div className="relative w-48 h-32 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden rounded-lg">
                                                            {version.file_url ? (
                                                                isVideo(version.file_url) ? (
                                                                    <>

                                                                        <video
                                                                            src={ENDPOINTS.image_url + version.file_url}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                                                            muted
                                                                            loop
                                                                            autoPlay
                                                                            onClick={() => {
                                                                                localStorage.setItem("selectedVideo", JSON.stringify({
                                                                                    videoUrl: ENDPOINTS.image_url + version.file_url,
                                                                                    shotCode: selectedTask.task_name,
                                                                                    sequence: selectedTask.entity_type,
                                                                                    status: version.status,
                                                                                    description: version.description || "",
                                                                                    dueDate: "",
                                                                                    shotId: selectedTask.entity_id,
                                                                                    versionId: version.id,
                                                                                    versionName: version.version_name || `Version ${version.version_number}`,
                                                                                    versionStatus: version.status,
                                                                                    versionUploadedBy: version.uploaded_by_name || null,
                                                                                    versionCreatedAt: version.created_at,
                                                                                    versionDescription: version.description || null,
                                                                                }));
                                                                                navigate("/Others_Video");
                                                                            }}
                                                                        />
                                                                        {/* Hover overlay สำหรับ video */}
                                                                        <div
                                                                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 cursor-pointer"
                                                                            onClick={() => {
                                                                                localStorage.setItem("selectedVideo", JSON.stringify({
                                                                                    videoUrl: ENDPOINTS.image_url + version.file_url,
                                                                                    shotCode: selectedTask.task_name,
                                                                                    sequence: selectedTask.entity_type,
                                                                                    status: version.status,
                                                                                    description: version.description || "",
                                                                                    dueDate: "",
                                                                                    shotId: selectedTask.entity_id,
                                                                                    versionId: version.id,
                                                                                    versionName: version.version_name || `Version ${version.version_number}`,
                                                                                    versionStatus: version.status,
                                                                                    versionUploadedBy: version.uploaded_by_name || null,
                                                                                    versionCreatedAt: version.created_at,
                                                                                    versionDescription: version.description || null,
                                                                                }));
                                                                                navigate("/Others_Video");
                                                                            }}
                                                                        >
                                                                            <div className="w-7 h-7 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                                                <Eye className="w-3.5 h-3.5 text-white" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 pointer-events-none" />
                                                                    </>

                                                                ) : (
                                                                    <>
                                                                        <img
                                                                            src={ENDPOINTS.image_url + version.file_url}
                                                                            alt=""
                                                                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-md opacity-60 pointer-events-none"
                                                                            aria-hidden="true"
                                                                        />
                                                                        <img
                                                                            src={ENDPOINTS.image_url + version.file_url}
                                                                            alt={`Version ${version.version_number}`}
                                                                            className="relative w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none';
                                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                            }}
                                                                        />
                                                                    </>
                                                                )
                                                            ) : null}
                                                            <div className={`${version.file_url ? 'hidden' : ''} absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 via-gray-800 to-gray-700 ring-1 ring-gray-700`}>
                                                                <div className="w-10 h-10 rounded-full bg-gray-700/50 flex items-center justify-center">
                                                                    <Package className="w-5 h-5 text-gray-600" />
                                                                </div>
                                                            </div>
                                                            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                            {index === 0 && (
                                                                <div className="absolute top-2 right-2 animate-pulse bg-gradient-to-r from-blue-500 to-blue-600 px-2 py-0.5 rounded-full text-xs text-white font-bold shadow-lg uppercase tracking-wide">
                                                                    Current
                                                                </div>
                                                            )}
                                                            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${versionStatusStyle.gradient}`}></div>
                                                        </div>

                                                        {/* ข้อมูล */}
                                                        <div className="flex-1 min-w-0 space-y-2.5">
                                                            <div className="flex items-start justify-between gap-3">
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
                                                                            if (e.key === 'Enter') e.currentTarget.blur();
                                                                            else if (e.key === 'Escape') cancelEditing();
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
                                                                    {showStatusMenu === version.id && (
                                                                        <>
                                                                            <div onClick={(e) => { e.stopPropagation(); setShowStatusMenu(null); }} />
                                                                            <div className="absolute top-full right-0 mt-2 bg-gray-800 rounded-lg shadow-2xl z-[100] min-w-[180px] max-h-[300px] overflow-y-auto border border-blue-500/40">
                                                                                {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                                    <button
                                                                                        key={key}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleUpdateVersion(version.id, 'status', key);
                                                                                        }}
                                                                                        className="flex items-center gap-3 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500  whitespace-nowrap"
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
                                                                                        {version.status === key && <span className="ml-auto text-blue-400">✓</span>}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Description */}
                                                            {editingVersionId === version.id && editingField === 'description' ? (
                                                                <textarea
                                                                    autoFocus
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    onBlur={() => handleUpdateVersion(version.id, 'description', editValue.trim())}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
                                                                        else if (e.key === 'Escape') cancelEditing();
                                                                    }}
                                                                    rows={2}
                                                                    className="w-full px-2 py-1 bg-gray-800 border border-blue-500 rounded text-gray-300 text-xs outline-none resize-none"
                                                                />
                                                            ) : (
                                                                <div
                                                                    onClick={() => startEditing(version.id, 'description', version.description || '')}
                                                                    className="whitespace-pre-wrap text-xs text-gray-400 line-clamp-2 leading-relaxed cursor-pointer hover:text-gray-300 transition-colors min-h-[2rem]"
                                                                    title={version.description ? "คลิกเพื่อแก้ไข" : "คลิกเพื่อเพิ่มคำอธิบาย"}
                                                                >
                                                                    {version.description || 'คลิกเพื่อเพิ่มคำอธิบาย...'}
                                                                </div>
                                                            )}

                                                            {/* Meta Info */}
                                                            <div className="flex items-center gap-3 text-xs flex-wrap mt-1">

                                                                {/* Uploaded By */}
                                                                <div className="relative flex items-center gap-2 group/uploader-container">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setShowUserMenu(showUserMenu === version.id ? null : version.id);
                                                                            setUserSearchTerm('');
                                                                        }}
                                                                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-gray-600 to-gray-600 hover:from-slate-600 hover:to-slate-600 border border-transparent transition-all"
                                                                        title="คลิกเพื่อเปลี่ยนผู้อัปโหลด"
                                                                    >
                                                                        {version.uploaded_by_name ? (
                                                                            <>
                                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg flex-shrink-0">
                                                                                    {version.uploaded_by_name[0].toUpperCase()}
                                                                                </div>
                                                                                <span className="text-xs text-gray-300 hover:text-white transition-colors">
                                                                                    {version.uploaded_by_name}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                                                                                    <User className="w-3 h-3 text-slate-400" />
                                                                                </div>
                                                                                <span className="text-slate-50 italic text-xs">เลือกผู้อัปโหลด</span>
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    {/* X ลบ — แสดงเมื่อ hover */}
                                                                    {version.uploaded_by_name && (
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleUpdateVersion(version.id, 'uploaded_by', null);
                                                                            }}
                                                                            className="opacity-0 cursor-pointer group-hover/uploader-container:opacity-100 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all duration-150 flex-shrink-0"
                                                                            title="ลบผู้อัปโหลด"
                                                                        >
                                                                            <X className="w-3 h-3 text-white" />
                                                                        </div>
                                                                    )}

                                                                    {/* Dropdown */}
                                                                    {showUserMenu === version.id && (
                                                                        <div className="absolute top-full left-0 mt-1 bg-slate-800 rounded-xl shadow-2xl z-[100] w-64 border border-slate-600/50 overflow-hidden ring-1 ring-white/5">
                                                                            <div className="px-3 py-2.5 bg-gray-800 border-b border-gray-700/50">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                                                    <span className="text-xs font-semibold text-slate-200">เลือกผู้อัปโหลด</span>
                                                                                </div>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="ค้นหาชื่อ..."
                                                                                    value={userSearchTerm}
                                                                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    autoFocus
                                                                                    className="w-full px-2.5 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                                                                />
                                                                            </div>
                                                                            <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                                                                                {getFilteredUsers().length === 0 ? (
                                                                                    <div className="p-3 text-center text-slate-500 text-xs">ไม่พบผู้ใช้</div>
                                                                                ) : (
                                                                                    getFilteredUsers().map((user) => (
                                                                                        <button
                                                                                            key={user.id}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleUpdateVersion(version.id, 'uploaded_by', user.id);
                                                                                                setShowUserMenu(null);
                                                                                                setUserSearchTerm('');
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                                        >
                                                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow ${version.uploaded_by === user.id
                                                                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-2 ring-indigo-400/50'
                                                                                                : 'bg-slate-600 text-slate-200'
                                                                                                }`}>
                                                                                                {user.username[0].toUpperCase()}
                                                                                            </div>
                                                                                            <span className="flex-1 text-xs text-slate-200">{user.username}</span>
                                                                                            {version.uploaded_by === user.id && (
                                                                                                <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                                                            )}
                                                                                        </button>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* File Size */}
                                                                {version.file_size && (
                                                                    <div className="flex items-center gap-1 text-slate-400">
                                                                        <File className="w-3 h-3" />
                                                                        <span>{(version.file_size / 1024 / 1024).toFixed(1)} MB</span>
                                                                    </div>
                                                                )}

                                                                {/* Date */}
                                                                <div className="flex items-center gap-1 text-slate-400">
                                                                    <Clock className="w-3 h-3" />
                                                                    <span>{formatDateThai(version.created_at)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                                }
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ✅ FIX 3: ใช้ createPortal render ออกนอก DOM ของ panel
                ทำให้พ้น overflow:hidden และ z-index ของ panel */}

            {/* Context Menu */}
            {contextMenu && createPortal(
                <div
                    data-context-menu="true"
                    className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                versionId: contextMenu.version.id,
                                versionName: contextMenu.version.version_name || `Version ${contextMenu.version.version_number}`,
                            });
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm rounded-lg transition-colors  bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                    >
                        <Trash2 className="w-5 h-5 text-slate-50" />
                        Delete Version
                    </button>
                </div>,
                document.body
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirm && createPortal(
                <div data-delete-confirm="true" className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />
                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                                    <span className="text-3xl">⚠️</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">Delete Version</h3>
                                    <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">Are you sure you want to delete this version?</p>
                                <p className="font-semibold text-zinc-100 truncate">"{deleteConfirm.versionName}"</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={isDeletingVersion}
                                    className="px-4 py-2 rounded-lg text-zinc-200 transition-colors font-medium disabled:opacity-50 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteVersion(deleteConfirm.versionId)}
                                    disabled={isDeletingVersion}
                                    className="px-4 py-2 rounded-lg text-white transition-colors font-medium disabled:opacity-50 flex items-center gap-2 bg-gradient-to-r from-red-800 to-red-800 hover:from-red-700 hover:to-red-600"
                                >
                                    {isDeletingVersion && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {isDeletingVersion ? 'Deleting...' : 'Delete Version'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Version Modal */}
            {showAddVersionModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
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
                            <div onClick={() => setShowAddVersionModal(false)} className="cursor-pointer p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </div>
                        </div>

                        <div className="p-5 space-y-4">

                            {/* แทน File URL input เดิม */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">File</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (!file) return;
                                        setVersionFile(file);
                                        setVersionFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
                                        setAddVersionForm(f => ({ ...f, version_name: f.version_name || file.name.replace(/\.[^/.]+$/, '') }));
                                    }}
                                    className={`relative rounded-lg border border-dashed transition-all duration-150 ${isDragging ? 'border-blue-500/60 bg-blue-500/8' : 'border-white/10 hover:border-white/20 bg-white/3 hover:bg-white/5'
                                        }`}
                                >
                                    <label className="flex flex-col items-center justify-center py-4 px-4 cursor-pointer w-full">
                                        {versionFile ? (
                                            <div className="w-full flex items-center gap-2.5 px-2.5 py-1.5 bg-white/5 rounded-md">
                                                {versionFilePreview ? (
                                                    <img src={versionFilePreview} className="w-8 h-8 object-cover rounded flex-shrink-0" />
                                                ) : (
                                                    <span className="text-base flex-shrink-0">🎬</span>
                                                )}
                                                <span className="text-xs text-gray-300 truncate flex-1">{versionFile.name}</span>
                                                <div
                                                    onClick={(e) => { e.preventDefault(); setVersionFile(null); setVersionFilePreview(''); }}
                                                    className="text-gray-600 hover:text-red-400 text-xs cursor-pointer flex-shrink-0"
                                                >✕</div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                                                <span className="text-2xl text-gray-600">📎</span>
                                                <p className="text-xs text-gray-500">Drop file or click to browse</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setVersionFile(file);
                                                setVersionFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
                                                setAddVersionForm(f => ({ ...f, version_name: f.version_name || file.name.replace(/\.[^/.]+$/, '') }));
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

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

                            {/* Uploaded By — searchable */}
                            {/* Uploaded By — searchable */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                    Uploaded By <span className="text-red-400">*</span>
                                </label>
                                <div className="relative" ref={uploaderInputRef}>
                                    {selectedUploader ? (
                                        <div className="flex items-center gap-2 h-9 px-3 bg-[#1a1d24] border border-gray-700/50 rounded-lg">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                <span className="text-white text-[9px] font-semibold">
                                                    {selectedUploader.name[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-gray-200 text-xs flex-1 truncate">{selectedUploader.name}</span>
                                            <div
                                                onClick={() => { setSelectedUploader(null); setUploaderQuery(''); }}
                                                className="text-gray-500 hover:text-red-400 text-xs cursor-pointer"
                                            >✕</div>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="ค้นหาชื่อ..."
                                            value={uploaderQuery}
                                            onChange={(e) => { setUploaderQuery(e.target.value); setUploaderOpen(true); }}
                                            onFocus={() => {
                                                // คำนวณ position ตอน focus
                                                if (uploaderInputRef.current) {
                                                    const rect = uploaderInputRef.current.getBoundingClientRect();
                                                    setUploaderDropdownPos({
                                                        top: rect.bottom + 4,
                                                        left: rect.left,
                                                        width: rect.width,
                                                    });
                                                }
                                                setUploaderOpen(true);
                                            }}
                                            onBlur={() => setTimeout(() => setUploaderOpen(false), 200)}
                                            className="w-full h-9 px-3 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    )}
                                </div>
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
                            {/* แทนที่ <div className="grid grid-cols-2 gap-3"> เดิมทั้งหมด */}
                            <div className="space-y-3">
                                {/* Linked Task — read only */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                        Linked Task
                                    </label>
                                    <div className="flex items-center gap-2 h-9 px-3 bg-[#0d1117] border border-white/5 rounded-lg text-gray-500 text-sm select-none">
                                        {selectedTask.pipeline_step ? (
                                            <span
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: selectedTask.pipeline_step.color_hex }}
                                            />
                                        ) : (
                                            <span className="text-xs flex-shrink-0">📋</span>
                                        )}
                                        <span className="truncate">{selectedTask.task_name}</span>
                                        <span className="ml-auto text-[10px] text-green-400/80 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex-shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                            auto
                                        </span>
                                    </div>
                                </div>


                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700/50 bg-[#1a1d24]">
                            <button
                                onClick={() => setShowAddVersionModal(false)}
                                className="px-4 py-2 text-sm text-slate-50 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddVersion}
                                disabled={isUploadingVersion || !addVersionForm.version_name.trim()}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-800 disabled:to-gray-800 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all"
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
                </div>,
                document.body
            )}

            {/* Uploader Dropdown Portal — แยกออกนอก modal เพื่อพ้น overflow:hidden */}
            {uploaderOpen && !selectedUploader && showAddVersionModal && createPortal(
                <div
                    className="fixed bg-[#0d1117] border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto"
                    style={{
                        top: uploaderDropdownPos.top,
                        left: uploaderDropdownPos.left,
                        width: uploaderDropdownPos.width,
                        zIndex: 99999,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {allPeople
                        .filter(p => p.name.toLowerCase().includes(uploaderQuery.toLowerCase()))
                        .map(person => (
                            <div
                                key={person.id}
                                onMouseDown={() => {
                                    setSelectedUploader({ id: person.id, name: person.name });
                                    setUploaderOpen(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-500/15 cursor-pointer"
                            >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[9px] font-semibold">
                                        {person.name[0].toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-200">{person.name}</p>
                                    <p className="text-[10px] text-gray-500">{person.email}</p>
                                </div>
                            </div>
                        ))
                    }
                    {allPeople.filter(p => p.name.toLowerCase().includes(uploaderQuery.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-gray-500">ไม่พบ</p>
                    )}
                </div>,
                document.body
            )}


            {showAddNoteModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAddNoteModal(false)}
                    />
                    <div className="relative bg-gradient-to-br from-[#1e2128] to-[#24272f] rounded-2xl border border-gray-700/60 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 bg-[#1a1d24]">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                <span className="text-white font-semibold text-base">Add Note</span>
                            </div>
                            <div onClick={() => setShowAddNoteModal(false)} className="cursor-pointer p-1.5 hover:bg-gray-700 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-400 hover:text-white" />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">

                            {/* Attach Files */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Attach Files</label>
                                <label className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-gray-700/50 bg-[#1a1d24] text-gray-300 text-sm cursor-pointer hover:bg-gray-700/30 transition-all">
                                    <span>+</span> Upload file
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const selected = Array.from(e.target.files || []);
                                            setNoteFiles(prev => [...prev, ...selected]);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                {noteFiles.length > 0 && (
                                    <div className="space-y-1 mt-1">
                                        {noteFiles.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/20 rounded">
                                                <span className="truncate text-blue-100">{file.name}</span>
                                                <div
                                                    onClick={() => setNoteFiles(prev => prev.filter((_, i) => i !== index))}
                                                    className="cursor-pointer text-blue-300 hover:text-red-400 ml-2"
                                                >✕</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>



                            {/* Auto-linked task badge */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Linked Task</label>
                                <div className="flex items-center gap-2 h-9 px-3 bg-[#0d1117] border border-white/5 rounded-lg text-gray-500 text-sm select-none">
                                    {selectedTask.pipeline_step ? (
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedTask.pipeline_step.color_hex }} />
                                    ) : (
                                        <span className="text-xs flex-shrink-0">📋</span>
                                    )}
                                    <span className="truncate text-gray-300">{selectedTask.task_name}</span>
                                    <span className="ml-auto text-[10px] text-green-400/80 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex-shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                        auto
                                    </span>
                                </div>
                            </div>

                            {/* Subject */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                                    Subject <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Note subject..."
                                    value={addNoteForm.subject}
                                    onChange={(e) => setAddNoteForm(f => ({ ...f, subject: e.target.value }))}
                                    className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                />
                            </div>

                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Type <span className="text-red-400">*</span></label>
                                <select
                                    value={addNoteForm.type}
                                    onChange={(e) => setAddNoteForm(f => ({ ...f, type: e.target.value as 'Client' | 'Internal' }))}
                                    className="w-full h-9 px-3 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                                >
                                    <option value="Internal">Internal</option>
                                    <option value="Client">Client</option>
                                </select>
                            </div>

                            {/*  To */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">To</label>

                                {/* Selected tags */}
                                {noteAssignees.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-1">
                                        {noteAssignees.map(person => (
                                            <span key={person.id} className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-200 text-xs rounded-full">
                                                {person.name}
                                                <div
                                                    onClick={() => setNoteAssignees(prev => prev.filter(p => p.id !== person.id))}
                                                    className="cursor-pointer text-blue-300 hover:text-red-400 ml-0.5"
                                                ><X className='h-4 w-4' /></div>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="relative" ref={noteAssigneeInputRef}>
                                    <input
                                        type="text"
                                        placeholder="Search people..."
                                        value={noteAssigneeQuery}
                                        onChange={(e) => { setNoteAssigneeQuery(e.target.value); setNoteAssigneeOpen(true); }}
                                        onFocus={() => {
                                            if (noteAssigneeInputRef.current) {
                                                const rect = noteAssigneeInputRef.current.getBoundingClientRect();
                                                setNoteAssigneeDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                                            }
                                            setNoteAssigneeOpen(true);
                                        }}
                                        onBlur={() => setTimeout(() => setNoteAssigneeOpen(false), 200)}
                                        className="w-full h-9 px-3 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Message */}

                            {/* Message */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Message <span className="text-red-400">*</span></label>
                                <textarea
                                    placeholder="Write your note here..."
                                    value={addNoteForm.body}
                                    onChange={(e) => setAddNoteForm(f => ({ ...f, body: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700/50 rounded-lg text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700/50 bg-[#1a1d24]">
                            <button
                                onClick={() => setShowAddNoteModal(false)}
                                className="px-4 py-2 text-sm text-slate-50 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddNote}
                                disabled={isCreatingNote || !addNoteForm.subject.trim()}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-800 disabled:to-gray-800 disabled:cursor-not-allowed rounded-lg text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all"
                            >
                                {isCreatingNote ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <FileText className="w-4 h-4" />
                                )}
                                {isCreatingNote ? 'Creating...' : 'Create Note'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}


            {/* Note Assignee Dropdown Portal */}
            {noteAssigneeOpen && showAddNoteModal && createPortal(
                <div
                    className="fixed bg-[#0d1117] border border-white/10 rounded-lg shadow-xl max-h-40 overflow-y-auto"
                    style={{
                        top: noteAssigneeDropdownPos.top,
                        left: noteAssigneeDropdownPos.left,
                        width: noteAssigneeDropdownPos.width,
                        zIndex: 99999,
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {allPeople
                        .filter(p =>
                            p.name.toLowerCase().includes(noteAssigneeQuery.toLowerCase()) &&
                            !noteAssignees.some(a => a.id === p.id)
                        )
                        .map(person => (
                            <div
                                key={person.id}
                                onMouseDown={() => {
                                    setNoteAssignees(prev => [...prev, { id: person.id, name: person.name }]);
                                    setNoteAssigneeQuery('');
                                    setNoteAssigneeOpen(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2 hover:bg-blue-500/15 cursor-pointer"
                            >
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[9px] font-semibold">{person.name[0].toUpperCase()}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-200">{person.name}</p>
                                    <p className="text-[10px] text-gray-500">{person.email}</p>
                                </div>
                            </div>
                        ))
                    }
                    {allPeople.filter(p =>
                        p.name.toLowerCase().includes(noteAssigneeQuery.toLowerCase()) &&
                        !noteAssignees.some(a => a.id === p.id)
                    ).length === 0 && (
                            <p className="px-3 py-2 text-xs text-gray-500">ไม่พบ</p>
                        )}
                </div>,
                document.body
            )}
            {/* Note Context Menu */}
            {noteContextMenu && createPortal(
                <div
                    data-note-context-menu="true"
                    className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: noteContextMenu.x, top: noteContextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setDeleteNoteConfirm({
                                noteId: noteContextMenu.note.id,
                                subject: noteContextMenu.note.subject,
                            });
                            setNoteContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm rounded-lg bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                    >
                        <Trash2 className="w-5 h-5 text-slate-50" />
                        Delete Note
                    </button>
                </div>,
                document.body
            )}

            {/* Delete Note Confirm Modal */}
            {deleteNoteConfirm && createPortal(
                <div data-delete-note-confirm="true" className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteNoteConfirm(null)}
                    />
                    <div
                        className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                                    <span className="text-3xl">⚠️</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">Delete Note</h3>
                                    <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">Are you sure you want to delete this note?</p>
                                <p className="font-semibold text-zinc-100 truncate">"{deleteNoteConfirm.subject}"</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteNoteConfirm(null)}
                                    disabled={isDeletingNote}
                                    className="px-4 py-2 rounded-lg text-zinc-200 font-medium disabled:opacity-50 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteNote(deleteNoteConfirm.noteId)}
                                    disabled={isDeletingNote}
                                    className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-2 bg-gradient-to-r from-red-800 to-red-800 hover:from-red-700 hover:to-red-600"
                                >
                                    {isDeletingNote && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {isDeletingNote ? 'Deleting...' : 'Delete Note'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default RightPanel;