"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Info } from "lucide-react";

import { useAutosavedDraft } from "@/components/pipeline/draft-autosave";
import { Chips, ChoiceSelect, Field, FormSection, YesNo } from "@/components/pipeline/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSaveBrief } from "@/hooks/use-pipeline";
import { VENUES, type DesignBrief, type EventRequestDetail, type LogisticsBrief } from "@/lib/pipeline-types";

/** A brief's local copy, saved a moment after the last change (see draft-autosave). */
function useBriefDraft<T extends object>(request: EventRequestDetail, team: "design" | "logistics") {
  const save = useSaveBrief(request.id, team);
  const draft = useAutosavedDraft<T>({
    key: team,
    server: (request.tasks.find((task) => task.team === team)?.brief ?? {}) as T,
    enabled: request.can_edit,
    save: (brief) => save.mutateAsync(brief as Record<string, unknown>),
  });
  const set = <K extends keyof T>(field: K, value: T[K]) => draft.update((b) => ({ ...b, [field]: value }));
  return { brief: draft.value, set };
}

const linesToList = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** One link per line. Keeps the raw text while typing, so pressing Enter isn't undone. */
function LinksField({
  value,
  onChange,
  disabled,
}: {
  value: string[] | undefined;
  onChange: (links: string[]) => void;
  disabled: boolean;
}) {
  const joined = (value ?? []).join("\n");
  const [text, setText] = React.useState(joined);
  React.useEffect(() => {
    setText((current) => (linesToList(current).join("\n") === joined ? current : joined));
  }, [joined]);
  return (
    <Textarea
      dir="ltr"
      rows={3}
      value={text}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        onChange(linesToList(e.target.value));
      }}
    />
  );
}

