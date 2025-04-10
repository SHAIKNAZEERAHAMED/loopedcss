"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { InfoIcon } from "lucide-react"

export function AlgorithmExplainer() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <InfoIcon className="h-4 w-4" />
          <span>How our feed works</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Loop(CSS) Feed Algorithm</DialogTitle>
          <DialogDescription>Understanding how we prevent algorithm bias</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <h4 className="font-medium">Content Diversity</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Our algorithm is designed to prevent echo chambers by ensuring you see a diverse range of content, not
              just what you've engaged with before.
            </p>
          </div>

          <div>
            <h4 className="font-medium">Mixed Content Approach</h4>
            <p className="text-sm text-muted-foreground mt-1">
              We balance content from accounts you follow with new content you might be interested in, ensuring you
              don't miss important posts while still discovering new perspectives.
            </p>
          </div>

          <div>
            <h4 className="font-medium">Personalized Control</h4>
            <p className="text-sm text-muted-foreground mt-1">
              You can customize your diversity settings to control how much preferred vs. diverse content you see in
              your feed.
            </p>
          </div>

          <div>
            <h4 className="font-medium">Language Balance</h4>
            <p className="text-sm text-muted-foreground mt-1">
              We ensure a balance of content in your preferred languages (Telugu, English, or both) without limiting you
              to just one language.
            </p>
          </div>

          <div>
            <h4 className="font-medium">Category Diversity</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Even within your preferred categories, we ensure you see diverse perspectives and content styles to
              prevent a monotonous feed.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

