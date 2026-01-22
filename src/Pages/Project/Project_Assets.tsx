import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Image, FolderClosed } from 'lucide-react';
import ENDPOINTS from '../../config';
import axios from 'axios';
import Navbar_Project from "../../components/Navbar_Project";
import { useNavigate } from "react-router-dom";


type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'Final', color: 'bg-green-500', icon: 'dot' }
};

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

interface Asset {
    id: number;
    asset_name: string;
    description: string;
    status: StatusType;
    file_url: string;  // ✅ ใช้แค่ file_url
}

interface AssetCategory {
    category: string;
    count: number;
    assets: Asset[];
}

interface Category {
    category: string;
    count: number;
    assets: Asset[];
}

interface SelectedAsset {
    categoryIndex: number;
    assetIndex: number;
}

interface EditingField {
    field: string;
    categoryIndex: number;
    assetIndex: number;
}

interface Sequence {
    id: number;
    sequence_name: string;
    description?: string;
    order_index?: number;
}

interface Shot {
    id: number;
    shot_name: string;
    description?: string;
    sequence_id: number;
}


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ⭐ เพิ่ม Interface เหล่านี้
interface SequenceDetailForAsset {
    id: number;
    sequence_name: string;
    status: string;
    description: string;
    created_at: string;
}

interface ShotDetailForAsset {
    id: number;
    shot_name: string;
    status: string;
    description: string;
    created_at: string;
}

