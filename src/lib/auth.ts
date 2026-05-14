import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from './supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Use email as stable, deterministic user ID
        if (user.email) {
          token.id = user.email;
          token.email = user.email;
        }
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string | undefined;  
      }
      return session;
    },
    async signIn({ user }) {
      try {
        if (!user?.email) {
          return true;
        }

        if (supabase && user.email) {
          // Check if user_settings already exists for this email
          const { data: existing, error: fetchError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.email)
            .single();

          // Only create user_settings on first login, never overwrite existing settings
          if (!existing && !fetchError) {
            // Row exists, don't touch it (preserves LLM settings from previous logins)
          } else if (fetchError?.code === 'PGRST116') {
            // PGRST116 = no rows found, so create new user_settings
            await supabase.from('user_settings').insert({
              user_id: user.email,
              llm_base_url: '',
              llm_api_key: '',
            });
          }
        } else {
          console.warn('Supabase client not initialized; skipping user persistence');
        }

        return true;
      } catch (error) {
        console.error('SignIn error:', error);
        return true;
      }
    },

  },
};
