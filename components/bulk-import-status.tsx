"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Clock, FileSpreadsheet, RefreshCw } from "lucide-react"

interface ImportJob {
  id: string
  url: string
  description: string
  status: "pending" | "processing" | "completed" | "failed"
  progress: number
  created_at: string
  completed_at?: string
  total_records?: number
  processed_records?: number
  error_message?: string
}

export function BulkImportStatus() {
  const [importJobs, setImportJobs] = useState<ImportJob[]>([
    {
      id: "1",
      url: "https://docs.google.com/spreadsheets/d/example1",
      description: "January Workshop Attendance",
      status: "completed",
      progress: 100,
      created_at: "2024-01-15T10:30:00Z",
      completed_at: "2024-01-15T10:35:00Z",
      total_records: 45,
      processed_records: 45,
    },
    {
      id: "2",
      url: "https://docs.google.com/spreadsheets/d/example2",
      description: "Team Building Event",
      status: "processing",
      progress: 65,
      created_at: "2024-01-16T14:20:00Z",
      total_records: 120,
      processed_records: 78,
    },
    {
      id: "3",
      url: "https://docs.google.com/spreadsheets/d/example3",
      description: "Training Session Batch",
      status: "failed",
      progress: 0,
      created_at: "2024-01-16T16:45:00Z",
      error_message: "Unable to access Google Sheet. Please check permissions.",
    },
  ])

  const [loading, setLoading] = useState(false)

  const refreshStatus = async () => {
    setLoading(true)
    // Simulate API call to refresh import job statuses
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setLoading(false)
  }

  const getStatusIcon = (status: ImportJob["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "processing":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: ImportJob["status"]) => {
    const variants = {
      completed: "default",
      failed: "destructive",
      processing: "secondary",
      pending: "outline",
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 font-playfair">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Status
            </CardTitle>
            <CardDescription>Track the progress of your bulk import jobs</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {importJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No import jobs found</p>
              <p className="text-sm">Start a bulk import to see the status here</p>
            </div>
          ) : (
            importJobs.map((job) => (
              <div key={job.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className="font-medium">{job.description || "Untitled Import"}</span>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className="text-sm text-muted-foreground">
                  <p className="truncate">URL: {job.url}</p>
                  <p>Started: {new Date(job.created_at).toLocaleString()}</p>
                  {job.completed_at && <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>}
                </div>

                {job.status === "processing" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {job.processed_records}/{job.total_records} records
                      </span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>
                )}

                {job.status === "completed" && job.total_records && (
                  <div className="text-sm text-green-600">✓ Successfully processed {job.total_records} records</div>
                )}

                {job.status === "failed" && job.error_message && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Error: {job.error_message}</div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
