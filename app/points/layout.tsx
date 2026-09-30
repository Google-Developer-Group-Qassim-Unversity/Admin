"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, CalendarPlus, Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "next-intl";

const TABS = [
  { key: "custom", href: "/points", icon: Trophy, match: ["/points", "/points/", "/points/custom"] },
  { key: "full", href: "/points/full", icon: CalendarPlus, match: ["/points/full"] },
  { key: "manage", href: "/points/manage", icon: Settings, match: ["/points/manage"] },
] as const;

function scrollIntoViewOnMount(el: HTMLAnchorElement | null) {
  el?.scrollIntoView({ block: "nearest", inline: "center" });
}

export default function PointsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("pointsLayout");
  const pathname = usePathname();

  // The create and edit screens are focused tasks with their own back link;
  // the section banner and tabs belong to the three list views only.
  const isListView = TABS.some((tab) => (tab.match as readonly string[]).includes(pathname));
  if (!isListView) {
    return <div className="space-y-6">{children}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Trophy}>
        <Button asChild>
          <Link href="/points/create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("createCustomEvent")}
          </Link>
        </Button>
      </PageHeader>

      {/* Sticky under the top bar on phones, scrolling sideways instead of
          squashing - the same strip the event tabs use. */}
      <nav
        aria-label={t("sectionsLabel")}
        className="bg-background/95 supports-backdrop-filter:bg-background/80 border-border sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 border-b px-2 supports-backdrop-filter:backdrop-blur-lg sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none"
      >
        <div className="no-scrollbar flex gap-1 overflow-x-auto overscroll-x-contain">
          {TABS.map((tab) => {
            const isActive = (tab.match as readonly string[]).includes(pathname);
            return (
              <Link
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                ref={isActive ? scrollIntoViewOnMount : undefined}
                className={`relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors pointer-coarse:py-3.5 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {t(`tabs.${tab.key}`)}
                {isActive && (
                  <span className="bg-primary absolute inset-x-2 bottom-0 h-[3px] rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
