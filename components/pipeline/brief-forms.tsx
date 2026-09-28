"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { ChoiceSelect, Field } from "@/components/pipeline/details-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveBrief } from "@/hooks/use-pipeline";
import { VENUES, type DesignBrief, type EventRequestDetail, type LogisticsBrief } from "@/lib/pipeline-types";

function useBriefState<T extends object>(request: EventRequestDetail, team: "design" | "logistics") {
  const initial = (request.tasks.find((task) => task.team === team)?.brief ?? {}) as T;
  const [brief, setBrief] = React.useState<T>(initial);
  const key = JSON.stringify(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => setBrief(initial), [key]);
  const set = <K extends keyof T>(field: K, value: T[K]) => setBrief((b) => ({ ...b, [field]: value }));
  return { brief, set };
}

function SaveButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  const t = useTranslations("pipeline.briefs");
  return (
    <div>
      <Button onClick={onClick} disabled={pending}>
        <Save className="h-4 w-4" />
        {t("save")}
      </Button>
    </div>
  );
}

const linesToList = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export function DesignBriefForm({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.briefs.design");
  const tb = useTranslations("pipeline.briefs");
  const { brief, set } = useBriefState<DesignBrief>(request, "design");
  const save = useSaveBrief(request.id, "design");
  const disabled = !request.can_edit;

  const onSave = async () => {
    try {
      await save.mutateAsync(brief as Record<string, unknown>);
      toast.success(tb("saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tb("failed"));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="bg-brand-yellow-soft text-brand-yellow-ink rounded-lg px-3 py-2 text-sm">{t("rule")}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("designType")}>
          <ChoiceSelect
            value={brief.design_type}
            options={["poster", "slides", "posts", "reports", "prints", "other"] as const}
            label={(o) => t(`designTypes.${o}`)}
            onChange={(v) => set("design_type", v)}
            disabled={disabled}
            placeholder={tb("choose")}
          />
          {brief.design_type === "other" ? (
            <Input
              value={brief.design_type_other ?? ""}
              disabled={disabled}
              placeholder={tb("otherPlaceholder")}
              onChange={(e) => set("design_type_other", e.target.value)}
            />
          ) : null}
        </Field>
        <Field label={t("size")}>
          <ChoiceSelect
            value={brief.size}
            options={["square", "landscape", "portrait", "other"] as const}
            label={(o) => t(`sizes.${o}`)}
            onChange={(v) => set("size", v)}
            disabled={disabled}
            placeholder={tb("optional")}
          />
          {brief.size === "other" ? (
            <Input
              value={brief.size_other ?? ""}
              disabled={disabled}
              placeholder={tb("otherPlaceholder")}
              onChange={(e) => set("size_other", e.target.value)}
            />
          ) : null}
        </Field>
        <Field label={t("fileType")}>
          <ChoiceSelect
            value={brief.file_type}
            options={["png", "jpeg", "pdf", "powerpoint", "other"] as const}
            label={(o) => t(`fileTypes.${o}`)}
            onChange={(v) => set("file_type", v)}
            disabled={disabled}
            placeholder={tb("optional")}
          />
          {brief.file_type === "other" ? (
            <Input
              value={brief.file_type_other ?? ""}
              disabled={disabled}
              placeholder={tb("otherPlaceholder")}
              onChange={(e) => set("file_type_other", e.target.value)}
            />
          ) : null}
        </Field>
      </div>
      <Field label={t("idea")}>
        <Textarea rows={3} value={brief.idea ?? ""} disabled={disabled} onChange={(e) => set("idea", e.target.value)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("contentStatus")}>
          <ChoiceSelect
            value={brief.content_status}
            options={["final", "needs_wording"] as const}
            label={(o) => t(`contentStatuses.${o}`)}
            onChange={(v) => set("content_status", v)}
            disabled={disabled}
            placeholder={tb("choose")}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("content")}>
            <Textarea
              rows={4}
              value={brief.content ?? ""}
              disabled={disabled}
              onChange={(e) => set("content", e.target.value)}
            />
          </Field>
        </div>
      </div>
      <Field label={t("instructions")}>
        <Textarea
          rows={3}
          value={brief.instructions ?? ""}
          disabled={disabled}
          onChange={(e) => set("instructions", e.target.value)}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("imageLinks")} hint={tb("linksHint")}>
          <Textarea
            dir="ltr"
            rows={3}
            value={(brief.image_links ?? []).join("\n")}
            disabled={disabled}
            onChange={(e) => set("image_links", linesToList(e.target.value))}
          />
        </Field>
        <Field label={t("referenceLinks")} hint={tb("linksHint")}>
          <Textarea
            dir="ltr"
            rows={3}
            value={(brief.reference_links ?? []).join("\n")}
            disabled={disabled}
            onChange={(e) => set("reference_links", linesToList(e.target.value))}
          />
        </Field>
      </div>
      {!disabled ? <SaveButton onClick={onSave} pending={save.isPending} /> : null}
    </div>
  );
}

function Multi<T extends string>({
  values,
  options,
  label,
  onChange,
  disabled,
}: {
  values: T[] | undefined;
  options: readonly T[];
  label: (o: T) => string;
  onChange: (v: T[]) => void;
  disabled: boolean;
}) {
  const current = values ?? [];
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={current.includes(o)}
            disabled={disabled}
            onCheckedChange={(v) => onChange(v === true ? [...current, o] : current.filter((x) => x !== o))}
          />
          {label(o)}
        </label>
      ))}
    </div>
  );
}

