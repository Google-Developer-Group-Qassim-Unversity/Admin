"use client";

import * as React from "react";
import { AlertCircle, CalendarPlus, CalendarRange, CheckCircle2, EyeOff, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SemesterDialog } from "@/components/manage-semesters/semester-dialog";
import { useCreateSemester, useDeleteSemester, useSemesters, useUpdateSemester } from "@/hooks/use-semesters";
import type { Semester, SemesterInput } from "@/lib/api-types";
import { useTranslations } from "next-intl";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function formatDate(isoDate: string) {
  // The API sends plain YYYY-MM-DD; parsing as UTC keeps the day from shifting in negative offsets.
  return DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

export default function ManageSemestersPage() {
  const t = useTranslations("semestersPage");
  const tc = useTranslations("common.actions");
  const { data: semesters, isLoading, error } = useSemesters();
  const createSemester = useCreateSemester();
  const updateSemester = useUpdateSemester();
  const deleteSemester = useDeleteSemester();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Semester | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Semester | null>(null);

  const rows = semesters ?? [];
  const isSaving = createSemester.isPending || updateSemester.isPending;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (semester: Semester) => {
    setEditing(semester);
    setDialogOpen(true);
  };

  const handleSubmit = async (payload: SemesterInput) => {
    try {
      const saved = editing
        ? await updateSemester.mutateAsync({ id: editing.id, payload })
        : await createSemester.mutateAsync(payload);
      toast.success(t(editing ? "semesterUpdated" : "semesterAdded", { name: saved.name }));
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSemester.mutateAsync(pendingDelete.id);
      toast.success(t("semesterDeleted", { name: pendingDelete.name }));
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteFailed"));
    }
  };

  const renderBadges = (semester: Semester) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {semester.is_current && (
        <Badge variant="secondary" className="bg-brand-green-soft text-brand-green-ink gap-1 border-transparent">
          <CheckCircle2 className="h-3 w-3" />
          {t("current")}
        </Badge>
      )}
      {!semester.is_public && (
        <Badge variant="outline" className="gap-1">
          <EyeOff className="h-3 w-3" />
          {t("private")}
        </Badge>
      )}
    </div>
  );

  const renderActions = (semester: Semester) => (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(semester)} title={t("edit")}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">{t("editSr", { name: semester.name })}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setPendingDelete(semester)}
        title={t("delete")}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
        <span className="sr-only">{t("deleteSr", { name: semester.name })}</span>
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={CalendarRange}>
        <Button onClick={openAdd}>
          <CalendarPlus className="h-4 w-4" />
          {t("addSemester")}
        </Button>
      </PageHeader>

      {isLoading && <Skeleton className="h-[240px] w-full" />}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("loadFailed")}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>{t("allSemesters")}</CardTitle>
            <CardDescription>
              {t("countDescription", { count: rows.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t("noneYet")}
              </p>
            ) : (
              <>
              {/* Phones: one row per semester - name, codes and dates, badges, actions. */}
              <ul className="divide-border -mx-4 divide-y md:hidden">
                {rows.map((semester) => (
                  <li key={semester.id} className="flex items-start gap-3 px-4 py-3.5">
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="font-semibold" dir="auto">
                        {semester.name}
                      </span>
                      <span className="text-muted-foreground tabular text-[13px]">
                        {semester.hijri_code} · {semester.gregorian_code}
                      </span>
                      <span className="text-muted-foreground tabular text-[13px]">
                        {formatDate(semester.start_date)} – {formatDate(semester.end_date)}
                      </span>
                      {renderBadges(semester)}
                    </div>
                    {renderActions(semester)}
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("columnName")}</TableHead>
                      <TableHead>{t("columnHijriCode")}</TableHead>
                      <TableHead>{t("columnGregorianCode")}</TableHead>
                      <TableHead>{t("columnStarts")}</TableHead>
                      <TableHead>{t("columnEnds")}</TableHead>
                      <TableHead>{t("columnStatus")}</TableHead>
                      <TableHead className="text-end">{t("columnActions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((semester) => (
                      <TableRow key={semester.id}>
                        <TableCell className="font-medium">{semester.name}</TableCell>
                        <TableCell>{semester.hijri_code}</TableCell>
                        <TableCell>{semester.gregorian_code}</TableCell>
                        <TableCell>{formatDate(semester.start_date)}</TableCell>
                        <TableCell>{formatDate(semester.end_date)}</TableCell>
                        <TableCell>
                          {renderBadges(semester)}
                        </TableCell>
                        <TableCell>
                          {renderActions(semester)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <SemesterDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        semester={editing}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle", { name: pendingDelete?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSemester.isPending}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteSemester.isPending}>
              {deleteSemester.isPending ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
