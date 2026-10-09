"use client";

import * as React from "react";
import { ExternalLink, Loader2, Upload, CheckCircle } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { config } from "@/lib/config";

import {
  type ExportTokenRow,
  type ExportTokenPayload,
} from "@/lib/export-token";
import { useAuth } from "@clerk/nextjs";
import { useApi } from "@/lib/api/client";
import type { BackfillMember } from "@/lib/api-types";
import type { BackfillSummary } from "./types";
import { useTranslations } from "next-intl";

interface BackfillTabProps {
  dayCount: number;
  selectedDay: string;
  onDayChange: (day: string) => void;
  onBackfillComplete: () => void;
  eventId: number;
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
}: BackfillTabProps) {
  const t = useTranslations("attendance.backfill");
  const api = useApi();
  // The verify-token route below needs the raw bearer token, not a request.
  const { getToken } = useAuth();
  const [token, setToken] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verifiedRows, setVerifiedRows] = React.useState<
    ExportTokenRow[] | null
  >(null);
  const [metadata, setMetadata] = React.useState<
    ExportTokenPayload["metadata"] | null
  >(null);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [summaryDialog, setSummaryDialog] =
    React.useState<BackfillSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isValidData = metadata?.valid === true;

  const handleVerify = async () => {
    if (!token.trim()) {
      setVerifyError(t("pasteTokenFirst"));
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

      if (result.metadata) {
        setVerifiedRows(result.data || []);
        setMetadata(result.metadata || null);
        setSignature(result.signature || null);
      }

      if (!response.ok || !result.valid) {
        setVerifyError(result.error || t("tokenVerificationFailed"));
        if (!result.metadata) {
          setVerifiedRows(null);
          setMetadata(null);
          setSignature(null);
        }
      } else {
        setVerifyError(null);
        toast.success(t("verifiedCount", { count: result.data?.length || 0 }));
      }
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : t("verificationFailed"),
      );
      setVerifiedRows(null);
      setMetadata(null);
      setSignature(null);
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
      toast.error(t("noVerifiedData"));
      return;
    }

    const day = parseInt(selectedDay, 10);
    if (isNaN(day) || day < 1 || day > dayCount) {
      toast.error(t("invalidDaySelected"));
      return;
    }

    setIsSubmitting(true);

    try {
      const members = verifiedRows.map(transformRowToMember);
      const summary = await api.attendance.backfill(eventId, members, day);

      setSummaryDialog({
        created_count: summary.created_count,
        existing_count: summary.existing_count,
        marked_count: summary.marked_count,
        already_attended_count: summary.already_attended_count,
        attendance_date: summary.attendance_date,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("backfillFailed"));
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

  const isVerified = metadata !== null;

  return (
    <div className="space-y-4 px-1 pb-1">
      <p className="text-sm text-ink-2">
        {t("intro")}
      </p>

      <a
        href={config.sheetProcessorUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-door-indigo-ink inline-flex items-center gap-1.5 text-sm font-bold hover:underline"
      >
        {t("getExportToken")}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      <div className="space-y-2">
        <Label htmlFor="token">{t("exportTokenLabel")}</Label>
        <Textarea
          id="token"
          placeholder={t("exportTokenPlaceholder")}
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setVerifyError(null);
          }}
          rows={4}
          wrap="off"
          className="overflow-x-auto whitespace-nowrap font-mono text-xs"
          disabled={isVerifying || isVerified}
        />
        {verifyError && !isVerified && (
          <Alert variant="destructive">
            <AlertDescription>{verifyError}</AlertDescription>
          </Alert>
        )}
      </div>

      {!isVerified ? (
        <Button onClick={handleVerify} disabled={isVerifying || !token.trim()} className="w-full sm:w-auto">
          {isVerifying ? (
            <>
              <Loader2 className="animate-spin" />
              {t("verifying")}
            </>
          ) : (
            <>
              <CheckCircle />
              {t("verifyToken")}
            </>
          )}
        </Button>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("tokenMetadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between items-center">
                  <span className="text-ink-2">{t("rowCount")}</span>
                  <span className="tabular font-medium">
                    {metadata?.row_count ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-2">{t("valid")}</span>
                  <Badge
                    className={
                      isValidData
                        ? "border-transparent bg-door-green-soft text-door-green-ink"
                        : ""
                    }
                    variant={isValidData ? "outline" : "destructive"}
                  >
                    {isValidData ? t("yes") : t("no")}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-2">{t("validatedAt")}</span>
                  <span className="font-medium">
                    {metadata?.validated_at
                      ? new Date(metadata.validated_at).toLocaleString()
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-2">{t("source")}</span>
                  <span className="font-medium">{metadata?.source ?? "-"}</span>
                </div>
              </div>
              {signature && (
                <div className="pt-2 border-t">
                  <div className="text-ink-2 text-sm mb-1">
                    {t("signature")}
                  </div>
                  <div className="font-mono text-xs text-ink-2 break-all">
                    {signature}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!isValidData && (
            <Alert variant="destructive">
              <AlertTitle>{t("invalidDataTitle")}</AlertTitle>
              <AlertDescription>
                {t("invalidDataDescription")}
              </AlertDescription>
            </Alert>
          )}

          {isValidData && verifiedRows && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>
                  {t("preview", { count: verifiedRows.length })}
                </Label>
                <ul className="max-h-60 divide-y overflow-y-auto overscroll-contain rounded-lg border sm:hidden">
                  {verifiedRows.slice(0, 50).map((row, idx) => (
                    <li key={idx} className="px-3 py-2">
                      <p className="truncate text-sm font-medium"><bdi>{row.name}</bdi></p>
                      <p className="truncate text-[13px] text-ink-2">
                        <span className="tabular" dir="ltr">{row["university id"]}</span>
                        {" · "}
                        <span dir="ltr">{row.email}</span>
                      </p>
                    </li>
                  ))}
                  {verifiedRows.length > 50 && (
                    <li className="px-3 py-2 text-center text-[13px] text-ink-2">
                      {t("andMore", { count: verifiedRows.length - 50 })}
                    </li>
                  )}
                </ul>
                <Card className="hidden overflow-hidden p-0 sm:flex">
                  <ScrollArea className="h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("columnName")}</TableHead>
                          <TableHead>{t("columnUniversityId")}</TableHead>
                          <TableHead>{t("columnEmail")}</TableHead>
                          <TableHead>{t("columnGender")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {verifiedRows.slice(0, 50).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {row.name}
                            </TableCell>
                            <TableCell>{row["university id"]}</TableCell>
                            <TableCell>{row.email}</TableCell>
                            <TableCell>{row.gender}</TableCell>
                          </TableRow>
                        ))}
                        {verifiedRows.length > 50 && (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-ink-2"
                            >
                              {t("andMore", { count: verifiedRows.length - 50 })}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
              <Separator />
            </>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-ink-2">{t("dayLabel")}</Label>
              <Select value={selectedDay} onValueChange={onDayChange}>
                <SelectTrigger className="flex-1 sm:w-24 sm:flex-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: dayCount }, (_, i) => i + 1).map(
                    (day) => (
                      <SelectItem key={day} value={String(day)}>
                        {t("day", { number: day })}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden flex-1 sm:block" />

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSubmitting}
              className="order-last sm:order-none"
            >
              {t("reset")}
            </Button>

            {isValidData && (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="whitespace-normal">
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    <Upload />
                    {t("backfillButton", { count: verifiedRows?.length ?? 0, day: selectedDay })}
                  </>
                )}
              </Button>
            )}
          </div>
        </>
      )}

      <Dialog
        open={!!summaryDialog}
        onOpenChange={() => summaryDialog && handleCloseSummary()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("completeTitle")}</DialogTitle>
            <DialogDescription>
              {t("completeDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("members")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-ink-2">
                      {t("created")}
                    </span>
                    <Badge className="tabular border-transparent bg-door-green-soft text-door-green-ink">
                      {summaryDialog?.created_count ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-ink-2">{t("found")}</span>
                    <span className="font-medium">
                      {summaryDialog?.existing_count ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("attendance")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-ink-2">
                      {t("marked")}
                    </span>
                    <Badge className="tabular border-transparent bg-door-green-soft text-door-green-ink">
                      {summaryDialog?.marked_count ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-ink-2">
                      {t("skipped")}
                    </span>
                    <Badge className="tabular border-transparent bg-door-ochre-soft text-door-ochre-ink">
                      {summaryDialog?.already_attended_count ?? 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between items-center p-3 bg-sunk rounded-md">
              <span className="text-sm text-ink-2">{t("date")}</span>
              <span className="font-medium text-sm">
                {summaryDialog
                  ? formatDate(summaryDialog.attendance_date)
                  : "-"}
              </span>
            </div>
          </div>
          <Button onClick={handleCloseSummary} className="w-full">
            {t("done")}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
