"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Upload, Video, ImageIcon, DollarSign, Info } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createPaidLoop } from "@/lib/paid-loop-service"
import { hasActiveSubscription, SUBSCRIPTION_TIERS } from "@/lib/subscription-service"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const LOOP_CATEGORIES = [
  "Entertainment",
  "Education",
  "Fitness",
  "Cooking",
  "Music",
  "Dance",
  "Comedy",
  "Fashion",
  "Technology",
  "Travel",
  "Lifestyle",
  "Gaming",
  "Sports",
  "Beauty",
  "Business",
  "Other",
]

export function CreatePaidLoop() {
  const { user } = useAuth()
  const router = useRouter()
  const videoInputRef = useRef<HTMLInputElement>(null)
  const previewImageInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState(499) // $4.99 default
  const [category, setCategory] = useState("")
  const [tags, setTags] = useState("")
  const [isExclusive, setIsExclusive] = useState(true)
  const [allowComments, setAllowComments] = useState(true)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasCreatorSubscription, setHasCreatorSubscription] = useState(false)
  const [checkingSubscription, setCheckingSubscription] = useState(true)

  // Check if user has creator subscription
  useState(() => {
    const checkSubscription = async () => {
      if (user) {
        const hasCreator = await hasActiveSubscription(user.uid, SUBSCRIPTION_TIERS.CREATOR)
        setHasCreatorSubscription(hasCreator)
        setCheckingSubscription(false)
      }
    }

    checkSubscription()
  })

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)

      // Create preview URL
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewImageFile(file)

      // Create preview URL
      const url = URL.createObjectURL(file)
      setImagePreview(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create paid loops",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    if (!hasCreatorSubscription) {
      toast({
        title: "Creator subscription required",
        description: "You need a Creator subscription to create paid loops",
        variant: "destructive",
      })
      router.push("/subscription")
      return
    }

    if (!videoFile) {
      toast({
        title: "Video required",
        description: "Please upload a video for your paid loop",
        variant: "destructive",
      })
      return
    }

    if (!title) {
      toast({
        title: "Title required",
        description: "Please provide a title for your paid loop",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Calculate video duration
      const video = document.createElement("video")
      video.preload = "metadata"
      video.src = URL.createObjectURL(videoFile)

      video.onloadedmetadata = async () => {
        const duration = Math.round(video.duration)

        // Create the paid loop
        const result = await createPaidLoop(user.uid, videoFile, previewImageFile, {
          title,
          description,
          price,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag),
          category: category || "Other",
          isExclusive,
          allowComments,
          duration,
        })

        if (result) {
          toast({
            title: "Loop created successfully",
            description:
              result.status === "approved"
                ? "Your loop is now available for purchase!"
                : "Your loop is pending review and will be available once approved.",
            variant: "default",
          })

          router.push(`/creator/loops/${result.loopId}`)
        } else {
          throw new Error("Failed to create paid loop")
        }
      }
    } catch (error) {
      console.error("Error creating paid loop:", error)
      toast({
        title: "Error creating loop",
        description: "There was an error creating your paid loop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingSubscription) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!hasCreatorSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Subscription Required</CardTitle>
          <CardDescription>
            You need a Creator subscription to create paid loops and monetize your content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">With a Creator subscription, you can:</p>
          <ul className="space-y-2 mb-6 list-disc pl-5">
            <li>Create premium content that your followers can purchase</li>
            <li>Earn 97% of the revenue from your content sales</li>
            <li>Access analytics to track your earnings and content performance</li>
            <li>Get priority support and promotional opportunities</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button onClick={() => router.push("/subscription")}>Get Creator Subscription</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Paid Loop</CardTitle>
        <CardDescription>
          Create premium content that your followers can purchase. You earn 97% of the revenue!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload */}
          <div className="space-y-2">
            <Label htmlFor="video">
              Loop Video <span className="text-red-500">*</span>
            </Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => videoInputRef.current?.click()}
            >
              {videoPreview ? (
                <div className="space-y-2">
                  <video src={videoPreview} controls className="max-h-[200px] mx-auto rounded-md" />
                  <p className="text-sm text-muted-foreground">
                    {videoFile?.name} ({(videoFile?.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <div className="py-4">
                  <Video className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>Click to upload your loop video</p>
                  <p className="text-sm text-muted-foreground mt-1">MP4, MOV, or WebM up to 100MB</p>
                </div>
              )}
              <input
                ref={videoInputRef}
                id="video"
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={handleVideoChange}
              />
            </div>
          </div>

          {/* Preview Image */}
          <div className="space-y-2">
            <Label htmlFor="previewImage" className="flex items-center gap-2">
              Preview Image
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>This image will be shown to users before they purchase your loop</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => previewImageInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="space-y-2">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    className="max-h-[150px] mx-auto rounded-md"
                  />
                  <p className="text-sm text-muted-foreground">
                    {previewImageFile?.name} ({(previewImageFile?.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              ) : (
                <div className="py-4">
                  <ImageIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p>Click to upload a preview image</p>
                  <p className="text-sm text-muted-foreground mt-1">JPG, PNG, or GIF up to 5MB</p>
                </div>
              )}
              <input
                ref={previewImageInputRef}
                id="previewImage"
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a catchy title for your loop"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what viewers will get in this paid loop"
              rows={3}
            />
          </div>

          {/* Price */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="price">Price</Label>
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {(price / 100).toFixed(2)}
              </Badge>
            </div>
            <Slider
              id="price"
              value={[price]}
              min={99}
              max={9999}
              step={100}
              onValueChange={(value) => setPrice(value[0])}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>$0.99</span>
              <span>$99.99</span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {LOOP_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
            />
            <p className="text-xs text-muted-foreground">Tags help users discover your content</p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="exclusive">Exclusive Content</Label>
                <p className="text-xs text-muted-foreground">Prevent screenshots and recordings</p>
              </div>
              <Switch id="exclusive" checked={isExclusive} onCheckedChange={setIsExclusive} />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="comments">Allow Comments</Label>
                <p className="text-xs text-muted-foreground">Let users comment on your paid loop</p>
              </div>
              <Switch id="comments" checked={allowComments} onCheckedChange={setAllowComments} />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Loop...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Create Paid Loop
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

