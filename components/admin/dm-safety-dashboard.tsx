"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, CheckCircle, XCircle, Shield, Clock, Ban } from "lucide-react"
import { getDMSafetyReports, updateDMSafetyReportStatus, getUsersUnderSuspicion } from "@/lib/dm-safety-service"
import { getUserProfile } from "@/lib/user-service"
import { formatDistanceToNow } from "date-fns"
import { Progress } from "@/components/ui/progress"

interface DMSafetyReport {
  id?: string
  reporterId: string
  reportedUserId: string
  reason: string
  timestamp: number
  status: "pending" | "reviewed" | "dismissed"
  evidence?: {
    messageIds: string[]
    screenshots?: string[]
  }
  reporterName?: string
  reporterPhoto?: string | null
  reportedUserName?: string
  reportedUserPhoto?: string | null
}

interface UserSafetyStatus {
  userId: string
  reportCount: number
  dmRequestCount: number
  dmRequestFrequency: number
  lastReportedAt?: number
  lastDMRequestAt?: number
  suspensionHistory: {
    startDate: number
    endDate: number
    reason: string
  }[]
  isSuspended: boolean
  suspensionEndDate?: number
  safetyScore: number
  isUnderSuspicion: boolean
  userName?: string
  userPhoto?: string | null
}

export function DMSafetyDashboard() {
  const [reports, setReports] = useState<DMSafetyReport[]>([])
  const [suspiciousUsers, setSuspiciousUsers] = useState<UserSafetyStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch reports
        const fetchedReports = await getDMSafetyReports()

        // Fetch user details for each report
        const reportsWithUserDetails = await Promise.all(
          fetchedReports.map(async (report) => {
            const reporter = await getUserProfile(report.reporterId)
            const reportedUser = await getUserProfile(report.reportedUserId)

            return {
              ...report,
              reporterName: reporter?.displayName || "Unknown User",
              reporterPhoto: reporter?.photoURL,
              reportedUserName: reportedUser?.displayName || "Unknown User",
              reportedUserPhoto: reportedUser?.photoURL,
            }
          }),
        )

        setReports(reportsWithUserDetails)

        // Fetch suspicious users
        const fetchedUsers = await getUsersUnderSuspicion()

        // Fetch user details for each suspicious user
        const usersWithDetails = await Promise.all(
          fetchedUsers.map(async (user) => {
            const userProfile = await getUserProfile(user.userId)

            return {
              ...user,
              userName: userProfile?.displayName || "Unknown User",
              userPhoto: userProfile?.photoURL,
            }
          }),
        )

        setSuspiciousUsers(usersWithDetails)
      } catch (error) {
        console.error("Error fetching DM safety data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const handleApproveReport = async (reportId: string) => {
    try {
      await updateDMSafetyReportStatus(reportId, "reviewed", "Report reviewed and action taken")

      // Update local state
      setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, status: "reviewed" } : report)))
    } catch (error) {
      console.error("Error approving report:", error)
    }
  }

  const handleDismissReport = async (reportId: string) => {
    try {
      await updateDMSafetyReportStatus(reportId, "dismissed", "Report reviewed and dismissed")

      // Update local state
      setReports((prev) => prev.map((report) => (report.id === reportId ? { ...report, status: "dismissed" } : report)))
    } catch (error) {
      console.error("Error dismissing report:", error)
    }
  }

  const getSafetyScoreColor = (score: number) => {
    if (score >= 0.7) return "bg-green-500"
    if (score >= 0.4) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{reports.filter((r) => r.status === "pending").length}</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Users Under Suspicion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{suspiciousUsers.length}</div>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suspended Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{suspiciousUsers.filter((u) => u.isSuspended).length}</div>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">DM Reports</TabsTrigger>
          <TabsTrigger value="users">Suspicious Users</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
              <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : reports.filter((r) => r.status === "pending").length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No pending reports</p>
                </div>
              ) : (
                reports
                  .filter((r) => r.status === "pending")
                  .map((report) => (
                    <Card key={report.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={report.reporterPhoto || ""} />
                              <AvatarFallback>{report.reporterName?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">
                                {report.reporterName} reported {report.reportedUserName}
                              </CardTitle>
                              <CardDescription>
                                {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                            Pending Review
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Reason:</h4>
                          <p className="text-sm bg-muted p-3 rounded-md">{report.reason}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium mb-1">Reported User:</h4>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={report.reportedUserPhoto || ""} />
                                <AvatarFallback>{report.reportedUserName?.charAt(0) || "U"}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{report.reportedUserName}</span>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium mb-1">Evidence:</h4>
                            <span className="text-sm">{report.evidence?.messageIds.length || 0} messages</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" className="gap-2" onClick={() => handleApproveReport(report.id!)}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Take Action
                          </Button>

                          <Button
                            variant="outline"
                            className="gap-2 border-red-200 text-red-500 hover:bg-red-50"
                            onClick={() => handleDismissReport(report.id!)}
                          >
                            <XCircle className="h-4 w-4" />
                            Dismiss
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            <TabsContent value="reviewed" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : reports.filter((r) => r.status === "reviewed").length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No reviewed reports</p>
                </div>
              ) : (
                reports
                  .filter((r) => r.status === "reviewed")
                  .map((report) => (
                    <Card key={report.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={report.reporterPhoto || ""} />
                              <AvatarFallback>{report.reporterName?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">
                                {report.reporterName} reported {report.reportedUserName}
                              </CardTitle>
                              <CardDescription>
                                {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                            Action Taken
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Reason:</h4>
                          <p className="text-sm bg-muted p-3 rounded-md">{report.reason}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            <TabsContent value="dismissed" className="space-y-4 mt-4">
              {loading ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : reports.filter((r) => r.status === "dismissed").length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p>No dismissed reports</p>
                </div>
              ) : (
                reports
                  .filter((r) => r.status === "dismissed")
                  .map((report) => (
                    <Card key={report.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarImage src={report.reporterPhoto || ""} />
                              <AvatarFallback>{report.reporterName?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">
                                {report.reporterName} reported {report.reportedUserName}
                              </CardTitle>
                              <CardDescription>
                                {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Dismissed
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Reason:</h4>
                          <p className="text-sm bg-muted p-3 rounded-md">{report.reason}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading suspicious users...</div>
          ) : suspiciousUsers.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No users under suspicion</p>
            </div>
          ) : (
            suspiciousUsers.map((user) => (
              <Card key={user.userId}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={user.userPhoto || ""} />
                        <AvatarFallback>{user.userName?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{user.userName}</CardTitle>
                        <CardDescription>
                          {user.isSuspended
                            ? `Suspended until ${new Date(user.suspensionEndDate || 0).toLocaleDateString()}`
                            : "Under suspicion"}
                        </CardDescription>
                      </div>
                    </div>
                    {user.isSuspended ? (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                        Suspicious
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Reports:</h4>
                      <p className="text-sm">{user.reportCount} reports</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">DM Requests:</h4>
                      <p className="text-sm">{user.dmRequestCount} total</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Request Frequency:</h4>
                      <p className="text-sm">{user.dmRequestFrequency.toFixed(1)} per day</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Previous Suspensions:</h4>
                      <p className="text-sm">{user.suspensionHistory.length}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-1">Safety Score:</h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={user.safetyScore * 100}
                        className="h-2 flex-1"
                        indicatorClassName={getSafetyScoreColor(user.safetyScore)}
                      />
                      <span className="text-sm font-medium">{Math.round(user.safetyScore * 100)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

