import { Routes, Route, Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

import Login from "./Pages/Login";
import Register from "./Pages/Register";

import Home from "./Pages/Home";
import Inbox from "./Pages/Inbox";
import Mytask from "./Pages/Mytask";
import PeopleList from "./Pages/PeopleList"
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

import { Search, ChevronDown, ChevronRight, FolderClosed, Box, Film, LayoutDashboard, List, CheckSquare, GitBranch, Users } from 'lucide-react';

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

const PROJECT_PAGES = [
  { label: "Project Detail", path: "/Project_Detail", icon: LayoutDashboard },
  { label: "Assets", path: "/Project_Assets", icon: Box },
  { label: "Shots", path: "/Project_Shot", icon: Film },
  { label: "Sequences", path: "/Project_Sequence", icon: List },
  { label: "Tasks", path: "/Project_Tasks", icon: CheckSquare },
  { label: "Version", path: "/Project_Version", icon: GitBranch },
  { label: "People", path: "/Others_People", icon: Users },
];


function MainLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [peopleListOpen, setAllPagesOpen] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null);
  const [subMenuPos, setSubMenuPos] = useState({ top: 0, left: 0 });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);
  const allPagesRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);

  const [users, setUsers] = useState<{ id: number; username: string; email?: string; status?: string; permission_group?: string; groups_name?: string; created_at?: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );


  const [authUser] = useState<{ email: string; imageURL: string; id?: number }>(() => {
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
    } catch (e) { console.error("AuthUser parse error:", e); }
    return { email: "Anonymous@gmail.com", imageURL: "/icon/black-dog.png" };
  });

  function SaveLastPath() {
    const location = useLocation();
    useEffect(() => {
      const skipPaths = ["/", "/register", "/secret-sql-console-2024", "/Others_Video"];
      if (!skipPaths.includes(location.pathname)) {
        localStorage.setItem("lastPath", location.pathname + location.search);
      }
    }, [location]);
    return null;
  }

  useEffect(() => { fetchProjects(); }, []);

  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const fetchProjects = async () => {
    try {
      const response = await fetch(ENDPOINTS.PROJECTLIST, {
        method: "POST",
        body: JSON.stringify({ created_by: authUser.id }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      console.log("🔥 API RAW:", data);
      if (Array.isArray(data.projects)) {
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
    } catch (error) { console.error("Error fetching projects:", error); }
  };

  const handleProjectClick = async (project: Project, path: string) => {
    const projectId = project.projectId;
    if (!projectId) return;

    console.log("🚀 Starting handleProjectClick for:", project.projectName);
    localStorage.setItem("projectId", JSON.stringify(projectId));

    let thumbnailUrl = "";
    if (project.thumbnail) {
      thumbnailUrl = project.thumbnail;
      console.log("✅ Using thumbnail from API:", thumbnailUrl);
    } else if (project.images && Array.isArray(project.images) && project.images.length > 0) {
      thumbnailUrl = project.images[0];
      console.log("✅ Using first image from images array:", thumbnailUrl);
    } else if (project.files_project && Array.isArray(project.files_project) && project.files_project.length > 0) {
      thumbnailUrl = project.files_project[0];
      console.log("✅ Using first file from files_project:", thumbnailUrl);
    } else {
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
    localStorage.setItem("projectData", JSON.stringify({ ...baseData, projectInfo: null, projectDetails: null }));
    console.log("💾 Saved initial data to localStorage");

    try {
      console.log("🔄 Fetching project details...");
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
      const [projectInfoRes, projectDetailsRes] = await Promise.race([fetchPromise, timeoutPromise]) as Response[];
      console.log("✅ Got responses");
      const projectInfo = await projectInfoRes.json();
      const projectDetails = await projectDetailsRes.json();
      console.log("📊 Project Info:", projectInfo);
      console.log("📊 Project Details:", projectDetails);
      if (!project.thumbnail && !thumbnailUrl) {
        if (projectInfo?.thumbnail) {
          baseData.thumbnail = projectInfo.thumbnail;
          console.log("✅ Updated thumbnail from projectInfo:", projectInfo.thumbnail);
        } else if (projectDetails?.thumbnail) {
          baseData.thumbnail = projectDetails.thumbnail;
          console.log("✅ Updated thumbnail from projectDetails:", projectDetails.thumbnail);
        }
      }
      localStorage.setItem("projectData", JSON.stringify({ ...baseData, projectInfo, projectDetails }));
      console.log("✅ Final project data saved to localStorage");
    } catch (err) {
      console.error("❌ Error fetching project data:", err);
    }

    setProjectsOpen(false);
    setHoveredProjectId(null);
    console.log("🚀 Navigating to", path);
    navigate(path);
  };

  const handleRowEnter = (project: Project, e: React.MouseEvent<HTMLDivElement>) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setSubMenuPos({ top: rect.top, left: rect.right + 6 });
    setHoveredProjectId(project.projectId);
  };

  const handleRowLeave = () => {
    hideTimer.current = setTimeout(() => setHoveredProjectId(null), 80);
  };

  const handleSubEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };

  const handleSubLeave = () => {
    hideTimer.current = setTimeout(() => setHoveredProjectId(null), 80);
  };

  useEffect(() => {
    const handleGlobalKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'M') {
        e.preventDefault();
        if (!location.pathname.includes('/secret-sql-console')) {
          navigate('/secret-sql-console-2024');
          setTimeout(() => {
            const input = document.getElementById('secret-password');
            if (input) input.focus();
          }, 100);
        } else {
          const input = document.getElementById('secret-password');
          if (input) input.focus();
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeyPress);
    return () => document.removeEventListener('keydown', handleGlobalKeyPress);
  }, [navigate, location]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setIsOpen(false);
      if (projectsRef.current && !projectsRef.current.contains(target)) {
        const subMenu = document.getElementById('project-submenu-portal');
        if (!subMenu || !subMenu.contains(target)) {
          setProjectsOpen(false);
          setHoveredProjectId(null);
        }
      }
      if (allPagesRef.current && !allPagesRef.current.contains(target)) setAllPagesOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Submenu Portal ──
  const hoveredProject = projects.find(p => p.projectId === hoveredProjectId) ?? null;

  const subMenuPortal = hoveredProject
    ? ReactDOM.createPortal(
      <div
        id="project-submenu-portal"
        style={{ position: "fixed", top: subMenuPos.top, left: subMenuPos.left, zIndex: 9999 }}
        className="w-52 bg-gray-800 border border-gray-700/60 rounded-lg shadow-2xl overflow-hidden"
        onMouseEnter={handleSubEnter}
        onMouseLeave={handleSubLeave}
      >
        {PROJECT_PAGES.map((page, i) => {
          const Icon = page.icon;
          return (
            <button
              key={page.path}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleProjectClick(hoveredProject, page.path);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-blue-600/30 transition-colors duration-100 flex items-center gap-3 cursor-pointer ${i !== PROJECT_PAGES.length - 1 ? "border-b border-gray-700/30" : ""}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-gray-500 group-hover:text-blue-400" />
              {page.label}
            </button>
          );
        })}
      </div>,
      document.body
    )
    : null;


  const fetchUsers = async () => {
    if (users.length > 0) return; // ดึงแค่ครั้งเดียว
    setUsersLoading(true);
    try {
      const response = await fetch(ENDPOINTS.PROJECT_USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SaveLastPath />
      {subMenuPortal}

      <header className="fixed w-full h-14 leading-tight shadow-2xl flex items-center justify-between px-2 z-[150] bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm">
        {/* LEFT */}
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
                className="hidden sm:inline-flex items-center gap-1 hover:text-blue-400 cursor-pointer text-xl font-medium text-gray-300 transition-all duration-300 whitespace-nowrap"
                onClick={() => setProjectsOpen(!projectsOpen)}
              >
                <span>Projects</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${projectsOpen ? 'rotate-180' : ''}`} />
              </span>

              {projectsOpen && (
                <div className="absolute bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 shadow-2xl rounded-xl mt-2 w-72 z-[200] border border-gray-700/50 overflow-hidden backdrop-blur-xl">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700/50 rounded-t-xl">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Project</p>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {projects.map((project, index) => (
                      <div
                        key={`${project.projectId}-${index}`}
                        onMouseEnter={(e) => handleRowEnter(project, e)}
                        onMouseLeave={handleRowLeave}
                        onMouseDown={(e) => {
                          // กดที่ row ตรงๆ → ไป Project_Detail เสมอ
                          e.stopPropagation();
                          handleProjectClick(project, "/Project_Detail");
                        }}
                        className={`group flex items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer
                          ${index !== projects.length - 1 ? "border-b border-gray-700/30" : ""}
                          ${hoveredProjectId === project.projectId ? "bg-blue-600/20" : "hover:bg-white/5"}`}
                      >
                        {/* Thumbnail */}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        </div>

                        {/* Project Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-semibold truncate transition-colors ${hoveredProjectId === project.projectId ? "text-white" : "text-gray-200 group-hover:text-blue-300"}`}>
                            {project.projectName}
                          </h3>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className={`w-5 h-5 transition-all duration-200 ${hoveredProjectId === project.projectId ? "text-white translate-x-0.5" : "text-gray-600 group-hover:text-blue-400"}`} />
                      </div>
                    ))}
                  </div>

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
                className="hidden sm:inline-flex items-center gap-1 hover:text-blue-400 cursor-pointer text-xl font-medium text-gray-300 transition-all duration-300 whitespace-nowrap"
                onClick={() => {
                  const next = !peopleListOpen;
                  setAllPagesOpen(next);
                  if (next) fetchUsers();
                  else setUserSearch("");
                }}
              >
                <span>People List</span>
                <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${peopleListOpen ? 'rotate-180' : ''}`} />

              </span>
              {peopleListOpen && (
                <div className="absolute bg-gray-800 shadow-2xl rounded-lg mt-1 w-56 z-10 border border-gray-700/50 overflow-hidden backdrop-blur-md">
                  {/* Header */}
                  <div className="px-3 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700/50">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">All Users</p>
                  </div>

                  {/* Search Box */}
                  <div className="px-2 py-2 border-b border-gray-700/50">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-7 px-2 text-sm bg-gray-700/60 border border-gray-600/50 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* List */}
                  <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    {usersLoading ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-500">Loading...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-500">
                        {userSearch ? "No results found" : "No users found"}
                      </div>
                    ) : (
                      filteredUsers.map((user, i) => (
                        <div
                          key={user.id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-blue-600/20 hover:text-white transition-colors duration-150 cursor-pointer
      ${i !== filteredUsers.length - 1 ? "border-b border-gray-700/30" : ""}`}
                          onClick={() => {
                            navigate("/people-list", { state: { user } });
                            setAllPagesOpen(false);
                            setUserSearch("");
                          }}
                        >
                          <Users className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="truncate">{user.username}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer count */}
                  {!usersLoading && users.length > 0 && (
                    <div className="px-3 py-1.5 border-t border-gray-700/50 bg-gray-900/40">
                      <p className="text-xs text-gray-500">
                        {filteredUsers.length} / {users.length} users
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link className="hidden md:inline-block hover:text-blue-400 text-xl text-gray-300 font-medium transition-all duration-300 hover:scale-105 relative group whitespace-nowrap" to="/people">
              People
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link to="/apps" className="hidden lg:flex items-center gap-1 hover:text-blue-400 text-xl text-gray-300 font-medium transition-all duration-300 hover:scale-105 relative group whitespace-nowrap">
              <span>Apps</span>
              <ChevronDown className="w-5 h-5" />
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <div className="text-xl cursor-pointer hover:scale-110 transition-transform duration-300 hidden md:inline-block">
            <Search className="w-8 h-8 rounded-full object-cover cursor-pointer hover:shadow-lg hover:shadow-blue-500/30" />
          </div>
          <div className="relative">
            <input type="text" placeholder="Search..."
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
            {isOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-2xl border border-gray-700/50 py-2 z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                <a href="profile" className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-600/20 transition-colors duration-200 hover:pl-5">{authUser.email}</a>
                <a href="#settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-blue-600/20 transition-colors duration-200 hover:pl-5">Settings</a>
                <hr className="my-2 border-gray-700/50" />
                <button onClick={handleLogout} className="block dropDownLogOut px-4 py-2 text-sm text-red-400 hover:bg-red-600/20 w-full text-left transition-all duration-200 hover:pl-5 font-medium">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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
        <Route path="/Project_Version" element={<Project_Version />} />
        <Route path="/people-list" element={<PeopleList />} />

        <Route path="/Others_People" element={<Others_People />} />

        <Route path="/media" element={<div className="pt-20">Media Page</div>} />
        <Route path="/people" element={<div>People Page</div>} />
      </Route>
    </Routes>
  );
}