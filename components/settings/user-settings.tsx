"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateUserProfile, getUserProfile } from "@/lib/user-service"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase/config"
import { v4 as uuidv4 } from "uuid"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Camera, Bell, Shield, User, Palette, Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme/theme-provider"

export default function UserSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Form states
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [website, setWebsite] = useState("")
  const [location, setLocation] = useState("")
  const [photoURL, setPhotoURL] = useState("")

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [mentionNotifications, setMentionNotifications] = useState(true)
  const [commentNotifications, setCommentNotifications] = useState(true)
  const [followNotifications, setFollowNotifications] = useState(true)

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState("public")
  const [showOnlineStatus, setShowOnlineStatus] = useState(true)
  const [allowTagging, setAllowTagging] = useState(true)
  const [allowDirectMessages, setAllowDirectMessages] = useState(true)

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user?.uid) return

      try {
        const userProfile = await getUserProfile(user.uid)

        if (userProfile) {
          setProfile(userProfile)

          // Set form values
          setDisplayName(userProfile.displayName || "")
          setBio(userProfile.bio || "")
          setWebsite(userProfile.website || "")
          setLocation(userProfile.location || "")
          setPhotoURL(userProfile.photoURL || "")

          // Set notification settings
          const notificationSettings = userProfile.notificationSettings || {}
          setEmailNotifications(notificationSettings.email !== false)
          setPushNotifications(notificationSettings.push !== false)
          setMentionNotifications(notificationSettings.mentions !== false)
          setCommentNotifications(notificationSettings.comments !== false)
          setFollowNotifications(notificationSettings.follows !== false)

          // Set privacy settings
          const privacySettings = userProfile.privacySettings || {}
          setProfileVisibility(privacySettings.profileVisibility || "public")
          setShowOnlineStatus(privacySettings.showOnlineStatus !== false)
          setAllowTagging(privacySettings.allowTagging !== false)
          setAllowDirectMessages(privacySettings.allowDirectMessages !== false)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [user?.uid, toast])

  const handleSaveProfile = async () => {
    if (!user?.uid) return

    setSaving(true)

    try {
      const updatedProfile = {
        displayName,
        bio,
        website,
        location,
        photoURL,
        notificationSettings: {
          email: emailNotifications,
          push: pushNotifications,
          mentions: mentionNotifications,
          comments: commentNotifications,
          follows: followNotifications,
        },
        privacySettings: {
          profileVisibility,
          showOnlineStatus,
          allowTagging,
          allowDirectMessages,
        },
      }

      await updateUserProfile(user.uid, updatedProfile)

      toast({
        title: "Success",
        description: "Your profile has been updated",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.uid) return

    const file = e.target.files[0]
    setUploadingPhoto(true)

    try {
      // Upload file to storage
      const fileId = uuidv4()
      const fileExtension = file.name.split(".").pop()
      const fileName = `profile_${user.uid}_${fileId}.${fileExtension}`
      const fileRef = storageRef(storage, `profiles/${user.uid}/${fileName}`)

      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)

      // Update local state
      setPhotoURL(downloadURL)

      toast({
        title: "Success",
        description: "Profile photo uploaded",
        variant: "default",
      })
    } catch (error) {
      console.error("Error uploading photo:", error)
      toast({
        title: "Error",
        description: "Failed to upload profile photo",
        variant: "destructive",
      })
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Privacy</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Appearance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile information and how others see you on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={photoURL} />
                    <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <label
                    htmlFor="photo-upload"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer"
                  >
                    {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </label>

                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                  />
                </div>

                <div className="space-y-4 flex-1">
                  <div className="grid gap-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself"
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Push Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                  </div>
                  <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Notification Types</h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Mentions</h4>
                        <p className="text-xs text-muted-foreground">When someone mentions you in a post or comment</p>
                      </div>
                      <Switch checked={mentionNotifications} onCheckedChange={setMentionNotifications} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Comments</h4>
                        <p className="text-xs text-muted-foreground">When someone comments on your posts</p>
                      </div>
                      <Switch checked={commentNotifications} onCheckedChange={setCommentNotifications} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Follows</h4>
                        <p className="text-xs text-muted-foreground">When someone follows you</p>
                      </div>
                      <Switch checked={followNotifications} onCheckedChange={setFollowNotifications} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy and how others can interact with you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                    <SelectTrigger id="profileVisibility">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public - Anyone can view your profile</SelectItem>
                      <SelectItem value="followers">
                        Followers Only - Only your followers can view your profile
                      </SelectItem>
                      <SelectItem value="private">Private - Only you can view your profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Show Online Status</h3>
                    <p className="text-sm text-muted-foreground">Allow others to see when you're online</p>
                  </div>
                  <Switch checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Allow Tagging</h3>
                    <p className="text-sm text-muted-foreground">Allow others to tag you in posts and comments</p>
                  </div>
                  <Switch checked={allowTagging} onCheckedChange={setAllowTagging} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Allow Direct Messages</h3>
                    <p className="text-sm text-muted-foreground">Allow others to send you direct messages</p>
                  </div>
                  <Switch checked={allowDirectMessages} onCheckedChange={setAllowDirectMessages} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how the application looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      className="flex flex-col items-center justify-center gap-2 h-24"
                      onClick={() => setTheme("light")}
                    >
                      <Sun className="h-6 w-6" />
                      <span>Light</span>
                    </Button>

                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      className="flex flex-col items-center justify-center gap-2 h-24"
                      onClick={() => setTheme("dark")}
                    >
                      <Moon className="h-6 w-6" />
                      <span>Dark</span>
                    </Button>

                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      className="flex flex-col items-center justify-center gap-2 h-24"
                      onClick={() => setTheme("system")}
                    >
                      <div className="flex">
                        <Sun className="h-6 w-6" />
                        <Moon className="h-6 w-6" />
                      </div>
                      <span>System</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

