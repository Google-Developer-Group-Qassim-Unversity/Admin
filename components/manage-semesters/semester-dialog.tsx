"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Semester } from "@/lib/api-types";

export interface SemesterFormValues {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_public: boolean;
  is_current: boolean;
}

interface SemesterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The semester being edited, or null when adding a new one. */
  semester: Semester | null;
  existingIds: number[];
  onSubmit: (values: SemesterFormValues) => void;
  isLoading?: boolean;
}

const EMPTY_FORM: SemesterFormValues = {
  id: NaN,
  name: "",
  start_date: "",
  end_date: "",
  is_public: true,
  is_current: false,
};

export function SemesterDialog({
  open,
  onOpenChange,
  semester,
  existingIds,
  onSubmit,
  isLoading = false,
}: SemesterDialogProps) {
  const isEditing = semester !== null;
  const [values, setValues] = React.useState<SemesterFormValues>(EMPTY_FORM);
  const [idInput, setIdInput] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (semester) {
      setValues({
        id: semester.id,
        name: semester.name ?? "",
        start_date: semester.start_date,
        end_date: semester.end_date,
        is_public: semester.is_public,
        is_current: semester.is_current,
      });
      setIdInput(String(semester.id));
    } else {
      setValues(EMPTY_FORM);
      setIdInput("");
    }
  }, [open, semester]);

  const parsedId = Number(idInput);
  const idError = (() => {
    if (isEditing || idInput.trim() === "") return null;
    if (!Number.isInteger(parsedId) || parsedId <= 0) return "Code must be a positive whole number";
    if (existingIds.includes(parsedId)) return `Semester ${parsedId} already exists`;
    return null;
  })();

  const dateError =
    values.start_date && values.end_date && values.end_date < values.start_date
      ? "End date must be on or after the start date"
      : null;

  const canSubmit =
    !isLoading &&
    !idError &&
    !dateError &&
    values.start_date !== "" &&
    values.end_date !== "" &&
    (isEditing || idInput.trim() !== "");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit({ ...values, id: isEditing ? values.id : parsedId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? `Edit semester ${semester.id}` : "Add semester"}</DialogTitle>
            <DialogDescription>
              Events and points are counted into a semester by the date range below. Changes take effect
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester-id">Semester code</Label>
                <Input
                  id="semester-id"
                  inputMode="numeric"
                  placeholder="475"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  disabled={isEditing}
                  aria-invalid={!!idError}
                />
                {isEditing ? (
                  <p className="text-xs text-muted-foreground">The code cannot be changed.</p>
                ) : (
                  idError && <p className="text-xs text-destructive">{idError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester-name">Label (optional)</Label>
                <Input
                  id="semester-name"
                  placeholder="Summer 2026"
                  value={values.name}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester-start">Start date</Label>
                <Input
                  id="semester-start"
                  type="date"
                  value={values.start_date}
                  onChange={(e) => setValues((v) => ({ ...v, start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester-end">End date</Label>
                <Input
                  id="semester-end"
                  type="date"
                  value={values.end_date}
                  onChange={(e) => setValues((v) => ({ ...v, end_date: e.target.value }))}
                  aria-invalid={!!dateError}
                />
              </div>
            </div>
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
            <p className="text-xs text-muted-foreground">
              Both dates are inclusive — an event ending on the end date still counts for this semester.
            </p>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="semester-public">Publicly visible</Label>
                <p className="text-xs text-muted-foreground">
                  Off means only super admins can see this semester&apos;s leaderboard.
                </p>
              </div>
              <Switch
                id="semester-public"
                checked={values.is_public}
                onCheckedChange={(checked) => setValues((v) => ({ ...v, is_public: checked }))}
              />
            </div>

            {!isEditing && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="semester-current">Set as current</Label>
                  <p className="text-xs text-muted-foreground">
                    The default semester used when no semester is requested.
                  </p>
                </div>
                <Switch
                  id="semester-current"
                  checked={values.is_current}
                  onCheckedChange={(checked) => setValues((v) => ({ ...v, is_current: checked }))}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isLoading ? "Saving..." : isEditing ? "Save changes" : "Add semester"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
