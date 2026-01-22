import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Image, FolderClosed } from 'lucide-react';
import Navbar_Project from "../../components/Navbar_Project";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ENDPOINTS from "../../config";
import { Film, Lock } from 'lucide-react';

type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-green-500', icon: 'dot' }
};

interface Shot {
    id: string;
    shot_name: string;
    thumbnail: string;
    description: string;
    status: string;
}


interface ShotCategory {
    category: string;
    count: number;
    shots: Shot[];
}

interface SelectedShot {
    categoryIndex: number;
    shotIndex: number;
}

interface EditingField {
    field: string;
    categoryIndex: number;
    shotIndex: number;
}

interface Sequence {
    id: number;
    sequence_name: string;
    description?: string;
    order_index?: number;
}
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// ⭐ เพิ่ม Interface เหล่านี้
interface AssetDetail {
    id: number;
    asset_name: string;
    status: string;
    description: string;
    created_at: string;
}

interface SequenceDetail {
    id: number;
    sequence_name: string;
    status: string;
    description: string;
    created_at: string;
}

interface ShotDetail {
    shot_id: number;
    shot_name: string;
    shot_description: string;
    shot_status: string;
    shot_created_at: string;
    shot_thumbnail: string;
    sequence: SequenceDetail | null;
    assets: AssetDetail[];
}
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


