'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { FirebaseProvider } from '@/contexts/firebase-context';
import AppShell from '@/components/layout/app-shell';
import { CreatorProgramApplication } from '@/components/monetization/creator-program-application';
import { CreatorEarningsDashboard } from '@/components/monetization/creator-earnings-dashboard';

export default function MonetizationPage() {
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
          <h1 className="text-3xl font-bold mb-8">Monetization</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CreatorProgramApplication />
            <CreatorEarningsDashboard />
          </div>
        </div>
      </AppShell>
    </FirebaseProvider>
  );
}

