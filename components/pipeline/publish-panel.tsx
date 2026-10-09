"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, PartyPopper, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Door, DoorPanel } from "@/components/najdi";
import { Field } from "@/components/pipeline/form-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePublishRequest } from "@/hooks/use-pipeline";
import { useAccess } from "@/hooks/use-access";
import { useApi } from "@/lib/api/client";
import type { EventRequestDetail } from "@/lib/pipeline-types";

/**
 * The last step: pick the points tier and publish. The event is created in
 * /events as a draft, for an admin to review before members can see it.
 */
export function PublishPanel({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.publish");
  const locale = useLocale();
  const api = useApi();
  const { can } = useAccess();
  const publish = usePublishRequest(request.id);
  const [pair, setPair] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const { data: actions } = useQuery({
    queryKey: ["actions"],
    queryFn: () => api.actions.list(),
    enabled: request.actions.can_publish,
  });

  if (request.stage === "published" && request.event_id) {
    return (
      <Door tone="green" aria-label={t("published")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[15px] font-bold">
            <PartyPopper className="size-5 shrink-0" />
            {t("done", { id: request.event_id })}
          </span>
          {can("events.view") ? (
            <Button asChild variant="outline" className="text-on-door shadow-[inset_0_0_0_1.5px_currentColor] hover:bg-white/12">
              <Link href={`/events/${request.event_id}`}>
                <ExternalLink />
                {t("open")}
              </Link>
            </Button>
          ) : null}
        </div>
      </Door>
    );
  }
  if (!request.actions.can_publish) return null;

  const pairs = (actions?.composite_actions ?? []).filter((p) => p.length === 2);

  const onPublish = async () => {
    const [departmentActionId, memberActionId] = pair.split(":").map(Number);
    try {
      await publish.mutateAsync({
        department_action_id: departmentActionId,
        member_action_id: memberActionId,
        image_url: imageUrl.trim() || null,
      });
      toast.success(t("published"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <Door tone="ochre" aria-labelledby="publish-title">
      <h2 id="publish-title" className="font-display text-[21px] leading-tight font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm font-medium">{t("hint")}</p>
      <DoorPanel className="grid gap-4 md:grid-cols-2">
        <Field label={t("tier")}>
          <Select value={pair} onValueChange={setPair}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("pickTier")} />
            </SelectTrigger>
            <SelectContent>
              {pairs.map(([dept, member]) => (
                <SelectItem key={`${dept.id}:${member.id}`} value={`${dept.id}:${member.id}`}>
                  {locale === "ar" ? dept.ar_action_name : dept.action_name} · {member.points}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("image")} hint={t("imageHint")} optional>
          <Input dir="ltr" type="url" inputMode="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
        </Field>
      </DoorPanel>
      <div className="flex">
        <Button variant="green" size="lg" className="max-sm:flex-1" onClick={onPublish} disabled={!pair || publish.isPending}>
          <Rocket />
          {t("button")}
        </Button>
      </div>
    </Door>
  );
}
