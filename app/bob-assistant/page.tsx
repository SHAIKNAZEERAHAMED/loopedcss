import { BobAssistant } from "@/components/bob/bob-assistant"
import { Card } from "@/components/ui/card"

export default function BobAssistantPage() {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-b from-background to-muted/50">
        <div className="p-6 border-b border-border/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            BOB AI Assistant
          </h1>
          <p className="text-muted-foreground mt-2">
            Your personal AI companion for Loop - Ask anything in English, Telugu, or mix both!
          </p>
        </div>
        <div className="p-0">
          <BobAssistant />
        </div>
      </Card>
    </div>
  )
}

