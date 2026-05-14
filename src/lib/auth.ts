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
        // Use email as stable, deterministic user ID (same email = same ID always)
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
          // Use email as stable user ID (same email always maps to same user_settings row)
          await supabase.from('user_settings').upsert({
            user_id: user.email,
            llm_base_url: '',
            llm_api_key: '',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
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
