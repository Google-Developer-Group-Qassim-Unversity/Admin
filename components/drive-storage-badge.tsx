'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, HardDrive } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useDriveStorageQuota } from '@/hooks/use-event';
import { formatBytes } from '@/lib/utils';

interface DriveStorageBadgeProps {
  className?: string;
}

export function DriveStorageBadge({ className }: DriveStorageBadgeProps) {
  const t = useTranslations('eventContent');
  const { data, isLoading, error } = useDriveStorageQuota();

  if (isLoading || error || !data?.configured || data?.usage == null) {
    return null;
  }

  const usage = data.usage;
  const limit = data.limit;
  const percentage = data.usage_percentage;
  const isWarning = Boolean(percentage && percentage >= 80);

  const formattedUsage = formatBytes(usage);
  const formattedLimit = limit != null ? formatBytes(limit) : null;

  const label = formattedLimit
    ? t('storageUsageWithLimit', { used: formattedUsage, limit: formattedLimit })
    : t('storageUsage', { used: formattedUsage });

  const tooltipTitle =
    isWarning && percentage != null
      ? t('storageQuotaWarning', { percentage: Math.round(percentage) })
      : formattedLimit
        ? `${formattedUsage} / ${formattedLimit} (${Math.round(percentage ?? 0)}%)`
        : formattedUsage;

  return (
    <Badge
      variant={isWarning ? 'ochre' : 'secondary'}
      title={tooltipTitle}
      className={`gap-1.5 text-xs tabular shrink-0 transition-colors ${
        isWarning
          ? 'border-door-ochre-ink/30 font-semibold'
          : 'font-normal text-muted-foreground'
      } ${className ?? ''}`}
    >
      {isWarning ? (
        <AlertTriangle className="h-3.5 w-3.5 text-door-ochre-ink shrink-0" />
      ) : (
        <HardDrive className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <span>{label}</span>
      {isWarning && percentage != null && (
        <span className="text-[11px] font-bold opacity-90">({Math.round(percentage)}%)</span>
      )}
    </Badge>
  );
}
