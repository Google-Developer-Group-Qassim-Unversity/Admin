"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Trophy } from "lucide-react";

import { Plate } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The frame around the create / edit points form: a back link, the title in
 * the display face on the wall, an ink rule, then the form itself at full
 * width so its sticky save bar can reach the screen edges on a phone.
 */
export function PointsEditorShell({
  title,
  description,
  children,
}: {
  /** null while loading - the heading renders as a skeleton. */
  title: string | null;
  description?: string | null;
  children: React.ReactNode;
}) {
  const tl = useTranslations("eventLayout");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" asChild className="-ms-2 w-fit">
          <Link href="/points">
            <ArrowLeft className="rtl:-scale-x-100" />
            {tl("backToPoints")}
          </Link>
        </Button>
        <header className="border-foreground flex items-center gap-3 border-b pb-3">
          {title === null ? (
            <>
              <Skeleton className="h-11 w-10 rounded-t-[4px] rounded-b-[2px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-7 w-56 max-w-full" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
            </>
          ) : (
            <>
              <Plate tone="umber" icon={Trophy} className="max-sm:hidden" />
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="font-display text-[26px] leading-tight font-semibold text-balance sm:text-[30px]">{title}</h1>
                {description ? <p className="text-ink-2 text-sm text-pretty">{description}</p> : null}
              </div>
            </>
          )}
        </header>
      </div>
      {children}
    </div>
  );
}
