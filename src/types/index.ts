export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  chatId: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  mimeType: string;
  size: number;
  url?: string;
  textContent?: string;
  // rawFile is only used client-side before upload; don't rely on it server-side
  rawFile?: File | null;
  // storage path for deletion
  path?: string | null;
  expires_at?: string | null;
  deleted?: boolean;
  deleted_at?: string | null;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  llmBaseUrl: string;
  llmApiKey: string;
}

export interface UserSettings extends Settings {
  userId: string;
  updatedAt?: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}
