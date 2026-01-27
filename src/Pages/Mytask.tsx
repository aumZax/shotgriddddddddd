import { useEffect, useState } from "react";
import axios from "axios";
import ENDPOINTS from "../config";
import { Calendar, ClipboardList, Clock, Image, Users } from 'lucide-react';


type Assignee = {
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
    assignees: Assignee[]; // ✅ เปลี่ยนจาก string | null → Assignee[]
    start_date: string;
    due_date: string;
    created_at: string;
    description: string;
    file_url: string;
};

export default function Mytask() {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
    const [rightPanelWidth, setRightPanelWidth] = useState(600);
    const [activeTab, setActiveTab] = useState('notes');
    const [isResizing, setIsResizing] = useState(false);


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

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



    const [tasks, setTasks] = useState<Task[]>([]);
    const [, setLoading] = useState(true);


    useEffect(() => {
        const fetchMyTasks = async () => {
            try {
                const authUser = localStorage.getItem("authUser");
                if (!authUser) return;

                const user = JSON.parse(authUser);

                const res = await axios.post(
                    `${ENDPOINTS.MY_TASKS}`,
                    {
                        userId: user.id,
                    }
                );

                setTasks(res.data);
            } catch (err) {
                console.error("Fetch my tasks error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyTasks();
    }, []);








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


    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่ม helper function ไว้ด้านบนของ component
    const getCurrentUser = () => {
        return JSON.parse(localStorage.getItem("authUser") || "{}");
    };

    const sortAssignees = (assignees: Assignee[], currentUserId: number) => {
        const currentUserAssignee = assignees.find(u => u.id === currentUserId);
        const otherAssignees = assignees.filter(u => u.id !== currentUserId);
        return currentUserAssignee ? [currentUserAssignee, ...otherAssignees] : assignees;
    };


    const isCurrentUserAssigned = (assignees: Assignee[]) => {
        const currentUserId = getCurrentUser().id;
        return assignees?.some(u => u.id === currentUserId);
    };


    return (
        <div
            className="fixed inset-0 pt-14 bg-black"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >

            <main className=" h-[calc(100vh-3.5rem)] flex">

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
                                                    onClick={() => setSelectedTask(task)}
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

        </div>
    );
}