export function DesignBriefForm({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.briefs.design");
  const tb = useTranslations("pipeline.briefs");
  const { brief, set } = useBriefDraft<DesignBrief>(request, "design");
  const disabled = !request.can_edit;

  return (
    <div className="flex flex-col gap-6">
      <p className="bg-brand-blue-soft text-brand-blue-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        {t("rule")}
      </p>
      <FormSection title={t("sections.what")}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t("designType")} name="design.design_type">
            <ChoiceSelect
              value={brief.design_type}
              options={["poster", "slides", "posts", "reports", "prints", "other"] as const}
              label={(o) => t(`designTypes.${o}`)}
              onChange={(v) => set("design_type", v)}
              disabled={disabled}
              placeholder={tb("choose")}
            />
          </Field>
          <Field label={t("size")} optional>
            <ChoiceSelect
              value={brief.size}
              options={["square", "landscape", "portrait", "other"] as const}
              label={(o) => t(`sizes.${o}`)}
              onChange={(v) => set("size", v)}
              disabled={disabled}
              placeholder={tb("choose")}
            />
          </Field>
          <Field label={t("fileType")} optional>
            <ChoiceSelect
              value={brief.file_type}
              options={["png", "jpeg", "pdf", "powerpoint", "other"] as const}
              label={(o) => t(`fileTypes.${o}`)}
              onChange={(v) => set("file_type", v)}
              disabled={disabled}
              placeholder={tb("choose")}
            />
          </Field>
          {brief.design_type === "other" ? (
            <Field label={t("designTypeOther")} name="design.design_type_other">
              <Input
                value={brief.design_type_other ?? ""}
                disabled={disabled}
                placeholder={tb("otherPlaceholder")}
                onChange={(e) => set("design_type_other", e.target.value)}
              />
            </Field>
          ) : null}
          {brief.size === "other" ? (
            <Field label={t("sizeOther")} name="design.size_other">
              <Input
                value={brief.size_other ?? ""}
                disabled={disabled}
                placeholder={tb("otherPlaceholder")}
                onChange={(e) => set("size_other", e.target.value)}
              />
            </Field>
          ) : null}
          {brief.file_type === "other" ? (
            <Field label={t("fileTypeOther")} name="design.file_type_other">
              <Input
                value={brief.file_type_other ?? ""}
                disabled={disabled}
                placeholder={tb("otherPlaceholder")}
                onChange={(e) => set("file_type_other", e.target.value)}
              />
            </Field>
          ) : null}
        </div>
        <Field label={t("idea")} name="design.idea">
          <Textarea
            rows={3}
            value={brief.idea ?? ""}
            disabled={disabled}
            placeholder={t("ideaPlaceholder")}
            onChange={(e) => set("idea", e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title={t("sections.content")}>
        <Field label={t("contentStatus")} name="design.content_status" className="md:max-w-md">
          <ChoiceSelect
            value={brief.content_status}
            options={["final", "needs_wording"] as const}
            label={(o) => t(`contentStatuses.${o}`)}
            onChange={(v) => set("content_status", v)}
            disabled={disabled}
            placeholder={tb("choose")}
          />
        </Field>
        <Field label={t("content")} name="design.content">
          <Textarea
            rows={5}
            value={brief.content ?? ""}
            disabled={disabled}
            onChange={(e) => set("content", e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title={t("sections.extras")}>
        <Field label={t("instructions")} optional>
          <Textarea
            rows={3}
            value={brief.instructions ?? ""}
            disabled={disabled}
            onChange={(e) => set("instructions", e.target.value)}
          />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("imageLinks")} hint={tb("linksHint")} optional>
            <LinksField value={brief.image_links} disabled={disabled} onChange={(v) => set("image_links", v)} />
          </Field>
          <Field label={t("referenceLinks")} hint={tb("linksHint")} optional>
            <LinksField value={brief.reference_links} disabled={disabled} onChange={(v) => set("reference_links", v)} />
          </Field>
        </div>
      </FormSection>
    </div>
  );
}

export function LogisticsBriefForm({
  request,
  onGoToDetails,
}: {
  request: EventRequestDetail;
  onGoToDetails?: () => void;
}) {
  const t = useTranslations("pipeline.briefs.logistics");
  const tb = useTranslations("pipeline.briefs");
  const { brief, set } = useBriefDraft<LogisticsBrief>(request, "logistics");
  const disabled = !request.can_edit;
  const modes = new Set(Object.values(request.details.day_modes ?? {}));
  const includesFemale = request.details.audience === "female" || request.details.audience === "mixed";
  const venueIsListed = !brief.venue || VENUES.includes(brief.venue);
  const [otherVenue, setOtherVenue] = React.useState(!venueIsListed);

  return (
    <div className="flex flex-col gap-6">
      {modes.size === 0 ? (
        <div className="bg-muted/50 flex flex-col items-start gap-3 rounded-lg px-4 py-3 text-sm sm:flex-row sm:items-center">
          <span className="text-muted-foreground flex-1">{t("pickModesFirst")}</span>
          {onGoToDetails ? (
            <Button variant="outline" size="sm" onClick={onGoToDetails}>
              {t("goToDetails")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {modes.has("online") ? (
        <FormSection title={t("onlineSection")}>
          <Field label={t("meetLink")} name="logistics.meet_link_by_logistics" className="md:max-w-sm">
            <YesNo
              ariaLabel={t("meetLink")}
              value={brief.meet_link_by_logistics}
              onChange={(v) => set("meet_link_by_logistics", v)}
              disabled={disabled}
            />
          </Field>
        </FormSection>
      ) : null}
      {modes.has("on_site") ? (
        <FormSection title={t("onSiteSection")}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={t("venue")} name="logistics.venue">
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
            <Field label={t("room")} optional>
              <Input value={brief.room ?? ""} disabled={disabled} onChange={(e) => set("room", e.target.value)} />
            </Field>
          </div>
          <Field label={t("services")} optional>
            <Chips
              values={brief.services}
              options={["sponsorship", "organizing", "volunteers"] as const}
              label={(o) => t(`serviceOptions.${o}`)}
              onChange={(v) => set("services", v)}
              disabled={disabled}
            />
          </Field>
          <Field label={t("venueNeeds")} optional>
            <Chips
              values={brief.venue_needs}
              options={["devices", "internet", "audio"] as const}
              label={(o) => t(`venueNeedOptions.${o}`)}
              onChange={(v) => set("venue_needs", v)}
              disabled={disabled}
            />
          </Field>
          {includesFemale ? (
            <Field label={t("buses")} name="logistics.buses_needed" className="md:max-w-sm">
              <YesNo
                ariaLabel={t("buses")}
                value={brief.buses_needed}
                onChange={(v) => set("buses_needed", v)}
                disabled={disabled}
              />
            </Field>
          ) : null}
        </FormSection>
      ) : null}
      <FormSection title={t("notesSection")}>
        <Field label={t("notes")} optional>
          <Textarea rows={3} value={brief.notes ?? ""} disabled={disabled} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </FormSection>
    </div>
  );
}
