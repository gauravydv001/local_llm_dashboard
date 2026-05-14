'use client';

import React from 'react';
import Link from 'next/link';
import { useChatContext } from '@/contexts/ChatContext';
import { Trash2, Plus } from 'lucide-react';

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  const { chats, currentChat, selectChat, deleteChat } = useChatContext();

  return (
    <aside className="flex flex-col w-64 bg-gray-900 text-white border-r border-gray-700 h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Chat
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4">
        {chats.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No chats yet</p>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentChat?.id === chat.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <button
                  onClick={() => selectChat(chat.id)}
                  className="flex-1 text-left truncate text-sm hover:text-white transition-colors"
                >
                  {chat.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} className="hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/settings"
          className="block w-full text-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          Settings
        </Link>
      </div>
    </aside>
  );
}
