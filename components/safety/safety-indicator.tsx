"use client"

import { motion } from "framer-motion"
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SafetyIndicatorProps {
  level: "green" | "yellow" | "red"
  score: number
}

export function SafetyIndicator({ level, score }: SafetyIndicatorProps) {
  const getIcon = () => {
    switch (level) {
      case "green":
        return <ShieldCheck className="h-5 w-5" />
      case "yellow":
        return <Shield className="h-5 w-5" />
      case "red":
        return <ShieldAlert className="h-5 w-5" />
    }
  }

  const getColor = () => {
    switch (level) {
      case "green":
        return "bg-safe text-white"
      case "yellow":
        return "bg-amber-400 text-white"
      case "red":
        return "bg-destructive text-white"
    }
  }

  const getMessage = () => {
    switch (level) {
      case "green":
        return "Your SafeGuard status is excellent"
      case "yellow":
        return "Your SafeGuard status needs attention"
      case "red":
        return "Your SafeGuard status is at risk"
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={`flex items-center gap-1 px-3 py-1 rounded-full ${getColor()}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {getIcon()}
            <span className="font-medium">{score}</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getMessage()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

