import { useEffect, useRef, useState } from 'react';
import { Calendar, Check, ClipboardList, Clock, Image, Pencil, Users, X } from 'lucide-react';
import axios from 'axios';
import ENDPOINTS from '../config';

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

interface TasksTabProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const TaskTab = ({ tasks: initialTasks, onTaskClick }: TasksTabProps) => {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [expandedReviewerTaskId, setExpandedReviewerTaskId] = useState<number | null>(null);

    // Task Name Editing
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
    const [editingTaskName, setEditingTaskName] = useState("");

    // Pipeline Step Editing
    const [editingPipelineTaskId, setEditingPipelineTaskId] = useState<number | null>(null);
    const [selectedPipelineStepId, setSelectedPipelineStepId] = useState<number | null>(null);
    const [availablePipelineSteps, setAvailablePipelineSteps] = useState<PipelineStep[]>([]);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

    // Status Menu
    const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'top' | 'bottom'>('bottom');

    // Refs
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Update tasks when props change
    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

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
        return diffDays;
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

    // Click Outside Dropdown
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

    // Calculate Dropdown Position
    useEffect(() => {
        if (editingPipelineTaskId && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const spaceBelow = viewportHeight - rect.bottom;
            const dropdownHeight = 320;

            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        }
    }, [editingPipelineTaskId]);

