/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  Film, FileVideo, Tag, Search, SlidersHorizontal,
  LayoutGrid, List, ChevronDown, ChevronLeft, ChevronRight,
  Plus, MoreHorizontal, Check, Eye, AlertCircle,
} from 'lucide-react';
import Navbar_Project from "../../components/Navbar_Project";
import axios from "axios";
import ENDPOINTS from "../../config";
import PixelLoadingSkeleton from '../../components/PixelLoadingSkeleton';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectFile {
  id: number | string;
  name: string;
  ext: string;
  thumb: string | null;
  link: string;
  linkType: 'asset' | 'shot' | string;
  status: string;
  desc: string;
  user: string;
  date: string;
  tags: string[];
  source: 'asset' | 'shot';      
  version: string;
}

const EXT_CLASS: Record<string, string> = {
  mov:  'bg-red-500/10 border border-red-500/30 text-red-400',
  mp4:  'bg-sky-500/10 border border-sky-500/30 text-sky-400',
  webm: 'bg-violet-500/10 border border-violet-500/30 text-violet-400',
  avi:  'bg-amber-500/10 border border-amber-500/30 text-amber-400',
  mkv:  'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400',
  jpg:  'bg-pink-500/10 border border-pink-500/30 text-pink-400',
  jpeg: 'bg-pink-500/10 border border-pink-500/30 text-pink-400',
  png:  'bg-pink-500/10 border border-pink-500/30 text-pink-400',
  gif:  'bg-orange-500/10 border border-orange-500/30 text-orange-400',
  pdf:  'bg-red-600/10 border border-red-600/30 text-red-500',
  zip:  'bg-neutral-500/10 border border-neutral-500/30 text-neutral-400',
};

const VERSION_STATUS_CLASS: Record<string, string> = {
  wtg:      'bg-gray-700/50 border-gray-600/60 text-gray-400',
  ip:       'bg-blue-900/40 border-blue-700/50 text-blue-300',
  rev:      'bg-amber-900/40 border-amber-700/50 text-amber-400',
  app:      'bg-emerald-900/40 border-emerald-700/50 text-emerald-400',
  approved: 'bg-emerald-900/40 border-emerald-700/50 text-emerald-400',
  pending:  'bg-amber-900/40 border-amber-700/50 text-amber-400',
  rejected: 'bg-red-900/40 border-red-700/50 text-red-400',
};
const VERSION_STATUS_LABEL: Record<string, string> = {
  wtg: 'Waiting',
  ip:  'In Progress',
  rev: 'Review',
  app: 'Approved',
};



