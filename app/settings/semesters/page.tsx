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
        toast.success(`Semester ${editing.id} updated`);
      } else {
        await createSemester.mutateAsync({
          id: values.id,
          name: values.name.trim() || null,
          start_date: values.start_date,
          end_date: values.end_date,
          is_public: values.is_public,
          is_current: values.is_current,
        });
        toast.success(`Semester ${values.id} added`);
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save semester");
    }
  };

  const handleSetCurrent = async (semester: Semester) => {
    try {
      await setCurrent.mutateAsync(semester.id);
      toast.success(`Semester ${semester.id} is now the default`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set the current semester");
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSemester.mutateAsync(pendingDelete.id);
      toast.success(`Semester ${pendingDelete.id} deleted`);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete semester");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Semesters</h1>
          <p className="text-muted-foreground mt-2">
            Define the date range of each semester and pick which one is the default
          </p>
        </div>
        <Button onClick={openAdd}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Add Semester
        </Button>
      </div>

      {isLoading && <Skeleton className="h-[240px] w-full" />}

      {!isLoading && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load semesters</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && overlappingIds.size > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Overlapping date ranges</AlertTitle>
          <AlertDescription>
            Semesters {[...overlappingIds].join(", ")} share dates, so events in the overlap count towards
            both leaderboards.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>All semesters</CardTitle>
            <CardDescription>
              {rows.length} semester{rows.length !== 1 ? "s" : ""} — events are grouped by the day they end
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No semesters yet. Add one to start counting points.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                                Current
                              </Badge>
                            )}
                            {!semester.is_public && (
                              <Badge variant="outline" className="gap-1">
                                <EyeOff className="h-3 w-3" />
                                Private
                              </Badge>
                            )}
                            {overlappingIds.has(semester.id) && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Overlaps
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
                                title="Set as current semester"
                              >
                                <Star className="h-4 w-4" />
                                <span className="sr-only">Set semester {semester.id} as current</span>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openEdit(semester)} title="Edit">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit semester {semester.id}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingDelete(semester)}
                              disabled={semester.is_current}
                              title={
                                semester.is_current
                                  ? "Set another semester as current before deleting this one"
                                  : "Delete"
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                              <span className="sr-only">Delete semester {semester.id}</span>
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
            <AlertDialogTitle>Delete semester {pendingDelete?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              Events and points are not deleted, but they will no longer be grouped under this semester.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSemester.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteSemester.isPending}>
              {deleteSemester.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
