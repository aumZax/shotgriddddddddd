import { useState, useEffect, } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import ENDPOINTS from '../../../config';
import axios from 'axios';
import { Eye, Image, Upload, User, X } from 'lucide-react';
import TaskTab from "../../../components/TaskTab";
import NoteTab from "../../../components/NoteTab";


const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-green-500', icon: 'dot' }
};

type StatusType = keyof typeof statusConfig;
type FilterType = 'All' | 'ART' | 'MDL' | 'RIG' | 'TXT';
type CheckedState = Record<FilterType, boolean>;
type NoteType = 'Client' | 'Internal';

interface Note {
    id: number;
    project_id: number;
    note_type: string;
    type_id: number;
    subject: string;
    body: string;
    file_url?: string;
    author: string;
    status: string;
    visibility: string;
    created_at: string;
    tasks?: string[];
    assigned_people?: string[];
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

interface Person {
    id: number;
    name: string;
    email: string;
    status?: string;
    permissionGroup?: string;
    projects?: string;
    groups?: string;
    createdAt?: string;
}

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

type TaskAssignee = {
    id: number;
    username: string;
};


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

export default function Others_Asset() {
    const [activeTab, setActiveTab] = useState('Asset Info');
    const [assetData, setAssetData] = useState<AssetData | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showCreateAsset_Task, setShowCreateAsset_Task] = useState(false);
    const [showCreateAsset_Note, setShowCreateAsset_Note] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [noteModalPosition, setNoteModalPosition] = useState({ x: 0, y: 0 });
    const [type, setType] = useState<NoteType | null>(null);
    const types: FilterType[] = ['ART', 'MDL', 'RIG', 'TXT'];
    const [checked, setChecked] = useState<CheckedState>({
        All: false,
        ART: false,
        MDL: false,
        RIG: false,
        TXT: false,
    });
    const currentUser = localStorage.getItem('currentUser') || 'Unknown';

    const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [, setSelectedFile] = useState<File | null>(null);

    const [openAssignedDropdown, setOpenAssignedDropdown] = useState<string | number | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([])
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [subject, setSubject] = useState(
        assetData?.asset_name ? `Note on ${assetData.asset_name}` : ""
    );
    const [body, setBody] = useState('');
    const [notes, setNotes] = useState<Note[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);

    // Context menu for notes
    const [noteContextMenu, setNoteContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        note: Note;
    } | null>(null);

    // Delete confirmation modal
    const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{
        noteId: number;
        subject: string;
    } | null>(null);

