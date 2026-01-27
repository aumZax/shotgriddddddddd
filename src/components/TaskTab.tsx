import { useState } from 'react';
import { Calendar, ClipboardList, Clock, Image, Users } from 'lucide-react';

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
};

type TaskAssignee = {
    id: number;
    username: string;
};

interface TasksTabProps {
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const TaskTab = ({ tasks, onTaskClick }: TasksTabProps) => {
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

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

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse">
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
                                ประเภท
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
                                    <td className="px-4 py-4">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer group/task"
                                            onClick={() => onTaskClick(task)}
                                        >
                                            <span className="text-green-400 text-lg group-hover/task:scale-110 transition-transform">✓</span>
                                            <span className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300 underline-offset-2 transition-colors font-medium">
                                                {task.task_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {task.entity_type ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-800 text-gray-300 text-sm font-medium ring-1 ring-gray-700">
                                                {task.entity_type}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span
                                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${task.status === 'wtg'
                                                ? 'text-gray-300 bg-gray-500/10 ring-gray-500/30'
                                                : task.status === 'ip'
                                                    ? 'text-blue-300 bg-blue-500/10 ring-blue-500/30'
                                                    : 'text-green-300 bg-green-500/10 ring-green-500/30'
                                                }`}
                                        >
                                            {task.status === 'wtg' ? 'รอดำเนินการ' : task.status === 'ip' ? 'กำลังทำ' : 'เสร็จสิ้น'}
                                        </span>
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
                                                                        className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-md hover:bg-slate-700/50"
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
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TaskTab;