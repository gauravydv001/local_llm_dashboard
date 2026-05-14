# Local LLM Chat

ChatGPT-style app for LM Studio with Google sign-in, Supabase chat history, per-user LLM settings, file/photo uploads, local cache, and browser sync.

## Features

- Local LLM chat through LM Studio
- Google OAuth login
- Chats stored in Supabase
- Per-user LLM URL and API key saved in the database
- Upload photos and files
- Drag and drop uploads
- Local browser cache for fast chat switching
- Sync status indicator
- Upload expiry cleanup flow

## Tech Stack

- Next.js 16, React, TypeScript
- Tailwind CSS
- NextAuth.js
- Supabase
- Axios
- Lucide icons

## Requirements

- Node.js 18+
- An LM Studio server running on your machine
- A Supabase project
- Google OAuth credentials

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the Supabase schema

Open `supabase.sql` in the Supabase SQL editor and run it.

This creates:
- `chats`
- `chat_messages`
- `user_settings`

### 3. Configure Google OAuth

In Google Cloud Console, set:

- Authorized JavaScript origins:
  - `http://localhost:3000`
- Authorized redirect URI:
  - `http://localhost:3000/api/auth/callback/google`

### 4. Create `.env.local`

Use your Supabase project URL and anon/publishable key, plus Google OAuth values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=generate_a_random_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=uploads
ATTACHMENT_RETENTION_HOURS=24
```

Generate `NEXTAUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## How it works

- When a user signs in, their LLM settings are loaded from Supabase.
- If no LLM URL exists yet, a popup asks the user to enter it.
- Chats load instantly from browser cache, then sync from Supabase.
- Uploaded files are sent to Supabase Storage.
- Uploaded items can expire after 24 hours through the cleanup flow.

## Project Structure

```text
src/
├── app/
├── components/
├── contexts/
├── lib/
└── types/
supabase.sql
supabase/functions/cleanup/index.ts
```

## Notes

- Do not commit `.env.local`.
- Make sure your `uploads` bucket exists in Supabase Storage.
- If the `user_settings` table is missing, the app falls back to browser cache until the SQL is applied.

## Build

```bash
npm run build
```
