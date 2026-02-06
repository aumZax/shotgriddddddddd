import { useState, useRef, useEffect } from 'react';
import { FileText, Calendar, Users, Paperclip } from 'lucide-react';
import ENDPOINTS from '../config';

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
    read_status?: string;
}

interface NotesTabProps {
    notes: Note[];
    loadingNotes: boolean;
    openAssignedDropdown: string | number | null;
    setOpenAssignedDropdown: (id: string | number | null) => void;
    onContextMenu?: (e: React.MouseEvent, note: Note) => void;
    onDeleteNote?: (noteId: number) => void;
    onNoteClick?: (note: Note) => void;
}

const NotesTab = ({
    notes,
    loadingNotes,
    onContextMenu,
    onNoteClick
}: NotesTabProps) => {
    const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
    const dropdownRef = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const buttonRef = useRef<{ [key: number]: HTMLButtonElement | null }>({});
    const [dropdownPos, setDropdownPos] = useState<{ [key: number]: { top: number; left: number } }>({});

    useEffect(() => {
        if (expandedNoteId === null) return;

        const button = buttonRef.current[expandedNoteId];
        const dropdown = dropdownRef.current[expandedNoteId];

        if (!button || !dropdown) return;

        const calculatePos = () => {
            const btnRect = button.getBoundingClientRect();
            const dropHeight = dropdown.offsetHeight;

            // ขึ้นด้านบนเสมอ
            // eslint-disable-next-line prefer-const
            let top = btnRect.top - dropHeight - 8;
            let left = btnRect.left;

            // จำกัดซ้าย-ขวา
            if (left < 10) left = 10;
            if (left + 256 > window.innerWidth) {
                left = window.innerWidth - 256 - 10;
            }

            setDropdownPos(prev => ({
                ...prev,
                [expandedNoteId]: { top, left }
            }));
        };

        calculatePos();
        window.addEventListener('scroll', calculatePos);
        window.addEventListener('resize', calculatePos);

        return () => {
            window.removeEventListener('scroll', calculatePos);
            window.removeEventListener('resize', calculatePos);
        };
    }, [expandedNoteId]);

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

    const getStatusStats = () => {
        const openCount = notes.filter(n => n.status === 'open' || n.status === 'opn').length;
        const totalCount = notes.length;
        const percentage = totalCount > 0 ? ((openCount / totalCount) * 100).toFixed(2) : '0.00';
        return { openCount, totalCount, percentage };
    };

    const getEarliestDate = () => {
        if (notes.length === 0) return '-';
        const dates = notes.map(n => new Date(n.created_at).getTime());
        const earliest = new Date(Math.min(...dates));
        return earliest.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const getLatestDate = () => {
        if (notes.length === 0) return '-';
        const dates = notes.map(n => new Date(n.created_at).getTime());
        const latest = new Date(Math.max(...dates));
        return latest.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    const stats = getStatusStats();

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 shadow-2xl">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 z-10 backdrop-blur-sm">
                        <tr className="border-b-2 border-blue-500/30">
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                                #
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>หัวข้อ</span>
                                    <span className="text-blue-400">↑</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 normal-case">
                                    <span>จำนวน:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-semibold">
                                        {notes.length}
                                    </span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                ผู้เขียน
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>วันที่สร้าง</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-500 normal-case">
                                    <div className="flex items-center gap-2">
                                        <span>แรกสุด:</span>
                                        <span className="text-gray-300 font-mono">{getEarliestDate()}</span>
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div>ประเภท</div>
                                <div className="mt-2 text-xs text-gray-500 normal-case">
                                    <div className="flex items-center gap-2">
                                        <span>ล่าสุด:</span>
                                        <span className="text-gray-300 font-mono">{getLatestDate()}</span>
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div>สถานะ</div>
                                <div className="mt-2 text-xs text-gray-500 normal-case">
                                    <div className="flex items-center gap-2">
                                        <span>เปิด:</span>
                                        <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 font-semibold">
                                            {stats.percentage}%
                                        </span>
                                    </div>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>ผู้รับมอบหมาย</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                งานที่เกี่ยวข้อง
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-1">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    <span>ไฟล์แนบ</span>
                                </div>
                            </th>
                            <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                สถานะการอ่าน
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {loadingNotes ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-16">
                                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                                        <div className="text-center space-y-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                                                <div className="relative w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-semibold text-gray-200">กำลังโหลด...</h3>
                                                <p className="text-gray-500">กรุณารอสักครู่</p>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : notes.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-16">
                                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                                        <div className="text-center space-y-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                                                <FileText className="relative w-24 h-24 text-gray-600 mx-auto" strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-2xl font-semibold text-gray-200">ยังไม่มีบันทึก</h3>
                                                <p className="text-gray-500 max-w-md">
                                                    ยังไม่มีบันทึกในขณะนี้ เริ่มสร้างบันทึกใหม่ได้เลย
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            notes.map((note, index) => (
                                <tr
                                    key={note.id}
                                    onContextMenu={(e) => {
                                        // prevent browser menu, close expanded assigned dropdown, then call parent handler
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setExpandedNoteId(null);
                                        onContextMenu?.(e, note);
                                    }}
                                    className="group hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-transparent transition-all duration-200"
                                >
                                    {/* # */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm font-medium group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                            {index + 1}
                                        </div>
                                    </td>

                                    {/* Subject & Body */}
                                    <td className="px-4 py-4">
                                        <div className="space-y-1 cursor-pointer hover:opacity-80" onClick={() => onNoteClick?.(note)}>
                                            <div className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                                {note.subject}
                                            </div>
                                            <div className="text-xs text-gray-400 line-clamp-2 max-w-md">
                                                {note.body}
                                            </div>
                                        </div>
                                    </td>

                                    {/* Author */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-blue-500/30">
                                                {note.author.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm text-gray-300 font-medium">
                                                {note.author}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Created Date */}
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span className="text-gray-300 font-mono">
                                                {formatDateThai(note.created_at)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Type (Visibility) */}
                                    <td className="px-4 py-4">
                                        {note.visibility ? (
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${note.visibility === 'Client'
                                                    ? 'text-purple-300 bg-purple-500/10 ring-purple-500/30'
                                                    : 'text-gray-300 bg-gray-500/10 ring-gray-500/30'
                                                }`}>
                                                {note.visibility}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 italic text-sm">ไม่ระบุ</span>
                                        )}
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${note.status === 'open' || note.status === 'opn'
                                                ? 'text-green-300 bg-green-500/10 ring-green-500/30'
                                                : 'text-gray-300 bg-gray-500/10 ring-gray-500/30'
                                            }`}>
                                            {note.status === 'open' || note.status === 'opn' ? 'เปิด' : 'ปิด'}
                                        </span>
                                    </td>

                                    {/* Assigned People */}
                                    <td className="px-4 py-4" style={{ overflow: 'visible', position: 'relative' }}>
                                        {note.assigned_people && note.assigned_people.length > 0 ? (
                                            <div className="relative inline-block">
                                                <div className="flex flex-wrap gap-2">
                                                    {note.assigned_people?.map((person, index) => (
                                                        <button
                                                            key={index}
                                                            disabled
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedNoteId(
                                                                    expandedNoteId === note.id ? null : note.id
                                                                );
                                                            }}
                                                            ref={(el) => {
                                                                if (el) buttonRef.current[note.id] = el;
                                                            }}
                                                            className="group/btn h-9 flex items-center px-3.5 py-2 rounded-lg
                                                                    bg-gradient-to-r from-slate-700 to-slate-600
                                                                    hover:from-slate-600 hover:to-slate-500
                                                                    border border-slate-500/30 hover:border-slate-400/50
                                                                    transition-all shadow-lg hover:shadow-xl"
                                                            >
                                                            <span className="text-sm font-semibold text-slate-200">
                                                                {person}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {expandedNoteId === note.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setExpandedNoteId(null)}
                                                        />
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            ref={(el) => {
                                                                if (el) dropdownRef.current[note.id] = el;
                                                            }}
                                                            className="fixed z-[9999] w-64 max-h-80 overflow-y-auto bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-600/50 rounded-xl shadow-2xl ring-1 ring-white/5"
                                                            style={{
                                                                top: `${dropdownPos[note.id]?.top ?? 0}px`,
                                                                left: `${dropdownPos[note.id]?.left ?? 0}px`,
                                                                position: 'fixed'
                                                            }}
                                                        >
                                                            <div className="px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-800/50 backdrop-blur-sm border-b border-slate-600/50">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Users className="w-4 h-4 text-slate-400" />
                                                                        <span className="text-sm font-semibold text-slate-200">
                                                                            ผู้รับมอบหมาย
                                                                        </span>
                                                                        <span className="px-2 py-0.5 rounded-md bg-slate-700 text-xs font-semibold text-slate-300">
                                                                            {note.assigned_people.length}
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => setExpandedNoteId(null)}
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
                                                                {note.assigned_people.map((person: string, idx: number) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/50 transition-colors group/user"
                                                                    >
                                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-blue-500/30 group-hover/user:scale-110 transition-transform">
                                                                            {person.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium text-slate-200 truncate">
                                                                                {person}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-600 text-sm italic">ไม่มี</span>
                                        )}
                                    </td>

                                    {/* Tasks */}
                                    <td className="px-4 py-4">
                                        {note.tasks && note.tasks.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {note.tasks.slice(0, 2).map((task: string, taskIndex: number) => (
                                                    <span
                                                        key={taskIndex}
                                                        className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-md font-medium ring-1 ring-blue-500/30"
                                                    >
                                                        {task}
                                                    </span>
                                                ))}
                                                {note.tasks.length > 2 && (
                                                    <span className="px-2.5 py-1 text-xs text-gray-400 font-medium">
                                                        +{note.tasks.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-600 text-sm italic">ไม่มี</span>
                                        )}
                                    </td>

                                    {/* Attachment */}
                                    <td className="px-4 py-4">
                                        {note.file_url ? (
                                            <a
                                                href={ENDPOINTS.image_url + note.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all ring-1 ring-emerald-500/30 hover:ring-emerald-500/50"
                                                title="ดูไฟล์แนบ"
                                            >
                                                <Paperclip className="w-4 h-4" />
                                                <span className="text-xs font-medium">ดูไฟล์</span>
                                            </a>
                                        ) : (
                                            <span className="text-gray-600 text-sm italic">ไม่มี</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {note.read_status ? (
                                            <span className="text-gray-600 text-sm italic">{note.read_status}</span>
                                        ) : (
                                            <span className="text-gray-600 text-sm italic">ไม่มี</span>
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

export default NotesTab;