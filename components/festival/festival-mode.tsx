"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { getCurrentFestival, getFestivalModePreference, setFestivalModePreference } from "@/lib/festival-service"

interface FestivalModeProps {
  onThemeChange?: (theme: any) => void
}

export function FestivalMode({ onThemeChange }: FestivalModeProps) {
  const [festival, setFestival] = useState<any>(null)
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchFestivalData = async () => {
      try {
        // Get current festival
        const currentFestival = await getCurrentFestival()
        setFestival(currentFestival)

        // Get user preference if logged in
        if (user) {
          const preference = await getFestivalModePreference(user.uid)
          setEnabled(preference)

          // Apply theme if enabled
          if (preference && currentFestival && onThemeChange) {
            onThemeChange(currentFestival.theme)
          }
        }
      } catch (error) {
        console.error("Error fetching festival data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFestivalData()
  }, [user, onThemeChange])

  const handleToggle = async (value: boolean) => {
    if (!user) return

    try {
      await setFestivalModePreference(user.uid, value)
      setEnabled(value)

      // Apply or remove theme
      if (value && festival && onThemeChange) {
        onThemeChange(festival.theme)
      } else if (!value && onThemeChange) {
        onThemeChange(null) // Reset to default theme
      }

      toast({
        title: value ? "Festival Mode Enabled" : "Festival Mode Disabled",
        description: value ? `Celebrating ${festival?.name} with a special theme!` : "Returned to the default theme.",
      })
    } catch (error) {
      console.error("Error toggling festival mode:", error)
      toast({
        title: "Error",
        description: "Failed to update festival mode preference.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Festival Mode</CardTitle>
          <CardDescription>Loading festival information...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!festival) {
    return null // No festival to display
  }

  const festivalDate = new Date(festival.date)
  const today = new Date()
  const daysDiff = Math.floor((festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const getStatusText = () => {
    if (daysDiff === 0) return "Today"
    if (daysDiff < 0) return "Ongoing Celebration"
    if (daysDiff === 1) return "Tomorrow"
    return `In ${daysDiff} days`
  }

  return (
    <Card className="w-full overflow-hidden">
      <div className="h-3" style={{ background: festival.theme.background }} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>{festival.icon}</span>
              <span>{festival.name}</span>
            </CardTitle>
            <CardDescription>{festival.description}</CardDescription>
          </div>
          <div className="text-sm font-medium">{getStatusText()}</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          {daysDiff <= 0
            ? `Celebrate ${festival.name} with a special theme and festive content!`
            : `Get ready for ${festival.name} with a special theme and festive content!`}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center space-x-2">
          <Switch id="festival-mode" checked={enabled} onCheckedChange={handleToggle} />
          <Label htmlFor="festival-mode">Enable Festival Mode</Label>
        </div>
        <Button variant="outline" size="sm">
          View Celebrations
        </Button>
      </CardFooter>
    </Card>
  )
}

