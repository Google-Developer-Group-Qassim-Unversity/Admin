"use client";

import { AlertCircle, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

/** The raised panel a points list sits in from md up; on a phone the rows sit on the wall. */
export const POINTS_LIST = "flex flex-col md:bg-card md:ring-1 md:ring-rule md:rounded-xl";

/** Placeholder rows in the shape of the real ones. */
export function PointsListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className={POINTS_LIST} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="border-rule flex min-h-16 items-center gap-3 border-b px-1 py-3 last:border-b-0 md:px-4">
          <Skeleton className="h-11 w-10 rounded-t-[4px] rounded-b-[2px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A list that could not be loaded: what failed, and that the server may be down. */
export function PointsLoadError({ message, isServerError }: { message?: string; isServerError?: boolean }) {
  const te = useTranslations("events");
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{te("loadFailed")}</AlertTitle>
      <AlertDescription>
        {message || te("loadFailedDescription")}
        {isServerError ? <span className="mt-1 block">{te("serverUnavailable")}</span> : null}
      </AlertDescription>
    </Alert>
  );
}

/** Nothing to list yet: says why, and offers the way forward. */
export function PointsEmpty({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
