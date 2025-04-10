'use client';

import AdminLayout from '@/components/admin/admin-layout';
import DatabaseRulesEditor from '@/components/admin/database/database-rules-editor';

export default function DatabaseRulesPage() {
  return (
    <AdminLayout title="Database Rules">
      <DatabaseRulesEditor />
    </AdminLayout>
  );
}

