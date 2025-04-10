import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Dashboard | Loop(CSS)",
  description: "Manage and monitor Loop(CSS) platform",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4">
        {children}
      </div>
    </div>
  )
}