export default function ProjectShot() {
    const navigate = useNavigate();

    const [shotData, setShotData] = useState<ShotCategory[]>([]);
    const [isLoadingShots, setIsLoadingShots] = useState(false);
    const [shotsError, setShotsError] = useState('');
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [, setIsLoadingSequences] = useState(false);
    const [showCreateShot, setShowCreateShot] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [selectedShot, setSelectedShot] = useState<SelectedShot | null>(null);
    const [editingField, setEditingField] = useState<EditingField | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<SelectedShot | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'bottom' | 'top'>('bottom');
    const [shotName, setShotName] = useState('');
    const [description, setDescription] = useState('');
    const [taskTemplate, setTaskTemplate] = useState('');
    const [sequenceInput, setSequenceInput] = useState('');
    const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const [showSequenceDropdown, setShowSequenceDropdown] = useState(false);

    const taskTemplates = [
        "Animation - Shot",
        "Film VFX - Comp Only Shot",
        "Film VFX - Full CG Shot w/ Character",
        "Film VFX - Full CG Shot w/o Character"
    ];

    const getProjectData = () => {
        try {
            const projectDataString = localStorage.getItem("projectData");
            if (!projectDataString) return null;
            return JSON.parse(projectDataString);
        } catch (error) {
            console.error("Error parsing projectData:", error);
            return null;
        }
    };

    const fetchShots = async () => {
        setIsLoadingShots(true);
        setShotsError('');

        try {
            const projectData = getProjectData();
            if (!projectData?.projectId) {
                setShotsError("Project data not found");
                return;
            }

            const { data } = await axios.post(ENDPOINTS.SHOTLIST, {
                projectId: projectData.projectId
            });

            // 🔥 MAP file_url → thumbnail
            const mappedData = data.map((category: ShotCategory) => ({
                ...category,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shots: category.shots.map((shot: any) => ({
                    ...shot,
                    thumbnail: shot.file_url || ""
                }))
            }));

            setShotData(mappedData);
            setExpandedCategories(mappedData.length > 0 ? [mappedData[0].category] : []); // เปิดแค่ตัวแรก

            // 🔥 sync selectedShot thumbnail ทุกครั้ง
            syncSelectedShotThumbnail(mappedData);

        } catch (err) {
            console.error("Error fetching shots:", err);
            setShotsError("Failed to load shots");
        } finally {
            setIsLoadingShots(false);
        }
    };

    const syncSelectedShotThumbnail = (categories: ShotCategory[]) => {
        const stored = localStorage.getItem("selectedShot");
        if (!stored) return;

        try {
            const selected = JSON.parse(stored);

            for (const category of categories) {
                const found = category.shots.find(s => s.id === selected.id);
                if (found) {
                    localStorage.setItem(
                        "selectedShot",
                        JSON.stringify({
                            ...selected,
                            thumbnail: found.thumbnail || ""
                        })
                    );
                    break;
                }
            }
        } catch (err) {
            console.error("Failed to sync selectedShot thumbnail", err);
        }
    };


    const updateShot = async (
        categoryIndex: number,
        shotIndex: number,
        field: string,
        value: string
    ) => {
        try {
            const shot = shotData[categoryIndex].shots[shotIndex];

            const fieldMap: Record<string, string> = {
                id: "shot_code",
                shot_name: "shot_name",
                description: "description",
                status: "status"
            };

            await axios.post(ENDPOINTS.UPDATESHOT, {
                shotId: shot.id,
                field: fieldMap[field],
                value
            });

            const newData = [...shotData];
            if (field === "id") newData[categoryIndex].shots[shotIndex].id = value;
            if (field === "description") newData[categoryIndex].shots[shotIndex].description = value;
            if (field === "status") newData[categoryIndex].shots[shotIndex].status = value;

            setShotData(newData);

        } catch (err) {
            console.error("Error updating shot:", err);
        }
    };

    const fetchSequences = async () => {
        setIsLoadingSequences(true);
        try {
            const projectData = getProjectData();
            if (!projectData?.projectId) {
                console.error("Project data not found");
                return;
            }

            const { data } = await axios.post(ENDPOINTS.GETSEQUENCE, {
                projectId: projectData.projectId
            });

            setSequences(data);
        } catch (err) {
            console.error("Error fetching sequences:", err);
        } finally {
            setIsLoadingSequences(false);
        }
    };



    useEffect(() => {
        fetchShots();
        fetchSequences();
    }, []);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleShotClick = (categoryIndex: number, shotIndex: number) => {
        if (editingField || showStatusMenu) return;

        const shot = shotData[categoryIndex].shots[shotIndex];

        localStorage.setItem(
            "selectedShot",
            JSON.stringify({
                id: shot.id,
                shot_name: shot.shot_name,
                description: shot.description,
                status: shot.status,
                thumbnail: shot.thumbnail || "",
                sequence: shotData[categoryIndex].category
            })
        );

        setSelectedShot({ categoryIndex, shotIndex });
    };



    const handleFieldClick = (field: string, categoryIndex: number, shotIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (field === 'status') {
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
            setShowStatusMenu({ categoryIndex, shotIndex });
        } else {
            setEditingField({ field, categoryIndex, shotIndex });
        }
    };

    const handleFieldChange = (categoryIndex: number, shotIndex: number, field: string, value: string) => {
        const newData = [...shotData];
        if (field === 'id') {
            newData[categoryIndex].shots[shotIndex].id = value;
        } else if (field === 'shot_name') {
            newData[categoryIndex].shots[shotIndex].shot_name = value;
        } else if (field === 'description') {
            newData[categoryIndex].shots[shotIndex].description = value;
        }
        setShotData(newData);
    };

    const handleFieldBlur = (categoryIndex: number, shotIndex: number, field: string) => {
        let value = '';
        if (field === 'id') {
            value = shotData[categoryIndex].shots[shotIndex].id;
        } else if (field === 'shot_name') {
            value = shotData[categoryIndex].shots[shotIndex].shot_name;
        } else if (field === 'description') {
            value = shotData[categoryIndex].shots[shotIndex].description;
        }

        updateShot(categoryIndex, shotIndex, field, value);
        setEditingField(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent, categoryIndex: number, shotIndex: number, field: string) => {
        if (e.key === 'Enter') {
            let value = '';
            if (field === 'id') {
                value = shotData[categoryIndex].shots[shotIndex].id;
            } else if (field === 'shot_name') {
                value = shotData[categoryIndex].shots[shotIndex].shot_name;
            } else if (field === 'description') {
                value = shotData[categoryIndex].shots[shotIndex].description;
            }

            updateShot(categoryIndex, shotIndex, field, value);
            setEditingField(null);
        } else if (e.key === 'Escape') {
            setEditingField(null);
        }
    };

    const handleStatusChange = (
        categoryIndex: number,
        shotIndex: number,
        newStatus: StatusType
    ) => {
        updateShot(categoryIndex, shotIndex, "status", newStatus);
        setShowStatusMenu(null);
    };

    const isSelected = (categoryIndex: number, shotIndex: number) => {
        return selectedShot?.categoryIndex === categoryIndex &&
            selectedShot?.shotIndex === shotIndex;
    };

    const handleSequenceSelect = (sequence: Sequence) => {
        setSelectedSequence(sequence);
        setSequenceInput(sequence.sequence_name);
        setShowSequenceDropdown(false);
    };

    const handleSequenceInputChange = (value: string) => {
        setSequenceInput(value);
        setShowSequenceDropdown(true);
        if (selectedSequence && selectedSequence.sequence_name !== value) {
            setSelectedSequence(null);
        }
    };

    const filteredSequences = sequences.filter(seq =>
        seq.sequence_name.toLowerCase().includes(sequenceInput.toLowerCase())
    );

    const handleCreateShot = async () => {
        if (!shotName.trim() || !description.trim() || !taskTemplate || !selectedSequence) {
            setError("Please fill in all required fields");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const projectData = getProjectData();
            if (!projectData?.projectId) {
                setError("Project data not found");
                return;
            }

            const payload = {
                projectId: Number(projectData.projectId), // ✅ แก้ตรงนี้
                sequenceId: Number(selectedSequence.id),  // ✅ cast ชัด
                shotName: shotName.trim(),
                description: description.trim(),
            };

            console.log("Creating shot with payload:", payload);

            await axios.post(ENDPOINTS.CREATESHOT, payload);
            setShowCreateShot(false);
            setShotName('');
            setDescription('');
            setTaskTemplate('');
            setSequenceInput('');
            setSelectedSequence(null);
            fetchShots();
        } catch (err) {
            console.error("Error creating shot:", err);
            setError("Failed to create shot");
        } finally {
            setLoading(false);
        }
    };


    const handleTemplateSelect = (template: string) => {
        setTaskTemplate(template);
        setShowTemplateDropdown(false);
    };

    const filteredTemplates = taskTemplates.filter(template =>
        template.toLowerCase().includes(taskTemplate.toLowerCase())
    );


    // เมนูคลิกขวา ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        shot: Shot;
    } | null>(null);

    const handleContextMenu = (
        e: React.MouseEvent,
        shot: Shot
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            shot
        });
    };
    // จัดการการขยายรายละเอียดของ Shot
    const [expandedShotId, setExpandedShotId] = useState<string | null>(null);
    const [showExpandedPanel, setShowExpandedPanel] = useState(false);
    const [expandedItem, setExpandedItem] = useState<{
        type: "asset" | "sequence";
        id: number;
    } | null>(null);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // ⭐ เพิ่มแทนที่
    const [shotDetail, setShotDetail] = useState<ShotDetail | null>(null);
    const [isLoadingShotDetail, setIsLoadingShotDetail] = useState(false);

    // ⭐ ฟังก์ชันดึงข้อมูล shot detail
    const fetchShotDetail = async (shotId: string) => {
        setIsLoadingShotDetail(true);

        try {
            const res = await axios.post(ENDPOINTS.PROJECT_SHOT_DETAIL, {
                shotId: Number(shotId)
            });

            const rawData = res.data;

            if (rawData.length === 0) {
                setShotDetail(null);
                return;
            }

            const firstRow = rawData[0];

            // ดึงข้อมูล sequence (ถ้ามี)
            const sequence: SequenceDetail | null = firstRow.sequence_id ? {
                id: firstRow.sequence_id,
                sequence_name: firstRow.sequence_name,
                status: firstRow.sequence_status,
                description: firstRow.sequence_description || "",
                created_at: firstRow.sequence_created_at
            } : null;

            // รวบรวม assets
            const assets: AssetDetail[] = rawData
                .filter((row: any) => row.asset_id)
                .map((row: any) => ({
                    id: row.asset_id,
                    asset_name: row.asset_name,
                    status: row.asset_status,
                    description: row.asset_description || "",
                    created_at: row.asset_created_at
                }));

            const detail: ShotDetail = {
                shot_id: firstRow.shot_id,
                shot_name: firstRow.shot_name,
                shot_description: firstRow.shot_description || "",
                shot_status: firstRow.shot_status,
                shot_created_at: firstRow.shot_created_at,
                shot_thumbnail: firstRow.shot_thumbnail || "",
                sequence,
                assets
            };

            setShotDetail(detail);

        } catch (err) {
            console.error("Fetch shot detail error:", err);
            setShotDetail(null);
        } finally {
            setIsLoadingShotDetail(false);
        }
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    useEffect(() => {
        const closeMenu = () => setContextMenu(null);

        if (contextMenu) {
            document.addEventListener("click", closeMenu);
            return () => document.removeEventListener("click", closeMenu);
        }
    }, [contextMenu]);

    const expandedShot = shotData
        .flatMap(cat => cat.shots)
        .find(shot => shot.id === expandedShotId);


    // ยืนยันการลบ sequence ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [deleteConfirm, setDeleteConfirm] = useState<{
        shotId: number;
        shot_name: string;
    } | null>(null);

    const handleDeleteShot = async (shotId: number) => {
        try {
            await axios.delete(ENDPOINTS.DELETE_SHOT, {
                data: { shotId },
            });

            console.log("✅ Shot deleted:", shotId);

            // ⭐ ลบ shot ออกจาก shotData (ตัวที่ UI ใช้จริง)
            setShotData(prev =>
                prev
                    .map(category => ({
                        ...category,
                        shots: category.shots.filter(
                            shot => Number(shot.id) !== shotId
                        ),
                        count: category.shots.filter(
                            shot => Number(shot.id) !== shotId
                        ).length,
                    }))
                    .filter(category => category.shots.length > 0)
            );

            // reset panel / modal
            setDeleteConfirm(null);
            setExpandedShotId(null);
            setShowExpandedPanel(false);
            setExpandedItem(null);

        } catch (err) {
            console.error("❌ Delete shot failed:", err);
        }
    };

       // ++++++++++++++++++++++++++++++++ ขยับ create  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - modalPosition.x,
            y: e.clientY - modalPosition.y,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            setModalPosition({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y,
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);


    const handleModalClose = () => {
        setShowCreateShot(false);

        // reset form
        setShotName('');
        setDescription('');
        setTaskTemplate('');
        setSequenceInput('');
        setSelectedSequence(null);
        setError('');
        setShowTemplateDropdown(false);
        setShowSequenceDropdown(false);

        // ⭐ reset ตำแหน่ง modal
        setModalPosition({ x: 0, y: 0 });
    };



    return (
        <div className="h-screen flex flex-col">
            <div className="pt-14">
                <Navbar_Project activeTab="Shots" />
            </div>
            <div className="pt-12">
                <header className="w-full h-22 px-4 flex items-center justify-between fixed z-[50] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col">
                        <div className='flex'>
                            <h2 className="px-2 text-2xl font-normal bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Shots
                            </h2>
                            <Film className="w-8 h-8 text-blue-400 mr-3" />
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={() => setShowCreateShot(true)}
                                className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                            >
                                Add Shot
                                <span className="text-xs">▼</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Shot..."
                                className="w-40 md:w-56 lg:w-64 h-8 pl-3 pr-10 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:bg-gray-800/80 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-200"
                            />
                        </div>
                    </div>
                </header>
            </div>

            <div className="h-22"></div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-900">
                {isLoadingShots && (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-400">Loading shots...</div>
                    </div>
                )}

                {shotsError && !isLoadingShots && (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-red-400">{shotsError}</div>
                    </div>
                )}

                {!isLoadingShots && !shotsError && shotData.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="text-center space-y-4">
                            <Film className="w-24 h-24 text-gray-600 mx-auto" />
                            <h3 className="text-2xl font-medium text-gray-300">No Shots Yet</h3>
                            <p className="text-gray-500 max-w-md">
                                Get started by creating your first shot. Click the "Add Shot" button above to begin.
                            </p>
                        </div>
                    </div>

                )}

                {!isLoadingShots && !shotsError && shotData.length > 0 && (
                    <div className="space-y-2">
                        {shotData.map((category, categoryIndex) => (
                            <div key={category.category} className="bg-gray-800 rounded-xl border border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300">
                                <button
                                    onClick={() => toggleCategory(category.category)}
                                    className="w-full flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white text-sm font-medium hover:shadow-gray-500/50"
                                >
                                    {expandedCategories.includes(category.category) ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    <span className="font-medium">{category.category}</span>
                                    <span className="text-green-400 text-sm">({category.count})</span>
                                </button>

                                {expandedCategories.includes(category.category) && category.shots.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 bg-gray-850">
                                        {category.shots.map((shot, shotIndex) => (
                                            <div
                                                key={`${category.category}-${shot.id}-${shotIndex}`}  // ✅ รวม category + id + index
                                                onClick={() => handleShotClick(categoryIndex, shotIndex)}
                                                onContextMenu={(e) => handleContextMenu(e, shot)}

                                                className={`group cursor-pointer rounded-xl p-3 transition-all duration-300 border-2 shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-blue-400 ${isSelected(categoryIndex, shotIndex)
                                                    ? 'border-blue-500 bg-gray-750'
                                                    : 'border-gray-400 hover:border-gray-600 hover:bg-gray-750'
                                                    }`}
                                            >
                                                <div className="relative aspect-video bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl overflow-hidden mb-3 cursor-pointer shadow-inner" onClick={() => navigate('/Project_Shot/Others_Shot')}>
                                                    {shot.thumbnail ? (
                                                        <img
                                                            src={shot.thumbnail}
                                                            alt={`${shot.id}`}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2
                        bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
                                                            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center animate-pulse">
                                                                <Image className="w-6 h-6 text-gray-500" />
                                                            </div>
                                                            <p className="text-gray-500 text-xs font-medium">
                                                                No Thumbnail
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path key="eye-inner" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path key="eye-outer" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div
                                                        onClick={(e) => handleFieldClick('shot_name', categoryIndex, shotIndex, e)}
                                                        className="px-2 py-1 rounded hover:bg-gray-700 cursor-text"
                                                    >
                                                        {editingField?.categoryIndex === categoryIndex &&
                                                            editingField?.shotIndex === shotIndex &&
                                                            editingField?.field === 'shot_name' ? (
                                                            <input
                                                                type="text"
                                                                value={shot.shot_name}
                                                                onChange={(e) => handleFieldChange(categoryIndex, shotIndex, 'shot_name', e.target.value)}
                                                                onBlur={() => handleFieldBlur(categoryIndex, shotIndex, 'shot_name')}
                                                                onKeyDown={(e) => handleKeyDown(e, categoryIndex, shotIndex, 'shot_name')}
                                                                autoFocus
                                                                className="w-full text-sm font-medium text-gray-200 bg-gray-600 border border-blue-500 rounded px-1 outline-none"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <h3 className="text-sm font-medium text-gray-200">
                                                                {shot.shot_name}
                                                            </h3>
                                                        )}
                                                    </div>

                                                    <div
                                                        onClick={(e) => handleFieldClick('description', categoryIndex, shotIndex, e)}
                                                        className="px-2 py-1 rounded hover:bg-gray-700 cursor-text"
                                                    >
                                                        {editingField?.categoryIndex === categoryIndex &&
                                                            editingField?.shotIndex === shotIndex &&
                                                            editingField?.field === 'description' ? (
                                                            <textarea
                                                                value={shot.description}
                                                                onChange={(e) => handleFieldChange(categoryIndex, shotIndex, 'description', e.target.value)}
                                                                onBlur={() => handleFieldBlur(categoryIndex, shotIndex, 'description')}
                                                                onKeyDown={(e) => handleKeyDown(e, categoryIndex, shotIndex, 'description')}
                                                                autoFocus
                                                                rows={4}
                                                                className="w-full text-xs text-gray-200 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none overflow-y-auto leading-relaxed"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <p className="text-xs text-gray-400 truncate min-h-[16px]">
                                                                {shot.description || '\u00A0'}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="px-2 relative">
                                                        <button
                                                            onClick={(e) => handleFieldClick('status', categoryIndex, shotIndex, e)}
                                                            className="flex items-center gap-2 w-full py-1 px-2 rounded hover:bg-gray-700"
                                                        >
                                                            {statusConfig[shot.status as StatusType].icon === '-' ? (
                                                                <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                            ) : (
                                                                <div className={`w-2 h-2 rounded-full ${statusConfig[shot.status as StatusType].color}`}></div>
                                                            )}
                                                            <span className="text-xs text-gray-300">{statusConfig[shot.status as StatusType].label}</span>
                                                        </button>

                                                        {showStatusMenu?.categoryIndex === categoryIndex &&
                                                            showStatusMenu?.shotIndex === shotIndex && (
                                                                <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] border border-gray-600`}>
                                                                    {(Object.entries(statusConfig) as [StatusType, { label: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                        <button
                                                                            key={key}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleStatusChange(categoryIndex, shotIndex, key);
                                                                            }}
                                                                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-600 first:rounded-t-lg last:rounded-b-lg text-left"
                                                                        >
                                                                            {config.icon === '-' ? (
                                                                                <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                            ) : (
                                                                                <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
                                                                            )}
                                                                            <span className="text-xs text-gray-200">{config.label}</span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showStatusMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowStatusMenu(null)}
                ></div>
            )}

            {showTemplateDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowTemplateDropdown(false)}
                ></div>
            )}

            {showSequenceDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSequenceDropdown(false)}
                ></div>
            )}

            {showCreateShot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 top-20">
                    {/* Backdrop with blur effect */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={handleModalClose}
                    />

                    {/* Modal Container */}
                    <div style={{
                        transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`
                    }} className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden">

                        {/* Header */}
                        <div onMouseDown={handleMouseDown} className="px-6 py-4 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 cursor-grab active:cursor-grabbing select-none">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Create New Shot
                                    </h2>
                                </div>
                                <button
                                    onClick={handleModalClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-500/20 text-blue-300/70 hover:text-blue-100 transition-all"
                                    aria-label="Close"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 space-y-5">
                            {/* Error Message */}
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-start gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Shot Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Shot Name
                                    <span className="text-red-400 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={shotName}
                                    onChange={(e) => setShotName(e.target.value)}
                                    placeholder="Enter shot name..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Description
                                    <span className="text-red-400 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter description..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Task Template */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-300">
                                    Task Template
                                    <span className="text-red-400 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={taskTemplate}
                                    onChange={(e) => {
                                        setTaskTemplate(e.target.value);
                                        setShowTemplateDropdown(true);
                                    }}
                                    onFocus={() => setShowTemplateDropdown(true)}
                                    placeholder="Type to search templates..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />

                                {showTemplateDropdown && filteredTemplates.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredTemplates.map((template) => (
                                            <div
                                                key={template}
                                                onClick={() => handleTemplateSelect(template)}
                                                className="px-4 py-2.5 hover:bg-blue-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg  bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                            >
                                                {template}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sequence */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-300">
                                    Sequence
                                    <span className="text-red-400 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={sequenceInput}
                                    onChange={(e) => handleSequenceInputChange(e.target.value)}
                                    onFocus={() => setShowSequenceDropdown(true)}
                                    placeholder="Type to search sequence..."
                                    className="w-full h-10 px-4  bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />

                                {showSequenceDropdown && filteredSequences.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredSequences.map((seq) => (
                                            <div
                                                key={seq.id}
                                                onClick={() => handleSequenceSelect(seq)}
                                                className="px-4 py-2.5 hover:bg-blue-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg flex justify-between items-center  bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                            >
                                                <span>{seq.sequence_name}</span>
                                                {seq.description && <span className="text-gray-400 text-xs ml-2">{seq.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {showSequenceDropdown && filteredSequences.length === 0 && sequenceInput && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-2xl">
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                            No sequences found
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Project */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Project
                                </label>
                                <div className="relative">
                                    <input
                                        disabled
                                        value={getProjectData()?.projectName || "Demo: Animation"}
                                        className="w-full h-10 px-4 bg-[#0d1420]/60 border border-blue-500/20 rounded-lg text-blue-300/60 text-sm"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* More fields button */}
                            <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 group transition-colors">
                                <span>Show more fields</span>
                                <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gradient-to-r from-[#0a1018] to-[#0d1420] border-t border-blue-500/30 flex justify-between items-center">
                            <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-colors group">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span className="group-hover:underline">Bulk Import</span>
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleModalClose}
                                    className="px-6 h-10 bg-[#3a3a3a] hover:bg-[#4a4a4a] border border-gray-600 text-sm rounded-lg text-gray-200 transition-all font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleCreateShot}
                                    disabled={loading}
                                    className="px-6 h-10 bg-gradient-to-r from-[#2196F3] to-[#1976D2] hover:from-[#1976D2] hover:to-[#1565C0] text-sm rounded-lg text-white shadow-lg shadow-blue-500/20 transition-all font-medium disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                                    {loading ? "Creating..." : "Create Shot"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* right click menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[160px]"
                    style={{
                        left: contextMenu.x,
                        top: contextMenu.y,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >

                    <button
                        onClick={() => {
                            setExpandedShotId(contextMenu.shot.id)
                            fetchShotDetail(contextMenu.shot.id); // ⭐ เพิ่มบรรทัดนี้
                            setShowExpandedPanel(true);  // เพิ่มบรรทัดนี้
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                        👁️ See more
                    </button>



                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                shotId: Number(contextMenu.shot.id),
                                shot_name: contextMenu.shot.shot_name,
                            });
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 flex items-center gap-2 text-sm"
                    >
                        🗑️ Delete Sequence
                    </button>


                </div>
            )}

            {/* Slide-in Panel from Right */}
            {showExpandedPanel && expandedShot && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => {
                            setShowExpandedPanel(false);
                            setExpandedShotId(null);
                            setExpandedItem(null);
                            setShotDetail(null); // ⭐ เพิ่มบรรทัดนี้
                        }}
                    />

                    {/* Slide Panel */}
                    <div
                        className="fixed right-0 top-25 bottom-0 w-full max-w-2xl bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 rounded-3xl m-6 border border-gray-700"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-700 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-700 rounded-t-3xl">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    {/* Sequence Name */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <FolderClosed className="w-5 h-5 text-blue-400" />
                                        <h3 className="text-xl font-semibold text-white">
                                            {expandedShot.shot_name}
                                        </h3>
                                    </div>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => {
                                        setShowExpandedPanel(false);
                                        setExpandedShotId(null);
                                        setExpandedItem(null);
                                        setShotDetail(null); // ⭐ เพิ่มบรรทัดนี้
                                    }}
                                    className="w-9 h-9 rounded-lg bg-gray-700/80 hover:bg-red-600 text-gray-300 hover:text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 group"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">✕</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isLoadingShotDetail ? (
                                // Loading State
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Loading...</div>
                                </div>
                            ) : !shotDetail ? (
                                // Error State
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Failed to load shot details</div>
                                </div>
                            ) : (
                                <>
                                    {/* Shot Info */}
                                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                        <h4 className="text-sm font-medium text-gray-300 mb-2">Description</h4>
                                        <p className="text-sm text-gray-400">
                                            {shotDetail.shot_description || "No description"}
                                        </p>
                                    </div>

                                    {/* Sequence Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Sequence {shotDetail.sequence ? "(1)" : "(0)"}
                                            </h4>
                                        </div>

                                        {/* Add Sequence Input - TODO: เชื่อม API ในอนาคต */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type sequence name..."
                                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500"
                                                disabled
                                            />
                                            <button
                                                className="px-4 py-2 bg-green-600/50 rounded-lg text-sm text-white cursor-not-allowed"
                                                disabled
                                                title="Feature coming soon"
                                            >
                                                + Add
                                            </button>
                                        </div>

                                        {/* Sequence Tag */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                            {!shotDetail.sequence ? (
                                                <p className="text-xs text-gray-500 italic">No sequence assigned</p>
                                            ) : (
                                                <div
                                                    onClick={() => setExpandedItem({ type: "sequence" as any, id: shotDetail.sequence!.id })}
                                                    className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "sequence" && expandedItem?.id === shotDetail.sequence.id
                                                        ? "bg-purple-500/80 text-white border-purple-400 shadow-lg shadow-purple-500/50"
                                                        : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium">{shotDetail.sequence.sequence_name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${shotDetail.sequence.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                        shotDetail.sequence.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-white/20 text-white/80'
                                                        }`}>
                                                        {shotDetail.sequence.status === 'fin' ? 'Final' :
                                                            shotDetail.sequence.status === 'ip' ? 'In Progress' :
                                                                'Waiting'}
                                                    </span>
                                                    {/* TODO: เชื่อม API ลบ sequence assignment ในอนาคต */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log("TODO: Remove sequence assignment");
                                                        }}
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "sequence" && expandedItem?.id === shotDetail.sequence!.id
                                                            ? "hover:bg-green-600 hover:rotate-90"
                                                            : "hover:bg-red-500/80 hover:rotate-90"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-bold">×</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Assets Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Assets ({shotDetail.assets.length})
                                            </h4>
                                        </div>

                                        {/* Add Asset Input - TODO: เชื่อม API ในอนาคต */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type asset name..."
                                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                disabled
                                            />
                                            <button
                                                className="px-4 py-2 bg-blue-600/50 rounded-lg text-sm text-white cursor-not-allowed"
                                                disabled
                                                title="Feature coming soon"
                                            >
                                                + Add
                                            </button>
                                        </div>

                                        {/* Asset Tags */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                            {shotDetail.assets.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic">No assets yet</p>
                                            ) : (
                                                shotDetail.assets.map(asset => (
                                                    <div
                                                        key={asset.id}
                                                        onClick={() => setExpandedItem({ type: "asset", id: asset.id })}
                                                        className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "asset" && expandedItem?.id === asset.id
                                                            ? "bg-green-500/80 text-white border-green-400 shadow-lg shadow-green-500/50"
                                                            : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{asset.asset_name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${asset.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                            asset.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-white/20 text-white/80'
                                                            }`}>
                                                            {asset.status === 'fin' ? 'Final' :
                                                                asset.status === 'ip' ? 'In Progress' :
                                                                    'Waiting'}
                                                        </span>
                                                        {/* TODO: เชื่อม API ลบ asset ในอนาคต */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log("TODO: Delete asset ID:", asset.id);
                                                            }}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "asset" && expandedItem?.id === asset.id
                                                                ? "hover:bg-blue-600 hover:rotate-90"
                                                                : "hover:bg-red-500/80 hover:rotate-90"
                                                                }`}
                                                        >
                                                            <span className="text-sm font-bold">×</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Editor Section */}
                                    {expandedItem && (
                                        <div className="sticky bottom-0 pt-4 border-t border-gray-700 bg-gray-900">
                                            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                                <h5 className="text-sm font-medium text-gray-300 mb-2">
                                                    Selected: {
                                                        expandedItem.type === 'asset' ? 'Asset' :
                                                            expandedItem.type === 'sequence' ? 'Sequence' :
                                                                'Item'
                                                    }
                                                </h5>
                                                <p className="text-xs text-gray-400">
                                                    ID: {expandedItem.id}
                                                </p>
                                                {/* TODO: เพิ่ม form แก้ไขข้อมูลในอนาคต */}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}



            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    />

                    <div className="relative w-full max-w-md mx-4 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="p-6">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                                    <span className="text-3xl">⚠️</span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-zinc-100">
                                        Delete Sequence
                                    </h3>
                                    <p className="text-sm text-zinc-400">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                <p className="text-zinc-300 mb-1">
                                    Are you sure you want to delete this sequence?
                                </p>
                                <p className="font-semibold text-zinc-100 truncate">
                                    "{deleteConfirm.shot_name}"
                                </p>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-4 py-2 rounded-lg bg-zinc-700/60 text-zinc-200 hover:bg-zinc-700 transition-colors font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() =>
                                        handleDeleteShot(deleteConfirm.shotId)
                                    }
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete Sequence
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
