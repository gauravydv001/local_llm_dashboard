import { supabase } from './supabase';
import { localStore } from './localStore';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'uploads';

// Returns { publicUrl, path } or null on failure
export async function uploadFile(file: File, pathPrefix = ''): Promise<{ publicUrl: string | null; path: string | null } | null> {
  if (localStore.isAvailable()) {
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const relativePath = `${pathPrefix}${crypto.randomUUID()}_${cleanName}`;
      const buffer = new Uint8Array(await file.arrayBuffer());
      const result = await localStore.saveFile(`attachments/${relativePath}`, buffer);
      return {
        publicUrl: result?.path || null,
        path: `attachments/${relativePath}`,
      };
    } catch (err) {
      console.error('Local file save failed:', err);
      return null;
    }
  }

  if (!supabase) {
    console.warn('Supabase not initialized; cannot upload file');
    return null;
  }

  try {
    const filename = `${pathPrefix}${crypto.randomUUID()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, file, { upsert: false });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    const publicData = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return { publicUrl: publicData.data?.publicUrl ?? null, path: data.path };
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
}
