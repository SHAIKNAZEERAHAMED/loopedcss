"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { reportUserForDMs } from "@/lib/dm-safety-service"
import { useToast } from "@/components/ui/use-toast"
import { AlertTriangle, Flag, Loader2 } from "lucide-react"

interface ReportDMDialogProps {
  reporterId: string
  reportedUserId: string
  reportedUserName: string
  messageIds?: string[]
  trigger?: React.ReactNode
}

export function ReportDMDialog({
  reporterId,
  reportedUserId,
  reportedUserName,
  messageIds = [],
  trigger,
}: ReportDMDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>("unwanted_contact")
  const [details, setDetails] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!reporterId || !reportedUserId) return

    setIsSubmitting(true)

    try {
      await reportUserForDMs(reporterId, reportedUserId, `${reason}: ${details}`, { messageIds })

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe.",
      })

      setOpen(false)
      setReason("unwanted_contact")
      setDetails("")
    } catch (error) {
      console.error("Error submitting report:", error)

      toast({
        title: "Error submitting report",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-red-500">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Report {reportedUserName}
          </DialogTitle>
          <DialogDescription>
            Help us understand what's happening with this conversation. Your report will be kept confidential.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What's the issue?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unwanted_contact" id="unwanted" />
                <Label htmlFor="unwanted">Unwanted contact/messages</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment">Harassment or bullying</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate" id="inappropriate" />
                <Label htmlFor="inappropriate">Inappropriate content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">Spam or scam</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Additional details</Label>
            <Textarea
              id="details"
              placeholder="Please provide any additional information that might help us understand the situation."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

