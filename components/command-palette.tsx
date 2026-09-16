"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarPlus, RotateCcw, Trophy, UserPlus } from "lucide-react";

import { NAV_GROUPS } from "@/components/app-shell";
import { StatusDot } from "@/components/status-badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useEvents } from "@/hooks/use-event";
import { parseLocalDateTime } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/events/create", key: "newEvent", icon: CalendarPlus },
  { href: "/points/create", key: "grantPoints", icon: Trophy },
  { href: "/manage-members", key: "addMember", icon: UserPlus },
  { href: "/settings", key: "resetCache", icon: RotateCcw },
] as const;

/**
 * ⌘K. Jumps to any page, any of the quick actions, or straight to an event by
 * name - the events list is already in the react-query cache on most screens,
 * so this usually costs nothing to open.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("palette");
  const tn = useTranslations("nav");
  const router = useRouter();

  // Only fetch once the palette has actually been opened.
  const { data: events } = useEvents(undefined);

  const go = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  const recentEvents = React.useMemo(() => {
    if (!events) return [];
    return [...events]
      .sort(
        (a, b) =>
          parseLocalDateTime(b.start_datetime).getTime() -
          parseLocalDateTime(a.start_datetime).getTime(),
      )
      .slice(0, 8);
  }, [events]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
    >
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>

        <CommandGroup heading={t("actions")}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem key={action.href} value={t(action.key)} onSelect={() => go(action.href)}>
                <Icon className="h-4 w-4" />
                <span>{t(action.key)}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("goTo")}>
          {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.href} value={tn(item.key)} onSelect={() => go(item.href)}>
                <Icon className="h-4 w-4" />
                <span>{tn(item.key)}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {recentEvents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("events")}>
              {recentEvents.map((event) => (
                <CommandItem
                  key={event.id}
                  value={`${event.name} ${event.location}`}
                  onSelect={() => go(`/events/${event.id}`)}
                >
                  <StatusDot status={event.status} />
                  <span className="truncate">{event.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
