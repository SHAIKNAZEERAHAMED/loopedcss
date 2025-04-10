"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ContentCategory,
  type DiversitySettings,
  defaultDiversitySettings,
} from "@/lib/services/content-diversity-service"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { toast } from "@/components/ui/use-toast"
import { CheckIcon } from "lucide-react"

export function ContentPreferences() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<DiversitySettings>(defaultDiversitySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadUserPreferences()
    }
  }, [user])

  const loadUserPreferences = async () => {
    try {
      setLoading(true)
      const userPrefsDoc = await getDoc(doc(db, "userPreferences", user!.uid))

      if (userPrefsDoc.exists()) {
        const data = userPrefsDoc.data()
        if (data.diversitySettings) {
          setSettings(data.diversitySettings as DiversitySettings)
        }
      }
    } catch (error) {
      console.error("Error loading user preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveUserPreferences = async () => {
    if (!user) return

    try {
      setSaving(true)
      await setDoc(
        doc(db, "userPreferences", user.uid),
        {
          diversitySettings: settings,
          updatedAt: new Date(),
        },
        { merge: true },
      )

      toast({
        title: "Preferences saved",
        description: "Your content preferences have been updated.",
      })
    } catch (error) {
      console.error("Error saving user preferences:", error)
      toast({
        title: "Error saving preferences",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCategoryToggle = (category: ContentCategory) => {
    setSettings((prev) => {
      const newCategories = [...prev.preferredCategories]

      if (newCategories.includes(category)) {
        return {
          ...prev,
          preferredCategories: newCategories.filter((c) => c !== category),
        }
      } else {
        return {
          ...prev,
          preferredCategories: [...newCategories, category],
        }
      }
    })
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading preferences...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Diversity Settings</CardTitle>
        <CardDescription>
          Customize your feed to balance between preferred content and discovering new content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Diversity Level</h3>
          <p className="text-sm text-muted-foreground">Choose how diverse you want your feed to be</p>
          <RadioGroup
            value={settings.diversityLevel}
            onValueChange={(value) =>
              setSettings((prev) => ({ ...prev, diversityLevel: value as "low" | "medium" | "high" }))
            }
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="low" id="diversity-low" />
              <Label htmlFor="diversity-low">Low - Mostly content you prefer</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="diversity-medium" />
              <Label htmlFor="diversity-medium">Medium - Balanced mix</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="high" id="diversity-high" />
              <Label htmlFor="diversity-high">High - More diverse content</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Content Categories</h3>
          <p className="text-sm text-muted-foreground">Select categories you're interested in</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {Object.values(ContentCategory).map((category) => (
              <div
                key={category}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer ${
                  settings.preferredCategories.includes(category as ContentCategory)
                    ? "border-primary bg-primary/10"
                    : "border-input"
                }`}
                onClick={() => handleCategoryToggle(category as ContentCategory)}
              >
                <span className="text-sm font-medium capitalize">{category}</span>
                {settings.preferredCategories.includes(category as ContentCategory) && (
                  <CheckIcon className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Following Weight</h3>
          <p className="text-sm text-muted-foreground">How much to prioritize content from accounts you follow</p>
          <div className="flex flex-col space-y-2">
            <Slider
              value={[settings.followingWeight * 100]}
              min={0}
              max={100}
              step={10}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, followingWeight: value[0] / 100 }))}
            />
            <div className="flex justify-between">
              <span className="text-xs">Less</span>
              <span className="text-xs font-medium">{Math.round(settings.followingWeight * 100)}%</span>
              <span className="text-xs">More</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">New Accounts Exposure</h3>
          <p className="text-sm text-muted-foreground">
            How much to expose content from accounts you haven't seen before
          </p>
          <div className="flex flex-col space-y-2">
            <Slider
              value={[settings.newAccountsExposure * 100]}
              min={0}
              max={100}
              step={10}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, newAccountsExposure: value[0] / 100 }))}
            />
            <div className="flex justify-between">
              <span className="text-xs">Less</span>
              <span className="text-xs font-medium">{Math.round(settings.newAccountsExposure * 100)}%</span>
              <span className="text-xs">More</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Local Content</h3>
          <p className="text-sm text-muted-foreground">How much to prioritize content from your location</p>
          <div className="flex flex-col space-y-2">
            <Slider
              value={[settings.localContentWeight * 100]}
              min={0}
              max={100}
              step={10}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, localContentWeight: value[0] / 100 }))}
            />
            <div className="flex justify-between">
              <span className="text-xs">Less</span>
              <span className="text-xs font-medium">{Math.round(settings.localContentWeight * 100)}%</span>
              <span className="text-xs">More</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Language Preference</h3>
          <p className="text-sm text-muted-foreground">Choose your preferred language for content</p>
          <RadioGroup
            value={settings.languagePreference}
            onValueChange={(value) =>
              setSettings((prev) => ({ ...prev, languagePreference: value as "telugu" | "english" | "both" }))
            }
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="telugu" id="lang-telugu" />
              <Label htmlFor="lang-telugu">Telugu</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="english" id="lang-english" />
              <Label htmlFor="lang-english">English</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="lang-both" />
              <Label htmlFor="lang-both">Both (Telugu & English)</Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={saveUserPreferences} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  )
}

