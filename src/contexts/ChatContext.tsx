'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Chat, ChatAttachment, ChatMessage } from '@/types';
import { chatService } from '@/lib/chatService';

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: ChatMessage[];
  loading: boolean;
  syncing: boolean;
  error: string | null;
  
  createNewChat: (title: string, userId: string) => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  addMessage: (content: string, role: 'user' | 'assistant', attachments?: ChatAttachment[]) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  loadUserChats: (userId: string) => Promise<void>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const chatsKey = (userId: string) => `chats_${userId}`;
  const messagesKey = (chatId: string) => `messages_${chatId}`;

  const createNewChat = useCallback(
    async (title: string, userId: string) => {
      setLoading(true);
      try {
        const newChat = await chatService.createChat(title, userId);
        if (newChat) {
          setChats((prev) => {
            const next = [newChat, ...prev];
            try { localStorage.setItem(chatsKey(userId), JSON.stringify(next)); } catch {}
            return next;
          });
          setCurrentChat(newChat);
          setMessages([]);
        }
      } catch (err) {
        setError('Failed to create chat');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const selectChat = useCallback(async (chatId: string) => {
    setLoading(true);
    try {
      const chat = chats.find((c) => c.id === chatId);
      if (chat) {
        setCurrentChat(chat);
        // Load cached messages first for instant UI
        try {
          const cached = localStorage.getItem(messagesKey(chatId));
          if (cached) setMessages(JSON.parse(cached));
        } catch {}

        // Then fetch fresh messages and update cache
        setSyncing(true);
        const msgs = await chatService.getChatMessages(chatId);
        setMessages(msgs);
        try { localStorage.setItem(messagesKey(chatId), JSON.stringify(msgs)); } catch {}
        setSyncing(false);
      }
    } catch (err) {
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  }, [chats]);

  const addMessage = useCallback(
    async (content: string, role: 'user' | 'assistant', attachments: ChatAttachment[] = []) => {
      if (!currentChat) return;

      try {
        const message = await chatService.addMessage(currentChat.id, content, role, attachments);
        if (message) {
          setMessages((prev) => {
            const next = [...prev, message];
            try { localStorage.setItem(messagesKey(currentChat.id), JSON.stringify(next)); } catch {}
            return next;
          });
          // update chats list timestamp locally
          setChats((prev) => {
            const next = prev.map((c) => (c.id === currentChat.id ? { ...c, updated_at: new Date().toISOString() } : c));
            try { localStorage.setItem(chatsKey((currentChat as any).userId || (currentChat as any).user_id || ''), JSON.stringify(next)); } catch {}
            return next;
          });
        }
      } catch (err) {
        setError('Failed to save message');
      }
    },
    [currentChat]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const success = await chatService.deleteChat(chatId);
        if (success) {
          setChats((prev) => prev.filter((c) => c.id !== chatId));
          if (currentChat?.id === chatId) {
            setCurrentChat(null);
            setMessages([]);
          }
        }
      } catch (err) {
        setError('Failed to delete chat');
      }
    },
    [currentChat]
  );

  const loadUserChats = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      // Load cached chats first for instant UI
      try {
        const cached = localStorage.getItem(chatsKey(userId));
        if (cached) setChats(JSON.parse(cached));
      } catch {}

      setSyncing(true);
      const userChats = await chatService.getUserChats(userId);
      setChats(userChats);
      try { localStorage.setItem(chatsKey(userId), JSON.stringify(userChats)); } catch {}
      setSyncing(false);
      // If no chat is selected yet, auto-select the most recent chat so history is visible
      if (!currentChat && userChats.length > 0) {
        const recent = userChats[0];
        setCurrentChat(recent);
        try {
          const cached = localStorage.getItem(messagesKey(recent.id));
          if (cached) setMessages(JSON.parse(cached));
        } catch {}

        // fetch latest messages in background
        setSyncing(true);
        try {
          const msgs = await chatService.getChatMessages(recent.id);
          setMessages(msgs);
          try { localStorage.setItem(messagesKey(recent.id), JSON.stringify(msgs)); } catch {}
        } catch (e) {
          // ignore
        }
        setSyncing(false);
      }
    } catch (err) {
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  const value: ChatContextType = {
    chats,
    currentChat,
    messages,
    loading,
    syncing,
    error,
    createNewChat,
    selectChat,
    addMessage,
    deleteChat,
    loadUserChats,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
