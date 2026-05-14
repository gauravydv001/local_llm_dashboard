-- Supabase Database Setup SQL
-- Run these queries in your Supabase SQL Editor to set up the database schema

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  timestamp timestamp with time zone DEFAULT now()
);

-- Per-user LLM settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id text PRIMARY KEY,
  llm_base_url text NOT NULL DEFAULT '',
  llm_api_key text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_updated_at_idx ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_timestamp_idx ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS user_settings_updated_at_idx ON user_settings(updated_at DESC);

ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS user_settings ADD COLUMN IF NOT EXISTS llm_base_url text NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS user_settings ADD COLUMN IF NOT EXISTS llm_api_key text NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS user_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Migration for existing projects that used the old Supabase Auth schema.
-- This removes the auth.uid() dependency so the frontend-only NextAuth flow works.
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete messages from their chats" ON chat_messages;

ALTER TABLE IF EXISTS chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_messages DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey;
ALTER TABLE IF EXISTS chats ALTER COLUMN user_id TYPE text USING user_id::text;

DROP TABLE IF EXISTS users;

-- This project uses Google sign-in via NextAuth in the frontend.
-- Supabase Auth is not used here, so do not add auth.uid() policies.
--
-- If you want strict per-user security later, switch to Supabase Auth
-- or move chat writes/reads to a backend using the Supabase service role.
