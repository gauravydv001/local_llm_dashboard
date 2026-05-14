'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { fetchUserSettings, getCachedSettings, cacheSettings, saveUserSettings } from '@/lib/userSettings';

export function Settings() {
  const { data: session } = useSession();
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    setLoadingSettings(true);

    // instant cached load
    const cached = getCachedSettings(userId);
    if (cached) {
      setLlmBaseUrl(cached.llmBaseUrl || '');
      setLlmApiKey(cached.llmApiKey || '');
    }

    (async () => {
      const remote = await fetchUserSettings(userId);
      if (remote) {
        setLlmBaseUrl(remote.llmBaseUrl || '');
        setLlmApiKey(remote.llmApiKey || '');
        cacheSettings(userId, remote);
      }
      setLoadingSettings(false);
    })();
  }, [session?.user?.id]);

  const handleSave = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      setError('You must be signed in to save settings');
      return;
    }

    if (!llmBaseUrl.trim()) {
      setError('LLM Base URL is required');
      return;
    }

    const settings = {
      llmBaseUrl: llmBaseUrl.trim(),
      llmApiKey: llmApiKey.trim(),
    };

    cacheSettings(userId, settings);

    const result = await saveUserSettings(userId, settings);
    if (!result) {
      setError('Could not save settings right now, but they were saved in the browser');
      return;
    }

    setSaved(true);
    setError('');
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    if (!llmBaseUrl.trim()) {
      setError('Please enter LLM Base URL');
      return;
    }

    setTestLoading(true);
    setError('');

    try {
      const response = await fetch(`${llmBaseUrl.trim()}/v1/models`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      alert(`✓ Connection successful! Found ${data.data?.length || 0} models`);
    } catch (err: any) {
      setError(`Connection failed: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <a
            href="/"
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} className="text-white" />
          </a>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <SettingsIcon size={32} />
            Settings
          </h1>
        </div>

        {/* Configuration Card */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
          {/* LLM Configuration */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">LLM Configuration</h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                LLM Base URL
              </label>
              <input
                type="url"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder="http://127.0.0.1:1234"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                URL where this user's LM Studio is running (e.g., http://127.0.0.1:1234)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                API Key (Optional)
              </label>
              <input
                type="password"
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder="Leave empty if not required"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                API key for this user's LM Studio (if it requires authentication)
              </p>
            </div>
          </div>

          {loadingSettings && (
            <div className="text-sm text-gray-400">Loading saved settings...</div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {saved && (
            <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-200 text-sm">
              ✓ Settings saved successfully
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Settings
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testLoading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {testLoading ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How to Use</h3>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Start your LM Studio application</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span>Load and run your preferred model (e.g., Llama 2, Mistral)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span>Enter the LLM Base URL above (default: http://127.0.0.1:1234)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span>Click "Test Connection" to verify everything works</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 font-bold">5.</span>
              <span>Start chatting!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
