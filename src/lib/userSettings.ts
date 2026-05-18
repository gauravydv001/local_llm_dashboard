import { supabase } from './supabase';
import { Settings, UserSettings } from '@/types';
import { localStore } from './localStore';

const STORAGE_PREFIX = 'user_llm_settings_';

export function getCachedSettings(userId: string): Settings | null {
  try {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function cacheSettings(userId: string, settings: Settings) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(settings));
  } catch {}
}

export async function fetchUserSettings(userId: string): Promise<Settings | null> {
  // Prefer local disk store when available (Electron)
  if (localStore.isAvailable()) {
    const data = (await localStore.readJson(`users/${userId}/settings.json`)) as any;
    if (!data) return null;
    return {
      llmBaseUrl: data.llmBaseUrl || '',
      llmApiKey: data.llmApiKey || '',
    };
  }

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id,llm_base_url,llm_api_key,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error loading user settings:', error);
    }
    return null;
  }

  if (!data) return null;

  return {
    llmBaseUrl: data.llm_base_url || '',
    llmApiKey: data.llm_api_key || '',
  };
}

export async function saveUserSettings(userId: string, settings: Settings): Promise<UserSettings | null> {
  // Prefer local disk store when available
  if (localStore.isAvailable()) {
    const payload = {
      userId,
      llmBaseUrl: settings.llmBaseUrl,
      llmApiKey: settings.llmApiKey,
      updatedAt: new Date().toISOString(),
    };
    await localStore.ensureDir(`users/${userId}`);
    await localStore.writeJson(`users/${userId}/settings.json`, payload);
    return payload as UserSettings;
  }

  if (!supabase) return null;

  const payload = {
    user_id: userId,
    llm_base_url: settings.llmBaseUrl,
    llm_api_key: settings.llmApiKey,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    if (error.code !== 'PGRST205') {
      console.error('Error saving user settings:', error);
    }
    // If the table does not exist yet, fall back to browser cache so the user can keep working.
    return {
      userId,
      llmBaseUrl: settings.llmBaseUrl,
      llmApiKey: settings.llmApiKey,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    userId: data.user_id,
    llmBaseUrl: data.llm_base_url || '',
    llmApiKey: data.llm_api_key || '',
    updatedAt: data.updated_at,
  };
}
