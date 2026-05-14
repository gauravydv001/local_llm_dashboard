import { supabase } from './supabase';

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'uploads';

// Returns { publicUrl, path } or null on failure
export async function uploadFile(file: File, pathPrefix = ''): Promise<{ publicUrl: string | null; path: string | null } | null> {
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