function mapFile(raw: any): ProjectFile {
  const name: string = raw.file_name ?? raw.name ?? 'Untitled';
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const rawExt = (raw.file_name ?? raw.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  const isVideoFile = /^(mp4|webm|mov|avi|mkv|m4v|ogv|flv|wmv|3gp|ts|mts|m2ts)$/.test(rawExt);
  const isImageFile = /^(jpg|jpeg|png|gif|webp|bmp|tiff?|svg|avif|heic|heif)$/.test(rawExt);


  const thumb: string | null =
    raw.thumbnail_url ??
    ((isVideoFile || isImageFile) ? (raw.download_url ?? null) : null);

  const linked = raw.linked_entity ?? {};
  const linkName: string = linked.name ?? '—';
  const linkType: string = linked.type ?? raw.source ?? '';
  const linkStr = linkName.length > 26 ? linkName.slice(0, 24) + '…' : linkName;

  const uploaderObj = raw.uploaded_by ?? {};
  const user = typeof uploaderObj === 'string'
    ? uploaderObj
    : (uploaderObj.name ?? uploaderObj.email ?? 'Manager');

  const ver = raw.version;
  const versionLabel = ver
    ? `${ver.name ?? ''}${ver.number != null ? ` (v${ver.number})` : ''}`.trim()
    : '';

  const dateRaw: string = raw.created_at ?? '';
  let date = '—';
  if (dateRaw) {
    try {
      date = new Date(dateRaw).toLocaleString('en-US', {
        month: '2-digit', day: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { date = dateRaw; }
  }

  const status = ver?.status ?? '';

  return {
    id: raw.id ?? Math.random(),
    name,
    ext,
    thumb,
    link: linkStr,
    linkType,
    status,
    desc: raw.description ?? '',
    user,
    date,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    source: raw.source === 'shot' ? 'shot' : 'asset',
    version: versionLabel,
  };
}

function FileIcon({ ext }: { ext: string }) {
  const cls = EXT_CLASS[ext] ?? 'bg-gray-500/10 border border-gray-500/30 text-gray-400';
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded shrink-0 ${cls}`}>
      <Film size={11} />
    </span>
  );
}



function Divider() { return <div className="w-px h-5 bg-gray-700 mx-0.5" />; }

function VideoThumb({ src }: { src: string }) {
  const cacheBusted = src.includes('?') ? `${src}&_cb=1` : `${src}?_cb=1`;

  return (
    <video
      src={cacheBusted}
      className="h-14 w-auto max-w-[104px] rounded object-cover border border-gray-600"
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none'; }}
    />
  );
}



function ToolbarBtn({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 bg-transparent border border-gray-600 rounded px-2.5 py-1 text-gray-400 text-xs cursor-pointer hover:border-gray-500 hover:text-gray-200 transition-colors">
      {icon} {label} <ChevronDown size={11} className="opacity-50" />
    </button>
  );
}

function ViewBtn({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button className={`flex items-center justify-center px-2 py-1.5 border-none cursor-pointer transition-colors ${active ? 'bg-blue-900/40 text-blue-300' : 'bg-gray-800 text-gray-600 hover:text-gray-400'}`}>
      {children}
    </button>
  );
}

function Th({ children, onClick, sortable }: {
  children?: React.ReactNode; onClick?: () => void; sortable?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-2.5 py-1.5 text-left font-semibold text-gray-500 text-[11px] tracking-wide whitespace-nowrap select-none ${sortable ? 'cursor-pointer hover:text-gray-300' : 'cursor-default'}`}
    >
      {children}
    </th>
  );
}

function PagBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[26px] h-6 px-1.5 flex items-center justify-center rounded text-[11px] border transition-colors
        ${active ? 'border-blue-500 bg-blue-900/40 text-blue-300' : 'border-gray-600 bg-transparent text-gray-500 hover:text-gray-300'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );
}

type TabKey = 'all' | 'asset' | 'shot';

function TabBtn({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors border
        ${active
          ? 'bg-blue-900/40 border-blue-600 text-blue-300'
          : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
        }`}
    >
      {label}
      <span className={`px-1.5 py-px rounded-full text-[10px] ${active ? 'bg-blue-700/60 text-blue-200' : 'bg-gray-700 text-gray-400'}`}>
        {count}
      </span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100, 200];

export default function ProjectFiles() {
  const [assetFiles, setAssetFiles] = useState<ProjectFile[]>([]);
  const [shotFiles,  setShotFiles]  = useState<ProjectFile[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error,   setError]         = useState<string | null>(null);

  const [activeTab, setActiveTab]   = useState<TabKey>('all');
  const [selected, setSelected]     = useState<Set<number | string>>(new Set());
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(25);
  const [sortCol, setSortCol]       = useState<keyof ProjectFile>('date');
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const storedData = localStorage.getItem('projectData');
        let projectId: string | number | null = null;
        if (storedData) {
          const pd = JSON.parse(storedData);
          projectId =
            pd.projectId ?? pd.id ??
            pd.projectInfo?.project?.id ??
            pd.projectInfo?.projects?.[0]?.id ?? null;
        }

        const url = projectId
          ? `${ENDPOINTS.ALL_PROJECT_FILES}?project_id=${projectId}`
          : ENDPOINTS.ALL_PROJECT_FILES;

        const res = await axios.post(url);

        const data = res.data ?? {};
        const rawAsset: any[] = Array.isArray(data.asset_files) ? data.asset_files : [];
        const rawShot:  any[] = Array.isArray(data.shot_files)  ? data.shot_files  : [];

        setAssetFiles(rawAsset.map(mapFile));
        setShotFiles(rawShot.map(mapFile));
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setAssetFiles([]);
          setShotFiles([]);
        } else {
          setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load files');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const allFiles = [...assetFiles, ...shotFiles];

  const tabFiles: Record<TabKey, ProjectFile[]> = {
    all:   allFiles,
    asset: assetFiles,
    shot:  shotFiles,
  };

  const baseFiles = tabFiles[activeTab];

  const filtered = baseFiles.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.user.toLowerCase().includes(search.toLowerCase()) ||
    f.link.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const va = String(a[sortCol] ?? '');
    const vb = String(b[sortCol] ?? '');
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const total      = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged      = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleRow = (id: number | string) =>
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () =>
    setSelected(prev =>
      prev.size === paged.length && paged.length > 0
        ? new Set()
        : new Set(paged.map(f => f.id))
    );

  const handleSort = (col: keyof ProjectFile) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
    setSelected(new Set());
  };

  const Arrow = ({ col }: { col: keyof ProjectFile }) =>
    sortCol === col
      ? <span className="ml-1 opacity-80">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : null;

  return (
    <div className="h-screen flex flex-col bg-gray-900">

      {/* Navbar */}
      <div className="pt-14">
        <Navbar_Project activeTab="other" />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3.5 py-1.5 border-b border-gray-700 bg-[#20242a] shrink-0">
        {/* Add File */}
        <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-none rounded px-3 py-1 text-xs font-semibold cursor-pointer transition-colors">
          <Plus size={13} /> Add File
        </button>
        <button className="flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white border-none rounded px-1.5 py-1 cursor-pointer transition-colors">
          <ChevronDown size={13} />
        </button>

        <Divider />

        {/* Source tabs */}
        <TabBtn label="All"    count={allFiles.length}   active={activeTab === 'all'}   onClick={() => handleTabChange('all')} />
        <TabBtn label="Assets" count={assetFiles.length} active={activeTab === 'asset'} onClick={() => handleTabChange('asset')} />
        <TabBtn label="Shots"  count={shotFiles.length}  active={activeTab === 'shot'}  onClick={() => handleTabChange('shot')} />

        <Divider />

        {(['Sort', 'Group', 'Fields'] as const).map(label => (
          <ToolbarBtn key={label} icon={<SlidersHorizontal size={12} />} label={label} />
        ))}
        <ToolbarBtn icon={<MoreHorizontal size={12} />} label="More" />

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-1.5 bg-[#15181c] border border-gray-700 rounded px-2.5 py-1 w-48">
          <Search size={12} className="text-gray-600 shrink-0" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Files…"
            className="bg-transparent border-none outline-none text-[#cdd1d8] text-xs w-full placeholder-gray-600 font-mono"
          />
        </div>

        {/* View toggle */}
        <div className="flex border border-gray-700 rounded overflow-hidden">
          <ViewBtn active><List size={13} /></ViewBtn>
          <ViewBtn><LayoutGrid size={13} /></ViewBtn>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto">

        {loading && (
        <PixelLoadingSkeleton />
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 text-red-400">
            <AlertCircle size={28} />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="mt-1 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs border-none cursor-pointer transition-colors font-mono"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && allFiles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2.5 text-gray-600">
            <FileVideo size={36} className="text-gray-700" />
            <span className="text-sm text-gray-500">No files found for this project</span>
          </div>
        )}

        {/* Table */}
        {!loading && !error && allFiles.length > 0 && (
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 32 }} />
              <col style={{ width: '26%' }} />
              <col style={{ width: 120 }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: 76 }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: 148 }} />
              <col style={{ width: '10%' }} />
            </colgroup>

            <thead>
              <tr className="bg-[#20242a] border-b-2 border-gray-700 sticky top-0 z-10">
                <Th>
                  <input
                    type="checkbox"
                    checked={selected.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                    className="accent-blue-500 cursor-pointer"
                  />
                </Th>
                <Th onClick={() => handleSort('name')} sortable>File <Arrow col="name" /></Th>
                <Th>Thumbnail</Th>
                <Th>Links</Th>
                <Th onClick={() => handleSort('status')} sortable>Status <Arrow col="status" /></Th>
                <Th>Description</Th>
                <Th onClick={() => handleSort('user')} sortable>Created by <Arrow col="user" /></Th>
                <Th onClick={() => handleSort('date')} sortable>Date Created <Arrow col="date" /></Th>
                <Th>Tags</Th>
              </tr>
            </thead>

            <tbody>
              {paged.map((file, i) => {
                const isSel   = selected.has(file.id);
                const rowBase = isSel
                  ? 'bg-blue-900/20'
                  : i % 2 === 0 ? 'bg-[#1c1f23]' : 'bg-[#1e2227]';

                return (
                  <tr
                    key={`${file.source}-${file.id}`}
                    onClick={() => toggleRow(file.id)}
                    className={`${rowBase} border-b border-gray-800 cursor-pointer hover:bg-[#252b33] transition-colors`}
                  >

                    {/* ── Checkbox ── */}
                    <td className="px-2.5 align-middle">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isSel ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-600'}`}>
                        {isSel && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                    </td>

                    {/* ── File name ── */}
                    <td className="px-2.5 py-2 align-middle">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon ext={file.ext} />
                        <span className="text-[#5b9cf6] text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                          {file.name}
                        </span>
                      </div>
                    </td>

                    {/* ── Thumbnail ── */}
                    <td className="px-2.5 py-1.5 align-middle">
                      {(() => {
                        const ext     = file.ext.toLowerCase();
                        const isImage = /^(jpg|jpeg|png|gif|webp|bmp|tiff?|svg|avif|heic|heif)$/.test(ext);
                        const isVideo = /^(mp4|webm|mov|avi|mkv|m4v|ogv|flv|wmv|3gp|ts|mts|m2ts)$/.test(ext);

                        const base = (ENDPOINTS.image_url ?? '').replace(/\/$/, '');
                        const src  = file.thumb
                          ? (file.thumb.startsWith('http') ? file.thumb : `${base}/${file.thumb.replace(/^\//, '')}`)
                          : null;

                        if (src && isImage) return (
                          <img src={src} alt="thumb"
                            className="h-14 w-auto max-w-[104px] rounded object-cover border border-gray-600"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        );

                        if (src && isVideo) return <VideoThumb src={src} />;

                        return (
                          <div className="h-14 w-[104px] rounded bg-[#15181c] border border-gray-700 flex flex-col items-center justify-center gap-1">
                            {isVideo
                              ? <Film     size={18} className="text-sky-800" />
                              : <FileVideo size={18} className="text-gray-600" />}
                            {ext && <span className="text-[9px] uppercase tracking-widest text-gray-600">{ext}</span>}
                          </div>
                        );
                      })()}
                    </td>

                    {/* ── Links ── */}
                    <td className="px-2.5 py-2 align-middle">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <div className="w-5 h-5 rounded shrink-0 bg-[#2a2f38] border border-gray-700 flex items-center justify-center">
                          <Film size={10} className="text-gray-400" />
                        </div>
                        <span className="text-[#5b9cf6] text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                          {file.link || '—'}
                        </span>
                      </div>
                    </td>

                    {/* ── Status ── */}
                    <td className="px-2.5 py-2 align-middle">
                      {file.status ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold whitespace-nowrap
                          ${VERSION_STATUS_CLASS[file.status.toLowerCase()] ?? 'bg-gray-700/40 border-gray-600 text-gray-400'}`}>
                          {VERSION_STATUS_LABEL[file.status.toLowerCase()] ?? file.status}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>

                    {/* ── Description ── */}
                    <td className="px-2.5 py-2 align-middle">
                      <span className={`block text-xs overflow-hidden text-ellipsis whitespace-nowrap ${file.desc ? 'text-gray-300' : 'text-gray-600'}`}>
                        {file.desc || ''}
                      </span>
                    </td>

                    {/* ── Created by ── */}
                    <td className="px-2.5 py-2 align-middle">
                      <div className="flex items-center gap-1.5">
                        <div className="w-[18px] h-[18px] rounded-full shrink-0 bg-blue-900/50 flex items-center justify-center">
                          <Eye size={9} className="text-blue-300" />
                        </div>
                        <span className="text-[#5b9cf6] text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                          {file.user}
                        </span>
                      </div>
                    </td>

                    {/* ── Date Created ── */}
                    <td className="px-2.5 py-2 align-middle">
                      <span className="text-gray-400 text-xs whitespace-nowrap">{file.date}</span>
                    </td>

                    {/* ── Tags ── */}
                    <td className="px-2.5 py-2 align-middle">
                      {file.tags.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {file.tags.slice(0, 2).map(t => (
                            <span key={t} className="px-1.5 py-px rounded bg-blue-900/30 border border-blue-800/50 text-blue-300 text-[10px]">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button className="flex items-center gap-1 px-1.5 py-0.5 bg-transparent border border-dashed border-gray-700 rounded text-gray-600 text-[10px] cursor-pointer hover:border-gray-500 hover:text-gray-400 transition-colors">
                          <Tag size={8} /> tag
                        </button>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination Footer ── */}
      {!loading && !error && allFiles.length > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-700 bg-[#20242a] shrink-0 text-[11px] text-gray-500">
          <span className="flex items-center gap-2">
            {total === 0 ? '0' : `${(page - 1) * pageSize + 1} – ${Math.min(page * pageSize, total)}`} of {total} Files
            {selected.size > 0 && (
              <span className="text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded">
                {selected.size} selected
              </span>
            )}
          </span>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Rows:</span>
              <div className="flex items-center gap-0.5 border border-gray-700 rounded overflow-hidden">
                {PAGE_SIZE_OPTIONS.map(size => (
                  <button
                    key={size}
                    onClick={() => { setPageSize(size); setPage(1); }}
                    className={`px-2 py-0.5 text-[11px] transition-colors border-none cursor-pointer
                      ${pageSize === size
                        ? 'bg-blue-900/50 text-blue-300'
                        : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-700/40'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <PagBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={13} />
              </PagBtn>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                const p = totalPages > 7 ? start + i : i + 1;
                return (
                  <PagBtn key={p} onClick={() => setPage(p)} active={p === page}>
                    {p}
                  </PagBtn>
                );
              })}
              <PagBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={13} />
              </PagBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}