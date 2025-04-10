'use client';

import AdminLayout from '@/components/admin/admin-layout';
import SocketSetupDashboard from '@/components/admin/socket/socket-setup-dashboard';

export default function SocketSetupPage() {
  return (
    <AdminLayout title="Socket Setup">
      <SocketSetupDashboard />
    </AdminLayout>
  );
}

