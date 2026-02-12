import { useState, useEffect } from "react";
import { User, Eye, Users, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import Navbar_Project from "../../components/Navbar_Project";
import ENDPOINTS from "../../config";
import axios from "axios";

/* ================= Types ================= */
interface Person {
  id: number;
  name: string;
  email: string;
  status: "Active" | "Inactive";
  permissionGroup: "Producer" | "Admin" | "Supervisor" | "Artist" | "Vender";
  permission_group: "Producer" | "Admin" | "Supervisor" | "Artist" | "Vender";
  projects: string;
  groups: "FX" | "Modeling" | "Animation" | "Lighting" | "Compositing" | "Rigging" | "Layout" | "Rendering" | "Other" | "None";
}

interface UserData {
  id: number;
  username: string;
  email: string;
  role?: string;
  imageURL?: string;
}

interface ProjectViewer {
  id: number;          // project_viewers.id
  user_id: number;
  project_id: number;
  added_at: string;
  username: string;
  email: string;
  imageURL?: string;
}

type MainTab = "team" | "viewers";

/* ================= Main Component ================= */
export default function Others_People() {
  /* ─── auth / project ─── */
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [permission, setPermission] = useState<string | null>(null);
  const canManage   = ["Admin", "Producer", "Owner"].includes(permission || "");
  const canEdit     = ["Admin", "Producer", "Supervisor", "Owner"].includes(permission || "");
  const canEditPerm = ["Admin", "Owner"].includes(permission || "");

  /* ─── tabs ─── */
  const [activeTab, setActiveTab] = useState<MainTab>("team");

  /* ─── team state ─── */
  const [people, setPeople]         = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [editingCell, setEditingCell] = useState<{ id: number; field: keyof Person } | null>(null);
  const [editValue, setEditValue]   = useState("");
  const [showCreatePerson, setShowCreatePerson] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [allUsers, setAllUsers]     = useState<UserData[]>([]);

  /* ─── viewers state ─── */
  const [viewers, setViewers]             = useState<ProjectViewer[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [showAddViewer, setShowAddViewer] = useState(false);

  /* ─── seats ─── */
  const [totalSeats, setTotalSeats] = useState(50);
  const [usedSeats,  setUsedSeats]  = useState(0);

  /* ─── context menu / delete confirm ─── */
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; peopleId: string; peopleEmail: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; peopleId: string; peopleEmail: string } | null>(null);
  const [deleteViewerConfirm, setDeleteViewerConfirm] = useState<ProjectViewer | null>(null);

  /* ─── column widths ─── */
  const [columnWidths] = useState<number[]>([48, 220, 220, 260, 160, 200]);

  const now = new Date();
  const timeString = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: true });

  /* ═══════════ Loaders ═══════════ */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("projectData");
      const pid = localStorage.getItem("projectId");
      if (pid) setProjectId(parseInt(pid));
      if (!raw) { setProjectName("My Animation"); return; }
      const d = JSON.parse(raw);
      if (d.permission) { setPermission(d.permission); localStorage.setItem("Permiss", d.permission); }
      const name = d.projectName || d.projectInfo?.project?.projectName || d.projectInfo?.projectName || "My Animation";
      setProjectName(name);
    } catch { setProjectName("My Animation"); }
  }, []);

  useEffect(() => {
    fetchPeople();
    fetchSeatsInfo();
    getAllUsers();
  }, []);

  useEffect(() => {
    if (activeTab === "viewers" && projectId) fetchViewers();
  }, [activeTab, projectId]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const getAllUsers = async () => {
    try {
      const res = await fetch(ENDPOINTS.GETALLUSERS);
      const data = await res.json();
      if (Array.isArray(data)) setAllUsers(data);
    } catch { setAllUsers([]); }
  };

  const fetchPeople = async () => {
    try {
      setLoadingPeople(true);
      const res = await axios.post(ENDPOINTS.GETPEOPLE, {
        projectId: localStorage.getItem("projectId") || null,
      });
      const data: Person[] = res.data;
      setPeople(data);
      setUsedSeats(data.length);
    } catch { setPeople([]); setUsedSeats(0); }
    finally { setLoadingPeople(false); }
  };

  const fetchSeatsInfo = async () => {
    try {
      const res = await fetch(ENDPOINTS.SEATS);
      const data = await res.json();
      setTotalSeats(data.total || 50);
    } catch { setTotalSeats(50); }
  };

  const fetchViewers = async () => {
    try {
      setLoadingViewers(true);
      const res = await fetch(ENDPOINTS.PROJECT_VIEWERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (Array.isArray(data)) setViewers(data);
      else if (Array.isArray(data.viewers)) setViewers(data.viewers);
    } catch { setViewers([]); }
    finally { setLoadingViewers(false); }
  };

  /* ═══════════ Team Edit ═══════════ */
  const handleCellClick = (id: number, field: keyof Person, val: string) => {
    if (!canEdit) return;
    if (field === "permissionGroup" && !canEditPerm) return;
    setEditingCell({ id, field });
    setEditValue(val);
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;
    try {
      setPeople(people.map(p => p.id === editingCell.id ? { ...p, [editingCell.field]: editValue } : p));
      const actor = JSON.parse(localStorage.getItem("authUser") || "{}");
      await fetch(`${ENDPOINTS.PEOPLE}/${editingCell.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editingCell.field]: editValue, permission: localStorage.getItem("Permiss"), email: actor.email }),
      });
    } catch { fetchPeople(); }
    finally { setEditingCell(null); setEditValue(""); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCellBlur();
    else if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
  };

  const handleDeletePerson = async (peopleId: string) => {
    if (!peopleId) return;
    try {
      const actor = JSON.parse(localStorage.getItem("authUser") || "{}");
      const res = await fetch(ENDPOINTS.DELETEPEOPLE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peopleId: parseInt(peopleId),
          email: deleteConfirm?.peopleEmail || "",
          actorEmail: actor.email,
          permission: localStorage.getItem("Permiss"),
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Failed to delete"); return; }
      setDeleteConfirm(null);
      fetchPeople();
    } catch { alert("Server error"); }
  };

  /* ═══════════ Viewers ═══════════ */
  const handleDeleteViewer = async (viewer: ProjectViewer) => {
    try {
      const res = await fetch(ENDPOINTS.PROJECT_VIEWERS_REMOVE, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: viewer.id, projectId }),
      });
      if (!res.ok) throw new Error();
      setDeleteViewerConfirm(null);
      fetchViewers();
    } catch { alert("Failed to remove viewer"); }
  };

  /* ═══════════ Helpers ═══════════ */
  const startResize = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = columnWidths[index];
    const onMove = (ev: MouseEvent) => {
      const nw = [...columnWidths];
      nw[index] = Math.max(80, startW + ev.clientX - startX);
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const availableSeats = totalSeats - usedSeats;

  /* ═══════════ Render ═══════════ */
  return (
    <div className="h-screen flex flex-col text-gray-200 bg-gray-900">
      <div className="pt-14">
        <Navbar_Project activeTab="other" />
      </div>

      {/* ── Header ── */}
      <header className="w-full px-6 py-4 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl text-gray-200 font-normal">People</h2>
          <span className="text-sm text-gray-400">{availableSeats}/{totalSeats} seats available</span>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-400">{usedSeats} in use</span>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("team")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium border-b-2 transition-all ${
                activeTab === "team"
                  ? "border-blue-500 text-blue-400 bg-gray-800"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <User className="w-4 h-4" />
              Team Members
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "team" ? "bg-blue-500/20 text-blue-300" : "bg-gray-700 text-gray-400"}`}>
                {people.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("viewers")}
              className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium border-b-2 transition-all ${
                activeTab === "viewers"
                  ? "border-emerald-500 text-emerald-400 bg-gray-800"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <Eye className="w-4 h-4" />
              Project Viewers
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "viewers" ? "bg-emerald-500/20 text-emerald-300" : "bg-gray-700 text-gray-400"}`}>
                {viewers.length}
              </span>
            </button>
          </div>

          {/* Add button — changes per tab */}
          <div className="flex items-center gap-3">
            {activeTab === "team" && (
              <>
                <div className="relative">
                  <input type="text" placeholder="Search people..." className="w-56 h-8 pl-3 pr-3 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                </div>
                <button
                  onClick={() => setShowCreatePerson(true)}
                  disabled={!canManage}
                  className={`px-4 py-1.5 text-sm rounded flex items-center gap-1.5 ${canManage ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
                >
                  <Plus className="w-4 h-4" /> Add Person
                </button>
              </>
            )}
            {activeTab === "viewers" && (
              <>
                <div className="relative">
                  <input type="text" placeholder="Search viewers..." className="w-56 h-8 pl-3 pr-3 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500" />
                </div>
                <button
                  onClick={() => setShowAddViewer(true)}
                  disabled={!canManage}
                  className={`px-4 py-1.5 text-sm rounded flex items-center gap-1.5 ${canManage ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}
                >
                  <Plus className="w-4 h-4" /> Add Viewer
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-hidden">

        {/* ══ Tab: Team Members ══ */}
        {activeTab === "team" && (
          <div className="h-full overflow-x-auto overflow-y-auto">
            {loadingPeople ? (
              <div className="text-center text-gray-400 py-10">Loading team members...</div>
            ) : people.length === 0 ? (
              <div className="text-center text-gray-400 py-10">No team members yet. Click "Add Person" to get started.</div>
            ) : (
              <table className="border-collapse table-fixed" style={{ width: columnWidths.reduce((a, b) => a + b, 0) }}>
                <thead className="select-none">
                  <tr>
                    {["", "Name", "Status", "Email", "Permission", "Groups"].map((title, i) => (
                      <th key={i} className="relative px-2 py-2 text-left text-xs font-semibold uppercase sticky top-0 z-30 bg-gray-800 border border-gray-700" style={{ width: columnWidths[i] }}>
                        {title}
                        <div onMouseDown={(e) => startResize(e, i)} className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-blue-500" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-gray-900">
                  {people.map((p) => (
                    <tr key={p.id} className="border-t border-gray-700 hover:bg-gray-800" onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, peopleId: p.id.toString(), peopleEmail: p.email }); }}>
                      <td className="px-2 py-2 border-r border-gray-700" style={{ width: columnWidths[0] }}>
                        <input type="checkbox" />
                      </td>

                      {/* Name */}
                      <td className="px-3 py-1 border-r border-gray-700 cursor-pointer" style={{ width: columnWidths[1] }} onClick={() => handleCellClick(p.id, "name", p.name)}>
                        {editingCell?.id === p.id && editingCell.field === "name" ? (
                          <input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={handleCellBlur} onKeyDown={handleKeyDown} className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm shrink-0">{p.name?.charAt(0)?.toUpperCase()}</div>
                            <span className="text-sm">{p.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-sm border-r border-gray-700 cursor-pointer" style={{ width: columnWidths[2] }} onClick={() => handleCellClick(p.id, "status", p.status)}>
                        {editingCell?.id === p.id && editingCell.field === "status" ? (
                          <select autoFocus disabled={!canEditPerm} value={editValue} onChange={async (e) => {
                            const v = e.target.value;
                            setEditValue(v);
                            setPeople(people.map(x => x.id === p.id ? { ...x, status: v as Person["status"] } : x));
                            const actor = JSON.parse(localStorage.getItem("authUser") || "{}");
                            await fetch(ENDPOINTS.STATUSPEOPLE, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: v, permission: localStorage.getItem("Permiss"), email: actor.email }) }).catch(() => fetchPeople());
                            setEditingCell(null);
                          }} onBlur={handleCellBlur} className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none">
                            <option>Active</option><option>Inactive</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{p.status}</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-3 py-2 text-sm border-r border-gray-700" style={{ width: columnWidths[3] }}>
                        <span className="underline hover:text-blue-300">{p.email}</span>
                      </td>

                      {/* Permission */}
                      <td className="px-3 py-2 text-sm border-r border-gray-700 cursor-pointer" style={{ width: columnWidths[4] }} onClick={() => handleCellClick(p.id, "permissionGroup", p.permissionGroup || "")}>
                        {editingCell?.id === p.id && editingCell.field === "permissionGroup" ? (
                          <select autoFocus disabled={!canEditPerm} value={editValue} onChange={async (e) => {
                            const v = e.target.value;
                            setEditValue(v);
                            setPeople(people.map(x => x.id === p.id ? { ...x, permissionGroup: v as Person["permissionGroup"] } : x));
                            const actor = JSON.parse(localStorage.getItem("authUser") || "{}");
                            await fetch(`${ENDPOINTS.PEOPLE}/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissionGroup: v, permission: localStorage.getItem("Permiss"), email: actor.email }) }).catch(() => fetchPeople());
                            setEditingCell(null);
                          }} onBlur={handleCellBlur} className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none">
                            <option>Artist</option><option>Viewer</option>
                          </select>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">{p.permissionGroup}</span>
                        )}
                      </td>

                      {/* Groups */}
                      <td className="px-3 py-2 text-sm border-r border-gray-700 cursor-pointer" style={{ width: columnWidths[5] }} onClick={() => handleCellClick(p.id, "groups", p.groups)}>
                        {editingCell?.id === p.id && editingCell.field === "groups" ? (
                          <select autoFocus value={editValue} onChange={async (e) => {
                            const v = e.target.value;
                            setEditValue(v);
                            setPeople(people.map(x => x.id === p.id ? { ...x, groups: v as Person["groups"] } : x));
                            const actor = JSON.parse(localStorage.getItem("authUser") || "{}");
                            await fetch(`${ENDPOINTS.PEOPLE}/${p.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groups: v, permission: localStorage.getItem("Permiss"), email: actor.email }) }).catch(() => fetchPeople());
                            setEditingCell(null);
                          }} onBlur={handleCellBlur} onKeyDown={handleKeyDown} className="w-full bg-gray-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none">
                            {["None","FX","Modeling","Animation","Lighting","Compositing","Rigging","Layout","Rendering"].map(g => <option key={g}>{g}</option>)}
                          </select>
                        ) : (
                          <span className="text-gray-300">{p.groups}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══ Tab: Project Viewers ══ */}
        {activeTab === "viewers" && (
          <div className="h-full overflow-y-auto p-6">
            {loadingViewers ? (
              <div className="text-center text-gray-400 py-10">Loading viewers...</div>
            ) : viewers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                  <Eye className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-400 text-sm">No viewers added yet.</p>
                <button onClick={() => setShowAddViewer(true)} disabled={!canManage} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add First Viewer
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-w-3xl">
                {/* info banner */}
                <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                  <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-sm text-gray-300">
                    Viewers can access this project in <span className="text-emerald-400 font-medium">read-only</span> mode. They can review and comment but cannot edit.
                  </p>
                </div>

                {/* viewer cards */}
                {viewers.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors group">
                    <div className="flex items-center gap-3">
                      {v.imageURL ? (
                        <img src={`${ENDPOINTS.image_url}${v.imageURL}`} className="w-9 h-9 rounded-full object-cover" alt={v.username} />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-300 text-sm font-medium">
                          {v.username?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-200 font-medium">{v.username}</p>
                        <p className="text-xs text-gray-400">{v.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        Added {new Date(v.added_at).toLocaleDateString("th-TH")}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full border border-emerald-500/20">
                        Viewer
                      </span>
                      {canManage && (
                        <button onClick={() => setDeleteViewerConfirm(v)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══ Context Menu (team) ═══ */}
      {contextMenu && (
        <div
          className="fixed py-1 z-50 min-w-[150px] bg-gray-800 border border-gray-700 rounded shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          hidden={!canEditPerm}
        >
          <button onClick={() => { if (!contextMenu) return; setDeleteConfirm({ show: true, peopleId: contextMenu.peopleId, peopleEmail: contextMenu.peopleEmail }); setContextMenu(null); }}
            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2 text-sm">
            <Trash2 className="w-4 h-4" /> Delete Person
          </button>
        </div>
      )}

      {/* ═══ Delete Person Confirm ═══ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Delete Person</h3>
                <p className="text-sm text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-900 p-4 mb-6 border border-gray-700">
              <p className="text-gray-300 mb-1">Delete:</p>
              <p className="font-semibold text-gray-100 truncate">"{deleteConfirm.peopleEmail}"</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 font-medium">Cancel</button>
              <button disabled={!canEditPerm} onClick={() => handleDeletePerson(deleteConfirm.peopleId)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Viewer Confirm ═══ */}
      {deleteViewerConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteViewerConfirm(null)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center text-2xl">👁️</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Remove Viewer</h3>
                <p className="text-sm text-gray-400">They will no longer have access to this project.</p>
              </div>
            </div>
            <div className="rounded-lg bg-gray-900 p-4 mb-6 border border-gray-700">
              <p className="font-semibold text-gray-100">{deleteViewerConfirm.username}</p>
              <p className="text-sm text-gray-400">{deleteViewerConfirm.email}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteViewerConfirm(null)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 font-medium">Cancel</button>
              <button onClick={() => handleDeleteViewer(deleteViewerConfirm)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Create Person Modal ═══ */}
      {showCreatePerson && (
        <CreatePersonModal
          onClose={() => setShowCreatePerson(false)}
          onCreated={fetchPeople}
          availableSeats={availableSeats}
          totalSeats={totalSeats}
          timeString={timeString}
          showMoreFields={showMoreFields}
          setShowMoreFields={setShowMoreFields}
          defaultProjectName={projectName}
          allUsers={allUsers}
        />
      )}

      {/* ═══ Add Viewer Modal ═══ */}
      {showAddViewer && projectId && (
        <AddViewerModal
          projectId={projectId}
          existingViewerIds={viewers.map(v => v.user_id)}
          allUsers={allUsers}
          onClose={() => setShowAddViewer(false)}
          onAdded={fetchViewers}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Add Viewer Modal
══════════════════════════════════════════ */
function AddViewerModal({
  projectId,
  existingViewerIds,
  allUsers,
  onClose,
  onAdded,
}: {
  projectId: number;
  existingViewerIds: number[];
  allUsers: UserData[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // กรองเฉพาะ viewer role และยังไม่ได้อยู่ใน project
  const filtered = allUsers.filter(u =>
    !existingViewerIds.includes(u.id) &&
    (u.email?.toLowerCase().includes(search.toLowerCase()) ||
     u.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!selected) { alert("Please select a user"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(ENDPOINTS.PROJECT_VIEWERS_ADD, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userId: selected.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to add viewer");
      }
      onAdded();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add viewer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Add Project Viewer</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-xs text-gray-300">
              Viewers can <span className="text-emerald-400">browse and review</span> this project but cannot make changes.
            </p>
          </div>

          {/* Search user */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Select User</label>
            <div className="relative">
              <input
                type="text"
                value={selected ? `${selected.username} (${selected.email})` : search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Search by name or email..."
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500 pr-8"
              />
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />

              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      {allUsers.length === 0 ? "No users available" : "No matching users"}
                    </div>
                  ) : (
                    filtered.slice(0, 15).map((u) => (
                      <button
                        key={u.id}
                        onMouseDown={() => { setSelected(u); setSearch(""); setShowDropdown(false); }}
                        className="w-full px-3 py-2.5 text-left hover:bg-gray-800 flex items-center gap-3 transition-colors"
                      >
                        {u.imageURL ? (
                          <img src={`${ENDPOINTS.image_url}${u.imageURL}`} className="w-8 h-8 rounded-full object-cover" alt={u.username} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-300 text-xs font-medium shrink-0">
                            {u.username?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-white">{u.username}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                        {u.role && (
                          <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{u.role}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected preview */}
          {selected && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              {selected.imageURL ? (
                <img src={`${ENDPOINTS.image_url}${selected.imageURL}`} className="w-9 h-9 rounded-full object-cover" alt={selected.username} />
              ) : (
                <div className="w-9 h-9 rounded-full bg-emerald-600/30 flex items-center justify-center text-emerald-300 text-sm font-medium">
                  {selected.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{selected.username}</p>
                <p className="text-xs text-gray-400 truncate">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selected || submitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding...</>
            ) : (
              <><Eye className="w-4 h-4" /> Add Viewer</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Create Person Modal (unchanged logic)
══════════════════════════════════════════ */
function CreatePersonModal({
  onClose, onCreated, availableSeats, totalSeats, timeString,
  showMoreFields, setShowMoreFields, defaultProjectName, allUsers,
}: {
  onClose: () => void;
  onCreated: () => void;
  availableSeats: number;
  totalSeats: number;
  timeString: string;
  showMoreFields: boolean;
  setShowMoreFields: (v: boolean) => void;
  defaultProjectName: string;
  allUsers: UserData[];
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    status: "Active", permissionGroup: "Artist",
    projects: defaultProjectName, groups: "None",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  const filteredUsers = allUsers.filter(u => u.email?.toLowerCase().includes(emailSearch.toLowerCase()));

  const submit = async () => {
    if (!form.firstName || !form.lastName) { alert("Please enter first and last name"); return; }
    if (!form.email) { alert("Please enter email"); return; }
    try {
      setIsSubmitting(true);
      const res = await fetch(ENDPOINTS.PEOPLE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email, status: form.status,
          permissionGroup: form.permissionGroup,
          projects: form.projects || defaultProjectName,
          groups: form.groups || "None",
          projectId: localStorage.getItem("projectId") || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      onCreated(); onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create person");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#3b3b3b] rounded shadow-xl">
        <div className="px-5 py-3 border-b border-gray-600 flex items-center justify-between">
          <h2 className="text-lg text-gray-200 font-normal">Create a new Person <span className="text-gray-400 text-base">- Global Form</span></h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          {[["First Name", "firstName"], ["Last Name", "lastName"]].map(([label, key]) => (
            <div key={key} className="grid grid-cols-[140px_1fr] items-center gap-3">
              <label className="text-sm text-gray-300 text-right">{label}:</label>
              <input type="text" value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full h-9 px-3 bg-[#4a4a4a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500" placeholder={`Enter ${label.toLowerCase()}`} />
            </div>
          ))}

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className="text-sm text-gray-300 text-right">Email:</label>
            <div className="relative">
              <input type="email" value={emailSearch}
                onChange={(e) => { setEmailSearch(e.target.value); setForm({ ...form, email: e.target.value }); setShowEmailDropdown(true); }}
                onFocus={() => setShowEmailDropdown(true)}
                onBlur={() => setTimeout(() => setShowEmailDropdown(false), 200)}
                className="w-full h-9 px-3 bg-[#4a4a4a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Search or enter email" />
              {showEmailDropdown && emailSearch && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#4a4a4a] border border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto">
                  {filteredUsers.slice(0, 10).map((u, i) => (
                    <div key={i} onMouseDown={() => { setForm({ ...form, email: u.email }); setEmailSearch(u.email); setShowEmailDropdown(false); }}
                      className="px-3 py-2 hover:bg-[#555] cursor-pointer text-sm text-gray-200">
                      <div className="font-medium">{u.email}</div>
                      <div className="text-xs text-gray-400">{u.username}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-start gap-3">
            <label className="text-sm text-gray-300 text-right pt-2">Status:</label>
            <div>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 bg-[#4a4a4a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500">
                <option>Active</option><option>Inactive</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">ที่นั่งคงเหลือ <span className="text-white">{availableSeats}/{totalSeats}</span> (เวลา {timeString})</p>
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className="text-sm text-gray-300 text-right">Group:</label>
            <select value={form.groups} onChange={(e) => setForm({ ...form, groups: e.target.value })} className="w-full h-9 px-3 bg-[#4a4a4a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500">
              {["None","FX","Modeling","Animation","Lighting","Compositing","Rigging","Layout","Rendering"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className="text-sm text-gray-300 text-right">Permission Group:</label>
            <select value={form.permissionGroup} onChange={(e) => setForm({ ...form, permissionGroup: e.target.value })} className="w-full h-9 px-3 bg-[#4a4a4a] border border-gray-600 rounded text-gray-200 text-sm focus:outline-none focus:border-blue-500">
              <option>Artist</option><option>Viewer</option>
            </select>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <label className="text-sm text-gray-300 text-right">Projects:</label>
            <div className="w-full h-9 px-3 bg-gray-800 border border-gray-600 rounded text-gray-400 text-sm flex items-center">{form.projects || "Project name"}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <div />
            <button onClick={() => setShowMoreFields(!showMoreFields)} className="text-sm text-gray-300 hover:text-gray-100 text-left flex items-center gap-1">
              More fields {showMoreFields ? "▴" : "▾"}
            </button>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-600 flex justify-between items-center">
          <button className="text-sm text-blue-400 hover:underline">Open Bulk Import</button>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={isSubmitting} className="px-4 h-9 bg-[#4a4a4a] hover:bg-[#555] text-gray-200 text-sm rounded disabled:opacity-50">Cancel</button>
            <button onClick={submit} disabled={isSubmitting} className="px-4 h-9 bg-[#00a8e1] hover:bg-[#0096c7] text-white text-sm rounded disabled:opacity-50">
              {isSubmitting ? "Adding..." : "Add Person"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}