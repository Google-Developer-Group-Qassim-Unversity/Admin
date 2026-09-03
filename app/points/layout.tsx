"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, CalendarPlus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function PointsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("pointsLayout");
  const pathname = usePathname();

  const isCustomActive = pathname === "/points" || pathname === "/points/" || pathname === "/points/custom";
  const isFullActive = pathname === "/points/full";
  const isManageActive = pathname === "/points/manage";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/points/create" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {t("createCustomEvent")}
          </Link>
        </Button>
      </div>

      <nav className="border-b">
        <div className="flex gap-1">
          <Link
            href="/points"
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors relative ${
              isCustomActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-4 w-4" />
            {t("tabs.custom")}
            {isCustomActive && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />
            )}
          </Link>
          <Link
            href="/points/full"
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors relative ${
              isFullActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarPlus className="h-4 w-4" />
            {t("tabs.full")}
            {isFullActive && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />
            )}
          </Link>
          <Link
            href="/points/manage"
            className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors relative ${
              isManageActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            {t("tabs.manage")}
            {isManageActive && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />
            )}
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}
