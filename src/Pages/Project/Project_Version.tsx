import React, { useEffect, useState } from "react";
import Navbar_Project from "../../components/Navbar_Project";
import axios from "axios";
import ENDPOINTS from "../../config";
import {
    Check, ChevronDown, ChevronRight, Clock,
    Eye, FileText, HardDrive,
    Image, Search, Trash2, Upload,
    User, X, Film, Package, Layers, Pencil
} from "lucide-react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

// ===================== Types =====================
type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: "wtg", fullLabel: "Waiting to Start", color: "bg-gray-600" },
    ip: { label: "ip", fullLabel: "In Progress", color: "bg-blue-500" },
    fin: { label: "fin", fullLabel: "Final", color: "bg-green-500" },
    apr: { label: "apr", fullLabel: "Approved", color: "bg-green-500" },
    cmpt: { label: "cmpt", fullLabel: "Complete", color: "bg-blue-600" },
    cfrm: { label: "cfrm", fullLabel: "Confirmed", color: "bg-purple-500" },
    nef: { label: "nef", fullLabel: "Need fixed", color: "bg-red-500" },
    dlvr: { label: "dlvr", fullLabel: "Delivered", color: "bg-cyan-500" },
    rts: { label: "rts", fullLabel: "Ready to Start", color: "bg-orange-500" },
    rev: { label: "rev", fullLabel: "Pending Review", color: "bg-yellow-600" },
    omt: { label: "omt", fullLabel: "Omit", color: "bg-gray-500" },
    ren: { label: "ren", fullLabel: "Rendering", color: "bg-pink-500" },
    hld: { label: "hld", fullLabel: "On Hold", color: "bg-orange-600" },
    vwd: { label: "vwd", fullLabel: "Viewed", color: "bg-teal-500" },
    crv: { label: "crv", fullLabel: "Client review", color: "bg-purple-600" },
    na: { label: "na", fullLabel: "N/A", color: "bg-gray-400" },
    pndng: { label: "pndng", fullLabel: "Pending", color: "bg-yellow-400" },
    cap: { label: "cap", fullLabel: "Client Approved", color: "bg-green-400" },
    recd: { label: "recd", fullLabel: "Received", color: "bg-blue-400" },
    chk: { label: "chk", fullLabel: "Checking", color: "bg-lime-500" },
    rdd: { label: "rdd", fullLabel: "Render done", color: "bg-emerald-500" },
    srd: { label: "srd", fullLabel: "Submit render", color: "bg-indigo-500" },
    sos: { label: "sos", fullLabel: "Send outsource", color: "bg-violet-500" },
};

type Version = {
    id: number;
    entity_type: string;
    entity_id: number;
    task_id: number | null;
    version_number: number;
    version_name: string | null;
    file_url: string;
    status: string;
    uploaded_by: number | null;  // เพิ่ม | null
    created_at: string;
    file_size: number | null;
    description: string | null;
    // joined fields
    uploaded_by_name?: string;
    task_name?: string;
    entity_name?: string;
};

type GroupedVersions = {
    entity_type: string;
    entity_id: number;
    entity_name: string;
    versions: Version[];
};


// ===================== Helpers =====================
const formatBytes = (bytes: number | null | undefined) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
};

const getEntityIcon = (entityType: string) => {
    switch (entityType) {
        case "shot": return <Film className="w-3.5 h-3.5" />;
        case "asset": return <Package className="w-3.5 h-3.5" />;
        case "sequence": return <Layers className="w-3.5 h-3.5" />;
        default: return <FileText className="w-3.5 h-3.5" />;
    }
};

const getEntityColor = (entityType: string) => {
    switch (entityType) {
        case "shot": return "text-blue-400 bg-blue-500/10";
        case "asset": return "text-green-400 bg-green-500/10";
        case "sequence": return "text-purple-400 bg-purple-500/10";
        default: return "text-gray-400 bg-gray-500/10";
    }
};

const isImageUrl = (url: string) => {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
};

const isVideoUrl = (url: string) => {
    return /\.(mp4|mov|avi|mkv|webm)(\?.*)?$/i.test(url);
};