function YesNo({ value, onChange, disabled }: { value: boolean | null | undefined; onChange: (v: boolean) => void; disabled: boolean }) {
  const tb = useTranslations("pipeline.briefs");
  return (
    <ChoiceSelect
      value={value === undefined || value === null ? null : value ? "yes" : "no"}
      options={["yes", "no"] as const}
      label={(o) => tb(o)}
      onChange={(v) => onChange(v === "yes")}
      disabled={disabled}
      placeholder={tb("choose")}
    />
  );
}

export function LogisticsBriefForm({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.briefs.logistics");
  const tb = useTranslations("pipeline.briefs");
  const { brief, set } = useBriefState<LogisticsBrief>(request, "logistics");
  const save = useSaveBrief(request.id, "logistics");
  const disabled = !request.can_edit;
  const modes = new Set(Object.values(request.details.day_modes ?? {}));
  const includesFemale = request.details.audience === "female" || request.details.audience === "mixed";
  const venueIsListed = !brief.venue || VENUES.includes(brief.venue);
  const [otherVenue, setOtherVenue] = React.useState(!venueIsListed);

  const onSave = async () => {
    try {
      await save.mutateAsync(brief as Record<string, unknown>);
      toast.success(tb("saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tb("failed"));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {modes.size === 0 ? <p className="text-muted-foreground text-sm">{t("pickModesFirst")}</p> : null}
      {modes.has("online") ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("onlineSection")}</h3>
          <Field label={t("meetLink")}>
            <YesNo value={brief.meet_link_by_logistics} onChange={(v) => set("meet_link_by_logistics", v)} disabled={disabled} />
          </Field>
        </section>
      ) : null}
      {modes.has("on_site") ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("onSiteSection")}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("venue")}>
              <ChoiceSelect
                value={otherVenue ? "__other" : (brief.venue ?? null)}
                options={[...VENUES, "__other"]}
                label={(o) => (o === "__other" ? tb("other") : o)}
                onChange={(v) => {
                  if (v === "__other") {
                    setOtherVenue(true);
                    set("venue", "");
                  } else {
                    setOtherVenue(false);
                    set("venue", v);
                  }
                }}
                disabled={disabled}
                placeholder={tb("choose")}
              />
              {otherVenue ? (
                <Input
                  value={brief.venue ?? ""}
                  disabled={disabled}
                  placeholder={tb("otherPlaceholder")}
                  onChange={(e) => set("venue", e.target.value)}
                />
              ) : null}
            </Field>
            <Field label={t("room")}>
              <Input value={brief.room ?? ""} disabled={disabled} onChange={(e) => set("room", e.target.value)} />
            </Field>
            <Field label={t("services")}>
              <Multi
                values={brief.services}
                options={["sponsorship", "organizing", "volunteers"] as const}
                label={(o) => t(`serviceOptions.${o}`)}
                onChange={(v) => set("services", v)}
                disabled={disabled}
              />
            </Field>
            <Field label={t("venueNeeds")}>
              <Multi
                values={brief.venue_needs}
                options={["devices", "internet", "audio"] as const}
                label={(o) => t(`venueNeedOptions.${o}`)}
                onChange={(v) => set("venue_needs", v)}
                disabled={disabled}
              />
            </Field>
            {includesFemale ? (
              <Field label={t("buses")}>
                <YesNo value={brief.buses_needed} onChange={(v) => set("buses_needed", v)} disabled={disabled} />
              </Field>
            ) : null}
          </div>
        </section>
      ) : null}
      <Field label={t("notes")}>
        <Textarea rows={3} value={brief.notes ?? ""} disabled={disabled} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      {!disabled ? <SaveButton onClick={onSave} pending={save.isPending} /> : null}
    </div>
  );
}
