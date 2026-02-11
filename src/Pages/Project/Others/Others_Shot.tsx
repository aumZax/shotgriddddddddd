/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import { Eye, Image, Upload, User, X, } from 'lucide-react';
import ENDPOINTS from '../../../config';
import axios from 'axios';
import TaskTab from "../../../components/TaskTab";
import NoteTab from '../../../components/NoteTab';
import AssetTab from '../../../components/AssetTab';


// Status configuration
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

interface ShotData {
    id: number;
    shotCode: string;
    sequence: string;
    status: StatusType;
    tags: string[];
    thumbnail: string;
    description: string;
    dueDate: string;

}
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

const shotFieldMap: Record<keyof ShotData, string | null> = {
    id: null,
    shotCode: "shot_name",
    sequence: "sequence_name",
    status: "status",
    tags: null,
    thumbnail: "thumbnail",
    description: "description",
    dueDate: "due_date"
};



// ⭐ เพิ่ม type ที่ขาดหาย
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

// ⭐ อัปเดต Task type ให้ตรงกับ TaskTab
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
    reviewers?: TaskReviewer[];      // ⭐ เพิ่ม
    pipeline_step?: PipelineStep | null;  // ⭐ เพิ่ม
};

type TaskAssignee = {
    id: number;
    username: string;
};

// ⭐ เพิ่ม Asset type
interface Asset {
    id: number;
    asset_name: string;
    status: string;
    description: string;
    created_at: string;
    asset_shot_id?: number;
}



// Get data from localStorage
const getInitialShotData = () => {
    const stored = localStorage.getItem("selectedShot");
    if (stored) {
        const data = JSON.parse(stored);
        return {
            id: data.id || 1,
            shotCode: data.shot_name || "Unknown Shot",
            sequence: data.sequence || "Unknown Sequence",
            status: (data.status || "wtg") as StatusType,
            tags: data.tags || [],
            thumbnail: data.thumbnail || "",
            description: data.description || "No description",
            dueDate: data.dueDate || new Date().toISOString().split('T')[0]
        };
    }
    // Fallback if no data in localStorage
    return {
        id: 1,
        shotCode: "No Shot Selected",
        sequence: "N/A",
        status: "wtg" as StatusType,
        tags: [],
        thumbnail: "",
        description: "Please select a shot first",
        dueDate: new Date().toISOString().split('T')[0]
    };
};

