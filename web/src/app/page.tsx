"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, UserItem } from "@/components/Sidebar";
import { RightPanel } from "@/components/RightPanel";
import { ChatArea, MessageItem } from "@/components/ChatArea";
import { AdminPanel } from "@/components/AdminPanel";
import { getSocket } from "@/lib/socket";

export default function Home() {
  const [users, setUsers] = useState<UserItem[]>([
    { id: "user_1", name: "Aman Bharadwaj", email: "aman@example.com", status: "online" },
    { id: "user_2", name: "Sajal Bharadwaj", email: "sajal@example.com", status: "online" },
    { id: "user_3", name: "Rohan Sharma", email: "rohan@example.com", status: "offline", lastSeen: new Date(Date.now() - 3600000).toISOString() },
  ]);
  const [currentChatId, setCurrentChatId] = useState("general_room");
  const [currentChatName, setCurrentChatName] = useState("General Global Chat");
  const [isAIChat, setIsAIChat] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [messages, setMessages] = useState<Record<string, MessageItem[]>>({
    general_room: [
      { id: "1", senderId: "sys", senderName: "System", text: "Welcome to General Global Chat!", isMine: false, timestamp: new Date().toISOString() },
    ],
    ai_bot: [
      { id: "ai_1", senderId: "ai_bot", senderName: "Asthropic Gemini AI", text: "Hello! I am your intelligent Gemini AI Assistant. How can I help you today?", isMine: false, timestamp: new Date().toISOString() },
    ],
  });
  const [auditLogs, setAuditLogs] = useState([
    { id: "log_1", userEmail: "rohan@example.com", action: "Disconnected (Logout Audit Saved)", timestamp: new Date(Date.now() - 3600000).toISOString() },
  ]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("connect", () => {
      console.log("Connected to Socket Server");
    });

    socket.on("user_presence", ({ userId, isOnline, user, lastSeen }) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return { ...u, status: isOnline ? "online" : "offline", lastSeen: lastSeen || new Date().toISOString() };
          }
          return u;
        })
      );

      if (!isOnline) {
        setAuditLogs((prev) => [
          {
            id: "log_" + Date.now(),
            userEmail: user?.email || userId,
            action: `Disconnected (lastSeen: ${new Date(lastSeen || Date.now()).toLocaleTimeString()})`,
            timestamp: lastSeen || new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    });

    socket.on("receive_message", (msg) => {
      const chatId = msg.chatId || "general_room";
      setMessages((prev) => ({
        ...prev,
        [chatId]: [
          ...(prev[chatId] || []),
          {
            id: msg.id || "msg_" + Date.now(),
            senderId: msg.senderId,
            senderName: msg.senderName || "Member",
            text: msg.content || msg.text,
            isMine: false,
            timestamp: msg.createdAt || new Date().toISOString(),
          },
        ],
      }));
    });

    return () => {
      socket.off("user_presence");
      socket.off("receive_message");
    };
  }, []);

  const handleSelectChat = (id: string, name: string, isAI: boolean = false) => {
    setCurrentChatId(id);
    setCurrentChatName(name);
    setIsAIChat(isAI);
  };

  const handleSendMessage = (text: string) => {
    const newMsg: MessageItem = {
      id: "msg_" + Date.now(),
      senderId: "my_user_id",
      senderName: "Aman",
      text,
      isMine: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), newMsg],
    }));

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("send_message", {
        chatId: currentChatId,
        content: text,
        senderId: "my_user_id",
        senderName: "Aman",
      });
    }
  };

  return (
    <main className="flex h-screen w-screen bg-[#131520] overflow-hidden font-sans antialiased">
      {/* Left Sidebar Contacts List */}
      <Sidebar
        users={users}
        currentChatId={currentChatId}
        onSelectChat={(id, name) => handleSelectChat(id, name, false)}
      />

      {/* Main Messaging Area */}
      <ChatArea
        chatId={currentChatId}
        chatName={currentChatName}
        isAI={isAIChat}
        messages={messages[currentChatId] || []}
        onSendMessage={handleSendMessage}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Right Pinned Workspaces Panel */}
      <RightPanel
        currentChatId={currentChatId}
        onSelectWorkspace={(id, name, isAI) => handleSelectChat(id, name, isAI)}
      />

      {/* Admin Live Audit Dashboard Modal */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        users={users}
        logs={auditLogs}
      />
    </main>
  );
}
