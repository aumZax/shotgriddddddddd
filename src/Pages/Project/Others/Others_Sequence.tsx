/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import Navbar_Project from "../../../components/Navbar_Project";
import { useNavigate } from 'react-router-dom';
import ENDPOINTS from "../../../config";
import { Check, Eye, Image, Upload, User, X } from 'lucide-react';
import TaskTab from "../../../components/TaskTab";
import NoteTab from '../../../components/NoteTab';
import axios from 'axios';
import ShotTab from '../../../components/ShotTab';
import RightPanel from "../../../components/RightPanel";


// Status configuration
const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' },
};

type StatusType = keyof typeof statusConfig;
type FilterType = 'All' | 'ART' | 'MDL' | 'RIG' | 'TXT';
type CheckedState = Record<FilterType, boolean>;
type NoteType = 'Client' | 'Internal';


// ⭐ เพิ่ม type ที่ขาดหาย
type TaskReviewer = {
    id: number;
    username: string;
};

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

type PipelineStep = {
    id: number;
    step_name: string;
    step_code: string;
    color_hex: string;
    entity_type?: 'shot' | 'asset';
};

// ⭐ อัปเดต Task type
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

type TaskAssignee = {
    id: number;
    username: string;
};

interface Shot {
    shot_id: number;
    shot_name: string;
    shot_status: string;
    shot_description: string;
    shot_created_at: string;
    shot_thumbnail?: string;
}

