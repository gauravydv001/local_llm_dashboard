import { supabase } from './supabase';
import { Chat, ChatAttachment, ChatMessage } from '@/types';
import { uploadFile } from './storage';

export const chatService = {
  async createChat(title: string, userId: string): Promise<Chat | null> {
    if (!supabase) {
      console.warn('Supabase not initialized: createChat skipped');
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
