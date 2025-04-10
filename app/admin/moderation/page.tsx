"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, AlertTriangle, CheckCircle, Search, Filter } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { getModerationLogs, updateModerationLog } from "@/lib/ai-moderation"
import { formatDistanceToNow } from "date-fns"

// Admin user IDs - replace with your actual admin user IDs
const ADMIN_USER_IDS = ["your-admin-user-id-1", "your-admin-user-id-2"]

interface ModerationLog {
  id: string
  content: string
  result: {
    isSafe: boolean
    category: string
    confidence: number
    explanation: string
  }
  timestamp: number
  reviewed: boolean
  reviewedAt?: number
  actionTaken: boolean
  notes?: string
}

export default function ModerationPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [logs, setLogs] = useState<ModerationLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ModerationLog[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [processingLogId, setProcessingLogId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    // Check if user is admin
    if (user && !ADMIN_USER_IDS.includes(user.uid)) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this page.",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    const fetchLogs = async () => {
      try {
        const moderationLogs = await getModerationLogs(100)
        setLogs(moderationLogs)
        setFilteredLogs(moderationLogs)
      } catch (error) {
        console.error("Error fetching moderation logs:", error)
        toast({
          title: "Error",
          description: "Failed to load moderation logs. Please try again.",
          variant: "destructive",
        })
      } finally {
        setPageLoading(false)
      }
    }

    if (user && ADMIN_USER_IDS.includes(user.uid)) {
      fetchLogs()
    }
  }, [user, loading, router, toast])

  useEffect(() => {
    // Filter logs based on search query and active tab
    let filtered = logs

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.result.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.result.explanation.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply tab filter
    if (activeTab === "pending") {
      filtered = filtered.filter((log) => !log.reviewed)
    } else if (activeTab === "reviewed") {
      filtered = filtered.filter((log) => log.reviewed)
    } else if (activeTab === "action-taken") {
      filtered = filtered.filter((log) => log.actionTaken)
    }

    setFilteredLogs(filtered)
  }, [logs, searchQuery, activeTab])

  const handleUpdateLog = async (
    logId: string,
    updates: { reviewed?: boolean; actionTaken?: boolean; notes?: string },
  ) => {
    setProcessingLogId(logId)

    try {
      await updateModerationLog(logId, updates)

      // Update local state
      setLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.id === logId
            ? {
                ...log,
                ...updates,
                reviewedAt: updates.reviewed ? Date.now() : log.reviewedAt,
              }
            : log,
        ),
      )

      toast({
        title: "Log Updated",
        description: "The moderation log has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating moderation log:", error)
      toast({
        title: "Error",
        description: "Failed to update moderation log. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingLogId(null)
    }
  }

  if (pageLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Loading moderation logs...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Content Moderation</h1>
            <p className="text-muted-foreground">Review and manage flagged content</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-9 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Logs</TabsTrigger>
            <TabsTrigger value="pending">Pending Review</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
            <TabsTrigger value="action-taken">Action Taken</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No logs found</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {searchQuery
                      ? "No moderation logs match your search criteria."
                      : activeTab === "pending"
                        ? "There are no pending moderation logs to review."
                        : activeTab === "reviewed"
                          ? "No logs have been reviewed yet."
                          : activeTab === "action-taken"
                            ? "No action has been taken on any logs yet."
                            : "There are no moderation logs available."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredLogs.map((log) => (
                  <Card
                    key={log.id}
                    className={log.reviewed ? "border-l-4 border-l-green-500" : "border-l-4 border-l-yellow-500"}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Badge variant={log.result.category === "safe" ? "outline" : "destructive"}>
                              {log.result.category.replace("_", " ")}
                            </Badge>
                            <span className="text-sm font-normal text-muted-foreground">
                              Confidence: {Math.round(log.result.confidence * 100)}%
                            </span>
                          </CardTitle>
                          <CardDescription>
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            {log.reviewed && log.reviewedAt && (
                              <> • Reviewed {formatDistanceToNow(new Date(log.reviewedAt), { addSuffix: true })}</>
                            )}
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2">
                          {log.reviewed ? (
                            <Badge variant="outline" className="flex items-center gap-1 bg-green-500/10">
                              <CheckCircle className="h-3 w-3" />
                              Reviewed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1 bg-yellow-500/10">
                              <AlertTriangle className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}

                          {log.actionTaken && (
                            <Badge variant="outline" className="bg-blue-500/10">
                              Action Taken
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Flagged Content</h4>
                          <div className="p-3 bg-muted rounded-md">
                            <p className="whitespace-pre-line">{log.content}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium mb-1">Explanation</h4>
                          <p className="text-sm text-muted-foreground">{log.result.explanation}</p>
                        </div>

                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Review Notes</h4>
                          <Textarea
                            placeholder="Add notes about this content..."
                            className="resize-none"
                            rows={2}
                            value={log.notes || ""}
                            onChange={(e) => {
                              // Update local state immediately for better UX
                              setLogs((prevLogs) =>
                                prevLogs.map((l) => (l.id === log.id ? { ...l, notes: e.target.value } : l)),
                              )
                            }}
                            onBlur={(e) => {
                              if (e.target.value !== log.notes) {
                                handleUpdateLog(log.id, { notes: e.target.value })
                              }
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`action-taken-${log.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            id={`action-taken-${log.id}`}
                            checked={log.actionTaken}
                            onCheckedChange={(checked) => handleUpdateLog(log.id, { actionTaken: checked })}
                            disabled={processingLogId === log.id}
                          />
                          Action Taken
                        </Label>
                      </div>

                      {!log.reviewed && (
                        <Button
                          onClick={() => handleUpdateLog(log.id, { reviewed: true })}
                          disabled={processingLogId === log.id}
                        >
                          {processingLogId === log.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Reviewed
                            </>
                          )}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

