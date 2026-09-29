"use client";

import * as React from "react";
import { Activity, CalendarIcon, Filter, Search, SlidersHorizontal, User, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Event, Member } from "@/lib/api-types";
import { getEvents, getMembers } from "@/lib/api";
import { useFuzzySearch, normalizeArabic } from "@/lib/search-utils";
import type { DateRange } from "react-day-picker";
import { useTranslations } from "next-intl";

import type { EmailLogFilters, EmailType } from "./types";
import { TYPE_CONFIG, TYPE_LABEL_KEY } from "./email-log-row";

interface EmailLogFiltersBarProps {
  filters: EmailLogFilters;
  onFiltersChange: (filters: EmailLogFilters) => void;
  isLive: boolean;
  onLiveToggle: (live: boolean) => void;
}

const MAX_DISPLAY = 50;

export function EmailLogFiltersBar({ filters, onFiltersChange, isLive, onLiveToggle }: EmailLogFiltersBarProps) {
  const t = useTranslations("manageEmails.logFilters");
  const tt = useTranslations("manageEmails.logRow.types");
  const { getToken } = useAuth();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<{ id: number; name: string } | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const tc = useTranslations("common.actions");

  React.useEffect(() => {
    getEvents().then((res) => {
      if (res.success) setEvents(res.data);
    });
  }, []);

  const activeFilterCount = [
    filters.email_type,
    filters.event_id,
    filters.member_id,
    filters.start_date,
    filters.end_date,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
    setSelectedMember(null);
    onLiveToggle(true);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      onFiltersChange({ ...filters, start_date: undefined, end_date: undefined });
      return;
    }
    let start = range.from;
    let end = range.to;
    if (start) {
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    }
    if (end) {
      end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
    }
    onFiltersChange({
      ...filters,
      start_date: start?.toISOString(),
      end_date: end?.toISOString(),
    });
    if (range.from || range.to) {
      onLiveToggle(false);
    }
  };

  const dateRangeLabel = React.useMemo(() => {
    if (!filters.start_date && !filters.end_date) return t("period");
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (filters.start_date && filters.end_date) {
      return `${fmt(filters.start_date)} – ${fmt(filters.end_date)}`;
    }
    if (filters.start_date) return t("from", { date: fmt(filters.start_date) });
    if (filters.end_date) return t("until", { date: fmt(filters.end_date) });
    return t("period");
  }, [filters.start_date, filters.end_date, t]);

  const dateRange = filters.start_date && filters.end_date
    ? { from: new Date(filters.start_date), to: new Date(filters.end_date) }
    : filters.start_date
      ? { from: new Date(filters.start_date) }
      : undefined;

  const sheetFilterCount = [filters.email_type, filters.event_id, filters.member_id].filter(Boolean).length;

  const liveToggle = (
    <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-muted p-1 md:flex-none">
      <button
        type="button"
        aria-pressed={isLive}
        onClick={() => onLiveToggle(true)}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors pointer-coarse:min-h-8 md:flex-none ${
          isLive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Activity className="h-3 w-3" />
        {t("live")}
      </button>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-pressed={!isLive}
            onClick={() => onLiveToggle(false)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors pointer-coarse:min-h-8 md:flex-none ${
              !isLive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{dateRangeLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  // Rendered inline on desktop and inside the filter sheet on a phone. `wide`
  // stretches each control to the sheet's width.
  const renderControls = (wide: boolean) => (
    <>
      <Select
        value={filters.email_type ?? "all"}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, email_type: v === "all" ? undefined : (v as EmailType) })
        }
      >
        <SelectTrigger
          size="sm"
          aria-label={t("type")}
          className={wide ? "w-full" : "w-[140px] h-7 text-xs"}
        >
          <SelectValue placeholder={t("allTypes")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("allTypes")}</SelectItem>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <SelectItem key={key} value={key}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon className={`h-3 w-3 ${cfg.color}`} />
                  {tt(TYPE_LABEL_KEY[key])}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={wide ? "w-full justify-start gap-2" : "h-7 text-xs gap-1.5"}
          >
            <Filter className={wide ? "h-4 w-4" : "h-3 w-3"} />
            <span dir="auto" className="truncate">
              {filters.event_id
                ? events.find((e) => e.id === filters.event_id)?.name ?? t("eventFallback", { id: filters.event_id })
                : t("eventDefault")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(280px,calc(100vw-2rem))] p-0 sm:w-[280px]" align="start">
          <Command filter={(value, search) => {
            const normValue = normalizeArabic(value);
            const normSearch = normalizeArabic(search);
            if (!normSearch) return 1;
            return normValue.includes(normSearch) ? 1 : 0;
          }}>
            <CommandInput placeholder={t("searchEvents")} className="h-8" />
            <CommandList>
              <CommandEmpty>{t("noEventsFound")}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-events"
                  onSelect={() => onFiltersChange({ ...filters, event_id: undefined })}
                >
                  {t("allEvents")}
                </CommandItem>
                {events.map((event) => (
                  <CommandItem
                    key={event.id}
                    value={event.name}
                    onSelect={() => onFiltersChange({ ...filters, event_id: event.id })}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm" dir="auto">{event.name}</span>
                      <span className="tabular text-xs text-muted-foreground">#{event.id}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <MemberFilterButton
        selectedMember={selectedMember}
        onSelect={(member) => {
          setSelectedMember(member);
          onFiltersChange({ ...filters, member_id: member?.id });
        }}
        getToken={getToken}
        wide={wide}
      />
    </>
  );

  return (
    <>
      {/* Phone: the live/period switch and one Filters button that opens a
          sheet with the rest - four controls don't fit a 360px row. */}
      <div className="flex items-center gap-2 md:hidden">
        {liveToggle}
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters")}
          {sheetFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs">
              {sheetFilterCount}
            </span>
          )}
        </Button>
      </div>
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("filtersTitle")}</DialogTitle>
            <DialogDescription>{t("filtersDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">{renderControls(true)}</div>
          <DialogFooter>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4" />
                {t("clear", { count: activeFilterCount })}
              </Button>
            )}
            <Button onClick={() => setSheetOpen(false)}>{tc("done")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {liveToggle}
        {renderControls(false)}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
            <X className="h-3 w-3 me-1" />
            {t("clear", { count: activeFilterCount })}
          </Button>
        )}
      </div>
    </>
  );
}

function MemberFilterButton({
  selectedMember,
  onSelect,
  getToken,
  wide = false,
}: {
  selectedMember: { id: number; name: string } | null;
  onSelect: (member: { id: number; name: string } | null) => void;
  getToken: () => Promise<string | null>;
  /** Stretch to the container - used inside the phone filter sheet. */
  wide?: boolean;
}) {
  const t = useTranslations("manageEmails.logFilters");
  const [open, setOpen] = React.useState(false);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }
    if (members.length > 0) return;

    setIsLoading(true);
    getMembers(getToken).then((res) => {
      if (res.success) {
        setMembers([...res.data].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setIsLoading(false);
    });
  }, [open, getToken, members.length]);

  const unselectedMembers = React.useMemo(() => {
    let result = members;
    if (selectedMember) {
      result = result.filter((m) => m.id !== selectedMember.id);
    }
    return result;
  }, [members, selectedMember]);

  const fuzzyResults = useFuzzySearch(unselectedMembers, searchQuery, ["name", "uni_id", "email"], {
    limit: MAX_DISPLAY,
  });

  const displayMembers = searchQuery.trim() ? fuzzyResults : unselectedMembers.slice(0, MAX_DISPLAY);

  const showLimitHint = !searchQuery.trim() && unselectedMembers.length > MAX_DISPLAY;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={wide ? "w-full justify-start gap-2" : "h-7 text-xs gap-1.5"}
        onClick={() => setOpen(true)}
      >
        <User className={wide ? "h-4 w-4" : "h-3 w-3"} />
        <span dir="auto" className="truncate">
          {selectedMember ? selectedMember.name : t("member")}
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[80vh] sm:max-w-lg">
          <DialogHeader className="px-5 pt-7 pb-3 sm:px-6 sm:pt-6">
            <DialogTitle>{t("filterByMember")}</DialogTitle>
            <DialogDescription>{t("searchByMember")}</DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-3 sm:px-6">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
                disabled={isLoading}
              />
            </div>
            {showLimitHint && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("limitHint", { shown: MAX_DISPLAY, total: members.length })}
              </p>
            )}
          </div>
          {selectedMember && (
            <div className="mx-5 mb-3 border rounded-lg sm:mx-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5">
                <span className="text-xs text-muted-foreground">{t("selected")}</span>
                <span dir="auto" className="text-sm font-medium flex-1 truncate">{selectedMember.name}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 border-t">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-[180px]" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                ))}
              </div>
            ) : displayMembers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {searchQuery.trim() ? t("noMembersFound") : t("noMembersAvailable")}
              </div>
            ) : (
              <div className="divide-y">
                {displayMembers.map((member) => (
                  <button
                    key={member.id}
                    className="w-full flex items-center gap-3 px-5 py-2.5 pointer-coarse:py-3 hover:bg-muted/50 active:bg-muted/60 transition-colors text-start sm:px-6"
                    onClick={() => {
                      onSelect({ id: member.id, name: member.name });
                      setOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p dir="auto" className="text-sm truncate">{member.name}</p>
                      <p className="text-[13px] text-muted-foreground truncate sm:text-xs">
                        <span className="tabular">{member.uni_id}</span> &middot; {member.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
