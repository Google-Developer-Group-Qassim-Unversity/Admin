"use client";

import { useMemo } from "react";
import { Info, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { EventStatus, FormType } from "@/lib/api-types";
import { useTranslations } from "next-intl";

interface StatusAlertProps {
  eventStatus: EventStatus;
  formType: FormType | null | undefined;
}

export function StatusAlert({
  eventStatus,
  formType,
}: StatusAlertProps) {
  const t = useTranslations("responses.statusAlert");
  const statusAlert = useMemo(() => {
    const requiresRegistration = formType === 'google' || formType === 'registration';
    
    // Draft with registration required
    if (eventStatus === 'draft' && requiresRegistration) {
      return {
        icon: Info,
        title: t('notPublishedTitle'),
        description: t('notPublishedDescription'),
        className: 'bg-brand-blue-soft border-brand-blue/30',
        iconClassName: 'text-brand-blue-ink',
        titleClassName: 'text-brand-blue-ink',
        descClassName: 'text-brand-blue-ink/90',
      };
    }
    
    // Active status
    if (eventStatus === 'active') {
      return {
        icon: AlertTriangle,
        title: t('activeTitle'),
        description: t('activeDescription'),
        className: 'bg-brand-yellow-soft border-brand-yellow/40',
        iconClassName: 'text-brand-yellow-ink',
        titleClassName: 'text-brand-yellow-ink',
        descClassName: 'text-brand-yellow-ink/90',
      };
    }
    
    // Open status - collecting responses (no alert shown)
    if (eventStatus === 'open') {
      return null;
    }
    
    // Closed or draft without registration
    return {
      icon: Info,
      title: t('closedTitle'),
      description: t('closedDescription'),
      className: 'bg-muted/50 border-muted',
      iconClassName: 'text-muted-foreground',
      titleClassName: '',
      descClassName: '',
    };
  }, [eventStatus, formType, t]);

  // Don't show alert when status is 'open'
  if (!statusAlert) {
    return null;
  }

  const IconComponent = statusAlert.icon;

  return (
    <Alert className={cn("mb-6", statusAlert.className)}>
      <IconComponent className={cn("h-4 w-4", statusAlert.iconClassName)} />
      <AlertTitle className={statusAlert.titleClassName}>
        {statusAlert.title}
      </AlertTitle>
      <AlertDescription className={statusAlert.descClassName}>
        {statusAlert.description}
      </AlertDescription>
    </Alert>
  );
}
