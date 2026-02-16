import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Image, FolderClosed, Eye, Box, Check } from 'lucide-react';
import ENDPOINTS from '../../config';
import axios from 'axios';
import Navbar_Project from "../../components/Navbar_Project";
import { useNavigate } from "react-router-dom";


type StatusType = keyof typeof statusConfig;

const statusConfig = {
    wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
    ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
    fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' },
    hld: { label: 'hld', fullLabel: 'On Hold', color: 'bg-orange-600', icon: 'dot' },
    pndng: { label: 'pndng', fullLabel: 'Pending', color: 'bg-yellow-400', icon: 'dot' },
    recd: { label: 'recd', fullLabel: 'Received', color: 'bg-blue-400', icon: 'dot' },
    rts: { label: 'rts', fullLabel: 'Ready to Start', color: 'bg-orange-500', icon: 'dot' },
    cmpt: { label: 'cmpt', fullLabel: 'Complete', color: 'bg-blue-600', icon: 'dot' },
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
    id: string;
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
    sequence_id?: number;
    status?: string;
    file_url?: string;
}



// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ⭐ เพิ่ม Interface เหล่านี้
interface SequenceDetailForAsset {
    id: number;
    sequence_name: string;
    status: string;
    description: string;
    created_at: string;
    linked_at?: string;
}

interface ShotDetailForAsset {
    id: number;
    shot_name: string;
    status: string;
    description: string;
    created_at: string;
}

interface AssetSequence {
    id: number; // ID of the asset-sequence link
    sequence_id: number;
    sequence_name: string;
    sequence_description: string;
    sequence_status: string;
    sequence_created_at: string;
    sequence_file_url: string;
    linked_at: string;
}

interface AssetDetail {
    asset_id: string;
    asset_name: string;
    asset_description: string;
    asset_status: string;
    asset_created_at: string;
    asset_thumbnail: string;
    sequence: SequenceDetailForAsset | null;
    shot: ShotDetailForAsset | null;
}


interface AssetShot {
    id: number; // ID ของ asset_shots link
    shot_id: number;
    shot_name: string;
    shot_description: string;
    shot_status: string;
    shot_created_at: string;
    shot_file_url: string;
    linked_at: string;
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
    const [showAssetTypeDropdown, setShowAssetTypeDropdown] = useState(false);
    const [assetType, setAssetType] = useState('');
    const [newAssetType, setNewAssetType] = useState('');