export default function Others_Shot() {
    const [activeTab, setActiveTab] = useState('Shot Info');
    const [shotData, setShotData] = useState<ShotData>(getInitialShotData());
    const [editingField, setEditingField] = useState<string | null>(null);

    const [showPreview, setShowPreview] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [type, setType] = useState<string | null>(null);

    const [showCreateShot_Task, setShowCreateShot_Task] = useState(false);
    const [showCreateShot_Note, setShowCreateShot_Note] = useState(false);
    const [showCreateShot_Versions, setShowCreateShot_Versions] = useState(false);
    const [showCreateShot_Assets, setShowCreateShot_Assets] = useState(false);
    const [showCreateAsset_Note, setShowCreateAsset_Note] = useState(false);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [notes, setNotes] = useState<Note[]>([]);
    const [open, setOpen] = useState(false);
    const [openAssignedDropdown, setOpenAssignedDropdown] = useState<string | number | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([])
    const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
    const [body, setBody] = useState('');
    const currentUser = localStorage.getItem('currentUser') || 'Unknown';
    const [noteModalPosition, setNoteModalPosition] = useState({ x: 0, y: 0 });
    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const types: FilterType[] = ['ART', 'MDL', 'RIG', 'TXT'];
    const [subject, setSubject] = useState(
        shotData?.shotCode ? `Note on ${shotData.shotCode}` : ""
    );
    // +++++++++++++++++++++++++++++++++++++++ shot assets +++++++++++++++++++++++++++++++
    const [shotAssets, setShotAssets] = useState<Asset[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    // ++++++++++++++++++++++++++++++++++++++ storage +++++++++++++++++++++++++++++++

    const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
    const shotId = stored.id;

    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;
    // const projectName = projectData?.projectName;


    // ++++++++++++++++++++++++++++++++++++++++ right
    const [rightPanelTab, setRightPanelTab] = useState('notes'); // ← เพิ่มบรรทัดนี้

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [, setSelectedFile] = useState<File | null>(null);

    const [rightPanelWidth, setRightPanelWidth] = useState(600);
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        e.preventDefault();
    };
    const addPerson = (person: Person) => {
        setSelectedPeople([...selectedPeople, person]);
        setQuery('');
        setOpen(false);
    };


    const removetaskFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const [noteContextMenu, setNoteContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        note: Note;
    } | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 400 && newWidth <= 1000) {
                setRightPanelWidth(newWidth);
            }
        }
    };
    const removePerson = (personId: number) => {
        setSelectedPeople(selectedPeople.filter((person: Person) => person.id !== personId));
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const handleStatusClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowStatusMenu(!showStatusMenu);
    };

    const handleFiletaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selected = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selected]);

        e.target.value = '';
    };

    const filteredPeople = allPeople.filter(
        (person: Person) =>
            person.name.toLowerCase().includes(query.toLowerCase()) &&
            !selectedPeople.some((selected: Person) => selected.id === person.id)
    );

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

    const fetchNotes = async () => {
        if (!shotData?.id) return;

        setLoadingNotes(true);
        try {
            const response = await fetch(`${ENDPOINTS.GET_NOTES}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectId: localStorage.getItem("projectId"),
                    noteType: 'shot',
                    typeId: shotData.id
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

    // +++++++++++++++++++++++++++++++ fetch shot assets ++++++++++++++++++++++++++++++
    const fetchShotAssets = async () => {
        if (!shotData?.id) return;

        setLoadingAssets(true);
        try {
            const response = await fetch(ENDPOINTS.GET_ASSET_SHOT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shotId: shotData.id })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                setShotAssets(result.data || []);
            } else {
                setShotAssets([]);
            }
        } catch (error) {
            console.error('Error fetching shot assets:', error);
            setShotAssets([]);
        } finally {
            setLoadingAssets(false);
        }
    };
    // เพิ่ม useEffect นี้หลัง useEffect อื่นๆ
    useEffect(() => {
        if (activeTab === 'Assets') {
            fetchShotAssets();
        }
    }, [activeTab, shotData?.id]);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ status ++++++++++++++++++++++++++++++++++++++++++

    const handleStatusChange = async (newStatus: StatusType) => {
        try {
            // 1️⃣ ยิง API อัปเดต DB
            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shotData.id,
                field: "status",
                value: newStatus
            });

            // 2️⃣ update local state
            const updated = { ...shotData, status: newStatus };
            setShotData(updated);
            setShowStatusMenu(false);

            // 3️⃣ sync localStorage
            localStorage.setItem(
                "selectedShot",
                JSON.stringify({
                    id: updated.id,
                    shot_name: updated.shotCode,
                    sequence: updated.sequence,
                    description: updated.description,
                    status: newStatus,
                    tags: updated.tags,
                    thumbnail: updated.thumbnail,
                    dueDate: updated.dueDate
                })
            );

        } catch (error) {
            console.error("❌ update status failed:", error);
            alert("Failed to update status");
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateShotField = async (
        field: keyof ShotData,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
    ) => {
        const dbField = shotFieldMap[field];

        if (!dbField) {
            console.warn(`⚠️ Field "${field}" cannot be updated`);
            return;
        }

        try {
            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shotData.id,
                field: dbField, // ✅ ส่งชื่อ column จริง
                value
            });

            // update state
            setShotData(prev => ({ ...prev, [field]: value }));

            // sync localStorage
            // const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
            localStorage.setItem(
                "selectedShot",
                JSON.stringify({
                    ...stored,
                    [dbField]: value
                })
            );
        } catch (err) {
            console.error("❌ update shot failed:", err);
            alert("Update failed");
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

    const updateDescription = async (payload: { description: string }) => {
        try {
            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shotData.id,
                field: "description",
                value: payload.description
            });

            const updated = { ...shotData, description: payload.description };
            setShotData(updated);

            // sync localStorage
            // const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
            localStorage.setItem(
                "selectedShot",
                JSON.stringify({
                    ...stored,
                    description: payload.description
                })
            );
        } catch (err) {
            console.error("❌ update description failed:", err);
            alert("Failed to update description");
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
                formData.append("shotId", shotData?.id.toString() || "");
                formData.append("fileName", fileToUpload.name);
                formData.append("type", "note");

                const uploadResponse = await fetch(ENDPOINTS.UPLOAD_SHOT, {
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
                noteType: 'shot',
                typeId: shotData?.id ?? null,
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

            const createResponse = await fetch(ENDPOINTS.CREATE_SHOT_NOTE, {
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
            setSubject(shotData?.shotCode ? `Note on ${shotData.shotCode}` : "");
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

    // Close dropdown when clicking outside
    const handleClickOutside = () => {
        if (showStatusMenu) setShowStatusMenu(false);
    };

    // +++++++++++++++++++++++++++++ shot task 
    const [tasks, setTasks] = useState<Task[]>([]);

    const [checked, setChecked] = useState<CheckedState>({
        All: false,
        ART: false,
        MDL: false,
        RIG: false,
        TXT: false,
    });
    const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{
        noteId: number;
        subject: string;
    } | null>(null);



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

    useEffect(() => {
        if (deleteNoteConfirm) {
            setNoteContextMenu(null);
        }
    }, [deleteNoteConfirm]);

    useEffect(() => {
        const closeMenu = () => setNoteContextMenu(null);

        if (noteContextMenu) {
            document.addEventListener("click", closeMenu);
            return () => document.removeEventListener("click", closeMenu);
        }
    }, [noteContextMenu]);

    useEffect(() => {
        console.log("🔍 shotId:", shotId);
        console.log("🔍 projectId:", projectId);
        console.log("🔍 stored data:", stored);

        if (!shotId || !projectId) {
            console.warn("⚠️ Missing shotId or projectId");
            return;
        }

        axios.post<Task[]>(ENDPOINTS.SHOT_TASK, {
            project_id: projectId,
            entity_type: "shot",
            entity_id: shotId
        })
            .then(res => {
                console.log("✅ Tasks received:", res.data);
                setTasks(res.data);
            })
            .catch(err => {
                console.error("❌ โหลด task ไม่สำเร็จ", err);
            });
    }, [shotId, projectId]); // เพิ่ม dependency

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Date  ++++++++++++++++++++++++++++++++++++++++++
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

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ right
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    useEffect(() => {
        if (selectedTask) {
            setIsPanelOpen(false);
            const t = setTimeout(() => setIsPanelOpen(true), 10);
            return () => clearTimeout(t);
        }
    }, [selectedTask]);

    // ++++++++++++++++++++++++++++++++++ task create ++++++++++++++++++++++++++
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [createTaskForm, setCreateTaskForm] = useState({
        task_name: '',
        status: 'wtg',
        start_date: '',
        due_date: '',
        description: '',
        file_url: '',
    });

    // Handle form change
    const handleFormChange = (field: string, value: any) => {
        setCreateTaskForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle create task
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
                entity_type: 'shot',
                entity_id: shotId,
                status: createTaskForm.status || 'wtg',
                start_date: createTaskForm.start_date || null,
                due_date: createTaskForm.due_date || null,
                description: createTaskForm.description || null,
                file_url: createTaskForm.file_url || null,
                pipeline_step_id: null  // ตั้งเป็น null
            };

            // สร้าง task
            await axios.post(`${ENDPOINTS.ADD_TASK}`, payload);

            // รีเฟรชข้อมูล tasks
            const tasksRes = await axios.post(ENDPOINTS.SHOT_TASK, {
                project_id: projectId,
                entity_type: "shot",
                entity_id: shotId
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
            setShowCreateShot_Task(false);

            alert("สร้างงานสำเร็จ!");

        } catch (err: any) {
            console.error("Create task error:", err);
            alert(err.response?.data?.message || "ไม่สามารถสร้างงานได้");
        } finally {
            setIsCreatingTask(false);
        }
    };


    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ ++++++++++++++++++++++++++++++




    const renderTabContent = () => {
        switch (activeTab) {
            case 'Shot Info':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow label="Shot Code" value={shotData.shotCode} />
                        <InfoRow label="Sequence" value={shotData.sequence} />
                        <InfoRow label="Status" value={statusConfig[shotData.status].label} />
                        <InfoRow label="Due Date" value={shotData.dueDate} />
                        <div className="md:col-span-2">
                            <InfoRow label="Description" value={shotData.description} />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <VersionCard version="v001" />
                        <VersionCard version="v002" />
                    </div>
                );

            case 'Assets':
                return (
                    <AssetTab
                        shotAssets={shotAssets}
                        loadingAssets={loadingAssets}
                        formatDateThai={formatDateThai}
                    />
                );

            case 'Publishes':
                return (
                    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-6 rounded-xl border border-gray-600/50 shadow-lg">
                        <div className="space-y-3 text-gray-200">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📤</span>
                                <div>
                                    <p className="font-medium">Last publish: v002</p>
                                    <p className="text-sm text-gray-400 mt-1">Published by John Doe</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'Files':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all hover:shadow-lg cursor-pointer">
                            <p className="flex items-center gap-3 text-gray-200">
                                <span className="text-2xl">📄</span>
                                <span className="font-medium">storyboard.pdf</span>
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all hover:shadow-lg cursor-pointer">
                            <p className="flex items-center gap-3 text-gray-200">
                                <span className="text-2xl">🖼️</span>
                                <span className="font-medium">reference.jpg</span>
                            </p>
                        </div>
                    </div>
                );

            case 'History':
                return (
                    <div className="space-y-2">
                        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg border-l-2 border-blue-500/50">
                            <span className="text-sm text-gray-400">•</span>
                            <p className="text-sm text-gray-300">Shot created by John</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg border-l-2 border-green-500/50">
                            <span className="text-sm text-gray-400">•</span>
                            <p className="text-sm text-gray-300">Status changed to In Progress</p>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg border-l-2 border-purple-500/50">
                            <span className="text-sm text-gray-400">•</span>
                            <p className="text-sm text-gray-300">Version v002 uploaded</p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800" onClick={handleClickOutside}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsResizing(false)}
        >
            <div className="pt-14">
                <Navbar_Project activeTab="other" />
            </div>

            <div className="pt-12 flex-1">
                <div className="p-6 max-w-[1600px] mx-auto">
                    {/* Header Card - ปรับให้กระชับขึ้น */}
                    <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700/50">
                        {/* Breadcrumb - ย่อให้เล็กลง */}
                        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                            <span className="hover:text-white cursor-pointer transition-colors">📁 {shotData.sequence}</span>
                            <span className="text-gray-600">›</span>
                            <span className="font-bold text-white">🎬 {shotData.shotCode}</span>
                        </div>

                        {/* Preview Modal */}
                        {showPreview && shotData.thumbnail && (
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
                                    {shotData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                        <video
                                            src={ENDPOINTS.image_url + shotData.thumbnail}
                                            className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                            controls
                                            autoPlay
                                        />
                                    ) : (
                                        <img
                                            src={ENDPOINTS.image_url + shotData.thumbnail}
                                            alt="Preview"
                                            className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Main Content - ปรับให้อยู่ในแถวเดียว */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Thumbnail - ลดขนาดลง */}
                            <div className="col-span-3">
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-600/30 group">
                                    {/* Background gradient - animated */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black animate-pulse"></div>

                                    {shotData.thumbnail ? (
                                        shotData.thumbnail.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                            <video
                                                src={ENDPOINTS.image_url + shotData.thumbnail}
                                                className="relative w-full h-full object-cover z-10"
                                                muted
                                                loop
                                                autoPlay
                                            />
                                        ) : (
                                            <img
                                                src={ENDPOINTS.image_url + shotData.thumbnail}
                                                alt="Shot thumbnail"
                                                className="relative w-full h-full object-cover z-10"
                                            />
                                        )
                                    ) : (
                                        <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 z-10">
                                            <div className="p-4 rounded-full bg-gray-800/50 backdrop-blur-sm">
                                                <Image className="w-10 h-10 text-gray-400" />
                                            </div>
                                            <p className="text-gray-400 text-sm font-medium">No preview available</p>
                                            <p className="text-gray-500 text-xs">Click to upload</p>
                                        </div>
                                    )}

                                    {/* Hover Controls */}
                                    {shotData.thumbnail && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-20">
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowPreview(true);
                                                    }}
                                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-400 hover:to-blue-400 active:scale-95 text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-blue-500/50 transition-all duration-200"

                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                                <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg flex items-center gap-2 cursor-pointer text-sm font-medium shadow-lg hover:shadow-emerald-500/50 transition-all duration-200">
                                                    <Upload className="w-4 h-4" />
                                                    Change
                                                    <input
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            if (!e.target.files?.[0]) return;

                                                            const file = e.target.files[0];
                                                            const formData = new FormData();

                                                            formData.append("shotId", shotData.id.toString());
                                                            formData.append("file", file);
                                                            formData.append("fileName", file.name);
                                                            formData.append("oldImageUrl", shotData.thumbnail || "");
                                                            formData.append("type", file.type.split('/')[0]);

                                                            try {
                                                                const res = await fetch(ENDPOINTS.UPLOAD_SHOT, {
                                                                    method: "POST",
                                                                    body: formData,
                                                                });

                                                                const data = await res.json();

                                                                if (res.ok) {
                                                                    const newFileUrl = data.file?.fileUrl || data.fileUrl;
                                                                    setShotData(prev => ({ ...prev, thumbnail: newFileUrl }));

                                                                    const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
                                                                    const updated = { ...stored, thumbnail: newFileUrl };
                                                                    localStorage.setItem("selectedShot", JSON.stringify(updated));
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

                                    {/* Upload zone when no thumbnail */}
                                    {!shotData.thumbnail && (
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0]) return;

                                                const file = e.target.files[0];
                                                const formData = new FormData();
                                                formData.append("shotId", shotData.id.toString());
                                                formData.append("file", file);
                                                formData.append("oldImageUrl", shotData.thumbnail || "");
                                                formData.append("fileName", file.name);
                                                formData.append("type", file.type.split('/')[0]);

                                                try {
                                                    const res = await fetch(ENDPOINTS.UPLOAD_SHOT, {
                                                        method: "POST",
                                                        body: formData,
                                                    });

                                                    const data = await res.json();

                                                    if (res.ok) {
                                                        const newFileUrl = data.file?.fileUrl || data.fileUrl;
                                                        setShotData(prev => ({ ...prev, thumbnail: newFileUrl }));

                                                        const stored = JSON.parse(localStorage.getItem("selectedShot") || "{}");
                                                        const updated = { ...stored, thumbnail: newFileUrl };
                                                        localStorage.setItem("selectedShot", JSON.stringify(updated));
                                                    }
                                                } catch (err) {
                                                    console.error("❌ Upload error:", err);
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Info Grid - ย่อให้อยู่ในพื้นที่เดียว */}
                            <div className="col-span-9 grid grid-cols-3 gap-3">
                                {/* Shot Code */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>🎬</span>
                                        Shot Code
                                    </label>
                                    {editingField === 'shotCode' ? (
                                        <input
                                            value={shotData.shotCode}
                                            autoFocus
                                            onChange={(e) => setShotData(prev => ({ ...prev, shotCode: e.target.value }))}
                                            onBlur={() => {
                                                updateShotField("shotCode", shotData.shotCode);
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    updateShotField("shotCode", shotData.shotCode);
                                                    setEditingField(null);
                                                }
                                                if (e.key === "Escape") setEditingField(null);
                                            }}
                                            className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1.5 text-white text-sm font-semibold"
                                        />
                                    ) : (
                                        <p
                                            className="text-white font-semibold cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors"
                                            onClick={() => setEditingField('shotCode')}
                                        >
                                            {shotData.shotCode}
                                        </p>
                                    )}
                                </div>

                                {/* Sequence */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📁</span>
                                        Sequence
                                    </label>
                                    <p className="text-white font-semibold px-2 py-1.5">{shotData.sequence}</p>
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
                                            {statusConfig[shotData.status].icon === '-' ? (
                                                <span className="text-gray-400 font-bold">-</span>
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${statusConfig[shotData.status].color}`}></div>
                                            )}
                                            <span className="text-sm">{statusConfig[shotData.status].label}</span>
                                        </div>
                                        <span className="text-xs">▼</span>
                                    </button>

                                    {showStatusMenu && (
                                        <div className="absolute left-0 mt-1 bg-gray-800 rounded-lg shadow-2xl z-50 w-full border border-gray-700">
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

                                {/* Due Date */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📅</span>
                                        Due Date
                                    </label>
                                    <p className="text-white font-semibold px-2 py-1.5 text-sm">{shotData.dueDate}</p>
                                </div>

                                {/* Tags */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>🏷️</span>
                                        Tags
                                    </label>
                                    {shotData.tags.length > 0 ? (
                                        <div className="flex gap-1.5 flex-wrap">
                                            {shotData.tags.map((tag, index) => (
                                                <span key={index} className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-xs italic px-2 py-1.5">No tags</p>
                                    )}
                                </div>

                                {/* Description - ใช้พื้นที่ที่เหลือ */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📝</span>
                                        Description
                                    </label>
                                    {editingField === 'description' ? (
                                        <textarea
                                            value={shotData.description}
                                            autoFocus
                                            rows={2}
                                            onChange={(e) => setShotData(prev => ({ ...prev, description: e.target.value }))}
                                            onBlur={() => {
                                                updateDescription({ description: shotData.description });
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    updateDescription({ description: shotData.description });
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
                                            {shotData.description || <span className="text-gray-500 italic">Click to add...</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs - ทำให้เล็กและกระชับ */}
                        <nav className="flex items-center gap-2 border-t border-gray-700/50 pt-4 mt-4 overflow-x-auto pb-1">
                            {['Shot Info', 'Tasks', 'Notes', 'Versions', 'Assets', 'Publishes', 'Files', 'History'].map((tab) => (
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

                    {/* Tab Content Section - ปรับให้กระชับ */}
                    <div className="mt-4 p-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg text-white font-bold flex items-center gap-2">
                                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                {activeTab}
                            </h3>

                            {/* Action Buttons - ทำให้เล็กลง */}
                            <div className="flex gap-2">
                                {activeTab === 'Tasks' && (
                                    <button
                                        onClick={() => setShowCreateShot_Task(true)}
                                        className="px-3 py-1.5  text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"

                                    >
                                        <span>+</span>
                                        Add Task
                                    </button>
                                )}

                                {activeTab === 'Notes' && (
                                    <button
                                        onClick={() => setShowCreateAsset_Note(true)}
                                        className="px-3 py-1.5  text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"

                                    >
                                        <span>+</span>
                                        Add Note
                                    </button>
                                )}

                                {activeTab === 'Versions' && (
                                    <button
                                        onClick={() => setShowCreateShot_Versions(true)}
                                        className="px-3 py-1.5  text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"

                                    >
                                        <span>+</span>
                                        Add Version
                                    </button>
                                )}

                                {activeTab === 'Assets' && (
                                    <button
                                        onClick={() => setShowCreateShot_Assets(true)}
                                        className="px-3 py-1.5  text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"

                                    >
                                        <span>+</span>
                                        Add Asset
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content - ปรับให้มี max-height */}
                        <div className="relative">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>

            {showCreateShot_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => !isCreatingTask && setShowCreateShot_Task(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">for {shotData.shotCode}</span>
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

                            {/* Link to Shot (Read-only) */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Link to:
                                </label>
                                <input
                                    type="text"
                                    value={`Shot: ${shotData.shotCode}`}
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
                                onClick={() => setShowCreateShot_Task(false)}
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

            {showCreateShot_Note && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateShot_Note(false)} />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Note <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button onClick={() => setShowCreateShot_Note(false)} className="text-gray-400 hover:text-white text-xl">⚙️</button>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button onClick={() => setShowCreateShot_Note(false)} className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center">Cancel</button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center">Create Note</button>
                        </div>
                    </div>
                </div>
            )}


            {showCreateShot_Versions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateShot_Versions(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Versions <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button
                                onClick={() => setShowCreateShot_Versions(false)}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ⚙️
                            </button>
                        </div>



                        {/* Footer */}
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={() => setShowCreateShot_Versions(false)}
                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center"
                            >
                                Cancel
                            </button>

                            <button
                                className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center"
                            >
                                Create Versions
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {showCreateShot_Assets && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setShowCreateShot_Assets(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        {/* Header */}
                        <div className="px-5 py-3 border-b border-gray-600 flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-medium">
                                Create a new Asset
                            </h2>
                            <button
                                onClick={() => setShowCreateShot_Assets(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                ⚙️
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Asset Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-9 px-3  bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-20 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Task Template
                                </label>
                                <input
                                    type="text"
                                    className="w-full h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Project
                                </label>
                                <input
                                    disabled
                                    value="Demo: Animation"
                                    className="w-full h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-400 text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-gray-300 block mb-1">
                                    Shot
                                </label>
                                <input
                                    type="text"
                                    value={shotData.shotCode}
                                    onChange={(e) =>
                                        setShotData(prev => ({
                                            ...prev,
                                            shotCode: e.target.value
                                        }))
                                    }
                                    className="w-full h-9 px-3 bg-[#3a3a3a] border border-gray-600 rounded text-gray-400 text-sm"
                                />
                            </div>

                            <button className="text-sm text-gray-400 hover:text-gray-200">
                                More fields ▾
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-gray-600 flex justify-between items-center">
                            <button className="text-sm text-blue-400 hover:underline">
                                Open Bulk Import
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowCreateShot_Assets(false)}
                                    className="px-4 h-8 bg-gray-600 hover:bg-gray-500 text-sm rounded flex items-center justify-center"
                                >
                                    Cancel
                                </button>

                                <button
                                    className="px-4 h-8 bg-blue-600 hover:bg-blue-700 text-sm rounded text-white flex items-center justify-center"
                                >
                                    Create Asset
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

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
                                        defaultValue={shotData?.shotCode || ''}
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
            {/* Right Panel - Floating Card */}
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
                                    <img src={selectedTask.file_url} alt="" className="w-12 h-12 object-cover rounded" />
                                    <div>
                                        <div className="text-sm text-gray-400">
                                            Napo (Animation demo) › C005 › {selectedTask.task_name.split('/')[0].trim()}
                                        </div>
                                        <h2 className="text-xl text-white font-normal mt-1">
                                            {selectedTask?.task_name.split('/').pop()?.trim()}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPanelOpen(false);
                                        setTimeout(() => setSelectedTask(null), 300); // ตรงกับ duration
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
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">
                                            ⊞
                                        </button>
                                        <button className="p-2 bg-[#1a1d24] border border-gray-700 rounded hover:bg-gray-700">
                                            ☰
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {[1, 2, 3, 4].map((v) => (
                                            <div key={v} className="bg-[#1a1d24] rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors">
                                                <div className="relative aspect-video bg-gray-800">
                                                    <img
                                                        src={selectedTask.file_url}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                                                        v{v}
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <div className="text-sm text-white mb-1">Animation v{v}</div>
                                                    <div className="text-xs text-gray-400 mb-2">{selectedTask.task_name.split('/')[0].trim()}</div>
                                                    <div className="text-xs text-gray-500 mb-2">Napo (Animation demo) / C...</div>
                                                    <div className="text-xs text-gray-400">Animation</div>
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

// const TaskItem = ({
//     title,
//     assignee,
//     status
// }: {
//     title: string;
//     assignee: string;
//     status: string;
// }) => (

// );

const VersionCard = ({ version }: { version: string }) => (
    <div className="bg-gray-700/40 p-4 rounded-lg text-center text-gray-300">
        <p className="font-semibold">{version}</p>
        <div className="h-24 bg-gray-600 mt-2 rounded" />
    </div>
);