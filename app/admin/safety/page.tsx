"use client"

import { withAdminAuth } from "@/components/admin/with-admin-auth"

function SafetyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Safety Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Add your safety dashboard content here */}
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Content Moderation</h2>
          <p>Monitor and manage content moderation settings.</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Reports</h2>
          <p>View and handle user-reported content and issues.</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Safety Metrics</h2>
          <p>Track key safety and moderation metrics.</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Policy Management</h2>
          <p>Update and manage safety policies.</p>
        </div>
      </div>
    </div>
  )
}

export default withAdminAuth(SafetyPage)