    // Form states for creating new asset
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetDescription, setNewAssetDescription] = useState('');
    const [newAssetTaskTemplate, setNewAssetTaskTemplate] = useState('');
    const [taskTemplate, setTaskTemplate] = useState('');
    const [showSequenceDropdown, setShowSequenceDropdown] = useState(false);
    const [showShotDropdown, setShowShotDropdown] = useState(false);
    const [sequenceInput, setSequenceInput] = useState('');
    const [shotInput, setShotInput] = useState('');

    // Asset detail panel states
    const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
    const [isLoadingAssetDetail, setIsLoadingAssetDetail] = useState(false);
    const [assetSequences, setAssetSequences] = useState<AssetSequence[]>([]);
    const [showAddSequenceDropdown, setShowAddSequenceDropdown] = useState(false);
    const [addSequenceInput, setAddSequenceInput] = useState('');



    const [allProjectShots, setAllProjectShots] = useState<Shot[]>([]);
    const [assetShots, setAssetShots] = useState<AssetShot[]>([]);
    const [showAddShotDropdown, setShowAddShotDropdown] = useState(false);
    const [addShotInput, setAddShotInput] = useState('');


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

    const type_assets = [
        "Character",
        "Environment",
        "Prop",
        "FX",
        "Graphic",
        "Matte Painting",
        "Vehicle",
        "Weapon",
        "Model",
        "Theme",
        "Zone",
        "Part"
    ];

    // 1. เพิ่ม useEffect สำหรับดึง shots เมื่อมี sequences
    useEffect(() => {
        if (sequences.length > 0) {
            fetchAllProjectShots();
        }
    }, [sequences]); // ⭐ เพิ่ม dependency

    // 2. แก้ไข useEffect สำหรับโหลด shots ตอน mount
    useEffect(() => {
        fetchAssets();
        fetchSequences();
    }, []);




    // Close dropdown when clicking outside
    useEffect(() => {
        const closeDropdown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.relative')) {
                setShowAddShotDropdown(false);
            }
        };

        if (showAddShotDropdown) {
            document.addEventListener("mousedown", closeDropdown);
            return () => document.removeEventListener("mousedown", closeDropdown);
        }
    }, [showAddShotDropdown]);

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

            setExpandedCategories(categoriesToExpand);

            // Sync selected asset
            syncSelectedAssetThumbnail(data);

        } catch (error) {
            console.error('❌ Error fetching assets:', error);
            alert('Failed to fetch assets');
        } finally {
            setIsLoading(false);
        }
    };


    // frontend: Project_Assets.tsx
    const fetchAllProjectShots = async () => {
        try {
            const projectData = getProjectData();

            if (!projectData?.projectId) {
                console.log("❌ No projectId found");
                setAllProjectShots([]);
                return;
            }

            console.log(`📤 Calling GET_ALL_PROJECT_SHOTS for projectId: ${projectData.projectId}`);

            // เรียก API เพื่อดึง shots ทั้งหมดจาก project_shots table
            const { data } = await axios.post(ENDPOINTS.GET_ASSET_SHOTS_JOIN, {
                projectId: projectData.projectId
            });

            console.log('📊 API Response from GET_ALL_PROJECT_SHOTS:', data);

            if (Array.isArray(data)) {
                console.log(`✅ Loaded ${data.length} shots from database`);
                setAllProjectShots(data);
            } else {
                console.error('❌ API response is not an array:', data);
                setAllProjectShots([]);
            }

        } catch (error: unknown) {
            console.error('❌ Error in fetchAllProjectShots:');

            if (axios.isAxiosError(error)) {
                console.error('Axios Error:', error.message);
                console.error('Response:', error.response?.data);
            }

            setAllProjectShots([]);
        }
    };
    // ใช้ console.log ดูโครงสร้างข้อมูล
    const fetchAssetShots = async (assetId: string) => {
        try {
            console.log('🟡 Fetching asset shots for assetId:', assetId);
            const res = await axios.post(ENDPOINTS.GET_ASSET_SHOTS_JOIN, { assetId });

            console.log('📊 Raw API Response:', res.data);
            console.log('📊 Data type:', typeof res.data);
            console.log('📊 Is Array?', Array.isArray(res.data));
            console.log('📊 Length:', Array.isArray(res.data) ? res.data.length : 'N/A');

            if (Array.isArray(res.data)) {
                console.log('✅ First item structure:', res.data[0]);
                setAssetShots(res.data);
            } else if (res.data && Array.isArray(res.data.data)) {
                // กรณี API ส่งกลับเป็น { data: [...] }
                console.log('✅ Data is nested in data property');
                setAssetShots(res.data.data);
            } else if (res.data && res.data.shots) {
                // กรณี API ส่งกลับเป็น { shots: [...] }
                console.log('✅ Data is nested in shots property');
                setAssetShots(res.data.shots);
            } else {
                console.warn('⚠️ Invalid shots data format:', res.data);
                setAssetShots([]);
            }
        } catch (error) {
            console.error('❌ Error fetching asset shots:', error);
            console.error('❌ Error details:');
            setAssetShots([]);
        }
    };

    // ⭐ เพิ่ม shot ให้ asset
    const handleAddShotToAsset = async (shotId: number) => {
        if (!selectedAssetForDetail) return;

        try {
            const linkRes = await fetch(ENDPOINTS.ADD_ASSET_TO_SHOT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    shotId: shotId,
                    assetId: selectedAssetForDetail.id
                })
            });

            if (linkRes.ok) {
                console.log('✅ Shot added to asset successfully');
                // รีเฟรช shots
                fetchAssetShots(selectedAssetForDetail.id);
                setAddShotInput('');
                setShowAddShotDropdown(false);
            } else {
                console.error('❌ Failed to add shot to asset');
            }
        } catch (err) {
            console.error('Error adding shot to asset:', err);
        }
    };


    // ⭐ ลบ shot จาก asset
    const handleRemoveShotFromAsset = async (assetShotId: number) => {
        if (!selectedAssetForDetail) return;

        console.log('🗑️ Attempting to remove shot with assetShotId:', assetShotId);

        try {
            const res = await fetch(ENDPOINTS.REMOVE_ASSET_FROM_SHOT, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assetShotId })
            });

            console.log('Response status:', res.status);
            const responseData = await res.json();
            console.log('Response data:', responseData);

            if (res.ok) {
                console.log('✅ Shot removed from asset successfully');
                // รีเฟรช shots
                fetchAssetShots(selectedAssetForDetail.id);
            } else {
                console.error('❌ Failed to remove shot from asset');
            }
        } catch (err) {
            console.error('Error removing shot from asset:', err);
        }
    };

    // ⭐ กรอง shots ที่ยังไม่ได้เพิ่ม
    const filteredAddShots = allProjectShots.filter(shot =>
        shot.shot_name.toLowerCase().includes(addShotInput.toLowerCase()) &&
        !assetShots.some((assetShot: AssetShot) => assetShot.shot_id === shot.id)
    );

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
                file_url: asset.file_url || "",
                sequence: assetData[categoryIndex].category
            };

            localStorage.setItem(
                "selectedAsset",
                JSON.stringify(selectedAssetData)
            );

            console.log('✅ Selected asset:', selectedAssetData);

            setSelectedAsset({ categoryIndex, assetIndex });
            navigate('/Project_Assets/Others_Asset');
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
    const filteredAssetTypes = type_assets.filter(type =>
        type.toLowerCase().includes(assetType.toLowerCase())
    );

    const filteredAddSequences = sequences.filter(seq =>
        seq.sequence_name.toLowerCase().includes(addSequenceInput.toLowerCase()) &&
        !assetSequences.some((assetSeq: AssetSequence) => assetSeq.sequence_id === seq.id)
    );

    const handleAssetTypeSelect = (type: string) => {
        setAssetType(type);
        setNewAssetType(type);
        setShowAssetTypeDropdown(false);
    };

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

    const updateAsset = async (categoryIndex: number, assetIndex: number, field: string, value: string) => {
        try {
            const asset = assetData[categoryIndex].assets[assetIndex];

            await axios.post(ENDPOINTS.UPDATEASSET, {
                assetId: asset.id,
                field: field,
                value: value
            });

            // Update local state
            const newData = [...assetData];
            if (field === 'description') {
                newData[categoryIndex].assets[assetIndex].description = value;
            }
            setAssetData(newData);

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

            const { data } = await axios.post(ENDPOINTS.CREATEASSETS, {
                projectId: projectData?.projectId,
                assetName: newAssetName,
                description: newAssetDescription,
                taskTemplate: newAssetTaskTemplate || null,
                type: newAssetType || null,
                sequenceId: selectedSequence?.id,
                shotId: selectedShot?.id,

            });

            console.log('✅ Asset created successfully', data);

            if (newAssetTaskTemplate && newAssetTaskTemplate.trim() !== '') {

                console.log("Not A");

                let typeNum: number | null = null;

                if (newAssetTaskTemplate === "Automotive - Concept") typeNum = 0;
                else if (newAssetTaskTemplate === "Automotive - Part") typeNum = 1;
                else if (newAssetTaskTemplate === "Automotive - Theme") typeNum = 2;
                else if (newAssetTaskTemplate === "Film VFX - Character Asset") typeNum = 3;
                else if (newAssetTaskTemplate === "Film VFX - General Asset") typeNum = 4;
                else if (newAssetTaskTemplate === "Games - Large Prop") typeNum = 5;
                else if (newAssetTaskTemplate === "Games - Medium Prop") typeNum = 6;
                else if (newAssetTaskTemplate === "Games - Small Prop") typeNum = 7;

                if (typeNum !== null) {
                    await axios.post(ENDPOINTS.CREATE_TASK_ASSET, {
                        projectId: projectData?.projectId,
                        entity_type: "asset",
                        entity_id: data.assetId,
                        typeNum: typeNum,
                    });
                } else {
                    console.warn("Unknown template:", newAssetTaskTemplate);
                }

            }

            setNewAssetName('');
            setNewAssetDescription('');
            setNewAssetTaskTemplate('');
            setSelectedSequence(null);
            setSelectedShot(null);
            setSequenceInput('');
            setShotInput('');
            setTaskTemplate('');
            setAssetType('');
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
                        file_url: found.file_url || ""
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

    // ⭐ ฟังก์ชันดึงข้อมูล asset detail
    const fetchAssetDetail = async (assetId: string) => {
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

    // ⭐ ฟังก์ชันดึง sequences ที่เชื่อมกับ asset
    const fetchAssetSequences = async (assetId: string) => {
        try {
            const res = await axios.post(ENDPOINTS.GET_ASSET_SEQUENCES_JOIN, { assetId });
            console.log('📋 Asset sequences data:', res.data);
            setAssetSequences(res.data);
        } catch (err) {
            console.error('Error fetching asset sequences:', err);
            setAssetSequences([]);
        }
    };

    // ⭐ ฟังก์ชันเพิ่ม sequence ให้ asset
    const handleAddSequenceToAsset = async (sequenceId: number) => {
        if (!selectedAssetForDetail) return;

        try {
            const linkRes = await fetch(ENDPOINTS.ADD_ASSET_TO_SEQUENCE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sequenceId: sequenceId,
                    assetId: selectedAssetForDetail.id
                })
            });

            if (linkRes.ok) {
                console.log('✅ Sequence added to asset successfully');
                // รีเฟรช sequences
                fetchAssetSequences(selectedAssetForDetail.id);
                setAddSequenceInput('');
                setShowAddSequenceDropdown(false);
            } else {
                console.error('❌ Failed to add sequence to asset');
            }
        } catch (err) {
            console.error('Error adding sequence to asset:', err);
        }
    };

    // ⭐ ฟังก์ชันลบ sequence จาก asset
    const handleRemoveSequenceFromAsset = async (assetSequenceId: number) => {
        if (!selectedAssetForDetail) return;

        console.log('🗑️ Attempting to remove sequence with assetSequenceId:', assetSequenceId);
        const requestBody = { assetSequenceId };
        console.log('📤 Sending request body:', requestBody);
        console.log('📤 JSON stringified:', JSON.stringify(requestBody));

        try {
            const res = await fetch(ENDPOINTS.REMOVE_ASSET_FROM_SEQUENCE, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', res.status);
            const responseData = await res.json();
            console.log('Response data:', responseData);

            if (res.ok) {
                console.log('✅ Sequence removed from asset successfully');
                // รีเฟรช sequences
                fetchAssetSequences(selectedAssetForDetail.id);
            } else {
                console.error('❌ Failed to remove sequence from asset');
            }
        } catch (err) {
            console.error('Error removing sequence from asset:', err);
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

    // Close add sequence dropdown when clicking outside
    useEffect(() => {
        const closeDropdown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // ตรวจสอบว่าไม่ได้คลิกใน dropdown หรือ input
            if (!target.closest('.relative')) {
                setShowAddSequenceDropdown(false);
            }
        };

        if (showAddSequenceDropdown) {
            document.addEventListener("mousedown", closeDropdown);
            return () => document.removeEventListener("mousedown", closeDropdown);
        }
    }, [showAddSequenceDropdown]);




    // ยืนยันการลบ sequence ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    const [deleteConfirm, setDeleteConfirm] = useState<{
        assetId: string;
        asset_name: string;
    } | null>(null);

    const handleDeleteAsset = async (assetId: string) => {
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
        setAssetType('');
        setNewAssetType('');
        setSelectedSequence(null);
        setSelectedShot(null);
        setSequenceInput('');
        setShotInput('');
        setShots([]);
        setShowTemplateDropdown(false);
        setShowAssetTypeDropdown(false);
        setShowSequenceDropdown(false);
        setShowShotDropdown(false);
    };

    // เพิ่ม state ใหม่
    const [allAssetShots, setAllAssetShots] = useState<Record<string, AssetShot[]>>({});

    // เพิ่มฟังก์ชันดึง shots สำหรับ asset เฉพาะ
    const fetchShotsForAsset = async (assetId: string) => {
        try {
            const res = await axios.post(ENDPOINTS.GET_ASSET_SHOTS_JOIN, { assetId });
            if (Array.isArray(res.data)) {
                setAllAssetShots(prev => ({
                    ...prev,
                    [assetId]: res.data
                }));
            }
        } catch (error) {
            console.error('Error fetching shots for asset:', assetId, error);
        }
    };

    // เรียกใช้ในตอนโหลดข้อมูล assets
    useEffect(() => {
        if (assetData.length > 0) {
            assetData.forEach(category => {
                category.assets.forEach(asset => {
                    fetchShotsForAsset(asset.id);
                });
            });
        }
    }, [assetData.length]);



    return (
        <div className="h-screen flex flex-col bg-gray-900">
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

            <main className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                        <p className="text-gray-400 text-sm">Loading assets...</p>
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
                    <div className="max-w-full mx-auto">
                        {/* Table Header */}
                        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 mb-2">
                            <div className="flex items-center gap-6 px-5 py-3">
                                <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Thumbnail</span>
                                </div>
                                <div className="w-44 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset Name</span>
                                </div>
                                <div className="w-44 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</span>
                                </div>
                                <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                                </div>
                                <div className="flex-1 flex-shrink-0  border-r border-gray-700/50 pr-4" >
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                                </div>
                                <div className="flex-1 min-w-0  border-r border-gray-700/50 pr-4">
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shots</span>
                                </div>
                            </div>
                        </div>

                        {/* Table Body - Grouped by Category */}
                        <div className="space-y-4">
                            {assetData.map((category, categoryIndex) => (
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

                                    {/* Category Assets */}
                                    {expandedCategories.includes(category.category) && (
                                        <div className="space-y-1">
                                            {category.assets.map((asset, assetIndex) => (
                                                <div
                                                    key={asset.id}
                                                    onClick={(e) => {
                                                        // ⭐ ป้องกัน navigate ถ้าคลิกที่ input/button/textarea
                                                        const target = e.target as HTMLElement;
                                                        if (
                                                            target.tagName === 'INPUT' ||
                                                            target.tagName === 'TEXTAREA' ||
                                                            target.tagName === 'BUTTON' ||
                                                            target.closest('button') ||
                                                            target.closest('input') ||
                                                            target.closest('textarea')
                                                        ) {
                                                            return;
                                                        }

                                                        // ⭐ เรียกใช้ handleAssetClick
                                                        handleAssetClick(categoryIndex, assetIndex);
                                                    }}
                                                    onContextMenu={(e) => handleContextMenu(e, asset)}
                                                    className={`group cursor-pointer rounded-md transition-all duration-150 border ${isSelected(categoryIndex, assetIndex)
                                                        ? 'bg-blue-900/30 border-l-4 border-blue-500 border-r border-t border-b border-blue-500/30'
                                                        : 'bg-gray-800/40 hover:bg-gray-800/70 border-l-4 border-transparent border-r border-t border-b border-gray-700/30'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-6 px-4 py-2.5">
                                                        {/* Thumbnail */}
                                                        <div className="w-28 flex-shrink-0 border-r border-gray-700/50 pr-4">
                                                            <div className="relative w-full h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded overflow-hidden shadow-sm">
                                                                {/* ⭐ ลบ onClick ออกจาก thumbnail */}
                                                                {asset.file_url ? (
                                                                    asset.file_url.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                                                                        <video
                                                                            src={ENDPOINTS.image_url + asset.file_url}
                                                                            className="w-full h-full object-cover"
                                                                            muted
                                                                            loop
                                                                            autoPlay
                                                                        />
                                                                    ) : (
                                                                        <img
                                                                            src={ENDPOINTS.image_url + asset.file_url}
                                                                            alt={asset.asset_name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    )
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900">
                                                                        <Image className="w-4 h-4 text-gray-500" />
                                                                        <p className="text-gray-500 text-[9px]">No Image</p>
                                                                    </div>
                                                                )}

                                                                {/* Hover Overlay */}
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40">
                                                                    <div className="w-7 h-7 bg-white/25 backdrop-blur-sm rounded-full flex items-center justify-center">
                                                                        <Eye className="w-3.5 h-3.5 text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Asset Name */}
                                                        <div
                                                            onClick={(e) => handleFieldClick('asset_name', categoryIndex, assetIndex, e)}
                                                            className="w-44 flex-shrink-0 px-2 py-1 cursor-text border-r border-gray-700/50 pr-4"
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
                                                                    className="w-full text-sm font-medium text-gray-100 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <h3 className="text-sm font-medium text-gray-100 truncate border border-gray-500/20 hover:bg-gray-700 rounded">
                                                                    {asset.asset_name}
                                                                </h3>
                                                            )}
                                                        </div>

                                                        {/* Type */}
                                                        <div className="w-44 flex-shrink-0 px-2 py-1 rounded cursor-text border-r border-gray-700/50 pr-4">
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                                                                <span className="text-xs text-purple-300 font-medium whitespace-nowrap truncate" title={category.category}>
                                                                    {category.category}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Status */}
                                                        <div className="w-28 flex-shrink-0 relative border-r border-gray-700/50 pr-4">
                                                            <button
                                                                onClick={(e) => handleFieldClick('status', categoryIndex, assetIndex, e)}
                                                                className="flex w-full items-center gap-2 px-3 py-1.5 rounded-xl transition-colors bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
                                                            >
                                                                {statusConfig[asset.status].icon === '-' ? (
                                                                    <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
                                                                ) : (
                                                                    <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[asset.status].color} shadow-sm`}></div>
                                                                )}
                                                                <span className="text-xs text-gray-300 font-medium truncate">
                                                                    {statusConfig[asset.status].label}
                                                                </span>
                                                            </button>

                                                            {/* Status Dropdown */}
                                                            {showStatusMenu?.categoryIndex === categoryIndex &&
                                                                showStatusMenu?.assetIndex === assetIndex && (
                                                                    <div className={`absolute left-0 ${statusMenuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-gray-800 rounded-lg shadow-2xl z-50 min-w-[180px] border border-gray-600 whitespace-nowrap`}>
                                                                        {(Object.entries(statusConfig) as [StatusType, { label: string; fullLabel: string; color: string; icon: string }][]).map(([key, config]) => (
                                                                            <button
                                                                                key={key}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleStatusChange(categoryIndex, assetIndex, key);
                                                                                }}
                                                                                className="flex items-center gap-5 w-full px-3 py-2 first:rounded-t-lg last:rounded-b-lg text-left transition-colors bg-gradient-to-r from-gray-800 to-gray-600 hover:from-gray-700 hover:to-gray-500"
                                                                            >
                                                                                {config.icon === '-' ? (
                                                                                    <span className="text-gray-400 font-bold w-2 text-center">-</span>
                                                                                ) : (
                                                                                    <div className={`w-2.5 h-2.5 rounded-full ${config.color}`}></div>
                                                                                )}
                                                                                <div className="text-xs text-gray-200 flex items-center gap-5">
                                                                                    <span className="inline-block w-8">{config.label}</span>
                                                                                    <span>{config.fullLabel}</span>
                                                                                </div>
                                                                                {asset.status === key && (
                                                                                    <Check className="w-4 h-4 text-blue-400 ml-auto" />
                                                                                )}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                        </div>

                                                        {/* Description */}
                                                        <div
                                                            onClick={(e) => handleFieldClick('description', categoryIndex, assetIndex, e)}
                                                            className="flex-1 min-w-0 px-2 py-1 cursor-text border-r border-gray-700/50"
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
                                                                    rows={1}
                                                                    className="w-full text-xs text-gray-200 bg-gray-600 border border-blue-500 rounded px-2 py-1 outline-none resize-none"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <p className="text-xs text-gray-400 line-clamp-1 leading-relaxed border border-gray-500/20 hover:bg-gray-700 rounded" title={asset.description}>
                                                                    {asset.description || '\u00A0'}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Shots */}
                                                        <div className="flex-1 min-w-0 px-2 py-1">
                                                            {(() => {
                                                                const currentAssetShots = allAssetShots[asset.id] || [];

                                                                return currentAssetShots.length > 0 ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {currentAssetShots.length <= 2 ? (
                                                                            <div className="flex-1 flex items-center gap-1.5">
                                                                                {currentAssetShots.map((shot) => (
                                                                                    <div
                                                                                        key={shot.shot_id}
                                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30"
                                                                                        title={shot.shot_description || shot.shot_name}
                                                                                    >
                                                                                        <span className="text-xs text-gray-300 font-medium whitespace-nowrap">
                                                                                            {shot.shot_name}
                                                                                        </span>
                                                                                        {shot.shot_status === 'fin' && (
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                                        )}
                                                                                        {shot.shot_status === 'ip' && (
                                                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-md">
                                                                                    <Box className="w-3.5 h-3.5 text-green-400" />
                                                                                    <span className="text-xs font-semibold text-green-300">
                                                                                        {currentAssetShots.length}
                                                                                    </span>
                                                                                </div>

                                                                                <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
                                                                                    {currentAssetShots.slice(0, 2).map((shot) => (
                                                                                        <div
                                                                                            key={shot.shot_id}
                                                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700/40 rounded-md border border-gray-600/30 flex-shrink-0"
                                                                                            title={shot.shot_description || shot.shot_name}
                                                                                        >
                                                                                            <span className="text-xs text-gray-300 font-medium whitespace-nowrap max-w-[80px] truncate">
                                                                                                {shot.shot_name}
                                                                                            </span>
                                                                                            {shot.shot_status === 'fin' && (
                                                                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></div>
                                                                                            )}
                                                                                            {shot.shot_status === 'ip' && (
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
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedAssetForDetail(asset);
                                                                            fetchAssetDetail(asset.id);
                                                                            fetchAssetSequences(asset.id);
                                                                            fetchAssetShots(asset.id);
                                                                            setShowAssetDetailPanel(true);
                                                                        }}
                                                                        className="bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600 rounded-md transition-all group flex items-center gap-1 px-2 py-1"
                                                                        title="Add shots"
                                                                    >
                                                                        <span className="text-xs text-gray-400/70 group-hover:text-gray-400 font-medium transition-colors">
                                                                            No shots - Click to Add
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
            {showAssetTypeDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAssetTypeDropdown(false)}
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

                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6 space-y-5">

                            {/* Asset Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-300">
                                    Asset Name
                                    <span className="text-red-400 ml-1">*</span>

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
                            {/* Asset Type */}
                            <div className="space-y-2 relative">
                                <label className="block text-sm font-medium text-gray-300">
                                    Asset Type
                                </label>
                                <input
                                    type="text"
                                    value={assetType}
                                    onChange={(e) => {
                                        setAssetType(e.target.value);
                                        setShowAssetTypeDropdown(true);
                                    }}
                                    onFocus={() => setShowAssetTypeDropdown(true)}
                                    placeholder="Type to search asset types..."
                                    className="w-full h-10 px-4 bg-[#0a1018] border border-blue-500/30 rounded-lg text-blue-50 text-sm placeholder-blue-400/40 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400 transition-all"
                                />

                                {showAssetTypeDropdown && filteredAssetTypes.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredAssetTypes.map((type) => (
                                            <div
                                                key={type}
                                                onClick={() => handleAssetTypeSelect(type)}
                                                className="px-4 py-2.5 hover:bg-blue-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg text-gray-300 text-sm"
                                            >
                                                {type}
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


                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-gradient-to-r from-[#0a1018] to-[#0d1420] border-t border-blue-500/30 flex justify-between items-center">

                            <button
                                onClick={handleAssetModalClose}
                                className="px-6 h-10 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-700 hover:to-gray-700 text-sm rounded-lg text-gray-200 transition-all font-medium"
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
                            fetchAssetSequences(contextMenu.asset.id); // ⭐ เพิ่มบรรทัดนี้
                            fetchAssetShots(contextMenu.asset.id);
                            setShowAssetDetailPanel(true);
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-300 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
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
                        className="w-full px-4 py-2 text-left text-red-400 flex items-center gap-2 text-sm bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-700"
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
                            setAssetSequences([]); // ⭐ เพิ่มบรรทัดนี้
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
                                        setAssetSequences([]); // ⭐ เพิ่มบรรทัดนี้
                                    }}
                                    className="w-9 h-9 rounded-lg text-gray-300 hover:text-white transition-all duration-200 flex items-center justify-center flex-shrink-0 group bg-gradient-to-r from-red-700 to-red-600 hover:from-red-500 hover:to-red-500"
                                >
                                    <span className="text-lg group-hover:scale-110 transition-transform ">✕</span>
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
                                        {editingField?.field === 'shot_detail_description' ? (
                                            <textarea
                                                value={assetDetail.asset_description}
                                                onChange={e => setAssetDetail(sd => sd ? { ...sd, asset_description: e.target.value } : sd)}
                                                onBlur={async () => {
                                                    const catIdx = assetData.findIndex(cat =>
                                                        cat.assets.some(s => s.id === assetDetail.asset_id)
                                                    );
                                                    const assetIdx = catIdx !== -1
                                                        ? assetData[catIdx].assets.findIndex(s => s.id === assetDetail.asset_id)
                                                        : -1;
                                                    if (catIdx !== -1 && assetIdx !== -1) {
                                                        await updateAsset(catIdx, assetIdx, 'description', assetDetail.asset_description);
                                                    }
                                                    setEditingField(null);
                                                }}
                                                onKeyDown={async e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        const catIdx = assetData.findIndex(cat =>
                                                            cat.assets.some(s => s.id === assetDetail.asset_id)
                                                        );
                                                        const assetIdx = catIdx !== -1
                                                            ? assetData[catIdx].assets.findIndex(s => s.id === assetDetail.asset_id)
                                                            : -1;
                                                        if (catIdx !== -1 && assetIdx !== -1) {
                                                            await updateAsset(catIdx, assetIdx, 'description', assetDetail.asset_description);
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
                                                onClick={() => setEditingField({ field: 'shot_detail_description', categoryIndex: -1, assetIndex: -1 })}
                                            >
                                                {assetDetail.asset_description || "No description"}
                                            </p>
                                        )}
                                    </div>

                                    {/* Sequence Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-medium text-gray-300">
                                                Sequence ({assetSequences.length})
                                            </h4>
                                        </div>

                                        {/* Add Sequence Input */}
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={addSequenceInput}
                                                    onChange={(e) => {
                                                        setAddSequenceInput(e.target.value);
                                                        setShowAddSequenceDropdown(true);
                                                    }}
                                                    onFocus={() => setShowAddSequenceDropdown(true)}
                                                    onClick={(e) => e.stopPropagation()} // ⭐ เพิ่มบรรทัดนี้
                                                    placeholder="Type sequence name..."
                                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // ⭐ เพิ่มบรรทัดนี้
                                                        if (addSequenceInput.trim()) {
                                                            const sequence = sequences.find(seq =>
                                                                seq.sequence_name.toLowerCase() === addSequenceInput.toLowerCase().trim()
                                                            );
                                                            if (sequence) {
                                                                handleAddSequenceToAsset(sequence.id);
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-sm text-white transition-colors bg-gradient-to-r from-purple-800 to-purple-800 hover:from-purple-700 hover:to-purple-700"
                                                >
                                                    + Add
                                                </button>
                                            </div>

                                            {showAddSequenceDropdown && filteredAddSequences.length > 0 && (
                                                <div
                                                    className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-h-48 overflow-y-auto"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {filteredAddSequences.map((seq) => (
                                                        <div
                                                            key={seq.id}
                                                            onClick={() => handleAddSequenceToAsset(seq.id)}
                                                            className="px-4 py-2.5 hover:bg-purple-500/20 hover:text-white cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg text-gray-300 text-sm flex justify-between items-center"
                                                        >
                                                            <span>{seq.sequence_name}</span>
                                                            {seq.description && <span className="text-gray-400 text-xs ml-2">{seq.description}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Sequence Tag */}
                                        <div className="flex flex-wrap gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                            {assetSequences.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic">No sequence assigned</p>
                                            ) : (
                                                assetSequences.map((seq) => (
                                                    <div
                                                        key={seq.sequence_id}
                                                        onClick={() => setExpandedItem({ type: "sequence", id: seq.sequence_id })}
                                                        className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "sequence" && expandedItem?.id === seq.sequence_id
                                                            ? "bg-purple-500/80 text-white border-purple-400 shadow-lg shadow-purple-500/50"
                                                            : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{seq.sequence_name}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${seq.sequence_status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                            seq.sequence_status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-white/20 text-white/80'
                                                            }`}>
                                                            {seq.sequence_status === 'fin' ? 'Final' :
                                                                seq.sequence_status === 'ip' ? 'In Progress' :
                                                                    'Waiting'}
                                                        </span>
                                                        {/* TODO: เชื่อม API ลบ sequence assignment ในอนาคต */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                console.log('🖱️ Clicked remove button for sequence:', seq);
                                                                console.log('Sequence id:', seq.id);
                                                                handleRemoveSequenceFromAsset(seq.id);
                                                            }}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "sequence" && expandedItem?.id === seq.sequence_id
                                                                ? "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-500 hover:to-gray-500"
                                                                : "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-red-500 hover:to-red-500"
                                                                }`}
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
                                                Shots ({assetShots.length})
                                            </h4>
                                        </div>

                                        {/* Add Shot Dropdown */}
                                        <div className="relative">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search and select shot..."
                                                    value={addShotInput}
                                                    onChange={(e) => {
                                                        setAddShotInput(e.target.value);
                                                        setShowAddShotDropdown(true);
                                                    }}
                                                    onFocus={() => setShowAddShotDropdown(true)}
                                                    onClick={(e) => e.stopPropagation()} // ⭐ เพิ่มบรรทัดนี้
                                                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500"
                                                />
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // ⭐ เพิ่มบรรทัดนี้
                                                        setShowAddShotDropdown(!showAddShotDropdown);
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-sm text-white transition-colors flex items-center gap-1 bg-gradient-to-r from-green-700 to-green-700 hover:from-green-600 hover:to-green-600"
                                                >
                                                    <span>+ Add</span>
                                                </button>
                                            </div>

                                            {/* Dropdown List */}
                                            {showAddShotDropdown && (
                                                <>
                                                    {/* Backdrop */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => {
                                                            setShowAddShotDropdown(false);
                                                            setAddShotInput("");
                                                        }}
                                                    />

                                                    {/* Dropdown */}
                                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20">
                                                        {filteredAddShots.length === 0 ? (
                                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                                {addShotInput
                                                                    ? "No matching shots found"
                                                                    : allProjectShots.length === 0
                                                                        ? "No available shots in this project"
                                                                        : "All shots already added"}
                                                            </div>
                                                        ) : (
                                                            filteredAddShots.map(shot => (
                                                                <button
                                                                    key={shot.id}
                                                                    onClick={() => handleAddShotToAsset(shot.id)}
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
                                                                        <span className="text-xs text-gray-500 group-hover:text-green-400 font-medium">+ Add</span>
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
                                            {assetShots.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic w-full text-center py-2">No shots linked yet</p>
                                            ) : (
                                                assetShots.map(shot => (
                                                    <div
                                                        key={shot.shot_id}
                                                        onClick={() => setExpandedItem({ type: "shot", id: shot.shot_id })}
                                                        className={`group flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer transition-all border-2 backdrop-blur-sm ${expandedItem?.type === "shot" && expandedItem?.id === shot.shot_id
                                                            ? "bg-blue-500/80 text-white border-blue-400 shadow-lg shadow-blue-500/50"
                                                            : "bg-gray-700/60 text-gray-200 border-gray-600/50 hover:bg-gray-600/80 hover:border-gray-500"
                                                            }`}
                                                    >
                                                        <span className="text-sm font-medium">{shot.shot_name}</span>

                                                        {/* ⭐ Status Badge */}
                                                        <span className={`text-xs px-2 py-0.5 rounded ${shot.shot_status === 'fin' ? 'bg-green-500/20 text-green-400' :
                                                            shot.shot_status === 'ip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-white/20 text-white/80'
                                                            }`}>
                                                            {shot.shot_status === 'fin' ? 'Final' :
                                                                shot.shot_status === 'ip' ? 'In Progress' :
                                                                    'Waiting'}
                                                        </span>

                                                        {/* ⭐ ปุ่มลบ shot */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveShotFromAsset(shot.id);
                                                            }}
                                                            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${expandedItem?.type === "shot" && expandedItem?.id === shot.shot_id
                                                                ? "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-500 hover:to-gray-500"
                                                                : "hover:rotate-90 bg-gradient-to-r from-gray-800 to-gray-800 hover:from-red-500 hover:to-red-500"
                                                                }`}
                                                            title="Remove from asset"
                                                        >
                                                            <span className="text-sm font-bold">×</span>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>



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