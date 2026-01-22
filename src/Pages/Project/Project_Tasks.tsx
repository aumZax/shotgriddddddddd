import { useEffect, useRef, useState } from "react";
import Navbar_Project from "../../components/Navbar_Project";
import axios from "axios";
import ENDPOINTS from "../../config";
import { ClipboardList, Image, Users } from 'lucide-react';

type TaskAssignee = {
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
    assignees: TaskAssignee[]; // ⭐ สำคัญ
};


export default function Project_Tasks() {
    const [showCreateMytask, setShowCreateMytask] = useState(false);
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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const projectId = JSON.parse(
                    localStorage.getItem("projectId") || "null"
                );

                if (!projectId) return;

                const res = await axios.post(
                    `${ENDPOINTS.PROJECT_TASKS}`,
                    { projectId }
                );
                console.log("RAW TASKS FROM API:", res.data);

                setTasks(res.data);
            } catch (err) {
                console.error("Fetch tasks error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
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
                            <thead className="sticky top-0 bg-[#1a1d24] z-10">
                                <tr className="border-b border-gray-700 ">
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300 w-12"></th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300 w-16 ">
                                        <button onClick={() => setShowCreateMytask(true)} className="h-8 px-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105 whitespace-nowrap">
                                            Add Task
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div className="flex items-center gap-1">
                                            Tasks ↑
                                            <div className="ml-4 text-xs text-gray-500">
                                                <div>Count (task)</div>
                                                <div className="font-semibold text-white">{tasks.length}</div>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">Type</th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div>Status</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            <div>Done %</div>
                                            <div className="font-semibold text-white">63.64%</div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">ผู้รับมอบหมาย</th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div>วันที่เริ่ม</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            <div>Min</div>
                                            <div className="font-semibold text-white">2025-11-17</div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div>วันที่สิ้นสุด</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            <div>Max</div>
                                            <div className="font-semibold text-white">2025-12-29</div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div>ระยะเวลา</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            <div className="font-semibold text-white">วันเริ่ม-วันสิ้นสุด</div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div>Worked days</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            <div>Sum</div>
                                            <div className="font-semibold text-white">29.31</div>
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-normal text-gray-300">
                                        <div>+/- days</div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            <div>Sum</div>
                                            <div className="font-semibold text-white">25.94</div>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-4 py-16">
                                            <div className="flex flex-col items-center justify-center min-h-[400px]">
                                                <div className="text-center space-y-4">
                                                    <ClipboardList className="w-24 h-24 text-gray-600 mx-auto" />
                                                    <h3 className="text-2xl font-medium text-gray-300">No Tasks Yet</h3>
                                                    <p className="text-gray-500 max-w-md">
                                                        You don’t have any tasks assigned to you yet.
                                                    </p>

                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : tasks.map((task, index) => (

                                    <tr key={task.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                                        <td className="px-4 py-2 flex items-center justify-center">
                                            {task.file_url ? (
                                                <div className="relative w-full h-15 rounded overflow-hidden">
                                                    {/* Blurred Background Layer */}
                                                    <div
                                                        className="absolute inset-0 bg-cover bg-center blur-xl scale-110"
                                                        style={{
                                                            backgroundImage: `url(${task.file_url})`,
                                                        }}
                                                    />

                                                    {/* Actual Image on Top */}
                                                    <img
                                                        src={task.file_url}
                                                        alt=""
                                                        className="relative w-full h-full object-contain z-10"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="rounded w-full h-15 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
                                                    <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                                                        <Image className="w-6 h-6 text-gray-500" />
                                                    </div>
                                                </div>
                                            )}

                                        </td>
                                        <td className="px-4 py-3">
                                            <div
                                                className="flex items-center gap-2 text-sm text-blue-400 cursor-pointer"
                                                onClick={() => setSelectedTask(task)}
                                            >
                                                <span className="text-lg">✓</span>
                                                <span className="underline">{task.task_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-400">
                                            {task.entity_type ? (
                                                <span className="text-gray-400">{task.entity_type}</span>
                                            ) : (
                                                <span className="text-gray-600 italic">null</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === 'wtg'
                                                    ? 'text-gray-400 bg-gray-500/20'
                                                    : task.status === 'ip'
                                                        ? 'text-blue-400 bg-blue-500/20'
                                                        : 'text-green-400 bg-green-500/20'
                                                    }`}
                                            >
                                                {task.status}
                                            </span>

                                        </td>


                                        {/* users */}
                                        <td className="px-4 py-3">
                                            {task.assignees?.length > 0 ? (
                                                <div className="relative inline-block">
                                                    {/* Trigger Button */}
                                                    <button
                                                        onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                                        className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-600 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 transition-all"
                                                    >
                                                        <Users className="w-7" />
                                                        <span className="text-lg font-medium text-slate-300">
                                                            {task.assignees.length}
                                                        </span>
                                                        {isCurrentUserAssigned(task.assignees) && (
                                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-xs font-medium text-emerald-400">
                                                                คุณ
                                                            </span>
                                                        )}

                                                    </button>

                                                    {/* Popover */}
                                                    {expandedTaskId === task.id && (
                                                        <>
                                                            {/* Backdrop */}
                                                            <div className="fixed inset-0 z-10" onClick={() => setExpandedTaskId(null)} />

                                                            {/* Content */}
                                                            <div className="absolute left-0 top-full mt-2 z-20 w-60 max-h-72 overflow-hidden bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
                                                                {/* Header */}
                                                                <div className="px-4 py-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm font-medium text-slate-200">
                                                                            ผู้รับผิดชอบ · {task.assignees.length}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => setExpandedTaskId(null)}
                                                                            className="text-slate-400 hover:text-slate-200 transition-colors"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* List */}
                                                                <div className="p-2 max-h-60 overflow-y-auto">
                                                                    {sortAssignees(task.assignees, getCurrentUser().id).map((user) => {
                                                                        const isMe = user.id === getCurrentUser().id;

                                                                        return (
                                                                            <div
                                                                                key={user.id}
                                                                                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                                                                            >
                                                                                {/* Avatar */}
                                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isMe
                                                                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                                                                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                                                                    }`}>
                                                                                    {user.username[0].toUpperCase()}
                                                                                </div>

                                                                                {/* Info */}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-sm text-slate-200 truncate">
                                                                                        {user.username}
                                                                                    </p>
                                                                                </div>

                                                                                {/* Badge */}
                                                                                {isMe && (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-xs font-medium text-emerald-400 border border-emerald-500/30">
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
                                                <span className="text-slate-500 text-xs">—</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-sm">
                                            {task.start_date ? (
                                                <span className="text-gray-400">{formatDateThai(task.start_date)}</span>
                                            ) : (
                                                <span className="text-gray-600 italic">null</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {task.due_date ? (
                                                <span className="text-gray-400">{formatDateThai(task.due_date)}</span>
                                            ) : (
                                                <span className="text-gray-600 italic">null</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-300">
                                            {task.start_date && task.due_date ? (
                                                <span>{calculateDurationDays(task.start_date, task.due_date)} วัน</span>
                                            ) : task.start_date ? (
                                                <span className="text-gray-600 italic">No due date</span>
                                            ) : task.due_date ? (
                                                <span className="text-gray-600 italic">No start date</span>
                                            ) : (
                                                <span className="text-gray-600 italic">null</span>
                                            )}

                                            {/* {calculateBidDays(task.start_date, task.due_date)} วัน */}
                                        </td>
                                        {/* <td className="px-4 py-3 text-sm text-gray-300">{task.worked_days}</td> */}
                                        {/* <td className="px-4 py-3">
                                            <span className={`text-sm font-medium ${task.diffDays < 0 ? 'bg-red-500 text-white px-2 py-1 rounded' : 'text-gray-300'
                                                }`}>
                                                {task.diffDays}
                                            </span>
                                        </td> */}
                                    </tr>
                                ))}
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
                            <button
                                onClick={closeModal}
                                className="text-gray-400 hover:text-white text-xl"
                            >
                                ⚙️
                            </button>
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
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <label className="text-sm text-gray-300 text-right">
                                    Due Date:
                                </label>
                                <input
                                    type="date"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
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
                                    Project:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter project name"
                                    className="h-9 px-3 bg-[#0a1018] border border-blue-500/30 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-500"
                                />
                            </div>

                            <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                                <div></div>
                                <button className="text-sm text-gray-400 hover:text-gray-200 text-left flex items-center gap-1">
                                    More fields <span>▾</span>
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 bg-gradient-to-r from-[#0a1018] to-[#0d1420]  rounded-b flex justify-end items-center gap-3">
                            <button
                                onClick={closeModal}

                                className="px-4 h-9 bg-[#5a5a5a] hover:bg-[#6a6a6a] text-white text-sm rounded flex items-center justify-center"
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