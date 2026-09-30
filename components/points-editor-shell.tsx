"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The frame around the create / edit points form. From sm up it is a centred
 * card; on a phone the card chrome drops away so the form gets the full width
 * and its sticky save bar can reach the screen edges (the card's
 * overflow-hidden would otherwise stop it sticking).
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
    <div className="flex justify-center">
      <Card className="w-full max-w-4xl max-md:overflow-visible max-sm:gap-4 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none max-sm:ring-0">
        <CardHeader className="max-sm:px-0">
          <div className="mb-2 sm:mb-4">
            <Button variant="ghost" size="sm" asChild className="-ms-2 pointer-coarse:h-10">
              <Link href="/points" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
                {tl("backToPoints")}
              </Link>
            </Button>
          </div>
          {title === null ? (
            <>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-7 w-48" />
              </div>
              <Skeleton className="h-5 w-72 max-w-full" />
            </>
          ) : (
            <>
              <CardTitle className="flex items-center gap-3">
                <span className="bg-brand-blue-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Trophy className="text-brand-blue-ink h-5 w-5" />
                </span>
                <h1 className="font-display text-xl leading-tight font-semibold tracking-tight text-balance sm:text-2xl">
                  {title}
                </h1>
              </CardTitle>
              {description ? <CardDescription className="text-pretty">{description}</CardDescription> : null}
            </>
          )}
        </CardHeader>
        <CardContent className="max-sm:px-0">{children}</CardContent>
      </Card>
    </div>
  );
}
