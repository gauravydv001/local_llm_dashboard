// @ts-nocheck
import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BUCKET = Deno.env.get('SUPABASE_STORAGE_BUCKET') || 'uploads';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  global: { headers: { 'x-upsert': 'true' } },
});

serve(async (req) => {
  try {
    // fetch messages that have attachments
    const { data: msgs, error } = await supabase
      .from('chat_messages')
      .select('id,attachments')
      .neq('attachments', '[]');

    if (error) throw error;

    const now = new Date().toISOString();
    let deletedCount = 0;

    for (const row of msgs || []) {
      const id = row.id;
      const attachments = row.attachments || [];
      let changed = false;

      for (const att of attachments) {
        if (!att || att.deleted) continue;
        if (!att.expires_at) continue;
        if (new Date(att.expires_at) <= new Date(now)) {
          // try delete from storage if path available
          const path = att.path;
          if (path) {
            try {
              await supabase.storage.from(BUCKET).remove([path]);
            } catch (e) {
              console.error('Storage delete error', e);
            }
          }

          att.deleted = true;
          att.url = null;
          att.path = null;
          att.deleted_at = now;
          changed = true;
          deletedCount += 1;
        }
      }

      if (changed) {
        await supabase.from('chat_messages').update({ attachments }).eq('id', id);
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted: deletedCount }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
