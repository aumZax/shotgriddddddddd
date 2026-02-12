/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/SecretSQLConsole.tsx
import { useState, useEffect } from "react";
import { Lock, Play, History, AlertTriangle, Eye, EyeOff, Terminal, Users, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import ENDPOINTS from "../config";


interface QueryResult {
    success: boolean;
    method: string;
    query: string;
    data: any[];
    rowCount: number;
    message?: string;
    error?: string;
}

interface QueryLog {
    id: number;
    query_type: string;
    query_text: string;
    status: string;
    error_message?: string;
    executed_at: string;
}

interface User {
    id: number;
    username?: string;
    email: string;
    role?: string;
    status?: string;
    imageURL?: string;
    [key: string]: any;
}

interface Person {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    [key: string]: any;
}

type ActiveTab = 'console' | 'users';

// ─── Field config: กำหนดว่า field ไหนเป็น dropdown / datetime / email / password ───
const FIELD_CONFIG: Record<string, {
    type: 'text' | 'email' | 'password' | 'dropdown' | 'datetime' | 'number';
    options?: string[];
    label?: string;
}> = {
    status: {
        type: 'dropdown',
        options: ['Active', 'Inactive'],
    },
    permission_group: {
        type: 'dropdown',
        options: ['Admin', 'Supervisor', 'Artist','Viewer'],
    },
    groups_name: {
        type: 'dropdown',
        options: ['FX', 'Animation', 'Lighting', 'Compositing', 'Modeling', 'Rigging', 'Rendering', 'Technical', 'Production'],
    },
    role: {
        type: 'dropdown',
        options: ['Admin', 'Artist', 'Viewer', 'Supervisor'],
    },
    email: { type: 'email' },
    password: { type: 'password' },
    created_at: { type: 'datetime' },
    updated_at: { type: 'datetime' },
    id: { type: 'number' },
};

// ─── แปลง ISO string → MySQL datetime (YYYY-MM-DD HH:MM:SS) ───
function toMySQLDatetime(value: string): string {
    if (!value) return value;
    // ถ้าเป็น ISO format เช่น 2026-02-04T06:41:21.000Z
    if (value.includes('T') || value.includes('Z')) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            // local time
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
    }
    return value;
}

// ─── แปลง MySQL datetime → input[type=datetime-local] format ───
function toDatetimeLocalFormat(value: string): string {
    if (!value) return '';
    // รับทั้ง ISO และ MySQL format
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return value;
}

// ─── Sanitize values ก่อน build SQL ───
function sanitizeValue(key: string, value: any): string {
    if (value === null || value === undefined || value === '') return 'NULL';

    const config = FIELD_CONFIG[key];
    if (config?.type === 'datetime') {
        const converted = toMySQLDatetime(String(value));
        return `'${converted}'`;
    }
    if (config?.type === 'number') {
        return String(parseInt(value) || 0);
    }
    // Escape single quotes
    return `'${String(value).replace(/'/g, "''")}'`;
}

