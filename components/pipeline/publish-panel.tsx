"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/pipeline/details-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePublishRequest } from "@/hooks/use-pipeline";
import { useUserRole } from "@/hooks/use-rbac";
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
  const role = useUserRole();
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
      <section className="bg-brand-green-soft text-brand-green-ink flex flex-wrap items-center justify-between gap-3 rounded-xl p-5">
        <span className="text-sm font-medium">{t("done", { id: request.event_id })}</span>
        {role !== "none" ? (
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
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-base font-semibold tracking-tight">{t("title")}</h3>
        <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("tier")}>
          <Select value={pair} onValueChange={setPair}>
            <SelectTrigger>
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
        <Field label={t("image")} hint={t("imageHint")}>
          <Input dir="ltr" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://" />
        </Field>
      </div>
      <div>
        <Button onClick={onPublish} disabled={!pair || publish.isPending}>
          <Rocket className="h-4 w-4" />
          {t("button")}
        </Button>
      </div>
    </section>
  );
}
