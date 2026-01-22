"use client";

import { useMemo } from "react";
import { Info, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { EventStatus, FormType } from "@/lib/api-types";

interface StatusAlertProps {
  eventStatus: EventStatus;
  formType: FormType | null | undefined;
}

export function StatusAlert({
  eventStatus,
  formType,
}: StatusAlertProps) {
  const statusAlert = useMemo(() => {
    const requiresRegistration = formType === 'google' || formType === 'registration';
    
    // Draft with registration required
    if (eventStatus === 'draft' && requiresRegistration) {
      return {
        icon: Info,
        title: 'Event Not Published',
        description: 'This event requires registration but is still in draft status. Please publish the event to start collecting responses.',
        className: 'bg-blue-500/10 border-blue-500/30',
        iconClassName: 'text-blue-600',
        titleClassName: 'text-blue-700 dark:text-blue-400',
        descClassName: 'text-blue-600/90 dark:text-blue-400/90',
      };
    }
    
    // Active status
    if (eventStatus === 'active') {
      return {
        icon: AlertTriangle,
        title: 'Event is Active',
        description: 'The event is now active. Acceptance emails should be sent.',
        className: 'bg-amber-500/10 border-amber-500/30',
        iconClassName: 'text-amber-600',
        titleClassName: 'text-amber-700 dark:text-amber-400',
        descClassName: 'text-amber-600/90 dark:text-amber-400/90',
      };
    }
    
    // Open status - collecting responses (no alert shown)
    if (eventStatus === 'open') {
      return null;
    }
    
    // Closed or draft without registration
    return {
      icon: Info,
      title: 'Responses Closed',
      description: 'Responses are not being collected anymore.',
      className: 'bg-muted/50 border-muted',
      iconClassName: 'text-muted-foreground',
      titleClassName: '',
      descClassName: '',
    };
  }, [eventStatus, formType]);

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
