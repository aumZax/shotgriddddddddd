/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/SecretSQLConsole.tsx
import { useState, useEffect } from "react";
import { Lock, Play, History, AlertTriangle, Eye, EyeOff, Terminal } from 'lucide-react';
import ENDPOINTS from "../config";
import { useNavigate } from "react-router-dom";

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

export default function SecretSQLConsole() {

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const navigate = useNavigate();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [token, setToken] = useState("");
    const [unlocking, setUnlocking] = useState(false);

    const [method, setMethod] = useState<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM'>('SELECT');
    const [table,] = useState("");
    const [query, setQuery] = useState("");
    const [, setTables] = useState<string[]>([]);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<QueryLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    // Keyboard shortcut listener

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ctrl + Alt + K = เปิด Secret Console
            if (e.ctrlKey && e.altKey && e.key === 'M') {
                e.preventDefault();
                if (!isUnlocked) {
                    // Auto focus password input
                    const input = document.getElementById('secret-password');
                    if (input) input.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isUnlocked]);

    const verifyPassword = async () => {
        if (!password.trim()) {
            alert("Please enter password");
            return;
        }

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
            if (data.success) {
                setTables(data.tables.map((t: any) => t.table_name || t.TABLE_NAME));
            }
        } catch (err) {
            console.error("Failed to fetch tables:", err);
        }
    };

    const fetchLogs = async (authToken: string) => {
        try {
            const response = await fetch(ENDPOINTS.SECRET_LOGS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: authToken })
            });

            const data = await response.json();
            if (data.success) {
                setLogs(data.logs);
            }
        } catch (err) {
            console.error("Failed to fetch logs:", err);
        }
    };

    const executeQuery = async () => {
        // ... validation code

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch(ENDPOINTS.SECRET_EXECUTE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method,
                    table,
                    query,
                    token
                })
            });

            const data = await response.json();

            console.log('📦 Response data:', data);
            console.log('📊 data.data:', data.data);

            if (response.ok) {
                let resultData = [];

                // ⭐ แก้ตรงนี้ - flatten nested array
                if (Array.isArray(data.data)) {
                    // ถ้า data.data เป็น [[...]] ให้ดึงออกมา
                    if (data.data.length > 0 && Array.isArray(data.data[0])) {
                        resultData = data.data[0];  // ⭐ ดึง array ชั้นในออกมา
                    } else {
                        resultData = data.data;
                    }
                } else if (data.data && typeof data.data === 'object') {
                    resultData = [data.data];
                }

                console.log('✅ Final resultData:', resultData);

                setResult({
                    ...data,
                    data: resultData,
                    rowCount: resultData.length  // ⭐ update rowCount ด้วย
                });

                fetchLogs(token);
            } else {
                setResult({
                    success: false,
                    method,
                    query: data.query || query,
                    data: [],
                    rowCount: 0,
                    error: data.error
                });
            }
        } catch (err) {
            console.error('❌ Execute error:', err);
            setResult({
                success: false,
                method,
                query,
                data: [],
                rowCount: 0,
                error: err instanceof Error ? err.message : "Network error"
            });
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        switch (method) {
            case 'SELECT':
                return "SELECT * FROM users WHERE id = 1\nSELECT name, email FROM users LIMIT 10";
            case 'INSERT':
                return "INSERT INTO users (name, email, status) VALUES ('John Doe', 'john@example.com', 'Active')";
            case 'UPDATE':
                return "UPDATE users SET status = 'Inactive' WHERE id = 1";
            case 'DELETE':
                return "DELETE FROM users WHERE id = 1";
            case 'CUSTOM':
                return "-- Any SQL query\nSHOW TABLES;\nDESCRIBE users;\nALTER TABLE...";
            default:
                return "";
        }
    };

    // Login Screen
    if (!isUnlocked) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8 shadow-2xl">
                        {/* Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-center text-white mb-2">
                            Secret SQL Console
                        </h1>
                        <p className="text-center text-gray-400 text-sm mb-6">
                            Restricted Area - Authorized Personnel Only
                        </p>

                        {/* Shortcut Hint */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                            <p className="text-xs text-blue-300 text-center">
                                {/* ⭐ เปลี่ยนตรงนี้ให้ตรงกับ shortcut ใหม่ */}
                                💡 Press
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-white mx-1">Ctrl</kbd> +
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-white">Alt</kbd> +
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-white">M</kbd>
                                anytime
                            </p>
                        </div>

                        {/* Password Input */}
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
                                ) : (
                                    "Unlock Console"
                                )}
                            </button>
                        </div>

                        {/* Warning */}
                        <div className="mt-6 pt-6 border-t border-gray-700">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-gray-400">
                                    All actions are logged and monitored. Unauthorized access is prohibited.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main Console
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
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 text-sm border border-gray-700"
                        >
                            <History className="w-4 h-4" />
                            Logs ({logs.length})
                        </button>

                        <button
                            onClick={() => {
                                setIsUnlocked(false);
                                setToken("");
                                setResult(null);
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                        >
                            Lock Console
                        </button>
                    </div>
                </div>

                {/* Warning Banner */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="text-yellow-500 font-medium mb-1">⚠️ Danger Zone</h3>
                            <p className="text-sm text-gray-300">
                                You have full database access. Changes are immediate and irreversible. All queries are logged.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Panel */}
                <div className={`${showLogs ? 'col-span-8' : 'col-span-12'} space-y-4`}>
                    {/* Method Selection */}
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                        <label className="block text-sm font-medium mb-3">Query Type</label>
                        <div className="grid grid-cols-5 gap-2">
                            {(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CUSTOM'] as const).map((m) => (
                                <button
                                    key={m}  // ⭐ เพิ่มบรรทัดนี้
                                    onClick={() => {
                                        setMethod(m);
                                        setQuery("");
                                    }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${method === m
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table Selection */}
                    {/* {method === 'SELECT' && (
                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                            <label className="block text-sm font-medium mb-3">Select Table (Optional)</label>
                            <select
                                value={table}
                                onChange={(e) => setTable(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option key="custom" value="">-- Custom Query --</option>
                                
                                {tables.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    )} */}

                    {/* Query Editor */}
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

                    {/* Results */}
                    {result && (
                        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                            <div className={`px-4 py-3 border-b border-gray-700 ${result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {result.success
                                            ? `✓ Success - ${result.rowCount} rows`
                                            : `✗ Error`
                                        }
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">
                                        {result.query}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 max-h-96 overflow-auto">
                                {result.error ? (
                                    <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap">
                                        {result.error}
                                    </pre>
                                ) : result.data && result.data.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-700">
                                                    {Object.keys(result.data[0]).map((key) => (
                                                        <th key={key} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                                                            {key}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.data.map((row, idx) => (
                                                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-700/50">
                                                        {Object.values(row).map((val: any, vidx) => (
                                                            <td key={vidx} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                                                {val === null
                                                                    ? <span className="text-gray-500 italic">NULL</span>
                                                                    : String(val)
                                                                }
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

                {/* Logs Panel */}
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
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${log.status === 'success'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-red-500/20 text-red-400'
                                            }`}>
                                            {log.query_type}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(log.executed_at).toLocaleTimeString('th-TH')}
                                        </span>
                                    </div>
                                    <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap line-clamp-3">
                                        {log.query_text}
                                    </pre>
                                    {log.error_message && (
                                        <p className="text-xs text-red-400 mt-2 line-clamp-2">
                                            {log.error_message}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}