// ===================== Component =====================
export default function Project_Version() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<GroupedVersions[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterEntityType, setFilterEntityType] = useState<string>("");

    // Project users for uploaded_by dropdown
    const [projectUsers, setProjectUsers] = useState<{ id: number; username: string }[]>([]);
    const [showUserMenu, setShowUserMenu] = useState<number | null>(null); // version id
    const [userSearchTerm, setUserSearchTerm] = useState<string>("");

    // Inline editing states
    const [editingVersionId, setEditingVersionId] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<"version_name" | "description" | null>(null);
    const [editValue, setEditValue] = useState<string>("");

    const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null); // version id
    const [statusMenuPos, setStatusMenuPos] = useState<"top" | "bottom">("bottom");

    // Thumbnail modal
    const [previewVersion, setThumbnailVersion] = useState<Version | null>(null);

    // Delete confirm
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Context menu
    const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; version: Version } | null>(null);

    // Totals
    const totalVersions = groups.reduce((s, g) => s + g.versions.length, 0);

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [userMenuPos, setUserMenuPos] = useState<{ vertical: "top" | "bottom"; horizontal: "left" | "right" }>({ vertical: "bottom", horizontal: "left" });

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [showEntityFilter, setShowEntityFilter] = useState(false);
    const [showStatusFilter, setShowStatusFilter] = useState(false);

    // -------------------- Fetch --------------------
    useEffect(() => {
        fetchVersions();
        fetchProjectUsers();
    }, []);

    const fetchVersions = async () => {
        setIsLoading(true);
        try {
            const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
            if (!projectId) return;
            const res = await axios.post(`${ENDPOINTS.PROJECT_VERSIONS_GROUPED}`, { projectId });
            const data: GroupedVersions[] = res.data;

            const order: Record<string, number> = { shot: 1, asset: 2, sequence: 3, unassigned: 4 };
            const sorted = data.sort((a, b) => (order[a.entity_type] || 9) - (order[b.entity_type] || 9));
            setGroups(sorted);

            const keys = sorted.map(g => `${g.entity_type}_${g.entity_id}`);
            setExpandedGroups(new Set(keys));
        } catch (err) {
            console.error("Fetch versions error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProjectUsers = async () => {
        try {
            const res = await axios.post(`${ENDPOINTS.PROJECT_USERS}`, {});
            setProjectUsers(res.data);
        } catch (err) {
            console.error("Fetch project users error:", err);
        }
    };

    // -------------------- Toggle Group --------------------
    const toggleGroup = (entityType: string, entityId: number) => {
        const key = `${entityType}_${entityId}`;
        setExpandedGroups(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    // -------------------- Filter --------------------
    const filterVersions = (versions: Version[]) => {
        return versions.filter(v => {
            const matchSearch = !searchQuery ||
                v.version_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.task_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.uploaded_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                `v${v.version_number}`.includes(searchQuery.toLowerCase());
            const matchStatus = !filterStatus || v.status === filterStatus;
            return matchSearch && matchStatus;
        });
    };

    // -------------------- Update Version (generic) --------------------
    const updateVersion = async (versionId: number, field: string, value: any) => {
        try {
            await axios.post(`${ENDPOINTS.UPDATE_VERSION}`, { versionId, field, value });

            setGroups(prev => prev.map(g => ({
                ...g,
                versions: g.versions.map(v => {
                    if (v.id !== versionId) return v;
                    if (field === "uploaded_by") {
                        if (value === null) {
                            return { ...v, uploaded_by: null, uploaded_by_name: undefined };
                        }
                        const user = projectUsers.find(u => u.id === value);
                        return { ...v, uploaded_by: value, uploaded_by_name: user?.username || "Unknown" };
                    }
                    return { ...v, [field]: value };
                })
            })));
            return true;
        } catch (err) {
            console.error("Update version error:", err);
            alert("ไม่สามารถอัพเดทข้อมูลได้");
            return false;
        }
    };

    // -------------------- Inline Edit Helpers --------------------
    const startEditing = (versionId: number, field: "version_name" | "description", currentValue: string) => {
        setEditingVersionId(versionId);
        setEditingField(field);
        setEditValue(currentValue);
        // Close other menus
        setShowStatusMenu(null);
        setShowUserMenu(null);
    };

    const cancelEditing = () => {
        setEditingVersionId(null);
        setEditingField(null);
        setEditValue("");
    };

    const commitEdit = async (versionId: number, field: "version_name" | "description", value: string) => {
        await updateVersion(versionId, field, value.trim());
        cancelEditing();
    };

    // -------------------- Status Update --------------------
    const handleStatusChange = async (versionId: number, newStatus: string) => {
        await updateVersion(versionId, "status", newStatus);
        setShowStatusMenu(null);
    };

    // -------------------- Delete --------------------
    const handleDelete = async (versionId: number) => {
        setIsDeleting(true);
        try {
            await axios.delete(`${ENDPOINTS.DELETE_VERSION}`, { data: { versionId } });
            setDeleteConfirm(null);
            await fetchVersions();
        } catch (err) {
            console.error("Delete version error:", err);
            alert("ไม่สามารถลบ Version ได้");
        } finally {
            setIsDeleting(false);
        }
    };

    // -------------------- Context Menu --------------------
    useEffect(() => {
        if (!contextMenu) return;
        const close = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest("[data-ctx-menu]")) setContextMenu(null);
        };
        document.addEventListener("mousedown", close, true);
        return () => document.removeEventListener("mousedown", close, true);
    }, [contextMenu]);

    // -------------------- Close user menu on outside click --------------------
    useEffect(() => {
        if (showUserMenu === null) return;
        const close = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest("[data-user-menu]")) {
                setShowUserMenu(null);
                setUserSearchTerm("");
            }
        };
        document.addEventListener("mousedown", close, true);
        return () => document.removeEventListener("mousedown", close, true);
    }, [showUserMenu]);

    // -------------------- Sort --------------------
    const sortByLatest = (versions: Version[]) => {
        return [...versions].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    };

    // -------------------- Filtered Groups --------------------
    const filteredGroups = groups
        .map(g => ({
            ...g,
            versions: filterVersions(
                sortByLatest(
                    filterEntityType ? (g.entity_type === filterEntityType ? g.versions : []) : g.versions
                )
            )
        }))
        .filter(g => g.versions.length > 0);

    const displayTotal = filteredGroups.reduce((s, g) => s + g.versions.length, 0);


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    // ===================== RENDER =====================
    return (
        <div className="fixed inset-0 pt-14 bg-black">
            <Navbar_Project activeTab="Versions" />

            <main className="pt-12 h-[calc(100vh-3.5rem)] flex flex-col bg-gray-900 overflow-hidden">


                {/* ---- Toolbar ---- */}
                <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="ค้นหา version, task, entity..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 h-9 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        {searchQuery && (
                            <div onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer">
                                <X className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                            </div>
                        )}
                    </div>

                    {/* Filter: Entity Type - Custom Dropdown */}
                    <div className="relative">
                        <div
                            onClick={() => setShowEntityFilter(prev => !prev)}
                            className="h-9 pl-3 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:border-blue-500 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            {filterEntityType ? (
                                <span className="text-blue-400 font-medium capitalize">{filterEntityType}</span>
                            ) : (
                                <span>ทุก Entity</span>
                            )}
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {showEntityFilter && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowEntityFilter(false)} />
                                <div className="absolute left-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl min-w-[140px] py-1">
                                    {[
                                        { value: '', label: 'ทุก Entity' },
                                        { value: 'shot', label: 'Shot' },
                                        { value: 'asset', label: 'Asset' },
                                        { value: 'sequence', label: 'Sequence' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setFilterEntityType(opt.value); setShowEntityFilter(false); }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500"
                                        >
                                            <span className={filterEntityType === opt.value ? 'text-blue-400 text-sm' : 'text-gray-200 text-sm'}>
                                                {opt.label}
                                            </span>
                                            {filterEntityType === opt.value && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Filter: Status - Custom Dropdown */}
                    <div className="relative">
                        <div
                            onClick={() => setShowStatusFilter(prev => !prev)}
                            className="h-9 pl-3 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:border-blue-500 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            {filterStatus ? (
                                <>
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[filterStatus as StatusType].color}`} />
                                    <span className="text-gray-200">{statusConfig[filterStatus as StatusType].fullLabel}</span>
                                </>
                            ) : (
                                <span>ทุกสถานะ</span>
                            )}
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>

                        {showStatusFilter && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowStatusFilter(false)} />
                                <div className="absolute left-0 top-full mt-1 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl min-w-[220px] max-h-[350px] overflow-y-auto py-1
                     scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 whitespace-nowrap">
                                    <button
                                        onClick={() => { setFilterStatus(''); setShowStatusFilter(false); }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500"
                                    >
                                        <span className={!filterStatus ? 'text-blue-400 font-medium' : 'text-gray-200'}>ทุกสถานะ</span>
                                        {!filterStatus && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                                    </button>
                                    {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string }][]).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => { setFilterStatus(key); setShowStatusFilter(false); }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500"
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full ${config.color} flex-shrink-0`} />
                                            <div className="text-gray-200 flex items-center gap-3">
                                                <span className="inline-block w-10 text-gray-400 text-sm">{config.label}</span>
                                                <span className="text-slate-50 text-sm">{config.fullLabel}</span>
                                            </div>
                                            {filterStatus === key && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Clear filters */}
                    {(searchQuery || filterStatus || filterEntityType) && (
                        <div
                            onClick={() => { setSearchQuery(""); setFilterStatus(""); setFilterEntityType(""); }}
                            className="h-9 px-3 bg-gray-800 hover:bg-red-500/30 border border-red-500 rounded-lg text-red-400 text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" /> Clear
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
                        <span>แสดง</span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">{displayTotal}</span>
                        <span>/ {totalVersions} versions</span>
                    </div>
                </div>

                {/* ---- Table ---- */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10">
                            <tr className="border-b-2 border-blue-500/30">
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-12">#</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Thumbnail</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Version Name</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Task</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Link</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Uploaded By</th>
                                <th className="px-1 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16">
                                        <div className="flex flex-col items-center justify-center min-h-[300px]">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
                                            <p className="text-gray-400 text-sm">Loading versions...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredGroups.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16">
                                        <div className="flex flex-col items-center justify-center min-h-[300px]">
                                            <Upload className="w-16 h-16 text-gray-700 mb-4" strokeWidth={1.5} />
                                            <h3 className="text-xl font-semibold text-gray-300">ไม่พบ Version</h3>
                                            <p className="text-gray-500 mt-1 text-sm">
                                                {searchQuery || filterStatus || filterEntityType ? "ลองปรับ filter ใหม่" : "ยังไม่มี version ในโปรเจกต์นี้"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredGroups.map(group => {
                                    const groupKey = `${group.entity_type}_${group.entity_id}`;
                                    const isExpanded = expandedGroups.has(groupKey);
                                    const entityColor = getEntityColor(group.entity_type);

                                    return (
                                        <React.Fragment key={groupKey}>
                                            {/* Group Header */}
                                            <tr
                                                className="bg-gray-800 hover:bg-gray-800/70 cursor-pointer transition-all border-b border-gray-700/50"
                                                onClick={() => toggleGroup(group.entity_type, group.entity_id)}
                                            >
                                                <td colSpan={8} className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                        <div className={`w-7 h-7 rounded flex items-center justify-center ${group.entity_type === "unassigned" ? "bg-yellow-600/80" : "bg-indigo-600/80"}`}>
                                                            <span className="text-white font-semibold text-xs">
                                                                {group.entity_type === "unassigned" ? "?" : group.entity_name?.[0]?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <h3 className="text-sm font-medium text-white">{group.entity_name}</h3>
                                                            {group.entity_type !== "unassigned" && (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${entityColor}`}>
                                                                    {getEntityIcon(group.entity_type)}
                                                                    {group.entity_type}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-xs font-medium">
                                                            {group.versions.length} versions
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Version Rows */}
                                            {isExpanded && group.versions.map((version, idx) => {
                                                const statusCfg = statusConfig[version.status as StatusType];
                                                const isEditingThisName = editingVersionId === version.id && editingField === "version_name";
                                                const isEditingThisDesc = editingVersionId === version.id && editingField === "description";

                                                return (
                                                    <tr
                                                        key={`v-${version.id}`}
                                                        className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                                        onContextMenu={e => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setContextMenu({ visible: true, x: e.clientX, y: e.clientY, version });
                                                        }}
                                                    >
                                                        {/* # */}
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                                                {idx + 1}
                                                            </div>
                                                        </td>

                                                        {/* Thumbnail */}
                                                        <td className="px-4 py-4">
                                                            <div className="relative w-32 h-20 rounded-lg overflow-hidden group">
                                                                {version.file_url && isImageUrl(version.file_url) ? (
                                                                    <>
                                                                        <img
                                                                            src={ENDPOINTS.image_url + version.file_url}
                                                                            alt="thumbnail"
                                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                                                                            onClick={() => setThumbnailVersion(version)}
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).closest('.relative')!.classList.add('show-fallback');
                                                                                (e.target as HTMLImageElement).style.display = "none";
                                                                            }}
                                                                        />
                                                                        {/* Overlay on hover */}
                                                                        <div
                                                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                                                                            onClick={() => setThumbnailVersion(version)}
                                                                        >
                                                                             {/* Hover Overlay */}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
                                                                    <div className="w-7 h-7 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                                        <Eye className="w-3.5 h-3.5 text-white" />
                                                                    </div>
                                                                </div>
                                                                        </div>
                                                                        {/* Subtle border glow */}
                                                                        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 group-hover:ring-blue-400/40 transition-all duration-200 pointer-events-none" />
                                                                    </>
                                                                ) : version.file_url && isVideoUrl(version.file_url) ? (
                                                                    <>
                                                                        <video
                                                                            src={ENDPOINTS.image_url + version.file_url}
                                                                            className="w-full h-full object-cover"
                                                                            controls
                                                                        />
                                                                        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 pointer-events-none" />
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 ring-1 ring-inset ring-white/5">
                                                                        {/* Subtle grid pattern */}
                                                                        <div className="absolute inset-0 opacity-[0.03]" />
                                                                        <Image className="w-5 h-5 text-gray-600 relative" />
                                                                        <p className="text-gray-600 text-[9px] tracking-widest uppercase relative">No Thumbnail</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>


                                                    

                                                        {/* Version Name — inline editable */}
                                                        <td className="px-2 py-4 w-40">
                                                            {isEditingThisName ? (
                                                                <textarea
                                                                    autoFocus
                                                                    value={editValue}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onBlur={() => commitEdit(version.id, "version_name", editValue)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === "Escape") cancelEditing();
                                                                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                                                            e.preventDefault();
                                                                            e.currentTarget.blur(); // Ctrl+Enter เพื่อ save
                                                                        }
                                                                    }}
                                                                    rows={3}
                                                                    className="w-full px-2 py-1 
                                                                        bg-gray-800 
                                                                        border border-blue-500 
                                                                        rounded 
                                                                        text-blue-400 text-sm font-medium 
                                                                        outline-none resize-none"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-2 group/name">
                                                                    <p className="text-sm font-medium text-gray-200 leading-tight hover:text-blue-400 truncate max-w-[160px] block"
                                                                        title={version.version_name || `Version ${version.version_number}`}>
                                                                        {version.version_name || `Version ${version.version_number}`}
                                                                    </p>
                                                                    <button
                                                                        onClick={() => startEditing(version.id, "version_name", version.version_name || `Version ${version.version_number}`)}
                                                                        className="opacity-0 group-hover/name:opacity-100 p-1 rounded-lg bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700 transition-all"
                                                                        title="แก้ไขชื่อ"
                                                                    >
                                                                        <Pencil className="w-3 h-3 text-gray-400 hover:text-blue-400" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>


                                                            {/* Task */}
                                                        <td className="px-2 py-4">
                                                            <div className="w-20 flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl transition-colors border border-orange-500/50 bg-gray-900 whitespace-nowrap">

                                                                {version.task_name ? (
                                                                    <span className="text-sm text-gray-300 truncate max-w-[120px] block" title={version.task_name}>
                                                                        {version.task_name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                                                )}
                                                            </div>

                                                        </td>


                                                        {/* LINK */}
                                                        <td className="px-2 py-4">
                                                            {group.entity_type !== "unassigned" ? (
                                                                <span
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (group.entity_type === "shot") {
                                                                            const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
                                                                            const res = await axios.post(ENDPOINTS.SHOTLIST, { projectId });
                                                                            let foundShot = null;
                                                                            for (const g of res.data) {
                                                                                const shot = g.shots?.find((s: any) => s.id === group.entity_id);
                                                                                if (shot) { foundShot = { ...shot, sequence: g.category, assets: shot.assets || [] }; break; }
                                                                            }
                                                                            if (foundShot) {
                                                                                localStorage.setItem("selectedShot", JSON.stringify({
                                                                                    id: foundShot.id, shot_name: foundShot.shot_name,
                                                                                    description: foundShot.description, status: foundShot.status,
                                                                                    thumbnail: foundShot.thumbnail || foundShot.file_url || "",
                                                                                    sequence: foundShot.sequence, assets: foundShot.assets,
                                                                                }));
                                                                                navigate("/Project_Shot/Others_Shot");
                                                                            }
                                                                        } else if (group.entity_type === "asset") {
                                                                            const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
                                                                            const res = await axios.post(ENDPOINTS.ASSETLIST, { projectId });
                                                                            let foundAsset = null;
                                                                            for (const g of res.data) {
                                                                                const asset = g.assets?.find((a: any) => a.id === group.entity_id);
                                                                                if (asset) { foundAsset = { ...asset, category: g.category }; break; }
                                                                            }
                                                                            if (foundAsset) {
                                                                                localStorage.setItem("selectedAsset", JSON.stringify({
                                                                                    id: foundAsset.id, asset_name: foundAsset.asset_name,
                                                                                    description: foundAsset.description, status: foundAsset.status,
                                                                                    file_url: foundAsset.file_url || "", sequence: foundAsset.category,
                                                                                }));
                                                                                navigate("/Project_Assets/Others_Asset");
                                                                            }
                                                                        } else if (group.entity_type === "sequence") {
                                                                            const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
                                                                            const res = await axios.post(ENDPOINTS.PROJECT_SEQUENCES, { projectId });
                                                                            const sequence = res.data.find((seq: any) => seq.id === group.entity_id);
                                                                            if (sequence) {
                                                                                localStorage.setItem("sequenceData", JSON.stringify({
                                                                                    sequenceId: sequence.id, sequenceName: sequence.sequence_name,
                                                                                    description: sequence.description, status: sequence.status || "wtg",
                                                                                    thumbnail: sequence.file_url || "", createdAt: sequence.created_at, projectId,
                                                                                }));
                                                                                navigate("/Project_Sequence/Others_Sequence");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-gray-300 hover:text-blue-400 underline decoration-gray-400/30 hover:decoration-blue-400 underline-offset-3 transition-colors font-medium cursor-pointer"
                                                                >
                                                                    {group.entity_name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-600 italic">ไม่ระบุ</span>
                                                            )}
                                                        </td>



                                                        {/* Status */}
                                                        <td className="px-2 py-4">
                                                            <div className="relative">
                                                                <button
                                                                    onClick={e => {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        const spaceBelow = window.innerHeight - rect.bottom;
                                                                        setStatusMenuPos(spaceBelow < 300 ? "top" : "bottom");
                                                                        setShowStatusMenu(prev => prev === version.id ? null : version.id);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700 whitespace-nowrap"
                                                                >
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${statusCfg?.color || "bg-gray-500"}`} />
                                                                    <span className="text-xs text-gray-300 font-medium">
                                                                        {statusCfg?.label || version.status}
                                                                    </span>
                                                                </button>

                                                                {showStatusMenu === version.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(null)} />
                                                                        <div className={`absolute left-0 ${statusMenuPos === "top" ? "bottom-full mb-1" : "top-full mt-1"} z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl min-w-[200px] max-h-[350px] overflow-y-auto`}>
                                                                            {(Object.entries(statusConfig) as [string, { label: string; fullLabel: string; color: string }][]).map(([key, cfg]) => (
                                                                                <button
                                                                                    key={key}
                                                                                    onClick={e => { e.stopPropagation(); handleStatusChange(version.id, key); }}
                                                                                    className="flex items-center gap-3 w-full px-3 py-2 text-left bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500 first:rounded-t-lg last:rounded-b-lg transition-colors"
                                                                                >
                                                                                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.color}`} />
                                                                                    <div className="flex items-center gap-4 text-xs text-gray-200">
                                                                                        <span className="inline-block w-10">{cfg.label}</span>
                                                                                        <span className="text-gray-400">{cfg.fullLabel}</span>
                                                                                    </div>
                                                                                    {version.status === key && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Uploaded By — dropdown เลือก user */}
                                                        <td className="px-2 py-4">
                                                            <div className="relative">
                                                                <div className="flex items-center gap-5 group/uploader-container">

                                                                    <button
                                                                        onClick={(e) => {
                                                                            if (showUserMenu === version.id) {
                                                                                setShowUserMenu(null);
                                                                                setUserSearchTerm("");
                                                                                return;
                                                                            }
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                                            const spaceRight = window.innerWidth - rect.left;
                                                                            setUserMenuPos({
                                                                                vertical: spaceBelow < 280 ? "top" : "bottom",
                                                                                horizontal: spaceRight < 270 ? "right" : "left",
                                                                            });
                                                                            setShowUserMenu(version.id);
                                                                            setUserSearchTerm("");
                                                                        }}
                                                                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-600 hover:to-slate-500 border border-transparent transition-all group/uploader"
                                                                        title="คลิกเพื่อเปลี่ยนผู้อัปโหลด"
                                                                    >
                                                                        {version.uploaded_by_name ? (
                                                                            <>
                                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-lg flex-shrink-0">
                                                                                    {version.uploaded_by_name[0].toUpperCase()}
                                                                                </div>
                                                                                <span className="text-sm text-gray-300 group-hover/uploader:text-white transition-colors">
                                                                                    {version.uploaded_by_name}
                                                                                </span>



                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                                                    <User className="w-3.5 h-3.5 text-slate-50" />
                                                                                </div>
                                                                                <span className="text-slate-400 italic text-sm">เลือกผู้อัปโหลด</span>

                                                                            </>
                                                                        )}
                                                                    </button>
                                                                    {/* ✅ ปุ่ม X ลบคนอัพโหลด — แสดงเฉพาะเมื่อ hover */}
                                                                    {version.uploaded_by_name && (
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                updateVersion(version.id, "uploaded_by", null);
                                                                            }}
                                                                            className="hidden group-hover/uploader-container:flex items-center justify-center
                                                                                        w-6 h-6 
                                                                                        rounded-full
                                                                                        bg-red-500
                                                                                        hover:bg-red-600
                                                                                        hover:ring-1 hover:ring-red-400
                                                                                        transition-all duration-150 cursor-pointer"
                                                                            title="ลบผู้อัปโหลด"
                                                                        >
                                                                            <X className="w-4 h-4 text-white" />
                                                                        </div>
                                                                    )}

                                                                </div>



                                                                {showUserMenu === version.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-10" onClick={() => { setShowUserMenu(null); setUserSearchTerm(""); }} />
                                                                        <div
                                                                            data-user-menu="true"
                                                                            className={`absolute z-50 w-64 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/5
                                                                                ${userMenuPos.vertical === "top" ? "bottom-full mb-1" : "top-full mt-1"}
                                                                                ${userMenuPos.horizontal === "right" ? "right-0" : "left-0"}
                                                                            `}
                                                                        >
                                                                            {/* Header */}
                                                                            <div className="px-3 py-2.5 bg-gray-800 border-b border-gray-700/50">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                                                    <span className="text-xs font-semibold text-slate-200">เลือกผู้อัปโหลด</span>
                                                                                </div>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="ค้นหาชื่อ..."
                                                                                    value={userSearchTerm}
                                                                                    onChange={e => setUserSearchTerm(e.target.value)}
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    autoFocus
                                                                                    className="w-full px-2.5 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                                                                />
                                                                            </div>

                                                                            {/* User List */}
                                                                            <div className="max-h-56 overflow-y-auto p-1.5">


                                                                                {/* รายชื่อ Users */}
                                                                                {projectUsers
                                                                                    .filter(u => !userSearchTerm.trim() || u.username.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                                                                    .map(user => (
                                                                                        <button
                                                                                            key={user.id}
                                                                                            onClick={e => {
                                                                                                e.stopPropagation();
                                                                                                updateVersion(version.id, "uploaded_by", user.id);
                                                                                                setShowUserMenu(null);
                                                                                                setUserSearchTerm("");
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                                        >
                                                                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow ${version.uploaded_by === user.id
                                                                                                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white ring-2 ring-indigo-400/50"
                                                                                                : "bg-gradient-to-br from-slate-600 to-slate-700 text-white"
                                                                                                }`}>
                                                                                                {user.username[0].toUpperCase()}
                                                                                            </div>
                                                                                            <span className="flex-1 text-sm text-slate-200">{user.username}</span>
                                                                                            {version.uploaded_by === user.id && (
                                                                                                <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                                                            )}
                                                                                        </button>
                                                                                    ))
                                                                                }

                                                                                {projectUsers.filter(u => !userSearchTerm.trim() || u.username.toLowerCase().includes(userSearchTerm.toLowerCase())).length === 0 && (
                                                                                    <div className="p-4 text-center text-slate-500 text-xs">ไม่พบผู้ใช้</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Description — inline editable */}
                                                        <td className="px-4 py-4">
                                                            {isEditingThisDesc ? (
                                                                <textarea
                                                                    autoFocus
                                                                    value={editValue}
                                                                    onChange={e => setEditValue(e.target.value)}
                                                                    onBlur={() => commitEdit(version.id, "description", editValue)}
                                                                    onKeyDown={e => {
                                                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); }
                                                                        if (e.key === "Escape") cancelEditing();
                                                                    }}
                                                                    rows={2}
                                                                    className="w-full max-w-[220px] px-2 py-1 bg-gray-800 border border-blue-500 rounded text-gray-300 text-xs outline-none resize-none"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="flex items-start gap-2 group/desc cursor-pointer rounded-sm hover:bg-slate-800"
                                                                    onClick={() => startEditing(version.id, "description", version.description || "")}
                                                                    title="คลิกเพื่อแก้ไข"
                                                                >
                                                                    {version.description ? (
                                                                        <span className="text-sm text-gray-300 truncate max-w-[200px] block transition-colors" title={version.description}>
                                                                            {version.description}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-600 italic text-sm group-hover/desc:text-gray-500 transition-colors">
                                                                            คลิกเพื่อเพิ่ม...
                                                                        </span>
                                                                    )}
                                                                    <Pencil className="w-3 h-3 text-gray-600 opacity-0 group-hover/desc:opacity-100 mt-0.5 flex-shrink-0 transition-opacity" />
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* ===================== Image Thumbnail Modal ===================== */}
            {previewVersion && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative max-w-5xl w-full mx-4 rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 font-bold text-xs ring-1 ring-blue-500/30">
                                    v{previewVersion.version_number}
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-gray-200">
                                        {previewVersion.version_name || `Version ${previewVersion.version_number}`}
                                    </p>
                                    {previewVersion.entity_name && (
                                        <p className="text-xs text-gray-500">{previewVersion.entity_name}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setThumbnailVersion(null)}
                                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Image */}
                        <div className="p-4 flex items-center justify-center bg-gray-950 max-h-[70vh]">
                            <img
                                src={previewVersion.file_url}
                                alt={previewVersion.version_name || "thumbnail"}
                                className="max-w-full max-h-[65vh] object-contain rounded-lg"
                            />
                        </div>

                        {/* Footer Info */}
                        <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
                            {previewVersion.uploaded_by_name && (
                                <span className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" /> {previewVersion.uploaded_by_name}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> {formatDate(previewVersion.created_at)} {formatTime(previewVersion.created_at)}
                            </span>
                            {previewVersion.file_size && (
                                <span className="flex items-center gap-1.5">
                                    <HardDrive className="w-3.5 h-3.5" /> {formatBytes(previewVersion.file_size)}
                                </span>
                            )}
                            {previewVersion.description && (
                                <span className="truncate">{previewVersion.description}</span>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ===================== Context Menu ===================== */}
            {contextMenu && createPortal(
                <div
                    data-ctx-menu="true"
                    className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                id: contextMenu.version.id,
                                name: contextMenu.version.version_name || `Version ${contextMenu.version.version_number}`
                            });
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm rounded-lg transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                    >
                        <Trash2 className="w-5 h-5 text-slate-50" />
                        Delete Version
                    </button>
                </div>,
                document.body
            )}

            {/* ===================== Delete Confirm Modal ===================== */}
            {deleteConfirm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl" onClick={e => e.stopPropagation()}>
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
                                <p className="text-zinc-300 mb-1">คุณแน่ใจว่าต้องการลบ version นี้?</p>
                                <p className="font-semibold text-zinc-100 truncate">"{deleteConfirm.name}"</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg text-zinc-200 font-medium disabled:opacity-50 bg-gray-800 hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm.id)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-2 bg-red-700 hover:bg-red-600 transition-colors"
                                >
                                    {isDeleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {isDeleting ? "Deleting..." : "Delete Version"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}