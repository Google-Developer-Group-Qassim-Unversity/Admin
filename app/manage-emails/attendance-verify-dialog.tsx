"use client";

import * as React from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { toast } from "sonner";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl text-amber-600 dark:text-amber-500">
            <AlertCircle className="h-5 w-5" />
            Attendance Verification
          </DialogTitle>
          <DialogDescription className="text-sm">
            The following students were not found in the official event submission list. Would you like to allow them anyway?
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-2">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow className="h-10">
                <TableHead className="text-[10px] uppercase font-bold py-0">Student Name</TableHead>
                <TableHead className="text-[10px] uppercase font-bold py-0">Claimed Event</TableHead>
                <TableHead className="w-24 text-right py-0 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unverifiedRows.map((row, i) => (
                <TableRow key={i} className="h-12 border-b border-border/50">
                  <TableCell className="py-2">
                    <div className="font-medium text-sm">{row.name}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>{row.email}</span>
                      {row.uniId && (
                        <>
                          <span className="text-border">&bull;</span>
                          <span className="font-mono text-amber-600/80 dark:text-amber-500/80">{row.uniId}</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                      {row.eventName}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeny(i)}
                        title="Deny"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-600/10"
                        onClick={() => {
                          onAllow(i);
                          toast.success(`Allowed: ${unverifiedRows[i].name}`);
                        }}
                        title="Allow"
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

        <DialogFooter className="p-6 pt-2 border-t bg-muted/30">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{unverifiedRows.length}</span> unverified students remaining
            </div>
            <Button onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
