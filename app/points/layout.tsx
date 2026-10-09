"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, CalendarCheck, ListOrdered, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useTranslations } from "next-intl";

const TABS = [
  { key: "custom", href: "/points", icon: Trophy, match: ["/points", "/points/", "/points/custom"] },
  { key: "full", href: "/points/full", icon: CalendarCheck, match: ["/points/full"] },
  { key: "manage", href: "/points/manage", icon: ListOrdered, match: ["/points/manage"] },
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
  // the page header and tabs belong to the three list views only.
  const isListView = TABS.some((tab) => (tab.match as readonly string[]).includes(pathname));
  if (!isListView) {
    return <div className="mx-auto w-full max-w-[1100px]">{children}</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} icon={Trophy}>
        <Button asChild>
          <Link href="/points/create">
            <Plus />
            {t("createCustomEvent")}
          </Link>
        </Button>
      </PageHeader>

      {/* Ink-underlined section tabs. On a phone they stick under the top bar
          and scroll sideways instead of squashing. */}
      <nav
        aria-label={t("sectionsLabel")}
        className="bg-background border-rule sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-30 -mx-4 -mt-2 border-b px-2 sm:static sm:mx-0 sm:bg-transparent sm:px-0"
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
                className={`relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors ${
                  isActive ? "text-foreground font-bold" : "text-ink-2 hover:text-foreground font-medium"
                }`}
              >
                <tab.icon className="size-[18px] max-[400px]:hidden" strokeWidth={1.75} />
                {t(`tabs.${tab.key}`)}
                {isActive && <span aria-hidden="true" className="bg-foreground absolute inset-x-2 -bottom-px h-[3px] rounded-t-[2px]" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {children}
    </div>
  );
}
