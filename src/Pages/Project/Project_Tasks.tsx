import { useEffect, useRef, useState } from "react";
import Navbar_Project from "../../components/Navbar_Project";
import axios from "axios";
import ENDPOINTS from "../../config";
import { Calendar, Check, ChevronRight, ClipboardList, Clock, Pencil, Users, X, UserPlus, Trash2, ChevronDown, Search } from 'lucide-react';
import React from "react";
import { useNavigate } from "react-router-dom";
import RightPanel from "../../components/RightPanel";
import { createPortal } from 'react-dom';


type StatusType = keyof typeof statusConfig;

// อัพเดท statusConfig
const statusConfig = {
    // Status เดิม
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' },

    // Pipeline Steps ใหม่
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
    reviewers: TaskReviewer[]; // ⭐ เพิ่ม
    pipeline_step: PipelineStep | null;  // ⭐ เพิ่มบรรทัดนี้
};

// เปลี่ยน type Task structure
type TaskGroup = {
    entity_id: number;
    entity_type: string;
    entity_name: string;
    tasks: Task[];
};

// ⭐ เพิ่ม type สำหรับ Pipeline Step
type PipelineStep = {
    id: number;
    step_name: string;
    step_code: string;
    color_hex: string;
    entity_type?: 'shot' | 'asset'; // เพิ่มบรรทัดนี้
};

