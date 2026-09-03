"use client";

import * as React from "react";
import { ExternalLink, Loader2, Upload, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { useBatchCreateMembers } from "@/hooks/use-members";
import type { BatchCreateMemberItem, Gender } from "@/lib/api-types";
import { useTranslations } from "next-intl";

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  getToken: () => Promise<string | null>;
}

function transformRowToMember(row: ExportTokenRow): BatchCreateMemberItem {
  return {
    name: row.name,
    email: row.email,
    phone_number: String(row["phone number"] ?? ""),
    uni_id: String(row["university id"]),
    gender: row.gender as Gender,
  };
}

interface BatchSummary {
  created_count: number;
  existing_count: number;
  failed_count: number;
}

export function BatchImportDialog({
  open,
  onOpenChange,
  onSuccess,
  getToken,
}: BatchImportDialogProps) {
  const t = useTranslations("batchImport");
  const tb = useTranslations("attendance.backfill");
  const batchMutation = useBatchCreateMembers(getToken);

  const [token, setToken] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const [verifiedRows, setVerifiedRows] = React.useState<ExportTokenRow[] | null>(null);
  const [metadata, setMetadata] = React.useState<ExportTokenPayload["metadata"] | null>(null);
  const [signature, setSignature] = React.useState<string | null>(null);
  const [summaryDialog, setSummaryDialog] = React.useState<BatchSummary | null>(null);

  const isValidData = metadata?.valid === true;
  const isVerified = metadata !== null;

  const handleVerify = async () => {
    if (!token.trim()) {
      setVerifyError(tb("pasteTokenFirst"));
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
        setVerifyError(result.error || tb("tokenVerificationFailed"));
        if (!result.metadata) {
          setVerifiedRows(null);
          setMetadata(null);
          setSignature(null);
        }
      } else {
        setVerifyError(null);
        toast.success(tb("verifiedCount", { count: result.data?.length || 0 }));
      }
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : tb("verificationFailed"));
      setVerifiedRows(null);
      setMetadata(null);
      setSignature(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!verifiedRows || verifiedRows.length === 0) {
      toast.error(tb("noVerifiedData"));
      return;
    }

    const members = verifiedRows.map(transformRowToMember);

    batchMutation.mutate(members, {
      onSuccess: (result) => {
        setSummaryDialog({
          created_count: result.created_count,
          existing_count: result.existing_count,
          failed_count: result.failed_count,
        });
      },
      onError: (error) => {
        toast.error(error.message || t("batchFailed"));
      },
    });
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
    onSuccess();
  };

  return (
    <>
      <Dialog open={open && !summaryDialog} onOpenChange={(newOpen) => {
        if (!newOpen) handleReset();
        onOpenChange(newOpen);
      }}>
        <DialogContent className="max-w-3xl! flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-1 space-y-4">
            <a
              href={config.sheetProcessorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {tb("getExportToken")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <div className="space-y-2">
              <Label htmlFor="batch-token">{tb("exportTokenLabel")}</Label>
              <Textarea
                id="batch-token"
                placeholder={tb("exportTokenPlaceholder")}
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
              <Button onClick={handleVerify} disabled={isVerifying || !token.trim()}>
                {isVerifying ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {tb("verifying")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="me-2 h-4 w-4" />
                    {tb("verifyToken")}
                  </>
                )}
              </Button>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{tb("tokenMetadata")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{tb("rowCount")}</span>
                        <span className="font-medium">{metadata?.row_count ?? "-"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{tb("valid")}</span>
                        <Badge
                          className={
                            isValidData
                              ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                              : ""
                          }
                          variant={isValidData ? "outline" : "destructive"}
                        >
                          {isValidData ? tb("yes") : tb("no")}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{tb("validatedAt")}</span>
                        <span className="font-medium">
                          {metadata?.validated_at
                            ? new Date(metadata.validated_at).toLocaleString()
                            : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{tb("source")}</span>
                        <span className="font-medium">{metadata?.source ?? "-"}</span>
                      </div>
                    </div>
                    {signature && (
                      <div className="pt-2 border-t">
                        <div className="text-muted-foreground text-sm mb-1">{tb("signature")}</div>
                        <div className="font-mono text-xs text-muted-foreground break-all">
                          {signature}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!isValidData && (
                  <Alert variant="destructive">
                    <AlertTitle>{tb("invalidDataTitle")}</AlertTitle>
                    <AlertDescription>
                      {tb("invalidDataDescription")}
                    </AlertDescription>
                  </Alert>
                )}

                {isValidData && verifiedRows && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>
                        {tb("preview", { count: verifiedRows.length })}
                      </Label>
                      <Card className="p-0 overflow-hidden">
                        <ScrollArea className="h-48">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{tb("columnName")}</TableHead>
                                <TableHead>{tb("columnUniversityId")}</TableHead>
                                <TableHead>{tb("columnEmail")}</TableHead>
                                <TableHead>{tb("columnGender")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {verifiedRows.slice(0, 50).map((row, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{row.name}</TableCell>
                                  <TableCell>{row["university id"]}</TableCell>
                                  <TableCell>{row.email}</TableCell>
                                  <TableCell>{row.gender}</TableCell>
                                </TableRow>
                              ))}
                              {verifiedRows.length > 50 && (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    {tb("andMore", { count: verifiedRows.length - 50 })}
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
              </>
            )}
          </div>

          {isVerified && (
            <div className="flex items-center gap-3 pt-4 border-t shrink-0">
              <div className="flex-1" />
              <Button variant="outline" onClick={handleReset} disabled={batchMutation.isPending}>
                {tb("reset")}
              </Button>
              {isValidData && (
                <Button onClick={handleSubmit} disabled={batchMutation.isPending}>
                  {batchMutation.isPending ? (
                    <>
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                      {t("importing")}
                    </>
                  ) : (
                    <>
                      <Upload className="me-2 h-4 w-4" />
                      {t("importButton", { count: verifiedRows?.length ?? 0 })}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <CardTitle className="text-sm">{tb("members")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{tb("created")}</span>
                    <Badge className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                      {summaryDialog?.created_count ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t("existing")}</span>
                    <span className="font-medium">{summaryDialog?.existing_count ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            {(summaryDialog?.failed_count ?? 0) > 0 && (
              <Alert variant="destructive">
                <AlertTitle>{t("someFailedTitle")}</AlertTitle>
                <AlertDescription>
                  {t("someFailedDescription", { count: summaryDialog?.failed_count ?? 0 })}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <Button onClick={handleCloseSummary} className="w-full">
            {tb("done")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}