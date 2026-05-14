'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/ChatWindow';
import { ChatInput } from '@/components/ChatInput';
import { useChatContext } from '@/contexts/ChatContext';
import { llmService } from '@/lib/llmService';
import { speakText } from '@/lib/tts';
import { ChatAttachment, LLMConfig } from '@/types';
import { LogOut, X } from 'lucide-react';
import { fetchUserSettings, getCachedSettings, cacheSettings } from '@/lib/userSettings';
import { saveUserSettings } from '@/lib/userSettings';

type ModelOption = { id: string; name?: string };

export default function Home() {
  const { data: session } = useSession();
  const {
    currentChat,
    messages,
    loading,
    createNewChat,
    addMessage,
    loadUserChats,
    syncing,
  } = useChatContext();
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [draftBaseUrl, setDraftBaseUrl] = useState('');
  const [draftApiKey, setDraftApiKey] = useState('');
  const [configError, setConfigError] = useState('');
  const [models, setModels] = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState('default');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Load TTS preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('tts_enabled');
    if (stored !== null) {
      setTtsEnabled(JSON.parse(stored));
    }
  }, []);

  const handleToggleTts = () => {
    const newVal = !ttsEnabled;
    setTtsEnabled(newVal);
    localStorage.setItem('tts_enabled', JSON.stringify(newVal));
  };

  useEffect(() => {
    if (session?.user?.id) {
      loadUserChats(session.user.id);
    }
  }, [session, loadUserChats]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    setConfigLoading(true);

    const cached = getCachedSettings(userId);
    if (cached) {
      setLlmConfig({ baseUrl: cached.llmBaseUrl, apiKey: cached.llmApiKey });
    }

    (async () => {
      const remote = await fetchUserSettings(userId);
      if (remote) {
        setLlmConfig({ baseUrl: remote.llmBaseUrl, apiKey: remote.llmApiKey });
        cacheSettings(userId, remote);
      } else {
        // No saved settings yet, prompt the user the first time they try to use chat.
        setShowConfigModal(true);
      }
      setConfigLoading(false);
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !llmConfig?.baseUrl) return;

    const selectedModelKey = `selected_llm_model_${userId}`;
    const cachedModel = localStorage.getItem(selectedModelKey);
    if (cachedModel) {
      setSelectedModel(cachedModel);
    }

    const loadModels = async () => {
      setModelsLoading(true);
      try {
        const list = await llmService.getModels(llmConfig);
        setModels(list);

        if (cachedModel && list.some((item: ModelOption) => item.id === cachedModel)) {
          setSelectedModel(cachedModel);
        } else if (list.length > 0) {
          setSelectedModel(list[0].id);
          localStorage.setItem(selectedModelKey, list[0].id);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setModelsLoading(false);
      }
    };

    loadModels();
  }, [session?.user?.id, llmConfig?.baseUrl, llmConfig?.apiKey]);

  const handleNewChat = () => {
    const title = `Chat ${new Date().toLocaleString()}`;
    if (session?.user?.id) {
      createNewChat(title, session.user.id);
    }
  };

  const buildPrompt = (content: string, attachments: ChatAttachment[]) => {
    if (attachments.length === 0) return content;

    const attachmentSummary = attachments
      .map((attachment) => {
        if (attachment.type === 'image') {
          return `Image attachment: ${attachment.name}`;
        }

        if (attachment.textContent) {
          const excerpt = attachment.textContent.slice(0, 4000);
          return `File attachment: ${attachment.name}\nContent preview:\n${excerpt}`;
        }

        return `File attachment: ${attachment.name}`;
      })
      .join('\n\n');

    return `${content}\n\nAttached files/photos:\n${attachmentSummary}`;
  };

  const handleSendMessage = async (content: string, attachments: ChatAttachment[] = []) => {
    if (!currentChat || !session?.user?.id) return;

    const prompt = buildPrompt(content, attachments);

    if (!llmConfig?.baseUrl) {
      setDraftBaseUrl(llmConfig?.baseUrl || '');
      setDraftApiKey(llmConfig?.apiKey || '');
      setConfigError('Add your LM Studio URL first to start chatting.');
      setShowConfigModal(true);
      return;
    }

    // Validate LM Studio connection before sending
    setLlmLoading(true);
    try {
      // Quick connectivity check by getting models
      const testModels = await llmService.getModels(llmConfig);
      if (!testModels || testModels.length === 0) {
        throw new Error('LM Studio is not responding or has no models available.');
      }
    } catch (error) {
      setLlmLoading(false);
      await addMessage(
        `❌ LM Studio connection failed: ${error instanceof Error ? error.message : 'Cannot connect to LM Studio at ' + llmConfig.baseUrl + '. Make sure LM Studio is running and the URL is correct.'}`,
        'assistant'
      );
      return;
    }

    // Add user message
    await addMessage(content, 'user', attachments);

    // Get AI response
    setLlmLoading(true);
    try {
      if (!llmConfig?.baseUrl) {
        throw new Error('LLM settings are missing. Open Settings and add your LM Studio URL.');
      }

      const response = await llmService.sendMessage(prompt, llmConfig, selectedModel || 'default');
      await addMessage(response, 'assistant');
      // speak the assistant response (if available and enabled)
      if (ttsEnabled) {
        try {
          speakText(response, { rate: 1.0, pitch: 1.0 });
        } catch (e) {
          // ignore TTS errors
        }
      }
    } catch (error) {
      console.error('Error getting response:', error);
      await addMessage(
        'Sorry, I encountered an error processing your message. Please check your LLM connection in Settings.',
        'assistant'
      );
    } finally {
      setLlmLoading(false);
    }
  };

  const handleSaveQuickConfig = async () => {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!draftBaseUrl.trim()) {
      setConfigError('LM Studio URL is required');
      return;
    }

    const nextConfig = { baseUrl: draftBaseUrl.trim(), apiKey: draftApiKey.trim() };
    cacheSettings(userId, { llmBaseUrl: nextConfig.baseUrl, llmApiKey: nextConfig.apiKey || '' });
    const saved = await saveUserSettings(userId, { llmBaseUrl: nextConfig.baseUrl, llmApiKey: nextConfig.apiKey || '' });

    if (!saved) {
      setConfigError('Could not save settings to the database');
      return;
    }

    setLlmConfig(nextConfig);
    setConfigError('');
    setShowConfigModal(false);
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const userId = session?.user?.id;
    if (userId) {
      localStorage.setItem(`selected_llm_model_${userId}`, modelId);
    }
  };

  const refreshModels = async () => {
    if (!llmConfig?.baseUrl) return;
    setModelsLoading(true);
    try {
      const list = await llmService.getModels(llmConfig);
      setModels(list);
      if (list.length > 0 && !list.some((item) => item.id === selectedModel)) {
        setSelectedModel(list[0].id);
      }
    } finally {
      setModelsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Local LLM Chat</h1>
          <p className="text-gray-300 mb-8">Sign in with Google to get started</p>
          <button
            onClick={() => signIn('google')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800">
          <div>
            <h1 className="text-xl font-semibold text-white">
              {currentChat?.title || 'Start a new chat'}
            </h1>
            <p className="text-sm text-gray-400">{session.user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {configLoading ? (
              <div className="text-sm text-gray-400">Loading LLM config...</div>
            ) : llmConfig?.baseUrl ? (
              <div className="text-sm text-green-300">LLM configured</div>
            ) : (
              <div className="text-sm text-red-300">LLM not configured</div>
            )}

            <button
              onClick={handleToggleTts}
              title={ttsEnabled ? 'Disable TTS' : 'Enable TTS'}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                ttsEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {ttsEnabled ? '🔊 TTS On' : '🔇 TTS Off'}
            </button>

            {syncing ? (
              <div className="flex items-center gap-2 text-sm text-yellow-300">
                <div className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse" />
                <span>Syncing...</span>
              </div>
            ) : (
              <div className="text-sm text-green-300">Up to date</div>
            )}

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Chat Area */}
        {!currentChat ? (
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={handleNewChat}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Start New Chat
            </button>
          </div>
        ) : (
          <>
            <ChatWindow messages={messages} loading={llmLoading} />
            <ChatInput
              onSend={handleSendMessage}
              loading={llmLoading}
              models={models}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              onRefreshModels={refreshModels}
              modelsLoading={modelsLoading}
            />
          </>
        )}
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Add your LM Studio URL</h2>
                <p className="text-sm text-gray-400">You need to save it once before you can chat.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">LLM Base URL</label>
                <input
                  type="url"
                  value={draftBaseUrl}
                  onChange={(e) => setDraftBaseUrl(e.target.value)}
                  placeholder="http://127.0.0.1:1234"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">API Key (optional)</label>
                <input
                  type="password"
                  value={draftApiKey}
                  onChange={(e) => setDraftApiKey(e.target.value)}
                  placeholder="Leave empty if not required"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="text-sm text-gray-400">
                After saving, models will load from this LM Studio URL and appear in the dropdown.
              </div>

              {configError && (
                <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
                  {configError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveQuickConfig}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                >
                  Save and Continue
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="rounded-lg bg-gray-700 px-4 py-3 font-medium text-white hover:bg-gray-600"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
