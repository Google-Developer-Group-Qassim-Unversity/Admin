"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarCheck, CalendarPlus, RotateCcw, Trophy, UserPlus, type LucideIcon } from "lucide-react";

import { useNavGroups } from "@/components/app-shell";
import { useAccess } from "@/hooks/use-access";
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
  { href: "/pipeline?book=1", key: "bookDates", icon: CalendarPlus },
  { href: "/events/create", key: "newEvent", icon: CalendarCheck },
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
  const navGroups = useNavGroups();
  const { canOpen, can } = useAccess();
  const quickActions = QUICK_ACTIONS.filter((action) =>
    action.key === "resetCache"
      ? can("cache.reset")
      : action.key === "addMember"
        ? can("members.create")
        : canOpen(action.href.split("?")[0]),
  );

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
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem key={action.href} value={t(action.key)} onSelect={() => go(action.href)}>
                <ItemPlate icon={Icon} ochre={action.key === "bookDates"} />
                <span className="font-bold">{t(action.key)}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("goTo")}>
          {navGroups.flatMap((group) => group.items).map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.href} value={tn(item.key)} onSelect={() => go(item.href)}>
                <ItemPlate icon={Icon} />
                <span className="font-medium">{tn(item.key)}</span>
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
                  <span className="grid size-8 shrink-0 place-items-center">
                    <StatusDot status={event.status} />
                  </span>
                  <span className="truncate font-medium" dir="auto">
                    {event.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/** The icon on a small plate: plaster for places, ochre for the one action waiting on everyone (booking). */
function ItemPlate({ icon: Icon, ochre = false }: { icon: LucideIcon; ochre?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        ochre
          ? "plate-depth bg-door-ochre text-on-door-ochre grid size-8 shrink-0 place-items-center rounded-[3px]"
          : "bg-sunk text-foreground grid size-8 shrink-0 place-items-center rounded-[3px] shadow-[inset_0_0_0_1px_var(--rule)]"
      }
    >
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}
