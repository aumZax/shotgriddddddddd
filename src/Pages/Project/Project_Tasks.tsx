import { useEffect, useRef, useState } from "react";
import Navbar_Project from "../../components/Navbar_Project";
import axios from "axios";
import ENDPOINTS from "../../config";
import { Calendar, Check, ChevronRight, ClipboardList, Clock, Image, Pencil, Users, X } from 'lucide-react';
import React from "react";
import { useNavigate } from "react-router-dom";


type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' }
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
export default function Project_Tasks() {
    const navigate = useNavigate();
    const [showCreateMytask, setShowCreateMytask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [rightPanelWidth, setRightPanelWidth] = useState(600);
    const [activeTab, setActiveTab] = useState('notes');
    const [isResizing, setIsResizing] = useState(false);
    const [isLoadingSequences, setIsLoadingSequences] = useState(true);


    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editingTaskName, setEditingTaskName] = useState("");
    // เพิ่ม state สำหรับแก้ไข Pipeline Step
    const [editingPipelineTaskId, setEditingPipelineTaskId] = useState<number | null>(null);
    const [selectedPipelineStepId, setSelectedPipelineStepId] = useState<number | null>(null);
    const [availablePipelineSteps, setAvailablePipelineSteps] = useState<PipelineStep[]>([]);



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

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ ++++++++++++++++++++++++++++++++++++++++++
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

        return diffDays;
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

    const handleMouseMoveeeeee = (e: MouseEvent) => {
        if (!isDragging) return;

        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y,
        });
    };

    const handleMouseUpppp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMoveeeeee);
            window.addEventListener("mouseup", handleMouseUpppp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMoveeeeee);
            window.removeEventListener("mouseup", handleMouseUpppp);
        };
    }, [isDragging]);

    const closeModal = () => {
        setShowCreateMytask(false);
        setPosition({ x: 0, y: 0 }); // ⭐ reset ตำแหน่ง
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
    // เพิ่ม state สำหรับ reviewer dropdown (ไว้ใกล้ๆ กับ expandedTaskId)
    const [expandedReviewerTaskId, setExpandedReviewerTaskId] = useState<number | null>(null);

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
                    `${ENDPOINTS.PROJECT_TASKS_GROUPED}`, // เปลี่ยน endpoint
                    { projectId }
                );
                console.log("GROUPED TASKS:", res.data);
                setTaskGroups(res.data);

                // เปิด group แรกโดยอัตโนมัติ
                if (res.data.length > 0) {
                    const firstKey = `${res.data[0].entity_type}_${res.data[0].entity_id}`;
                    setExpandedGroups(new Set([firstKey]));
                }
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


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Pipeline Steps ++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่ม state
    const [pipelineSteps, setPipelineSteps] = useState<any[]>([]);
    const [selectedPipelineStep, setSelectedPipelineStep] = useState<number | null>(null);
    const [entityType, setEntityType] = useState<'asset' | 'shot'>('asset');

    // Fetch pipeline steps
    useEffect(() => {
        const fetchPipelineSteps = async () => {
            try {
                const res = await axios.post(`${ENDPOINTS.PIPELINE_STEPS}`, {
                    entityType: entityType
                });
                setPipelineSteps(res.data);
            } catch (err) {
                console.error("Fetch pipeline steps error:", err);
            }
        };
        fetchPipelineSteps();
    }, [entityType]);


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

    const handleStatusChange = async (
        categoryIndex: number,
        shotIndex: number,
        newStatus: StatusType
    ) => {
        try {
            // ⭐ TODO: เพิ่ม API call เพื่ออัพเดท status ใน backend
            // const taskId = taskGroups[categoryIndex].tasks[shotIndex].id;
            // await axios.put(`${ENDPOINTS.UPDATE_TASK_STATUS}`, {
            //     taskId,
            //     status: newStatus
            // });

            // อัพเดท state
            setTaskGroups(prev => {
                const updated = [...prev];
                updated[categoryIndex].tasks[shotIndex].status = newStatus;
                return updated;
            });

            setShowStatusMenu(null);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Update Task ++++++++++++++++++++++++++++++++++++++++++++++
    // ฟังก์ชันสำหรับอัพเดท task
    const updateTask = async (taskId: number, field: string, value: any) => {
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
        }
    };


    // ฟังก์ชันโหลด Pipeline Steps ตาม entity_type
    const fetchPipelineStepsByType = async (entityType: 'asset' | 'shot') => {
        try {
            const res = await axios.post(`${ENDPOINTS.PIPELINE_STEPS}`, {
                entityType: entityType
            });

            // ⭐ แก้ไขตรงนี้ - ใช้ prevState เพื่อรวม steps แทนการ replace
            setAvailablePipelineSteps(prev => {
                // กรองออก steps ของ type เดิมก่อน แล้วเพิ่ม steps ใหม่เข้าไป
                const otherTypeSteps = prev.filter(step => step.entity_type !== entityType);
                return [...otherTypeSteps, ...res.data];
            });
        } catch (err) {
            console.error("Failed to fetch pipeline steps:", err);
        }
    };
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ Click Outside Dropdown PIPLINE STEP ++++++++++++++++++++++++++++++++++++++++++++++

    // เพิ่ม useRef ที่ด้านบนของ component
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setEditingPipelineTaskId(null);
            }
        };

        if (editingPipelineTaskId) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingPipelineTaskId]);

    // เพิ่ม state สำหรับเช็คตำแหน่ง
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

    // เพิ่ม useEffect สำหรับคำนวณตำแหน่ง
    useEffect(() => {
        if (editingPipelineTaskId && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const dropdownHeight = 320; // max-h-[320px]

            // ถ้าพื้นที่ด้านล่างไม่พอ ให้เปิดขึ้นด้านบน
            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        }
    }, [editingPipelineTaskId]);


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
                    <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                                <tr className="border-b-2 border-blue-500/30">
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                                        #
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                                        <button onClick={() => setShowCreateMytask(true)} className="h-8 px-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105 whitespace-nowrap">
                                            Add Task
                                        </button>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-2">
                                            <span>งาน</span>
                                            <span className="text-blue-400">↑</span>
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
                                    {/* ⭐ เพิ่มคอลัมน์ Description ตรงนี้ */}
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <span>Description</span>
                                        </div>
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div>สถานะ</div>
                                        <div className="mt-2 text-xs text-gray-500 normal-case">
                                            <div className="flex items-center gap-2">
                                                <span>เสร็จ:</span>
                                                <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 font-semibold">
                                                    63.64%
                                                </span>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        ผู้รับมอบหมาย
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        Reviewer
                                    </th>

                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>เริ่มต้น</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 normal-case">
                                            <div className="flex items-center gap-2">
                                                <span>แรกสุด:</span>
                                                <span className="text-gray-300 font-mono">2025-11-17</span>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>สิ้นสุด</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 normal-case">
                                            <div className="flex items-center gap-2">
                                                <span>ล่าสุด:</span>
                                                <span className="text-gray-300 font-mono">2025-12-29</span>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>ระยะเวลา</span>
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500 normal-case">
                                            (วัน)
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div>Worked</div>
                                        <div className="mt-2 text-xs text-gray-500 normal-case">
                                            <div className="flex items-center gap-2">
                                                <span>รวม:</span>
                                                <span className="text-purple-400 font-semibold">29.31</span>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        <div>+/- days</div>
                                        <div className="mt-2 text-xs text-gray-500 normal-case">
                                            <div className="flex items-center gap-2">
                                                <span>รวม:</span>
                                                <span className="text-amber-400 font-semibold">25.94</span>
                                            </div>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {isLoadingSequences ? (
                                    <tr>
                                        <td colSpan={15} className="px-4 py-16">
                                            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                                                <p className="text-gray-400 text-sm">Loading sequences...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : taskGroups.length === 0 ? (
                                    <tr>
                                        <td colSpan={15} className="px-4 py-16">
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
                                    taskGroups.map((group) => {
                                        const groupKey = `${group.entity_type}_${group.entity_id}`;
                                        const isExpanded = expandedGroups.has(groupKey);

                                        return (
                                            <React.Fragment key={groupKey}>
                                                {/* Header Row สำหรับแต่ละ Entity */}
                                                <tr
                                                    className="bg-gray-800 hover:bg-gray-800/60 cursor-pointer transition-all border-b border-gray-700/50"
                                                    onClick={() => toggleGroup(group.entity_type, group.entity_id)}
                                                >
                                                    <td colSpan={15} className="px-4 py-2.5">
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
                                                        className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                                    >
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                                                {index + 1}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            {task.file_url ? (
                                                                <div className="relative w-20 h-16 rounded-lg overflow-hidden ring-1 ring-gray-700 group-hover:ring-blue-500/50 transition-all">
                                                                    <div
                                                                        className="absolute inset-0 bg-cover bg-center blur-xl scale-110 opacity-50"
                                                                        style={{ backgroundImage: `url(${task.file_url})` }}
                                                                    />
                                                                    <img
                                                                        src={task.file_url}
                                                                        alt=""
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


                                                        {/* task name */}
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-green-400 text-lg">✓</span>

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
                                                                            className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-3 transition-colors font-medium cursor-pointer"
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
                                                                            className="opacity-0 group-hover:opacity-100 p-1 transition-all bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl"
                                                                            title="แก้ไขชื่อ"
                                                                        >
                                                                            <Pencil className="w-4 h-4 text-gray-400 hover:text-blue-400" />

                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>


                                                        {/* ⭐ Entity Name */}
                                                        <td className="px-4 py-4">
                                                            {/* ⭐ เช็คว่าเป็น unassigned หรือไม่ */}
                                                            {group.entity_type === 'unassigned' ? (
                                                                <span className="text-gray-600 italic text-sm">ไม่ได้กำหนด</span>
                                                            ) : task.entity_type ? (
                                                                <span
                                                                    onClick={async () => {
                                                                        if (group.entity_type === 'sequence') {
                                                                            try {
                                                                                // Fetch sequence detail
                                                                                const res = await axios.post(ENDPOINTS.PROJECT_SEQUENCES, {
                                                                                    projectId: JSON.parse(localStorage.getItem("projectId") || "null")
                                                                                });

                                                                                // หา sequence ที่ตรงกับ entity_id
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
                                                                        // ⭐ เพิ่มการจัดการสำหรับ asset และ shot ได้ที่นี่
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
                                                        <td className="px-4 py-4 whitespace-nowrap relative">
                                                            {editingPipelineTaskId === task.id ? (
                                                                // โหมดแก้ไข - Card Selector แบบลอย
                                                                <div
                                                                    ref={dropdownRef}  // ⭐ เพิ่มตรงนี้
                                                                    className={`absolute left-0 z-50 min-w-[200px] ${dropdownPosition === 'top'
                                                                        ? 'bottom-full mb-2'  // เปิดขึ้นด้านบน
                                                                        : 'top-0'              // เปิดลงด้านล่าง (default)
                                                                        }`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <div className="bg-gray-800 border border-blue-500/40 rounded-lg p-3 shadow-2xl max-h-[320px] overflow-y-auto">
                                                                        {/* Header */}
                                                                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700/50">
                                                                            <span className="text-xs font-medium text-gray-400">
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
                                                                                className="bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl"
                                                                            >
                                                                                <X className="w-4 h-4 text-gray-100" />

                                                                            </button>
                                                                        </div>

                                                                        {/* Options */}
                                                                        <div className="space-y-1.5">
                                                                            {/* Option: ไม่ระบุ */}
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
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // โหมดแสดงผล
                                                                <div className="flex items-center gap-2">
                                                                    {task.pipeline_step ? (
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();

                                                                                let entityType = task.entity_type || group.entity_type;

                                                                                // ⭐ ถ้าเป็น sequence ให้แจ้งเตือน
                                                                                if (entityType === 'sequence') {
                                                                                    alert('Task ที่ link กับ Sequence ไม่สามารถกำหนด Pipeline Step ได้');
                                                                                    return;
                                                                                }

                                                                                console.log('Loading pipeline steps for:', entityType);

                                                                                // ⭐ ถ้าไม่มี entity_type หรือเป็น unassigned ให้โหลดทั้ง shot และ asset
                                                                                if (!entityType || entityType === 'unassigned') {
                                                                                    await fetchPipelineStepsByType('shot');
                                                                                    await fetchPipelineStepsByType('asset');
                                                                                } else {
                                                                                    await fetchPipelineStepsByType(entityType as 'asset' | 'shot');
                                                                                }

                                                                                setEditingPipelineTaskId(task.id);
                                                                                setSelectedPipelineStepId(task.pipeline_step?.id || null);
                                                                            }}
                                                                            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 transition-all cursor-pointer group/badge"
                                                                            title="คลิกเพื่อแก้ไข Pipeline Step"
                                                                        >
                                                                            {/* สี่เหลี่ยมสี */}
                                                                            <div
                                                                                className="w-3 h-3 rounded"
                                                                                style={{
                                                                                    backgroundColor: task.pipeline_step.color_hex,
                                                                                    boxShadow: `0 0 6px ${task.pipeline_step.color_hex}60`
                                                                                }}
                                                                            />

                                                                            {/* ชื่อ step */}
                                                                            <span className="text-sm font-medium text-gray-200 group-hover/badge:text-blue-300 transition-colors">
                                                                                {task.pipeline_step.step_name}
                                                                            </span>

                                                                            {/* ไอคอนแก้ไข - แสดงตอน hover */}

                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();

                                                                                let entityType = task.entity_type || group.entity_type;

                                                                                // ⭐ ถ้าเป็น sequence ให้แจ้งเตือน
                                                                                if (entityType === 'sequence') {
                                                                                    alert('Task ที่ link กับ Sequence ไม่สามารถกำหนด Pipeline Step ได้');
                                                                                    return;
                                                                                }

                                                                                console.log('Loading pipeline steps for:', entityType);

                                                                                // ⭐ ถ้าไม่มี entity_type หรือเป็น unassigned ให้โหลดทั้ง shot และ asset
                                                                                if (!entityType || entityType === 'unassigned') {
                                                                                    await fetchPipelineStepsByType('shot');
                                                                                    await fetchPipelineStepsByType('asset');
                                                                                } else {
                                                                                    await fetchPipelineStepsByType(entityType as 'asset' | 'shot');
                                                                                }

                                                                                setEditingPipelineTaskId(task.id);
                                                                                setSelectedPipelineStepId(null);
                                                                            }}
                                                                            className="text-gray-500 italic text-sm px-3 py-1.5 bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-lg transition-all cursor-pointer"
                                                                            title="คลิกเพื่อเลือก Pipeline Step"
                                                                        >
                                                                            ไม่ระบุ
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* ⭐ Column #6: Description - แก้ไขเพื่อให้อัพเดทได้ */}
                                                        <td className="px-4 py-4">
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
                                                        </td>


                                                        {/* Column #7: สถานะ */}

                                                        <td className="px-4 py-4">
                                                            <div className="w-24 flex-shrink-0 relative">
                                                                <button
                                                                    onClick={(e) => handleFieldClick('status', taskGroups.findIndex(g => g.tasks.includes(task)), group.tasks.indexOf(task), e)}
                                                                    className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-600 to-gray-800 hover:from-gray-700 hover:to-gray-500 rounded-lg"
                                                                >
                                                                    {statusConfig[task.status as StatusType].icon === '-' ? (
                                                                        <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                                    ) : (
                                                                        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[task.status as StatusType].color} shadow-sm`}></div>
                                                                    )}
                                                                    <span className="text-xs text-gray-300 font-medium truncate">
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
                                                                            <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-50 min-w-[180px] border border-gray-600`}>
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

                                                        <td className="px-4 py-4">
                                                            {task.assignees?.length > 0 ? (
                                                                <div className="relative inline-block">
                                                                    <button
                                                                        onClick={() =>
                                                                            setExpandedTaskId(
                                                                                expandedTaskId === task.id ? null : task.id
                                                                            )
                                                                        }
                                                                        className="group/btn h-9 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 border border-slate-500/30 hover:border-slate-400/50 transition-all shadow-lg hover:shadow-xl"
                                                                    >
                                                                        <Users className="w-4 h-4 text-slate-300" />
                                                                        <span className="text-sm font-semibold text-slate-200">
                                                                            {task.assignees.length}
                                                                        </span>
                                                                        {isCurrentUserAssigned(task.assignees) && (
                                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                คุณ
                                                                            </span>
                                                                        )}
                                                                    </button>

                                                                    {expandedTaskId === task.id && (
                                                                        <>
                                                                            <div
                                                                                className="fixed inset-0 z-10 pointer-events-none"
                                                                                onClick={() => setExpandedTaskId(null)}
                                                                            />
                                                                            <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full mt-2 z-20 w-64 max-h-80 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 rounded-xl shadow-2xl ring-1 ring-white/5">
                                                                                <div className="px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 backdrop-blur-sm border-b border-slate-600/50">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Users className="w-4 h-4 text-slate-400" />
                                                                                            <span className="text-sm font-semibold text-slate-200">
                                                                                                ผู้รับผิดชอบ
                                                                                            </span>
                                                                                            <span className="px-2 py-0.5 rounded-md bg-slate-700 text-xs font-semibold text-slate-300">
                                                                                                {task.assignees.length}
                                                                                            </span>
                                                                                        </div>

                                                                                        <button
                                                                                            onClick={() => setExpandedTaskId(null)}
                                                                                            className="bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl"
                                                                                        >
                                                                                            <X className="w-4 h-4 text-gray-100" />

                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="p-2 max-h-64 overflow-y-auto">
                                                                                    {sortAssignees(
                                                                                        task.assignees,
                                                                                        getCurrentUser().id
                                                                                    ).map((user) => {
                                                                                        const isMe = user.id === getCurrentUser().id;
                                                                                        return (
                                                                                            <div
                                                                                                key={user.id}
                                                                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group/user"
                                                                                            >
                                                                                                <div
                                                                                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ${isMe
                                                                                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/30'
                                                                                                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-blue-500/30'
                                                                                                        } group-hover/user:scale-110 transition-transform`}
                                                                                                >
                                                                                                    {user.username[0].toUpperCase()}
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <p className="text-sm font-medium text-slate-200 truncate">
                                                                                                        {user.username}
                                                                                                    </p>
                                                                                                </div>
                                                                                                {isMe && (
                                                                                                    <span className="px-2 py-1 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                                        คุณ
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 text-sm italic">ไม่มี</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {task.reviewers?.length > 0 ? (
                                                                <div className="relative inline-block">
                                                                    <button
                                                                        onClick={() =>
                                                                            setExpandedReviewerTaskId(
                                                                                expandedReviewerTaskId === task.id ? null : task.id
                                                                            )
                                                                        }
                                                                        className="group/btn h-9 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 border border-purple-500/30 hover:border-purple-400/50 transition-all shadow-lg hover:shadow-xl"
                                                                    >
                                                                        <Users className="w-4 h-4 text-purple-300" />
                                                                        <span className="text-sm font-semibold text-purple-200">
                                                                            {task.reviewers.length}
                                                                        </span>
                                                                        {isCurrentUserReviewer(task.reviewers) && (
                                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                คุณ
                                                                            </span>
                                                                        )}
                                                                    </button>

                                                                    {expandedReviewerTaskId === task.id && (
                                                                        <>
                                                                            <div
                                                                                className="fixed inset-0 z-10 pointer-events-none"
                                                                                onClick={() => setExpandedReviewerTaskId(null)}
                                                                            />
                                                                            <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full mt-2 z-20 w-64 max-h-80 overflow-hidden bg-gradient-to-br from-purple-800 via-purple-800 to-purple-900 border border-purple-600/50 rounded-xl shadow-2xl ring-1 ring-white/5">
                                                                                <div className="px-4 py-3 bg-gradient-to-r from-purple-700/50 to-purple-800/50 backdrop-blur-sm border-b border-purple-600/50">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Users className="w-4 h-4 text-purple-400" />
                                                                                            <span className="text-sm font-semibold text-purple-200">
                                                                                                Reviewer
                                                                                            </span>
                                                                                            <span className="px-2 py-0.5 rounded-md bg-purple-700 text-xs font-semibold text-purple-300">
                                                                                                {task.reviewers.length}
                                                                                            </span>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => setExpandedReviewerTaskId(null)}
                                                                                            className="text-purple-400 hover:text-purple-200 transition-colors p-1 rounded-md hover:bg-purple-700/50"
                                                                                        >
                                                                                            <svg
                                                                                                className="w-4 h-4"
                                                                                                fill="none"
                                                                                                stroke="currentColor"
                                                                                                viewBox="0 0 24 24"
                                                                                            >
                                                                                                <path
                                                                                                    strokeLinecap="round"
                                                                                                    strokeLinejoin="round"
                                                                                                    strokeWidth={2}
                                                                                                    d="M6 18L18 6M6 6l12 12"
                                                                                                />
                                                                                            </svg>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="p-2 max-h-64 overflow-y-auto">
                                                                                    {sortAssignees(
                                                                                        task.reviewers,
                                                                                        getCurrentUser().id
                                                                                    ).map((reviewer) => {
                                                                                        const isMe = reviewer.id === getCurrentUser().id;
                                                                                        return (
                                                                                            <div
                                                                                                key={reviewer.id}
                                                                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-700/50 transition-colors group/user"
                                                                                            >
                                                                                                <div
                                                                                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ${isMe
                                                                                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/30'
                                                                                                        : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white ring-purple-500/30'
                                                                                                        } group-hover/user:scale-110 transition-transform`}
                                                                                                >
                                                                                                    {reviewer.username[0].toUpperCase()}
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <p className="text-sm font-medium text-purple-200 truncate">
                                                                                                        {reviewer.username}
                                                                                                    </p>
                                                                                                </div>
                                                                                                {isMe && (
                                                                                                    <span className="px-2 py-1 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">
                                                                                                        คุณ
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 text-sm italic">ไม่มี</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {task.start_date ? (
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                                    <span className="text-gray-300 font-mono">
                                                                        {formatDateThai(task.start_date)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {task.due_date ? (
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                                    <span className="text-gray-300 font-mono">
                                                                        {formatDateThai(task.due_date)}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4">
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

                                                        <td className="px-4 py-4">
                                                            <span className="text-gray-500 text-sm">-</span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="text-gray-500 text-sm">-</span>
                                                        </td>
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
                                        onClick={() => setActiveTab('notes')}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${activeTab === 'notes'
                                            ? 'text-white border-b-2 border-blue-500'
                                            : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        <span>📝</span>
                                        <span>NOTES</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('versions')}
                                        className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${activeTab === 'versions'
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
                                {activeTab === 'notes' && (
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

                                {activeTab === 'versions' && (
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
                        className="absolute top-1/2 left-1/2 w-full max-w-2xl  bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden"
                        style={{
                            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
                        }}
                    >
                        {/* Header */}
                        <div onMouseDown={handleMouseDownnnnn} className="px-6 py-3 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 t flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
                            <h2 className="text-lg text-gray-200 font-normal">
                                Create a new Task <span className="text-gray-400 text-sm font-normal">- Global Form</span>
                            </h2>

                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Task Name:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter task name"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Link:
                                </label>
                                <input
                                    type="text"
                                    placeholder="https://example.com"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Pipeline Step:
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., In Progress, Review, Done"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Start Date:
                                </label>
                                <input
                                    type="date"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded
    text-gray-200 text-sm focus:outline-none focus:border-blue-500
    placeholder:text-gray-500 [color-scheme:dark]"
                                />

                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Due Date:
                                </label>
                                <input
                                    type="date"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded
    text-gray-200 text-sm focus:outline-none focus:border-blue-500
    placeholder:text-gray-500 [color-scheme:dark]"
                                />

                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Assigned To:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter assignee name"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Reviewer:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter reviewer name"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>
                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Entity Type:
                                </label>
                                <select
                                    value={entityType}
                                    onChange={(e) => setEntityType(e.target.value as 'asset' | 'shot')}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm"
                                >
                                    <option value="asset">Asset</option>
                                    <option value="shot">Shot</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Pipeline Step:
                                </label>
                                <select
                                    value={selectedPipelineStep || ''}
                                    onChange={(e) => setSelectedPipelineStep(Number(e.target.value))}
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm"
                                >
                                    <option value="">Select step...</option>
                                    {pipelineSteps.map(step => (
                                        <option key={step.id} value={step.id}>
                                            {step.step_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Project:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter project name"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            {/* <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <div></div>
                                <button className="text-sm text-gray-400 hover:text-gray-200 text-left flex items-center gap-1">
                                    More fields <span>▾</span>
                                </button>
                            </div> */}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#0a1018] to-[#0d1420]  rounded-b flex justify-between items-center gap-3">
                            <button
                                onClick={closeModal}

                                className="px-4 h-9 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-700 hover:to-gray-700 text-white text-sm rounded flex items-center justify-center"
                            >
                                Cancel
                            </button>

                            <button
                                className="px-4 h-9  bg-gradient-to-r from-[#1e88e5] to-[#1565c0] hover:from-[#1976d2] hover:to-[#0d47a1] text-sm rounded-lg text-white shadow-lg shadow-blue-500/30 transition-all font-medium flex items-center justify-center"
                            >
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}