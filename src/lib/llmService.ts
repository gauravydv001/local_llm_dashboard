import axios from 'axios';
import { LLMConfig, LLMResponse } from '@/types';

export const llmService = {
  async sendMessage(content: string, config: LLMConfig, model: string = 'default'): Promise<string> {
    try {
      const response = await axios.post<LLMResponse>('/api/llm/chat', {
        message: content,
        model,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
      });

      const assistantMessage = response.data.choices[0]?.message?.content;
      if (!assistantMessage) {
        throw new Error('No response from LLM');
      }

      return assistantMessage;
    } catch (error: any) {
      console.error('Error calling LLM:', error);
      throw error;
    }
  },

  async getModels(config: LLMConfig): Promise<Array<{ id: string; name?: string }>> {
    try {
      const response = await axios.get('/api/llm/models', {
        params: {
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
        },
      });
      return (response.data.data || []) as Array<{ id: string; name?: string }>;
    } catch (error: any) {
      console.error('Error fetching models:', error);
      throw error;
    }
  },
};
