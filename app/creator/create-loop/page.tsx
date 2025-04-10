import { CreatePaidLoop } from "@/components/loops/create-paid-loop"

export default function CreatePaidLoopPage() {
  return (
    <div className="container py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create Paid Loop</h1>
        <p className="text-muted-foreground">Create premium content that your followers can purchase</p>
      </div>

      <CreatePaidLoop />
    </div>
  )
}

