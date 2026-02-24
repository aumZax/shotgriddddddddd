/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ClipboardList, Clock, Pencil, Users, X, UserPlus, Trash2 } from 'lucide-react';
import axios from 'axios';
import ENDPOINTS from '../config';
import { createPortal } from 'react-dom';


type StatusType = keyof typeof statusConfig;

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

interface TasksTabProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const TaskTab = ({ tasks: initialTasks, onTaskClick }: TasksTabProps) => {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);

    // Task Name Editing
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editingTaskName, setEditingTaskName] = useState("");

    // Pipeline Step Editing
    const [editingPipelineTaskId, setEditingPipelineTaskId] = useState<number | null>(null);
    const [selectedPipelineStepId, setSelectedPipelineStepId] = useState<number | null>(null);
    const [availablePipelineSteps, setAvailablePipelineSteps] = useState<PipelineStep[]>([]);

    // Status Menu
    const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');

    // ⭐ เพิ่ม states สำหรับ Assignee/Reviewer management
    const [projectUsers, setProjectUsers] = useState<{ id: number, username: string }[]>([]);
    const [editingAssigneeTaskId, setEditingAssigneeTaskId] = useState<number | null>(null);
    const [editingReviewerTaskId, setEditingReviewerTaskId] = useState<number | null>(null);
    const [searchAssignee, setSearchAssignee] = useState("");
    const [searchReviewer, setSearchReviewer] = useState("");

    // Refs
    // ⭐ เพิ่ม ref และ state สำหรับ Pipeline dropdown
    const pipelineDropdownRef = useRef<HTMLDivElement>(null); // ⭐ เพิ่มบรรทัดนี้
    const assigneeDropdownRef = useRef<HTMLDivElement>(null);
    const reviewerDropdownRef = useRef<HTMLDivElement>(null);

    const [pipelineDropdownPosition, setPipelineDropdownPosition] = useState<'bottom' | 'top'>('bottom'); // ⭐ เพิ่มบรรทัดนี้
    const [assigneeDropdownPosition, setAssigneeDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const [reviewerDropdownPosition, setReviewerDropdownPosition] = useState<'bottom' | 'top'>('bottom');

    // Date Editing
    const [editingStartDateTaskId, setEditingStartDateTaskId] = useState<number | null>(null);
    const [editingDueDateTaskId, setEditingDueDateTaskId] = useState<number | null>(null);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ DELETE_TASK


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

    const handleTaskContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        e.stopPropagation();
        setTaskContextMenu({ visible: true, x: e.clientX, y: e.clientY, task });
    };

    const handleDeleteTask = async (taskId: number) => {
        setIsDeletingTask(true);
        try {
            await axios.delete(ENDPOINTS.DELETE_TASK, { data: { taskId } });
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setTaskDeleteConfirm(null);
            setTaskContextMenu(null);
        } catch (err) {
            console.error('Delete task failed:', err);
            alert('ไม่สามารถลบ Task ได้');
        } finally {
            setIsDeletingTask(false);
        }
    };
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    // Format date for input (YYYY-MM-DD)
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

    // Handle date update
    const handleDateUpdate = async (taskId: number, field: 'start_date' | 'due_date', value: string) => {
        // ตรวจสอบว่า value เป็นวันที่ที่ถูกต้อง
        if (!value) {
            setEditingStartDateTaskId(null);
            setEditingDueDateTaskId(null);
            return;
        }

        const success = await updateTask(taskId, field, value);
        if (success) {
            setTasks(prev => prev.map(task =>
                task.id === taskId ? { ...task, [field]: value } : task
            ));
        }
        setEditingStartDateTaskId(null);
        setEditingDueDateTaskId(null);
    };


    // Update tasks when props change
    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // ⭐ Fetch project users
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

    // ⭐ Dropdown position calculation for Assignee
    useEffect(() => {
        if (editingAssigneeTaskId && assigneeDropdownRef.current) {
            const rect = assigneeDropdownRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const dropdownHeight = 384;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                setAssigneeDropdownPosition('top');
            } else {
                setAssigneeDropdownPosition('bottom');
            }
        }
    }, [editingAssigneeTaskId]);

    // ⭐ Dropdown position calculation for Reviewer
    useEffect(() => {
        if (editingReviewerTaskId && reviewerDropdownRef.current) {
            const rect = reviewerDropdownRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const dropdownHeight = 384;
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                setReviewerDropdownPosition('top');
            } else {
                setReviewerDropdownPosition('bottom');
            }
        }
    }, [editingReviewerTaskId]);

    // Helper functions
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

    const calculateDurationDays = (startDate: string, dueDate: string) => {
        if (!startDate || !dueDate) return 0;
        const start = new Date(startDate);
        const due = new Date(dueDate);
        const diffTime = due.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays + 1;
    };

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

    const isCurrentUserReviewer = (reviewers: TaskReviewer[] = []) => {
        const currentUserId = getCurrentUser().id;
        return reviewers?.some(r => r.id === currentUserId);
    };

    // ⭐ Filter available assignees
    const getAvailableAssignees = (task: Task) => {
        const assignedIds = task.assignees.map(a => a.id);
        return projectUsers.filter(u =>
            !assignedIds.includes(u.id) &&
            u.username.toLowerCase().includes(searchAssignee.toLowerCase())
        );
    };

    // ⭐ Filter available reviewers
    const getAvailableReviewers = (task: Task) => {
        const reviewerIds = task.reviewers?.map(r => r.id) || [];
        return projectUsers.filter(u =>
            !reviewerIds.includes(u.id) &&
            u.username.toLowerCase().includes(searchReviewer.toLowerCase())
        );
    };

    // ⭐ Add Assignee
    const addAssignee = async (taskId: number, userId: number) => {
        try {
            const res = await axios.post(`${ENDPOINTS.ADD_TASK_ASSIGNEE}`, {
                taskId,
                userId
            });

            const newAssignee = res.data.user;

            // อัพเดท tasks state
            setTasks(prev => prev.map(task => {
                if (task.id === taskId) {
                    // ป้องกันการเพิ่มซ้ำ
                    const exists = task.assignees.some(a => a.id === newAssignee.id);
                    if (exists) return task;

                    return {
                        ...task,
                        assignees: [...task.assignees, newAssignee]
                    };
                }
                return task;
            }));

            setSearchAssignee("");
        } catch (err: any) {
            console.error("Add assignee error:", err);
            alert(err.response?.data?.message || "ไม่สามารถเพิ่มผู้รับผิดชอบได้");
        }
    };

    // ⭐ Remove Assignee
    const removeAssignee = async (taskId: number, userId: number) => {
        try {
            await axios.post(`${ENDPOINTS.REMOVE_TASK_ASSIGNEE}`, {
                taskId,
                userId
            });

            // อัพเดท tasks state
            setTasks(prev => prev.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        assignees: task.assignees.filter(a => a.id !== userId)
                    };
                }
                return task;
            }));
        } catch (err) {
            console.error("Remove assignee error:", err);
            alert("ไม่สามารถลบผู้รับผิดชอบได้");
        }
    };

    // ⭐ Add Reviewer
    const addReviewer = async (taskId: number, userId: number) => {
        try {
            const res = await axios.post(`${ENDPOINTS.ADD_TASK_REVIEWER}`, {
                taskId,
                userId
            });

            const newReviewer = res.data.user;

            setTasks(prev => prev.map(task => {
                if (task.id === taskId) {
                    // ป้องกันการเพิ่มซ้ำ
                    const exists = task.reviewers?.some(r => r.id === newReviewer.id);
                    if (exists) return task;

                    return {
                        ...task,
                        reviewers: [...(task.reviewers || []), newReviewer]
                    };
                }
                return task;
            }));

            setSearchReviewer("");
        } catch (err: any) {
            console.error("Add reviewer error:", err);
            alert(err.response?.data?.message || "ไม่สามารถเพิ่ม Reviewer ได้");
        }
    };

    // ⭐ Remove Reviewer
    const removeReviewer = async (taskId: number, userId: number) => {
        try {
            await axios.post(`${ENDPOINTS.REMOVE_TASK_REVIEWER}`, {
                taskId,
                userId
            });

            setTasks(prev => prev.map(task => {
                if (task.id === taskId) {
                    return {
                        ...task,
                        reviewers: task.reviewers?.filter(r => r.id !== userId) || []
                    };
                }
                return task;
            }));
        } catch (err) {
            console.error("Remove reviewer error:", err);
            alert("ไม่สามารถลบ Reviewer ได้");
        }
    };

    // Update Task API
    const updateTask = async (taskId: number, field: string, value: any) => {
        try {
            await axios.post(`${ENDPOINTS.UPDATE_TASK}`, {
                taskId,
                field,
                value
            });

            setTasks(prev =>
                prev.map(task =>
                    task.id === taskId ? { ...task, [field]: value } : task
                )
            );

            return true;
        } catch (err) {
            console.error('Failed to update task:', err);
            return false;
        }
    };

    // Fetch Pipeline Steps
    const fetchPipelineStepsByType = async (entityType: 'asset' | 'shot') => {
        try {
            const res = await axios.post(`${ENDPOINTS.PIPELINE_STEPS}`, {
                entityType: entityType
            });

            setAvailablePipelineSteps(prev => {
                const otherTypeSteps = prev.filter(step => step.entity_type !== entityType);
                return [...otherTypeSteps, ...res.data];
            });
        } catch (err) {
            console.error("Failed to fetch pipeline steps:", err);
        }
    };

    // Handle Status Change
    const handleStatusChange = async (taskIndex: number, newStatus: StatusType) => {
        try {
            const task = tasks[taskIndex];
            const success = await updateTask(task.id, 'status', newStatus);

            if (success) {
                setTasks(prev => {
                    const updated = [...prev];
                    updated[taskIndex].status = newStatus;
                    return updated;
                });
            }

            setShowStatusMenu(null);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };


    // Calculate Dropdown Position +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // ⭐ เปลี่ยนจากโค้ดเดิมเป็น:
    useEffect(() => {
        if (editingPipelineTaskId && pipelineDropdownRef.current) {
            const rect = pipelineDropdownRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const dropdownHeight = 384; // ใช้ค่าเดียวกับ assignee/reviewer
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
                setPipelineDropdownPosition('top');
            } else {
                setPipelineDropdownPosition('bottom');
            }
        }
    }, [editingPipelineTaskId]);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    useEffect(() => {
        if (!taskContextMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-task-context-menu="true"]') ||
                target.closest('[data-task-delete-confirm="true"]')) return;
            setTaskContextMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [taskContextMenu]);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    return (
        <div className="space-y-4 overflow-visible">
            <div className="overflow-x-visible rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse relative">
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                                #
                            </th>
                           
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <span>Task</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                        {tasks.length}
                                    </span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                Pipeline Step
                            </th>
                            {/* <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Description
                            </th> */}
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                               Status
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Assigned
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Reviewer
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>เริ่มต้น</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>สิ้นสุด</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>ระยะเวลา</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {tasks.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-4 py-16">
                                    <div className="flex flex-col items-center justify-center ">
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
                            tasks.map((task, index) => (
                                <tr
                                    key={task.id}
                                    onContextMenu={(e) => handleTaskContextMenu(e, task)}
                                    onClick={() => onTaskClick(task)}
                                    className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                >
                                    {/* Column #1: Index */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                            {index + 1}
                                        </div>
                                    </td>

                                 

                                    {/* Column #3: Task Name */}
                                    <td className="px-4 py-4 w-48"> {/* ⭐ เพิ่ม w-48 หรือ w-40 */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400 text-lg flex-shrink-0">✓</span>

                                            {editingTaskId === task.id ? (
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
                                                <>
                                                    <span
                                                        onClick={() => onTaskClick(task)}
                                                        className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-3 transition-colors font-medium cursor-pointer truncate max-w-[150px]"
                                                        title={task.task_name}
                                                    >
                                                        {task.task_name}
                                                    </span>

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

                                    {/* Column #4: Pipeline Step */}
                                    <td className="px-4 py-4">
                                        <div className="relative inline-block" ref={pipelineDropdownRef}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (editingPipelineTaskId === task.id) {
                                                        setEditingPipelineTaskId(null);
                                                    } else {
                                                        const entityType = task.entity_type as 'asset' | 'shot';
                                                        fetchPipelineStepsByType(entityType);
                                                        setEditingPipelineTaskId(task.id);
                                                        setSelectedPipelineStepId(task.pipeline_step?.id || null);
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 transition-all cursor-pointer"
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
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingPipelineTaskId(null);
                                                                    }}
                                                                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                                                                >
                                                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-200" />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="max-h-72 overflow-y-auto">
                                                            <div className="p-2">
                                                                {/* ไม่ระบุ Option */}
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
                                                                            setSelectedPipelineStepId(step.id);
                                                                            const success = await updateTask(task.id, 'pipeline_step_id', step.id);
                                                                            if (success) {
                                                                                task.pipeline_step = step;
                                                                            }
                                                                            setEditingPipelineTaskId(null);
                                                                        }}
                                                                        className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl ${selectedPipelineStepId === step.id
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
                                                                        <div
                                                                            className="w-3 h-3 rounded flex-shrink-0"
                                                                            style={{
                                                                                backgroundColor: step.color_hex,
                                                                                boxShadow: `0 0 8px ${step.color_hex}60`
                                                                            }}
                                                                        />
                                                                        <span className="text-sm font-medium text-gray-200 text-left">
                                                                            {step.step_name}
                                                                        </span>
                                                                        {selectedPipelineStepId === step.id && (
                                                                            <Check className="w-4 h-4 text-blue-400 ml-auto flex-shrink-0" />
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>

                                    {/* Column #5: Description */}
                                    {/* <td className="px-4 py-4">
                                        <textarea
                                            value={task.description || ""}
                                            onChange={(e) => {
                                                setTasks(prev =>
                                                    prev.map(t =>
                                                        t.id === task.id ? { ...t, description: e.target.value } : t
                                                    )
                                                );
                                            }}
                                            onBlur={async (e) => {
                                                const newDescription = e.target.value.trim();
                                                await updateTask(task.id, 'description', newDescription);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    e.currentTarget.blur();
                                                } else if (e.key === 'Escape') {
                                                    e.preventDefault();
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                            rows={2}
                                            placeholder="เพิ่มรายละเอียด..."
                                            className="w-full max-w-xs text-sm text-gray-300 bg-gray-800/60 border border-gray-700 rounded px-2 py-1 outline-none resize-none focus:border-blue-500 focus:bg-gray-800 transition-colors"
                                        />
                                    </td> */}

                                    {/* Column #6: Status */}
                                    <td className="px-4 py-4">
                                        <div className="w-20 flex-shrink-0 relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    const spaceAbove = rect.top;
                                                    setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
                                                    setShowStatusMenu(showStatusMenu === index ? null : index);
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-500 rounded-lg"
                                            >
                                                {statusConfig[task.status as StatusType].icon === '-' ? (
                                                    <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                ) : (
                                                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[task.status as StatusType].color} shadow-sm`}></div>
                                                )}
                                                <span className="text-xs text-gray-300 font-medium">
                                                    {statusConfig[task.status as StatusType].label}
                                                </span>
                                            </button>

                                            {showStatusMenu === index && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowStatusMenu(null);
                                                        }}
                                                    />
                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-[100] border border-gray-600  min-w-[200px] 
                                                                                max-h-[350px] overflow-y-auto whitespace-nowrap
                                                                                scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500`}>
                                                        {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStatusChange(index, key);
                                                                }}
                                                                className="flex items-center gap-5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500"
                                                            >
                                                                {config.icon === '-' ? (
                                                                    <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                ) : (
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                                                )}
                                                                <div className="text-xs text-gray-200 flex items-center gap-5">
                                                                    <span className="inline-block w-8">
                                                                        {config.label}
                                                                    </span>
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

                                    {/* ⭐ Column #7: Assignees */}
                                    <td className="px-4 py-4">
                                        <div className="relative inline-block" ref={assigneeDropdownRef}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (editingAssigneeTaskId === task.id) {
                                                        setEditingAssigneeTaskId(null);
                                                    } else {
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

                                    {/* ⭐ Column #8: Reviewers */}
                                    <td className="px-4 py-4">
                                        <div className="relative inline-block" ref={reviewerDropdownRef}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (editingReviewerTaskId === task.id) {
                                                        setEditingReviewerTaskId(null);
                                                    } else {
                                                        setEditingReviewerTaskId(task.id);
                                                        setSearchReviewer("");
                                                    }
                                                }}
                                                className="whitespace-nowrap group/btn min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-600 hover:to-slate-500 border border-slate-500/30 hover:border-slate-400/50 transition-all"
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
                                                                    className="p-1 hover:bg-slate-700/50 rounded-2xl transition-colors bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-700 hover:to-slate-700 rounded-2xl"
                                                                >
                                                                    <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                                                                </button>
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder="ค้นหาเพื่อเพิ่ม..."
                                                                value={searchReviewer}
                                                                onChange={(e) => setSearchReviewer(e.target.value)}
                                                                className="w-full px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-500/50"
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
                                                                                    className="opacity-0 group-hover/user:opacity-100 p-1 rounded-2xl transition-all bg-gradient-to-r from-slate-800 to-slate-800 hover:from-slate-700 hover:to-slate-700"
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

                                    {/* Column #9: Start Date - EDITABLE */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {editingStartDateTaskId === task.id ? (
                                            <input
                                                type="date"
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                value={formatDateForInput(task.start_date)}
                                                onChange={(e) => {
                                                    const newDate = e.target.value;
                                                    if (newDate && newDate !== formatDateForInput(task.start_date)) {
                                                        handleDateUpdate(task.id, 'start_date', newDate);
                                                    }
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
                                        ) : (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingStartDateTaskId(task.id);
                                                }}
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

                                    {/* Column #10: Due Date - EDITABLE */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {editingDueDateTaskId === task.id ? (
                                            <input
                                                type="date"
                                                autoFocus
                                                value={formatDateForInput(task.due_date)}
                                                onChange={(e) => {

                                                    const newDate = e.target.value;
                                                    if (newDate && newDate !== formatDateForInput(task.due_date)) {
                                                        handleDateUpdate(task.id, 'due_date', newDate);
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
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
                                        ) : (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingDueDateTaskId(task.id);
                                                }}
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

                                    {/* Column #11: Duration */}
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>




            {taskContextMenu && createPortal(
                <div
                    data-task-context-menu="true"
                    className="fixed z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{ left: taskContextMenu.x, top: taskContextMenu.y }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => {
                            setTaskDeleteConfirm({ taskId: taskContextMenu.task.id, taskName: taskContextMenu.task.task_name });
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

            {taskDeleteConfirm && createPortal(
                <div data-task-delete-confirm="true" className="fixed inset-0 z-[9999] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTaskDeleteConfirm(null)} />
                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                                <p className="text-xs text-zinc-500 mt-2">This will also delete all related assignments, reviewers, and versions.</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setTaskDeleteConfirm(null)} disabled={isDeletingTask}
                                    className="px-4 py-2 rounded-lg text-zinc-200 font-medium disabled:opacity-50 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600">
                                    Cancel
                                </button>
                                <button onClick={() => handleDeleteTask(taskDeleteConfirm.taskId)} disabled={isDeletingTask}
                                    className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-2 bg-gradient-to-r from-red-800 to-red-800 hover:from-red-700 hover:to-red-600">
                                    {isDeletingTask && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
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
};

export default TaskTab;