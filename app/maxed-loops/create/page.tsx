import { CreateMaxedLoop } from "@/components/maxed-loops/create-maxed-loop"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Maxed Loop | SharePulse",
  description: "Create and share your own short-form content",
}

export default function CreateMaxedLoopPage() {
  return (
    <div className="container py-6">
      <CreateMaxedLoop />
    </div>
  )
}

