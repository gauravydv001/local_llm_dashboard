import { supabase } from './supabase';
import { Chat, ChatAttachment, ChatMessage } from '@/types';
import { uploadFile } from './storage';
import { localStore } from './localStore';

const LOCAL_USER_ID = 'local-machine-user';

export const chatService = {
  async createChat(title: string, userId: string): Promise<Chat | null> {
    if (!supabase) {
      console.warn('Supabase not initialized: createChat skipped');
      // try local store
      if (localStore.isAvailable()) {
        const now = new Date().toISOString();
        const chat: Chat = {
          id: `local-${Date.now()}`,
          title,
          userId,
          createdAt: now,
          updatedAt: now,
          // compatibility fields used in existing UI state updates
          user_id: userId,
          created_at: now,
          updated_at: now,
        } as any;
        // load existing
        const path = `chats/${userId}/chats.json`;
        const existing = (await localStore.readJson(path)) || [];
        existing.unshift(chat);
        await localStore.writeJson(path, existing);
        return chat;
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          title,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  },

  async getUserChats(userId: string): Promise<Chat[]> {
    if (!supabase) {
      console.warn('Supabase not initialized: getUserChats returning empty');
      if (localStore.isAvailable()) {
        const data = (await localStore.readJson(`chats/${userId}/chats.json`)) || [];
        return (data as Chat[]).sort((a: any, b: any) => {
          const aTime = new Date((a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0)).getTime();
          const bTime = new Date((b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0)).getTime();
          return bTime - aTime;
        });
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('chats')
        .select()
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chats:', error);
      return [];
    }
  },

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    if (!supabase) {
      console.warn('Supabase not initialized: getChatMessages returning empty');
      if (localStore.isAvailable()) {
        const data = (await localStore.readJson(`messages/${chatId}/messages.json`)) || [];
        return data as ChatMessage[];
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select()
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  async addMessage(
    chatId: string,
    content: string,
    role: 'user' | 'assistant',
    attachments: ChatAttachment[] = []
  ): Promise<ChatMessage | null> {
    if (!supabase) {
      console.warn('Supabase not initialized: addMessage skipped');
      if (localStore.isAvailable()) {
        try {
          const processed = await Promise.all(
            attachments.map(async (att) => {
              if (att.rawFile) {
                const uploaded = await uploadFile(att.rawFile, `${chatId}/`);
                const expires_at = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                return {
                  ...att,
                  url: uploaded?.publicUrl ?? att.url,
                  path: uploaded?.path ?? (att as any).path,
                  rawFile: undefined,
                  expires_at,
                  deleted: false,
                } as ChatAttachment;
              }
              return { ...(att as any), deleted: (att as any).deleted || false } as ChatAttachment;
            })
          );

          const message: ChatMessage = {
            id: `localmsg-${Date.now()}`,
            content,
            role,
            chatId,
            chat_id: chatId,
            attachments: processed,
            timestamp: new Date().toISOString(),
          } as any;
          const path = `messages/${chatId}/messages.json`;
          const existing = (await localStore.readJson(path)) || [];
          existing.push(message);
          await localStore.writeJson(path, existing);

          const chatsPath = `chats/${LOCAL_USER_ID}/chats.json`;
          const chats = ((await localStore.readJson(chatsPath)) || []) as any[];
          const updated = chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : c
          );
          await localStore.writeJson(chatsPath, updated);

          return message;
        } catch (e) {
          console.error('Local addMessage error:', e);
          return null;
        }
      }
      return null;
    }

    try {
      // If attachments contain rawFile, upload them first and replace url
      const retentionHours = Number(process.env.ATTACHMENT_RETENTION_HOURS || '24');
      const processed = await Promise.all(
        attachments.map(async (att) => {
          if (att.rawFile) {
            const uploaded = await uploadFile(att.rawFile);
            const expires_at = new Date(Date.now() + retentionHours * 3600 * 1000).toISOString();
            return {
              ...att,
              url: uploaded?.publicUrl ?? att.url,
              path: uploaded?.path ?? (att as any).path,
              rawFile: undefined,
              expires_at,
              deleted: false,
            } as ChatAttachment;
          }
          // ensure existing attachments have deleted flag
          return { ...(att as any), deleted: (att as any).deleted || false } as ChatAttachment;
        })
      );

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          content,
          role,
          attachments: processed,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Fallback for older schema without attachments column
        if (error.code === 'PGRST204') {
          const fallback = await supabase
            .from('chat_messages')
            .insert({
              chat_id: chatId,
              content,
              role,
              timestamp: new Date().toISOString(),
            })
            .select()
            .single();

          if (fallback.error) throw fallback.error;
          return fallback.data;
        }

        throw error;
      }

      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  },

  async deleteChat(chatId: string): Promise<boolean> {
    if (!supabase) {
      if (localStore.isAvailable()) {
        try {
          const path = `chats/${LOCAL_USER_ID}/chats.json`;
          const existing = ((await localStore.readJson(path)) || []) as any[];
          const next = existing.filter((item) => item.id !== chatId);
          await localStore.writeJson(path, next);
          return true;
        } catch (e) {
          console.error('Local deleteChat error:', e);
          return false;
        }
      }

      console.warn('Supabase not initialized: deleteChat skipped');
      return false;
    }

    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  },

  async updateChatTitle(chatId: string, title: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not initialized: updateChatTitle skipped');
      return false;
    }

    try {
      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating chat title:', error);
      return false;
    }
  },
};
