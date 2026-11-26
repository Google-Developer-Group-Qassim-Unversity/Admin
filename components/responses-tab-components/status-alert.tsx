"use client";

import { useMemo, useState } from "react";
import { Ban, Clock, Info, Lock } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { resolveEffectiveRegistration, resolveEventPhase } from "@/lib/event-lifecycle";
import type { Event, GoogleFormData } from "@/lib/api-types";
import { useTranslations } from "next-intl";

interface StatusAlertProps {
  event: Event;
  formData: GoogleFormData | null | undefined;
}

export function StatusAlert({ event, formData }: StatusAlertProps) {
  const t = useTranslations("responses.statusAlert");
  const [now] = useState(() => Date.now());

  const statusAlert = useMemo(() => {
    const formType = formData?.formType ?? event.form_type ?? null;
    if (formType === "none") return null;

    if (event.status === "draft") {
      return {
        icon: Info,
        title: t("draftTitle"),
        description: t("draftDescription"),
        className: "bg-door-indigo-soft border-door-indigo/30",
        iconClassName: "text-door-indigo-ink",
        titleClassName: "text-door-indigo-ink",
        descClassName: "text-door-indigo-ink/90",
      };
    }

    if (event.status === "cancelled") {
      return {
        icon: Ban,
        title: t("cancelledTitle"),
        description: t("cancelledDescription"),
        className: "bg-door-madder-soft border-door-madder/30",
        iconClassName: "text-door-madder-ink",
        titleClassName: "text-door-madder-ink",
        descClassName: "text-door-madder-ink/90",
      };
    }

    const phase = resolveEventPhase(event, now);
    const effective = formData?.effectiveRegistrationStatus ?? resolveEffectiveRegistration(event, now);

    if (effective === "not_open") {
      return {
        icon: Clock,
        title: t("notOpenTitle"),
        description: t("notOpenDescription"),
        className: "bg-door-ochre-soft border-door-ochre/40",
        iconClassName: "text-door-ochre-ink",
        titleClassName: "text-door-ochre-ink",
        descClassName: "text-door-ochre-ink/90",
      };
    }

    if (effective === "open") {
      return null;
    }

    if (phase === "ended") {
      return {
        icon: Info,
        title: t("endedTitle"),
        description: t("endedDescription"),
        className: "bg-sunk/60 border-rule",
        iconClassName: "text-ink-2",
        titleClassName: "",
        descClassName: "text-ink-2",
      };
    }

    return {
      icon: Lock,
      title: t("closedTitle"),
      description: t("closedDescription"),
      className: "bg-sunk/60 border-rule",
      iconClassName: "text-ink-2",
      titleClassName: "",
      descClassName: "text-ink-2",
    };
  }, [event, formData, now, t]);

  if (!statusAlert) {
    return null;
  }

  const IconComponent = statusAlert.icon;

  return (
    <Alert className={cn("mb-4", statusAlert.className)}>
      <IconComponent className={cn("h-4 w-4", statusAlert.iconClassName)} />
      <AlertTitle className={statusAlert.titleClassName}>{statusAlert.title}</AlertTitle>
      <AlertDescription className={statusAlert.descClassName}>{statusAlert.description}</AlertDescription>
    </Alert>
  );
}
