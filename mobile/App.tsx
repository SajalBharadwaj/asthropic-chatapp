import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { io, Socket } from 'socket.io-client';

interface Contact {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

interface Message {
  id: string;
  senderId: string;
  text: string;
  isMine: boolean;
  timestamp: string;
}

const SOCKET_URL = 'http://192.168.1.100:5000'; // Replace with server host IP

export default function App() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'chat'>('contacts');
  const [currentChatId, setCurrentChatId] = useState('general_room');
  const [currentChatName, setCurrentChatName] = useState('General Global Chat');
  const [inputText, setInputText] = useState('');
  
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 'user_1', name: 'Aman Bharadwaj', email: 'aman@example.com', status: 'online' },
    { id: 'user_2', name: 'Sajal Bharadwaj', email: 'sajal@example.com', status: 'online' },
    { id: 'user_3', name: 'Rohan Sharma', email: 'rohan@example.com', status: 'offline', lastSeen: new Date(Date.now() - 3600000).toISOString() },
  ]);

  const [messages, setMessages] = useState<Record<string, Message[]>>({
    general_room: [
      { id: '1', senderId: 'sys', text: 'Welcome to General Global Chat on Mobile!', isMine: false, timestamp: new Date().toISOString() },
    ],
    ai_bot: [
      { id: 'ai_1', senderId: 'ai_bot', text: 'Hello! I am your Gemini AI Assistant on Mobile.', isMine: false, timestamp: new Date().toISOString() },
    ],
  });

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket'] });
    setSocket(s);

    s.on('user_presence', ({ userId, isOnline, lastSeen }) => {
      setContacts((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, status: isOnline ? 'online' : 'offline', lastSeen } : c))
      );
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleSelectChat = (id: string, name: string) => {
    setCurrentChatId(id);
    setCurrentChatName(name);
    setActiveTab('chat');
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: 'msg_' + Date.now(),
      senderId: 'my_user',
      text: inputText,
      isMine: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), newMsg],
    }));

    if (socket && socket.connected) {
      socket.emit('send_message', { chatId: currentChatId, content: inputText, senderId: 'my_user' });
    }

    setInputText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#131520" />
      
      {/* App Header */}
      <View style={styles.header}>
        {activeTab === 'chat' ? (
          <TouchableOpacity style={styles.backButton} onPress={() => setActiveTab('contacts')}>
            <Text style={styles.backText}>⬅️</Text>
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>
          {activeTab === 'contacts' ? 'Asthropic Contacts' : currentChatName}
        </Text>
      </View>

      {activeTab === 'contacts' ? (
        <View style={styles.content}>
          {/* Pinned System Workspaces */}
          <Text style={styles.sectionHeader}>📌 PINNED WORKSPACES</Text>
          <TouchableOpacity
            style={styles.workspaceItem}
            onPress={() => handleSelectChat('ai_bot', 'Asthropic Gemini AI')}
          >
            <Text style={styles.avatarEmoji}>🤖</Text>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemName}>Asthropic Gemini AI</Text>
              <Text style={styles.itemSub}>Direct 1-on-1 AI Assistant</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.workspaceItem}
            onPress={() => handleSelectChat('general_room', 'General Global Chat')}
          >
            <Text style={styles.avatarEmoji}>💬</Text>
            <View style={styles.itemTextWrap}>
              <Text style={styles.itemName}>General Global Chat</Text>
              <Text style={styles.itemSub}>Public Community Thread</Text>
            </View>
          </TouchableOpacity>

          {/* Contacts Section */}
          <Text style={styles.sectionHeader}>👤 ALL CONTACTS</Text>
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => handleSelectChat(item.id, item.name)}
              >
                <View style={styles.avatarWrap}>
                  <Image
                    source={{ uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${item.name}` }}
                    style={styles.avatarImg}
                  />
                  <View
                    style={[
                      styles.presenceDot,
                      { backgroundColor: item.status === 'online' ? '#00E676' : '#757575' },
                    ]}
                  />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={[styles.itemSub, { color: item.status === 'online' ? '#00E676' : '#9E9E9E' }]}>
                    {item.status === 'online' ? '🟢 Active Now' : '⚪ Offline'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Chat Messages */}
          <FlatList
            data={messages[currentChatId] || []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.msgBubble,
                  item.isMine ? styles.myMsg : styles.otherMsg,
                ]}
              >
                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.msgTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          />

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor="#9E9E9E"
              value={inputText}
              onChangeText={setInputText}
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131520' },
  header: {
    height: 56,
    backgroundColor: '#1A1D2B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: { marginRight: 12, padding: 4 },
  backText: { fontSize: 20 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  sectionHeader: { color: '#9E9E9E', fontSize: 11, fontWeight: '700', marginVertical: 10, letterSpacing: 0.8 },
  workspaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202332',
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  avatarEmoji: { fontSize: 24, marginRight: 12 },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#131520',
  },
  itemTextWrap: { flex: 1 },
  itemName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12, marginTop: 2 },
  chatList: { paddingBottom: 16 },
  msgBubble: { padding: 12, borderRadius: 18, marginBottom: 8, maxWidth: '80%' },
  myMsg: { backgroundColor: '#3E66FB', alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  otherMsg: { backgroundColor: '#202332', alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  msgText: { color: '#FFFFFF', fontSize: 14 },
  msgTime: { color: 'rgba(255,255,255,0.6)', fontSize: 10, textAlign: 'right', marginTop: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#202332',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3E66FB',
    alignItems: 'center',
    justify-content: 'center',
  },
  sendText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
