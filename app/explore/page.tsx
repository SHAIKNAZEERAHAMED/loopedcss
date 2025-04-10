'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { FirebaseProvider } from '@/contexts/firebase-context';
import AppShell from '@/components/layout/app-shell';
import ExploreContent from '@/components/explore/explore-content';

export default function ExplorePage() {
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
        <ExploreContent />
      </AppShell>
    </FirebaseProvider>
  );
}

