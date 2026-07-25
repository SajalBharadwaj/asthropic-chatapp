"use client";

import React from "react";
import { UserItem } from "./Sidebar";

interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  timestamp: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserItem[];
  logs: AuditLog[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, users, logs }) => {
  if (!isOpen) return null;

  const onlineCount = users.filter((u) => u.status === "online").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#131520] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#1A1D2B]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="text-lg font-bold text-white">Admin Real-Time Dashboard</h2>
              <p className="text-xs text-gray-400">Live Presence Sync & Precise Logout Audit Logs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Active Counters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Active Users Online</span>
              <div className="text-3xl font-black text-emerald-400 mt-1">{onlineCount}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Total Registered</span>
              <div className="text-3xl font-black text-blue-400 mt-1">{users.length}</div>
            </div>
          </div>

          {/* User Presence Matrix */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Live Presence Status</h4>
            <div className="bg-[#1C1F2E] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
              {users.map((u) => (
                <div key={u.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                      alt={u.name}
                      className="w-9 h-9 rounded-full bg-gray-800"
                    />
                    <div>
                      <h5 className="text-sm font-semibold text-white">{u.name}</h5>
                      <span className="text-xs text-gray-400">{u.email}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.status === "online" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700/50 text-gray-400"
                      }`}
                    >
                      {u.status === "online" ? "🟢 Online" : "⚪ Offline"}
                    </span>
                    {u.status === "offline" && u.lastSeen && (
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(u.lastSeen).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Precise Logout Audit Logs */}
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Historical Disconnect & Logout Logs</h4>
            <div className="bg-[#1C1F2E] border border-white/5 rounded-2xl p-3 space-y-2 max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No disconnect logs recorded yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-xs flex items-center justify-between p-2 rounded-xl bg-white/5">
                    <span className="text-gray-300">
                      <b className="text-white">{log.userEmail}</b> — {log.action}
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
