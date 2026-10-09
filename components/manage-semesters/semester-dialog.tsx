"use client";

import * as React from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Semester, SemesterInput, SemesterTerm } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { isolate, useFormatters } from "@/lib/format";

/** Semesters get added ahead of time and back-filled for past terms, so allow a wide range. */
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
  const fmt = useFormatters();
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
            {selected ? fmt.custom(selected, { day: "numeric", month: "long", year: "numeric" }) : t("selectDate")}
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
  term: SemesterTerm;
  hijri_year: string;
  academic_year_start: string;
  start_date: string;
  end_date: string;
  is_public: boolean;
}

interface SemesterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The semester being edited, or null when adding a new one. */
  semester: Semester | null;
  onSubmit: (values: SemesterInput) => void;
  isLoading?: boolean;
}

const EMPTY_FORM: SemesterFormValues = {
  term: "first",
  hijri_year: "",
  academic_year_start: "",
  start_date: "",
  end_date: "",
  is_public: true,
};

const TERMS: SemesterTerm[] = ["first", "second", "summer"];

/**
 * What the database will generate - the same expressions as the `semesters`
 * generated columns (see Backend/app/DB/schema.py). Shown as a preview only;
 * the saved row's codes always come back from the API.
 */
function previewCodes(term: SemesterTerm, hijriYear: number, academicYearStart: number) {
  const hijriDigit = { first: 1, second: 2, summer: 5 }[term];
  const gregorianDigit = { first: 1, second: 2, summer: 3 }[term];
  const season = { first: "Fall", second: "Spring", summer: "Summer" }[term];
  return {
    hijriCode: (hijriYear % 100) * 10 + hijriDigit,
    gregorianCode: (academicYearStart % 100) * 10 + gregorianDigit,
    name: `${season} ${academicYearStart + (term === "first" ? 0 : 1)}`,
  };
}

function parseYear(value: string, min: number, max: number): number | null {
  const year = Number(value);
  return Number.isInteger(year) && year >= min && year <= max ? year : null;
}

export function SemesterDialog({ open, onOpenChange, semester, onSubmit, isLoading = false }: SemesterDialogProps) {
  const t = useTranslations("semesterDialog");
  const tc = useTranslations("common.actions");
  const isEditing = semester !== null;
  const [values, setValues] = React.useState<SemesterFormValues>(EMPTY_FORM);

  React.useEffect(() => {
    if (!open) return;
    setValues(
      semester
        ? {
            term: semester.term,
            hijri_year: String(semester.hijri_year),
            academic_year_start: String(semester.academic_year_start),
            start_date: semester.start_date,
            end_date: semester.end_date,
            is_public: semester.is_public,
          }
        : EMPTY_FORM
    );
  }, [open, semester]);

  const hijriYear = parseYear(values.hijri_year, 1400, 1499);
  const academicYearStart = parseYear(values.academic_year_start, 2000, 2099);
  const hijriYearError = values.hijri_year && hijriYear === null ? t("hijriYearRange") : null;
  const academicYearError = values.academic_year_start && academicYearStart === null ? t("academicYearRange") : null;
  const preview =
    hijriYear !== null && academicYearStart !== null ? previewCodes(values.term, hijriYear, academicYearStart) : null;

  const dateError =
    values.start_date && values.end_date && values.end_date < values.start_date ? t("endAfterStart") : null;

  const canSubmit =
    !isLoading && preview !== null && !dateError && values.start_date !== "" && values.end_date !== "";

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || hijriYear === null || academicYearStart === null) return;
    onSubmit({
      term: values.term,
      hijri_year: hijriYear,
      academic_year_start: academicYearStart,
      start_date: values.start_date,
      end_date: values.end_date,
      is_public: values.is_public,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? t("editTitle", { name: isolate(semester.name) }) : t("addTitle")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="semester-term">{t("term")}</Label>
              <Select
                value={values.term}
                onValueChange={(term) => setValues((v) => ({ ...v, term: term as SemesterTerm }))}
              >
                <SelectTrigger id="semester-term" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {t(`terms.${term}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="semester-hijri-year">{t("hijriYear")}</Label>
                <Input
                  id="semester-hijri-year"
                  inputMode="numeric"
                  placeholder="1447"
                  value={values.hijri_year}
                  onChange={(e) => setValues((v) => ({ ...v, hijri_year: e.target.value.trim() }))}
                  aria-invalid={!!hijriYearError}
                />
                {hijriYearError && <p className="text-xs text-destructive">{hijriYearError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester-academic-year">{t("academicYearStart")}</Label>
                <Input
                  id="semester-academic-year"
                  inputMode="numeric"
                  placeholder="2025"
                  value={values.academic_year_start}
                  onChange={(e) => setValues((v) => ({ ...v, academic_year_start: e.target.value.trim() }))}
                  aria-invalid={!!academicYearError}
                />
                {academicYearError && <p className="text-xs text-destructive">{academicYearError}</p>}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {preview
                ? t("codesPreview", {
                    name: preview.name,
                    hijriCode: preview.hijriCode,
                    gregorianCode: preview.gregorianCode,
                  })
                : t("codesHint")}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
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
            <p className="text-xs text-muted-foreground">{t("datesHint")}</p>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="semester-public">{t("publiclyVisible")}</Label>
                <p className="text-xs text-muted-foreground">{t("publiclyVisibleHint")}</p>
              </div>
              <Switch
                id="semester-public"
                checked={values.is_public}
                onCheckedChange={(checked) => setValues((v) => ({ ...v, is_public: checked }))}
              />
            </div>
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
