"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import type { Semester } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/** Semester codes run years ahead of the current term, so allow a wide dropdown range. */
const CALENDAR_START = new Date(2020, 0);
const CALENDAR_END = new Date(2035, 11);

/** Parse the API's YYYY-MM-DD into a local Date, avoiding the UTC shift `new Date(str)` applies. */
function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

/** Format back to YYYY-MM-DD from local parts - toISOString() would shift the day. */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Days before this are unselectable, used to keep the end date after the start. */
  minDate?: Date;
  invalid?: boolean;
}

function DateField({ id, label, value, onChange, minDate, invalid }: DateFieldProps) {
  const t = useTranslations("semesterDialog");
  const [open, setOpen] = React.useState(false);
  const selected = parseIsoDate(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid}
            className={cn("w-full justify-start text-start font-normal", !selected && "text-muted-foreground")}
          >
            <CalendarIcon className="me-2 h-4 w-4" />
            {selected ? format(selected, "PPP") : t("selectDate")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? minDate}
            captionLayout="dropdown"
            startMonth={CALENDAR_START}
            endMonth={CALENDAR_END}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

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
  const t = useTranslations("semesterDialog");
  const tc = useTranslations("common.actions");
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
    if (!Number.isInteger(parsedId) || parsedId <= 0) return t("codePositiveInteger");
    if (existingIds.includes(parsedId)) return t("codeExists", { id: parsedId });
    return null;
  })();

  const dateError =
    values.start_date && values.end_date && values.end_date < values.start_date
      ? t("endAfterStart")
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
            <DialogTitle>{isEditing ? t("editTitle", { id: semester.id }) : t("addTitle")}</DialogTitle>
            <DialogDescription>
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester-id">{t("semesterCode")}</Label>
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
                  <p className="text-xs text-muted-foreground">{t("codeImmutable")}</p>
                ) : (
                  idError && <p className="text-xs text-destructive">{idError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester-name">{t("labelOptional")}</Label>
                <Input
                  id="semester-name"
                  placeholder="Summer 2026"
                  value={values.name}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DateField
                id="semester-start"
                label={t("startDate")}
                value={values.start_date}
                onChange={(start_date) => setValues((v) => ({ ...v, start_date }))}
              />

              <DateField
                id="semester-end"
                label={t("endDate")}
                value={values.end_date}
                onChange={(end_date) => setValues((v) => ({ ...v, end_date }))}
                minDate={parseIsoDate(values.start_date)}
                invalid={!!dateError}
              />
            </div>
            {dateError && <p className="text-xs text-destructive">{dateError}</p>}
            <p className="text-xs text-muted-foreground">
              {t("inclusiveDatesHint")}
            </p>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="semester-public">{t("publiclyVisible")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("publiclyVisibleHint")}
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
                  <Label htmlFor="semester-current">{t("setAsCurrent")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("setAsCurrentHint")}
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
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isLoading ? t("saving") : isEditing ? t("saveChanges") : t("addSemester")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
