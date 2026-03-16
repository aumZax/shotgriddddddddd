import { useLocation, useNavigate } from "react-router-dom";
import {
  Users, Image, Film, Box, Layers, ChevronDown,
  Briefcase, Eye, FolderOpen
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ENDPOINTS from "../config";
import React from "react";
import PixelLoadingSkeleton from "../components/PixelLoadingSkeleton";
// บรรทัดแรกๆ ของไฟล์
import ErrorLoadingState from '../components/Errorloadingstate';
/* ══════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════ */
interface UserState {
  id: number;
  username: string;
  email?: string;
  status?: string;
  permission_group?: string;
  groups_name?: string;
  created_at?: string;
}

interface RawTask {
  id: number;
  task_name: string;
  status: string;
  start_date?: string;
  due_date?: string;
  entity_type?: string;
  entity_id?: number;
  project_id?: number;
  pipeline_step_name?: string;
  pipeline_step_color?: string;
  pipeline_step?: { color_hex?: string; step_name?: string };
  role?: "assignee" | "reviewer";
  assigned_to?: string;
  assigned_user_name?: string;
  assignee_name?: string;
  assignees?: { id: number; username: string }[];
  reviewers?: { id: number; username: string }[];
}

interface EntityDetail {
  status?: string;
  // shot-specific
  cut_in?: number;
  cut_out?: number;
  cut_duration?: number;
  frame_range?: string;
  // asset-specific
  asset_type?: string;
  // sequence-specific
  fps?: number;
  description?: string;
}

interface EntityGroup {
  type: "shot" | "asset" | "sequence";
  entity_id: number;
  entity_name: string;
  project_id?: number;
  project_name?: string;
  file_url?: string;
  entity_detail?: EntityDetail;
  tasks: RawTask[];
}

interface ProjectBucket {
  project_id: number;
  project_name: string;
  entities: EntityGroup[];
}

/* ══════════════════════════════════════════════════════
   STATUS CONFIG  (matches Project_Tasks.tsx)
══════════════════════════════════════════════════════ */
const statusConfig: Record<string, { label: string; fullLabel: string; color: string; icon: string }> = {
  // Status เดิม
  wtg: { label: 'wtg', fullLabel: 'Waiting to Start', color: 'bg-gray-600', icon: '-' },
  ip: { label: 'ip', fullLabel: 'In Progress', color: 'bg-blue-500', icon: 'dot' },
  fin: { label: 'fin', fullLabel: 'Final', color: 'bg-green-500', icon: 'dot' },

  // Pipeline Steps ใหม่
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
  sos: { label: 'sos', fullLabel: 'Send outsource', color: 'bg-violet-500', icon: 'dot' },
  wtc: { label: 'wtc', fullLabel: 'Waiting for Client', color: 'bg-yellow-500', icon: 'dot' },
  arp: { label: 'arp', fullLabel: 'Approval', color: 'bg-green-600', icon: 'dot' },
  vnd: { label: 'vnd', fullLabel: 'Vendor', color: 'bg-purple-800', icon: 'dot' },
};

/* ══════════════════════════════════════════════════════
   ENTITY CONFIG
══════════════════════════════════════════════════════ */
const E = {
  shot: { Icon: Film, label: "Shot", accent: "#0ea5e9", dim: "#0ea5e920" },
  asset: { Icon: Box, label: "Asset", accent: "#f97316", dim: "#f9731620" },
  sequence: { Icon: Layers, label: "Sequence", accent: "#8b5cf6", dim: "#8b5cf620" },
} as const;

const PROJECT_COLORS = [
  "#0ea5e9", "#10b981", "#f97316", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f59e0b", "#3b82f6", "#84cc16", "#ef4444",
];

/* ══════════════════════════════════════════════════════
   STATUS BADGE COMPONENT
══════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.wtg;
  return (
    <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800">
      {cfg.icon === "-" ? (
        <span className="text-gray-500 font-bold w-3 text-center text-sm">-</span>
      ) : (
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.color} shadow-sm`} />
      )}
      <span className="text-xs text-gray-300 font-medium">{cfg.label}</span>
    </div>
  );
}

function AssignedCell({ assignees }: { assignees: { id: number; username: string }[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!assignees || assignees.length === 0) {
    return <span className="text-xs text-gray-600 italic">—</span>;
  }

  const COLORS = [
    { bg: "rgba(99,102,241,0.2)", border: "rgba(99,102,241,0.4)", text: "#818cf8" },
    { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.4)", text: "#34d399" },
    { bg: "rgba(249,115,22,0.2)", border: "rgba(249,115,22,0.4)", text: "#fb923c" },
    { bg: "rgba(236,72,153,0.2)", border: "rgba(236,72,153,0.4)", text: "#f472b6" },
    { bg: "rgba(14,165,233,0.2)", border: "rgba(14,165,233,0.4)", text: "#38bdf8" },
  ];

  const visible = expanded ? assignees : assignees.slice(0, 2);
  const hiddenCount = assignees.length - 2;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Avatar stack row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {visible.map((a, i) => {
          const c = COLORS[i % COLORS.length];
          return (
            <div key={a.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                style={{ background: c.border, color: c.text }}>
                {a.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium truncate max-w-[90px]" style={{ color: c.text }}>
                {a.username}
              </span>
            </div>
          );
        })}

        {/* +N badge / collapse button */}
        {assignees.length > 2 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-all hover:scale-110"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af" }}
            title={assignees.slice(2).map(a => a.username).join(", ")}
          >
            +{hiddenCount}
          </button>
        )}
      </div>

      {/* Collapse button */}
      {expanded && assignees.length > 2 && (
        <div
          onClick={() => setExpanded(false)}
          className="cursor-pointer text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors text-left"
        >
          ▲ less
        </div>
      )}
    </div>
  );
}
/* ══════════════════════════════════════════════════════
   ENTITY SECTION — flat table rows: entity + task merged
   Each task row shows entity info (thumbnail · name · desc)
   on the left and task info (name · status · assigned) inline
══════════════════════════════════════════════════════ */
function EntitySection({ group }: { group: EntityGroup }) {
  const navigate = useNavigate();
  const cfg = E[group.type];
  const d = group.entity_detail ?? {};
  const description = d.description ?? "";
  const isVideo = group.file_url && /\.(mp4|mov|webm|mkv)$/i.test(group.file_url);

  // How many rows this entity spans
  const rowCount = group.tasks.length;

  return (
    <>
      {group.tasks.map((task, i) => {
        const stepColor = task.pipeline_step?.color_hex ?? task.pipeline_step_color ?? "#374151";
        const stepName = task.pipeline_step?.step_name ?? task.pipeline_step_name;
        const isFirst = i === 0;
        const isLast = i === rowCount - 1;

        return (
          <tr
            key={`${task.id}-${task.role}`}
            className="group hover:bg-white/[0.025] transition-all duration-150"
            style={{
              borderBottom: isLast
                ? `2px solid ${cfg.accent}30`  // เส้นหนาแบ่ง entity
                : "1px solid rgba(255,255,255,0.04)",
              background: isFirst && rowCount > 1
                ? `${cfg.accent}05`
                : undefined,
            }}
          >
            {/* ── ENTITY CELL (rowspan via conditional render + border styling) ── */}
            {isFirst ? (
              <>
                {/* Preview */}
                <td className="align-middle py-3 pl-4 pr-2" rowSpan={rowCount}
                  style={{
                    width: 80, minWidth: 80, borderRight: "1px solid rgba(255,255,255,0.04)",
                    borderLeft: `3px solid ${cfg.accent}`
                  }}>
                  <div style={{ width: 72, height: 52, flexShrink: 0 }} className="relative rounded-lg overflow-hidden">
                    {group.file_url ? (
                      isVideo ? (
                        <video
                          src={`${ENDPOINTS.IMAGE_URL}${group.file_url}`}
                          className="w-full h-full object-cover"
                          style={{ border: `1px solid ${cfg.accent}30` }}
                          muted autoPlay loop aria-hidden
                          onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                          onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                        />
                      ) : (
                        <img
                          src={`${ENDPOINTS.IMAGE_URL}${group.file_url}`}
                          alt={group.entity_name}
                          className="w-full h-full object-cover"
                          style={{ border: `1px solid ${cfg.accent}30` }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-lg">
                        <Image className="w-4 h-4 text-gray-500" />
                        <p className="text-gray-500 text-[9px]">No Image</p>
                      </div>
                    )}
                    {/* type badge */}
                    <span className="absolute top-1 left-1 text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded"
                      style={{ color: cfg.accent, background: "#0f172acc", border: `1px solid ${cfg.accent}30` }}>
                      {cfg.label}
                    </span>
                  </div>
                </td>

                {/* Name */}
                {/* Name */}
                <td className="align-middle py-3 px-3" rowSpan={rowCount}
                  style={{ minWidth: 120, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                  <p
                    className="text-sm font-semibold leading-snug truncate max-w-[110px] text-slate-50 hover:text-blue-400 underline decoration-slate-100 hover:decoration-blue-400 underline-offset-2 transition-colors cursor-pointer"
                    title={group.entity_name}
                    onClick={() => {
                      // set projectId และ projectData ก่อน (Others_* ต้องการ)
                      localStorage.setItem("projectId", JSON.stringify(group.project_id));
                      localStorage.setItem("projectData", JSON.stringify({
                        projectId: group.project_id,
                        projectName: group.project_name ?? "",
                        thumbnail: "",
                        createdBy: "",
                        createdAt: new Date().toISOString(),
                        fetchedAt: new Date().toISOString(),
                        projectInfo: null,
                        projectDetails: null,
                      }));

                      if (group.type === 'sequence') {
                        localStorage.setItem("sequenceData", JSON.stringify({
                          sequenceId: group.entity_id,
                          projectId: group.project_id
                        }));
                        navigate("/Project_Sequence/Others_Sequence");
                      } else if (group.type === 'shot') {
                        localStorage.setItem("selectedShot", JSON.stringify({
                          id: group.entity_id
                        }));
                        navigate("/Project_Shot/Others_Shot");
                      } else if (group.type === 'asset') {
                        localStorage.setItem("selectedAsset", JSON.stringify({
                          id: group.entity_id
                        }));
                        navigate("/Project_Assets/Others_Asset");
                      }
                    }}
                  >
                    {group.entity_name}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: cfg.accent + "15", color: cfg.accent, border: `1px solid ${cfg.accent}25` }}>
                    {rowCount} task{rowCount !== 1 ? "s" : ""}
                  </span>
                </td>

                {/* Entity Status */}
                <td className="align-middle py-3 px-3" rowSpan={rowCount}
                  style={{ minWidth: 100, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                  {d.status ? (
                    <StatusBadge status={d.status} />
                  ) : (
                    <span className="text-[11px] text-gray-700 italic">—</span>
                  )}
                </td>

                {/* Description */}
                <td className="align-middle py-3 px-3" rowSpan={rowCount}
                  style={{ minWidth: 140, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                  {description ? (
                    <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed max-w-[160px]">
                      {description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-700 italic">No description</p>
                  )}
                </td>
              </>
            ) : null}

            {/* ── TASK INDEX ── */}
            <td className="px-3 py-3 w-8 align-middle" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-[11px] font-mono text-gray-600 group-hover:text-gray-400">{i + 1}</span>
            </td>

            {/* ── TASK NAME + step ── */}
            <td className="px-3 py-3 align-middle" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: stepColor, boxShadow: `0 0 4px ${stepColor}80` }} />
                <span className="text-sm text-gray-200 font-medium truncate max-w-[200px]" title={task.task_name}>
                  {task.task_name}
                </span>
                {task.role === "reviewer" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-mono flex-shrink-0"
                    style={{ color: "#fbbf24", background: "#fbbf2412", border: "1px solid #fbbf2428" }}>
                    <Eye className="w-2.5 h-2.5" />rev
                  </span>
                )}
              </div>
              {stepName && (
                <p className="text-[10px] text-gray-600 mt-0.5 ml-4 font-mono truncate max-w-[180px]">{stepName}</p>
              )}
            </td>

            {/* ── STATUS ── */}
            <td className="px-3 py-3 align-middle" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <StatusBadge status={task.status} />
            </td>

            {/* ── ASSIGNED ── */}
            <td className="px-3 py-3 pr-4 align-middle">
              <AssignedCell assignees={task.assignees ?? []} />
            </td>
          </tr>
        );
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   PROJECT BUCKET — collapsible section per project
══════════════════════════════════════════════════════ */
function ProjectBucketCard({ bucket, color, index }: { bucket: ProjectBucket; color: string; index: number }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${color}25`,
        background: "rgba(255,255,255,0.02)",
        animation: `fadeSlideIn 0.3s ease both`,
        animationDelay: `${index * 60}ms`,
      }}>

      {/* project header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-all duration-200 group h-10"
        style={{
          background: open
            ? `linear-gradient(90deg, ${color}18 0%, ${color}08 60%, transparent 100%)`
            : `linear-gradient(90deg, ${color}0a 0%, transparent 100%)`,
          borderBottom: open ? `1px solid ${color}20` : "none",
        }}>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />

        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white truncate">{bucket.project_name}</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: color + "15", color }}>
              {bucket.entities.length} {bucket.entities.length === 1 ? "entity" : "entities"}
            </span>
          </div>
        </div>

        {/* entity type chips */}
        <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
          {(["shot", "asset", "sequence"] as const).map(type => {
            const count = bucket.entities.filter(e => e.type === type).length;
            if (!count) return null;
            const ec = E[type];
            return (
              <span key={type} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono"
                style={{ color: ec.accent, background: ec.dim, border: `1px solid ${ec.accent}25` }}>
                <ec.Icon className="w-3 h-3" />{count}
              </span>
            );
          })}
        </div>

        <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-300 flex-shrink-0 transition-all duration-200"
          style={{ transform: open ? "rotate(0)" : "rotate(-90deg)" }} />
      </button>

      {/* entity list — flat table, no per-entity wrapper */}
      {open && (
        <div style={{ borderTop: `1px solid ${color}15` }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <th className="py-2 px-3 pl-4 text-left" style={{ width: 80, minWidth: 80, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Preview</span>
                </th>
                <th className="py-2 px-3 text-left w-84" style={{ minWidth: 120, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Name</span>
                </th>
                <th className="py-2 px-3 text-left w-20" style={{ minWidth: 100, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Entity Status</span>
                </th>
                <th className="py-2 px-3 text-left w-128" style={{ minWidth: 140, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Description</span>
                </th>
                <th className="px-3 py-2 text-left w-8" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">#</span>
                </th>
                <th className="px-3 py-2 text-left w-84" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Task</span>
                </th>
                <th className="px-3 py-2 text-left w-30" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Status</span>
                </th>
                <th className="px-3 py-2 pr-4 text-left">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Assigned</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bucket.entities.map((g, gi) => (
                <React.Fragment key={`${g.type}_${g.entity_id}`}>
                  {gi > 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, height: 6, background: "rgba(255,255,255,0.03)" }} />
                    </tr>
                  )}
                  <EntitySection group={g} />
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   PAGE COMPONENT
══════════════════════════════════════════════════════ */
export default function PeopleList() {
  const location = useLocation();
  const user = location.state?.user as UserState | undefined;

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<EntityGroup[]>([]);
  const [filter, setFilter] = useState<"all" | "shot" | "asset" | "sequence">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadTasks();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── fetch helpers using ENDPOINTS directly ── */
  const fetchMyTasks = (userId: number) =>
    fetch(ENDPOINTS.MY_TASKS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

  const fetchEntityDetail = (type: string, id: number) => {
    const endpointMap: Record<string, string> = {
      shot: ENDPOINTS.PROJECT_SHOT_DETAIL,
      asset: ENDPOINTS.PROJECT_ASSET_DETAIL,
      sequence: ENDPOINTS.PROJECT_SEQUENCE_DETAIL,
    };
    const bodyMap: Record<string, object> = {
      shot: { shotId: id },
      asset: { assetId: id },
      sequence: { sequenceId: id },
    };
    return fetch(endpointMap[type], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyMap[type]),
    });
  };

  const fetchProjectInfo = (projectId: number) =>
    fetch(ENDPOINTS.PROJECTINFO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

  /* ── main loader ── */
  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMyTasks(user.id);
      if (!res.ok) throw new Error(`/my-tasks → ${res.status}`);

      const raw: RawTask[] = await res.json();
      const tasks = raw
        .filter(t => t.entity_type && t.entity_id && ["shot", "asset", "sequence"].includes(t.entity_type!))
        .map(t => ({ ...t, role: "assignee" as const }));

      const uniqueKeys = [...new Set(tasks.map(t => `${t.entity_type}_${t.entity_id}`))];
      console.log("raw tasks sample:", raw[0]);

      const metas = await Promise.all(
        uniqueKeys.map(async key => {
          const [type, idStr] = key.split("_");
          const id = Number(idStr);
          let name = `${type} #${id}`, file_url: string | undefined, project_name: string | undefined;
          const pid = tasks.find(t => t.entity_type === type && t.entity_id === id)?.project_id;

          const nameKeyMap: Record<string, string> = { shot: "shot_name", asset: "asset_name", sequence: "sequence_name" };
          const urlKeyMap: Record<string, string> = { shot: "shot_thumbnail", asset: "asset_thumbnail", sequence: "sequence_thumbnail" };

          let entity_detail: EntityDetail = {};
          try {
            const r = await fetchEntityDetail(type, id);
            if (r.ok) {
              const d = await r.json();
              const row = d[0] ?? {};
              console.log(`[${type}] entity detail row:`, row);  // ← เพิ่มบรรทัดนี้
              name = row[nameKeyMap[type]] ?? name;
              file_url = row[urlKeyMap[type]];
              // capture entity-specific fields
              entity_detail = {
                status: row[`${type}_status`] ?? row.status,
                cut_in: row.cut_in,
                cut_out: row.cut_out,
                cut_duration: row.cut_duration ?? row.duration,
                frame_range: row.frame_range,
                asset_type: row.asset_type ?? row.type,
                fps: row.fps,
                description: row[`${type}_description`] ?? row.description ?? row.shot_description ?? row.asset_description ?? row.sequence_description,
              };
            }
          } catch { /* keep default */ }

          if (pid) {
            try {
              const r2 = await fetchProjectInfo(pid);
              if (r2.ok) { const d2 = await r2.json(); project_name = d2?.projectName; }
            } catch { /* skip */ }
          }
          return { key, name, file_url, entity_detail, project_name, project_id: pid };
        })
      );

      const metaMap = new Map(metas.map(m => [m.key, m]));
      const map: Record<string, EntityGroup> = {};

      for (const task of tasks) {
        const type = task.entity_type as "shot" | "asset" | "sequence";
        const key = `${type}_${task.entity_id}`;
        const meta = metaMap.get(key)!;
        if (!map[key]) {
          map[key] = {
            type, entity_id: task.entity_id!, entity_name: meta.name,
            file_url: meta.file_url, entity_detail: meta.entity_detail,
            project_name: meta.project_name,
            project_id: meta.project_id, tasks: [],
          };
        }
        map[key].tasks.push(task);
      }

      setGroups(Object.values(map));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };


  const filtered = filter === "all" ? groups : groups.filter(g => g.type === filter);

  const projectBuckets = useMemo<ProjectBucket[]>(() => {
    const bucketMap: Record<number, ProjectBucket> = {};
    for (const g of filtered) {
      const pid = g.project_id ?? 0;
      const pname = g.project_name ?? `Project #${pid}`;
      if (!bucketMap[pid]) bucketMap[pid] = { project_id: pid, project_name: pname, entities: [] };
      bucketMap[pid].entities.push(g);
    }

    // Sort projects newest → oldest by project_id (assumes increasing IDs over time)
    return Object.values(bucketMap).sort((a, b) => b.project_id - a.project_id);
  }, [filtered]);

  const entityCounts = {
    shot: groups.filter(g => g.type === "shot").length,
    asset: groups.filter(g => g.type === "asset").length,
    sequence: groups.filter(g => g.type === "sequence").length,
  };

  const tabs = [
    { key: "all", label: "All", count: groups.length },
    ...(entityCounts.shot > 0 ? [{ key: "shot", label: "Shots", count: entityCounts.shot }] : []),
    ...(entityCounts.asset > 0 ? [{ key: "asset", label: "Assets", count: entityCounts.asset }] : []),
    ...(entityCounts.sequence > 0 ? [{ key: "sequence", label: "Sequences", count: entityCounts.sequence }] : []),
  ] as const;

  /* ── loading ── */
  if (loading) return (
    <div className="pt-14 flex items-center justify-center min-h-screen" style={{ background: "#0f172a" }}>
      <div className="text-center">
        <PixelLoadingSkeleton />

      </div>
    </div>
  );

  if (!user) return (
    <div className="pt-14 flex items-center justify-center min-h-screen" style={{ background: "#0f172a" }}>
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(148,163,184,0.22)" }}>
          <Users className="w-9 h-9 text-gray-700" />
        </div>
        <p className="text-gray-400 font-mono text-sm">No user selected</p>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: "#0f172a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Outfit', sans-serif; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex min-h-screen pt-14" style={{ background: "#0f172a" }}>



        {/* ════════════ MAIN CONTENT ════════════ */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* ── sticky toolbar ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-[11px] uppercase tracking-[0.15em] text-gray-400"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Pipeline Assignments
                </span>
              </div>
              <h2 className="text-xl font-bold text-white">
                {user.username}
                <span className="text-gray-400 font-normal text-base ml-2">'s Tasks</span>
              </h2>
            </div>

            {projectBuckets.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <FolderOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">
                  <span className="text-white font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {projectBuckets.length}
                  </span>
                  {" "}project{projectBuckets.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>

          <div className="px-6 py-6 w-full mx-auto">


            {/* ── filter tabs ── */}
            {tabs.length > 1 && (
              <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {tabs.map(tab => {
                  const active = filter === tab.key;
                  const ec = tab.key !== "all" ? E[tab.key as keyof typeof E] : null;
                  return (
                    <div key={tab.key}
                      onClick={() => setFilter(tab.key as typeof filter)}
                      className="cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap"
                      style={active
                        ? { background: "rgba(255,255,255,.12)", color: "#fff" }
                        : { color: "#6b7280" }}>
                      {ec && <ec.Icon className="w-3.5 h-3.5" style={{ color: active ? ec.accent : undefined }} />}
                      {tab.label}
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          background: "rgba(255,255,255,.06)",
                          color: active ? "#d1d5db" : "#4b5563"
                        }}>
                        {tab.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── error ── */}
            {error && (
              <ErrorLoadingState entityName="Assignments Tasks" />
            )}

            {/* ── project buckets ── */}
            {(!error && projectBuckets.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl"
                style={{ background: "rgba(255,255,255,.015)", border: "1px dashed rgba(255,255,255,.07)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <Briefcase className="w-7 h-7 text-gray-700" />
                </div>
                <p className="text-gray-500 font-semibold text-lg">No tasks assigned</p>
                <p className="text-gray-700 text-sm mt-1">This user has no pipeline assignments yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projectBuckets.map((bucket, i) => (
                  <ProjectBucketCard
                    key={bucket.project_id}
                    bucket={bucket}
                    color={PROJECT_COLORS[i % PROJECT_COLORS.length]}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}