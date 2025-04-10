'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { FirebaseProvider } from '@/contexts/firebase-context';
import AppShell from '@/components/layout/app-shell';
import NotificationsContent from './notifications-content';

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <FirebaseProvider>
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Notifications</h1>
          <NotificationsContent />
        </div>
      </AppShell>
    </FirebaseProvider>
  );
}

