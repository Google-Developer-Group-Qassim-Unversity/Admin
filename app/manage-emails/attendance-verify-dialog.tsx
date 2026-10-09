"use client";

import * as React from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { SOFT } from "@/components/najdi";

import type { CsvRow } from "./types";

interface AttendanceVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unverifiedRows: CsvRow[];
  onAllow: (index: number) => void;
  onDeny: (index: number) => void;
}

export function AttendanceVerifyDialog({
  open,
  onOpenChange,
  unverifiedRows,
  onAllow,
  onDeny,
}: AttendanceVerifyDialogProps) {
  const t = useTranslations("manageEmails.attendanceVerify");
  const tf = useTranslations("common.fields");
  const tc = useTranslations("common.actions");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[80vh] sm:max-w-3xl">
        <DialogHeader className="px-5 pt-7 pb-3 sm:p-6 sm:pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <span className="bg-door-ochre-soft text-door-ochre-ink flex size-8 shrink-0 items-center justify-center rounded-sm">
              <AlertCircle className="h-4 w-4" />
            </span>
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        {/* Phone: one card per student with labelled Deny / Allow buttons. */}
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain border-t sm:hidden">
          {unverifiedRows.map((row, i) => (
            <li key={i} className="space-y-2 px-5 py-3">
              <div className="min-w-0">
                <p dir="auto" className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-muted-foreground truncate text-[13px]">
                  {row.email}
                  {row.uniId && (
                    <>
                      {" · "}
                      <span className="tabular">{row.uniId}</span>
                    </>
                  )}
                </p>
              </div>
              <span
                dir="auto"
                className={`inline-flex max-w-full rounded-sm px-2.5 py-0.5 text-xs font-medium ${SOFT.ochre}`}
              >
                <span className="truncate">{row.eventName}</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="text-destructive" onClick={() => onDeny(i)}>
                  <X className="h-4 w-4" />
                  {t("deny")}
                </Button>
                <Button
                  variant="outline"
                  className="text-door-green-ink"
                  onClick={() => {
                    onAllow(i);
                    toast.success(t("allowedToast", { name: unverifiedRows[i].name }));
                  }}
                >
                  <Check className="h-4 w-4" />
                  {t("allow")}
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="hidden flex-1 overflow-auto px-6 py-2 sm:block">
          <Table>
            <TableHeader className="bg-sunk sticky top-0 z-10">
              <TableRow className="h-10">
                <TableHead className="text-xs font-semibold py-0">{t("studentName")}</TableHead>
                <TableHead className="text-xs font-semibold py-0">{t("claimedEvent")}</TableHead>
                <TableHead className="w-24 text-end py-0 px-4">{tf("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unverifiedRows.map((row, i) => (
                <TableRow key={i} className="h-12 border-b border-border/50">
                  <TableCell className="py-2">
                    <div dir="auto" className="font-medium text-sm">{row.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{row.email}</span>
                      {row.uniId && (
                        <>
                          <span className="text-border">&bull;</span>
                          <span className="tabular font-mono">{row.uniId}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" dir="auto" className={`text-[11px] border-transparent ${SOFT.ochre}`}>
                      {row.eventName}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => onDeny(i)}
                        title={t("deny")}
                        aria-label={t("deny")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-door-green-ink hover:bg-door-green-soft"
                        onClick={() => {
                          onAllow(i);
                          toast.success(t("allowedToast", { name: unverifiedRows[i].name }));
                        }}
                        title={t("allow")}
                        aria-label={t("allow")}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="border-t bg-sunk px-5 py-3 sm:p-6 sm:pt-3">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <span className="tabular font-bold text-foreground">{unverifiedRows.length}</span> {t("remaining")}
            </div>
            <Button className="w-auto shrink-0" onClick={() => onOpenChange(false)}>
              {tc("done")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
