'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { FileText } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatWindow({ messages, loading }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-800 to-gray-900 pb-32">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-400">
            <h2 className="text-2xl font-bold mb-2">Start a new conversation</h2>
            <p>Type a message to begin chatting with the AI</p>
          </div>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="rounded-lg border border-white/10 bg-black/10 p-2"
                    >
                      {attachment.type === 'image' && attachment.url ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-h-56 w-full rounded object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-xs">
                          <FileText size={14} />
                          <span className="font-medium">{attachment.name}</span>
                          <span className="opacity-70">({(attachment.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <time className="text-xs opacity-70 block mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </time>
            </div>
          </div>
        ))
      )}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
