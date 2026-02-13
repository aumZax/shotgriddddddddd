import React from 'react';

// Types
type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' },
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

type Version = {
    id: number;
    entity_type: string;
    entity_id: number;
    version_number: number;
    file_url: string;
    thumbnail_url?: string;
    status: string;
    uploaded_by: number;
    created_at: string;
    file_size?: number;
    notes?: string;
    uploaded_by_name?: string;
};

interface RightPanelProps {
    selectedTask: Task | null;
    isPanelOpen: boolean;
    rightPanelWidth: number;
    activeTab: string;
    taskVersions: Version[];
    isLoadingVersions: boolean;
    onClose: () => void;
    onResize: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTabChange: React.Dispatch<React.SetStateAction<string>>;
}

const RightPanel: React.FC<RightPanelProps> = ({
    selectedTask,
    isPanelOpen,
    rightPanelWidth,
    activeTab,
    taskVersions,
    isLoadingVersions,
    onClose,
    onResize,
    onTabChange
}) => {
    if (!selectedTask) return null;

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

    return (
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
                onMouseDown={onResize}
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
                            onClick={onClose}
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
                            onClick={() => onTabChange('notes')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${activeTab === 'notes'
                                ? 'text-white border-b-2 border-blue-500'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <span>📝</span>
                            <span>NOTES</span>
                        </button>
                        <button
                            onClick={() => onTabChange('versions')}
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
                                    <option>Any status</option>
                                    <option value="wtg">Waiting</option>
                                    <option value="ip">In Progress</option>
                                    <option value="apr">Approved</option>
                                    <option value="fin">Final</option>
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

                            {isLoadingVersions ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="ml-3 text-gray-400">กำลังโหลด versions...</span>
                                </div>
                            ) : taskVersions.length === 0 ? (
                                <div className="text-center text-gray-500 py-12">
                                    <div className="text-4xl mb-3">📦</div>
                                    <p>No versions yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {taskVersions.map((version, index) => (
                                        <div
                                            key={version.id}
                                            className="bg-[#1a1d24] rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                                        >
                                            {/* รูปภาพ */}
                                            <div className="relative aspect-video bg-gray-800">
                                                <img
                                                    src={version.file_url}
                                                    alt={`Version ${version.version_number}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                    }}
                                                />
                                                {/* Version Badge */}
                                                {index === 0 && (
                                                    <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-semibold">
                                                        current
                                                    </div>
                                                )}

                                                {/* Status Badge */}
                                                <div className="absolute top-2 left-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${version.status === 'fin' ? 'bg-green-500/90 text-white' :
                                                        version.status === 'apr' ? 'bg-blue-500/90 text-white' :
                                                            version.status === 'ip' ? 'bg-yellow-500/90 text-white' :
                                                                'bg-gray-500/90 text-white'
                                                        }`}>
                                                        {statusConfig[version.status as StatusType]?.label || version.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ข้อมูล */}
                                            <div className="p-3">
                                                <div className="text-sm text-white font-medium mb-1">
                                                    {selectedTask.task_name}
                                                </div>

                                                {/* Description/Notes */}
                                                {version.notes && (
                                                    <div className="text-xs text-gray-400 mb-2 line-clamp-2">
                                                        {version.notes}
                                                    </div>
                                                )}

                                                <div className="text-xs text-gray-500 mb-2">
                                                    👤 {version.uploaded_by_name}
                                                </div>

                                                {/* File size */}
                                                {version.file_size && (
                                                    <div className="text-xs text-gray-500 mb-2">
                                                        💾 {(version.file_size / 1024 / 1024).toFixed(2)} MB
                                                    </div>
                                                )}

                                                {/* Date */}
                                                <div className="text-xs text-gray-500">
                                                    {formatDateThai(version.created_at)}
                                                </div>

                                                {/* Status Bar */}
                                                <div className={`mt-2 h-1 rounded ${version.status === 'fin' ? 'bg-emerald-500' :
                                                    version.status === 'apr' ? 'bg-blue-500' :
                                                        version.status === 'ip' ? 'bg-orange-500' :
                                                            'bg-gray-500'
                                                    }`}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upload Zone */}
                            <div className="mt-4 border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                                <div className="text-4xl text-gray-600 mb-2">☁️</div>
                                <div className="text-sm text-gray-400">Drag and drop your files here, or browse</div>
                                <div className="text-xs text-gray-600 mt-1">Upload new version</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RightPanel;