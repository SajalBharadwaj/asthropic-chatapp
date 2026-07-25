"use client";

import React from "react";

interface RightPanelProps {
  currentChatId: string;
  onSelectWorkspace: (id: string, name: string, isAI: boolean) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ currentChatId, onSelectWorkspace }) => {
  return (
    <aside className="w-80 bg-[#131520] border-l border-white/5 flex flex-col h-full text-white p-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">📌 Pinned System Workspaces</h3>

      <div className="space-y-3">
        {/* Asthropic Gemini AI Workspace */}
        <div
          onClick={() => onSelectWorkspace("ai_bot", "Asthropic Gemini AI", true)}
          className={`p-3.5 rounded-2xl cursor-pointer border flex items-center gap-3.5 transition-all ${
            currentChatId === "ai_bot"
              ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5"
              : "bg-[#202332] border-white/5 hover:border-amber-500/30"
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xl shadow-md">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">Asthropic Gemini AI</h4>
            <p className="text-xs text-amber-400 font-medium">1-on-1 AI Assistant</p>
          </div>
        </div>

        {/* General Global Chat Workspace */}
        <div
          onClick={() => onSelectWorkspace("general_room", "General Global Chat", false)}
          className={`p-3.5 rounded-2xl cursor-pointer border flex items-center gap-3.5 transition-all ${
            currentChatId === "general_room"
              ? "bg-indigo-600/20 border-indigo-500/40 shadow-lg shadow-indigo-500/5"
              : "bg-[#202332] border-white/5 hover:border-indigo-500/30"
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
            💬
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate">General Global Chat</h4>
            <p className="text-xs text-indigo-400 font-medium">Public Community Thread</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