export default function Others_Sequence() {
    const [activeTab, setActiveTab] = useState('Sequence Info');
    const [SequenceData, setSequenceData] = useState({
        id: 0,
        shotCode: "",
        sequence: "",
        status: "wtg" as StatusType,
        tags: [],
        thumbnail: "",
        description: "",
        dueDate: "-"
    });

    const [showPreview, setShowPreview] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showCreateSequence_Task, setShowCreateSequence_Task] = useState(false);
    const [showCreateSequence_Note, setShowCreateSequence_Note] = useState(false);

    // ++++++++++++++++++++++++++++++++++++++ storage +++++++++++++++++++++++++++++++
    const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
    const sequenceId = stored.sequenceId;

    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;

    // ++++++++++++++++++++++++++++++++++++++++ right panel
    const [rightPanelTab, setRightPanelTab] = useState('notes');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [rightPanelWidth, setRightPanelWidth] = useState(600);

    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [type, setType] = useState<string | null>(null);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [openAssignedDropdown, setOpenAssignedDropdown] = useState<string | number | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [notes, setNotes] = useState<Note[]>([]);
    const [uploading, setUploading] = useState(false);


    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [showCreateAsset_Note, setShowCreateAsset_Note] = useState(false);
    const [, setSelectedFile] = useState<File | null>(null);
    const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
    const [body, setBody] = useState('');
    const currentUser = localStorage.getItem('currentUser') || 'Manager';
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const types: FilterType[] = ['ART', 'MDL', 'RIG', 'TXT'];
    const [noteModalPosition, setNoteModalPosition] = useState({ x: 0, y: 0 });

    // ++++++++++++++++++++++++++++++++ task versions
    const [taskVersions, setTaskVersions] = useState<any[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [rightPanelActiveTab, setRightPanelActiveTab] = useState('notes');

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ shots
    const [shots, setShots] = useState<Shot[]>([]);
    const [loadingShots, setLoadingShots] = useState(false);
    useEffect(() => {
        if (!sequenceId) return;

        const fetchSequenceDetail = async () => {
            try {
                setLoadingShots(true);
                const response = await axios.post(ENDPOINTS.PROJECT_SEQUENCE_DETAIL, {
                    sequenceId: sequenceId
                });

                console.log('✅ Sequence detail:', response.data);

                // กรอง shots ที่ซ้ำออก (เพราะ JOIN กับ assets อาจทำให้ shots ซ้ำ)
                const uniqueShots = response.data.reduce((acc: Shot[], item: any) => {
                    if (item.shot_id && !acc.find((s: Shot) => s.shot_id === item.shot_id)) {
                        acc.push({
                            shot_id: item.shot_id,
                            shot_name: item.shot_name,
                            shot_status: item.shot_status,
                            shot_description: item.shot_description,
                            shot_created_at: item.shot_created_at,
                            shot_thumbnail: item.shot_thumbnail
                        });
                    }
                    return acc;
                }, []);

                setShots(uniqueShots);
            } catch (error) {
                console.error('❌ Failed to fetch sequence detail:', error);
                setShots([]);
            } finally {
                setLoadingShots(false);
            }
        };

        fetchSequenceDetail();
    }, [sequenceId]);


    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++ resize panel
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

    const addPerson = (person: Person) => {
        setSelectedPeople([...selectedPeople, person]);
        setQuery('');
        setOpen(false);
    };

    const removetaskFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const removePerson = (personId: number) => {
        setSelectedPeople(selectedPeople.filter((person: Person) => person.id !== personId));
    };

    const filteredPeople = allPeople.filter(
        (person: Person) =>
            person.name.toLowerCase().includes(query.toLowerCase()) &&
            !selectedPeople.some((selected: Person) => selected.id === person.id)
    );

    const handleFiletaskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const selected = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selected]);

        e.target.value = '';
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
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
        try {
            setSequenceData(prev => ({ ...prev, status: newStatus }));
            setShowStatusMenu(false);
            await updateSequence({ status: newStatus });
        } catch (error) {
            console.error("❌ update status failed:", error);
            alert("Failed to update status");
        }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = () => {
        if (showStatusMenu) setShowStatusMenu(false);
    };

    // +++++++++++++++++++++++++++++ sequence task
    const [tasks, setTasks] = useState<Task[]>([]);

    const [noteContextMenu, setNoteContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        note: Note;
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
        if (activeTab === 'Notes' && SequenceData?.id) {
            fetchNotes();
        }
    }, [activeTab, SequenceData?.id]);

    const [checked, setChecked] = useState<CheckedState>({
        All: false,
        ART: false,
        MDL: false,
        RIG: false,
        TXT: false,
    });

    const [subject, setSubject] = useState("");

    useEffect(() => {
        if (SequenceData?.sequence) {
            setSubject(`Note on ${SequenceData.sequence}`);
        }
    }, [SequenceData?.sequence]);

    const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{
        noteId: number;
        subject: string;
    } | null>(null);

    useEffect(() => {
        if (!sequenceId || !projectId) {
            console.warn("⚠️ Missing sequenceId or projectId");
            return;
        }

        axios.post<Task[]>(ENDPOINTS.SEQUENCE_TASK, {
            project_id: projectId,
            entity_type: "sequence",
            entity_id: sequenceId
        })
            .then(res => {
                console.log("✅ Tasks received:", res.data);
                setTasks(res.data);
            })
            .catch(err => {
                console.error("❌ โหลด task ไม่สำเร็จ", err);
            });
    }, [sequenceId, projectId]);

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Date
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
            const t = setTimeout(() => {
                setIsPanelOpen(true);
                fetchTaskVersions(selectedTask.id); // เพิ่มบรรทัดนี้
            }, 10);
            return () => clearTimeout(t);
        }
    }, [selectedTask]);

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่ม states สำหรับ Create Task
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

    const fetchNotes = async () => {
        if (!SequenceData?.id) return;

        setLoadingNotes(true);
        try {
            const response = await fetch(`${ENDPOINTS.GET_NOTES}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projectId: localStorage.getItem("projectId"),
                    noteType: 'sequence',
                    typeId: SequenceData.id
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
                formData.append("sequenceId", SequenceData?.id.toString() || "");
                formData.append("fileName", fileToUpload.name);
                formData.append("type", "note");

                const uploadResponse = await fetch(ENDPOINTS.UPLOAD_SEQUENCE, {
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
                noteType: 'sequence',
                typeId: SequenceData?.id ?? null,
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

            const createResponse = await fetch(ENDPOINTS.CREATE_SEQUENCE_NOTE, {
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
            setSubject(SequenceData?.sequence ? `Note on ${SequenceData.sequence}` : "");
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
                entity_type: 'sequence',
                entity_id: sequenceId,
                status: createTaskForm.status || 'wtg',
                start_date: createTaskForm.start_date || null,
                due_date: createTaskForm.due_date || null,
                description: createTaskForm.description || null,
                file_url: createTaskForm.file_url || null,
                pipeline_step_id: null
            };

            // สร้าง task
            await axios.post(`${ENDPOINTS.ADD_TASK}`, payload);

            // รีเฟรชข้อมูล tasks
            const tasksRes = await axios.post(ENDPOINTS.SEQUENCE_TASK, {
                project_id: projectId,
                entity_type: "sequence",
                entity_id: sequenceId
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
            setShowCreateSequence_Task(false);

            alert("สร้างงานสำเร็จ!");

        } catch (err: any) {
            console.error("Create task error:", err);
            alert(err.response?.data?.message || "ไม่สามารถสร้างงานได้");
        } finally {
            setIsCreatingTask(false);
        }
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ shots refresh
    const handleShotUpdate = async () => {
        try {
            const response = await axios.post(ENDPOINTS.PROJECT_SEQUENCE_DETAIL, {
                sequenceId: sequenceId
            });

            const uniqueShots = filterUniqueShots(response.data);
            setShots(uniqueShots);
        } catch (error) {
            console.error('❌ Failed to refresh shots:', error);
        }
    };

    // ========================================
    // 3. HELPER FUNCTION - FILTER UNIQUE SHOTS
    // ========================================
    const filterUniqueShots = (data: any[]): Shot[] => {
        return data.reduce((acc: Shot[], item: any) => {
            // ตรวจสอบว่า shot_id มีอยู่และยังไม่ซ้ำใน array
            if (item.shot_id && !acc.find((s: Shot) => s.shot_id === item.shot_id)) {
                acc.push({
                    shot_id: item.shot_id,
                    shot_name: item.shot_name,
                    shot_status: item.shot_status,
                    shot_description: item.shot_description,
                    shot_created_at: item.shot_created_at,
                    shot_thumbnail: item.shot_thumbnail
                });
            }
            return acc;
        }, []);
    };

    // ========================================
    // 4. INITIAL FETCH SHOTS (ใน useEffect)
    // ========================================
    useEffect(() => {
        if (!sequenceId) return;

        const fetchSequenceDetail = async () => {
            try {
                setLoadingShots(true);

                const response = await axios.post(ENDPOINTS.PROJECT_SEQUENCE_DETAIL, {
                    sequenceId: sequenceId
                });

                console.log('✅ Sequence detail:', response.data);

                // ใช้ helper function เดียวกัน
                const uniqueShots = filterUniqueShots(response.data);
                setShots(uniqueShots);

            } catch (error) {
                console.error('❌ Failed to fetch sequence detail:', error);
                setShots([]);
            } finally {
                setLoadingShots(false);
            }
        };

        fetchSequenceDetail();
    }, [sequenceId]);

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Sequence Info':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow label="Sequence" value={SequenceData.sequence} />
                        <InfoRow label="Status" value={statusConfig[SequenceData.status].label} />
                        <InfoRow label="Due Date" value={formatDate(SequenceData.dueDate)} />
                        <div className="md:col-span-2">
                            <InfoRow label="Description" value={SequenceData.description} />
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

            case 'Shots':
                return (
                    <ShotTab
                        shots={shots}
                        loadingShots={loadingShots}
                        formatDateThai={formatDateThai}
                        onShotUpdate={handleShotUpdate}
                    />
                );

            case 'Assets':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all hover:shadow-lg cursor-pointer">
                            <p className="flex items-center gap-3 text-gray-200">
                                <span className="text-2xl">🎥</span>
                                <span className="font-medium">Asset Example 1</span>
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl border border-gray-600/50 hover:border-blue-500/50 transition-all hover:shadow-lg cursor-pointer">
                            <p className="flex items-center gap-3 text-gray-200">
                                <span className="text-2xl">🌲</span>
                                <span className="font-medium">Asset Example 2</span>
                            </p>
                        </div>
                    </div>
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

            default:
                return null;
        }
    };

    // เพิ่ม state สำหรับ loading thumbnail
    const [thumbnailLoading, setThumbnailLoading] = useState(true);

    // ดึงข้อมูล sequence จาก localStorage
    const navigate = useNavigate();

    useEffect(() => {
        const stored = localStorage.getItem("sequenceData");

        if (!stored) {
            console.warn("sequenceData not found");
            navigate("/Project_Sequence");
            return;
        }

        const seq = JSON.parse(stored);

        setSequenceData({
            id: seq.sequenceId,
            shotCode: "",
            sequence: seq.sequenceName,
            status: seq.status,
            tags: [],
            thumbnail: seq.thumbnail,
            description: seq.description || "",
            dueDate: seq.createdAt
        });
        // ถ้ามี thumbnail ให้ set loading เป็น false เมื่อโหลดเสร็จ
        if (seq.thumbnail) {
            setThumbnailLoading(true);
        } else {
            setThumbnailLoading(false);
        }
    }, []);

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

    const [editingField, setEditingField] = useState<null | 'sequence' | 'description'>(null);

    const updateSequence = (payload: any) => {
        return fetch(ENDPOINTS.UPDATE_SEQUENCE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: SequenceData.id,
                ...payload
            })
        })
            .then(() => {
                const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");

                const updated = {
                    ...stored,
                    sequenceName: payload.sequence_name ?? stored.sequenceName,
                    description: payload.description ?? stored.description,
                    status: payload.status ?? stored.status
                };

                localStorage.setItem("sequenceData", JSON.stringify(updated));
            })
            .catch(console.error);
    };

    const fetchTaskVersions = async (taskId: number) => {
        setIsLoadingVersions(true);
        try {
            const res = await axios.post(`${ENDPOINTS.TASK_VERSIONS}`, {
                entityType: 'task',
                entityId: taskId
            });
            setTaskVersions(res.data);
        } catch (err) {
            console.error("Failed to fetch versions:", err);
            setTaskVersions([]);
        } finally {
            setIsLoadingVersions(false);
        }
    };

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
                    {/* Header Card - ปรับให้กระชับขึ้น */}
                    <div className="w-full bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-xl shadow-xl border border-gray-700/50">
                        {/* Breadcrumb */}
                        <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
                            <span className="font-bold text-white">🎬 {SequenceData.sequence}</span>
                        </div>

                        {/* Preview Modal */}
                        {showPreview && SequenceData.thumbnail && (
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
                                    <img
                                        src={ENDPOINTS.image_url + SequenceData.thumbnail}
                                        alt="Preview"
                                        className="w-full h-full object-contain rounded-2xl shadow-2xl"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Main Content */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Thumbnail */}
                            <div className="col-span-3">
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-600/30 group">
                                    {/* Background gradient - animated */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black animate-pulse"></div>

                                    {thumbnailLoading && SequenceData.thumbnail ? (
                                        <>
                                            <img
                                                src={ENDPOINTS.image_url + SequenceData.thumbnail}
                                                alt="Sequence thumbnail"
                                                className="relative w-full h-full object-cover z-10 opacity-0"
                                                onLoad={() => setThumbnailLoading(false)}
                                                onError={() => setThumbnailLoading(false)}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-8 h-8 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                                                    <p className="text-gray-300 text-sm">Loading...</p>
                                                </div>
                                            </div>
                                        </>
                                    ) : SequenceData.thumbnail ? (
                                        <img
                                            src={ENDPOINTS.image_url + SequenceData.thumbnail}
                                            alt="Sequence thumbnail"
                                            className="relative w-full h-full object-cover z-10"
                                        />
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
                                    {SequenceData.thumbnail && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gradient-to-t from-black/80 via-black/50 to-transparent z-20">
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowPreview(true);
                                                    }}
                                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-400 hover:to-blue-400 active:scale-95 text-white rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg hover:shadow-blue-500/50 transition-all duration-200"   >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                                <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg flex items-center gap-2 cursor-pointer text-sm font-medium shadow-lg hover:shadow-emerald-500/50 transition-all duration-200">
                                                    <Upload className="w-4 h-4" />
                                                    Change
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            if (!e.target.files?.[0]) return;

                                                            const formData = new FormData();
                                                            formData.append("file", e.target.files[0]);
                                                            formData.append("sequenceId", String(SequenceData.id));
                                                            formData.append("oldImageUrl", SequenceData.thumbnail || "");
                                                            formData.append("type", e.target.files[0].type.split('/')[0]);


                                                            try {
                                                                const res = await fetch(ENDPOINTS.UPLOAD_SEQUENCE, {
                                                                    method: "POST",
                                                                    body: formData,
                                                                });

                                                                const data = await res.json();

                                                                if (res.ok) {
                                                                    setSequenceData(prev => ({ ...prev, thumbnail: data.file.fileUrl }));

                                                                    const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
                                                                    const updated = { ...stored, thumbnail: data.file.fileUrl };
                                                                    localStorage.setItem("sequenceData", JSON.stringify(updated));
                                                                } else {
                                                                    alert("Upload failed: " + data.error);
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
                                    {!SequenceData.thumbnail && (
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
                                            onChange={async (e) => {
                                                if (!e.target.files?.[0]) return;

                                                const formData = new FormData();
                                                formData.append("file", e.target.files[0]);
                                                formData.append("sequenceId", String(SequenceData.id));
                                                formData.append("oldImageUrl", SequenceData.thumbnail || "");
                                                formData.append("type", e.target.files[0].type.split('/')[0]);

                                                try {
                                                    const res = await fetch(ENDPOINTS.UPLOAD_SEQUENCE, {
                                                        method: "POST",
                                                        body: formData,
                                                    });

                                                    const data = await res.json();

                                                    if (res.ok) {
                                                        setSequenceData(prev => ({ ...prev, thumbnail: data.file.fileUrl }));

                                                        const stored = JSON.parse(localStorage.getItem("sequenceData") || "{}");
                                                        const updated = { ...stored, thumbnail: data.file.fileUrl };
                                                        localStorage.setItem("sequenceData", JSON.stringify(updated));
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
                                {/* Sequence Name */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📁</span>
                                        Sequence
                                    </label>
                                    {editingField === 'sequence' ? (
                                        <input
                                            value={SequenceData.sequence}
                                            autoFocus
                                            onChange={(e) => setSequenceData(prev => ({ ...prev, sequence: e.target.value }))}
                                            onBlur={() => {
                                                updateSequence({ sequence_name: SequenceData.sequence });
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    updateSequence({ sequence_name: SequenceData.sequence });
                                                    setEditingField(null);
                                                }
                                                if (e.key === "Escape") setEditingField(null);
                                            }}
                                            className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1.5 text-white text-sm font-semibold"
                                        />
                                    ) : (
                                        <p
                                            className="text-white font-semibold cursor-pointer hover:bg-gray-700/50 px-2 py-1.5 rounded transition-colors"
                                            onClick={() => setEditingField('sequence')}
                                        >
                                            {SequenceData.sequence}
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
                                            {statusConfig[SequenceData.status].icon === '-' ? (
                                                <span className="text-gray-400 font-bold">-</span>
                                            ) : (
                                                <div className={`w-2 h-2 rounded-full ${statusConfig[SequenceData.status].color}`}></div>
                                            )}
                                            <span className="text-sm">{statusConfig[SequenceData.status].label}</span>
                                        </div>
                                        <span className="text-xs">▼</span>
                                    </button>

                                    {showStatusMenu && (
                                        <div className="absolute left-0 mt-1 bg-gray-800 rounded-lg shadow-2xl z-50 w-full border border-gray-700">
                                            {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                <button
                                                    key={key}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(key);
                                                    }}
                                                    className="flex items-center gap-5 w-full px-3 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-600 hover:to-gray-600"

                                                >
                                                    {config.icon === '-' ? (
                                                        <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                    ) : (
                                                        <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                                                    )}
                                                    <div className="text-xs text-gray-200 flex items-center gap-5">
                                                        <span className="inline-block w-8">
                                                            {config.label}
                                                        </span>
                                                        <span>{config.fullLabel}</span>
                                                    </div>
                                                    {SequenceData.status === key && ( // ✅ แสดง checkmark
                                                        <Check className="w-4 h-4 text-blue-400 ml-auto " />
                                                    )}
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
                                    <p className="text-white font-semibold px-2 py-1.5 text-sm">{formatDate(SequenceData.dueDate)}</p>
                                </div>

                                {/* Description - ใช้ 3 คอลัมน์ */}
                                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 col-span-3">
                                    <label className="text-gray-400 text-xs font-medium block mb-1.5 flex items-center gap-1.5">
                                        <span>📝</span>
                                        Description
                                    </label>
                                    {editingField === 'description' ? (
                                        <textarea
                                            value={SequenceData.description}
                                            autoFocus
                                            rows={2}
                                            onChange={(e) => setSequenceData(prev => ({ ...prev, description: e.target.value }))}
                                            onBlur={() => {
                                                updateSequence({ description: SequenceData.description });
                                                setEditingField(null);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    updateSequence({ description: SequenceData.description });
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
                                            {SequenceData.description || <span className="text-gray-500 italic">Click to add...</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <nav className="flex items-center gap-2 border-t border-gray-700/50 pt-4 mt-4 overflow-x-auto pb-1">
                            {['Sequence Info', 'Tasks', 'Shots', 'Assets', 'Notes'].map((tab) => (
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
                                        onClick={() => setShowCreateSequence_Task(true)}
                                        className="px-3 py-1.5 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
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
            {showCreateSequence_Task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => !isCreatingTask && setShowCreateSequence_Task(false)}
                    />

                    {/* Modal */}
                    <div className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">for {SequenceData.sequence}</span>
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

                            {/* Link to Sequence (Read-only) */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Link to:
                                </label>
                                <input
                                    type="text"
                                    value={`Sequence: ${SequenceData.sequence}`}
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
                                onClick={() => setShowCreateSequence_Task(false)}
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
            {showCreateSequence_Note && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreateSequence_Note(false)} />
                    <div className="relative w-full max-w-2xl bg-[#4a4a4a] rounded shadow-2xl">
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-t flex items-center justify-between">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Note <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>
                            <button onClick={() => setShowCreateSequence_Note(false)} className="text-gray-400 hover:text-white text-xl">⚙️</button>
                        </div>
                        <div className="px-6 py-3 bg-[#3a3a3a] rounded-b flex justify-end items-center gap-3">
                            <button onClick={() => setShowCreateSequence_Note(false)} className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center">Cancel</button>
                            <button className="px-4 h-9 bg-[#2d7a9e] hover:bg-[#3a8db5] text-white text-sm rounded flex items-center justify-center">Create Note</button>
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
                                        defaultValue={SequenceData?.sequence || ''}
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
            <RightPanel
                selectedTask={selectedTask}
                isPanelOpen={isPanelOpen && !selectedNote}
                rightPanelWidth={rightPanelWidth}
                activeTab={rightPanelActiveTab}
                taskVersions={taskVersions}
                isLoadingVersions={isLoadingVersions}
                projectUsers={[]}
                onClose={() => {
                    setIsPanelOpen(false);
                    setTimeout(() => setSelectedTask(null), 300);
                }}
                onResize={handleMouseDown}
                onTabChange={setRightPanelActiveTab}
                onUpdateVersion={async () => false}
            />


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
                                            Sequence › {SequenceData?.sequence}
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