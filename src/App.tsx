import { Routes, Route, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

import Login from "./Pages/Login";
import Register from "./Pages/Register";

import Home from "./Pages/Home";
import Inbox from "./Pages/Inbox";
import Mytask from "./Pages/Mytask";
import ENDPOINTS from "./config";

//Preject
import Project_Detail from "./Pages/Project/Project_Detail";
import Project_Shot from "./Pages/Project/Project_Shot";
import Others_People from "./Pages/Project/Others_People";
// import Others_AllForOne from "./Pages/Project/Others_AllForOne";
import Project_Assets from "./Pages/Project/Project_Assets";
import Project_Tasks from "./Pages/Project/Project_Tasks";
import Project_Sequence from "./Pages/Project/Project_Sequence";
import Project_Media from "./Pages/Project/Project_Media";
import SecretSQLConsole from './Pages/SecretSQLConsole';

//Others
import Others_Shot from "./Pages/Project/Others/Others_Shot";
import Others_Asset from "./Pages/Project/Others/Others_Asset";
import Others_Sequence from "./Pages/Project/Others/Others_Sequence";
import Others_Video from "./Pages/Project/Others/Others_Video";
import Project_Version from "./Pages/Project/Project_Version";




import Profile from "./Pages/Profile";

import { Search, ChevronDown, ChevronRight, FolderClosed } from 'lucide-react';

// import Project_Tasks from "./Pages/Project/Project_Tasks";
// import Project_Assets from "./Pages/Project/Project_Assets";
// import Project_Media from "./Pages/Project/Project_Media";


interface Project {
  projectId: number;
  projectName: string;
  images?: string[];
  thumbnail?: string;
  files_project?: string[];
  username?: string;
  createdAt?: string;
  permissionGroup?: string;
  description?: string;
  template?: string;
}


// ░░ Layout สำหรับหน้าที่มี Header ░░
function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [allPagesOpen, setAllPagesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const allPagesRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);

  // ดึงข้อมูล user จาก localStorage แบบ lazy initialization
  const [authUser] = useState<{
    email: string;
    imageURL: string;
    id?: number;


  }>(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (raw) {
        const u = JSON.parse(raw);
        return {
          email: u.email || "Anonymous@gmail.com",
          imageURL: u.imageURL || "/icon/black-dog.png",
          id: u.id || undefined,
        };
      }
    } catch (e) {
      console.error("AuthUser parse error:", e);
    }

    return {
      email: "Anonymous@gmail.com",
      imageURL: "/icon/black-dog.png",
    };
  });

  // ░░ บันทึก path ปัจจุบันทุกครั้งที่ navigate ░░
  function SaveLastPath() {
    const location = useLocation();

    useEffect(() => {
      // ไม่บันทึกหน้า auth
      const skipPaths = ["/", "/register", "/secret-sql-console-2024", "/Others_Video"];
      if (!skipPaths.includes(location.pathname)) {
        localStorage.setItem("lastPath", location.pathname + location.search);
      }
    }, [location]);

    return null; // ไม่ render อะไร
  }
  useEffect(() => {
    fetchProjects();
  }, []);

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    // ล้างข้อมูลทั้งหมดใน localStorage
    localStorage.clear();

    // นำทางไปยังหน้า Login
    navigate("/");
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(ENDPOINTS.PROJECTLIST, {
        method: "POST",
        body: JSON.stringify({
          created_by: authUser.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("🔥 API RAW:", data);

      if (Array.isArray(data.projects)) {
        // 👇 Debug: ดูว่าแต่ละ project มี field อะไรบ้าง
        if (data.projects.length > 0) {
          console.log("📋 First project structure:", data.projects[0]);
          console.log("🖼️ Images field:", data.projects[0]?.images);
          console.log("🔑 All keys:", Object.keys(data.projects[0]));
        }

        setProjects(data.projects);
      } else {
        console.error("Unexpected format:", data);
        setProjects([]);
      }

    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const handleProjectClick = async (project: Project) => {
    const projectId = project.projectId;
    if (!projectId) return;

    console.log("🚀 Starting handleProjectClick for:", project.projectName);

    localStorage.setItem("projectId", JSON.stringify(projectId));

    // ดึง thumbnail URL - ส่งตรงๆ ไม่ต้องต่อ image_url
    let thumbnailUrl = "";

    // 1. ลองใช้ thumbnail ที่ API ส่งมา (ถ้ามี)
    if (project.thumbnail) {
      thumbnailUrl = project.thumbnail;
      console.log("✅ Using thumbnail from API:", thumbnailUrl);
    }
    // 2. ลองใช้ images array
    else if (project.images && Array.isArray(project.images) && project.images.length > 0) {
      thumbnailUrl = project.images[0];
      console.log("✅ Using first image from images array:", thumbnailUrl);
    }
    // 3. ลองใช้ files_project
    else if (project.files_project && Array.isArray(project.files_project) && project.files_project.length > 0) {
      thumbnailUrl = project.files_project[0];
      console.log("✅ Using first file from files_project:", thumbnailUrl);
    }
    // 4. ไม่มีรูปเลย ใช้ placeholder
    else {
      thumbnailUrl = "";
      console.warn("⚠️ No images found for project:", project.projectName);
    }

    const baseData = {
      projectId,
      projectName: project.projectName,
      thumbnail: thumbnailUrl,
      images: project.images || project.files_project || [],
      createdBy: project.username || "",
      createdAt: project.createdAt || "",
      permission: project.permissionGroup || "",
      description: project.description || "",
      template: project.template || "",
      fetchedAt: new Date().toISOString(),
    };

    console.log("📦 Base data prepared:", baseData);

    // บันทึก baseData ก่อนเลย เผื่อ API fail
    localStorage.setItem(
      "projectData",
      JSON.stringify({
        ...baseData,
        projectInfo: null,
        projectDetails: null,
      })
    );

    console.log("💾 Saved initial data to localStorage");

    try {
      console.log("🔄 Fetching project details...");

      // ตั้ง timeout 10 วินาที
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = Promise.all([
        fetch(ENDPOINTS.PROJECTINFO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        }),
        fetch(ENDPOINTS.PROJECTDETAIL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        }),
      ]);

      const [projectInfoRes, projectDetailsRes] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as Response[];

      console.log("✅ Got responses");

      const projectInfo = await projectInfoRes.json();
      const projectDetails = await projectDetailsRes.json();

      console.log("📊 Project Info:", projectInfo);
      console.log("📊 Project Details:", projectDetails);

      // ลองหารูปจาก projectInfo หรือ projectDetails ถ้ายังไม่มี
      if (!project.thumbnail && !thumbnailUrl) {
        if (projectInfo?.thumbnail) {
          baseData.thumbnail = projectInfo.thumbnail;
          console.log("✅ Updated thumbnail from projectInfo:", projectInfo.thumbnail);
        } else if (projectDetails?.thumbnail) {
          baseData.thumbnail = projectDetails.thumbnail;
          console.log("✅ Updated thumbnail from projectDetails:", projectDetails.thumbnail);
        }
      }

      const finalData = {
        ...baseData,
        projectInfo,
        projectDetails,
      };

      localStorage.setItem("projectData", JSON.stringify(finalData));

      console.log("✅ Final project data saved to localStorage");

    } catch (err) {
      console.error("❌ Error fetching project data:", err);
      // baseData ถูกบันทึกไปแล้วด้านบน ไม่ต้องทำอะไร
    }

    setProjectsOpen(false);

    console.log("🚀 Navigating to Project_Detail...");
    navigate("/Project_Detail");
  };
  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      // Ctrl + Alt + D = เปิด Secret Console
      if (e.ctrlKey && e.altKey && e.key === 'M') {
        e.preventDefault();

        // ถ้าไม่ได้อยู่ที่หน้า secret console แล้ว ให้ไป
        if (!location.pathname.includes('/secret-sql-console')) {
          navigate('/secret-sql-console-2024');

          // รอ navigate เสร็จแล้ว focus input
          setTimeout(() => {
            const input = document.getElementById('secret-password');
            if (input) input.focus();
          }, 100);
        } else {
          // ถ้าอยู่ที่หน้านั้นแล้ว แค่ focus
          const input = document.getElementById('secret-password');
          if (input) input.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyPress);
    return () => document.removeEventListener('keydown', handleGlobalKeyPress);
  }, [navigate, location]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (projectsRef.current && !projectsRef.current.contains(event.target as Node)) {
        setProjectsOpen(false);
      }
      if (allPagesRef.current && !allPagesRef.current.contains(event.target as Node)) {
        setAllPagesOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* ░░ TOP NAV BAR ░░ */}
      <SaveLastPath />
      <header className="fixed w-full h-14 leading-tight shadow-2xl flex items-center justify-between px-2 z-[150] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm ">
        {/* LEFT — เมนูต่างๆ */}
        <div className="flex items-center gap-5 text-sm">

          <div className="flex items-center px-4 shrink-0 whitespace-nowrap">
            <Link to="/Home">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSX7twFVDnuQJdGFWns0m7bKsKNK5tldjNBbA&s"
                className="w-12 h-12 rounded-md object-cover hover:scale-110 transition-transform duration-300 shadow-lg ring-2 ring-blue-500/30"
                alt="logo"
              />
            </Link>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link className="hover:text-blue-400 text-xl text-gray-300 font-medium transition-all duration-300 hover:scale-105 relative group" to="/Inbox">
              Inbox
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link className="hover:text-blue-400 text-xl text-gray-300 font-medium transition-all duration-300 hover:scale-105 relative group whitespace-nowrap" to="/Mytask">
              My Task
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link className="hover:text-blue-400 text-xl text-gray-300 font-medium transition-all duration-300 hover:scale-105 relative group" to="/media">
              Media
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>

            {/* Projects Dropdown */}
            <div className="relative" ref={projectsRef}>
              <span
                className="
                    hidden sm:inline-flex items-center gap-1
                    hover:text-blue-400 cursor-pointer
                    text-xl font-medium text-gray-300
                    transition-all duration-300 whitespace-nowrap
                  "
                onClick={() => setProjectsOpen(!projectsOpen)}
              >
                <span>Projects</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${projectsOpen ? 'rotate-180' : ''}`} />
              </span>

              {projectsOpen && (
                <div
                  className="absolute bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 shadow-2xl rounded-xl mt-2 w-72 z-10 border border-gray-700/50 overflow-hidden backdrop-blur-xl"
                >
                  {/* Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Project</p>
                  </div>

                  {/* Projects List */}
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {projects.map((project, index) => (
                      <div
                        key={`${project.projectId}-${index}`}
                        onClick={() => handleProjectClick(project)}
                        className={`group flex items-center gap-3 px-4 py-3 hover:bg-gradient-to-r hover:from-blue-600/10 hover:to-purple-600/10 transition-all duration-200 cursor-pointer ${index !== projects.length - 1
                            ? "border-b border-gray-700/30"
                            : ""
                          }`}
                      >
                        {/* Project Thumbnail */}
                        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-700 to-gray-600 shadow-md">
                          {project.thumbnail ? (
                            <img
                              src={ENDPOINTS.image_url + project.thumbnail}
                              alt={project.projectName}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                              <FolderClosed className="w-6 h-6 text-blue-400" />
                            </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>

                        {/* Project Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-200 truncate group-hover:text-blue-300 transition-colors">
                            {project.projectName}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            ID: {project.projectId}
                          </p>
                        </div>

                        {/* Arrow Icon */}
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all duration-200" />
                      </div>
                    ))}
                  </div>

                  {/* Footer (optional) */}
                  {projects.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <FolderClosed className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No projects available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* All Pages Dropdown */}
            <div className="relative" ref={allPagesRef}>
              <span
                className="
                  hidden sm:inline-flex items-center gap-1
                  hover:text-blue-400 cursor-pointer
                  text-xl font-medium text-gray-300
                  transition-all duration-300 whitespace-nowrap
                "
                onClick={() => setAllPagesOpen(!allPagesOpen)}
              >
                <span>All Pages</span>
                <ChevronDown className="w-5 h-5" />
              </span>

              {allPagesOpen && (
                <div
                  className="absolute bg-gray-800 shadow-2xl rounded-lg mt-1 w-32 z-10 border border-gray-700/50 overflow-hidden backdrop-blur-md"
                >
                  <Link
                    to="/page1"
                    className="block px-3 py-2 hover:bg-blue-600/20 text-xl text-gray-300 transition-colors duration-200 border-b border-gray-700/30"
                    onClick={() => setAllPagesOpen(false)}
                  >
                    Page 1
                  </Link>
                  <Link
                    to="/page2"
                    className="block px-3 py-2 hover:bg-blue-600/20 text-xl text-gray-300 transition-colors duration-200"
                    onClick={() => setAllPagesOpen(false)}
                  >
                    Page 2
                  </Link>
                </div>
              )}
            </div>

            <Link className="hidden md:inline-block hover:text-blue-400 text-xl text-gray-300 font-medium transition-all duration-300 hover:scale-105 relative group whitespace-nowrap" to="/people">
              People
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              to="/apps"
              className="
                    hidden lg:flex items-center gap-1
                    hover:text-blue-400 text-xl text-gray-300 font-medium
                    transition-all duration-300 hover:scale-105
                    relative group whitespace-nowrap
                  ">
              <span>Apps</span>
              <ChevronDown className="w-5 h-5" />

              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>

          </div>
        </div>

        {/* RIGHT — Search, Icons, Profile */}
        <div className="flex items-center gap-4 ">
          <div className="text-xl cursor-pointer hover:scale-110 transition-transform duration-300 hidden md:inline-block">
            <Search className="w-8 h-8 rounded-full object-cover cursor-pointer hover:shadow-lg hover:shadow-blue-500/30" />

          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-40 md:w-56 lg:w-64 h-8 border border-gray-700 rounded-full pl-2 pr-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800/50 text-gray-300 placeholder-gray-500 backdrop-blur-sm transition-all duration-300"
            />
          </div>

          {/* Profile with Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <img
              src={ENDPOINTS.image_url + authUser.imageURL}
              className="w-12 h-12 rounded-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300 ring-2 ring-gray-700 hover:ring-blue-500"
              alt="profile"
              onClick={() => setIsOpen(!isOpen)}
            />

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-2xl border border-gray-700/50 py-2 z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <a href="profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-600/20 transition-colors duration-200 hover:pl-5">
                  {authUser.email}
                </a>
                <a href="#settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-600/20 transition-colors duration-200 hover:pl-5">
                  Settings
                </a>

                <hr className="my-2 border-gray-700/50" />
                <button
                  onClick={handleLogout}
                  className="block dropDownLogOut px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 w-full text-left transition-all duration-200 hover:pl-5 font-medium"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content ของแต่ละหน้า - เพิ่ม padding-top */}
      <main className="">
        <Outlet />
      </main>
    </div>
  );
}

// ░░ Layout สำหรับหน้า Auth (ไม่มี Header) ░░
function AuthLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}

// ░░ Main App ░░
export default function App() {
  return (
    <Routes>
      {/* Routes ที่ไม่มี Header */}
      <Route element={<AuthLayout />}>
        <Route path="/" element={<Login />} />
        <Route path="/Others_Video" element={<Others_Video />} />
        <Route path="/secret-sql-console-2024" element={<SecretSQLConsole />} />


        <Route path="/register" element={<Register />} />
      </Route>

      {/* Routes ที่มี Header */}
      <Route element={<MainLayout />}>
        {/* อย่าลืมเอาออก */}
        {/* <Route path="/" element={<Login />} /> */}

        <Route path="/Home" element={<Home />} />
        <Route path="/Inbox" element={<Inbox />} />
        <Route path="/Mytask" element={<Mytask />} />

        <Route path="/Project_Detail" element={<Project_Detail />} />
        <Route path="/Project_Shot" element={<Project_Shot />} />
        <Route path="/Project_Assets" element={<Project_Assets />} />
        <Route path="/Project_Sequence" element={<Project_Sequence />} />
        <Route path="/Project_Media" element={<Project_Media />} />


        <Route path="/Project_Tasks" element={<Project_Tasks />} />
        <Route path="/Profile" element={<Profile />} />


        {/* <Route path="/:section/Others_AllForOne" element={<Others_AllForOne />} /> */}
        <Route path="/Project_Assets/Others_Asset" element={<Others_Asset />} />
        <Route path="/Project_Shot/Others_Shot" element={<Others_Shot />} />
        <Route path="/Project_Sequence/Others_Sequence" element={<Others_Sequence />} />
        <Route path="Project_Version" element={<Project_Version />} />

        

        <Route path="/Others_People" element={<Others_People />} />

        <Route path="/media" element={<div className="pt-20">Media Page</div>} />
        <Route path="/people" element={<div>People Page</div>} />

        {/* เพิ่ม route อื่นๆ ตามต้องการ */}
      </Route>
    </Routes>
  );
}