interface AssetDetail {
    asset_id: number;
    asset_name: string;
    asset_description: string;
    asset_status: string;
    asset_created_at: string;
    asset_thumbnail: string;
    sequence: SequenceDetailForAsset | null;
    shot: ShotDetailForAsset | null;
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


export default function Project_Assets() {
    const navigate = useNavigate();

    const [showCreateAsset, setShowCreateAsset] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [assetData, setAssetData] = useState<Category[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<SelectedAsset | null>(null);
    const [editingField, setEditingField] = useState<EditingField | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<SelectedAsset | null>(null);
    const [statusMenuPosition, setStatusMenuPosition] = useState<'bottom' | 'top'>('bottom');
    const [isLoading, setIsLoading] = useState(true);
    const [, setIsLoadingSequences] = useState(false);
    const [sequences, setSequences] = useState<Sequence[]>([]);
    const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
    const [shots, setShots] = useState<Shot[]>([]);
    const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
    const [isLoadingShots, setIsLoadingShots] = useState(false);
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

    // Form states for creating new asset
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetDescription, setNewAssetDescription] = useState('');
    const [newAssetTaskTemplate, setNewAssetTaskTemplate] = useState('');
    const [taskTemplate, setTaskTemplate] = useState('');
    const [showSequenceDropdown, setShowSequenceDropdown] = useState(false);
    const [showShotDropdown, setShowShotDropdown] = useState(false);
    const [sequenceInput, setSequenceInput] = useState('');
    const [shotInput, setShotInput] = useState('');

    const taskTemplates = [
        "Automotive - Concept",
        "Automotive - Part",
        "Automotive - Theme",
        "Film VFX - Character Asset",
        "Film VFX - General Asset",
        "Games - Large Prop",
        "Games - Medium Prop",
        "Games - Small Prop",

    ];

    // const taskTemplates = [
    //     "Character",
    //     "Environment",
    //     "Prop",
    //     "FX",
    //     "Graphic",
    //     "Matte Painting",
    //     "Vehicle",
    //     "Weapon",
    //     "Model",
    //     "Theme",
    //     "Zone",
    //     "Part"
    // ];

    useEffect(() => {
        fetchAssets();
        fetchSequences();
    }, []);

    const fetchAssets = async () => {
        const projectId = localStorage.getItem('projectId');
        try {
            setIsLoading(true);

            const response = await axios.post(ENDPOINTS.ASSETLIST, {
                projectId
            });

            const data = response.data;

            // 🔍 Debug
            console.log('📦 API Response:', data);

            // ✅ ไม่ต้อง map แล้ว ใช้ data โดยตรง
            setAssetData(data);

            // Set expanded categories
            // Set expanded categories - เปิดแค่ตัวแรก
            const categoriesToExpand = data
                .filter((category: Category) =>
                    Array.isArray(category.assets) && category.assets.length > 0
                )
                .map((category: Category) => category.category);

            setExpandedCategories(categoriesToExpand.length > 0 ? [categoriesToExpand[0]] : []); // เปิดแค่ตัวแรก

            // Sync selected asset
            syncSelectedAssetThumbnail(data);

        } catch (error) {
            console.error('❌ Error fetching assets:', error);
            alert('Failed to fetch assets');
        } finally {
            setIsLoading(false);
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

    const handleTemplateSelect = (template: string) => {
        setTaskTemplate(template);
        setNewAssetTaskTemplate(template);
        setShowTemplateDropdown(false);
    };

    const fetchShots = async (sequenceId: number) => {
        setIsLoadingShots(true);
        try {
            const projectData = getProjectData();
            if (!projectData?.projectId) {
                console.error("Project data not found");
                return;
            }

            const { data } = await axios.post(ENDPOINTS.GETSHOTS, {
                projectId: projectData.projectId,
                sequenceId: sequenceId

            });

            setShots(data);
        } catch (err) {
            console.error("Error fetching shots:", err);
            alert("Failed to fetch shots");
        } finally {
            setIsLoadingShots(false);
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
        setSelectedAsset(null);

    };

    const handleAssetClick = (categoryIndex: number, assetIndex: number) => {
        if (!editingField && !showStatusMenu) {
            const asset = assetData[categoryIndex].assets[assetIndex];

            const selectedAssetData = {
                id: asset.id,
                asset_name: asset.asset_name,
                description: asset.description,
                status: asset.status,
                file_url: asset.file_url || "", // ✅ เปลี่ยนจาก thumbnail เป็น file_url
                sequence: assetData[categoryIndex].category
            };

            localStorage.setItem(
                "selectedAsset",
                JSON.stringify(selectedAssetData)
            );

            console.log('✅ Selected asset:', selectedAssetData);

            setSelectedAsset({ categoryIndex, assetIndex });
        }
    };

    const handleFieldClick = (field: string, categoryIndex: number, assetIndex: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (field === 'status') {
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            setStatusMenuPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'top' : 'bottom');
            setShowStatusMenu({ categoryIndex, assetIndex });
        } else {
            setEditingField({ field, categoryIndex, assetIndex });
        }
    };

    const handleFieldChange = (categoryIndex: number, assetIndex: number, field: string, value: string) => {
        const newData = [...assetData];
        if (field === 'asset_name') {
            newData[categoryIndex].assets[assetIndex].asset_name = value;
        } else if (field === 'description') {
            newData[categoryIndex].assets[assetIndex].description = value;
        }
        setAssetData(newData);
    };

    const filteredSequences = sequences.filter(seq =>
        seq.sequence_name.toLowerCase().includes(sequenceInput.toLowerCase())
    );

    const filteredShots = shots.filter(shot =>
        shot.shot_name.toLowerCase().includes(shotInput.toLowerCase())
    );

    const handleFieldBlur = async (categoryIndex: number, assetIndex: number, field: string) => {
        setEditingField(null);

        const asset = assetData[categoryIndex].assets[assetIndex];

        try {
            await axios.post(ENDPOINTS.UPDATEASSET, {
                assetId: asset.id,
                field: field,
                value: asset[field as keyof Asset]
            });

            console.log(`✅ Updated ${field} for asset ${asset.id}`);
        } catch (error) {
            console.error(`❌ Error updating ${field}:`, error);
            alert(`Failed to update ${field}`);
            fetchAssets();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, categoryIndex: number, assetIndex: number, field: string) => {
        if (e.key === 'Enter') {
            handleFieldBlur(categoryIndex, assetIndex, field);
        } else if (e.key === 'Escape') {
            setEditingField(null);
        }
    };

    const handleStatusChange = async (categoryIndex: number, assetIndex: number, newStatus: StatusType) => {
        const newData = [...assetData];
        const asset = newData[categoryIndex].assets[assetIndex];

        newData[categoryIndex].assets[assetIndex].status = newStatus;
        setAssetData(newData);
        setShowStatusMenu(null);

        try {
            await axios.post(ENDPOINTS.UPDATEASSET, {
                assetId: asset.id,
                field: 'status',
                value: newStatus
            });

            console.log(`✅ Updated status to ${newStatus} for asset ${asset.id}`);
        } catch (error) {
            console.error('❌ Error updating status:', error);
            alert('Failed to update status');
            fetchAssets();
        }
    };

    const isSelected = (categoryIndex: number, assetIndex: number) => {
        return selectedAsset?.categoryIndex === categoryIndex &&
            selectedAsset?.assetIndex === assetIndex;
    };
    const filteredTemplates = taskTemplates.filter(template =>
        template.toLowerCase().includes(taskTemplate.toLowerCase())
    );


    const handleSequenceSelect = (sequence: Sequence) => {
        setSelectedSequence(sequence);
        setSequenceInput(sequence.sequence_name);
        setShowSequenceDropdown(false);

        setSelectedShot(null);
        setShotInput('');
        setShots([]);

        fetchShots(sequence.id);
    };

    const handleSequenceInputChange = (value: string) => {
        setSequenceInput(value);
        setShowSequenceDropdown(true);
        if (selectedSequence && selectedSequence.sequence_name !== value) {
            setSelectedSequence(null);
            setSelectedShot(null);
            setShotInput('');
            setShots([]);
        }
    };

    const handleShotSelect = (shot: Shot) => {
        setSelectedShot(shot);
        setShotInput(shot.shot_name);
        setShowShotDropdown(false);
    };

    const handleShotInputChange = (value: string) => {
        setShotInput(value);
        setShowShotDropdown(true);
        if (selectedShot && selectedShot.shot_name !== value) {
            setSelectedShot(null);
        }
    };

    const handleCreateAsset = async () => {
        if (!newAssetName.trim()) {
            alert('Please enter asset name');
            return;
        }



        try {
            const projectData = getProjectData();

            await axios.post(ENDPOINTS.CREATEASSETS, {
                projectId: projectData?.projectId,
                assetName: newAssetName,
                description: newAssetDescription,
                taskTemplate: newAssetTaskTemplate || null,
                sequenceId: selectedSequence?.id,
                shotId: selectedShot?.id,

            });

            if(newAssetTaskTemplate !== null){
                console.log("Task IS NULL VALUE")
                // await axios.post(ENDPOINTS.CREATE_TASK_ASSET, {
                // projectId: projectData?.projectId,
                // entity_type: "asset",
                
                // });
            }

            console.log('✅ Asset created successfully');

            setNewAssetName('');
            setNewAssetDescription('');
            setNewAssetTaskTemplate('');
            setSelectedSequence(null);
            setSelectedShot(null);
            setSequenceInput('');
            setShotInput('');
            setShots([]);
            setShowCreateAsset(false);

            fetchAssets();
        } catch (error) {
            console.error('❌ Error creating asset:', error);
            alert('Failed to create asset');
        }
    };
    const syncSelectedAssetThumbnail = (categories: AssetCategory[]) => {
        const stored = localStorage.getItem("selectedAsset");
        if (!stored) return;

        try {
            const selected = JSON.parse(stored);

            for (const category of categories) {
                const found = category.assets.find(asset =>
                    asset.id === selected.id
                );
                if (found) {
                    const updatedSelected = {
                        ...selected,
                        file_url: found.file_url || "" // ✅ เปลี่ยนจาก thumbnail เป็น file_url
                    };

                    localStorage.setItem(
                        "selectedAsset",
                        JSON.stringify(updatedSelected)
                    );

                    console.log('✅ Synced file_url:', updatedSelected);
                    break;
                }
            }
        } catch (err) {
            console.error("❌ Failed to sync selectedAsset file_url", err);
        }
    };


    // เมนูคลิกขวา ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        asset: Asset;
    } | null>(null);

    const handleContextMenu = (
        e: React.MouseEvent,
        asset: Asset
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            asset
        });
    };
    // จัดการการขยายรายละเอียดของ Asset/Shot ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
    const [showAssetDetailPanel, setShowAssetDetailPanel] = useState(false);

    const [expandedItem, setExpandedItem] = useState<{
        type: "sequence" | "shot";
        id: number;
    } | null>(null);

    // ⭐ เพิ่มแทนที่
    const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
    const [isLoadingAssetDetail, setIsLoadingAssetDetail] = useState(false);

    // ⭐ ฟังก์ชันดึงข้อมูล asset detail
    const fetchAssetDetail = async (assetId: number) => {
        setIsLoadingAssetDetail(true);

        try {
            const res = await axios.post(ENDPOINTS.PROJECT_ASSET_DETAIL, {
                assetId: assetId
            });

            const rawData = res.data;

            if (rawData.length === 0) {
                setAssetDetail(null);
                return;
            }

            const firstRow = rawData[0];

            // ดึงข้อมูล sequence (ถ้ามี)
            const sequence: SequenceDetailForAsset | null = firstRow.sequence_id ? {
                id: firstRow.sequence_id,
                sequence_name: firstRow.sequence_name,
                status: firstRow.sequence_status,
                description: firstRow.sequence_description || "",
                created_at: firstRow.sequence_created_at
            } : null;

            // ดึงข้อมูล shot (ถ้ามี)
            const shot: ShotDetailForAsset | null = firstRow.shot_id ? {
                id: firstRow.shot_id,
                shot_name: firstRow.shot_name,
                status: firstRow.shot_status,
                description: firstRow.shot_description || "",
                created_at: firstRow.shot_created_at
            } : null;

            const detail: AssetDetail = {
                asset_id: firstRow.asset_id,
                asset_name: firstRow.asset_name,
                asset_description: firstRow.asset_description || "",
                asset_status: firstRow.asset_status,
                asset_created_at: firstRow.asset_created_at,
                asset_thumbnail: firstRow.asset_thumbnail || "",
                sequence,
                shot
            };

            setAssetDetail(detail);

        } catch (err) {
            console.error("Fetch asset detail error:", err);
            setAssetDetail(null);
        } finally {
            setIsLoadingAssetDetail(false);
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




    // ยืนยันการลบ sequence ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [deleteConfirm, setDeleteConfirm] = useState<{
        assetId: number;
        asset_name: string;
    } | null>(null);

    const handleDeleteAsset = async (assetId: number) => {
        try {
            await axios.delete(ENDPOINTS.DELETE_ASSET, {
                data: { assetId },
            });

            console.log("✅ Asset deleted:", assetId);

            // ⭐ ลบ asset ออกจาก assetData (ตัวที่ UI ใช้จริง)
            setAssetData(prev =>
                prev
                    .map(category => ({
                        ...category,
                        assets: category.assets.filter(
                            asset => asset.id !== assetId
                        ),
                        count: category.assets.filter(
                            asset => asset.id !== assetId
                        ).length,
                    }))
                    // ถ้า category ว่างแล้ว จะลบทิ้งก็ได้
                    .filter(category => category.assets.length > 0)
            );

            // reset modal
            setDeleteConfirm(null);

            // ถ้า asset ที่ลบคืออันที่เลือกอยู่
            if (selectedAssetForDetail?.id === assetId) {
                setShowAssetDetailPanel(false);
                setSelectedAssetForDetail(null);
            }

        } catch (err) {
            console.error("❌ Delete asset failed:", err);
        }
    };

    // ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++ ขยับ create ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    const [assetModalPosition, setAssetModalPosition] = useState({ x: 0, y: 0 });
    const [isAssetDragging, setIsAssetDragging] = useState(false);
    const assetDragStart = useRef({ x: 0, y: 0 });


    const handleAssetMouseDown = (e: React.MouseEvent) => {
        setIsAssetDragging(true);
        assetDragStart.current = {
            x: e.clientX - assetModalPosition.x,
            y: e.clientY - assetModalPosition.y,
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isAssetDragging) return;
            setAssetModalPosition({
                x: e.clientX - assetDragStart.current.x,
                y: e.clientY - assetDragStart.current.y,
            });
        };

        const handleMouseUp = () => setIsAssetDragging(false);

        if (isAssetDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isAssetDragging]);


    const handleAssetModalClose = () => {
        setShowCreateAsset(false);
        setAssetModalPosition({ x: 0, y: 0 });

        // Reset form
        setNewAssetName('');
        setNewAssetDescription('');
        setNewAssetTaskTemplate('');
        setTaskTemplate('');
        setSelectedSequence(null);
        setSelectedShot(null);
        setSequenceInput('');
        setShotInput('');
        setShots([]);
        setShowTemplateDropdown(false);
        setShowSequenceDropdown(false);
        setShowShotDropdown(false);
    };




    return (
        <div className="h-screen flex flex-col">
            <div className="pt-14">
                <Navbar_Project activeTab="Assets" />
            </div>

            <div className="pt-12">
                <header className="w-full h-22 px-4 flex items-center justify-between fixed z-[50] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm shadow-lg">
                    <div className="flex flex-col">
                        <div className='flex'>
                            <h2 className="px-2 text-2xl font-normal bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                Assets
                            </h2>
                            <Image className="w-8 h-8 text-blue-400 mr-3" />
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                            <button
                                onClick={() => setShowCreateAsset(true)}
                                className="px-4 h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                            >
                                Add Asset
                                <span className="text-xs">▼</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search Asset..."
                                className="w-40 md:w-56 lg:w-64 h-8 pl-3 pr-10 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:bg-gray-800/80 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-200"
                            />
                        </div>
                    </div>
                </header>
            </div>

            <div className="h-22"></div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-gray-900">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-400">Loading assets...</div>
                    </div>
                ) : assetData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="text-center space-y-4">
                            <Image className="w-24 h-24 text-gray-600 mx-auto" />
                            <h3 className="text-2xl font-medium text-gray-300">No Assets Yet</h3>
                            <p className="text-gray-500 max-w-md">
                                Get started by creating your first asset. Click the "Add Asset" button above to begin.
                            </p>
                        </div>
                    </div>

                ) : (
                    <div className="space-y-2">
                        {assetData.map((category, categoryIndex) => (
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

                                {expandedCategories.includes(category.category) && category.assets.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4 bg-gray-850">
                                        {category.assets.map((asset, assetIndex) => (
                                            <div
                                                key={asset.id}
                                                onClick={() => handleAssetClick(categoryIndex, assetIndex)}
                                                onContextMenu={(e) => handleContextMenu(e, asset)}

                                                className={`group cursor-pointer rounded-xl p-3 transition-all duration-300 border-2 shadow-lg hover:shadow-2xl hover:ring-2 hover:ring-blue-400 ${isSelected(categoryIndex, assetIndex)
                                                    ? 'border-blue-500 bg-gray-750'
                                                    : 'border-gray-400 hover:border-gray-600 hover:bg-gray-750'
                                                    }`}
                                            >
                                                <div
                                                    className="relative aspect-video bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl overflow-hidden mb-3 cursor-pointer shadow-inner"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // ✅ ป้องกัน parent onClick

                                                        // บันทึก selectedAsset
                                                        const currentAsset = assetData[categoryIndex].assets[assetIndex];
                                                        localStorage.setItem(
                                                            "selectedAsset",
                                                            JSON.stringify({
                                                                id: currentAsset.id,
                                                                asset_name: currentAsset.asset_name,
                                                                description: currentAsset.description,
                                                                status: currentAsset.status,
                                                                file_url: currentAsset.file_url || "", // ✅ เปลี่ยนเป็น file_url
                                                                sequence: assetData[categoryIndex].category
                                                            })
                                                        );

                                                        navigate('/Project_Assets/Others_Asset');
                                                    }}
                                                >
                                                    {asset.file_url ? (  // ✅ เปลี่ยนจาก asset.thumbnail เป็น asset.file_url
                                                        <img
                                                            src={asset.file_url}  // ✅ ใช้ file_url
                                                            alt={asset.asset_name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                            onError={(e) => {
                                                                // จัดการกรณีรูปโหลดไม่ได้
                                                                console.error('Failed to load image:', asset.file_url);
                                                                e.currentTarget.style.display = 'none';
                                                            }}
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
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div
                                                        onClick={(e) => handleFieldClick('asset_name', categoryIndex, assetIndex, e)}
                                                        className="px-2 py-1 rounded hover:bg-gray-700 cursor-text"
                                                    >
                                                        {editingField?.categoryIndex === categoryIndex &&
                                                            editingField?.assetIndex === assetIndex &&
                                                            editingField?.field === 'asset_name' ? (
                                                            <input
                                                                type="text"
                                                                value={asset.asset_name}
                                                                onChange={(e) => handleFieldChange(categoryIndex, assetIndex, 'asset_name', e.target.value)}
                                                                onBlur={() => handleFieldBlur(categoryIndex, assetIndex, 'asset_name')}
                                                                onKeyDown={(e) => handleKeyDown(e, categoryIndex, assetIndex, 'asset_name')}
                                                                autoFocus
                                                                className="w-full text-sm font-medium text-gray-200 bg-gray-600 border border-blue-500 rounded px-1 outline-none"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <h3 className="text-sm font-medium text-gray-200">
                                                                {asset.asset_name}
                                                            </h3>
                                                        )}
                                                    </div>

                                                    <div
                                                        onClick={(e) => handleFieldClick('description', categoryIndex, assetIndex, e)}
                                                        className="px-2 py-1 rounded hover:bg-gray-700 cursor-text"
                                                    >
                                                        {editingField?.categoryIndex === categoryIndex &&
                                                            editingField?.assetIndex === assetIndex &&
                                                            editingField?.field === 'description' ? (
                                                            <textarea
                                                                value={asset.description}
                                                                onChange={(e) => handleFieldChange(categoryIndex, assetIndex, 'description', e.target.value)}
                                                                onBlur={() => handleFieldBlur(categoryIndex, assetIndex, 'description')}
                                                                onKeyDown={(e) => handleKeyDown(e, categoryIndex, assetIndex, 'description')}
                                                                autoFocus
                                                                rows={4}
                                                                className="w-full text-xs text-gray-200 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none overflow-y-auto leading-relaxed"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <p className="text-xs text-gray-400 truncate min-h-[16px]">
                                                                {asset.description || '\u00A0'}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="px-2 relative">
                                                        <button
                                                            onClick={(e) => handleFieldClick('status', categoryIndex, assetIndex, e)}
                                                            className="flex items-center gap-2 w-full py-1 px-2 rounded hover:bg-gray-700"
                                                        >
                                                            {statusConfig[asset.status].icon === '-' ? (
                                                                <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                            ) : (
                                                                <div className={`w-2 h-2 rounded-full ${statusConfig[asset.status].color}`}></div>
                                                            )}
                                                            <span className="text-xs text-gray-300">{statusConfig[asset.status].label}</span>
                                                        </button>

                                                        {showStatusMenu?.categoryIndex === categoryIndex &&
                                                            showStatusMenu?.assetIndex === assetIndex && (
                                                                <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] border border-gray-600`}>
                                                                    {(Object.entries(statusConfig) as [StatusType, { label: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                        <button
                                                                            key={key}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleStatusChange(categoryIndex, assetIndex, key);
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

            {showCreateAsset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 top-20">
                    {/* Backdrop with blur effect */}
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={handleAssetModalClose}
                    />

                    {/* Modal Container */}
                    <div style={{
                        transform: `translate(${assetModalPosition.x}px, ${assetModalPosition.y}px)`
                    }} className="relative w-full max-w-2xl bg-gradient-to-br from-[#0f1729] via-[#162038] to-[#0d1420] rounded-2xl shadow-2xl shadow-blue-900/50 border border-blue-500/20 overflow-hidden ">

                        {/* Header */}
                        <div onMouseDown={handleAssetMouseDown} className="px-6 py-4 bg-gradient-to-r from-[#1e3a5f] via-[#1a2f4d] to-[#152640] border-b border-blue-500/30 cursor-grab active:cursor-grabbing select-none">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        Create New Asset
                                    </h2>
                                </div>
                                <button
                                    onClick={handleAssetModalClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
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

                            {/* Asset Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Asset Name
                                </label>
                                <input
                                    type="text"
                                    value={newAssetName}
                                    onChange={(e) => setNewAssetName(e.target.value)}
                                    placeholder="Enter asset name"
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all" />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newAssetDescription}
                                    onChange={(e) => setNewAssetDescription(e.target.value)}
                                    placeholder="Short description of this asset"
                                    className="w-full h-10 px-4 w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />
                            </div>

                            {/* Task Template */}
                            <div className="space-y-2 relative">
                                <label className="block text-sm font-medium text-gray-300">
                                    Task Template
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
                                    <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredTemplates.map((template) => (
                                            <div
                                                key={template}
                                                onClick={() => handleTemplateSelect(template)}
                                                className="px-4 py-2.5 hover:bg-blue-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg text-gray-300 text-sm"
                                            >
                                                {template}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sequence */}
                            <div className="relative">
                                {/* <label className="block text-sm font-medium text-gray-300">
                                    Sequence
                                    <span className="text-red-400 ml-1">*</span>
                                </label> */}
                                <input
                                    hidden
                                    type="text"
                                    value={sequenceInput}
                                    onChange={(e) => handleSequenceInputChange(e.target.value)}
                                    onFocus={() => setShowSequenceDropdown(true)}
                                    placeholder="Search or select a sequence..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />

                                {showSequenceDropdown && filteredSequences.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredSequences.map((seq) => (
                                            <div
                                                key={seq.id}
                                                onClick={() => handleSequenceSelect(seq)}
                                                className="px-4 py-2.5 hover:bg-blue-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg flex justify-between items-center bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                            >
                                                <span>{seq.sequence_name}</span>
                                                {seq.description && <span className="text-gray-400 text-xs ml-2">{seq.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Shot */}
                            <div className="relative">
                                {/* <label className="block text-sm font-medium text-gray-300">
                                    Shot
                                    <span className="text-red-400 ml-1">*</span>
                                </label> */}
                                <input
                                    hidden
                                    type="text"
                                    value={shotInput}
                                    onChange={(e) => handleShotInputChange(e.target.value)}
                                    onFocus={() => selectedSequence && setShowShotDropdown(true)}
                                    placeholder={selectedSequence ? "Type to search shot..." : "Select sequence first"}
                                    disabled={!selectedSequence || isLoadingShots}
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />

                                {isLoadingShots && (
                                    <div className="flex items-center gap-2 text-xs text-blue-400 mt-1 ">
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Loading shots...</span>
                                    </div>
                                )}

                                {showShotDropdown && filteredShots.length > 0 && !isLoadingShots && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all">
                                        {filteredShots.map((shot) => (
                                            <div
                                                key={shot.id}
                                                onClick={() => handleShotSelect(shot)}
                                                className="px-4 py-2.5 hover:bg-blue-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg flex justify-between items-center  bg-[#0d1420]/80 border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                            >
                                                <span>{shot.shot_name}</span>
                                                {shot.description && <span className="text-gray-400 text-xs ml-2">{shot.description}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {showShotDropdown && filteredShots.length === 0 && !isLoadingShots && selectedSequence && (
                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <span>No shots found for this sequence</span>
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
                                        value="Demo: Animation"
                                        className="w-full h-10 px-4 bg-[#0d1420]/60 border border-blue-500/20 rounded-lg text-blue-300/60 text-sm"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
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
                                    onClick={handleAssetModalClose}
                                    className="px-6 h-10 bg-[#3a3a3a] hover:bg-[#4a4a4a] border border-gray-600 text-sm rounded-lg text-gray-200 transition-all font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleCreateAsset}
                                    // disabled={!selectedSequence || !selectedShot}
                                    className="px-6 h-10 bg-gradient-to-r from-[#2196F3] to-[#1976D2] hover:from-[#1976D2] hover:to-[#1565C0] text-sm rounded-lg text-white shadow-lg shadow-blue-500/20 transition-all font-medium disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
                                    Create Asset
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
                            setSelectedAssetForDetail(contextMenu.asset); // ✅ ใช้ asset จาก API ตรง ๆ
                            fetchAssetDetail(contextMenu.asset.id); // ⭐ เพิ่มบรรทัดนี้
                            setShowAssetDetailPanel(true);
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                        👁️ See more
                    </button>
                    <button
                        onClick={() => {
                            setDeleteConfirm({
                                assetId: contextMenu.asset.id,
                                asset_name: contextMenu.asset.asset_name,
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
            {showAssetDetailPanel && selectedAssetForDetail && (

                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => {
                            setShowAssetDetailPanel(false);
                            setSelectedAssetForDetail(null);
                            setExpandedItem(null);
                            setAssetDetail(null); // ⭐ เพิ่มบรรทัดนี้
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
                                            {selectedAssetForDetail.asset_name}
                                        </h3>
                                    </div>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => {
                                        setShowAssetDetailPanel(false);
                                        setSelectedAssetForDetail(null);
                                        setExpandedItem(null);
                                        setAssetDetail(null); // ⭐ เพิ่มบรรทัดนี้
                                    }}
                                    className="w-9 h-9 rounded-lg bg-gray-700/80 hover:bg-red-600 text-gray-300 hover:text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 group"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform">✕</span>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {isLoadingAssetDetail ? (
                                // Loading State
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Loading...</div>
                                </div>
                            ) : !assetDetail ? (
                                // Error State
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-gray-400">Failed to load asset details</div>
                                </div>
                            ) : (
                                <>
                                    {/* Asset Info */}
                                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                        <h4 className="text-sm font-medium text-gray-300 mb-2">Description</h4>
                                        <p className="text-sm text-gray-400">
                                            {assetDetail.asset_description || "No description"}
                                        </p>
                                    </div>

                                    {/* Sequence Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Sequence {assetDetail.sequence ? "(1)" : "(0)"}
                                            </h4>
                                        </div>

                                        {/* Add Sequence Input - TODO: เชื่อม API ในอนาคต */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type sequence name..."
                                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                                disabled
                                            />
                                            <button
                                                className="px-4 py-2 bg-purple-600/50 rounded-lg text-sm text-white cursor-not-allowed"
                                                disabled
                                                title="Feature coming soon"
                                            >
                                                + Add
                                            </button>
                                        </div>

                                        {/* Sequence Tag */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                            {!assetDetail.sequence ? (
                                                <p className="text-xs text-gray-500 italic">No sequence assigned</p>
                                            ) : (
                                                <div
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    onClick={() => setExpandedItem({ type: "sequence" as any, id: assetDetail.sequence!.id })}
                                                    className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "sequence" && expandedItem?.id === assetDetail.sequence.id
                                                        ? "bg-purple-500/80 text-white border-purple-400 shadow-lg shadow-purple-500/50"
                                                        : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium">{assetDetail.sequence.sequence_name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${assetDetail.sequence.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                        assetDetail.sequence.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-white/20 text-white/80'
                                                        }`}>
                                                        {assetDetail.sequence.status === 'fin' ? 'Final' :
                                                            assetDetail.sequence.status === 'ip' ? 'In Progress' :
                                                                'Waiting'}
                                                    </span>
                                                    {/* TODO: เชื่อม API ลบ sequence assignment ในอนาคต */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log("TODO: Remove sequence assignment");
                                                        }}
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "sequence" && expandedItem?.id === assetDetail.sequence!.id
                                                            ? "hover:bg-purple-600 hover:rotate-90"
                                                            : "hover:bg-red-500/80 hover:rotate-90"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-bold">×</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Shot Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Shot {assetDetail.shot ? "(1)" : "(0)"}
                                            </h4>
                                        </div>

                                        {/* Add Shot Input - TODO: เชื่อม API ในอนาคต */}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Type shot name..."
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

                                        {/* Shot Tag */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                            {!assetDetail.shot ? (
                                                <p className="text-xs text-gray-500 italic">No shot assigned</p>
                                            ) : (
                                                <div
                                                    onClick={() => setExpandedItem({ type: "shot", id: assetDetail.shot!.id })}
                                                    className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "shot" && expandedItem?.id === assetDetail.shot.id
                                                        ? "bg-blue-500/80 text-white border-blue-400 shadow-lg shadow-blue-500/50"
                                                        : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                        }`}
                                                >
                                                    <span className="text-sm font-medium">{assetDetail.shot.shot_name}</span>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${assetDetail.shot.status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                        assetDetail.shot.status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-white/20 text-white/80'
                                                        }`}>
                                                        {assetDetail.shot.status === 'fin' ? 'Final' :
                                                            assetDetail.shot.status === 'ip' ? 'In Progress' :
                                                                'Waiting'}
                                                    </span>
                                                    {/* TODO: เชื่อม API ลบ shot assignment ในอนาคต */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            console.log("TODO: Remove shot assignment");
                                                        }}
                                                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "shot" && expandedItem?.id === assetDetail.shot!.id
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

                                    {/* Editor Section */}
                                    {expandedItem && (
                                        <div className="sticky bottom-0 pt-4 border-t border-gray-700 bg-gray-900">
                                            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                                <h5 className="text-sm font-medium text-gray-300 mb-2">
                                                    Selected: {
                                                        expandedItem.type === 'sequence' ? 'Sequence' :
                                                            expandedItem.type === 'shot' ? 'Shot' :
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
                                    "{deleteConfirm.asset_name}"
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
                                        handleDeleteAsset(deleteConfirm.assetId)
                                    }
                                    className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                                >
                                    Delete Asset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}