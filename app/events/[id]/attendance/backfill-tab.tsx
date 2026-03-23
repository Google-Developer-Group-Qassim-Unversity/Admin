"use client";

import * as React from "react";
import { ExternalLink, Loader2, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  getSheetProcessorExportUrl,
  type ExportTokenRow,
  type ExportTokenPayload,
} from "@/lib/export-token";
import { backfillAttendance } from "@/lib/api";
import type { BackfillMember } from "@/lib/api-types";
import type { BackfillSummary } from "./types";

interface BackfillTabProps {
  dayCount: number;
  selectedDay: string;
  onDayChange: (day: string) => void;
  onBackfillComplete: () => void;
  eventId: number;
  getToken: () => Promise<string | null>;
}

function transformRowToMember(row: ExportTokenRow): BackfillMember {
  return {
    name: row.name,
    email: row.email,
    phone_number: String(row["phone number"] ?? ""),
    uni_id: String(row["university id"]),
    gender: row.gender,
    uni_level: 0,
    uni_college: "UNKNOWN",
  };
}

export function BackfillTab({
  dayCount,
  selectedDay,
  onDayChange,
  onBackfillComplete,
  eventId,
  getToken,
}: BackfillTabProps) {
  const [token, setToken] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verifiedRows, setVerifiedRows] = React.useState<ExportTokenRow[] | null>(null);
  const [metadata, setMetadata] = React.useState<ExportTokenPayload["metadata"] | null>(null);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [summaryDialog, setSummaryDialog] = React.useState<BackfillSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const exportUrl = getSheetProcessorExportUrl();

  const handleVerify = async () => {
    if (!token.trim()) {
      setVerifyError("Please paste an export token");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const authToken = await getToken();
      const response = await fetch("/api/attendance/verify-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.valid) {
        setVerifyError(result.error || "Token verification failed");
        setVerifiedRows(null);
        setMetadata(null);
        setSignature(null);
      } else {
        setVerifiedRows(result.data || []);
        setMetadata(result.metadata || null);
        setSignature(result.signature || null);
        setVerifyError(null);
        toast.success(`Verified ${result.data?.length || 0} members`);
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Verification failed");
      setVerifiedRows(null);
    } finally {
      setIsVerifying(false);
    }
  };

  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  const handleSubmit = async () => {
    if (!verifiedRows || verifiedRows.length === 0) {
      toast.error("No verified data to submit");
      return;
    }

    const day = parseInt(selectedDay, 10);
    if (isNaN(day) || day < 1 || day > dayCount) {
      toast.error("Invalid day selected");
      return;
    }

    setIsSubmitting(true);

    try {
      const members = verifiedRows.map(transformRowToMember);
      const result = await backfillAttendance(eventId, members, day, getToken);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      setSummaryDialog({
        created_count: result.data.created_count,
        existing_count: result.data.existing_count,
        already_attended_count: result.data.already_attended_count,
        attendance_date: result.data.attendance_date,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backfill failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setToken("");
    setVerifiedRows(null);
    setMetadata(null);
    setSignature(null);
    setVerifyError(null);
  };

  const handleCloseSummary = () => {
    setSummaryDialog(null);
    handleReset();
    onBackfillComplete();
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Import attendance data from Sheet Processor. Get your export token from the link below,
        then paste it here to verify and submit.
      </div>

      {exportUrl && (
        <a
          href={exportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          Get Export Token
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <div className="space-y-2">
        <Label htmlFor="token">Export Token</Label>
        <Textarea
          id="token"
          placeholder="Paste your export token here..."
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setVerifyError(null);
          }}
          rows={4}
          wrap="off"
          className="overflow-x-auto whitespace-nowrap"
          disabled={isVerifying || !!verifiedRows}
        />
        {verifyError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {verifyError}
          </div>
        )}
      </div>

      {!verifiedRows ? (
        <Button onClick={handleVerify} disabled={isVerifying || !token.trim()}>
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Verify Token
            </>
          )}
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {verifiedRows.length} member{verifiedRows.length !== 1 ? "s" : ""} verified
            </span>
          </div>

          {metadata && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <span className="text-muted-foreground">Row Count</span>
                <span className="font-medium">{metadata.row_count}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <span className="text-muted-foreground">Valid</span>
                <span className={`font-medium ${metadata.valid ? "text-green-600" : "text-red-600"}`}>
                  {metadata.valid ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <span className="text-muted-foreground">Validated At</span>
                <span className="font-medium">{metadata.validated_at ? new Date(metadata.validated_at).toLocaleString() : "-"}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{metadata.source}</span>
              </div>
              {signature && (
                <div className="col-span-2 p-2 bg-muted/50 rounded-md">
                  <div className="text-muted-foreground mb-1">Signature</div>
                  <div className="font-mono text-xs break-all">{signature.slice(0, 50)}...</div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="border rounded-md max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>University ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Gender</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifiedRows.slice(0, 10).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row["university id"]}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.gender}</TableCell>
                    </TableRow>
                  ))}
                  {verifiedRows.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        ... and {verifiedRows.length - 10} more
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="space-y-1.5">
              <Label>Day</Label>
              <Select value={selectedDay} onValueChange={onDayChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Day {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
              Reset
            </Button>

            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Backfill {verifiedRows.length} Member{verifiedRows.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!summaryDialog} onOpenChange={() => summaryDialog && handleCloseSummary()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Backfill Complete</DialogTitle>
            <DialogDescription>
              Attendance has been recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
              <span className="text-muted-foreground">New Members Created</span>
              <span className="font-semibold text-green-600">{summaryDialog?.created_count ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
              <span className="text-muted-foreground">Existing Members Added</span>
              <span className="font-semibold">{summaryDialog?.existing_count ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
              <span className="text-muted-foreground">Skipped (Already Attended)</span>
              <span className="font-semibold text-amber-600">{summaryDialog?.already_attended_count ?? 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-md">
              <span className="text-muted-foreground">Attendance Date</span>
              <span className="font-semibold">{summaryDialog ? formatDate(summaryDialog.attendance_date) : "-"}</span>
            </div>
          </div>
          <Button onClick={handleCloseSummary} className="w-full">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}