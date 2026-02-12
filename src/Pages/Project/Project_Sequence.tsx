import { useState, useEffect, useRef } from 'react';

import Navbar_Project from "../../components/Navbar_Project";
import { useNavigate } from "react-router-dom";
import { Check, FolderClosed, Image, Lock, Video } from 'lucide-react';


import ENDPOINTS from "../../config";
import axios from 'axios';



type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' }
};
interface EditingField {
    field: string;
    index: number;
}

export default function Project_Sequence() {
    const navigate = useNavigate();

    const [showCreateSequence, setShowCreateSequence] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface SequenceItem {
        dbId: number;
        id: string; // sequence_name
        description: string;
        status: StatusType;
        thumbnail: string;
        createdAt?: string;
    }
    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // เพิ่ม Interface เหล่านี้
    interface Asset {
        id: number;
        asset_name: string;
        status: string;
        description: string;
        created_at: string;
        asset_sequence_id?: number; // ⭐ เพิ่ม field นี้สำหรับลบ
    }

    interface Shot {
        id: number;
        shot_name: string;
        status: string;
        description: string;
        created_at: string;
        assets: Asset[];
    }

    interface SequenceDetail {
        sequence_id: number;
        sequence_name: string;
        sequence_description: string;
        sequence_status: string;
        sequence_created_at: string;
        sequence_thumbnail: string;
        shots: Shot[];
        assets: Asset[]; // assets ที่ไม่มี shot_id (direct assets)
    }

    const [sequences, setSequences] = useState<SequenceItem[]>([]);
    const [isLoadingSequences, setIsLoadingSequences] = useState(true);

    const [selectedSequence, setSelectedSequence] = useState<number | null>(null);
    const [editingField, setEditingField] = useState<EditingField | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<number | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'bottom' | 'top'>('bottom');

    // เก็บค่า projectId จาก localStorage 
    const projectData = JSON.parse(localStorage.getItem("projectData") || "null");
    const projectId = projectData?.projectId;
    const projectName = projectData?.projectName;
    const [expandedSequenceId, setExpandedSequenceId] = useState<number | null>(null);
    const [showExpandedPanel, setShowExpandedPanel] = useState(false);
    const [sequenceDetail, setSequenceDetail] = useState<SequenceDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const [newSequenceName, setNewSequenceName] = useState("");
    const [newSequenceDesc, setNewSequenceDesc] = useState("");
    const [, setCreateError] = useState("");
    const [searchText, setSearchText] = useState("");

    const [sequenceAssets, setSequenceAssets] = useState<Asset[]>([]);

    const [allProjectAssets, setAllProjectAssets] = useState<Asset[]>([]); // Assets ทั้งหมดในโปรเจค
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);
    const [assetSearchText, setAssetSearchText] = useState("");

    // ⭐ เพิ่มใหม่ทั้งหมด 3 บรรทัด
    const [allProjectShots, setAllProjectShots] = useState<Shot[]>([]); // Shots ทั้งหมดในโปรเจค
    const [showShotDropdown, setShowShotDropdown] = useState(false);
    const [shotSearchText, setShotSearchText] = useState("");

    const [expandedItem, setExpandedItem] = useState<{
        type: "asset" | "shot";
        id: number;
    } | null>(null);

    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        sequence: SequenceItem;
    } | null>(null);

    const [deleteConfirm, setDeleteConfirm] = useState<{
        sequenceId: number;
        sequenceName: string;
    } | null>(null);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);

        if (contextMenu) {
            document.addEventListener("click", closeMenu);
            return () => document.removeEventListener("click", closeMenu);
        }
    }, [contextMenu]);

    useEffect(() => {
        if (expandedSequenceId) {
            fetchSequenceAssets(expandedSequenceId);
            fetchAllProjectAssets(); // ⭐ ดึง assets ทั้งหมด
            fetchAllProjectShots(); // ⭐ เพิ่มบรรทัดนี้
        }
    }, [expandedSequenceId]);

    const handleSequenceClick = (index: number) => {
        if (!editingField && !showStatusMenu) {
            setSelectedSequence(index);
        }
    };

    // ✅ วางตรงนี้
    if (!projectId) {
        console.warn("projectId not found, redirecting to home");
        navigate("/Home");
        return null;
    }


    // ⭐ เพิ่มฟังก์ชันใหม่ทั้งหมด
    const fetchAllProjectShots = async () => {
        try {
            const res = await fetch(ENDPOINTS.GET_SHOT_NULL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId })
            });

            if (!res.ok) throw new Error("Failed to fetch project shots");

            const result = await res.json();
            setAllProjectShots(result.data || []);
        } catch (err) {
            console.error("Fetch project shots error:", err);
            setAllProjectShots([]);
        }
    };

    // ⭐ เพิ่มฟังก์ชันใหม่ทั้งหมด
    const handleAddShotToSequence = async (shotId: number) => {
        if (!expandedSequenceId) return;

        try {
            const linkRes = await fetch(ENDPOINTS.ADD_SHOT_TO_SEQUENCE, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sequenceId: expandedSequenceId,
                    shotId: shotId
                })
            });

            if (!linkRes.ok) {
                const error = await linkRes.json();
                throw new Error(error.message || "Failed to link shot");
            }

            // Refresh รายการ Shots
            await fetchSequenceDetail(expandedSequenceId);
            await fetchAllProjectShots();

            // ปิด dropdown และ reset
            setShowShotDropdown(false);
            setShotSearchText("");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Add shot error:", err);
            alert(err.message || "Failed to add shot");
        }
    };

    // ⭐ เพิ่มฟังก์ชันใหม่ทั้งหมด
    const handleRemoveShotFromSequence = async (shotId: number) => {
        if (!confirm("Remove this shot from sequence?")) return;

        try {
            const res = await fetch(ENDPOINTS.REMOVE_SHOT_FROM_SEQUENCE, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shotId })
            });

            if (!res.ok) throw new Error("Failed to remove shot");

            // Refresh รายการ
            if (expandedSequenceId) {
                await fetchSequenceDetail(expandedSequenceId);
                await fetchAllProjectShots();
            }

        } catch (err) {
            console.error("Remove shot error:", err);
            alert("Failed to remove shot");
        }
    };


    // ⭐ แก้ไขฟังก์ชันนี้
    const fetchAllProjectAssets = async () => {
        try {
            const res = await fetch(ENDPOINTS.GET_PROJECT_ASSETS, { // 👈 เปลี่ยนจาก GET_ASSET_SEQUENCE
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId })
            });

            if (!res.ok) throw new Error("Failed to fetch project assets");

            const result = await res.json();
            setAllProjectAssets(result.data || []);
        } catch (err) {
            console.error("Fetch project assets error:", err);
            setAllProjectAssets([]);
        }
    };
    // ⭐ แก้ไขฟังก์ชันเพิ่ม Asset
    const handleAddAssetToSequence = async (assetId: number) => {
        if (!expandedSequenceId) return;

        try {
            const linkRes = await fetch(ENDPOINTS.ADD_ASSET_TO_SEQUENCE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sequenceId: expandedSequenceId,
                    assetId: assetId // ⭐ ส่ง assetId ที่เลือก
                })
            });

            if (!linkRes.ok) {
                const error = await linkRes.json();
                throw new Error(error.message || "Failed to link asset");
            }

            // Refresh รายการ Assets ที่เชื่อมกับ Sequence นี้
            await fetchSequenceAssets(expandedSequenceId);

            // ปิด dropdown และ reset
            setShowAssetDropdown(false);
            setAssetSearchText("");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Add asset error:", err);
            alert(err.message || "Failed to add asset");
        }
    };


    // ⭐ Filter assets ที่ยังไม่ได้เชื่อมกับ Sequence นี้
    const availableAssetsToAdd = allProjectAssets.filter(asset => {
        // กรองเฉพาะที่ยังไม่มีใน sequenceAssets
        const isAlreadyAdded = sequenceAssets.some(sa => sa.id === asset.id);

        // กรองตาม search text
        const matchSearch = asset.asset_name.toLowerCase().includes(assetSearchText.toLowerCase());

        return !isAlreadyAdded && matchSearch;
    });

    // ⭐ เพิ่มการ filter ใหม่ทั้งหมด
    const availableShotsToAdd = allProjectShots.filter(shot => {
        // กรองเฉพาะที่ยังไม่มีใน sequenceDetail.shots
        const isAlreadyAdded = sequenceDetail?.shots.some(s => s.id === shot.id);

        // กรองตาม search text
        const matchSearch = shot.shot_name.toLowerCase().includes(shotSearchText.toLowerCase());

        return !isAlreadyAdded && matchSearch;
    });

    const handleFieldClick = (field: string, index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (field === 'status') {
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
            setShowStatusMenu(index);
        } else {
            setEditingField({ field, index });
        }
    };

    const handleFieldChange = (index: number, field: string, value: string) => {
        const newSequences = [...sequences];
        if (field === 'id') {
            newSequences[index].id = value;
        } else if (field === 'description') {
            newSequences[index].description = value;
        }
        setSequences(newSequences);
    };

    const handleFieldBlur = () => {
        if (!editingField) return;

        const { index, field } = editingField;
        const seq = sequences[index];

        if (field === "id") {
            updateSequence(seq.dbId, {
                sequence_name: seq.id
            });
        }

        if (field === "description") {
            updateSequence(seq.dbId, {
                description: seq.description
            });
        }

        setEditingField(null);
    };

    // ⭐ ฟังก์ชันดึง Assets ของ Sequence
    const fetchSequenceAssets = async (sequenceId: number) => {
        try {
            const res = await fetch(ENDPOINTS.GET_ASSET_SEQUENCE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sequenceId })
            });

            if (!res.ok) throw new Error("Failed to fetch assets");

            const result = await res.json();

            if (result.success) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const assets: Asset[] = result.data.map((item: any) => ({
                    id: item.asset_id,
                    asset_name: item.asset_name,
                    status: item.status,
                    description: item.description || "",
                    created_at: item.asset_created_at,
                    asset_sequence_id: item.asset_sequence_id // ⭐ เก็บไว้สำหรับลบ
                }));

                setSequenceAssets(assets);
            }
        } catch (err) {
            console.error("Fetch sequence assets error:", err);
            setSequenceAssets([]);
        }
    };



    // ⭐ ฟังก์ชันลบ Asset ออกจาก Sequence
    const handleRemoveAssetFromSequence = async (assetSequenceId: number) => {
        if (!confirm("Remove this asset from sequence?")) return;

        try {
            const res = await fetch(ENDPOINTS.REMOVE_ASSET_FROM_SEQUENCE, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assetSequenceId })
            });

            if (!res.ok) throw new Error("Failed to remove asset");

            // Refresh รายการ
            if (expandedSequenceId) {
                await fetchSequenceAssets(expandedSequenceId);
            }

        } catch (err) {
            console.error("Remove asset error:", err);
            alert("Failed to remove asset");
        }
    };

    // ⭐ เรียกใช้เมื่อเปิด Panel


    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault(); // ⛔ กัน textarea ขึ้นบรรทัดใหม่
            handleFieldBlur();  // 💾 บันทึก
        }

        if (e.key === "Escape") {
            setEditingField(null); // ❌ ยกเลิก ไม่ save
        }
    };

    const handleStatusChange = (index: number, newStatus: StatusType) => {
        const newSequences = [...sequences];
        newSequences[index].status = newStatus;
        setSequences(newSequences);
        setShowStatusMenu(null);

        updateSequence(newSequences[index].dbId, {
            status: newStatus
        });
    };



    // ดึงข้อมูล sequences จาก API เมื่อ component โหลด
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        if (!projectId) return;

        setIsLoadingSequences(true);

        fetch(ENDPOINTS.PROJECT_SEQUENCES, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ projectId })
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch sequences");
                return res.json();
            })
            .then(data => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapped = data.map((item: any) => ({
                    dbId: item.id,
                    id: item.sequence_name,
                    thumbnail: item.file_url || "",
                    description: item.description,
                    status: item.status || "wtg",
                    createdAt: item.created_at // 👈 เพิ่มตรงนี้
                }));

                setSequences(mapped);

                // ⭐ ดึงข้อมูล shots สำหรับแต่ละ sequence
                mapped.forEach((seq: SequenceItem) => {
                    fetchSequenceShots(seq.dbId);
                });
            })
            .catch(err => console.error("Sequence fetch error:", err))
            .finally(() => {
                setIsLoadingSequences(false);
            });
    }, [projectId]);



    const updateSequence = (
        dbId: number,
        payload: {
            sequence_name?: string;
            description?: string;
            status?: StatusType;
        }
    ) => {
        fetch(ENDPOINTS.UPDATE_SEQUENCE, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: dbId,
                ...payload
            })
        }).catch(err => console.error("Update error:", err));
    };


    // ค้นหา ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const filteredSequences = sequences.filter(seq => {
        if (!searchText.trim()) return true;

        const keyword = searchText.toLowerCase();

        const id = seq.id?.toLowerCase() || "";
        const desc = seq.description?.toLowerCase() || "";

        return id.includes(keyword) || desc.includes(keyword);
    });



    // สร้าง Sequence ใหม่ +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++



    const handleCreateSequence = async () => {
        if (!newSequenceName.trim()) {
            setCreateError("Sequence Name is required");
            return;
        }

        try {
            const res = await fetch(ENDPOINTS.CREATE_SEQUENCE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    sequence_name: newSequenceName.trim(),
                    description: newSequenceDesc.trim()
                })
            });

            if (!res.ok) throw new Error("Create failed");

            const result = await res.json();

            setSequences(prev => [
                ...prev,
                {
                    dbId: result.id,
                    id: newSequenceName,
                    description: newSequenceDesc,
                    status: "wtg",
                    thumbnail: ""
                }
            ]);

            // reset
            setNewSequenceName("");
            setNewSequenceDesc("");
            setShowCreateSequence(false);
            setCreateError("");
        } catch (err) {
            console.error(err);
        }
    };



    // เปิดหน้า Sequence อื่น ๆ ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleOpenSequence = (sequence: any) => {
        localStorage.setItem(
            "sequenceData",
            JSON.stringify({
                sequenceId: sequence.dbId,
                sequenceName: sequence.id,
                description: sequence.description,
                status: sequence.status,
                thumbnail: sequence.thumbnail,
                createdAt: sequence.createdAt, // 👈 เพิ่ม
                projectId
            })
        );

        navigate("/Project_Sequence/Others_Sequence");
    };

    // เมนูคลิกขวา ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const handleContextMenu = (
        e: React.MouseEvent,
        sequence: SequenceItem
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            sequence
        });
    };

    // ⭐ ฟังก์ชันดึงข้อมูล sequence detail
    const fetchSequenceDetail = async (sequenceId: number) => {
        setIsLoadingDetail(true);

        try {
            const res = await fetch(ENDPOINTS.PROJECT_SEQUENCE_DETAIL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sequenceId })
            });

            if (!res.ok) throw new Error("Failed to fetch sequence detail");

            const rawData = await res.json();

            // จัดรูปแบบข้อมูลจาก flat array เป็น nested structure
            if (rawData.length === 0) {
                setSequenceDetail(null);
                return;
            }

            const firstRow = rawData[0];
            const shotsMap = new Map<number, Shot>();
            const directAssets: Asset[] = [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rawData.forEach((row: any) => {
                // รวบรวม shots
                if (row.shot_id) {
                    if (!shotsMap.has(row.shot_id)) {
                        shotsMap.set(row.shot_id, {
                            id: row.shot_id,
                            shot_name: row.shot_name,
                            status: row.shot_status,
                            description: row.shot_description || "",
                            created_at: row.shot_created_at,
                            assets: []
                        });
                    }

                    // เพิ่ม asset ให้ shot
                    if (row.asset_id) {
                        shotsMap.get(row.shot_id)!.assets.push({
                            id: row.asset_id,
                            asset_name: row.asset_name,
                            status: row.asset_status,
                            description: row.asset_description || "",
                            created_at: row.asset_created_at
                        });
                    }
                } else if (row.asset_id) {
                    // asset ที่ไม่มี shot_id (direct to sequence)
                    directAssets.push({
                        id: row.asset_id,
                        asset_name: row.asset_name,
                        status: row.asset_status,
                        description: row.asset_description || "",
                        created_at: row.asset_created_at
                    });
                }
            });

            const detail: SequenceDetail = {
                sequence_id: firstRow.sequence_id,
                sequence_name: firstRow.sequence_name,
                sequence_description: firstRow.sequence_description || "",
                sequence_status: firstRow.sequence_status,
                sequence_created_at: firstRow.sequence_created_at,
                sequence_thumbnail: firstRow.sequence_thumbnail || "",
                shots: Array.from(shotsMap.values()),
                assets: directAssets
            };

            setSequenceDetail(detail);

        } catch (err) {
            console.error("Fetch sequence detail error:", err);
            setSequenceDetail(null);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const expandedSequence = sequences.find(
        s => s.dbId === expandedSequenceId
    );

    // ยืนยันการลบ sequence ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const handleDeleteSequence = async (sequenceId: number) => {
        try {
            await axios.delete(ENDPOINTS.DELETE_SEQUENCE, {
                data: { sequenceId },
            });

            console.log("✅ Sequence deleted:", sequenceId);

            // ⭐ ลบออกจาก state ทันที
            setSequences(prev =>
                prev.filter(seq => seq.dbId !== sequenceId)
            );

            // reset modal / panel
            setDeleteConfirm(null);

            if (expandedSequenceId === sequenceId) {
                setExpandedSequenceId(null);
                setShowExpandedPanel(false);
                setExpandedItem(null);
            }

        } catch (err) {
            console.error("❌ Delete sequence failed:", err);
        }
    };
    // +++++++++++++++++++++++++++++ ขยับ create  ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;

        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const closeModal = () => {
        setShowCreateSequence(false);
        setPosition({ x: 0, y: 0 }); // ⭐ reset ตำแหน่ง
    };

    const [sequenceShots, setSequenceShots] = useState<{ [key: number]: Shot[] }>({});
    const fetchSequenceShots = async (sequenceId: number) => {
        try {
            const res = await fetch(ENDPOINTS.PROJECT_SEQUENCE_DETAIL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sequenceId })
            });

            if (!res.ok) throw new Error("Failed to fetch shots");

            const rawData = await res.json();

            // รวบรวม shots ที่ไม่ซ้ำ
            const shotsMap = new Map<number, Shot>();
            rawData.forEach((row: any) => {
                if (row.shot_id && !shotsMap.has(row.shot_id)) {
                    shotsMap.set(row.shot_id, {
                        id: row.shot_id,
                        shot_name: row.shot_name,
                        status: row.shot_status,
                        description: row.shot_description || "",
                        created_at: row.shot_created_at,
                        assets: []
                    });
                }
            });

            setSequenceShots(prev => ({
                ...prev,
                [sequenceId]: Array.from(shotsMap.values())
            }));
        } catch (err) {
            console.error("Fetch shots error:", err);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            <div className="pt-14">

                <Navbar_Project activeTab="Sequence" />
            </div>
            <div className="pt-12">
                <header className="w-full h-22 px-4 flex items-center justify-between fixed z-[50] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col">
                        <div className='flex'>
                            <h2 className="px-2 text-2xl font-normal bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Sequence
                            </h2>
                            <FolderClosed className="w-8 h-8 text-blue-400 mr-3" />
                        </div>



                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={() => setShowCreateSequence(true)}
                                className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                            >
                                Add Sequence
                                <span className="text-xs">▼</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Sequence..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-40 md:w-56 lg:w-64 h-8 pl-3 pr-10 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:bg-gray-800/80 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-200"
                            />

                        </div>
                    </div>
                </header>
            </div>

            <div className="h-22"></div>


            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {isLoadingSequences ? (
                    /* Loading State */
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-400 text-sm">Loading sequences...</p>
                    </div>
                ) : sequences.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="text-center space-y-4">
                            <FolderClosed className="w-24 h-24 text-gray-600 mx-auto" />
                            <h3 className="text-2xl font-medium text-gray-300">No Sequences Yet</h3>
                            <p className="text-gray-500 max-w-md">
                                Get started by creating your first sequence. Click the "Add Sequence" button above to begin.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-full mx-auto">
                        {/* Table Header */}
                        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 mb-2">
                            <div className="flex items-center gap-6 px-5 py-3">
                                <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thumbnail</span>
                                </div>
                                <div className="w-44 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sequence Name</span>
                                </div>
                                <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                                </div>
                                <div className="flex-1 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shots</span>
                                </div>
                            </div>
                        </div>

                        {/* No Search Results */}
                        {filteredSequences.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <p className="text-gray-400 text-sm">No sequences found matching "{searchText}"</p>
                            </div>
                        ) : (
                            /* Table Body */
                            <div className="space-y-1">
                                {filteredSequences.map((sequence, index) => (
                                    <div
                                        key={sequence.dbId}
                                        onClick={() => handleSequenceClick(index)}
                                        onContextMenu={(e) => handleContextMenu(e, sequence)}
                                        className={`group cursor-pointer rounded-md transition-all duration-150 border ${selectedSequence === index
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
                                                        handleOpenSequence(sequence);
                                                    }}
                                                >
                                                    {sequence.thumbnail ? (
                                                        <img
                                                            src={ENDPOINTS.image_url + sequence.thumbnail}
                                                            alt={`${sequence.id}`}
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

                                            {/* Sequence Name */}
                                            <div
                                                onClick={(e) => handleFieldClick('id', index, e)}
                                                className="w-44 flex-shrink-0 px-2 py-1 rounded cursor-text border-r border-gray-700/50 pr-4"
                                            >
                                                {editingField?.index === index && editingField?.field === 'id' ? (
                                                    <input
                                                        type="text"
                                                        value={sequence.id}
                                                        onChange={(e) => handleFieldChange(index, 'id', e.target.value)}
                                                        onBlur={handleFieldBlur}
                                                        onKeyDown={handleKeyDown}
                                                        autoFocus
                                                        className="w-full text-sm font-medium text-gray-100 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <h3 className="text-sm font-medium text-gray-100 truncate px-2.5 py-1
                                                                    border border-gray-500/20
                                                                    hover:bg-gray-700
                                                                    rounded-md">
                                                        {sequence.id}
                                                    </h3>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <div className="w-28 flex-shrink-0 relative border-r border-gray-700/50 pr-4">
                                                <button
                                                    onClick={(e) => handleFieldClick('status', index, e)}
                                                    className="flex w-full items-center gap-2 px-3 py-1.5 rounded-md bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700 rounded-lg transition-colors"
                                                >
                                                    {statusConfig[sequence.status as StatusType].icon === '-' ? (
                                                        <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                    ) : (
                                                        <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[sequence.status as StatusType].color} shadow-sm`}></div>
                                                    )}
                                                    <span className="text-xs text-gray-300 font-medium truncate">
                                                        {statusConfig[sequence.status as StatusType].label}
                                                    </span>
                                                </button>

                                                {/* Status Dropdown */}
                                                {showStatusMenu === index && (
                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-50 min-w-[180px] border border-gray-600`}>
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
                                                                {sequence.status === key && ( // ✅ แสดง checkmark
                                                                    <Check className="w-4 h-4 text-blue-400 ml-auto " />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Description */}
                                            <div
                                                onClick={(e) => handleFieldClick('description', index, e)}
                                                className="flex-1 min-w-0 px-2 py-1 cursor-text border-r border-gray-700/50 pr-4"
                                            >
                                                {editingField?.index === index && editingField?.field === 'description' ? (
                                                    <textarea
                                                        value={sequence.description}
                                                        onChange={(e) =>
                                                            handleFieldChange(index, 'description', e.target.value)
                                                        }
                                                        onBlur={handleFieldBlur}
                                                        onKeyDown={handleKeyDown}
                                                        autoFocus
                                                        rows={1}
                                                        className="w-full text-xs text-gray-200 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed border border-gray-500/20 p-1 rounded
                                                                                hover:bg-gray-700" title={sequence.description}>
                                                        {sequence.description || '\u00A0'}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Shots */}
                                            <div className="flex-1 min-w-0 px-2 py-1">
                                                {sequenceShots[sequence.dbId]?.length > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        {/* แสดง shots ถ้าไม่เกิน 2 ตัว */}
                                                        {sequenceShots[sequence.dbId].length <= 2 ? (
                                                            <div className="flex-1 flex items-center gap-1.5">
                                                                {sequenceShots[sequence.dbId].map((shot) => (
                                                                    <div
                                                                        key={shot.id}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30"
                                                                        title={shot.description || shot.shot_name}
                                                                    >
                                                                        <span className="text-xs text-gray-300 font-medium whitespace-nowrap">
                                                                            {shot.shot_name}
                                                                        </span>
                                                                        {shot.status === 'fin' && (
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                        )}
                                                                        {shot.status === 'ip' && (
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            /* แสดง Counter + View button ถ้ามากกว่า 2 ตัว */
                                                            <>
                                                                {/* Shot Counter Badge */}
                                                                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-md">
                                                                    <Video className="w-3.5 h-3.5 text-blue-400" />

                                                                    <span className="text-xs font-semibold text-blue-300">
                                                                        {sequenceShots[sequence.dbId].length}
                                                                    </span>
                                                                </div>

                                                                {/* Shot Names - แสดงแค่ 2 ตัวแรก */}
                                                                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                                                                    {sequenceShots[sequence.dbId].slice(0, 2).map((shot) => (
                                                                        <div
                                                                            key={shot.id}
                                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30 flex-shrink-0"
                                                                            title={shot.description || shot.shot_name}
                                                                        >
                                                                            <span className="text-xs text-gray-300 font-medium whitespace-nowrap">
                                                                                {shot.shot_name}
                                                                            </span>
                                                                            {shot.status === 'fin' && (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                            )}
                                                                            {shot.status === 'ip' && (
                                                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                                            )}
                                                                        </div>
                                                                    ))}

                                                                    <span className="text-gray-500 text-xs">...</span>
                                                                </div>


                                                            </>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* กรณีไม่มี shots */
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedSequenceId(sequence.dbId);
                                                            fetchSequenceDetail(sequence.dbId);
                                                            setShowExpandedPanel(true);
                                                        }}
                                                        className=" bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600 rounded-md transition-all group flex items-center gap-1 px-2 py-1"
                                                        title="Add assets"
                                                    >
                                                        <span className="text-xs text-gray-400/70 group-hover:text-gray-400 font-medium transition-colors">
                                                            No assets - Click to Add
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Click outside to close status menu */}
            {showStatusMenu !== null && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowStatusMenu(null)}
                ></div>
            )}

            {/* Create Sequence Modal */}
            {showCreateSequence && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop with blur effect */}
                    <div
                        className="absolute inset-0  bg-black/60"
                        onClick={closeModal}
                    />

                    {/* Modal Container - Blue Dark Theme */}
                    <div style={{
                        transform: `translate(${position.x}px, ${position.y}px)`
                    }} className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden">

                        {/* Header with blue gradient */}
                        <div onMouseDown={handleMouseDown} className="px-6 py-4 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 cursor-grab active:cursor-grabbing select-none">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-blue-50">
                                        Create New Sequence
                                    </h2>
                                    <p className="text-xs text-blue-300/70 mt-0.5">Global Form</p>
                                </div>

                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 space-y-5">

                            {/* Sequence Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-blue-200">
                                    Sequence Name
                                    <span className="text-red-400 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newSequenceName}
                                    onChange={(e) => setNewSequenceName(e.target.value)}
                                    placeholder="Enter sequence name..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-blue-200">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newSequenceDesc}
                                    onChange={(e) => setNewSequenceDesc(e.target.value)}
                                    placeholder="Add a description..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Project */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-blue-200">
                                    Project
                                </label>
                                <div className="relative">
                                    <input
                                        disabled
                                        value={projectName || "Demo: Animation"}
                                        className="w-full h-10 px-4 bg-[#0d1420]/60 border border-blue-500/20 rounded-lg text-blue-300/60 text-sm"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Lock className="w-4 h-4" />

                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gradient-to-r from-[#0a1018] to-[#0d1420] border-t border-blue-500/30 flex justify-between items-center">

                            <button
                                onClick={closeModal}
                                className="px-6 h-10 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-700 hover:to-gray-700 text-sm rounded-lg text-blue-100 transition-all font-medium"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleCreateSequence}
                                className="px-6 h-10 bg-gradient-to-r from-[#1e88e5] to-[#1565c0] hover:from-[#1976d2] hover:to-[#0d47a1] text-sm rounded-lg text-white shadow-lg shadow-blue-500/30 transition-all font-medium"
                            >
                                Create Sequence
                            </button>
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
                            setExpandedSequenceId(contextMenu.sequence.dbId);
                            fetchSequenceDetail(contextMenu.sequence.dbId); // ⭐ เพิ่มบรรทัดนี้
                            setShowExpandedPanel(true);
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-300 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                    >
                        👁️ See more
                    </button>



                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                sequenceId: contextMenu.sequence.dbId,
                                sequenceName: contextMenu.sequence.id,
                            });
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                    >
                        🗑️ Delete Sequence
                    </button>


                </div>
            )}

            {/* Slide-in Panel from Right */}
            {showExpandedPanel && expandedSequence && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => {
                            setShowExpandedPanel(false);
                            setExpandedSequenceId(null);
                            setExpandedItem(null);
                            setSequenceDetail(null); // ⭐ เพิ่มบรรทัดนี้เพื่อ clear ข้อมูล
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
                                            {expandedSequence.id}
                                        </h3>
                                    </div>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => {
                                        setShowExpandedPanel(false);
                                        setExpandedSequenceId(null);
                                        setExpandedItem(null);
                                        setSequenceDetail(null); // ⭐ เพิ่มบรรทัดนี้เพื่อ clear ข้อมูล
                                    }}
                                    className="w-9 h-9 rounded-lg text-gray-300 hover:text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 group bg-gradient-to-r from-red-700 to-red-600 hover:from-red-500 hover:to-red-500"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">✕</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isLoadingDetail ? (
                                // Loading State
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Loading...</div>
                                </div>
                            ) : !sequenceDetail ? (
                                // Error State
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Failed to load sequence details</div>
                                </div>
                            ) : (
                                <>
                                    {/* Sequence Info */}
                                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                        <h4 className="text-sm font-medium text-gray-300 mb-2">Description</h4>
                                        <div
                                            onClick={(e) => handleFieldClick('sequence_description', expandedSequenceId!, e)}
                                            className="px-2 py-1 rounded hover:bg-gray-700 cursor-text"
                                        >
                                            {editingField?.index === expandedSequenceId && editingField?.field === 'sequence_description' ? (
                                                <textarea
                                                    value={sequenceDetail.sequence_description || ''}
                                                    onChange={(e) => {
                                                        // อัพเดท local state
                                                        setSequenceDetail(prev => prev ? {
                                                            ...prev,
                                                            sequence_description: e.target.value
                                                        } : null);
                                                    }}
                                                    onBlur={() => {
                                                        // บันทึกไปยัง API
                                                        if (expandedSequenceId) {
                                                            updateSequence(expandedSequenceId, {
                                                                description: sequenceDetail?.sequence_description || ''
                                                            });
                                                        }
                                                        setEditingField(null);
                                                    }}
                                                    onKeyDown={handleKeyDown}
                                                    autoFocus
                                                    rows={4}
                                                    className="w-full text-sm text-gray-400 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none overflow-y-auto"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <p className="text-sm text-gray-400">
                                                    {sequenceDetail.sequence_description || "No description"}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Assets Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Assets ({sequenceAssets.length})
                                            </h4>
                                        </div>

                                        {/* Add Asset Dropdown */}
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search and select asset..."
                                                    value={assetSearchText}
                                                    onChange={(e) => {
                                                        setAssetSearchText(e.target.value);
                                                        setShowAssetDropdown(true);
                                                    }}
                                                    onFocus={() => setShowAssetDropdown(true)}
                                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500"
                                                />
                                                <button
                                                    onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                                                    className="px-4 py-2  rounded-lg text-sm text-white transition-colors flex items-center gap-1 bg-gradient-to-r from-green-700 to-green-700 hover:from-green-600 hover:to-green-600"
                                                >
                                                    <span>+ Add</span>
                                                </button>
                                            </div>

                                            {/* Dropdown List */}
                                            {showAssetDropdown && (
                                                <>
                                                    {/* Backdrop */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => {
                                                            setShowAssetDropdown(false);
                                                            setAssetSearchText("");
                                                        }}
                                                    />

                                                    {/* Dropdown */}
                                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20">
                                                        {availableAssetsToAdd.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                {assetSearchText
                                                                    ? "No matching assets found"
                                                                    : allProjectAssets.length === 0
                                                                        ? "No assets in this project"
                                                                        : "All assets already added"}
                                                            </div>
                                                        ) : (
                                                            availableAssetsToAdd.map(asset => (
                                                                <button
                                                                    key={asset.id}
                                                                    onClick={() => handleAddAssetToSequence(asset.id)}
                                                                    className="w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between group border-b border-gray-700/50 last:border-b-0 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                                                                            <span className="text-xs text-gray-400">#{asset.id}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-sm text-gray-200 block">{asset.asset_name}</span>
                                                                            {asset.description && (
                                                                                <span className="text-xs text-gray-500">{asset.description}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs px-2 py-0.5 rounded ${asset.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                                            asset.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                                'bg-gray-500/20 text-gray-400'
                                                                            }`}>
                                                                            {asset.status === 'fin' ? 'Final' :
                                                                                asset.status === 'ip' ? 'In Progress' :
                                                                                    'Waiting'}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 group-hover:text-green-400 font-medium">+ Add</span>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Asset Tags - แสดง Assets ที่เชื่อมแล้ว */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 min-h-[60px]">
                                            {sequenceAssets.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic w-full text-center py-2">No assets linked yet</p>
                                            ) : (
                                                sequenceAssets.map(asset => (
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

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                handleRemoveAssetFromSequence((asset as any).asset_sequence_id);
                                                            }}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "asset" && expandedItem?.id === asset.id
                                                                ? "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-500 hover:to-gray-500"
                                                                : "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-red-500 hover:to-red-500"
                                                                }`}
                                                            title="Remove from sequence"
                                                        >
                                                            <span className="text-sm font-bold">×</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Shots Section - แสดงเฉพาะ Shots ไม่มี Assets ข้างใน */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Shots ({sequenceDetail.shots.length})
                                            </h4>
                                        </div>

                                        {/* Add Shot Dropdown */}
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search and select shot..."
                                                    value={shotSearchText}
                                                    onChange={(e) => {
                                                        setShotSearchText(e.target.value);
                                                        setShowShotDropdown(true);
                                                    }}
                                                    onFocus={() => setShowShotDropdown(true)}
                                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={() => setShowShotDropdown(!showShotDropdown)}
                                                    className="px-4 py-2 rounded-lg text-sm text-white transition-colors flex items-center gap-1 bg-gradient-to-r from-blue-700 to-blue-700 hover:from-blue-600 hover:to-blue-600"
                                                >
                                                    <span>+ Add</span>
                                                </button>
                                            </div>

                                            {/* Dropdown List */}
                                            {showShotDropdown && (
                                                <>
                                                    {/* Backdrop */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => {
                                                            setShowShotDropdown(false);
                                                            setShotSearchText("");
                                                        }}
                                                    />

                                                    {/* Dropdown */}
                                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20">
                                                        {availableShotsToAdd.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                {shotSearchText
                                                                    ? "No matching shots found"
                                                                    : allProjectShots.length === 0
                                                                        ? "No available shots in this project"
                                                                        : "All shots already added"}
                                                            </div>
                                                        ) : (
                                                            availableShotsToAdd.map(shot => (
                                                                <button
                                                                    key={shot.id}
                                                                    onClick={() => handleAddShotToSequence(shot.id)}
                                                                    className="w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between group border-b border-gray-700/50 last:border-b-0 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                                                                            <span className="text-xs text-gray-400">#{shot.id}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-sm text-gray-200 block">{shot.shot_name}</span>
                                                                            {shot.description && (
                                                                                <span className="text-xs text-gray-500">{shot.description}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-xs px-2 py-0.5 rounded ${shot.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                                            shot.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                                'bg-gray-500/20 text-gray-400'
                                                                            }`}>
                                                                            {shot.status === 'fin' ? 'Final' :
                                                                                shot.status === 'ip' ? 'In Progress' :
                                                                                    'Waiting'}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 group-hover:text-blue-400 font-medium">+ Add</span>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Shot Tags - แสดงเฉพาะ Shot ไม่แสดง Assets */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 min-h-[60px]">
                                            {sequenceDetail.shots.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic w-full text-center py-2">No shots linked yet</p>
                                            ) : (
                                                sequenceDetail.shots.map(shot => (
                                                    <div
                                                        key={shot.id}
                                                        onClick={() => setExpandedItem({ type: "shot", id: shot.id })}
                                                        className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "shot" && expandedItem?.id === shot.id
                                                            ? "bg-blue-500/80 text-white border-blue-400 shadow-lg shadow-blue-500/50"
                                                            : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{shot.shot_name}</span>

                                                        {/* ⭐ Status Badge */}
                                                        <span className={`text-xs px-2 py-0.5 rounded ${shot.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                            shot.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-white/20 text-white/80'
                                                            }`}>
                                                            {shot.status === 'fin' ? 'Final' :
                                                                shot.status === 'ip' ? 'In Progress' :
                                                                    'Waiting'}
                                                        </span>

                                                        {/* ⭐ ปุ่มลบ shot */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveShotFromSequence(shot.id);
                                                            }}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "shot" && expandedItem?.id === shot.id
                                                                ? "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-500 hover:to-gray-500"
                                                                : "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-red-500 hover:to-red-500"
                                                                }`}
                                                            title="Remove from sequence"
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
                                                    Selected: {expandedItem.type === 'asset' ? 'Asset' : 'Shot'}
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
                                    "{deleteConfirm.sequenceName}"
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
                                        handleDeleteSequence(deleteConfirm.sequenceId)
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