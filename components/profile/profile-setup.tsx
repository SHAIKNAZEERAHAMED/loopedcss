"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Camera, Check, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { updateUser, uploadProfileImage, isUsernameAvailable } from "@/lib/user-service"

export function ProfileSetup() {
  const [username, setUsername] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [website, setWebsite] = useState("")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "")
    }
  }, [user])

  useEffect(() => {
    const checkUsername = async () => {
      if (username.length < 3) {
        setUsernameError("Username must be at least 3 characters")
        setUsernameAvailable(false)
        return
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameError("Username can only contain letters, numbers, and underscores")
        setUsernameAvailable(false)
        return
      }

      setCheckingUsername(true)
      try {
        const available = await isUsernameAvailable(username)
        setUsernameAvailable(available)
        setUsernameError(available ? "" : "Username is already taken")
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameError("Error checking username availability")
      } finally {
        setCheckingUsername(false)
      }
    }

    const debounceTimeout = setTimeout(() => {
      if (username) {
        checkUsername()
      }
    }, 500)

    return () => clearTimeout(debounceTimeout)
  }, [username])

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImage(file)
      setProfileImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isSubmitting) return

    if (step === 1) {
      if (!username || usernameError) return
      setStep(2)
      return
    }

    setIsSubmitting(true)

    try {
      const updates: any = {
        username,
        usernameLower: username.toLowerCase(),
        displayName,
        bio,
        location,
        website,
        isProfileComplete: true,
      }

      // Upload profile image if selected
      if (profileImage) {
        const photoURL = await uploadProfileImage(user, profileImage)
        updates.photoURL = photoURL
      }

      await updateUser(user.uid, updates)

      toast({
        title: "Profile setup complete!",
        description: "Your profile has been created successfully.",
      })

      router.push("/dashboard")
    } catch (error) {
      console.error("Error setting up profile:", error)
      toast({
        title: "Error",
        description: "Failed to set up profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <Card className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            {step === 1 ? "Choose a unique username for your profile" : "Add more details to your profile"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input
                    id="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`pr-10 ${
                      usernameError ? "border-red-500" : usernameAvailable && username ? "border-green-500" : ""
                    }`}
                  />
                  {checkingUsername ? (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                  ) : username ? (
                    usernameAvailable ? (
                      <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    ) : (
                      <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>
                {usernameError && <p className="text-sm text-red-500">{usernameError}</p>}
                {usernameAvailable && username && <p className="text-sm text-green-500">Username is available</p>}
                {usernameError && usernameError.includes("Index not defined") && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-xs">
                    <p className="font-medium">Firebase Configuration Note:</p>
                    <p>Your Firebase database needs an index for username searches.</p>
                    <p>Add this to your Firebase Realtime Database rules:</p>
                    <pre className="mt-1 p-1 bg-amber-100 rounded overflow-x-auto">
                      {`"rules": {
  "users": {
    ".indexOn": ["usernameLower", "displayNameLower"]
  }
}`}
                    </pre>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Your username will be used in your profile URL:</p>
                <p className="font-medium">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/profile/${username || "username"}`
                    : `/profile/${username || "username"}`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {profileImagePreview ? (
                      <AvatarImage src={profileImagePreview} />
                    ) : (
                      <>
                        <AvatarImage src={user.photoURL || ""} />
                        <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Where are you based?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="Your website or social media link"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          {step === 2 && (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button
            type="submit"
            className="ml-auto"
            disabled={isSubmitting || (step === 1 && (!username || !!usernameError || !usernameAvailable))}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : step === 1 ? (
              "Next"
            ) : (
              "Complete Profile"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