    return (
        <div className="space-y-4 overflow-visible">
            <div className="overflow-x-visible rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse relative">
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                                #
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-20">
                                รูป
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <span>งาน</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                        {tasks.length}
                                    </span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Pipeline Step
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                สถานะ
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
                                <td colSpan={11} className="px-4 py-16">
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
                            tasks.map((task, index) => (
                                <tr
                                    key={task.id}
                                    className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                >
                                    {/* Column #1: Index */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                            {index + 1}
                                        </div>
                                    </td>

                                    {/* Column #2: Thumbnail */}
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

                                    {/* Column #3: Task Name */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-400 text-lg">✓</span>

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
                                                        className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-3 transition-colors font-medium cursor-pointer"
                                                    >
                                                        {task.task_name}
                                                    </span>

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

                                    {/* Column #4: Pipeline Step */}
                                    <td className="px-4 py-4 whitespace-nowrap relative">
                                        {editingPipelineTaskId === task.id ? (
                                            <div
                                                ref={dropdownRef}
                                                className={`absolute left-0 z-[100] min-w-[200px] ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-0'}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="bg-gray-800 border border-blue-500/40 rounded-lg p-3 shadow-2xl max-h-[320px] overflow-y-auto">
                                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700/50">
                                                        <span className="text-xs font-medium text-gray-400">
                                                            เลือก Pipeline Step
                                                        </span>
                                                        <button
                                                            onClick={() => setEditingPipelineTaskId(null)}
                                                            className="bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl"
                                                        >
                                                            <X className="w-4 h-4 text-gray-100" />
                                                        </button>
                                                    </div>

                                                    <div className="space-y-1.5">
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
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {task.pipeline_step ? (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const entityType = task.entity_type as 'asset' | 'shot';
                                                            await fetchPipelineStepsByType(entityType);
                                                            setEditingPipelineTaskId(task.id);
                                                            setSelectedPipelineStepId(task.pipeline_step?.id || null);
                                                        }}
                                                        className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 transition-all cursor-pointer group/badge"
                                                        title="คลิกเพื่อแก้ไข Pipeline Step"
                                                    >
                                                        <div
                                                            className="w-3 h-3 rounded"
                                                            style={{
                                                                backgroundColor: task.pipeline_step.color_hex,
                                                                boxShadow: `0 0 6px ${task.pipeline_step.color_hex}60`
                                                            }}
                                                        />
                                                        <span className="text-sm font-medium text-gray-200 group-hover/badge:text-blue-300 transition-colors">
                                                            {task.pipeline_step.step_name}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const entityType = task.entity_type as 'asset' | 'shot';
                                                            await fetchPipelineStepsByType(entityType);
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

                                    {/* Column #5: Description */}
                                    <td className="px-4 py-4">
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
                                    </td>

                                    {/* Column #6: Status */}
                                    <td className="px-4 py-4">
                                        <div className="w-24 flex-shrink-0 relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const spaceBelow = window.innerHeight - rect.bottom;
                                                    const spaceAbove = rect.top;
                                                    setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
                                                    setShowStatusMenu(showStatusMenu === index ? null : index);
                                                }}
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

                                            {showStatusMenu === index && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setShowStatusMenu(null)}
                                                    />
                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-[100] min-w-[180px] border border-gray-600`}>
                                                        {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleStatusChange(index, key);
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

                                    {/* Column #7: Assignees */}
                                    <td className="px-4 py-4">
                                        {task.assignees?.length > 0 ? (
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
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
                                                        <div className="fixed inset-0 z-10 pointer-events-none" onClick={() => setExpandedTaskId(null)} />
                                                        <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full mt-2 z-[100]w-64 max-h-80 overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 rounded-xl shadow-2xl ring-1 ring-white/5">
                                                            <div className="px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 backdrop-blur-sm border-b border-slate-600/50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Users className="w-4 h-4 text-slate-400" />
                                                                        <span className="text-sm font-semibold text-slate-200">ผู้รับผิดชอบ</span>
                                                                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-xs font-semibold text-slate-300">
                                                                            {task.assignees.length}
                                                                        </span>
                                                                    </div>
                                                                    <button onClick={() => setExpandedTaskId(null)} className="bg-gradient-to-r from-gray-800 to-gray-800 border hover:from-gray-700 hover:to-gray-700 rounded-xl">
                                                                        <X className="w-4 h-4 text-gray-100" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="p-2 max-h-64 overflow-y-auto">
                                                                {sortAssignees(task.assignees, getCurrentUser().id).map((user) => {
                                                                    const isMe = user.id === getCurrentUser().id;
                                                                    return (
                                                                        <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group/user">
                                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ${isMe ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/30' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white ring-blue-500/30'} group-hover/user:scale-110 transition-transform`}>
                                                                                {user.username[0].toUpperCase()}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-slate-200 truncate">{user.username}</p>
                                                                            </div>
                                                                            {isMe && (
                                                                                <span className="px-2 py-1 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">คุณ</span>
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

                                    {/* Column #8: Reviewers */}
                                    <td className="px-4 py-4">
                                        {task.reviewers && task.reviewers.length > 0 ? (
                                            <div className="relative inline-block">
                                                <button
                                                    onClick={() => setExpandedReviewerTaskId(expandedReviewerTaskId === task.id ? null : task.id)}
                                                    className="group/btn h-9 flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 border border-purple-500/30 hover:border-purple-400/50 transition-all shadow-lg hover:shadow-xl"
                                                >
                                                    <Users className="w-4 h-4 text-purple-300" />
                                                    <span className="text-sm font-semibold text-purple-200">{task.reviewers.length}</span>
                                                    {isCurrentUserReviewer(task.reviewers) && (
                                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">คุณ</span>
                                                    )}
                                                </button>

                                                {expandedReviewerTaskId === task.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10 pointer-events-none" onClick={() => setExpandedReviewerTaskId(null)} />
                                                        <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full mt-2 z-[100]w-64 max-h-80 overflow-hidden bg-gradient-to-br from-purple-800 via-purple-800 to-purple-900 border border-purple-600/50 rounded-xl shadow-2xl ring-1 ring-white/5">
                                                            <div className="px-4 py-3 bg-gradient-to-r from-purple-700/50 to-purple-800/50 backdrop-blur-sm border-b border-purple-600/50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Users className="w-4 h-4 text-purple-400" />
                                                                        <span className="text-sm font-semibold text-purple-200">Reviewer</span>
                                                                        <span className="px-2 py-0.5 rounded-md bg-purple-700 text-xs font-semibold text-purple-300">{task.reviewers.length}</span>
                                                                    </div>
                                                                    <button onClick={() => setExpandedReviewerTaskId(null)} className="text-purple-400 hover:text-purple-200 transition-colors p-1 rounded-md hover:bg-purple-700/50">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="p-2 max-h-64 overflow-y-auto">
                                                                {sortAssignees(task.reviewers, getCurrentUser().id).map((reviewer) => {
                                                                    const isMe = reviewer.id === getCurrentUser().id;
                                                                    return (
                                                                        <div key={reviewer.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-purple-700/50 transition-colors group/user">
                                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ${isMe ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/30' : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white ring-purple-500/30'} group-hover/user:scale-110 transition-transform`}>
                                                                                {reviewer.username[0].toUpperCase()}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-medium text-purple-200 truncate">{reviewer.username}</p>
                                                                            </div>
                                                                            {isMe && (
                                                                                <span className="px-2 py-1 rounded-md bg-emerald-500/30 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/50">คุณ</span>
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

                                    {/* Column #9: Start Date */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {task.start_date ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-gray-500" />
                                                <span className="text-gray-300 font-mono">{formatDateThai(task.start_date)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                        )}
                                    </td>

                                    {/* Column #10: Due Date */}
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {task.due_date ? (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-gray-500" />
                                                <span className="text-gray-300 font-mono">{formatDateThai(task.due_date)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
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
        </div>
    );
};

export default TaskTab;