import { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ENDPOINTS from "../config";
import { ChevronDown } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    status: string;
    lastModified: string;
    createdAt: string;
    createdBy: string;
    description: string;
    image?: string;
    creatorUid?: string;
    username?: string;
    permissionGroup?: string;
}

interface ProjectApiData {
    projectId?: string;
    id?: string;
    projectName: string;
    createdAt: string;
    createdBy?: string;
    description?: string;
    status?: string;
    username?: string;
    permissionGroup?: string;
}

export default function Home() {
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [loading, setLoading] = useState(false);
    const [projectData, setProjectData] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [error, setError] = useState("");
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
    const [permission, setPermission] = useState<string | null>(null);

    const canDeleteProject = ["Owner", "Admin"].includes(permission ?? "");

    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        projectId: string;
    } | null>(null);

    const [showMyProjects,] = useState(true);
    const [showSharedProjects,] = useState(true);

    const templates = [
        { id: 1, name: 'Animation', subtitle: 'Template' },
        { id: 2, name: 'Automotive', subtitle: 'Design Template' },
        { id: 3, name: 'Episodic TV', subtitle: 'Template' },
        { id: 4, name: 'Film VFX', subtitle: 'Template' }
    ];

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        if (contextMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [contextMenu]);

    const getAuthUser = () => {
        try {
            const authUserString = localStorage.getItem("authUser");
            if (!authUserString || authUserString === "undefined" || authUserString === "null") {
                return null;
            }
            return JSON.parse(authUserString);
        } catch (error) {
            console.error("Error parsing authUser:", error);
            return null;
        }
    };

    const fetchProjectImages = async (projects: Project[]) => {
        if (!projects.length) {
            // console.log("⚠️ No projects to fetch images for");
            return;
        }

        try {
            const projectIds = projects.map(p => p.id).join(',');
            console.log("🔍 Requesting images for projects:", projectIds);

            const { data } = await axios.get(ENDPOINTS.GETPROJECTIMAGES, {
                params: { projectIds }
            });

            // console.log("📦 Received image data:", data);
            const imagesByProject = data.images as Record<string, Array<{ url: string }>>;
            // console.log("🖼️ Images by project:", imagesByProject);

            setProjectData(prev =>
                prev.map(p => {
                    const projectImages = imagesByProject[p.id];
                    const newImage = projectImages?.[0]?.url;

                    if (newImage) {
                        // console.log(`✅ Project ${p.id} (${p.name}): Found image ${newImage}`);
                    } else {
                        // console.log(`⚠️ Project ${p.id} (${p.name}): No image found`);
                    }

                    return newImage && newImage !== p.image
                        ? { ...p, image: newImage }
                        : p;
                })
            );

            // console.log("✅ Project images updated:", Object.keys(imagesByProject).length);

        } catch (err) {
            console.error("❌ Error fetching project images:", err);
            if (axios.isAxiosError(err)) {
                console.error("Response:", err.response?.data);
                console.error("Status:", err.response?.status);
            }
        }
    };

    const fetchProjects = async () => {
        setLoadingProjects(true);

        try {
            const authUser = getAuthUser();
            const currentUserUid = authUser?.id ?? authUser?.uid;

            // console.log("📋 Fetching projects for user:", currentUserUid);

            const { data } = await axios.post<{ projects: ProjectApiData[] }>(
                ENDPOINTS.PROJECTLIST,
                { created_by: currentUserUid }
            );

            console.log("📦 Raw API response:", data.projects);

            const allProjects: Project[] = data.projects.map(p => {
                const creatorUid = p.createdBy;
                return {
                    id: p.projectId ?? p.id ?? "",
                    name: p.projectName,
                    status: p.status ?? "Active",
                    lastModified: new Date(p.createdAt).toLocaleDateString("en-CA"),
                    createdBy: p.createdBy ?? "Unknown",
                    createdAt: p.createdAt,
                    description: p.description ?? "No description",
                    image: undefined,
                    creatorUid: creatorUid,
                    username: p.username || "",
                    permissionGroup: p.permissionGroup,

                };

            });

            console.log("✅ Processed projects:", allProjects.length);

            const myProjects = allProjects.filter(p => p.creatorUid === currentUserUid);
            const sharedProjects = allProjects.filter(p => p.creatorUid !== currentUserUid);

            console.log(`📊 My projects: ${myProjects.length}, Shared projects: ${sharedProjects.length}`);

            const sortedProjects = [...myProjects, ...sharedProjects];
            setProjectData(sortedProjects);

            if (sortedProjects.length > 0) {
                // console.log("🔄 Starting to fetch project images...");
                await fetchProjectImages(sortedProjects);
            } else {
                // console.log("⚠️ No projects found, skipping image fetch");
            }

        } catch (err) {
            console.error("❌ Error fetching projects:", err);
            setProjectData([]);
        } finally {
            setLoadingProjects(false);
        }
    };

    const [deleteConfirm, setDeleteConfirm] = useState<{
        show: boolean;
        projectId: string;
        projectName: string;
    } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const project = projectData.find(p => p.id === projectId);
        setPermission(project?.permissionGroup ?? null);

        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            projectId
        });
    };

    const handleImageClick = (projectId: string, event: React.MouseEvent) => {
        event.stopPropagation();

        if (uploadingImages.has(projectId)) {
            return;
        }

        const project = projectData.find(p => p.id === projectId);
        const authUser = getAuthUser();
        const currentUserUid = authUser?.id ?? authUser?.uid;
        const isSharedProject = project?.creatorUid !== currentUserUid;
        const canEdit = ["Admin", "Owner"].includes(project?.permissionGroup || "");
        // const viewOnly = ["Viewer"].includes(project?.permissionGroup || "");

        if (isSharedProject && !canEdit) {
            console.log("🔒 No permission to edit image for shared project");
            // ✅ ลบ alert ออก เพื่อไม่ให้มีการแจ้งเตือน
            return;
        }

        fileInputRefs.current[projectId]?.click();
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!projectId) {
            alert("Project ID is missing");
            return;
        }

        try {
            const res = await fetch(ENDPOINTS.DELETEPROJECT, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ projectId }),
            });

            const data = await res.json();

            if (!res.ok) {
                console.error("❌ Delete failed:", data);
                alert(data.message || "Delete project failed");
                return;
            }

            console.log("✅ Delete success:", data);
            setDeleteConfirm(null);
            setProjectData((prev) => prev.filter((p) => p.id !== projectId));

        } catch (error) {
            console.error("❌ Network error:", error);
            alert("Server error");
        }
    };

    const openDeleteConfirm = (projectId: string) => {
        const project = projectData.find(p => p.id === projectId);
        if (project) {
            setDeleteConfirm({
                show: true,
                projectId: project.id,
                projectName: project.name
            });
            setContextMenu(null);
        }
    };

    const handleFileChange = async (projectId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const project = projectData.find(p => p.id === projectId);
        const authUser = getAuthUser();
        const currentUserUid = authUser?.id ?? authUser?.uid;
        const isSharedProject = project?.creatorUid !== currentUserUid;
        const canEdit = ["Admin", "Producer", "Supervisor", "Owner"].includes(project?.permissionGroup || "");

        if (isSharedProject && !canEdit) {
            console.log("🔒 No permission to upload image for shared project");
            alert("You don't have permission to edit this project's image");
            if (fileInputRefs.current[projectId]) {
                fileInputRefs.current[projectId]!.value = '';
            }
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
            return;
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('File size exceeds 10MB limit.');
            return;
        }

        const currentProject = projectData.find(p => p.id === projectId);
        const oldImageUrl = currentProject?.image;

        console.log("📤 Starting image upload for project:", projectId);
        console.log("📁 File details:", {
            name: file.name,
            type: file.type,
            size: `${(file.size / 1024).toFixed(2)} KB`
        });

        if (oldImageUrl) {
            console.log("🔄 Replacing old image:", oldImageUrl);
        } else {
            console.log("🆕 First image upload for this project");
        }

        setUploadingImages(prev => new Set(prev).add(projectId));

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);
            formData.append('type', 'images');
            formData.append('description', 'project thumbnail');

            if (oldImageUrl) {
                formData.append('oldImageUrl', oldImageUrl);
                console.log("📤 Sending oldImageUrl to backend for deletion");
            }

            console.log("📤 Uploading file to server...");
            console.log("📍 Endpoint:", ENDPOINTS.UPLOAD);

            const { data } = await axios.post(ENDPOINTS.UPLOAD, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        console.log(`📊 Upload progress: ${percentCompleted}%`);
                    }
                }
            });

            console.log("📦 Server response:", data);

            const downloadURL = data.file?.fileUrl;

            if (!downloadURL) {
                throw new Error("No download URL returned from server");
            }

            console.log("✅ Image URL received:", downloadURL);

            if (oldImageUrl) {
                console.log("✅ Old image successfully replaced and deleted from server");
            }

            setProjectData(prev =>
                prev.map(p =>
                    p.id === projectId
                        ? { ...p, image: downloadURL }
                        : p
                )
            );

            console.log("✅ UI updated with new image");

            setTimeout(async () => {
                console.log("🔄 Re-fetching image from database to confirm...");
                const currentProject = projectData.find(p => p.id === projectId);
                if (currentProject) {
                    await fetchProjectImages([currentProject]);
                }
            }, 1000);

            if (fileInputRefs.current[projectId]) {
                fileInputRefs.current[projectId]!.value = '';
            }

        } catch (err) {
            console.error("❌ Upload error:", err);

            let errorMessage = "Failed to upload image. Please try again.";

            if (axios.isAxiosError(err)) {
                console.error("❌ Axios error details:", {
                    message: err.message,
                    response: err.response?.data,
                    status: err.response?.status,
                    code: err.code
                });

                if (err.response?.data?.message) {
                    errorMessage = err.response.data.message;
                } else if (err.response?.status === 413) {
                    errorMessage = "File too large. Maximum size is 10MB.";
                } else if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
                    errorMessage = "Cannot connect to server. Please check if the server is running.";
                } else if (err.code === "ECONNREFUSED") {
                    errorMessage = "Connection refused. Server may not be running.";
                }
            }

            alert(errorMessage);

            if (fileInputRefs.current[projectId]) {
                fileInputRefs.current[projectId]!.value = '';
            }
        } finally {
            setUploadingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(projectId);
                return newSet;
            });
        }
    };

    const handleProjectClick = async (project: Project) => {
        const projectId = project.id;
        if (!projectId) return;

        localStorage.setItem("projectId", JSON.stringify(projectId));
        console.log(localStorage.getItem("projectId"));

        const baseData = {
            projectId,
            projectName: project.name,
            thumbnail: project.image || "",
            createdBy: project.username || "",
            createdAt: project.createdAt || "",
            permission: project.permissionGroup,
            fetchedAt: new Date().toISOString(),
        };

        try {
            const [{ data: projectInfo }, { data: projectDetails }] = await Promise.all([
                axios.post(ENDPOINTS.PROJECTINFO, { projectId }),
                axios.post(ENDPOINTS.PROJECTDETAIL, { projectId }),
            ]);

            localStorage.setItem(
                "projectData",
                JSON.stringify({
                    ...baseData,
                    projectInfo,
                    projectDetails,
                })
            );

            console.log("✅ Project data saved to localStorage");

        } catch (err) {
            console.error("❌ Error fetching project data:", err);
            localStorage.setItem(
                "projectData",
                JSON.stringify({
                    ...baseData,
                    projectInfo: null,
                    projectDetails: null,
                    error: "Failed to fetch full data",
                })
            );
        }

        navigate("/Project_Detail");
    };

    const handleTemplateSelect = (templateName: string) => {
        setSelectedTemplate(templateName);
        if (!projectName) {
            setProjectName(templateName);
        }
    };

    const handleCreateProject = async () => {
        const finalProjectName = projectName || selectedTemplate;

        if (!finalProjectName) {
            setError("Please enter Project Name or select a template");
            return;
        }

        if (!selectedTemplate) {
            setError("Please select a template");
            return;
        }

        setLoading(true);
        setError("");

        const authUser = getAuthUser();
        const createdBy = authUser.id || authUser.uid;

        console.log("🆕 Creating project:", finalProjectName, "by", createdBy.name);

        try {
            const { data } = await axios.post(ENDPOINTS.NEWPROJECT, {
                projectName: finalProjectName,
                template: selectedTemplate,
                description: `${selectedTemplate} project`,
                createdBy,
            });

            console.log("✅ Project creation response:", data);

            if (data.token) localStorage.setItem("token", data.token);

            const projectId = data.project?.projectId ?? data.projectId;
            localStorage.setItem("projectId", String(projectId));
            if (!projectId) {
                console.error("❌ No project ID in response:", data);
                throw new Error("Project ID not found in response");
            }

            console.log("✅ New project ID:", projectId);

            const authUser = getAuthUser();
            const baseProjectData = {
                projectId,
                projectName: finalProjectName,
                thumbnail: "",
                createdBy: authUser?.username || authUser?.name || "Unknown",
                createdAt: new Date().toISOString(),
                fetchedAt: new Date().toISOString(),
            };

            try {
                const [{ data: projectInfo }, { data: projectDetails }] = await Promise.all([
                    axios.post(ENDPOINTS.PROJECTINFO, { projectId }),
                    axios.post(ENDPOINTS.PROJECTDETAIL, { projectId }),
                ]);

                localStorage.setItem(
                    "projectData",
                    JSON.stringify({ ...baseProjectData, projectInfo, projectDetails })
                );

                console.log("✅ Project data fetched and saved");

            } catch (fetchErr) {
                console.error("⚠️ Warning: Could not fetch full project data:", fetchErr);
                localStorage.setItem(
                    "projectData",
                    JSON.stringify({
                        ...baseProjectData,
                        projectInfo: null,
                        projectDetails: null,
                        error: "Failed to fetch full project data",
                    })
                );
            }

            setShowModal(false);
            setProjectName("");
            setSelectedTemplate("");

            await fetchProjects();

            console.log("🎉 Navigating to project detail");
            navigate("/Project_Detail");

        } catch (err) {
            console.error("❌ Create project error:", err);
            if (axios.isAxiosError(err)) {
                console.error("Response data:", err.response?.data);
                console.error("Response status:", err.response?.status);
            }
            setError("Failed to create project. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderProjectCard = (project: Project, isMember: boolean) => {
        const isUploading = uploadingImages.has(project.id);
        const authUser = getAuthUser();
        const currentUserUid = authUser?.id ?? authUser?.uid;
        const isSharedProject = project.creatorUid !== currentUserUid;
        const canEdit = ["Admin", "Producer", "Supervisor", "Owner"].includes(project.permissionGroup || "");
        const isDisabled = isSharedProject && !canEdit;

        return (
            <div

                key={project.id}
                onContextMenu={(e) => handleContextMenu(e, project.id)}
                className={` rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-2 ${isMember ? 'border-purple-300' : 'border-blue-300'
                    }`}
            >
                <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    ref={(el) => {
                        fileInputRefs.current[project.id] = el;
                    }}
                    onChange={(e) => handleFileChange(project.id, e)}
                    disabled={isUploading || isDisabled}

                />

                <div
                    onClick={(e) => handleImageClick(project.id, e)}
                    className={`h-56 md:h-64 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center relative group ${isDisabled
                            ? 'cursor-default'  // ✅ เปลี่ยนจาก cursor-not-allowed เป็น cursor-default
                            : isUploading
                                ? 'cursor-wait'
                                : 'cursor-pointer hover:brightness-110'
                        } transition-all duration-300`}
                >
                    {project.image ? (
                        <>
                            <img
                                src={project.image}
                                className="absolute inset-0 w-full h-full object-cover blur-sm scale-110 opacity-40"
                                alt=""
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60" />
                            <img
                                src={project.image}
                                alt={project.name}
                                className="relative mx-auto h-full object-contain opacity-90"
                                onError={(e) => {
                                    console.error("❌ Image load error for project:", project.id, project.image);
                                    e.currentTarget.style.display = 'none';
                                }}
                                onLoad={() => {
                                    console.log("✅ Image loaded successfully for project:", project.id);
                                }}
                            />
                            {isUploading ? (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <span className="text-white text-base font-semibold">Uploading...</span>
                                </div>
                            ) : (
                                // ✅ ไม่แสดง overlay เมื่อ hover ถ้าไม่มีสิทธิ์
                                !isDisabled && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                            <span className="text-gray-800 text-sm font-semibold flex items-center gap-2">
                                                <span className="text-lg">📷</span>
                                                Click to change
                                            </span>
                                        </div>
                                    </div>
                                )
                            )}
                        </>
                    ) : (
                        <>
                            {isUploading ? (
                                <div className="flex flex-col items-center">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                    <span className="text-gray-700 text-base font-semibold">Uploading...</span>
                                </div>
                            ) : isDisabled ? (
                                // ✅ แสดงไอคอนธรรมดาไม่มีข้อความเมื่อไม่มีสิทธิ์
                                <div className="text-center opacity-50">
                                    <div className="text-6xl mb-2">📷</div>
                                </div>
                            ) : (
                                <div className="text-center transform group-hover:scale-110 transition-transform duration-300">
                                    <div className="text-6xl mb-2 animate-pulse">📷</div>
                                    <span className="text-gray-600 text-sm font-medium">Click to upload</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div
                    onClick={() => handleProjectClick(project)}
                    className="p-4 cursor-pointer hover:bg-gradient-to-br hover:from-gray-100 hover:to-blue-50 transition-all duration-300 hover:text-gray-800"
                >
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-zinc-100 text-lg font-bold truncate flex-1 hover:text-blue-600 transition-colors">
                            {project.name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${project.status === 'Active'
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                                    : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                                    }`}
                            >
                                {project.status}
                            </span>
                            {isMember && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-sm">
                                    👥
                                </span>
                            )}
                        </div>
                    </div>

                    <p className="text-zinc-400 text-sm mb-2 line-clamp-2 leading-relaxed">
                        {project.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <span className="text-gray-400">👤</span>
                            <span className="truncate max-w-[120px]">{project.username}</span>
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                            <span>🕒</span>
                            <span className="truncate">{project.lastModified}</span>
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="pt-14 h-screen flex flex-col bg-gray-900">
            <header className="w-full h-22 px-4 flex items-center justify-between fixed z-[50] z-40 bg-gradient-to-r from-gray-00 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm shadow-lg">
                <div className="flex flex-col">
                    <h2 className="text-3xl font-semibold text-gray-200 flex items-center gap-3">
                        Projects
                        <span className="text-xs rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-white-400">
                            shared
                        </span>
                    </h2>

                    <div className="flex items-center gap-3 mt-2">
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105"
                        >
                            Add Project
                            <ChevronDown />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Projects..."
                            className="w-40 md:w-56 lg:w-64 h-8 pl-3 pr-10 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:bg-gray-800/80 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-200"
                        />
                    </div>
                </div>
            </header>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-auto bg-gray-800 rounded-lg shadow-2xl">
                        <div className="border-b border-gray-700 p-6">
                            <h2 className="text-2xl font-semibold text-white">Create New Project</h2>
                        </div>

                        <div className="p-6">
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-200">
                                    {error}
                                </div>
                            )}

                            <input
                                type="text"
                                placeholder="Enter your project name..."
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                maxLength={40}
                                className="w-full px-4 py-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-6"
                            />

                            <div className="flex gap-4 border-b border-gray-700 mb-6">
                                <button className="px-4 py-2 text-white border-b-2 border-blue-500 font-medium  bg-gradient-to-r from-gray-600 to-gray-600 hover:from-gray-700 hover:to-gray-500 rounded-lg">
                                    Templates
                                </button>
                                {/* <button className="px-4 py-2 text-gray-400 hover:text-white">
                                    Projects
                                </button> */}
                            </div>

                            <p className="text-gray-400 mb-6">
                                Choose a template to use as the default for your new project.
                            </p>

                            <div className="grid grid-cols-4 gap-4 mb-6">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        onClick={() => handleTemplateSelect(template.name)}
                                        className={`aspect-square rounded flex items-center justify-center text-white text-center p-4 cursor-pointer transition-all ${selectedTemplate === template.name
                                            ? 'bg-blue-700 ring-4 ring-blue-400 scale-105'
                                            : 'bg-blue-500 hover:bg-blue-600'
                                            }`}
                                    >
                                        <div>
                                            <div className="font-semibold">{template.name}</div>
                                            <div className="text-sm opacity-90">{template.subtitle}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-700 p-6 flex items-center justify-end">
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setProjectName('');
                                        setSelectedTemplate('');
                                        setError('');
                                    }}
                                    className="px-4 py-2  bg-gradient-to-r from-gray-600 to-gray-600 hover:from-gray-700 hover:to-gray-500 text-white rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateProject}
                                    disabled={loading || !selectedTemplate}
                                    className="px-4 py-2  bg-gradient-to-r from-green-800 to-green-600 hover:from-green-700 hover:to-green-500 text-white rounded transition-colors"
                                >
                                    {loading ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="h-22"></div>

            <main className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-8 px-4 md:px-6 lg:px-2">
                {loadingProjects ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-gray-400 text-xl flex items-center gap-3">
                            <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                            Loading projects...
                        </div>
                    </div>
                ) : projectData.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-gray-600 text-xl">No projects yet. Create your first project!</div>
                    </div>
                ) : (
                    <>
                        {(() => {
                            const authUser = getAuthUser();
                            const currentUserUid = authUser?.id ?? authUser?.uid ?? authUser?.username ?? "admin";
                            const myProjects = projectData.filter(p => p.creatorUid === currentUserUid);
                            const sharedProjects = projectData.filter(p => p.creatorUid !== currentUserUid);

                            return (
                                <>
                                    {myProjects.length > 0 && (
                                        <div className="mb-8">

                                            {showMyProjects && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                                    {myProjects.map((project) => renderProjectCard(project, false))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {sharedProjects.length > 0 && (
                                        <div>

                                            {showSharedProjects && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                                    {sharedProjects.map((project) => renderProjectCard(project, true))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>
                )}

                {contextMenu && (
                    <div
                        className="fixed py-1 z-50 min-w-[150px]"
                        style={{
                            left: `${contextMenu.x}px`,
                            top: `${contextMenu.y}px`
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            hidden={!canDeleteProject}
                            disabled={!canDeleteProject}
                            onClick={() => {
                                if (!contextMenu) return;
                                openDeleteConfirm(contextMenu.projectId);
                            }}
                            className="w-full px-4 py-2 text-left text-red-600 flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600 rounded-lg"
                        >
                            <span>🗑️</span>
                            Delete Project
                        </button>
                    </div>
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
                                        <h3 className="text-lg font-semibold text-zinc-100">Delete Project</h3>
                                        <p className="text-sm text-zinc-400">This action cannot be undone.</p>
                                    </div>
                                </div>

                                <div className="rounded-lg bg-zinc-800 p-4 mb-6 border border-zinc-700">
                                    <p className="text-zinc-300 mb-1">
                                        Are you sure you want to delete this project?
                                    </p>
                                    <p className="font-semibold text-zinc-100 truncate">
                                        "{deleteConfirm.projectName}"
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="px-4 py-2 rounded-lg text-zinc-200 transition-colors font-medium bg-gradient-to-r from-gray-800 to-gray-800 hover:from-gray-700 hover:to-gray-600"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={() => handleDeleteProject(deleteConfirm.projectId)}
                                        className="px-4 py-2 rounded-lg text-white transition-colors font-medium bg-gradient-to-r from-red-800 to-red-800 hover:from-red-700 hover:to-red-600"
                                    >
                                        Delete Project
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}