    const handleFiletaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selected = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selected]);

        e.target.value = '';
    };

    const removetaskFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (activeTab === 'Notes') {
            fetchNotes();
        }
    }, [activeTab, assetData?.id]);

    useEffect(() => {
        const fetchPeople = async () => {
            try {
                const response = await fetch(ENDPOINTS.GETALLPEOPLE);
                const data = await response.json();
                setAllPeople(data);
            } catch (error) {
                console.error('Error fetching people:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPeople();
    }, []);

    // Close context menu when clicking outside
    useEffect(() => {
        const closeMenu = () => setNoteContextMenu(null);

        if (noteContextMenu) {
            document.addEventListener("click", closeMenu);
            return () => document.removeEventListener("click", closeMenu);
        }
    }, [noteContextMenu]);

    useEffect(() => {
        const selectedAsset = getSelectedAsset();
        if (selectedAsset) {
            setAssetData(selectedAsset);
            // ✅ Set subject เมื่อ asset ถูก load
            setSubject(`Note on ${selectedAsset.asset_name}`);
        }
    }, []);

    useEffect(() => {
        if (deleteNoteConfirm) {
            setNoteContextMenu(null);
        }
    }, [deleteNoteConfirm]);

    const fetchNotes = async () => {
        if (!assetData?.id) return;

        setLoadingNotes(true);
        try {
            const response = await fetch(`${ENDPOINTS.GET_NOTES}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectId: localStorage.getItem("projectId"),
                    noteType: 'asset',
                    typeId: assetData.id
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setNotes(data);
        } catch (error) {
            console.error('Error fetching notes:', error);
            setNotes([]);
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleDeleteNote = async (noteId: number) => {
        try {
            const response = await axios.delete(`${ENDPOINTS.DELETE_NOTE}/${noteId}`);

            if (response.status !== 200 && response.status !== 204) {
                throw new Error(`Delete failed with status ${response.status}`);
            }

            // close context menu
            setNoteContextMenu(null);

            // optimistic update
            setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));

        } catch (err) {
            console.error("❌ DELETE FAILED:", err);
            alert(err instanceof Error ? err.message : "Failed to delete note");
            fetchNotes();
        }
    };

    const handleNoteContextMenu = (
        e: React.MouseEvent,
        note: Note
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setNoteContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            note
        });
    };

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

    const handleCreateNote = async () => {
        try {
            setUploading(true);

            let uploadedFileUrl = null;

            const fileToUpload = files[0];

            console.log('📁 Files array:', files);
            console.log('📁 File to upload:', fileToUpload);

            if (fileToUpload) {
                console.log('📤 Uploading file:', fileToUpload.name);

                const formData = new FormData();
                formData.append('file', fileToUpload);
                formData.append("assetId", assetData?.id.toString() || "");
                formData.append("fileName", fileToUpload.name);
                formData.append("type", "note");

                const uploadResponse = await fetch(ENDPOINTS.UPLOAD_ASSET, {
                    method: 'POST',
                    body: formData
                });

                console.log('📥 Upload response status:', uploadResponse.status);

                if (!uploadResponse.ok) {
                    throw new Error('File upload failed');
                }

                const uploadData = await uploadResponse.json();
                console.log('✅ Upload successful:', uploadData);
                uploadedFileUrl = uploadData.file.fileUrl;
            } else {
                console.log('ℹ️ No file selected');
            }

            const noteData = {
                projectId: projectId ?? null,
                noteType: 'asset',
                typeId: assetData?.id ?? null,
                subject: subject || '',
                body: body || '',
                fileUrl: uploadedFileUrl ?? null,
                author: currentUser,
                status: 'opn',
                visibility: type ?? null,
                tasks: (selectedTasks && selectedTasks.length > 0) ? selectedTasks : null,
                assignedPeople: (selectedPeople && selectedPeople.length > 0)
                    ? selectedPeople.map((person: Person) => person.id)
                    : null
            };

            console.log('📝 Creating note with data:', noteData);

            const createResponse = await fetch(ENDPOINTS.CREATE_ASSET_NOTE, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                console.error('Create note error:', errorData);
                throw new Error('Failed to create note: ' + JSON.stringify(errorData));
            }

            const result = await createResponse.json();
            console.log('✅ Note created successfully:', result);

            // 3. Success
            alert('Note created successfully!');
            setShowCreateAsset_Note(false);

            // Reset form
            setSelectedFile(null);
            setSelectedPeople([]);
            setSelectedTasks([]);
            setFiles([]);
            setSubject(assetData?.asset_name ? `Note on ${assetData.asset_name}` : "");
            setBody('');
            setType(null);

            // 4. Refresh notes
            fetchNotes();

        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to create note. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const filteredPeople = allPeople.filter(
        (person: Person) =>
            person.name.toLowerCase().includes(query.toLowerCase()) &&
            !selectedPeople.some((selected: Person) => selected.id === person.id)
    );

    const addPerson = (person: Person) => {
        setSelectedPeople([...selectedPeople, person]);
        setQuery('');
        setOpen(false);
    };

    const removePerson = (personId: number) => {
        setSelectedPeople(selectedPeople.filter((person: Person) => person.id !== personId));
    };

    const handleClickOutside = () => {
        if (showStatusMenu) setShowStatusMenu(false);
    };

    const handletaskChange = (type: FilterType) => {
        if (type === 'All') {
            const newValue = !checked.All;

            const updated: CheckedState = {
                All: newValue,
                ART: newValue,
                MDL: newValue,
                RIG: newValue,
                TXT: newValue,
            };

            setChecked(updated);
        } else {
            const updated: CheckedState = {
                ...checked,
                [type]: !checked[type],
            };

            const allChecked = types.every((t) =>
                t === type ? !checked[type] : checked[t]
            );

            updated.All = allChecked;
            setChecked(updated);
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

    const stored = JSON.parse(localStorage.getItem("selectedAsset") || "{}");
    const AssetID = stored.id;
    console.log(AssetID)
    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;
    const [rightPanelTab, setRightPanelTab] = useState('notes');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(600);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 400 && newWidth <= 1000) {
                setRightPanelWidth(newWidth);
            }
        }
    };

    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        console.log("🔍 AssetID:", AssetID);
        console.log("🔍 projectId:", projectId);
        console.log("🔍 stored data:", stored);

        if (!AssetID || !projectId) {
            console.warn("⚠️ Missing AssetID or projectId");
            return;
        }

        axios.post<Task[]>(ENDPOINTS.SEQUENCE_TASK, {
            project_id: projectId,
            entity_type: "asset",
            entity_id: AssetID
        })
            .then(res => {
                console.log("✅ Tasks received:", res.data);
                setTasks(res.data);
            })
            .catch(err => {
                console.error("❌ โหลด task ไม่สำเร็จ", err);
            });
    }, [AssetID, projectId]);

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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";

        return new Date(dateStr).toLocaleString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        if (selectedTask) {
            setIsPanelOpen(false);
            const t = setTimeout(() => setIsPanelOpen(true), 10);
            return () => clearTimeout(t);
        }
    }, [selectedTask]);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // Create Task Form States
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [createTaskForm, setCreateTaskForm] = useState({
        task_name: '',
        status: 'wtg',
        start_date: '',
        due_date: '',
        description: '',
        file_url: '',
    });
    // Handle form input changes
    const handleFormChange = (field: string, value: any) => {
        setCreateTaskForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle create task submission
    const handleCreateTask = async () => {
        if (isCreatingTask) return;

        try {
            if (!createTaskForm.task_name.trim()) {
                alert("กรุณากระบุชื่องาน");
                return;
            }

            setIsCreatingTask(true);

            const payload = {
                project_id: projectId,
                task_name: createTaskForm.task_name.trim(),
                entity_type: 'asset',
                entity_id: AssetID,
                status: createTaskForm.status || 'wtg',
                start_date: createTaskForm.start_date || null,
                due_date: createTaskForm.due_date || null,
                description: createTaskForm.description || null,
                file_url: createTaskForm.file_url || null,
                pipeline_step_id: null
            };

            // สร้าง task
            await axios.post(`${ENDPOINTS.ADD_TASK}`, payload);

            // รีเฟรช tasks
            const tasksRes = await axios.post(ENDPOINTS.SEQUENCE_TASK, {
                project_id: projectId,
                entity_type: "asset",
                entity_id: AssetID
            });
            setTasks(tasksRes.data);

            // รีเซ็ต form
            setCreateTaskForm({
                task_name: '',
                status: 'wtg',
                start_date: '',
                due_date: '',
                description: '',
                file_url: ''
            });
            setShowCreateAsset_Task(false);

            alert("สร้างงานสำเร็จ!");

        } catch (err: any) {
            console.error("Create task error:", err);
            alert(err.response?.data?.message || "ไม่สามารถสร้างงานได้");
        } finally {
            setIsCreatingTask(false);
        }
    };
    // 

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Asset Info':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow label="Asset Name" value={assetData?.asset_name || '-'} />
                        <InfoRow label="Status" value={assetData?.status ? statusConfig[assetData.status].label : '-'} />
                        <InfoRow label="Due Date" value={formatDate(assetData?.dueDate || '')} />
                        <div className="md:col-span-2">
                            <InfoRow label="Description" value={assetData?.description || '-'} />
                        </div>
                    </div>
                );

            case 'Tasks':
                return (
                    <TaskTab
                        tasks={tasks}
                        onTaskClick={(task: Task) => setSelectedTask(task)}
                    />
                );

            case 'Notes':
                return (
                    <NoteTab
                        notes={notes}
                        loadingNotes={loadingNotes}
                        openAssignedDropdown={openAssignedDropdown}
                        setOpenAssignedDropdown={setOpenAssignedDropdown}
                        onContextMenu={handleNoteContextMenu}
                        onDeleteNote={(noteId: number) => {
                            const note = notes.find(n => n.id === noteId);
                            setDeleteNoteConfirm({
                                noteId,
                                subject: note?.subject || ''
                            });
                        }}
                        onNoteClick={(note: Note) => {
                            setSelectedNote(note);
                            setIsPanelOpen(false);
                            setTimeout(() => setIsPanelOpen(true), 10);
                        }}
                    />
                );

            case 'Versions':
                return (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl border border-gray-600/50 shadow-lg">
                        <p className="text-gray-300">Versions content will be displayed here</p>
                    </div>
                );

            case 'Sub Assets':
                return (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl border border-gray-600/50 shadow-lg">
                        <p className="text-gray-300">Sub Assets content will be displayed here</p>
                    </div>
                );

            case 'Publishes':
                return (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl border border-gray-600/50 shadow-lg">
                        <p className="text-gray-300">Publishes content will be displayed here</p>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!assetData) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"
            onClick={handleClickOutside}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsResizing(false)}
        >
            <div className="pt-14">
                <Navbar_Project activeTab="other" />
            </div>

            <div className="pt-12 flex-1">
                <div className="p-6 max-w-[1600px] mx-auto">
                    {/* Header Card */}
                    <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700/50">
                        {/* Breadcrumb */}
                        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                            <span className="hover:text-white cursor-pointer transition-colors">📁 {assetData.sequence}</span>
                            <span className="text-gray-600">›</span>
                            <span className="font-bold text-white">🎬 {assetData.asset_name}</span>
                        </div>

                        {/* Preview Modal */}
                        {showPreview && assetData.thumbnail && (
                            <div
                                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                                onClick={() => setShowPreview(false)}
                            >
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110"
                                >
                                    <X className="w-6 h-6 text-white" />
                                </button>

                                <div className="max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                    {assetData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                        <video
                                            src={ENDPOINTS.image_url + assetData.thumbnail}
                                            className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                            controls
                                            autoPlay
                                        />
                                    ) : (
                                        <img
                                            src={ENDPOINTS.image_url + assetData.thumbnail}
                                            alt="Preview"
                                            className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Main Content */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Thumbnail */}
                            <div className="col-span-3">
                                <div className="relative w-full aspect-video rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 overflow-hidden shadow-lg border border-gray-700/50">
                                    {assetData.thumbnail ? (
                                        assetData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                            <video
                                                src={ENDPOINTS.image_url + assetData.thumbnail}
                                                className="w-full h-full object-cover"
                                                muted
                                                loop
                                                autoPlay

                                            />
                                        ) : (
                                            <img
                                                src={ENDPOINTS.image_url + assetData.thumbnail}
                                                alt="Asset thumbnail"
                                                className="w-full h-full object-cover"
                                            />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                            <Image className="w-8 h-8 text-gray-500" />
                                            <p className="text-gray-500 text-xs">No preview</p>
                                        </div>
                                    )}

                                    {/* Hover Controls */}
                                    {assetData.thumbnail && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-all bg-black/60">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowPreview(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 text-xs font-medium"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    View
                                                </button>
                                                <label className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                                                    <Upload className="w-3 h-3" />
                                                    Change
                                                    <input
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            if (!e.target.files?.[0]) return;

                                                            const file = e.target.files[0];
                                                            const formData = new FormData();

                                                            formData.append("assetId", assetData.id.toString());
                                                            formData.append("file", file);
                                                            formData.append("fileName", file.name);
                                                            formData.append("oldImageUrl", assetData.thumbnail || "");
                                                            formData.append("type", "image");

                                                            try {
                                                                const res = await fetch(ENDPOINTS.UPLOAD_ASSET, {
                                                                    method: "POST",
                                                                    body: formData,
                                                                });

                                                                const data = await res.json();

                                                                if (res.ok) {
                                                                    const newFileUrl = data.file?.fileUrl || data.fileUrl;

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
                                                                } else {
                                                                    alert("Upload failed: " + (data.error || "Unknown error"));
                                                                }
                                                            } catch (err) {
                                                                console.error("❌ Upload error:", err);
                                                                alert("Upload error");
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {!assetData.thumbnail && (
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0]) return;

                                                const file = e.target.files[0];
                                                const formData = new FormData();
                                                formData.append("assetId", assetData.id.toString());
                                                formData.append("file", file);
                                                formData.append("oldImageUrl", assetData.thumbnail || "");
                                                formData.append("type", file.type.split('/')[0]);

                                                try {
                                                    const res = await fetch(ENDPOINTS.UPLOAD_ASSET, {
                                                        method: "POST",
                                                        body: formData,
                                                    });

                                                    const data = await res.json();

                                                    if (res.ok) {
                                                        const newFileUrl = data.file?.fileUrl || data.fileUrl;

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
                                                    }
                                                } catch (err) {
                                                    console.error("❌ Upload error:", err);
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="col-span-9 grid grid-cols-3 gap-3">
                                {/* Asset Name */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>🎬</span>
                                        Asset Name
                                    </label>
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
                                                if (e.key === "Escape") setEditingField(null);
                                            }}
                                            className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1.5 text-white text-sm font-semibold"
                                        />
                                    ) : (
                                        <p
                                            className="text-white font-semibold cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors"
                                            onClick={() => setEditingField('assetName')}
                                        >
                                            {assetData.asset_name}
                                        </p>
                                    )}
                                </div>

                                {/* Status */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 relative">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>🎯</span>
                                        Status
                                    </label>
                                    <button
                                        onClick={handleStatusClick}
                                        className="flex items-center gap-2 px-3 py-1.5 text-white rounded-xl font-medium transition-all w-full justify-between text-sm bg-gradient-to-r from-gray-700 to-gray-700 hover:from-gray-600 hover:to-gray-600"
                                    >
                                        <div className="flex items-center gap-2">
                                            {statusConfig[assetData.status].icon === '-' ? (
                                                <span className="text-gray-400 font-bold">-</span>
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${statusConfig[assetData.status].color}`}></div>
                                            )}
                                            <span className="text-sm">{statusConfig[assetData.status].label}</span>
                                        </div>
                                        <span className="text-xs">▼</span>
                                    </button>

                                    {showStatusMenu && (
                                        <div className="absolute left-0 top-full mt-1 bg-gray-800 rounded-lg shadow-2xl z-50 w-full border border-gray-700">
                                            {(Object.entries(statusConfig) as [StatusType, { label: string; color: string; icon: string }][]).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(key);
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-600 hover:to-gray-600"
                                                >
                                                    {config.icon === '-' ? (
                                                        <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                    ) : (
                                                        <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                                                    )}
                                                    <span className="text-xs text-gray-200">{config.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Type Name */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📁</span>
                                        Type
                                    </label>
                                    <p className="text-white font-semibold px-2 py-1.5 text-sm">{assetData.sequence}</p>
                                </div>

                                {/* Description - ใช้ 3 คอลัมน์ */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 col-span-3">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📝</span>
                                        Description
                                    </label>
                                    {editingField === 'description' ? (
                                        <textarea
                                            value={assetData.description || ''}
                                            autoFocus
                                            rows={2}
                                            onChange={(e) =>
                                                setAssetData(prev => prev ? { ...prev, description: e.target.value } : null)
                                            }
                                            onBlur={() => {
                                                updateAssetField("description", assetData.description);
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    updateAssetField("description", assetData.description);
                                                    setEditingField(null);
                                                }
                                                if (e.key === "Escape") setEditingField(null);
                                            }}
                                            className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1.5 text-white text-xs resize-none"
                                        />
                                    ) : (
                                        <p
                                            className="text-white text-xs cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors line-clamp-2"
                                            onClick={() => setEditingField('description')}
                                        >
                                            {assetData.description || <span className="text-gray-500 italic">Click to add...</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <nav className="flex items-center gap-2 border-t border-gray-700/50 pt-4 mt-4 overflow-x-auto pb-1">
                            {['Asset Info', 'Tasks', 'Notes', 'Versions', 'Sub Assets', 'Publishes'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab
                                        ? 'text-white shadow-lg bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-700 hover:to-blue-600'
                                        : 'text-gray-300 bg-gradient-to-r from-gray-700 to-gray-700 hover:from-gray-600 hover:to-gray-600'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content Section */}
                    <div className="mt-4 p-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg text-white font-bold flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                {activeTab}
                            </h3>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                {activeTab === 'Tasks' && (
                                    <button
                                        onClick={() => setShowCreateAsset_Task(true)}
                                        className="px-3 py-1.5  text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                                    >
                                        <span>+</span>
                                        Add Task
                                    </button>
                                )}

                                {activeTab === 'Notes' && (
                                    <button
                                        onClick={() => setShowCreateAsset_Note(true)}
                                        className="px-3 py-1.5 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                                    >
                                        <span>+</span>
                                        Add Note
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            {/* Create Task Modal */}
            {showCreateAsset_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => !isCreatingTask && setShowCreateAsset_Task(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">for {assetData?.asset_name}</span>
                            </h2>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            {/* Task Name - Required */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Task Name: <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter task name"
                                    value={createTaskForm.task_name}
                                    onChange={(e) => handleFormChange('task_name', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            {/* Link to Asset (Read-only) */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Link to:
                                </label>
                                <input
                                    type="text"
                                    value={`Asset: ${assetData?.asset_name}`}
                                    readOnly
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-400 text-sm cursor-not-allowed"
                                />
                            </div>

                            {/* Status */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Status:
                                </label>
                                <select
                                    value={createTaskForm.status}
                                    onChange={(e) => handleFormChange('status', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="wtg">Waiting to Start</option>
                                    <option value="ip">In Progress</option>
                                    <option value="fin">Final</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Start Date:
                                </label>
                                <input
                                    type="date"
                                    value={createTaskForm.start_date}
                                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                                />
                            </div>

                            {/* Due Date */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Due Date:
                                </label>
                                <input
                                    type="date"
                                    value={createTaskForm.due_date}
                                    onChange={(e) => handleFormChange('due_date', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                                />
                            </div>

                            {/* Description */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-start">
                                <label className="text-sm text-gray-300 text-right pt-2">
                                    Description:
                                </label>
                                <textarea
                                    placeholder="Enter task description (optional)"
                                    value={createTaskForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    rows={3}
                                    className="px-3 py-2 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500 resize-none"
                                />
                            </div>

                            {/* File URL */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    File URL:
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://example.com/image.jpg"
                                    value={createTaskForm.file_url}
                                    onChange={(e) => handleFormChange('file_url', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#0a1018] to-[#0d1420] rounded-b flex justify-between items-center gap-3">
                            <button
                                onClick={() => setShowCreateAsset_Task(false)}
                                disabled={isCreatingTask}
                                className="px-4 h-9 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-700 hover:to-gray-700 text-white text-sm rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleCreateTask}
                                disabled={isCreatingTask}
                                className="px-4 h-9 bg-gradient-to-r from-[#1e88e5] to-[#1565c0] hover:from-[#1976d2] hover:to-[#0d47a1] text-sm rounded-lg text-white shadow-lg shadow-blue-500/30 transition-all font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreatingTask ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>กำลังสร้าง...</span>
                                    </>
                                ) : (
                                    'Create Task'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Note Modal */}
            {showCreateAsset_Note && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/60"
                        onClick={() => setShowCreateAsset_Note(false)}
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <div
                            style={{
                                transform: `translate(${noteModalPosition?.x || 0}px, ${noteModalPosition?.y || 0}px)`
                            }}
                            className="relative w-full max-w-xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden pointer-events-auto"
                        >
                            <div
                                onMouseDown={(e) => {
                                    const startX = e.clientX;
                                    const startY = e.clientY;
                                    const startPos = noteModalPosition || { x: 0, y: 0 };

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                        const deltaX = moveEvent.clientX - startX;
                                        const deltaY = moveEvent.clientY - startY;
                                        setNoteModalPosition({
                                            x: startPos.x + deltaX,
                                            y: startPos.y + deltaY
                                        });
                                    };

                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                    };

                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                }}
                                className="px-5 py-3 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 cursor-grab active:cursor-grabbing select-none"
                            >
                                <div className="flex items-baseline justify-between">
                                    <div className="flex items-baseline gap-2">
                                        <h2 className="text-base font-semibold text-white">New Note</h2>
                                        <span className="text-xs text-blue-300/60">- Global Form</span>
                                    </div>
                                    <button
                                        onClick={() => setShowCreateAsset_Note(false)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="text-gray-400 hover:text-white text-xl leading-none transition-colors"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="px-5 py-4 space-y-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-300">
                                        Links
                                    </label>
                                    <input
                                        disabled
                                        type="text"
                                        defaultValue={assetData?.asset_name || ''}
                                        className="w-full h-8 px-3 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-300">
                                        📄 Tasks
                                    </label>
                                    <div className="p-3 bg-[#0a1018] border border-blue-500/30 rounded-lg">
                                        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                                            {(['All', 'ART', 'MDL', 'RIG', 'TXT'] as FilterType[]).map((t) => (
                                                <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked[t]}
                                                        onChange={() => handletaskChange(t)}
                                                        className="w-3.5 h-3.5 rounded border-blue-500/30 bg-[#0a1018] text-blue-500 focus:ring-2 focus:ring-blue-500/60"
                                                    />
                                                    <span className="text-xs text-gray-300">{t}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-300">
                                        Attach files
                                    </label>

                                    <label className="inline-flex items-center gap-2 px-3 h-8 rounded-lg border border-blue-500/30 bg-[#0a1018] text-blue-200 text-sm cursor-pointer hover:bg-blue-500/10 transition-all">
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
                                        </svg>
                                        Upload file
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFiletaskChange}
                                            className="hidden"
                                        />
                                    </label>

                                    {files.length > 0 && (
                                        <div className="space-y-1 mt-1">
                                            {files.map((file, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between px-2 py-1 text-xs bg-blue-500/10 border border-blue-500/20 rounded"
                                                >
                                                    <span className="truncate text-blue-100">
                                                        {file.name}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removetaskFile(index)}
                                                        className="text-blue-300 hover:text-red-400"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="block text-xs font-medium text-gray-300">
                                        To
                                    </label>

                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {selectedPeople.map((person) => (
                                            <span
                                                key={person.id}
                                                className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-200 rounded"
                                            >
                                                {person.name}
                                                <button
                                                    type="button"
                                                    onClick={() => removePerson(person.id)}
                                                    className="text-blue-300 hover:text-red-400"
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>

                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setOpen(true);
                                        }}
                                        onFocus={() => setOpen(true)}
                                        onBlur={() => setTimeout(() => setOpen(false), 200)}
                                        className="w-full h-8 px-3 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                                        placeholder={loading ? "Loading..." : "Add people..."}
                                        disabled={loading}
                                    />

                                    {open && filteredPeople.length > 0 && (
                                        <div className="absolute z-10 mt-1 w-full bg-[#0a1018] border border-blue-500/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {filteredPeople.map((person) => (
                                                <div
                                                    key={person.id}
                                                    onClick={() => addPerson(person)}
                                                    className="px-3 py-1.5 text-sm text-gray-200 hover:bg-blue-500/20 cursor-pointer"
                                                >
                                                    <div className="font-medium">{person.name}</div>
                                                    <div className="text-xs text-gray-400">{person.email}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {open && query && filteredPeople.length === 0 && !loading && (
                                        <div className="absolute z-10 mt-1 w-full bg-[#0a1018] border border-blue-500/30 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
                                            No people found
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-300">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        className="w-full h-8 px-3 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-300">
                                        Type
                                    </label>

                                    <select
                                        value={type ?? ''}
                                        onChange={(e) => setType(e.target.value as NoteType)}
                                        className={`w-full h-8 px-3 bg-[#0a1018] border rounded-lg text-sm transition-all
                                        ${type === null
                                                ? 'border-red-500/50 text-gray-400'
                                                : 'border-blue-500/30 text-blue-50'}
                                            focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400
                                        `}
                                    >
                                        <option value="" disabled hidden>
                                            — Please select —
                                        </option>
                                        <option value="Client">Client</option>
                                        <option value="Internal">Internal</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-300">
                                        Message
                                    </label>
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="Write your note here..."
                                        rows={3}
                                        className="w-full px-3 py-2 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-3 bg-gradient-to-r from-[#0a1018] to-[#0d1420] border-t border-blue-500/30 flex justify-end items-center gap-2">
                                <button
                                    onClick={() => setShowCreateAsset_Note(false)}
                                    className="px-4 h-8 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-700 hover:to-gray-700 text-xs rounded-lg text-gray-200 transition-all font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    className="px-4 h-8 bg-gradient-to-r from-[#2196F3] to-[#1976D2] hover:from-[#1976D2] hover:to-[#1565C0] text-xs rounded-lg text-white shadow-lg shadow-blue-500/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleCreateNote}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Creating...' : 'Create Note'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Context Menu for Notes */}
            {noteContextMenu && (
                <div
                    className="fixed z-[90] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{
                        left: noteContextMenu.x,
                        top: noteContextMenu.y,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            if (noteContextMenu) {
                                setDeleteNoteConfirm({
                                    noteId: noteContextMenu.note.id,
                                    subject: noteContextMenu.note.subject,
                                });
                            }
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                    >
                        🗑️ Delete Note
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteNoteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
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
                                    <h3 className="text-lg font-semibold text-zinc-100">
                                        Delete Note
                                    </h3>
                                    <p className="text-sm text-zinc-400">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">
                                    Are you sure you want to delete this note?
                                </p>
                                <p className="font-semibold text-zinc-100 truncate">
                                    "{deleteNoteConfirm.subject}"
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteNoteConfirm(null);
                                    }}
                                    className="px-4 py-2 rounded-lg bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(deleteNoteConfirm.noteId);
                                        alert('ลบสำเร็จแล้ว');
                                        setDeleteNoteConfirm(null);
                                        fetchNotes();
                                    }}
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete Note
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Right Panel - Task Details */}
            {selectedTask && (
                <div
                    className={`
                        fixed right-0 top-26 bottom-0
                        bg-[#2a2d35] shadow-2xl flex z-40
                        transform transition-transform duration-300 ease-out
                        ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
                    `}
                    style={{ width: `${rightPanelWidth}px` }}
                >
                    {/* Resize Handle */}
                    <div
                        className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
                        onMouseDown={handleMouseDown}
                    />

                    {/* Panel Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="bg-[#1a1d24] border-b border-gray-700">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <img src={ENDPOINTS.image_url + selectedTask.file_url} alt="" className="w-12 h-12 object-cover rounded" />
                                    <div>
                                        <div className="text-sm text-gray-400">
                                            Asset › {selectedTask.task_name.split('/')[0].trim()}
                                        </div>
                                        <h2 className="text-xl text-white font-normal mt-1">
                                            {selectedTask?.task_name.split('/').pop()?.trim()}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPanelOpen(false);
                                        setTimeout(() => setSelectedTask(null), 300);
                                    }}
                                    className="text-gray-400 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Status bar */}
                            <div className="flex items-center gap-4 px-4 py-3">
                                <span className={`px-3 py-1 rounded text-xs font-medium ${selectedTask.status === 'wtg'
                                    ? 'text-gray-400 bg-gray-500/20'
                                    : selectedTask.status === 'ip'
                                        ? 'text-blue-400 bg-blue-500/20'
                                        : 'text-green-400 bg-green-500/20'
                                    }`}>
                                    {selectedTask.status}
                                </span>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>📅</span>
                                    <span>ครบกำหนด {formatDateThai(selectedTask.due_date)}</span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-t border-gray-700">
                                <button
                                    onClick={() => setRightPanelTab('notes')}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${rightPanelTab === 'notes'
                                        ? 'text-white border-b-2 border-blue-500'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <span>📝</span>
                                    <span>NOTES</span>
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('versions')}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${rightPanelTab === 'versions'
                                        ? 'text-white border-b-2 border-blue-500'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <span>💎</span>
                                    <span>VERSIONS</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto p-4">
                            {rightPanelTab === 'notes' && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Write a note..."
                                        className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500 mb-4"
                                    />
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Type to filter"
                                            className="flex-1 px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500"
                                        />
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any label</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any time</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any note</option>
                                        </select>
                                    </div>
                                    <div className="text-center text-gray-500 py-12">
                                        No notes
                                    </div>
                                </div>
                            )}

                            {rightPanelTab === 'versions' && (
                                <div>
                                    <div className="flex gap-2 mb-4 flex-wrap">
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any type</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any asset type</option>
                                        </select>
                                        <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                                            <option>Any status</option>
                                        </select>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm">
                                            <input type="checkbox" id="latestVersion" />
                                            <label htmlFor="latestVersion">Latest version</label>
                                        </div>
                                        <div className="flex-1"></div>
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">⊞</button>
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">☰</button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2, 3, 4].map((v) => (
                                            <div key={v} className="bg-[#1a1d24] rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors">
                                                <div className="relative aspect-video bg-gray-800">
                                                    <img
                                                        src={ENDPOINTS.image_url + selectedTask.file_url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                                                        v{v}
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <div className="text-sm text-white mb-1">Version v{v}</div>
                                                    <div className="text-xs text-gray-400 mb-2">{selectedTask.task_name.split('/')[0].trim()}</div>
                                                    <div className="text-xs text-gray-500 mb-2">Asset task</div>
                                                    <div className="text-xs text-gray-400">Task</div>
                                                    <div className={`mt-2 h-1 rounded ${v === 3 ? 'bg-emerald-500' : v === 2 ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                                        <div className="text-4xl text-gray-600 mb-2">☁️</div>
                                        <div className="text-sm text-gray-400">Drag and drop your files here, or browse</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Right Panel - Note Details */}
            {selectedNote && (
                <div
                    className={`
                        fixed right-0 top-26 bottom-0
                        bg-[#2a2d35] shadow-2xl flex z-40
                        transform transition-transform duration-300 ease-out
                        ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}
                    `}
                    style={{ width: `${rightPanelWidth}px` }}
                >
                    {/* Resize Handle */}
                    <div
                        className="w-1 bg-gray-700 hover:bg-blue-500 cursor-col-resize transition-colors"
                        onMouseDown={handleMouseDown}
                    />

                    {/* Panel Content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="bg-[#1a1d24] border-b border-gray-700">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div>
                                        <div className="text-sm text-gray-400">
                                            Asset › {selectedNote?.note_type}
                                        </div>
                                        <h2 className="text-xl text-white font-normal mt-1">
                                            {selectedNote?.subject}
                                        </h2>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsPanelOpen(false);
                                        setTimeout(() => setSelectedNote(null), 300);
                                    }}
                                    className="text-gray-400 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="flex items-center justify-center">
                                {selectedNote?.file_url ? (
                                    <div className="flex items-center justify-center">
                                        <img
                                            src={ENDPOINTS.image_url + selectedNote?.file_url || ''}
                                            alt=""
                                            className="w-80 h-80 object-cover rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-80 h-80 rounded-lg shadow-md border-2 border-dashed border-gray-600 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                                            <Image className="w-8 h-8 text-gray-500" />
                                        </div>
                                        <p className="text-gray-500 text-sm font-medium">No Thumbnail</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 px-4 py-3">
                                <span className={`px-3 py-1 rounded text-xs font-medium ${selectedNote?.status === 'wtg'
                                    ? 'text-gray-400 bg-gray-500/20'
                                    : selectedNote?.status === 'ip'
                                        ? 'text-blue-400 bg-blue-500/20'
                                        : 'text-green-400 bg-green-500/20'
                                    }`}>
                                    {selectedNote?.status}
                                </span>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <span>📅</span>
                                    <span>วันที่สร้าง {formatDateThai(selectedNote?.created_at)}</span>
                                </div>
                                <User className="w-4 h-4 text-gray-400" />
                                <span>ผู้รับผิดชอบ : {selectedNote?.assigned_people?.map((person, index) => (
                                    <span key={index}>{person}{index < (selectedNote.assigned_people?.length || 0) - 1 ? ' , ' : ''}</span>
                                ))}</span>
                            </div>

                            <div className="flex border-t border-gray-700">
                                <button
                                    onClick={() => setRightPanelTab('notes')}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${rightPanelTab === 'notes'
                                        ? 'text-white border-b-2 border-blue-500'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <span>📝</span>
                                    <span>NOTES</span>
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-auto p-4">
                            {rightPanelTab === 'notes' && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder={selectedNote?.body || 'Write a note...'}
                                        value={selectedNote?.body || ''}
                                        onChange={(e) => {
                                            if (selectedNote) {
                                                setSelectedNote({ ...selectedNote, body: e.target.value });
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500 mb-4"
                                    />
                                </div>
                            )}
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