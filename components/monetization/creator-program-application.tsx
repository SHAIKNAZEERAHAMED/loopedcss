"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, Users, FileText, Shield } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import {
  getCreatorPrograms,
  applyForCreatorProgram,
  getUserCreatorApplication,
  type CreatorProgram,
  type CreatorApplication,
} from "@/lib/monetization-service"
import { getUserProfile } from "@/lib/user-service"
import { getUserPosts } from "@/lib/post-service"
import { calculateSafetyScore } from "@/lib/ai-moderation"

export function CreatorProgramApplication() {
  const [programs, setPrograms] = useState<CreatorProgram[]>([])
  const [selectedProgram, setSelectedProgram] = useState<CreatorProgram | null>(null)
  const [application, setApplication] = useState<CreatorApplication | null>(null)
  const [metrics, setMetrics] = useState({
    followerCount: 0,
    postCount: 0,
    engagementRate: 0,
    contentSafetyScore: 0,
  })
  const [eligibility, setEligibility] = useState({
    isEligible: false,
    followersMet: false,
    postsMet: false,
    engagementMet: false,
    safetyMet: false,
  })
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch creator programs
        const availablePrograms = await getCreatorPrograms()
        setPrograms(availablePrograms)

        if (availablePrograms.length > 0) {
          setSelectedProgram(availablePrograms[0])
        }

        // Fetch user's application if any
        const userApplication = await getUserCreatorApplication(user.uid)
        setApplication(userApplication)

        // Fetch user metrics
        const userProfile = await getUserProfile(user.uid)
        const userPosts = await getUserPosts(user.uid)

        // Calculate engagement rate (simplified)
        let totalEngagement = 0
        userPosts.forEach((post) => {
          totalEngagement += (post.likesCount || 0) + (post.commentsCount || 0)
        })
        const engagementRate =
          userPosts.length > 0 ? (totalEngagement / userPosts.length / (userProfile?.followersCount || 1)) * 100 : 0

        // Calculate safety score
        const contentHistory = userPosts.map((post) => ({
          content: post.content,
          moderationResult: {
            isSafe: post.isSafe,
            category: post.safetyCategory,
            confidence: post.safetyConfidence || 0.5,
          },
        }))

        const safety = await calculateSafetyScore(contentHistory)

        const userMetrics = {
          followerCount: userProfile?.followersCount || 0,
          postCount: userPosts.length,
          engagementRate,
          contentSafetyScore: safety.score,
        }

        setMetrics(userMetrics)

        // Check eligibility if a program is selected
        if (availablePrograms.length > 0) {
          checkEligibility(userMetrics, availablePrograms[0])
        }
      } catch (error) {
        console.error("Error fetching creator program data:", error)
        toast({
          title: "Error",
          description: "Failed to load creator program data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

  const checkEligibility = (userMetrics: typeof metrics, program: CreatorProgram) => {
    const followersMet = userMetrics.followerCount >= program.requirements.minFollowers
    const postsMet = userMetrics.postCount >= program.requirements.minPosts
    const engagementMet = userMetrics.engagementRate >= program.requirements.minEngagementRate
    const safetyMet = userMetrics.contentSafetyScore >= 80 // Assuming 80% is the threshold

    const isEligible = followersMet && postsMet && engagementMet && safetyMet

    setEligibility({
      isEligible,
      followersMet,
      postsMet,
      engagementMet,
      safetyMet,
    })
  }

  const handleProgramChange = (program: CreatorProgram) => {
    setSelectedProgram(program)
    checkEligibility(metrics, program)
  }

  const handleApply = async () => {
    if (!user || !selectedProgram) return

    setApplying(true)

    try {
      const application = await applyForCreatorProgram(
        user.uid,
        user.displayName || "Unknown User",
        selectedProgram.id,
        metrics,
      )

      setApplication(application)

      toast({
        title: "Application Submitted",
        description: "Your creator program application has been submitted successfully.",
      })
    } catch (error) {
      console.error("Error applying for creator program:", error)
      toast({
        title: "Application Error",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Program</CardTitle>
          <CardDescription>Loading creator program information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (application) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Program Application</CardTitle>
          <CardDescription>Your application for the creator program is {application.status}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert
            variant={
              application.status === "approved"
                ? "default"
                : application.status === "rejected"
                  ? "destructive"
                  : "warning"
            }
          >
            <div className="flex items-start gap-2">
              {application.status === "approved" ? (
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
              ) : application.status === "rejected" ? (
                <XCircle className="h-4 w-4 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5" />
              )}
              <div>
                <AlertTitle>
                  {application.status === "approved"
                    ? "Application Approved"
                    : application.status === "rejected"
                      ? "Application Rejected"
                      : "Application Pending"}
                </AlertTitle>
                <AlertDescription>
                  {application.status === "approved"
                    ? "Congratulations! Your application has been approved. You can now start earning from your content."
                    : application.status === "rejected"
                      ? application.reviewerNotes ||
                        "Your application has been rejected. Please review the requirements and try again later."
                      : "Your application is currently under review. We'll notify you once a decision has been made."}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Application Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Submission Date</p>
                <p className="text-sm">{new Date(application.submissionDate).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Program</p>
                <p className="text-sm">
                  {programs.find((p) => p.id === application.programId)?.name || "Unknown Program"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Your Metrics</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Followers
                  </span>
                  <span>{application.metrics.followerCount}</span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (application.metrics.followerCount / selectedProgram?.requirements.minFollowers || 1) * 100,
                  )}
                  className="h-2"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Posts
                  </span>
                  <span>{application.metrics.postCount}</span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (application.metrics.postCount / selectedProgram?.requirements.minPosts || 1) * 100,
                  )}
                  className="h-2"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Engagement Rate
                  </span>
                  <span>{application.metrics.engagementRate.toFixed(2)}%</span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (application.metrics.engagementRate / selectedProgram?.requirements.minEngagementRate || 1) * 100,
                  )}
                  className="h-2"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Content Safety
                  </span>
                  <span>{application.metrics.contentSafetyScore.toFixed(0)}%</span>
                </div>
                <Progress value={application.metrics.contentSafetyScore} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Program</CardTitle>
        <CardDescription>Join our creator program and start earning from your content</CardDescription>
      </CardHeader>
      <CardContent>
        {programs.length === 0 ? (
          <Alert>
            <AlertTitle>No Programs Available</AlertTitle>
            <AlertDescription>
              There are currently no creator programs available. Please check back later.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">{selectedProgram?.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedProgram?.description}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Requirements</h4>
              <ul className="space-y-2 text-sm">
                <li
                  className={`flex items-center gap-2 ${eligibility.followersMet ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {eligibility.followersMet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span>
                    Minimum {selectedProgram?.requirements.minFollowers} followers (You have {metrics.followerCount})
                  </span>
                </li>
                <li
                  className={`flex items-center gap-2 ${eligibility.postsMet ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {eligibility.postsMet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span>
                    Minimum {selectedProgram?.requirements.minPosts} posts (You have {metrics.postCount})
                  </span>
                </li>
                <li
                  className={`flex items-center gap-2 ${eligibility.engagementMet ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {eligibility.engagementMet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span>
                    Minimum {selectedProgram?.requirements.minEngagementRate}% engagement rate (You have{" "}
                    {metrics.engagementRate.toFixed(2)}%)
                  </span>
                </li>
                <li
                  className={`flex items-center gap-2 ${eligibility.safetyMet ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {eligibility.safetyMet ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span>Content safety score of at least 80% (You have {metrics.contentSafetyScore.toFixed(0)}%)</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Benefits</h4>
              <ul className="space-y-1 text-sm">
                {selectedProgram?.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Payout Structure</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Per 1,000 Views</p>
                  <p className="font-medium">₹{selectedProgram?.payoutStructure.viewPayout}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Per Like</p>
                  <p className="font-medium">₹{selectedProgram?.payoutStructure.likePayout}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Per Comment</p>
                  <p className="font-medium">₹{selectedProgram?.payoutStructure.commentPayout}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Per Share</p>
                  <p className="font-medium">₹{selectedProgram?.payoutStructure.sharePayout}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Your Eligibility</h4>
              <Progress
                value={
                  [
                    eligibility.followersMet,
                    eligibility.postsMet,
                    eligibility.engagementMet,
                    eligibility.safetyMet,
                  ].filter(Boolean).length * 25
                }
                className="h-2"
              />
              <p className="text-sm text-muted-foreground">
                {eligibility.isEligible
                  ? "You meet all requirements for this program!"
                  : "You don't meet all requirements yet. Keep creating content to improve your metrics."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleApply}
          disabled={!eligibility.isEligible || applying || programs.length === 0}
          className="w-full"
        >
          {applying ? "Applying..." : "Apply Now"}
        </Button>
      </CardFooter>
    </Card>
  )
}