// ─── Smart Field Input Component ───
function FieldInput({
    fieldKey,
    value,
    onChange,
    disabled = false,
    isAdd = false,
}: {
    fieldKey: string;
    value: any;
    onChange: (val: string) => void;
    disabled?: boolean;
    isAdd?: boolean;
}) {
    const config = FIELD_CONFIG[fieldKey] || { type: 'text' };
    const baseClass = "w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

    if (config.type === 'dropdown' && config.options) {
        return (
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={baseClass + " cursor-pointer"}
            >
                <option value="">-- Select --</option>
                {config.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if (config.type === 'datetime') {
        return (
            <input
                type="datetime-local"
                value={toDatetimeLocalFormat(String(value ?? ''))}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={baseClass}
            />
        );
    }

    if (config.type === 'email') {
        return (
            <input
                type="email"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={`Enter ${fieldKey}`}
                className={baseClass}
            />
        );
    }

    if (config.type === 'password') {
        return (
            <div className="space-y-1">
                <input
                    type="password"
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder={isAdd ? "Enter password" : "(leave blank to keep current)"}
                    className={baseClass}
                />
                <p className="text-xs text-blue-400 flex items-center gap-1">
                    <span>🔒</span>
                    Will be automatically hashed by server
                </p>
            </div>
        );
    }

    if (config.type === 'number') {
        return (
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={baseClass}
            />
        );
    }

    // default: text
    return (
        <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={`Enter ${fieldKey}`}
            className={baseClass}
        />
    );
}

// ─── Generic Edit/Add Modal ───
function RecordModal({
    title,
    record,
    isAdd,
    onClose,
    onSave,
    onChange,
    saving,
}: {
    title: string;
    record: Record<string, any>;
    isAdd: boolean;
    onClose: () => void;
    onSave: () => void;
    onChange: (key: string, value: string) => void;
    saving?: boolean;
}) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between shrink-0">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" disabled={saving}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {Object.entries(record).map(([key, value]) => {
                        const isId = key === 'id';
                        const isReadonly = isId || key === 'created_at' && !isAdd;
                        return (
                            <div key={key}>
                                <label className="block text-sm font-medium mb-1.5 text-gray-300 capitalize">
                                    {key.replace(/_/g, ' ')}
                                    {isId && <span className="ml-2 text-xs text-gray-500">(auto)</span>}
                                    {key === 'created_at' && !isAdd && <span className="ml-2 text-xs text-gray-500">(readonly)</span>}
                                </label>
                                <FieldInput
                                    fieldKey={key}
                                    value={value}
                                    onChange={(v) => onChange(key, v)}
                                    disabled={isId || (key === 'created_at' && !isAdd) || saving}
                                    isAdd={isAdd}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2 text-white transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                {isAdd ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isAdd ? 'Add' : 'Save'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}


export default function SecretSQLConsole() {

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [token, setToken] = useState("");
    const [unlocking, setUnlocking] = useState(false);

    const [method, setMethod] = useState<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM'>('SELECT');
    // const [, setTable] = useState("");
    const [query, setQuery] = useState("");
    const [, setTables] = useState<string[]>([]);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<QueryLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    // Users Tab State
    const [activeTab, setActiveTab] = useState<ActiveTab>('console');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Modal state — unified
    const [userModal, setUserModal] = useState<{ record: User; isAdd: boolean } | null>(null);
    const [personModal, setPersonModal] = useState<{ record: Person; isAdd: boolean } | null>(null);
    const [savingUser, setSavingUser] = useState(false);
    const [savingPerson, setSavingPerson] = useState(false);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.altKey && e.key === 'M') {
                e.preventDefault();
                if (!isUnlocked) {
                    const input = document.getElementById('secret-password');
                    if (input) input.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isUnlocked]);

    const verifyPassword = async () => {
        if (!password.trim()) { alert("Please enter password"); return; }
        setUnlocking(true);
        try {
            const response = await fetch(ENDPOINTS.SECRET_VERIFY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (data.success) {
                setToken(data.token);
                setIsUnlocked(true);
                setPassword("");
                fetchTables(data.token);
                fetchLogs(data.token);
            } else {
                alert("Invalid password");
                setPassword("");
            }
        } catch {
            alert("Connection error");
        } finally {
            setUnlocking(false);
        }
    };

    const fetchTables = async (authToken: string) => {
        try {
            const response = await fetch(ENDPOINTS.SECRET_TABLES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: authToken })
            });
            const data = await response.json();
            if (data.success) setTables(data.tables.map((t: any) => t.table_name || t.TABLE_NAME));
        } catch (err) { console.error("Failed to fetch tables:", err); }
    };

    const fetchLogs = async (authToken: string) => {
        try {
            const response = await fetch(ENDPOINTS.SECRET_LOGS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: authToken })
            });
            const data = await response.json();
            if (data.success) setLogs(data.logs);
        } catch (err) { console.error("Failed to fetch logs:", err); }
    };

    // ═══════════ Users Tab ═══════════

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await fetch(ENDPOINTS.GETALLUSERS);
            const data = await response.json();
            if (Array.isArray(data)) setAllUsers(data);
        } catch (err) { console.error("Failed to fetch users:", err); }
        finally { setLoadingUsers(false); }
    };

    const fetchPeople = async () => {
        setLoadingUsers(true);
        try {
            const response = await fetch(ENDPOINTS.GETALLPEOPLE);
            const data = await response.json();
            if (Array.isArray(data)) setPeople(data);
        } catch (err) { console.error("Failed to fetch people:", err); }
        finally { setLoadingUsers(false); }
    };

    useEffect(() => {
        if (activeTab === 'users') { fetchAllUsers(); fetchPeople(); }
    }, [activeTab]);

    // ─── Build SQL with sanitized values ───
    const buildSQL = (tableName: string, record: Record<string, any>, isInsert: boolean): string => {
        const fields = Object.keys(record).filter(k => k !== 'id');

        if (isInsert) {
            const cols = fields.join(', ');
            const vals = fields.map(f => sanitizeValue(f, record[f])).join(', ');
            return `INSERT INTO ${tableName} (${cols}) VALUES (${vals})`;
        } else {
            const updates = fields.map(f => `${f} = ${sanitizeValue(f, record[f])}`).join(', ');
            return `UPDATE ${tableName} SET ${updates} WHERE id = ${record.id}`;
        }
    };

    const executeSQL = async (sql: string, methodType: string, tableName: string): Promise<boolean> => {
        try {
            const response = await fetch(ENDPOINTS.SECRET_EXECUTE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: methodType, table: tableName, query: sql, token })
            });
            return response.ok;
        } catch {
            return false;
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Delete this user?')) return;
        const ok = await executeSQL(`DELETE FROM users WHERE id = ${id}`, 'DELETE', 'users');
        ok ? (alert('Deleted'), fetchAllUsers()) : alert('Failed to delete');
    };

    const handleDeletePerson = async (id: number) => {
        if (!confirm('Delete this person?')) return;
        const ok = await executeSQL(`DELETE FROM people WHERE id = ${id}`, 'DELETE', 'people');
        ok ? (alert('Deleted'), fetchPeople()) : alert('Failed to delete');
    };

    const handleSaveUser = async () => {
        if (!userModal) return;
        setSavingUser(true);
        
        try {
            const { record, isAdd } = userModal;
            const sql = buildSQL('users', record, isAdd);
            
            // Backend จะ hash password ให้เอง
            const ok = await executeSQL(sql, isAdd ? 'INSERT' : 'UPDATE', 'users');
            
            if (ok) {
                alert(isAdd ? 'User added!' : 'User updated!');
                setUserModal(null);
                fetchAllUsers();
            } else {
                alert('Save failed — check console');
            }
        } catch (err) {
            console.error('Error saving user:', err);
            alert('Save failed — check console');
        } finally {
            setSavingUser(false);
        }
    };

    const handleSavePerson = async () => {
        if (!personModal) return;
        setSavingPerson(true);
        
        try {
            const { record, isAdd } = personModal;
            const sql = buildSQL('people', record, isAdd);
            const ok = await executeSQL(sql, isAdd ? 'INSERT' : 'UPDATE', 'people');
            
            if (ok) {
                alert(isAdd ? 'Person added!' : 'Person updated!');
                setPersonModal(null);
                fetchPeople();
            } else {
                alert('Save failed — check console');
            }
        } catch (err) {
            console.error('Error saving person:', err);
            alert('Save failed — check console');
        } finally {
            setSavingPerson(false);
        }
    };

    // ─── Get blank template from existing data schema ───
    const getBlankUser = (): User => {
        if (allUsers.length > 0) {
            const blank: Record<string, any> = { id: 0 };
            Object.keys(allUsers[0]).filter(k => k !== 'id').forEach(k => { blank[k] = ''; });
            return blank as User;
        }
        return { id: 0, username: '', email: '', role: '', status: '', imageURL: '', password: '' };
    };

    const getBlankPerson = (): Person => {
        if (people.length > 0) {
            const blank: Record<string, any> = { id: 0 };
            Object.keys(people[0]).filter(k => k !== 'id').forEach(k => { blank[k] = ''; });
            return blank as Person;
        }
        return { id: 0, firstname: '', lastname: '', email: '', status: '', permission_group: '', groups_name: '' };
    };

    // ═══════════ SQL Console ═══════════

    const executeQuery = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await fetch(ENDPOINTS.SECRET_EXECUTE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, table: '', query, token })
            });
            const data = await response.json();

            if (response.ok) {
                let resultData = [];
                if (Array.isArray(data.data)) {
                    resultData = data.data.length > 0 && Array.isArray(data.data[0]) ? data.data[0] : data.data;
                } else if (data.data && typeof data.data === 'object') {
                    resultData = [data.data];
                }
                setResult({ ...data, data: resultData, rowCount: resultData.length });
                fetchLogs(token);
            } else {
                setResult({ success: false, method, query: data.query || query, data: [], rowCount: 0, error: data.error });
            }
        } catch (err) {
            setResult({ success: false, method, query, data: [], rowCount: 0, error: err instanceof Error ? err.message : "Network error" });
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        switch (method) {
            case 'SELECT': return "SELECT * FROM users WHERE id = 1\nSELECT name, email FROM users LIMIT 10";
            case 'INSERT': return "INSERT INTO users (name, email, status) VALUES ('John', 'john@example.com', 'Active')";
            case 'UPDATE': return "UPDATE users SET status = 'Inactive' WHERE id = 1";
            case 'DELETE': return "DELETE FROM users WHERE id = 1";
            case 'CUSTOM': return "-- Any SQL\nSHOW TABLES;\nDESCRIBE users;";
            default: return "";
        }
    };

    // ═══════════ Render: Lock Screen ═══════════
    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-center text-white mb-2">Secret SQL Console</h1>
                        <p className="text-center text-gray-400 text-sm mb-6">Restricted Area — Authorized Personnel Only</p>
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    id="secret-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                                    placeholder="Enter secret password"
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500 pr-12"
                                    autoFocus
                                />
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            <button
                                onClick={verifyPassword}
                                disabled={unlocking}
                                className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {unlocking ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Verifying...
                                    </span>
                                ) : "Unlock Console"}
                            </button>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-700">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-400">All actions are logged and monitored. Unauthorized access is prohibited.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════ Render: Main Console ═══════════
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-6">
            {/* Header */}
            <header className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Secret SQL Console</h1>
                            <p className="text-sm text-gray-400">Direct Database Access</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'console' && (
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 text-sm border border-gray-700"
                            >
                                <History className="w-4 h-4" />
                                Logs ({logs.length})
                            </button>
                        )}
                        <button
                            onClick={() => { setIsUnlocked(false); setToken(""); setResult(null); }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                        >
                            Lock Console
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                    {(['console', 'users'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 capitalize ${
                                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {tab === 'console' ? <Terminal className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                            {tab === 'console' ? 'SQL Console' : 'Users Management'}
                        </button>
                    ))}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <p className="text-sm text-gray-300">
                            <span className="text-yellow-500 font-medium">⚠️ Danger Zone — </span>
                            Full database access. Changes are immediate and irreversible. All queries are logged.
                        </p>
                    </div>
                </div>
            </header>

            {/* ═══ SQL Console Tab ═══ */}
            {activeTab === 'console' && (
                <div className="grid grid-cols-12 gap-6">
                    <div className={`${showLogs ? 'col-span-8' : 'col-span-12'} space-y-4`}>
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <label className="block text-sm font-medium mb-3">Query Type</label>
                            <div className="grid grid-cols-5 gap-2">
                                {(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CUSTOM'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => { setMethod(m); setQuery(""); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            method === m ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
                                <span className="text-sm font-medium">SQL Query</span>
                                <button
                                    onClick={executeQuery}
                                    disabled={loading}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-sm disabled:opacity-50"
                                >
                                    <Play className="w-4 h-4" />
                                    {loading ? "Executing..." : "Execute"}
                                </button>
                            </div>
                            <textarea
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={getPlaceholder()}
                                rows={8}
                                className="w-full p-4 bg-gray-900 text-gray-200 font-mono text-sm resize-none focus:outline-none"
                                spellCheck={false}
                            />
                        </div>

                        {result && (
                            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                                <div className={`px-4 py-3 border-b border-gray-700 ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.success ? `✓ Success — ${result.rowCount} rows` : '✗ Error'}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono truncate max-w-xs">{result.query}</span>
                                    </div>
                                </div>
                                <div className="p-4 max-h-96 overflow-auto">
                                    {result.error ? (
                                        <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">{result.error}</pre>
                                    ) : result.data?.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-700">
                                                        {Object.keys(result.data[0]).map((key) => (
                                                            <th key={key} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.data.map((row, idx) => (
                                                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-700/50">
                                                            {Object.values(row).map((val: any, vidx) => (
                                                                <td key={vidx} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                                                    {val === null ? <span className="text-gray-500 italic">NULL</span> : String(val)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm text-center py-8">
                                            {result.success ? 'Query executed successfully (no data returned)' : 'No data'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {showLogs && (
                        <div className="col-span-4 bg-gray-800 rounded-lg border border-gray-700 flex flex-col max-h-[calc(100vh-200px)]">
                            <div className="px-4 py-3 border-b border-gray-700">
                                <h3 className="font-medium">Query History</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        onClick={() => setQuery(log.query_text)}
                                        className="p-3 bg-gray-900 rounded border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                                log.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                            }`}>{log.query_type}</span>
                                            <span className="text-xs text-gray-500">{new Date(log.executed_at).toLocaleTimeString('th-TH')}</span>
                                        </div>
                                        <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap line-clamp-3">{log.query_text}</pre>
                                        {log.error_message && <p className="text-xs text-red-400 mt-2 line-clamp-2">{log.error_message}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ Users Management Tab ═══ */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    {/* Users Table */}
                    <div className="bg-gray-800 rounded-lg border border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">All Users</h2>
                            <button
                                onClick={() => setUserModal({ record: getBlankUser(), isAdd: true })}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add User
                            </button>
                        </div>
                        <div className="p-6">
                            {loadingUsers ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : allUsers.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-700">
                                                {Object.keys(allUsers[0]).map((key) => (
                                                    <th key={key} className="px-4 py-3 text-left text-gray-400 font-medium">{key}</th>
                                                ))}
                                                <th className="px-4 py-3 text-right text-gray-400 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allUsers.map((user) => (
                                                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-700/50">
                                                    {Object.values(user).map((val: any, idx) => (
                                                        <td key={idx} className="px-4 py-3 text-gray-300 max-w-xs truncate">
                                                            {val === null ? <span className="text-gray-500 italic">NULL</span> : String(val)}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setUserModal({ record: { ...user }, isAdd: false })} className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeleteUser(user.id)} className="p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No users found</p>
                            )}
                        </div>
                    </div>

                    {/* People Table */}
                    <div className="bg-gray-800 rounded-lg border border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">People</h2>
                            <button
                                onClick={() => setPersonModal({ record: getBlankPerson(), isAdd: true })}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Person
                            </button>
                        </div>
                        <div className="p-6">
                            {loadingUsers ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : people.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-700">
                                                {Object.keys(people[0]).map((key) => (
                                                    <th key={key} className="px-4 py-3 text-left text-gray-400 font-medium">{key}</th>
                                                ))}
                                                <th className="px-4 py-3 text-right text-gray-400 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {people.map((person) => (
                                                <tr key={person.id} className="border-b border-gray-800 hover:bg-gray-700/50">
                                                    {Object.values(person).map((val: any, idx) => (
                                                        <td key={idx} className="px-4 py-3 text-gray-300 max-w-xs truncate">
                                                            {val === null ? <span className="text-gray-500 italic">NULL</span> : String(val)}
                                                        </td>
                                                    ))}
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setPersonModal({ record: { ...person }, isAdd: false })} className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors">
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleDeletePerson(person.id)} className="p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">No people found</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Modals ═══ */}
            {userModal && (
                <RecordModal
                    title={userModal.isAdd ? 'Add New User' : 'Edit User'}
                    record={userModal.record}
                    isAdd={userModal.isAdd}
                    onClose={() => setUserModal(null)}
                    onSave={handleSaveUser}
                    onChange={(key, value) =>
                        setUserModal((prev) => prev ? { ...prev, record: { ...prev.record, [key]: value } } : null)
                    }
                    saving={savingUser}
                />
            )}

            {personModal && (
                <RecordModal
                    title={personModal.isAdd ? 'Add New Person' : 'Edit Person'}
                    record={personModal.record}
                    isAdd={personModal.isAdd}
                    onClose={() => setPersonModal(null)}
                    onSave={handleSavePerson}
                    onChange={(key, value) =>
                        setPersonModal((prev) => prev ? { ...prev, record: { ...prev.record, [key]: value } } : null)
                    }
                    saving={savingPerson}
                />
            )}
        </div>
    );
}