"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { updateUser, uploadProfileImage, uploadCoverImage, type User, isUsernameAvailable } from "@/lib/user-service"
import { Camera, X, Check, Loader2 } from "lucide-react"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
}

export function EditProfileDialog({ open, onOpenChange, user }: EditProfileDialogProps) {
  const [username, setUsername] = useState(user?.username || "")
  const [usernameError, setUsernameError] = useState("")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [bio, setBio] = useState(user?.bio || "")
  const [location, setLocation] = useState(user?.location || "")
  const [website, setWebsite] = useState(user?.website || "")
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      setUsername(user.username || "")
      setDisplayName(user.displayName || "")
      setBio(user.bio || "")
      setLocation(user.location || "")
      setWebsite(user.website || "")
    }
  }, [user, open])

  useEffect(() => {
    const checkUsername = async () => {
      // Skip check if username hasn't changed
      if (username === user?.username) {
        setUsernameError("")
        setUsernameAvailable(true)
        return
      }

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
  }, [username, user])

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setProfileImageFile(file)
      setProfileImagePreview(URL.createObjectURL(file))
    }
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setCoverImageFile(file)
      setCoverImagePreview(URL.createObjectURL(file))
    }
  }

  const clearProfileImage = () => {
    if (profileImagePreview) URL.revokeObjectURL(profileImagePreview)
    setProfileImageFile(null)
    setProfileImagePreview(null)
  }

  const clearCoverImage = () => {
    if (coverImagePreview) URL.revokeObjectURL(coverImagePreview)
    setCoverImageFile(null)
    setCoverImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || !user || !currentUser) return

    // Validate username
    if (username && (usernameError || !usernameAvailable)) {
      toast({
        title: "Invalid username",
        description: usernameError || "Please choose a different username",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Update user profile
      const updates: Partial<User> = {
        displayName,
        bio,
        location,
        website,
      }

      // Only update username if it changed
      if (username !== user.username) {
        updates.username = username
      }

      // Upload profile image if changed
      if (profileImageFile) {
        const profileImageUrl = await uploadProfileImage(currentUser, profileImageFile)
        updates.photoURL = profileImageUrl
      }

      // Upload cover image if changed
      if (coverImageFile) {
        const coverImageUrl = await uploadCoverImage(currentUser, coverImageFile)
        updates.coverPhotoURL = coverImageUrl
      }

      await updateUser(user.uid, updates)

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const userInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {/* Cover Image Section */}
          <div className="mb-6">
            <div className="relative h-32 rounded-lg overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20">
              {coverImagePreview ? (
                <img
                  src={coverImagePreview || "/placeholder.svg"}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : user?.coverPhotoURL ? (
                <img
                  src={user.coverPhotoURL || "/placeholder.svg"}
                  alt="Current cover"
                  className="w-full h-full object-cover"
                />
              ) : null}

              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <input
                  type="file"
                  ref={coverInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleCoverImageChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Change Cover
                </Button>

                {(coverImagePreview || user?.coverPhotoURL) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-2 ml-2"
                    onClick={clearCoverImage}
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Image Section */}
          <div className="mb-6 flex items-center">
            <div className="relative">
              <Avatar className="h-20 w-20">
                {profileImagePreview ? (
                  <AvatarImage src={profileImagePreview} />
                ) : (
                  <AvatarImage src={user?.photoURL || ""} />
                )}
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>

              <div className="absolute -bottom-2 -right-2">
                <input
                  type="file"
                  ref={profileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => profileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="ml-6 flex-1">
              <h3 className="font-medium">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">Upload a new profile picture or use your current one.</p>

              {profileImagePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-destructive hover:text-destructive"
                  onClick={clearProfileImage}
                >
                  Remove new image
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
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
              <p className="text-xs text-muted-foreground">
                Your username will be used in your profile URL and @mentions
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://example.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="share-bg hover:bg-opacity-90"
              disabled={isSubmitting || (username !== user?.username && (!!usernameError || !usernameAvailable))}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