type Version = {
    id: number;
    entity_type: string;
    entity_id: number;
    version_number: number;
    version_name?: string;          // ⭐ เพิ่มบรรทัดนี้
    file_url: string;
    thumbnail_url?: string;
    status: string;
    uploaded_by: number | null;
    created_at: string;
    file_size?: number;
    description?: string;           // ⭐ เปลี่ยนจาก notes เป็น description
    uploaded_by_name?: string;
};
export default function Project_Tasks() {
    const navigate = useNavigate();
    const [showCreateMytask, setShowCreateMytask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [rightPanelWidth, setRightPanelWidth] = useState(600);
    const [activeTab, setActiveTab] = useState('notes');
    const [isResizing, setIsResizing] = useState(false);
    const [isLoadingSequences, setIsLoadingSequences] = useState(true);

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Edit Task Name ++++++++++++++++++++++++++++++++++++++++++++++
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editingTaskName, setEditingTaskName] = useState("");
    // เพิ่ม state สำหรับแก้ไข Pipeline Step
    const [editingPipelineTaskId, setEditingPipelineTaskId] = useState<number | null>(null);
    const [selectedPipelineStepId, setSelectedPipelineStepId] = useState<number | null>(null);
    const [availablePipelineSteps, setAvailablePipelineSteps] = useState<PipelineStep[]>([]);

    // เพิ่ม states ใหม่ สำหรับAssigned To และ reviewer
    const [projectUsers, setProjectUsers] = useState<{ id: number, username: string }[]>([]);
    const [editingAssigneeTaskId, setEditingAssigneeTaskId] = useState<number | null>(null);
    const [editingReviewerTaskId, setEditingReviewerTaskId] = useState<number | null>(null);
    const [searchAssignee, setSearchAssignee] = useState("");
    const [searchReviewer, setSearchReviewer] = useState("");

    // เพิ่มใกล้ๆ บรรทัด 50-60
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);
    const reviewerDropdownRef = useRef<HTMLDivElement>(null);
    const pipelineDropdownRef = useRef<HTMLDivElement>(null);


    // เพิ่ม states ใหม่ ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [editingStartDateTaskId, setEditingStartDateTaskId] = useState<number | null>(null);
    const [editingDueDateTaskId, setEditingDueDateTaskId] = useState<number | null>(null);

    // เพิ่ม state สำหรับ loading สร้าง task ++++++++++++++++++++++++++++++++++++++++++++++++
    const [isCreatingTask, setIsCreatingTask] = useState(false);

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Task version ++++++++++++++++++++++++++++++++++++++++++++++
    const [taskVersions, setTaskVersions] = useState<Version[]>([]);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterEntityType, setFilterEntityType] = useState<string>("");
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const [showEntityFilter, setShowEntityFilter] = useState(false);

    // แก้ไข useEffect ที่จัดการ selectedTask
    useEffect(() => {
        if (selectedTask) {
            setIsPanelOpen(false);
            const t = setTimeout(() => {
                setIsPanelOpen(true);
                // ⭐ เพิ่มการ fetch versions
                fetchTaskVersions(selectedTask.id);
            }, 10);
            return () => clearTimeout(t);
        }
    }, [selectedTask]);


    // เพิ่มฟังก์ชันนี้หลัง fetchPipelineStepsByType
    const fetchTaskVersions = async (taskId: number) => {
        setIsLoadingVersions(true);
        try {
            const res = await axios.post(`${ENDPOINTS.TASK_VERSIONS}`, {
                entityId: taskId   // ✅ task.id เสมอ
                // ❌ ลบ entityType ออก ไม่จำเป็นแล้ว
            });
            setTaskVersions(res.data);
        } catch (err) {
            console.error("Failed to fetch versions:", err);
            setTaskVersions([]);
        } finally {
            setIsLoadingVersions(false);
        }
    };



    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Loading State ++++++++++++++++++++++++++++++++++++++++++++++


    // ⭐ เพิ่มตรงนี้ หลังบรรทัด 60
    const useLoadingState = () => {
        const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

        const setLoading = (key: string, value: boolean) => {
            setLoadingStates(prev => ({ ...prev, [key]: value }));
        };

        const isLoading = (key: string) => loadingStates[key] || false;

        return { setLoading, isLoading };
    };

    const { setLoading, isLoading } = useLoadingState(); // ⭐ เพิ่มบรรทัดนี้
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Create Task ++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่ม state สำหรับ form
    const [createTaskForm, setCreateTaskForm] = useState({
        task_name: '',
        entity_type: '',
        entity_id: '',
        status: 'wtg',
        start_date: '',
        due_date: '',
        description: '',
        file_url: '',
    });

    // เพิ่ม state สำหรับ entity options
    // แก้ไข state structure
    const [availableEntities, setAvailableEntities] = useState<{
        assets: any[];
        shots: any[];
        sequences: any[];
    }>({
        assets: [],
        shots: [],
        sequences: []
    });
    // Fetch entities เมื่อเปิด modal
    useEffect(() => {
        if (showCreateMytask) {
            console.log('Modal opened!'); // ⭐ Debug

            fetchAvailableEntities();
        }
    }, [showCreateMytask]);

    // ฟังก์ชัน fetch entities
    const fetchAvailableEntities = async () => {
        try {
            const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
            if (!projectId) return;

            // Fetch assets - ต้อง flatten จาก grouped structure
            const assetsRes = await axios.post(`${ENDPOINTS.ASSETLIST}`, { projectId });
            const assetsFlat = assetsRes.data.flatMap((group: any) => group.assets || []);

            // Fetch shots - ต้อง flatten จาก grouped structure
            const shotsRes = await axios.post(`${ENDPOINTS.SHOTLIST}`, { projectId });
            const shotsFlat = shotsRes.data.flatMap((group: any) => group.shots || []);

            // Fetch sequences
            const sequencesRes = await axios.post(`${ENDPOINTS.PROJECT_SEQUENCES}`, { projectId });

            console.log('Assets:', assetsFlat); // ⭐ Debug
            console.log('Shots:', shotsFlat); // ⭐ Debug
            console.log('Sequences:', sequencesRes.data); // ⭐ Debug

            setAvailableEntities({
                assets: assetsFlat,
                shots: shotsFlat,
                sequences: sequencesRes.data || []
            });
        } catch (err) {
            console.error("Fetch entities error:", err);
        }
    };


    // ฟังก์ชัน handle input change
    const handleFormChange = (field: string, value: any) => {
        setCreateTaskForm(prev => ({
            ...prev,
            [field]: value
        }));

        // ถ้าเปลี่ยน entity_type ให้ reset entity_id
        if (field === 'entity_type') {
            setCreateTaskForm(prev => ({
                ...prev,
                entity_id: ''
            }));
        }
    };

    // ฟังก์ชันสร้าง Task
    const handleCreateTask = async () => {
        // ป้องกันการกดซ้ำ
        if (isCreatingTask) return;

        try {
            const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
            if (!projectId) {
                alert("ไม่พบ Project ID");
                return;
            }

            if (!createTaskForm.task_name.trim()) {
                alert("กรุณากระบุชื่องาน");
                return;
            }

            // ⭐ เพิ่มการตรวจสอบว่าถ้าเลือก entity_type แล้วต้องเลือก entity_id ด้วย
            if (createTaskForm.entity_type && !createTaskForm.entity_id) {
                alert(`กรุณาเลือก ${createTaskForm.entity_type} ที่ต้องการเชื่อมโยง`);
                return;
            }

            // ⭐ เริ่ม loading
            setIsCreatingTask(true);

            const payload = {
                project_id: projectId,
                task_name: createTaskForm.task_name.trim(),
                entity_type: createTaskForm.entity_type || null,
                entity_id: createTaskForm.entity_id ? Number(createTaskForm.entity_id) : null,
                status: createTaskForm.status || 'wtg',
                start_date: createTaskForm.start_date || null,
                due_date: createTaskForm.due_date || null,
                description: createTaskForm.description || null,
                file_url: createTaskForm.file_url || null,
                pipeline_step_id: null
            };

            await axios.post(`${ENDPOINTS.ADD_TASK}`, payload);

            // รีเฟรชข้อมูล tasks
            const tasksRes = await axios.post(`${ENDPOINTS.PROJECT_TASKS_GROUPED}`, { projectId });
            // ⭐ เพิ่มการเรียงลำดับตรงนี้ด้วย
            const sortedGroups = tasksRes.data.sort((a: TaskGroup, b: TaskGroup) => {
                const order: { [key: string]: number } = {
                    'asset': 1,
                    'shot': 2,
                    'sequence': 3,
                    'unassigned': 4
                };

                const orderA = order[a.entity_type] || 999;
                const orderB = order[b.entity_type] || 999;

                return orderA - orderB;
            });

            setTaskGroups(sortedGroups);

            // รีเซ็ต form และปิด modal
            setCreateTaskForm({
                task_name: '',
                entity_type: '',
                entity_id: '',
                status: 'wtg',
                start_date: '',
                due_date: '',
                description: '',
                file_url: ''
            });

            closeModal();
            alert("สร้างงานสำเร็จ!");

        } catch (err: any) {
            console.error("Create task error:", err);
            alert(err.response?.data?.message || "ไม่สามารถสร้างงานได้");
        } finally {
            // ⭐ สิ้นสุด loading
            setIsCreatingTask(false);
        }
    };
    // ฟังก์ชันดึง entity options ตาม type
    const getEntityOptions = () => {
        switch (createTaskForm.entity_type) {
            case 'asset':
                return availableEntities.assets;
            case 'shot':
                return availableEntities.shots;
            case 'sequence':
                return availableEntities.sequences;
            default:
                return [];
        }
    };

    // ฟังก์ชันแสดงชื่อ entity
    const getEntityLabel = (entity: any) => {
        if (createTaskForm.entity_type === 'asset') {
            return entity.asset_name || 'Unnamed Asset';
        }
        if (createTaskForm.entity_type === 'shot') {
            return entity.shot_name || 'Unnamed Shot';
        }
        if (createTaskForm.entity_type === 'sequence') {
            return entity.sequence_name || 'Unnamed Sequence';
        }
        return '';
    };


    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Fetch Project Users ++++++++++++++++++++++++++++++++++++++++++++++
    // Fetch project users
    // ใน useEffect ของ Project_Tasks.tsx
    useEffect(() => {
        const fetchProjectUsers = async () => {
            try {
                // ⭐ ไม่ต้องส่ง projectId ก็ได้
                const res = await axios.post(`${ENDPOINTS.PROJECT_USERS}`, {});
                setProjectUsers(res.data);
            } catch (err) {
                console.error("Fetch project users error:", err);
            }
        };
        fetchProjectUsers();
    }, []);

    // ⭐ รวมฟังก์ชันที่ใช้ร่วมกันสำหรับ Assignee และ Reviewer
    const manageTaskUser = async (
        taskId: number,
        userId: number,
        action: 'add' | 'remove',
        type: 'assignee' | 'reviewer'
    ) => {
        const loadingKey = `${type}-${taskId}-${action}-${userId}`;
        setLoading(loadingKey, true); // ⭐ เพิ่ม
        try {
            const endpoint = type === 'assignee'
                ? (action === 'add' ? ENDPOINTS.ADD_TASK_ASSIGNEE : ENDPOINTS.REMOVE_TASK_ASSIGNEE)
                : (action === 'add' ? ENDPOINTS.ADD_TASK_REVIEWER : ENDPOINTS.REMOVE_TASK_REVIEWER);

            const res = await axios.post(endpoint, { taskId, userId });

            const userField = type === 'assignee' ? 'assignees' : 'reviewers';

            setTaskGroups(prev => prev.map(group => ({
                ...group,
                tasks: group.tasks.map(task => {
                    if (task.id !== taskId) return task;

                    if (action === 'add') {
                        const newUser = res.data.user;
                        const exists = task[userField].some((u: any) => u.id === newUser.id);
                        if (exists) return task;
                        return { ...task, [userField]: [...task[userField], newUser] };
                    }

                    return { ...task, [userField]: task[userField].filter((u: any) => u.id !== userId) };
                })
            })));

            setSelectedTask(prev => {
                if (!prev || prev.id !== taskId) return prev;

                if (action === 'add') {
                    const newUser = res.data.user;
                    const exists = prev[userField].some((u: any) => u.id === newUser.id);
                    if (exists) return prev;
                    return { ...prev, [userField]: [...prev[userField], newUser] };
                }

                return { ...prev, [userField]: prev[userField].filter((u: any) => u.id !== userId) };
            });

            if (action === 'add') {
                type === 'assignee' ? setSearchAssignee("") : setSearchReviewer("");
            }
        } catch (err: any) {
            console.error(`${action} ${type} error:`, err);
            alert(err.response?.data?.message || `ไม่สามารถ${action === 'add' ? 'เพิ่ม' : 'ลบ'}${type === 'assignee' ? 'Assigned' : 'Reviewer'}ได้`);
        } finally {
            setLoading(loadingKey, false); // ⭐ เพิ่ม
        }
    };

    // แทนที่ฟังก์ชัน addAssignee, removeAssignee, addReviewer, removeReviewer
    const addAssignee = (taskId: number, userId: number) => manageTaskUser(taskId, userId, 'add', 'assignee');
    const removeAssignee = (taskId: number, userId: number) => manageTaskUser(taskId, userId, 'remove', 'assignee');
    const addReviewer = (taskId: number, userId: number) => manageTaskUser(taskId, userId, 'add', 'reviewer');
    const removeReviewer = (taskId: number, userId: number) => manageTaskUser(taskId, userId, 'remove', 'reviewer');

    // Filter users ที่ยังไม่ได้เป็น assignee
    const getAvailableAssignees = (task: Task) => {
        const assignedIds = task.assignees.map(a => a.id);
        return projectUsers.filter(u =>
            !assignedIds.includes(u.id) &&
            u.username.toLowerCase().includes(searchAssignee.toLowerCase())
        );
    };

    // Filter users ที่ยังไม่ได้เป็น reviewer
    const getAvailableReviewers = (task: Task) => {
        const reviewerIds = task.reviewers.map(r => r.id);
        return projectUsers.filter(u =>
            !reviewerIds.includes(u.id) &&
            u.username.toLowerCase().includes(searchReviewer.toLowerCase())
        );
    };

    //   +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Resize Panel ++++++++++++++++++++++++++++++++++++++++++++++



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

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    const [isPanelOpen, setIsPanelOpen] = useState(false);
    useEffect(() => {
        if (selectedTask) {
            setIsPanelOpen(false);
            const t = setTimeout(() => setIsPanelOpen(true), 10);
            return () => clearTimeout(t);
        }
    }, [selectedTask]);

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ date ++++++++++++++++++++++++++++++++++++++++++
    // Format date for input (YYYY-MM-DD)
    // แก้ไขฟังก์ชัน formatDateForInput ให้จัดการ timezone
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        // ถ้าได้รับวันที่แบบ YYYY-MM-DD อยู่แล้ว ให้ return เลย
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        // ถ้าเป็น ISO string หรือ format อื่น
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // แก้ไข handleDateUpdate
    const handleDateUpdate = async (taskId: number, field: 'start_date' | 'due_date', value: string) => {
        // ✅ ถ้า value เป็น empty string ให้ส่ง null ไปยัง API
        const finalValue = value.trim() === "" ? null : value;

        const success = await updateTask(taskId, field, finalValue);

        if (success) {
            setTaskGroups(prev => {
                const updated = [...prev];
                updated.forEach(group => {
                    group.tasks.forEach(task => {
                        if (task.id === taskId) {
                            // ✅ update เป็น null หรือ value ที่ส่งมา
                            (task as any)[field] = finalValue;
                        }
                    });
                });
                return updated;
            });
        }

        setEditingStartDateTaskId(null);
        setEditingDueDateTaskId(null);
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

    // คำนวณจำนวนวันระหว่าง start_date และ due_date
    const calculateDurationDays = (startDate: string, dueDate: string) => {
        if (!startDate || !dueDate) return 0;

        const start = new Date(startDate);
        const due = new Date(dueDate);

        // คำนวณความแตกต่างเป็นมิลลิวินาที แล้วแปลงเป็นวัน
        const diffTime = due.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays + 1;
    };


    // ++++++++++++++++++++++++++++++++ ขยับ create  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDownnnnn = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    };


    // ⭐ รวมทั้ง listener และ cleanup ในที่เดียว
    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y,
            });
        };

        const handleUp = () => setIsDragging(false);

        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);

        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isDragging]);

    const closeModal = () => {
        setShowCreateMytask(false);
        setPosition({ x: 0, y: 0 });

        // ⭐ Reset form
        setCreateTaskForm({
            task_name: '',
            entity_type: '',
            entity_id: '',
            status: 'wtg',
            start_date: '',
            due_date: '',
            description: '',
            file_url: ''
            // ⭐ ลบ pipeline_step_id ออก
        });
    };


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่ม helper function ไว้ด้านบนของ component
    const getCurrentUser = () => {
        return JSON.parse(localStorage.getItem("authUser") || "{}");
    };

    const sortAssignees = (assignees: TaskAssignee[], currentUserId: number) => {
        const currentUserAssignee = assignees.find(u => u.id === currentUserId);
        const otherAssignees = assignees.filter(u => u.id !== currentUserId);
        return currentUserAssignee ? [currentUserAssignee, ...otherAssignees] : assignees;
    };

    const isCurrentUserAssigned = (assignees: TaskAssignee[]) => {
        const currentUserId = getCurrentUser().id;
        return assignees?.some(u => u.id === currentUserId);
    };


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ reviewer ++++++++++++++++++++++++++++++++++++++++++++++

    // เพิ่ม helper function สำหรับเช็คว่า current user เป็น reviewer หรือไม่
    const isCurrentUserReviewer = (reviewers: TaskReviewer[]) => {
        const currentUserId = getCurrentUser().id;
        return reviewers?.some(r => r.id === currentUserId);
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ กลุ่มงาน task ++++++++++++++++++++++++++++++++++++++++++++++

    // เปลี่ยน state
    const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // แก้ useEffect สำหรับ fetch
    useEffect(() => {
        const fetchTasks = async () => {
            setIsLoadingSequences(true);
            try {
                const projectId = JSON.parse(
                    localStorage.getItem("projectId") || "null"
                );
                if (!projectId) return;

                const res = await axios.post(
                    `${ENDPOINTS.PROJECT_TASKS_GROUPED}`,
                    { projectId }
                );
                console.log("GROUPED TASKS:", res.data);

                // ⭐ เพิ่มการเรียงลำดับตรงนี้
                const sortedGroups = res.data.sort((a: TaskGroup, b: TaskGroup) => {
                    const order: { [key: string]: number } = {
                        'asset': 1,
                        'shot': 2,
                        'sequence': 3,
                        'unassigned': 4
                    };

                    const orderA = order[a.entity_type] || 999;
                    const orderB = order[b.entity_type] || 999;

                    return orderA - orderB;
                });

                setTaskGroups(sortedGroups);

                // เปิด group แรกโดยอัตโนมัติ
                const allGroupKeys = sortedGroups.map((group: TaskGroup) =>
                    `${group.entity_type}_${group.entity_id}`
                );
                setExpandedGroups(new Set(allGroupKeys));
            } catch (err) {
                console.error("Fetch tasks error:", err);
            } finally {
                setIsLoadingSequences(false);
            }
        };
        fetchTasks();
    }, []);

    // ฟังก์ชัน toggle group
    const toggleGroup = (entity_type: string, entity_id: number) => {
        const key = `${entity_type}_${entity_id}`;
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    // คำนวณจำนวน task ทั้งหมด
    // ✅ เพิ่มหลัง toggleGroup function (ประมาณบรรทัด 245)
    const totalTasks = taskGroups.reduce((sum, group) => sum + group.tasks.length, 0);





    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Status Menu ++++++++++++++++++++++++++++++++++++++++++++++  

    const [showStatusMenu, setShowStatusMenu] = useState<{
        categoryIndex: number;
        shotIndex: number;
    } | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');

    // ✅ เพิ่มฟังก์ชันจัดการ
    const handleFieldClick = (
        field: string,
        categoryIndex: number,
        shotIndex: number,
        e: React.MouseEvent
    ) => {
        if (field === 'status') {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
            setShowStatusMenu({ categoryIndex, shotIndex });
        }
    };

    // ⭐ แก้ไข handleStatusChange function (บรรทัดประมาณ 307-327)

    const handleStatusChange = async (
        categoryIndex: number,
        shotIndex: number,
        newStatus: StatusType
    ) => {
        const taskId = taskGroups[categoryIndex].tasks[shotIndex].id;
        const loadingKey = `status-${taskId}`;

        setLoading(loadingKey, true); // ⭐ เพิ่ม
        try {
            const taskId = taskGroups[categoryIndex].tasks[shotIndex].id;

            // ✅ เรียก API เพื่ออัพเดท status ใช้ updateTask function ที่มีอยู่แล้ว
            const success = await updateTask(taskId, 'status', newStatus);

            if (success) {
                // อัพเดท state เฉพาะเมื่อ API สำเร็จ
                setTaskGroups(prev => {
                    const updated = [...prev];
                    updated[categoryIndex].tasks[shotIndex].status = newStatus;
                    return updated;
                });

                // ✅ อัพเดท selectedTask ด้วยถ้ากำลังเปิดอยู่
                if (selectedTask && selectedTask.id === taskId) {
                    setSelectedTask(prev => prev ? { ...prev, status: newStatus } : null);
                }
            }

            setShowStatusMenu(null);
        } catch (err) {
            console.error('Failed to update status:', err);
            // ✅ แสดง error message ให้ user ทราบ
            alert('ไม่สามารถอัพเดทสถานะได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(loadingKey, false); // ⭐ เพิ่ม
        }
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Update Task ++++++++++++++++++++++++++++++++++++++++++++++
    // ฟังก์ชันสำหรับอัพเดท task
    const updateTask = async (taskId: number, field: string, value: any) => {
        const loadingKey = `update-${taskId}-${field}`;
        setLoading(loadingKey, true); // ⭐ เพิ่ม
        try {
            await axios.post(`${ENDPOINTS.UPDATE_TASK}`, {
                taskId,
                field,
                value
            });

            // อัพเดท state ในตาราง
            setTaskGroups(prev => {
                const updated = [...prev];
                updated.forEach(group => {
                    group.tasks.forEach(task => {
                        if (task.id === taskId) {
                            (task as any)[field] = value;
                        }
                    });
                });
                return updated;
            });

            return true;
        } catch (err) {
            console.error('Failed to update task:', err);
            return false;
        } finally {
            setLoading(loadingKey, false); // ⭐ เพิ่ม
        }
    };


    // ฟังก์ชันโหลด Pipeline Steps ตาม entity_type
    // ฟังก์ชันโหลด Pipeline Steps ตาม entity_type
    const fetchPipelineStepsByType = async (entityType: 'asset' | 'shot') => {
        const loadingKey = `pipeline-${entityType}`;
        setLoading(loadingKey, true); // ⭐ เพิ่ม
        try {
            const res = await axios.post(`${ENDPOINTS.PIPELINE_STEPS}`, {
                entityType: entityType
            });

            // ⭐ แก้ไขตรงนี้ - เก็บ entity_type ไว้ใน step object
            const stepsWithType = res.data.map((step: PipelineStep) => ({
                ...step,
                entity_type: entityType // เพิ่ม entity_type เข้าไปใน object
            }));

            // ⭐ แทนที่จะรวม ให้ replace ข้อมูลของ type นั้นๆ เลย
            setAvailablePipelineSteps(prev => {
                // กรองเอาเฉพาะ steps ที่ไม่ใช่ type ที่กำลังจะอัพเดท
                const otherTypeSteps = prev.filter(step => step.entity_type !== entityType);
                // รวมกับ steps ใหม่
                return [...otherTypeSteps, ...stepsWithType];
            });
        } catch (err) {
            console.error("Failed to fetch pipeline steps:", err);
        } finally {
            setLoading(loadingKey, false); // ⭐ เพิ่ม
        }

    };
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Click Outside Dropdown PIPLINE STEP ++++++++++++++++++++++++++++++++++++++++++++++



    // ⭐ Custom Hook สำหรับคำนวณตำแหน่ง dropdown
    // ⭐ วิธีที่ 2: ใช้ Generic Type ที่ยืดหยุ่นกว่า
    // ⭐ แก้ไข type ของ parameter ให้รับ null ได้


    // ⭐ เพิ่ม states สำหรับตำแหน่ง dropdown แต่ละตัว (ใกล้บรรทัด 50-60)
    const [assigneeDropdownPosition, setAssigneeDropdownPosition] = useState<'top' | 'bottom'>('bottom');
    const [reviewerDropdownPosition, setReviewerDropdownPosition] = useState<'top' | 'bottom'>('bottom');
    const [pipelineDropdownPosition, setPipelineDropdownPosition] = useState<'top' | 'bottom'>('bottom');


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่มฟังก์ชันนี้ใน Project_Tasks.tsx (ใกล้ๆ กับ fetchTaskVersions)

    const updateVersion = async (versionId: number, field: string, value: any) => {
        try {
            await axios.post(`${ENDPOINTS.UPDATE_VERSION}`, {
                versionId,
                field,
                value
            });

            // อัปเดต state
            setTaskVersions(prev =>
                prev.map(v => {
                    if (v.id === versionId) {
                        // ถ้าเปลี่ยน uploaded_by ต้องอัปเดต uploaded_by_name ด้วย
                        if (field === 'uploaded_by') {
                            const user = projectUsers.find(u => u.id === value);
                            return {
                                ...v,
                                uploaded_by: value,
                                uploaded_by_name: user?.username
                            };
                        }
                        return { ...v, [field]: value };
                    }
                    return v;
                })
            );

            return true;
        } catch (err) {
            console.error('Update version error:', err);
            alert('ไม่สามารถอัปเดทข้อมูลได้');
            return false;
        }
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    // เพิ่ม states สำหรับ context menu และ delete confirm (ประมาณบรรทัด 60-70)
    const [taskContextMenu, setTaskContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        task: Task;
    } | null>(null);

    const [taskDeleteConfirm, setTaskDeleteConfirm] = useState<{
        taskId: number;
        taskName: string;
    } | null>(null);

    const [isDeletingTask, setIsDeletingTask] = useState(false);

    // เพิ่ม useEffect สำหรับปิด context menu เมื่อคลิกนอก
    useEffect(() => {
        if (!taskContextMenu) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-task-context-menu="true"]') ||
                target.closest('[data-task-delete-confirm="true"]')) {
                return;
            }
            setTaskContextMenu(null);
        };

        document.addEventListener('mousedown', handleClickOutside, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [taskContextMenu]);

    // เพิ่มฟังก์ชันจัดการ context menu
    const handleTaskContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        e.stopPropagation();
        setTaskContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            task,
        });
    };

    // เพิ่มฟังก์ชันลบ task
    const handleDeleteTask = async (taskId: number) => {
        setIsDeletingTask(true);
        try {
            await axios.delete(ENDPOINTS.DELETE_TASK, {
                data: { taskId },
            });

            // อัพเดท state - ลบ task ออกจาก taskGroups
            setTaskGroups(prev => {
                return prev.map(group => ({
                    ...group,
                    tasks: group.tasks.filter(t => t.id !== taskId)
                })).filter(group => group.tasks.length > 0); // ลบกลุ่มที่ไม่มี task
            });

            // ปิด right panel ถ้ากำลังเปิด task ที่ถูกลบอยู่
            if (selectedTask?.id === taskId) {
                setIsPanelOpen(false);
                setTimeout(() => setSelectedTask(null), 300);
            }

            setTaskDeleteConfirm(null);
            setTaskContextMenu(null);
        } catch (err) {
            console.error('❌ Delete task failed:', err);
            alert('ไม่สามารถลบ Task ได้');
        } finally {
            setIsDeletingTask(false);
        }
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const filteredGroups = taskGroups
        .map(g => ({
            ...g,
            tasks: g.tasks.filter(task => {
                const matchSearch = !searchQuery ||
                    task.task_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    g.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    task.assignees?.some(a => a.username.toLowerCase().includes(searchQuery.toLowerCase()));
                const matchStatus = !filterStatus || task.status === filterStatus;
                const matchEntity = !filterEntityType || g.entity_type === filterEntityType;
                return matchSearch && matchStatus && matchEntity;
            })
        }))
        .filter(g => g.tasks.length > 0);

    const displayTotal = filteredGroups.reduce((s, g) => s + g.tasks.length, 0);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    return (
        <div
            className="fixed inset-0 pt-14 bg-black"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            <Navbar_Project activeTab="Tasks" />

            <main className="pt-12 h-[calc(100vh-3.5rem)] flex">
                {/* Main content */}
                <div className="flex-1 flex flex-col bg-gray-900 overflow-hidden">


                    {/* ---- Toolbar ---- */}
                    <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
                        {/* Search */}
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="ค้นหา task, entity, assignee..."
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
                                className="h-9 pl-3 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none hover:border-blue-500 flex items-center gap-2 transition-colors"
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
                                    <div className="absolute left-0 top-full mt-1 z-50 bg-gradient-to-r from-gray-800 to-gray-800 border border-gray-600 rounded-lg shadow-2xl min-w-[140px] py-1">
                                        {[
                                            { value: '', label: 'ทุก Entity' },
                                            { value: 'shot', label: 'Shot' },
                                            { value: 'asset', label: 'Asset' },
                                            { value: 'sequence', label: 'Sequence' },
                                            { value: 'unassigned', label: 'Unassigned' },
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
                                className="h-9 pl-3 pr-8 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none hover:border-blue-500 flex items-center gap-2 transition-colors"
                            >
                                {filterStatus ? (
                                    <>
                                        {statusConfig[filterStatus as StatusType].icon === '-' ? (
                                            <span className="text-gray-500 font-bold text-sm">-</span>
                                        ) : (
                                            <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[filterStatus as StatusType].color}`} />
                                        )}
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
                                    <div className="absolute left-0 top-full mt-1 z-50 bg-gradient-to-r from-gray-800 to-gray-800 border border-gray-600 rounded-lg shadow-2xl min-w-[220px] max-h-[350px] overflow-y-auto py-1
                                             scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 whitespace-nowrap">
                                        <button
                                            onClick={() => { setFilterStatus(''); setShowStatusFilter(false); }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500"
                                        >
                                            <span className={!filterStatus ? 'text-blue-400 font-medium' : 'text-gray-200'}>ทุกสถานะ</span>
                                            {!filterStatus && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                                        </button>
                                        {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                            <button
                                                key={key}
                                                onClick={() => { setFilterStatus(key); setShowStatusFilter(false); }}
                                                className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500"
                                            >
                                                {config.icon === '-' ? (
                                                    <span className="text-gray-400 font-bold w-3 text-center">-</span>
                                                ) : (
                                                    <div className={`w-2.5 h-2.5 rounded-full ${config.color} flex-shrink-0`} />
                                                )}
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

                        <button onClick={() => setShowCreateMytask(true)} className="h-8 px-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105 whitespace-nowrap">
                            Add Task
                        </button>

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
                            <span>/ {totalTasks} tasks</span>
                        </div>
                    </div>



                    <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                                <tr className="border-b-2 border-blue-500/30">
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                                        #
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <span>Task</span>
                                            {/* <span className="text-blue-400">↑</span> */}
                                        </div>
                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                            <span>จำนวน:</span>
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                                {totalTasks}
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Link
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Pipeline Step
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div>Status</div>

                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        Assigned To
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        Reviewer
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>เริ่มต้น</span>
                                        </div>

                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>สิ้นสุด</span>
                                        </div>

                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>ระยะเวลา (วัน)</span>
                                        </div>

                                    </th>

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {isLoadingSequences ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16">
                                            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                                                <p className="text-gray-400 text-sm">Loading sequences...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : taskGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-16">
                                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                                <div className="text-center space-y-6">
                                                    <div className="relative">
                                                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                                                        <ClipboardList className="relative w-24 h-24 text-gray-600 mx-auto" strokeWidth={1.5} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <h3 className="text-2xl font-semibold text-gray-200">ยังไม่มีงาน</h3>
                                                        <p className="text-gray-500 max-w-md">
                                                            ยังไม่มีงานที่ได้รับมอบหมายในขณะนี้
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredGroups.map((group) => {
                                        const groupKey = `${group.entity_type}_${group.entity_id}`;
                                        const isExpanded = expandedGroups.has(groupKey);

                                        return (
                                            <React.Fragment key={groupKey}>
                                                {/* Header Row สำหรับแต่ละ Entity */}
                                                <tr
                                                    className="bg-gray-800 hover:bg-gray-800/60 cursor-pointer transition-all border-b border-gray-700/50"
                                                    onClick={() => toggleGroup(group.entity_type, group.entity_id)}
                                                >
                                                    <td colSpan={10} className="px-4 py-2.5">
                                                        <div className="flex items-center gap-3">
                                                            {/* Arrow Icon */}
                                                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />

                                                            {/* Entity Info */}
                                                            <div className="flex items-center gap-2.5 flex-1">
                                                                {/* ⭐ แก้ไขส่วนนี้ - จัดการกรณี unassigned */}
                                                                <div className={`w-7 h-7 rounded flex items-center justify-center ${group.entity_type === 'unassigned'
                                                                    ? 'bg-yellow-600/80'
                                                                    : 'bg-indigo-600/80'
                                                                    }`}>
                                                                    <span className="text-white font-semibold text-xs">
                                                                        {group.entity_type === 'unassigned'
                                                                            ? '?'
                                                                            : group.entity_name?.[0]?.toUpperCase()
                                                                        }
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-sm font-medium text-white">
                                                                        {group.entity_name}
                                                                    </h3>

                                                                    {/* ⭐ แสดง type เฉพาะตอนไม่ใช่ unassigned */}
                                                                    {group.entity_type !== 'unassigned' && group.entity_type && (
                                                                        <span className="text-xs text-gray-500">
                                                                            {group.entity_type}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Task Count Badge */}
                                                                <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-xs font-medium">
                                                                    {group.tasks.length}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Tasks Rows */}
                                                {isExpanded && group.tasks.map((task, index) => (
                                                    <tr
                                                        key={task.id}
                                                        onContextMenu={(e) => handleTaskContextMenu(e, task)}
                                                        className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                                    >
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                                                {index + 1}
                                                            </div>
                                                        </td>




                                                        {/* task name */}
                                                        <td className="px-4 py-4 w-48">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-400 text-lg flex-shrink-0">✓</span>

                                                                {editingTaskId === task.id ? (
                                                                    // โหมดแก้ไข
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={editingTaskName}
                                                                        onChange={(e) => setEditingTaskName(e.target.value)}
                                                                        onBlur={async () => {
                                                                            if (editingTaskName.trim() && editingTaskName !== task.task_name) {
                                                                                const success = await updateTask(task.id, 'task_name', editingTaskName.trim());
                                                                                if (success) {
                                                                                    task.task_name = editingTaskName.trim();
                                                                                }
                                                                            }
                                                                            setEditingTaskId(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.currentTarget.blur();
                                                                            } else if (e.key === 'Escape') {
                                                                                setEditingTaskId(null);
                                                                                setEditingTaskName(task.task_name);
                                                                            }
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex-1 px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm font-medium outline-none"
                                                                    />
                                                                ) : (
                                                                    // โหมดแสดงผล
                                                                    <>
                                                                        <span
                                                                            onClick={() => setSelectedTask(task)}
                                                                            className="text-blue-400 hover:text-blue-300 underline decoration-blue-400 hover:decoration-blue-300 underline-offset-3 transition-colors font-medium cursor-pointer truncate max-w-[150px]"
                                                                            title={task.task_name}
                                                                        >
                                                                            {task.task_name}
                                                                        </span>

                                                                        {/* ปุ่มแก้ไข - แสดงเมื่อ hover */}
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingTaskId(task.id);
                                                                                setEditingTaskName(task.task_name);
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


                                                        {/* ⭐ Entity Name */}
                                                        {/* ⭐ Entity Name */}
                                                        <td className="px-4 py-4">
                                                            {/* ⭐ เช็คว่าเป็น unassigned หรือไม่ */}
                                                            {group.entity_type === 'unassigned' ? (
                                                                <span className="text-gray-600 italic text-sm">ไม่ได้กำหนด</span>
                                                            ) : task.entity_type ? (
                                                                <span
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();

                                                                        if (group.entity_type === 'sequence') {
                                                                            try {
                                                                                const res = await axios.post(ENDPOINTS.PROJECT_SEQUENCES, {
                                                                                    projectId: JSON.parse(localStorage.getItem("projectId") || "null")
                                                                                });

                                                                                const sequence = res.data.find((seq: any) => seq.id === group.entity_id);

                                                                                if (sequence) {
                                                                                    localStorage.setItem(
                                                                                        "sequenceData",
                                                                                        JSON.stringify({
                                                                                            sequenceId: sequence.id,
                                                                                            sequenceName: sequence.sequence_name,
                                                                                            description: sequence.description,
                                                                                            status: sequence.status || 'wtg',
                                                                                            thumbnail: sequence.file_url || '',
                                                                                            createdAt: sequence.created_at,
                                                                                            projectId: JSON.parse(localStorage.getItem("projectId") || "null")
                                                                                        })
                                                                                    );
                                                                                    navigate("/Project_Sequence/Others_Sequence");
                                                                                }
                                                                            } catch (err) {
                                                                                console.error("Failed to fetch sequence:", err);
                                                                            }
                                                                        }
                                                                        // ⭐ เพิ่มการจัดการสำหรับ shot
                                                                        // ⭐ เพิ่มการจัดการสำหรับ shot
                                                                        else if (group.entity_type === 'shot') {
                                                                            try {
                                                                                const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
                                                                                const res = await axios.post(ENDPOINTS.SHOTLIST, { projectId });

                                                                                // ค้นหา shot ที่ตรงกับ entity_id
                                                                                let foundShot = null;
                                                                                for (const group of res.data) {
                                                                                    const shot = group.shots?.find((s: any) => s.id === task.entity_id);
                                                                                    if (shot) {
                                                                                        foundShot = {
                                                                                            ...shot,
                                                                                            sequence: group.category,
                                                                                            sequenceDetail: shot.sequence || null,
                                                                                            assets: shot.assets || []
                                                                                        };
                                                                                        break;
                                                                                    }
                                                                                }

                                                                                if (foundShot) {
                                                                                    localStorage.setItem(
                                                                                        "selectedShot",
                                                                                        JSON.stringify({
                                                                                            id: foundShot.id,
                                                                                            shot_name: foundShot.shot_name,
                                                                                            description: foundShot.description,
                                                                                            status: foundShot.status,
                                                                                            // ⭐ แก้ไขตรงนี้ - ลองใช้ทั้ง thumbnail และ file_url
                                                                                            thumbnail: foundShot.thumbnail || foundShot.file_url || "",
                                                                                            sequence: foundShot.sequence,
                                                                                            sequenceDetail: foundShot.sequenceDetail,
                                                                                            assets: foundShot.assets
                                                                                        })
                                                                                    );
                                                                                    navigate("/Project_Shot/Others_Shot");
                                                                                } else {
                                                                                    alert("ไม่พบข้อมูล Shot");
                                                                                }
                                                                            } catch (err) {
                                                                                console.error("Failed to fetch shot:", err);
                                                                                alert("ไม่สามารถโหลดข้อมูล Shot ได้");
                                                                            }
                                                                        }
                                                                        // ⭐ เพิ่มการจัดการสำหรับ asset
                                                                        else if (group.entity_type === 'asset') {
                                                                            try {
                                                                                const projectId = JSON.parse(localStorage.getItem("projectId") || "null");
                                                                                const res = await axios.post(ENDPOINTS.ASSETLIST, { projectId });

                                                                                // ค้นหา asset ที่ตรงกับ entity_id
                                                                                let foundAsset = null;
                                                                                for (const group of res.data) {
                                                                                    const asset = group.assets?.find((a: any) => a.id === task.entity_id);
                                                                                    if (asset) {
                                                                                        foundAsset = {
                                                                                            ...asset,
                                                                                            category: group.category
                                                                                        };
                                                                                        break;
                                                                                    }
                                                                                }

                                                                                if (foundAsset) {
                                                                                    localStorage.setItem(
                                                                                        "selectedAsset",
                                                                                        JSON.stringify({
                                                                                            id: foundAsset.id,
                                                                                            asset_name: foundAsset.asset_name,
                                                                                            description: foundAsset.description,
                                                                                            status: foundAsset.status,
                                                                                            file_url: foundAsset.file_url || "",
                                                                                            sequence: foundAsset.category
                                                                                        })
                                                                                    );
                                                                                    navigate('/Project_Assets/Others_Asset');
                                                                                } else {
                                                                                    alert("ไม่พบข้อมูล Asset");
                                                                                }
                                                                            } catch (err) {
                                                                                console.error("Failed to fetch asset:", err);
                                                                                alert("ไม่สามารถโหลดข้อมูล Asset ได้");
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="text-gray-300 hover:text-blue-400 underline decoration-gray-400/30 hover:decoration-blue-400 underline-offset-3 transition-colors font-medium cursor-pointer"
                                                                >
                                                                    {group.entity_name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                                            )}
                                                        </td>

                                                        {/* ⭐ Column #5: Pipeline Step - เพิ่มตรงนี้ */}
                                                        <td className="px-4 py-4">
                                                            <div className="relative" ref={pipelineDropdownRef}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        if (editingPipelineTaskId === task.id) {
                                                                            setEditingPipelineTaskId(null);
                                                                        } else {
                                                                            // ⭐ เพิ่มการคำนวณตำแหน่งแบบเดียวกับ status
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                                            const spaceAbove = rect.top;

                                                                            setPipelineDropdownPosition(
                                                                                spaceBelow < 400 && spaceAbove > spaceBelow ? 'top' : 'bottom'
                                                                            );
                                                                            let entityType = task.entity_type || group.entity_type;

                                                                            // ⭐ ถ้าเป็น sequence ให้แจ้งเตือน
                                                                            if (entityType === 'sequence') {
                                                                                alert('Task ที่ link กับ Sequence ไม่สามารถกำหนด Pipeline Step ได้');
                                                                                return;
                                                                            }

                                                                            // ⭐ ปรับปรุงการจัดการ unassigned - รีเซ็ต availablePipelineSteps ก่อน
                                                                            if (!entityType || entityType === 'unassigned') {
                                                                                setAvailablePipelineSteps([]); // ⭐ เคลียร์ก่อน
                                                                                fetchPipelineStepsByType('shot');
                                                                                fetchPipelineStepsByType('asset');
                                                                            } else {
                                                                                setAvailablePipelineSteps([]); // ⭐ เคลียร์ก่อน
                                                                                fetchPipelineStepsByType(entityType as 'asset' | 'shot');
                                                                            }

                                                                            setEditingPipelineTaskId(task.id);
                                                                            setSelectedPipelineStepId(task.pipeline_step?.id || null);
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 transition-all cursor-pointer whitespace-nowrap"
                                                                >
                                                                    {task.pipeline_step ? (
                                                                        <>
                                                                            <div
                                                                                className="w-3 h-3 rounded"
                                                                                style={{
                                                                                    backgroundColor: task.pipeline_step.color_hex,
                                                                                    boxShadow: `0 0 6px ${task.pipeline_step.color_hex}60`
                                                                                }}
                                                                            />
                                                                            <span className="text-sm font-medium text-gray-200">
                                                                                {task.pipeline_step.step_name}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-sm font-medium text-gray-400 italic">
                                                                            ไม่ระบุ
                                                                        </span>
                                                                    )}
                                                                </button>

                                                                {editingPipelineTaskId === task.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-10"
                                                                            onClick={() => setEditingPipelineTaskId(null)}
                                                                            style={{ pointerEvents: 'none' }}
                                                                        />
                                                                        <div
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className={`absolute left-0 ${pipelineDropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-[100] w-80 max-h-96 overflow-hidden bg-gray-800 border border-blue-500/40 rounded-lg shadow-2xl`}
                                                                            style={{ pointerEvents: 'auto' }}
                                                                        >
                                                                            {/* Header */}
                                                                            <div className="px-4 py-3 bg-gray-800 border-b border-gray-700/50">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-sm font-semibold text-gray-200">
                                                                                        เลือก Pipeline Step
                                                                                        {(() => {
                                                                                            const entityType = task.entity_type || group.entity_type;
                                                                                            if (entityType === 'shot') {
                                                                                                return <span className="ml-2 text-blue-400">(Shot)</span>;
                                                                                            } else if (entityType === 'asset') {
                                                                                                return <span className="ml-2 text-green-400">(Asset)</span>;
                                                                                            } else {
                                                                                                return (
                                                                                                    <span className="ml-2">
                                                                                                        <span className="text-blue-400">(Shot</span>
                                                                                                        <span className="text-gray-500"> / </span>
                                                                                                        <span className="text-green-400">Asset)</span>
                                                                                                    </span>
                                                                                                );
                                                                                            }
                                                                                        })()}
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => setEditingPipelineTaskId(null)}
                                                                                        className="p-1 rounded transition-colors bg-gradient-to-r from-gray-700 to-gray-700 hover:from-gray-600 hover:to-gray-600 rounded-2xl"

                                                                                    >
                                                                                        <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            <div className="max-h-72 overflow-y-auto">
                                                                                <div className="p-2">
                                                                                    {(isLoading('pipeline-shot') || isLoading('pipeline-asset')) && (
                                                                                        <div className="flex items-center justify-center py-8">
                                                                                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                                                            <span className="ml-2 text-sm text-gray-400">กำลังโหลด...</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Option: ไม่ระบุ */}
                                                                                    {!(isLoading('pipeline-shot') || isLoading('pipeline-asset')) && (
                                                                                        <>
                                                                                            <button
                                                                                                onClick={async () => {
                                                                                                    const success = await updateTask(task.id, 'pipeline_step_id', null);
                                                                                                    if (success) {
                                                                                                        task.pipeline_step = null;
                                                                                                    }
                                                                                                    setEditingPipelineTaskId(null);
                                                                                                }}
                                                                                                className={`w-full flex items-center gap-3 px-3 py-2 transition-all bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl ${!selectedPipelineStepId
                                                                                                    ? 'bg-blue-500/20 border border-blue-500/40'
                                                                                                    : 'hover:bg-gray-700/50 border border-transparent'
                                                                                                    }`}
                                                                                            >
                                                                                                <div className="w-3 h-3 rounded border-2 border-gray-500" />
                                                                                                <span className="text-sm text-gray-400 italic">ไม่ระบุ</span>
                                                                                            </button>

                                                                                            {/* Pipeline Steps */}
                                                                                            {availablePipelineSteps.map(step => (
                                                                                                <button
                                                                                                    key={step.id}
                                                                                                    onClick={async () => {
                                                                                                        setSelectedPipelineStepId(step.id); // ⭐ สำคัญ

                                                                                                        const success = await updateTask(
                                                                                                            task.id,
                                                                                                            'pipeline_step_id',
                                                                                                            step.id
                                                                                                        );

                                                                                                        if (success) {
                                                                                                            task.pipeline_step = step;
                                                                                                        }

                                                                                                        setEditingPipelineTaskId(null);
                                                                                                    }}

                                                                                                    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl
                                                                                             ${selectedPipelineStepId === step.id
                                                                                                            ? 'border border-blue-500 bg-blue-500/10'
                                                                                                            : 'border border-transparent hover:bg-gray-700/50'
                                                                                                        }`}
                                                                                                    style={{
                                                                                                        backgroundImage:
                                                                                                            selectedPipelineStepId === step.id
                                                                                                                ? `linear-gradient(to right, ${step.color_hex}20 0%, ${step.color_hex}05 40%, transparent 70%)`
                                                                                                                : undefined,
                                                                                                        backgroundColor:
                                                                                                            selectedPipelineStepId === step.id ? '#1f2937' : undefined // gray-800
                                                                                                    }}
                                                                                                >
                                                                                                    {/* สี่เหลี่ยมสี */}
                                                                                                    <div
                                                                                                        className="w-3 h-3 rounded flex-shrink-0"
                                                                                                        style={{
                                                                                                            backgroundColor: step.color_hex,
                                                                                                            boxShadow: `0 0 8px ${step.color_hex}60`
                                                                                                        }}
                                                                                                    />

                                                                                                    {/* ชื่อ step */}
                                                                                                    <span className="text-sm font-medium text-gray-200 text-left">
                                                                                                        {step.step_name}
                                                                                                    </span>

                                                                                                    {/* Badge แสดง Shot/Asset ถ้าแสดงทั้ง 2 type */}
                                                                                                    {(() => {
                                                                                                        const entityType = task.entity_type || group.entity_type;
                                                                                                        if (!entityType || entityType === 'unassigned') {
                                                                                                            // แสดง badge ว่าเป็น Shot หรือ Asset
                                                                                                            return (
                                                                                                                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${step.entity_type === 'shot'
                                                                                                                    ? 'bg-blue-500/20 text-blue-400'
                                                                                                                    : 'bg-green-500/20 text-green-400'
                                                                                                                    }`}>
                                                                                                                    {step.entity_type === 'shot' ? 'Shot' : 'Asset'}
                                                                                                                </span>
                                                                                                            );
                                                                                                        }
                                                                                                        return null;
                                                                                                    })()}

                                                                                                    {/* Checkmark ถ้าเลือกอยู่ */}
                                                                                                    {selectedPipelineStepId === step.id && (
                                                                                                        <Check className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" />
                                                                                                    )}
                                                                                                </button>
                                                                                            ))}
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* ⭐ Column #6: Description - แก้ไขเพื่อให้อัพเดทได้ */}
                                                        {/* <td className="px-4 py-4">
                                                            <textarea
                                                                value={task.description || ""}
                                                                onChange={(e) => {
                                                                    // อัพเดท state ทันทีเพื่อให้ UI responsive
                                                                    const updatedGroups = [...taskGroups];
                                                                    const groupIndex = updatedGroups.findIndex(g => g.tasks.includes(task));
                                                                    const taskIndex = updatedGroups[groupIndex].tasks.indexOf(task);
                                                                    updatedGroups[groupIndex].tasks[taskIndex].description = e.target.value;
                                                                    setTaskGroups(updatedGroups);
                                                                }}
                                                                onBlur={async (e) => {
                                                                    // บันทึกลง backend เมื่อ blur
                                                                    const newDescription = e.target.value.trim();
                                                                    await updateTask(task.id, 'description', newDescription);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                                        // กด Enter (ไม่กด Shift) = บันทึก
                                                                        e.preventDefault();
                                                                        e.stopPropagation();

                                                                        const target = e.currentTarget;
                                                                        // const newDescription = target.value.trim();

                                                                        // Blur ก่อน await เพื่อให้ onBlur จัดการ update
                                                                        target.blur();

                                                                        // ไม่ต้อง await ที่นี่ เพราะ onBlur จะจัดการให้
                                                                    } else if (e.key === 'Escape') {
                                                                        // กด Escape = ยกเลิก
                                                                        e.preventDefault();
                                                                        e.currentTarget.blur();
                                                                    }
                                                                    // กด Shift+Enter = ขึ้นบรรทัดใหม่ (default behavior)
                                                                }}
                                                                rows={2}
                                                                placeholder="เพิ่มรายละเอียด..."
                                                                className="w-full max-w-xs text-sm text-gray-300 bg-gray-800/60
                                                                border border-gray-700 rounded px-2 py-1
                                                                outline-none resize-none
                                                                focus:border-blue-500 focus:bg-gray-800 
                                                                transition-colors"
                                                            />
                                                        </td> */}


                                                        {/* Column #7: สถานะ */}
                                                        <td className="px-4 py-4">
                                                            <div className="w-20 flex-shrink-0 relative">
                                                                <button
                                                                    onClick={(e) => handleFieldClick('status', taskGroups.findIndex(g => g.tasks.includes(task)), group.tasks.indexOf(task), e)}
                                                                    className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                    disabled={isLoading(`status-${task.id}`)} // ⭐ เพิ่ม
                                                                >
                                                                    {isLoading(`status-${task.id}`) ? ( // ⭐ เพิ่ม
                                                                        <div className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : statusConfig[task.status as StatusType].icon === '-' ? (
                                                                        <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                                    ) : (
                                                                        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[task.status as StatusType].color} shadow-sm`}></div>
                                                                    )}
                                                                    <span className="text-xs text-gray-300 font-medium">
                                                                        {statusConfig[task.status as StatusType].label}
                                                                    </span>
                                                                </button>

                                                                {/* Status Dropdown */}
                                                                {showStatusMenu?.categoryIndex === taskGroups.findIndex(g => g.tasks.includes(task)) &&
                                                                    showStatusMenu?.shotIndex === group.tasks.indexOf(task) && (
                                                                        <>
                                                                            {/* Backdrop */}
                                                                            <div
                                                                                className="fixed inset-0 z-10"
                                                                                onClick={() => setShowStatusMenu(null)}
                                                                            />

                                                                            {/* Menu */}
                                                                            <div className={`
                                                                                absolute left-0 
                                                                                ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} 
                                                                                bg-gray-800 rounded-lg shadow-2xl z-50 
                                                                                min-w-[200px] 
                                                                                max-h-[350px] overflow-y-auto
                                                                                border border-gray-600 whitespace-nowrap
                                                                                scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500
                                                                            `}>
                                                                                {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                                    <button
                                                                                        key={key}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleStatusChange(
                                                                                                taskGroups.findIndex(g => g.tasks.includes(task)),
                                                                                                group.tasks.indexOf(task),
                                                                                                key
                                                                                            );
                                                                                        }}
                                                                                        className="flex items-center gap-5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500"
                                                                                    >
                                                                                        {config.icon === '-' ? (
                                                                                            <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                                        ) : (
                                                                                            <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                                                                        )}
                                                                                        <div className="text-xs text-gray-200 flex items-center gap-5">
                                                                                            <span className="inline-block w-8">{config.label}</span>
                                                                                            <span>{config.fullLabel}</span>
                                                                                        </div>
                                                                                        {task.status === key && ( // ✅ แสดง checkmark
                                                                                            <Check className="w-4 h-4 text-blue-400 ml-auto" />
                                                                                        )}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                            </div>
                                                        </td>


                                                        {/* ============= Column: Assigned To (Assignees) ============= */}
                                                        <td className="px-4 py-4">
                                                            <div className="relative" ref={assigneeDropdownRef}>
                                                                {/* ปุ่มแสดงรายชื่อ + เปิด Dropdown */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        if (editingAssigneeTaskId === task.id) {
                                                                            setEditingAssigneeTaskId(null);
                                                                        } else {
                                                                            // ⭐ เพิ่มการคำนวณตำแหน่ง
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                                            const spaceAbove = rect.top;

                                                                            setAssigneeDropdownPosition(
                                                                                spaceBelow < 400 && spaceAbove > spaceBelow ? 'top' : 'bottom'
                                                                            );
                                                                            setEditingAssigneeTaskId(task.id);
                                                                            setSearchAssignee("");
                                                                        }
                                                                    }}
                                                                    className="whitespace-nowrap group/btn min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-600 hover:to-slate-500 border border-slate-500/30 hover:border-slate-400/50 transition-all"
                                                                >
                                                                    <Users className="w-4 h-4 text-slate-300 flex-shrink-0" />

                                                                    {(!task.assignees || task.assignees.length === 0) && (
                                                                        <span className="text-sm text-slate-400">เพิ่ม</span>
                                                                    )}

                                                                    {task.assignees && task.assignees.length > 0 && task.assignees.length <= 2 && (
                                                                        <div className="flex items-center gap-1.5">
                                                                            {sortAssignees(task.assignees, getCurrentUser().id).map((user, idx) => {
                                                                                const isMe = user.id === getCurrentUser().id;
                                                                                return (
                                                                                    <span
                                                                                        key={user.id}
                                                                                        className={`text-sm font-medium ${isMe ? 'text-emerald-300' : 'text-slate-200'
                                                                                            }`}
                                                                                    >
                                                                                        {user.username}
                                                                                        {idx < task.assignees.length - 1 && ','}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {task.assignees && task.assignees.length > 2 && (
                                                                        <>
                                                                            <span className="text-sm font-semibold text-slate-200">
                                                                                {task.assignees.length} คน
                                                                            </span>
                                                                            {isCurrentUserAssigned(task.assignees) && (
                                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                    คุณ
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </button>

                                                                {/* Dropdown สำหรับจัดการ Assignees */}
                                                                {editingAssigneeTaskId === task.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-10"
                                                                            onClick={() => setEditingAssigneeTaskId(null)}
                                                                            style={{ pointerEvents: 'none' }}
                                                                        />
                                                                        <div
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className={`absolute left-0 ${assigneeDropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-[100] w-80 max-h-96 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 rounded-xl shadow-2xl ring-1 ring-white/5`}
                                                                            style={{ pointerEvents: 'auto' }}
                                                                        >
                                                                            {/* Header */}
                                                                            <div className="px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 backdrop-blur-sm border-b border-slate-600/50">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Users className="w-4 h-4 text-slate-400" />
                                                                                        <span className="text-sm font-semibold text-slate-200">
                                                                                            ผู้รับผิดชอบ
                                                                                        </span>
                                                                                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-xs font-semibold text-slate-300">
                                                                                            {task.assignees?.length || 0}
                                                                                        </span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => setEditingAssigneeTaskId(null)}
                                                                                        className="p-1 rounded transition-colors bg-gradient-to-r from-gray-700 to-gray-700 hover:from-gray-600 hover:to-gray-600 rounded-2xl"
                                                                                    >
                                                                                        <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                                                                                    </button>
                                                                                </div>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="ค้นหาเพื่อเพิ่ม..."
                                                                                    value={searchAssignee}
                                                                                    onChange={(e) => setSearchAssignee(e.target.value)}
                                                                                    className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                                                                                />
                                                                            </div>

                                                                            <div className="max-h-72 overflow-y-auto">
                                                                                {/* Current Assignees */}
                                                                                {task.assignees && task.assignees.length > 0 && (
                                                                                    <div className="p-2 border-b border-slate-700/50">
                                                                                        <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">
                                                                                            รายชื่อปัจจุบัน
                                                                                        </div>
                                                                                        {sortAssignees(task.assignees, getCurrentUser().id).map((user) => {
                                                                                            const isMe = user.id === getCurrentUser().id;
                                                                                            return (
                                                                                                <div
                                                                                                    key={user.id}
                                                                                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group/user"
                                                                                                >
                                                                                                    <div
                                                                                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ring-2 ${isMe
                                                                                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/30'
                                                                                                            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-blue-500/30'
                                                                                                            }`}
                                                                                                    >
                                                                                                        {user.username[0].toUpperCase()}
                                                                                                    </div>
                                                                                                    <span className="flex-1 text-sm font-medium text-slate-200 truncate">
                                                                                                        {user.username}
                                                                                                    </span>
                                                                                                    {isMe && (
                                                                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                                            คุณ
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <button
                                                                                                        onClick={() => removeAssignee(task.id, user.id)}
                                                                                                        className="opacity-0 group-hover/user:opacity-100 p-1 rounded-2xl transition-all bg-gradient-to-r from-gray-700 to-gray-700 hover:from-gray-600 hover:to-gray-600"
                                                                                                        title="ลบ"
                                                                                                    >
                                                                                                        <X className="w-3.5 h-3.5 text-red-400" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}

                                                                                {/* Available Users - แสดงเฉพาะเมื่อมีการค้นหา */}
                                                                                {searchAssignee.trim().length > 0 && getAvailableAssignees(task).length > 0 && (
                                                                                    <div className="p-2">
                                                                                        <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">
                                                                                            ผลการค้นหา
                                                                                        </div>
                                                                                        {getAvailableAssignees(task).map((user) => (
                                                                                            <div
                                                                                                key={user.id}
                                                                                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group/add"
                                                                                            >
                                                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                                                                    {user.username[0].toUpperCase()}
                                                                                                </div>
                                                                                                <span className="flex-1 text-left text-sm font-medium text-slate-300">
                                                                                                    {user.username}
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => addAssignee(task.id, user.id)}
                                                                                                    className=" p-1.5 rounded-2xl transition-all bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                                                    title="เพิ่มReviewer"
                                                                                                >
                                                                                                    <UserPlus className="w-4 h-4 text-slate-400 group-hover/add:text-blue-400" />

                                                                                                </button>

                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Empty States */}
                                                                                {!task.assignees || task.assignees.length === 0 ? (
                                                                                    <div className="p-6 text-center">
                                                                                        <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                                                                                        <p className="text-xs text-slate-500">ค้นหาเพื่อเพิ่มผู้รับผิดชอบ</p>
                                                                                    </div>
                                                                                ) : searchAssignee.trim().length > 0 && getAvailableAssignees(task).length === 0 && (
                                                                                    <div className="p-6 text-center">
                                                                                        <p className="text-xs text-slate-500">ไม่พบผลการค้นหา</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* ============= Column: Reviewer ============= */}
                                                        <td className="px-4 py-4">
                                                            <div className="relative" ref={reviewerDropdownRef}>
                                                                <button
                                                                    onClick={(e) => {
                                                                        if (editingReviewerTaskId === task.id) {
                                                                            setEditingReviewerTaskId(null);
                                                                        } else {
                                                                            // ⭐ เพิ่มการคำนวณตำแหน่ง
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                                            const spaceAbove = rect.top;

                                                                            setReviewerDropdownPosition(
                                                                                spaceBelow < 400 && spaceAbove > spaceBelow ? 'top' : 'bottom'
                                                                            );
                                                                            setEditingReviewerTaskId(task.id);
                                                                            setSearchReviewer("");
                                                                        }
                                                                    }}
                                                                    className="group/btn min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-600 hover:to-slate-500 border border-slate-500/30 hover:border-slate-400/50 transition-all"
                                                                >
                                                                    <Users className="w-4 h-4 text-slate-300 flex-shrink-0" />

                                                                    {(!task.reviewers || task.reviewers.length === 0) && (
                                                                        <span className="text-sm text-slate-400">เพิ่ม</span>
                                                                    )}

                                                                    {task.reviewers && task.reviewers.length > 0 && task.reviewers.length <= 2 && (
                                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                                            {sortAssignees(task.reviewers, getCurrentUser().id).map((user, idx) => {
                                                                                const isMe = user.id === getCurrentUser().id;
                                                                                return (
                                                                                    <span
                                                                                        key={user.id}
                                                                                        className={`text-sm font-medium ${isMe ? 'text-emerald-300' : 'text-slate-200'
                                                                                            }`}
                                                                                    >
                                                                                        {user.username}
                                                                                        {idx < task.reviewers!.length - 1 && ','}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {task.reviewers && task.reviewers.length > 2 && (
                                                                        <>
                                                                            <span className="text-sm font-semibold text-slate-200">
                                                                                {task.reviewers.length} คน
                                                                            </span>
                                                                            {isCurrentUserReviewer(task.reviewers) && (
                                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                    คุณ
                                                                                </span>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </button>

                                                                {editingReviewerTaskId === task.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-10"
                                                                            onClick={() => setEditingReviewerTaskId(null)}
                                                                            style={{ pointerEvents: 'none' }}
                                                                        />
                                                                        <div
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className={`absolute left-0 ${reviewerDropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} z-[100] w-80 max-h-96 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 rounded-xl shadow-2xl ring-1 ring-white/5`}
                                                                            style={{ pointerEvents: 'auto' }}
                                                                        >
                                                                            <div className="px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 backdrop-blur-sm border-b border-slate-600/50">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Users className="w-4 h-4 text-slate-400" />
                                                                                        <span className="text-sm font-semibold text-slate-200">
                                                                                            Reviewer
                                                                                        </span>
                                                                                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-xs font-semibold text-slate-300">
                                                                                            {task.reviewers?.length || 0}
                                                                                        </span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => setEditingReviewerTaskId(null)}
                                                                                        className="p-1 hover:bg-slate-700/50 rounded-2xl transition-colors bg-gradient-to-r from-slate-700 to-slate-700 hover:from-slate-600 hover:to-slate-600 rounded-2xl"
                                                                                    >
                                                                                        <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                                                                                    </button>
                                                                                </div>
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="ค้นหาเพื่อเพิ่ม..."
                                                                                    value={searchReviewer}
                                                                                    onChange={(e) => setSearchReviewer(e.target.value)}
                                                                                    className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-500/50"
                                                                                />
                                                                            </div>

                                                                            <div className="max-h-72 overflow-y-auto">
                                                                                {/* Current Reviewers */}
                                                                                {task.reviewers && task.reviewers.length > 0 && (
                                                                                    <div className="p-2 border-b border-slate-700/50">
                                                                                        <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">
                                                                                            รายชื่อปัจจุบัน
                                                                                        </div>
                                                                                        {sortAssignees(task.reviewers, getCurrentUser().id).map((reviewer) => {
                                                                                            const isMe = reviewer.id === getCurrentUser().id;
                                                                                            return (
                                                                                                <div
                                                                                                    key={reviewer.id}
                                                                                                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group/user"
                                                                                                >
                                                                                                    <div
                                                                                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ring-2 ${isMe
                                                                                                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/30'
                                                                                                            : 'bg-gradient-to-br from-pink-500 to-pink-600 text-white ring-slate-500/30'
                                                                                                            }`}
                                                                                                    >
                                                                                                        {reviewer.username[0].toUpperCase()}
                                                                                                    </div>
                                                                                                    <span className="flex-1 text-sm font-medium text-slate-200 truncate">
                                                                                                        {reviewer.username}
                                                                                                    </span>
                                                                                                    {isMe && (
                                                                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                                            คุณ
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <button
                                                                                                        onClick={() => removeReviewer(task.id, reviewer.id)}
                                                                                                        className="opacity-0 group-hover/user:opacity-100 p-1 rounded-2xl transition-all bg-gradient-to-r from-slate-700 to-slate-700 hover:from-slate-600 hover:to-slate-600"
                                                                                                        title="ลบ"
                                                                                                    >
                                                                                                        <X className="w-3.5 h-3.5 text-red-400" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}

                                                                                {/* Available Reviewers - แสดงเฉพาะเมื่อมีการค้นหา */}
                                                                                {searchReviewer.trim().length > 0 && getAvailableReviewers(task).length > 0 && (
                                                                                    <div className="p-2">
                                                                                        <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">
                                                                                            ผลการค้นหา
                                                                                        </div>
                                                                                        {getAvailableReviewers(task).map((user) => (
                                                                                            <div
                                                                                                key={user.id}
                                                                                                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-700/50 transition-colors group/add"
                                                                                            >
                                                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                                                                    {user.username[0].toUpperCase()}
                                                                                                </div>
                                                                                                <span className="flex-1 text-left text-sm font-medium text-slate-200">
                                                                                                    {user.username}
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => addReviewer(task.id, user.id)}

                                                                                                    className=" p-1.5 rounded-2xl transition-all bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                                                    title="เพิ่มReviewer"
                                                                                                >
                                                                                                    <UserPlus className="w-4 h-4 text-slate-400 group-hover/add:text-blue-500" />
                                                                                                </button>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}

                                                                                {/* Empty States */}
                                                                                {!task.reviewers || task.reviewers.length === 0 ? (
                                                                                    <div className="p-6 text-center">
                                                                                        <Users className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                                                                                        <p className="text-xs text-slate-400">ค้นหาเพื่อเพิ่ม Reviewer</p>
                                                                                    </div>
                                                                                ) : searchReviewer.trim().length > 0 && getAvailableReviewers(task).length === 0 && (
                                                                                    <div className="p-6 text-center">
                                                                                        <p className="text-xs text-slate-400">ไม่พบผลการค้นหา</p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* ============= Column: Start Date ============= */}
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {editingStartDateTaskId === task.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="date"
                                                                        autoFocus
                                                                        value={formatDateForInput(task.start_date)}
                                                                        onChange={(e) => {
                                                                            const newDate = e.target.value;
                                                                            handleDateUpdate(task.id, 'start_date', newDate);
                                                                        }}
                                                                        onBlur={() => {
                                                                            setEditingStartDateTaskId(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === 'Escape') {
                                                                                setEditingStartDateTaskId(null);
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm outline-none"
                                                                    />
                                                                    {/* ✅ เปลี่ยนจาก onClick เป็น onMouseDown */}
                                                                    {task.start_date && (
                                                                        <button
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault(); // ป้องกัน blur
                                                                                handleDateUpdate(task.id, 'start_date', '');
                                                                            }}
                                                                            className="p-1 rounded hover:bg-red-500/20 transition-colors rounded-2xl bg-gradient-to-r from-red-600 to-red-600 hover:from-red-500 hover:to-red-500"
                                                                            title="ลบวันที่"
                                                                        >
                                                                            <X className="w-4 h-4 text-slate-50 " />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    onClick={() => setEditingStartDateTaskId(task.id)}
                                                                    className="group/date flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800/50 rounded px-2 py-1 transition-colors"
                                                                >
                                                                    {task.start_date ? (
                                                                        <>
                                                                            <Calendar className="w-4 h-4 text-gray-500 group-hover/date:text-blue-400 transition-colors" />
                                                                            <span className="text-gray-300 font-mono group-hover/date:text-blue-400 transition-colors">
                                                                                {formatDateThai(task.start_date)}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-gray-600 italic group-hover/date:text-blue-400 transition-colors">
                                                                            คลิกเพื่อเพิ่มวัน
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* ============= Column: Due Date ============= */}
                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {editingDueDateTaskId === task.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="date"
                                                                        autoFocus
                                                                        value={formatDateForInput(task.due_date)}
                                                                        onChange={(e) => {
                                                                            const newDate = e.target.value;
                                                                            handleDateUpdate(task.id, 'due_date', newDate);
                                                                        }}
                                                                        onBlur={() => {
                                                                            setEditingDueDateTaskId(null);
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === 'Escape') {
                                                                                setEditingDueDateTaskId(null);
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 bg-gray-800 border border-blue-500 rounded text-blue-400 text-sm outline-none"
                                                                    />
                                                                    {/* ✅ เปลี่ยนจาก onClick เป็น onMouseDown */}
                                                                    {task.due_date && (
                                                                        <button
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault(); // ป้องกัน blur
                                                                                handleDateUpdate(task.id, 'due_date', '');
                                                                            }}
                                                                            className="p-1 rounded hover:bg-red-500/20 transition-colors"
                                                                            title="ลบวันที่"
                                                                        >
                                                                            <X className="w-4 h-4 text-red-400" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    onClick={() => setEditingDueDateTaskId(task.id)}
                                                                    className="group/date flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800/50 rounded px-2 py-1 transition-colors"
                                                                >
                                                                    {task.due_date ? (
                                                                        <>
                                                                            <Calendar className="w-4 h-4 text-gray-500 group-hover/date:text-blue-400 transition-colors" />
                                                                            <span className="text-gray-300 font-mono group-hover/date:text-blue-400 transition-colors">
                                                                                {formatDateThai(task.due_date)}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-gray-600 italic group-hover/date:text-blue-400 transition-colors">
                                                                            คลิกเพื่อเพิ่มวัน
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                            {task.start_date && task.due_date ? (
                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 ring-1 ring-indigo-500/30">
                                                                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                                                    <span className="text-sm font-semibold text-indigo-300">
                                                                        {calculateDurationDays(task.start_date, task.due_date)} วัน
                                                                    </span>
                                                                </div>
                                                            ) : task.start_date ? (
                                                                <span className="text-gray-600 italic text-sm">ไม่มีวันสิ้นสุด</span>
                                                            ) : task.due_date ? (
                                                                <span className="text-gray-600 italic text-sm">ไม่มีวันเริ่ม</span>
                                                            ) : (
                                                                <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                                            )}
                                                        </td>

                                                        {/* <td className="px-4 py-4">
                                                            <span className="text-gray-500 text-sm">-</span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="text-gray-500 text-sm">-</span>
                                                        </td> */}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Panel - Floating Card */}
                <RightPanel
                    selectedTask={selectedTask}
                    isPanelOpen={isPanelOpen}
                    rightPanelWidth={rightPanelWidth}
                    activeTab={activeTab}
                    taskVersions={taskVersions}
                    isLoadingVersions={isLoadingVersions}
                    projectUsers={projectUsers}        // ⭐ เพิ่มบรรทัดนี้
                    onClose={() => {
                        setIsPanelOpen(false);
                        setTimeout(() => setSelectedTask(null), 300);
                    }}
                    onResize={handleMouseDown}
                    onTabChange={setActiveTab}
                    onUpdateVersion={updateVersion}
                    onAddVersionSuccess={() => fetchTaskVersions(selectedTask!.id)}   // ✅ เพิ่ม
                    onDeleteVersionSuccess={() => fetchTaskVersions(selectedTask!.id)} // ✅ เพิ่ม
                />
            </main>

            {showCreateMytask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={closeModal}
                    />

                    {/* Modal */}
                    <div
                        className="absolute top-1/2 left-1/2 w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden"
                        style={{
                            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
                        }}
                    >
                        {/* Header */}
                        <div
                            onMouseDown={handleMouseDownnnnn}
                            className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                        >
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">- Global Form</span>
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

                            {/* Entity Type */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Link to:
                                </label>
                                <select
                                    value={createTaskForm.entity_type}
                                    onChange={(e) => handleFormChange('entity_type', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">-- ไม่เชื่อมโยง --</option>
                                    <option value="asset">Asset</option>
                                    <option value="shot">Shot</option>
                                    <option value="sequence">Sequence</option>
                                </select>
                            </div>

                            {/* Entity Selection - แสดงเมื่อเลือก entity_type แล้ว */}
                            {createTaskForm.entity_type && (
                                <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                    <label className="text-sm text-gray-300 text-right">
                                        Select {createTaskForm.entity_type}:
                                    </label>
                                    <select
                                        value={createTaskForm.entity_id}
                                        onChange={(e) => handleFormChange('entity_id', e.target.value)}
                                        className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">-- เลือก {createTaskForm.entity_type} --</option>
                                        {getEntityOptions().length === 0 ? (
                                            <option disabled>ไม่มีข้อมูล</option>
                                        ) : (
                                            getEntityOptions().map((entity: any) => (
                                                <option key={entity.id} value={entity.id}>
                                                    {getEntityLabel(entity)}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            )}



                            {/* ⭐ ลบส่วน Pipeline Step ออกทั้งหมด */}

                            {/* Start Date */}
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Start Date:
                                </label>
                                <input
                                    type="date"
                                    value={createTaskForm.start_date}
                                    onChange={(e) => handleFormChange('start_date', e.target.value)}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500 [color-scheme:dark]"
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
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500 [color-scheme:dark]"
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
                        {/* Footer */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#0a1018] to-[#0d1420] rounded-b flex justify-between items-center gap-3">
                            <button
                                onClick={closeModal}
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



            {/* Task Context Menu */}
            {taskContextMenu && createPortal(
                <div
                    data-task-context-menu="true"
                    className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: taskContextMenu.x, top: taskContextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setTaskDeleteConfirm({
                                taskId: taskContextMenu.task.id,
                                taskName: taskContextMenu.task.task_name,
                            });
                            setTaskContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm rounded-lg transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                    >
                        <Trash2 className="w-5 h-5 text-slate-50" />
                        Delete Task
                    </button>
                </div>,
                document.body
            )}

            {/* Task Delete Confirm Modal */}
            {taskDeleteConfirm && createPortal(
                <div data-task-delete-confirm="true" className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setTaskDeleteConfirm(null)}
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
                                    <h3 className="text-lg font-semibold text-zinc-100">Delete Task</h3>
                                    <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">Are you sure you want to delete this task?</p>
                                <p className="font-semibold text-zinc-100 truncate">"{taskDeleteConfirm.taskName}"</p>
                                <p className="text-xs text-zinc-500 mt-2">
                                    This will also delete all related assignments, reviewers, and versions.
                                </p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setTaskDeleteConfirm(null)}
                                    disabled={isDeletingTask}
                                    className="px-4 py-2 rounded-lg text-zinc-200 transition-colors font-medium disabled:opacity-50 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteTask(taskDeleteConfirm.taskId)}
                                    disabled={isDeletingTask}
                                    className="px-4 py-2 rounded-lg text-white transition-colors font-medium disabled:opacity-50 flex items-center gap-2 bg-gradient-to-r from-red-800 to-red-800 hover:from-red-700 hover:to-red-600"
                                >
                                    {isDeletingTask && (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {isDeletingTask ? 'Deleting...' : 'Delete Task'}
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