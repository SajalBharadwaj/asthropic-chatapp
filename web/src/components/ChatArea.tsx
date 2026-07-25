"use client";

import React, { useState } from "react";

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  isMine: boolean;
  timestamp: string;
}

interface ChatAreaProps {
  chatId: string;
  chatName: string;
  isAI?: boolean;
  messages: MessageItem[];
  onSendMessage: (text: string) => void;
  onOpenAdmin: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  chatId,
  chatName,
  isAI,
  messages,
  onSendMessage,
  onOpenAdmin,
}) => {
  const [inputText, setInputText] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText("");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#131520] relative">
      {/* Header */}
      <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-[#1A1D2B]">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              isAI ? "bg-amber-500 text-black" : chatId === "general_room" ? "bg-indigo-600 text-white" : "bg-blue-600 text-white"
            }`}
          >
            {isAI ? "🤖" : chatId === "general_room" ? "💬" : chatName[0]?.toUpperCase() || "👤"}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{chatName}</h3>
            <span className="text-xs text-emerald-400 font-medium">
              {isAI ? "Asthropic Gemini AI Assistant" : "🟢 Connected Live"}
            </span>
          </div>
        </div>

        <button
          onClick={onOpenAdmin}
          className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 flex items-center gap-2"
        >
          🛡️ Admin Panel
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#131520]">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            🔒 End-to-end encrypted thread. Start sending messages.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.isMine ? "items-end" : "items-start"}`}>
              {!m.isMine && (
                <span className="text-[11px] font-semibold text-gray-400 mb-1 px-1">{m.senderName}</span>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.isMine
                    ? "bg-[#3E66FB] text-white rounded-br-xs shadow-md shadow-blue-500/10"
                    : "bg-[#202332] text-white rounded-bl-xs border border-white/5"
                }`}
              >
                {m.text}
                <div
                  className={`text-[10px] mt-1 text-right ${
                    m.isMine ? "text-blue-100/70" : "text-gray-400"
                  }`}
                >
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-4 bg-[#131520] border-t border-white/5 flex items-center gap-3">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-[#202332] text-white placeholder-gray-400 text-sm px-5 py-3 rounded-full border border-white/5 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="w-11 h-11 rounded-full bg-[#3E66FB] text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:bg-blue-600 font-bold"
        >
          ➤
        </button>
      </form>
    </div>
  );
};
