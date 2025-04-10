'use client';

import AdminLayout from "@/components/admin/admin-layout"
import { ExplainableAI } from "@/components/admin/explainable-ai"

export default function ExplainableAIPage() {
  return (
    <AdminLayout title="Explainable AI">
      <div className="mb-6">
        <p className="text-muted-foreground">
          Understand how our AI makes moderation decisions with transparent explanations
        </p>
      </div>

      <ExplainableAI />
    </AdminLayout>
  )
}

