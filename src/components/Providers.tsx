'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { ChatProvider } from '@/contexts/ChatContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChatProvider>{children}</ChatProvider>
    </SessionProvider>
  );
}
