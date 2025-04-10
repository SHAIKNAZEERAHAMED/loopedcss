import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SentimentProps {
  sentiment: {
    score: number
    label: "positive" | "neutral" | "negative"
    confidence: number
    emoji: string
    color: string
  }
  showLabel?: boolean
}

export function SentimentIndicator({ sentiment, showLabel = false }: SentimentProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5">
            <span className="text-lg">{sentiment.emoji}</span>
            {showLabel && (
              <span style={{ color: sentiment.color }} className="text-sm font-medium">
                {sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{sentiment.label.charAt(0).toUpperCase() + sentiment.label.slice(1)} tone</p>
            <p className="text-xs text-muted-foreground">{Math.round(sentiment.confidence * 100)}% confidence</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

