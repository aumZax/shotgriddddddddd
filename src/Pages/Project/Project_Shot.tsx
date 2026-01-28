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
    sequence?: SequenceDetail | null;  // เพิ่ม
    assets?: AssetDetail[];            // เพิ่ม
}

interface Asset {
    id: number;
    asset_name: string;
    status: string;
    description: string;
    created_at: string;
    asset_shot_id?: number; // ⭐ เพิ่ม field นี้สำหรับลบ
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
    const [allShotAssets, setAllShotAssets] = useState<Record<string, AssetDetail[]>>({});

    // States สำหรับ Assets Management
    const [allProjectAssets, setAllProjectAssets] = useState<AssetDetail[]>([]);
    const [shotAssets, setShotAssets] = useState<AssetDetail[]>([]);
    const [shotAssetSearchText, setShotAssetSearchText] = useState('');
    const [showShotAssetDropdown, setShowShotAssetDropdown] = useState(false);

    // ⭐ NEW STATES - เพิ่มใหม่
    const [sequenceSearchInput, setSequenceSearchInput] = useState('');
    const [showSequenceSearchDropdown, setShowSequenceSearchDropdown] = useState(false);

    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        shot: Shot;
    } | null>(null);

    const [expandedShotId, setExpandedShotId] = useState<string | null>(null);
    const [showExpandedPanel, setShowExpandedPanel] = useState(false);
    const [expandedItem, setExpandedItem] = useState<{
        type: "asset" | "sequence";
        id: number;
    } | null>(null);

    const [shotDetail, setShotDetail] = useState<ShotDetail | null>(null);
    const [isLoadingShotDetail, setIsLoadingShotDetail] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState<{
        shotId: number;
        shot_name: string;
    } | null>(null);

    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });

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
    // 1. ดึงข้อมูล Assets ทั้งหมด
    const fetchAllProjectAssets = async () => {
        try {
            const projectData = getProjectData();
            if (!projectData?.projectId) return;

            const response = await axios.post(ENDPOINTS.GET_PROJECT_ASSETS, {
                projectId: projectData.projectId
            });

            console.log("fetchAllProjectAssets response:", response.data);

            const data = response.data;
            let assets = [];
            if (Array.isArray(data)) {
                assets = data;
            } else if (data && Array.isArray(data.data)) {
                assets = data.data;
            } else if (data && Array.isArray(data.assets)) {
                assets = data.assets;
            }
            setAllProjectAssets(assets);
        } catch (err) {
            console.error("Error fetching all assets:", err);
        }
    };

    // แก้ไข fetchShotAssets ให้อัพเดท allShotAssets ด้วย
    const fetchShotAssets = async (shotId: number) => {
        try {
            const res = await fetch(ENDPOINTS.GET_ASSET_SHOT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shotId })
            });

            if (!res.ok) throw new Error("Failed to fetch assets");

            const result = await res.json();

            if (result.success) {
                const assets: Asset[] = result.data.map((item: any) => ({
                    id: item.asset_id,
                    asset_name: item.asset_name,
                    status: item.status,
                    description: item.description || "",
                    created_at: item.asset_created_at,
                    asset_shot_id: item.asset_shot_id
                }));

                setShotAssets(assets);

                // ⭐ เพิ่มบรรทัดนี้ - อัพเดท allShotAssets
                setAllShotAssets(prev => ({
                    ...prev,
                    [shotId]: assets
                }));
            }
        } catch (err) {
            console.error("Fetch shot assets error:", err);
            setShotAssets([]);
        }
    };

    // เพิ่มฟังก์ชันนี้เพื่อ refresh assets ของทุก shot ที่แสดงอยู่
    // const refreshAllVisibleShotAssets = async () => {
    //     const visibleShotIds = shotData.flatMap(cat =>
    //         cat.shots.map(shot => Number(shot.id))
    //     );

    //     for (const shotId of visibleShotIds) {
    //         await fetchShotAssets(shotId);
    //     }
    // };

    // 2. เพิ่ม Asset เข้า Shot
    const handleAddAssetToShot = async (assetId: number) => {
        if (!expandedShotId) return;

        try {
            const linkRes = await fetch(ENDPOINTS.ADD_ASSET_TO_SHOT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shotId: expandedShotId,
                    assetId: assetId
                })
            });

            if (!linkRes.ok) {
                const error = await linkRes.json();
                throw new Error(error.message || "Failed to link asset");
            }

            // ⭐ Refresh assets ของ shot นี้
            await fetchShotAssets(Number(expandedShotId));

            // ปิด dropdown และ reset
            setShowShotAssetDropdown(false);
            setShotAssetSearchText("");

        } catch (err: any) {
            console.error("Add asset error:", err);
            alert(err.message || "Failed to add asset");
        }
    };

    const handleRemoveAssetFromShot = async (assetShotId: number) => {
        if (!confirm("Remove this asset from shot?")) return;
        try {
            const response = await fetch(ENDPOINTS.REMOVE_ASSET_FROM_SHOT, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assetShotId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Remove failed");
            }

            if (result.success && shotDetail) {
                // ⭐ Refresh assets ของ shot นี้
                await fetchShotAssets(shotDetail.shot_id);
            }
        } catch (err) {
            console.error("Error removing asset from shot:", err);
            alert("Failed to remove asset");
        }
    };

    // 4. กรอง Assets ที่ยังไม่ได้เพิ่ม
    const availableAssetsToAddToShot = allProjectAssets.filter(asset => {
        const alreadyAdded = shotAssets.some(sa => sa.id === asset.id);
        const matchesSearch = asset.asset_name.toLowerCase().includes(shotAssetSearchText.toLowerCase());
        return !alreadyAdded && matchesSearch;
    });

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

            // Fetch details for each shot
            const mappedData = await Promise.all(
                data.map(async (category: ShotCategory) => ({
                    ...category,
                    shots: await Promise.all(
                        category.shots.map(async (shot: any) => {
                            // Fetch shot detail
                            try {
                                const detailRes = await axios.post(ENDPOINTS.PROJECT_SHOT_DETAIL, {
                                    shotId: Number(shot.id)
                                });

                                const rawData = detailRes.data;
                                if (rawData.length > 0) {
                                    const firstRow = rawData[0];

                                    const sequence: SequenceDetail | null = firstRow.sequence_id ? {
                                        id: firstRow.sequence_id,
                                        sequence_name: firstRow.sequence_name,
                                        status: firstRow.sequence_status,
                                        description: firstRow.sequence_description || "",
                                        created_at: firstRow.sequence_created_at
                                    } : null;

                                    const assets: AssetDetail[] = rawData
                                        .filter((row: any) => row.asset_id)
                                        .map((row: any) => ({
                                            id: row.asset_id,
                                            asset_name: row.asset_name,
                                            status: row.asset_status,
                                            description: row.asset_description || "",
                                            created_at: row.asset_created_at
                                        }));

                                    return {
                                        ...shot,
                                        thumbnail: shot.file_url || "",
                                        sequence,
                                        assets
                                    };
                                }
                            } catch (err) {
                                console.error(`Error fetching detail for shot ${shot.id}:`, err);
                            }

                            return {
                                ...shot,
                                thumbnail: shot.file_url || "",
                                sequence: null,
                                assets: []
                            };
                        })
                    )
                }))
            );

            setShotData(mappedData);
            setExpandedCategories(mappedData.length > 0 ? [mappedData[0].category] : []);
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

            const sequence: SequenceDetail | null = firstRow.sequence_id ? {
                id: firstRow.sequence_id,
                sequence_name: firstRow.sequence_name,
                status: firstRow.sequence_status,
                description: firstRow.sequence_description || "",
                created_at: firstRow.sequence_created_at
            } : null;

            const assets: AssetDetail[] = rawData
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((row: any) => row.asset_id)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // ⭐ NEW FUNCTION 1 - เพิ่มใหม่
    const handleAddSequenceToShot = async (sequenceId: number) => {
        if (!shotDetail) return;

        try {
            const response = await axios.put(ENDPOINTS.ADD_SEQUENCE_TO_SHOT, {
                shotId: shotDetail.shot_id,
                sequenceId: sequenceId
            });

            if (response.data.success) {
                // Refresh ข้อมูล shot detail
                await fetchShotDetail(String(shotDetail.shot_id));

                // รีเซ็ต input และปิด dropdown
                setSequenceSearchInput('');
                setShowSequenceSearchDropdown(false);

                fetchShots();
                fetchSequences();
            }

        } catch (err) {
            console.error("Error adding sequence to shot:", err);
            alert("Failed to add sequence to shot"); // แสดง error ให้ user เห็น
        }
    };

    const handleRemoveSequenceFromShot = async () => {

        if (!shotDetail?.sequence) return;
        if (!confirm("Remove this sequence?")) return;
        try {
            console.log("🚀 Removing sequence from shot:", shotDetail.shot_id);
            console.log("📡 Endpoint:", ENDPOINTS.REMOVE_SEQUENCE_FROM_SHOT);

            const response = await axios.put(ENDPOINTS.REMOVE_SEQUENCE_FROM_SHOT, {
                shotId: shotDetail.shot_id
            });

            console.log("✅ Response:", response.data);

            if (response.data.success) {
                await fetchShotDetail(String(shotDetail.shot_id));
                fetchShots();
                fetchSequences();
            }



        } catch (err) {
            console.error("❌ Error removing sequence from shot:", err);
            const error = err as { response?: { data?: { error?: string } }; message?: string };
            console.error("❌ Error response:", error.response?.data);
            console.error("❌ Request config:", error);
            alert("Failed to remove sequence: " + (error.response?.data?.error || error.message || "Unknown error"));
        }
    };
    // เพิ่ม useEffect นี้
    useEffect(() => {
        if (shotData.length > 0) {
            // Fetch assets สำหรับทุก shot ที่แสดงอยู่
            shotData.forEach(category => {
                category.shots.forEach(shot => {
                    fetchShotAssets(Number(shot.id));
                });
            });
        }
    }, [shotData.length]); // ⚠️ ระวัง: ใช้แค่ length เพื่อไม่ให้ loop ไม่รู้จบ
    useEffect(() => {
        fetchShots();
        fetchSequences();
        fetchAllProjectAssets(); // ← เพิ่มบรรทัดนี้
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync shotAssets เมื่อ shotDetail เปลี่ยน
    useEffect(() => {
        if (shotDetail?.assets) {
            setShotAssets(shotDetail.assets);
        } else {
            setShotAssets([]);
        }
    }, [shotDetail]);

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
        if (!shotName.trim() || !description.trim() || !taskTemplate) {
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
                projectId: Number(projectData.projectId),
                sequenceId: selectedSequence ? Number(selectedSequence.id) : null,
                shotName: shotName.trim(),
                description: description.trim(),
            };

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

    useEffect(() => {
        if (expandedShotId) {
            fetchShotAssets(Number(expandedShotId));
            fetchAllProjectAssets(); // ⭐ ดึง assets ทั้งหมด
            fetchShots(); // ⭐ เพิ่มบรรทัดนี้
        }
    }, [expandedShotId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const handleDeleteShot = async (shotId: number) => {
        try {
            await axios.delete(ENDPOINTS.DELETE_SHOT, {
                data: { shotId },
            });

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

            setDeleteConfirm(null);
            setExpandedShotId(null);
            setShowExpandedPanel(false);
            setExpandedItem(null);

        } catch (err) {
            console.error("Delete shot failed:", err);
        }
    };

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
        setShotName('');
        setDescription('');
        setTaskTemplate('');
        setSequenceInput('');
        setSelectedSequence(null);
        setError('');
        setShowTemplateDropdown(false);
        setShowSequenceDropdown(false);
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

            <main className="flex-1 overflow-y-auto">
                {isLoadingShots && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-400 text-sm">Loading shots...</p>
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
                    <div className="max-w-full mx-auto">
                        {/* Table Header */}
                        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 mb-2">
                            <div className="flex items-center gap-6 px-5 py-3">
                                <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thumbnail</span>
                                </div>
                                <div className="w-48 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sequence</span>
                                </div>
                                <div className="w-44 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shot Name</span>
                                </div>
                                <div className="w-36 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                                </div>
                                <div className="flex-1 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assets</span>
                                </div>
                            </div>
                        </div>

                        {/* Table Body - Grouped by Category */}
                        <div className="space-y-4">
                            {shotData.map((category, categoryIndex) => (
                                <div key={category.category} className="space-y-1">
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(category.category)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-lg transition-all duration-200 border border-gray-700/50"
                                    >
                                        {expandedCategories.includes(category.category) ? (
                                            <ChevronDown className="w-4 h-4 text-gray-400" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        )}
                                        <span className="text-sm font-medium text-gray-200">{category.category}</span>
                                        <span className="text-xs text-blue-400 font-semibold px-2 py-0.5 bg-blue-500/10 rounded-full">
                                            {category.count}
                                        </span>
                                    </button>

                                    {/* Category Shots */}
                                    {expandedCategories.includes(category.category) && (
                                        <div className="space-y-1">
                                            {category.shots.map((shot, shotIndex) => (
                                                <div
                                                    key={`${category.category}-${shot.id}-${shotIndex}`}
                                                    onClick={() => handleShotClick(categoryIndex, shotIndex)}
                                                    onContextMenu={(e) => handleContextMenu(e, shot)}
                                                    className={`group cursor-pointer rounded-md transition-all duration-150 border ${isSelected(categoryIndex, shotIndex)
                                                        ? 'bg-blue-900/30 border-l-4 border-blue-500 border-r border-t border-b border-blue-500/30'
                                                        : 'bg-gray-800/40 hover:bg-gray-800/70 border-l-4 border-transparent border-r border-t border-b border-gray-700/30'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-6 px-4 py-2.5">
                                                        {/* Thumbnail */}
                                                        <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                                            <div
                                                                className="relative w-full h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded overflow-hidden shadow-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate('/Project_Shot/Others_Shot');
                                                                }}
                                                            >
                                                                {shot.thumbnail ? (
                                                                    <img
                                                                        src={shot.thumbnail}
                                                                        alt={shot.shot_name}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
                                                                        <Image className="w-4 h-4 text-gray-500" />
                                                                        <p className="text-gray-500 text-[9px]">No Image</p>
                                                                    </div>
                                                                )}

                                                                {/* Hover Overlay */}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
                                                                    <div className="w-7 h-7 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Sequence */}
                                                        <div className="w-48 flex-shrink-0 px-2 py-1 border-r border-gray-700/50 pr-4">
                                                            {shot.sequence ? (
                                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                                                    <span className="text-xs text-purple-300 font-medium whitespace-nowrap truncate max-w-[120px]" title={shot.sequence.sequence_name}>
                                                                        {shot.sequence.sequence_name}
                                                                    </span>
                                                                    {shot.sequence.status === 'fin' && (
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                    )}
                                                                    {shot.sequence.status === 'ip' && (
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-500 text-xs italic">-</span>
                                                            )}
                                                        </div>

                                                        {/* Shot Name */}
                                                        <div
                                                            onClick={(e) => handleFieldClick('shot_name', categoryIndex, shotIndex, e)}
                                                            className="w-44 flex-shrink-0 px-2 py-1 rounded hover:bg-gray-700/40 cursor-text border-r border-gray-700/50 pr-4"
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
                                                                    className="w-full text-sm font-medium text-gray-100 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <h3 className="text-sm font-medium text-gray-100 truncate">
                                                                    {shot.shot_name}
                                                                </h3>
                                                            )}
                                                        </div>

                                                        {/* Status */}
                                                        <div className="w-36 flex-shrink-0 relative border-r border-gray-700/50 pr-4">
                                                            <button
                                                                onClick={(e) => handleFieldClick('status', categoryIndex, shotIndex, e)}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-700/40 transition-colors"
                                                            >
                                                                {statusConfig[shot.status as StatusType].icon === '-' ? (
                                                                    <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                                ) : (
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[shot.status as StatusType].color} shadow-sm`}></div>
                                                                )}
                                                                <span className="text-xs text-gray-300 font-medium truncate">
                                                                    {statusConfig[shot.status as StatusType].label}
                                                                </span>
                                                            </button>

                                                            {/* Status Dropdown */}
                                                            {showStatusMenu?.categoryIndex === categoryIndex &&
                                                                showStatusMenu?.shotIndex === shotIndex && (
                                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-50 min-w-[140px] border border-gray-600`}>
                                                                        {(Object.entries(statusConfig) as [StatusType, { label: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                            <button
                                                                                key={key}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleStatusChange(categoryIndex, shotIndex, key);
                                                                                }}
                                                                                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-left transition-colors"
                                                                            >
                                                                                {config.icon === '-' ? (
                                                                                    <span className="text-gray-400 font-bold w-2.5 text-center">-</span>
                                                                                ) : (
                                                                                    <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                                                                )}
                                                                                <span className="text-xs text-gray-200">{config.label}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                        </div>

                                                        {/* Description */}
                                                        <div
                                                            onClick={(e) => handleFieldClick('description', categoryIndex, shotIndex, e)}
                                                            className="flex-1 min-w-0 px-2 py-1 rounded hover:bg-gray-700/40 cursor-text border-r border-gray-700/50 pr-4"
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
                                                                    rows={1}
                                                                    className="w-full text-xs text-gray-200 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed" title={shot.description}>
                                                                    {shot.description || '\u00A0'}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Assets */}
                                                        {/* Assets Column */}
                                                        <div className="flex-1 min-w-0 px-2 py-1">
                                                            {(() => {
                                                                // ⭐ ใช้ allShotAssets ถ้ามี ไม่งั้นใช้ shot.assets
                                                                const currentAssets = allShotAssets[shot.id] || shot.assets || [];

                                                                return currentAssets.length > 0 ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {currentAssets.length <= 2 ? (
                                                                            <div className="flex-1 flex items-center gap-1.5">
                                                                                {currentAssets.map((asset) => (
                                                                                    <div
                                                                                        key={asset.id}
                                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30"
                                                                                        title={asset.description || asset.asset_name}
                                                                                    >
                                                                                        <span className="text-xs text-gray-300 font-medium whitespace-nowrap">
                                                                                            {asset.asset_name}
                                                                                        </span>
                                                                                        {asset.status === 'fin' && (
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                                        )}
                                                                                        {asset.status === 'ip' && (
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-md">
                                                                                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                                                    </svg>
                                                                                    <span className="text-xs font-semibold text-green-300">
                                                                                        {currentAssets.length}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                                                                                    {currentAssets.slice(0, 2).map((asset) => (
                                                                                        <div
                                                                                            key={asset.id}
                                                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30 flex-shrink-0"
                                                                                            title={asset.description || asset.asset_name}
                                                                                        >
                                                                                            <span className="text-xs text-gray-300 font-medium whitespace-nowrap max-w-[80px] truncate">
                                                                                                {asset.asset_name}
                                                                                            </span>
                                                                                            {asset.status === 'fin' && (
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                                            )}
                                                                                            {asset.status === 'ip' && (
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                    <span className="text-gray-500 text-xs">...</span>
                                                                                </div>

                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setExpandedShotId(shot.id);
                                                                                        fetchShotDetail(shot.id);
                                                                                        setShowExpandedPanel(true);
                                                                                    }}
                                                                                    className="flex-shrink-0 px-3 py-1.5 bg-gray-700/40 hover:bg-green-600/20 border border-gray-600/30 hover:border-green-500/40 rounded-md transition-all group flex items-center gap-1.5"
                                                                                    title="View all assets"
                                                                                >
                                                                                    <span className="text-xs text-gray-400 group-hover:text-green-400 font-medium transition-colors">
                                                                                        View
                                                                                    </span>
                                                                                    <svg
                                                                                        className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all"
                                                                                        fill="none"
                                                                                        stroke="currentColor"
                                                                                        viewBox="0 0 24 24"
                                                                                    >
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                                    </svg>
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedShotId(shot.id);
                                                                            fetchShotDetail(shot.id);
                                                                            setShowExpandedPanel(true);
                                                                        }}
                                                                        className="bg-gray-600/10 hover:bg-gray-600/20 border border-gray-500/20 hover:border-gray-500/40 rounded-md transition-all group flex items-center gap-1 px-2 py-1"
                                                                        title="Add assets"
                                                                    >
                                                                        <span className="text-xs text-gray-400/70 group-hover:text-gray-400 font-medium transition-colors">
                                                                            No assets - Click to Add
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
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

            {/* ⭐ NEW BACKDROP - เพิ่มใหม่ */}
            {showSequenceSearchDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSequenceSearchDropdown(false)}
                ></div>
            )}

            {showCreateShot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 top-20">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={handleModalClose}
                    />

                    <div style={{
                        transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`
                    }} className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden">

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

                        <div className="px-6 py-6 space-y-5">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-start gap-3">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}

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

                            <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 group transition-colors">
                                <span>Show more fields</span>
                                <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

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
                            fetchShotDetail(contextMenu.shot.id);
                            setShowExpandedPanel(true);
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

            {showExpandedPanel && expandedShot && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => {
                            setShowExpandedPanel(false);
                            setExpandedShotId(null);
                            setExpandedItem(null);
                            setShotDetail(null);
                        }}
                    />

                    <div
                        className="fixed right-0 top-25 bottom-0 w-full max-w-2xl bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 rounded-3xl m-6 border border-gray-700"
                    >
                        <div className="px-6 py-5 border-b border-gray-700 bg-gradient-to-r from-gray-800 via-gray-800 to-gray-700 rounded-t-3xl">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <FolderClosed className="w-5 h-5 text-blue-400" />
                                        <h3 className="text-xl font-semibold text-white">
                                            {expandedShot.shot_name}
                                        </h3>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        setShowExpandedPanel(false);
                                        setExpandedShotId(null);
                                        setExpandedItem(null);
                                        setShotDetail(null);
                                    }}
                                    className="w-9 h-9 rounded-lg bg-gray-700/80 hover:bg-red-600 text-gray-300 hover:text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 group"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">✕</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isLoadingShotDetail ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Loading...</div>
                                </div>
                            ) : !shotDetail ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Failed to load shot details</div>
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                        <h4 className="text-sm font-medium text-gray-300 mb-2">Description</h4>
                                        {editingField?.field === 'shot_detail_description' && Number(expandedShotId) === shotDetail?.shot_id ? (
                                            <textarea
                                                value={shotDetail.shot_description}
                                                onChange={e => setShotDetail(sd => sd ? { ...sd, shot_description: e.target.value } : sd)}
                                                onBlur={async () => {
                                                    const catIdx = shotData.findIndex(cat =>
                                                        cat.shots.some(s => Number(s.id) === shotDetail.shot_id)
                                                    );
                                                    const shotIdx = catIdx !== -1
                                                        ? shotData[catIdx].shots.findIndex(s => Number(s.id) === shotDetail.shot_id)
                                                        : -1;
                                                    if (catIdx !== -1 && shotIdx !== -1) {
                                                        await updateShot(catIdx, shotIdx, 'description', shotDetail.shot_description);
                                                    }
                                                    setEditingField(null);
                                                }}
                                                onKeyDown={async e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const catIdx = shotData.findIndex(cat =>
                                                            cat.shots.some(s => s.id === String(shotDetail.shot_id))
                                                        );
                                                        const shotIdx = catIdx !== -1
                                                            ? shotData[catIdx].shots.findIndex(s => s.id === String(shotDetail.shot_id))
                                                            : -1;
                                                        if (catIdx !== -1 && shotIdx !== -1) {
                                                            await updateShot(catIdx, shotIdx, 'description', shotDetail.shot_description);
                                                        }
                                                        setEditingField(null);
                                                    } else if (e.key === 'Escape') {
                                                        setEditingField(null);
                                                    }
                                                }}
                                                autoFocus
                                                rows={4}
                                                className="w-full text-sm text-gray-200 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none"
                                            />
                                        ) : (
                                            <p
                                                className="text-sm text-gray-400 whitespace-pre-line cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                                                onClick={() => setEditingField({ field: 'shot_detail_description', categoryIndex: -1, shotIndex: -1 })}
                                            >
                                                {shotDetail.shot_description || "No description"}
                                            </p>
                                        )}
                                    </div>

                                    {/* ⭐ UPDATED SEQUENCE SECTION - แก้ไขส่วนนี้ */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Sequence {shotDetail.sequence ? "(1)" : "(0)"}
                                            </h4>
                                        </div>

                                        {/* แสดงฟอร์มเฉพาะตอนไม่มี sequence */}
                                        {!shotDetail.sequence && (
                                            <div className="relative">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={sequenceSearchInput}
                                                        onChange={(e) => {
                                                            setSequenceSearchInput(e.target.value);
                                                            setShowSequenceSearchDropdown(true);
                                                        }}
                                                        onFocus={() => setShowSequenceSearchDropdown(true)}
                                                        placeholder="Type sequence name..."
                                                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500"
                                                    />
                                                </div>

                                                {/* Dropdown */}
                                                {showSequenceSearchDropdown && (
                                                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                                        {sequences
                                                            .filter(seq =>
                                                                seq.sequence_name.toLowerCase().includes(sequenceSearchInput.toLowerCase())
                                                            )
                                                            .map((seq) => (
                                                                <div
                                                                    key={seq.id}
                                                                    onClick={() => handleAddSequenceToShot(seq.id)}
                                                                    className="px-4 py-2.5 hover:bg-gray-700 cursor-pointer transition-colors text-gray-200 text-sm border-b border-gray-700 last:border-b-0"
                                                                >
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="font-medium">{seq.sequence_name}</span>
                                                                        {seq.description && (
                                                                            <span className="text-gray-400 text-xs ml-2 truncate max-w-[150px]">
                                                                                {seq.description}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        {sequences.filter(seq =>
                                                            seq.sequence_name.toLowerCase().includes(sequenceSearchInput.toLowerCase())
                                                        ).length === 0 && (
                                                                <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                                                    No sequences found
                                                                </div>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Sequence Tag */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                            {!shotDetail.sequence ? (
                                                <p className="text-xs text-gray-500 italic">No sequence assigned</p>
                                            ) : (
                                                <div
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveSequenceFromShot();
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
                                                Assets ({shotAssets.length})
                                            </h4>
                                        </div>

                                        {/* Add Asset Dropdown */}
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search and select asset..."
                                                    value={shotAssetSearchText}
                                                    onChange={(e) => {
                                                        setShotAssetSearchText(e.target.value);
                                                        setShowShotAssetDropdown(true);
                                                    }}
                                                    onFocus={() => setShowShotAssetDropdown(true)}
                                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={() => setShowShotAssetDropdown(!showShotAssetDropdown)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors flex items-center gap-1"
                                                >
                                                    <span>+ Add</span>
                                                    <span className="text-xs">▼</span>
                                                </button>
                                            </div>

                                            {/* Dropdown */}
                                            {showShotAssetDropdown && (
                                                <>
                                                    {/* Backdrop */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => {
                                                            setShowShotAssetDropdown(false);
                                                            setShotAssetSearchText("");
                                                        }}
                                                    />

                                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20">
                                                        {availableAssetsToAddToShot.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                {shotAssetSearchText
                                                                    ? "No matching assets found"
                                                                    : allProjectAssets.length === 0
                                                                        ? "No assets in this project"
                                                                        : "All assets already added"}
                                                            </div>
                                                        ) : (
                                                            availableAssetsToAddToShot.map(asset => (
                                                                <button
                                                                    key={asset.id}
                                                                    onClick={() => handleAddAssetToShot(asset.id)}
                                                                    className="w-full px-4 py-2.5 text-left hover:bg-gray-700 transition-colors flex items-center justify-between group border-b border-gray-700/50 last:border-b-0"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                                                                            <span className="text-xs text-gray-400">#{asset.id}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-sm text-gray-200 block">
                                                                                {asset.asset_name}
                                                                            </span>
                                                                            {asset.description && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    {asset.description}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`text-xs px-2 py-0.5 rounded ${asset.status === "fin"
                                                                                ? "bg-green-500/20 text-green-400"
                                                                                : asset.status === "ip"
                                                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                                                    : "bg-gray-500/20 text-gray-400"
                                                                                }`}
                                                                        >
                                                                            {asset.status === "fin"
                                                                                ? "Final"
                                                                                : asset.status === "ip"
                                                                                    ? "In Progress"
                                                                                    : "Waiting"}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 group-hover:text-blue-400 font-medium">
                                                                            + Add
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Asset Tags */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 min-h-[60px]">
                                            {shotAssets.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic w-full text-center py-2">
                                                    No assets linked yet
                                                </p>
                                            ) : (
                                                shotAssets.map(asset => (
                                                    <div
                                                        key={asset.id}
                                                        onClick={() =>
                                                            setExpandedItem({ type: "asset", id: asset.id })
                                                        }
                                                        className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "asset" &&
                                                            expandedItem?.id === asset.id
                                                            ? "bg-green-500/80 text-white border-green-400 shadow-lg shadow-green-500/50"
                                                            : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">
                                                            {asset.asset_name}
                                                        </span>

                                                        <span
                                                            className={`text-xs px-2 py-0.5 rounded ${asset.status === "fin"
                                                                ? "bg-green-500/20 text-green-400"
                                                                : asset.status === "ip"
                                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                                    : "bg-white/20 text-white/80"
                                                                }`}
                                                        >
                                                            {asset.status === "fin"
                                                                ? "Final"
                                                                : asset.status === "ip"
                                                                    ? "In Progress"
                                                                    : "Waiting"}
                                                        </span>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveAssetFromShot(
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    (asset as any).asset_shot_id
                                                                );
                                                            }}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "asset" &&
                                                                expandedItem?.id === asset.id
                                                                ? "hover:bg-blue-600 hover:rotate-90"
                                                                : "hover:bg-red-500/80 hover:rotate-90"
                                                                }`}
                                                            title="Remove from shot"
                                                        >
                                                            <span className="text-sm font-bold">×</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>


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