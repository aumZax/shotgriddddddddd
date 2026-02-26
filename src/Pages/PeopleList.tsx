import { useLocation } from "react-router-dom";
import { Users, Mail, Shield, Tag, Calendar } from "lucide-react";
import { useState, useEffect } from "react";

interface UserState {
  id: number;
  username: string;
  email?: string;
  status?: string;
  permission_group?: string;
  groups_name?: string;
  created_at?: string;
}

export default function PeopleList() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const user = location.state?.user as UserState | undefined;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        <div className="w-10 h-10 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-20 flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        <Users className="w-16 h-16 mb-4 text-gray-600" />
        <p className="text-lg">No user selected</p>
      </div>
    );
  }

  return (
    <div className="pt-20 px-8 min-h-screen bg-gray-950 text-white">
      {/* User Card */}
      <div className="max-w-lg mx-auto bg-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
        {/* Header Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-600/40 to-purple-600/40" />

        {/* Avatar + Info */}
        <div className="px-6 pb-6 -mt-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg ring-4 ring-gray-800 mb-4">
            <span className="text-2xl font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white">{user.username}</h1>

          {/* Status Badge */}
          {user.status && (
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full font-medium
              ${user.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
              {user.status}
            </span>
          )}

          {/* Detail Rows */}
          <div className="mt-5 space-y-3">
            {user.email && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>{user.email}</span>
              </div>
            )}
            {user.permission_group && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>{user.permission_group}</span>
              </div>
            )}
            {user.groups_name && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Tag className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>{user.groups_name}</span>
              </div>
            )}
            {user.created_at && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}