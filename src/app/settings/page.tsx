'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings } from '@/components/Settings';

export default function SettingsPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not signed in</h1>
          <p className="text-gray-300">Please sign in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Settings />
    </div>
  );
}
