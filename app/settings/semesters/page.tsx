"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, AlertTriangle, CalendarPlus, CheckCircle2, EyeOff, Pencil, Star, Trash2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SemesterDialog, type SemesterFormValues } from "@/components/manage-semesters/semester-dialog";
import {
  useCreateSemester,
  useDeleteSemester,
  useSemesters,
  useSetCurrentSemester,
  useUpdateSemester,
} from "@/hooks/use-semesters";
import type { Semester } from "@/lib/api-types";
import { useTranslations } from "next-intl";

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function formatDate(isoDate: string) {
  // The API sends plain YYYY-MM-DD; parsing as UTC keeps the day from shifting in negative offsets.
  return DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

/** Semesters whose date ranges intersect - their events would be counted twice. */
function findOverlappingIds(semesters: Semester[]): Set<number> {
  const overlapping = new Set<number>();
  for (let i = 0; i < semesters.length; i++) {
    for (let j = i + 1; j < semesters.length; j++) {
      const a = semesters[i];
      const b = semesters[j];
      if (a.start_date <= b.end_date && b.start_date <= a.end_date) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }
  return overlapping;
}

export default function ManageSemestersPage() {
  const t = useTranslations("semestersPage");
  const tc = useTranslations("common.actions");
  const { getToken } = useAuth();

  const { data: semesters, isLoading, error } = useSemesters(getToken);
  const createSemester = useCreateSemester(getToken);
  const updateSemester = useUpdateSemester(getToken);
  const setCurrent = useSetCurrentSemester(getToken);
  const deleteSemester = useDeleteSemester(getToken);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Semester | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Semester | null>(null);

  const rows = semesters ?? [];
  const overlappingIds = findOverlappingIds(rows);
  const isSaving = createSemester.isPending || updateSemester.isPending;

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (semester: Semester) => {
    setEditing(semester);
    setDialogOpen(true);
  };

  const handleSubmit = async (values: SemesterFormValues) => {
    try {
      if (editing) {
        await updateSemester.mutateAsync({
          id: editing.id,
          payload: {
            name: values.name.trim() || null,
            start_date: values.start_date,
            end_date: values.end_date,
            is_public: values.is_public,
          },
        });
        toast.success(t("semesterUpdated", { id: editing.id }));
      } else {
        await createSemester.mutateAsync({
          id: values.id,
          name: values.name.trim() || null,
          start_date: values.start_date,
          end_date: values.end_date,
          is_public: values.is_public,
          is_current: values.is_current,
        });
        toast.success(t("semesterAdded", { id: values.id }));
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const handleSetCurrent = async (semester: Semester) => {
    try {
      await setCurrent.mutateAsync(semester.id);
      toast.success(t("nowDefault", { id: semester.id }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("setCurrentFailed"));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSemester.mutateAsync(pendingDelete.id);
      toast.success(t("semesterDeleted", { id: pendingDelete.id }));
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteFailed"));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <Button onClick={openAdd}>
          <CalendarPlus className="h-4 w-4 me-2" />
          {t("addSemester")}
        </Button>
      </div>

      {isLoading && <Skeleton className="h-[240px] w-full" />}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("loadFailed")}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && overlappingIds.size > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("overlappingTitle")}</AlertTitle>
          <AlertDescription>
            {t("overlappingDescription", { ids: [...overlappingIds].join(", ") })}
          </AlertDescription>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("columnCode")}</TableHead>
                      <TableHead>{t("columnLabel")}</TableHead>
                      <TableHead>{t("columnStarts")}</TableHead>
                      <TableHead>{t("columnEnds")}</TableHead>
                      <TableHead>{t("columnStatus")}</TableHead>
                      <TableHead className="text-end">{t("columnActions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((semester) => (
                      <TableRow key={semester.id}>
                        <TableCell className="font-medium">{semester.id}</TableCell>
                        <TableCell className="text-muted-foreground">{semester.name ?? "—"}</TableCell>
                        <TableCell>{formatDate(semester.start_date)}</TableCell>
                        <TableCell>{formatDate(semester.end_date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {semester.is_current && (
                              <Badge variant="default" className="gap-1">
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
                            {overlappingIds.has(semester.id) && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {t("overlaps")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {!semester.is_current && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetCurrent(semester)}
                                disabled={setCurrent.isPending}
                                title={t("setCurrentTitle")}
                              >
                                <Star className="h-4 w-4" />
                                <span className="sr-only">{t("setCurrentSr", { id: semester.id })}</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openEdit(semester)} title={t("edit")}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">{t("editSr", { id: semester.id })}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingDelete(semester)}
                              disabled={semester.is_current}
                              title={
                                semester.is_current
                                  ? t("deleteBlockedTitle")
                                  : t("delete")
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">{t("deleteSr", { id: semester.id })}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
        existingIds={rows.map((semester) => semester.id)}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle", { id: pendingDelete?.id ?? "" })}</AlertDialogTitle>
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
