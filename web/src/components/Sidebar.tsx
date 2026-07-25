"use client";

import React, { useState } from "react";

export interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "online" | "offline";
  lastSeen?: string;
}

interface SidebarProps {
  users: UserItem[];
  currentChatId: string;
  onSelectChat: (id: string, name: string, isAI?: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ users, currentChatId, onSelectChat }) => {
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) =>
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const onlineUsers = filtered.filter((u) => u.status === "online");
  const offlineUsers = filtered.filter((u) => u.status === "offline");

  const formatLastSeen = (ts?: string) => {
    if (!ts) return "Offline";
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "Offline";
    return `Last seen ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <aside className="w-80 bg-[#131520] border-r border-white/5 flex flex-col h-full text-white">
      {/* Search Header */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-lg font-bold mb-3 tracking-wide text-white">Contacts</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#202332] text-sm text-white placeholder-gray-400 px-4 py-2.5 rounded-xl border border-white/5 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contact Lists */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Active Online Section */}
        {onlineUsers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 px-2">
              🟢 Active Online ({onlineUsers.length})
            </div>
            <div className="space-y-1">
              {onlineUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => onSelectChat(u.id, u.name)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer ${
                    currentChatId === u.id ? "bg-blue-600/20 border border-blue-500/30" : "hover:bg-white/5"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                      alt={u.name}
                      className="w-11 h-11 rounded-full object-cover bg-gray-800"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#131520] rounded-full"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate text-white">{u.name}</h4>
                    <p className="text-xs text-emerald-400 font-medium">🟢 Active Now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offline Section */}
        {offlineUsers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
              ⚪ Offline ({offlineUsers.length})
            </div>
            <div className="space-y-1">
              {offlineUsers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => onSelectChat(u.id, u.name)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer opacity-75 hover:opacity-100 ${
                    currentChatId === u.id ? "bg-blue-600/20 border border-blue-500/30" : "hover:bg-white/5"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`}
                      alt={u.name}
                      className="w-11 h-11 rounded-full object-cover grayscale"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-500 border-2 border-[#131520] rounded-full"></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate text-gray-200">{u.name}</h4>
                    <p className="text-xs text-gray-400 truncate">{formatLastSeen(u.lastSeen)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
