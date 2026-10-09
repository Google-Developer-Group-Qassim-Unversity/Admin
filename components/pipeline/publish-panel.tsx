"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, PartyPopper, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/pipeline/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublishRequest } from "@/hooks/use-pipeline";
import { useAccess } from "@/hooks/use-access";
import type { EventRequestDetail } from "@/lib/pipeline-types";

/**
 * The last step: pick the points tier and publish. The event is created in
 * /events as a draft, for an admin to review before members can see it.
 */
export function PublishPanel({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.publish");
  const { can } = useAccess();
  const publish = usePublishRequest(request.id);
  const [imageUrl, setImageUrl] = React.useState("");

  if (request.stage === "published" && request.event_id) {
    return (
      <section className="bg-brand-green-soft text-brand-green-ink border-brand-green/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 sm:p-5">
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <PartyPopper className="h-5 w-5 shrink-0" />
          {t("done", { id: request.event_id })}
        </span>
        {can("events.view") ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/events/${request.event_id}`}>
              <ExternalLink className="h-4 w-4" />
              {t("open")}
            </Link>
          </Button>
        ) : null}
      </section>
    );
  }
  if (!request.actions.can_publish) return null;

  const onPublish = async () => {
    try {
      await publish.mutateAsync({ image_url: imageUrl.trim() || null });
      toast.success(t("published"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-brand-green/40 flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="bg-brand-green-soft text-brand-green-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Rocket className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("image")} hint={t("imageHint")} optional>
          <Input dir="ltr" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
        </Field>
      </div>
      <div className="flex">
        <Button className="max-sm:flex-1" onClick={onPublish} disabled={publish.isPending}>
          <Rocket className="h-4 w-4" />
          {t("button")}
        </Button>
      </div>
    </section>
  );
}
