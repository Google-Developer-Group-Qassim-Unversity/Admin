"use client";

import * as React from "react";
import { Activity, CalendarIcon, Filter, Search, User, X } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Event, Member } from "@/lib/api-types";
import { getEvents, getMembers } from "@/lib/api";
import type { DateRange } from "react-day-picker";

import type { EmailLogFilters, EmailType } from "./types";
import { TYPE_CONFIG } from "./email-log-row";

interface EmailLogFiltersBarProps {
  filters: EmailLogFilters;
  onFiltersChange: (filters: EmailLogFilters) => void;
  isLive: boolean;
  onLiveToggle: (live: boolean) => void;
}

const MAX_DISPLAY = 50;

export function EmailLogFiltersBar({ filters, onFiltersChange, isLive, onLiveToggle }: EmailLogFiltersBarProps) {
  const { getToken } = useAuth();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<{ id: number; name: string } | null>(null);

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
    if (!filters.start_date && !filters.end_date) return "Period";
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (filters.start_date && filters.end_date) {
      return `${fmt(filters.start_date)} – ${fmt(filters.end_date)}`;
    }
    if (filters.start_date) return `From ${fmt(filters.start_date)}`;
    if (filters.end_date) return `Until ${fmt(filters.end_date)}`;
    return "Period";
  }, [filters.start_date, filters.end_date]);

  const dateRange = filters.start_date && filters.end_date
    ? { from: new Date(filters.start_date), to: new Date(filters.end_date) }
    : filters.start_date
      ? { from: new Date(filters.start_date) }
      : undefined;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => onLiveToggle(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isLive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3 w-3" />
          Live
        </button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={() => onLiveToggle(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                !isLive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="h-3 w-3" />
              {dateRangeLabel}
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

      <Select
        value={filters.email_type ?? "all"}
        onValueChange={(v) =>
          onFiltersChange({ ...filters, email_type: v === "all" ? undefined : (v as EmailType) })
        }
      >
        <SelectTrigger size="sm" className="w-[140px] h-7 text-xs">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <SelectItem key={key} value={key}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon className={`h-3 w-3 ${cfg.color}`} />
                  {cfg.label}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <Filter className="h-3 w-3" />
            {filters.event_id
              ? events.find((e) => e.id === filters.event_id)?.name ?? `Event #${filters.event_id}`
              : "Event"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search events..." className="h-8" />
            <CommandList>
              <CommandEmpty>No events found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-events"
                  onSelect={() => onFiltersChange({ ...filters, event_id: undefined })}
                >
                  All events
                </CommandItem>
                {events.map((event) => (
                  <CommandItem
                    key={event.id}
                    value={event.name}
                    onSelect={() => onFiltersChange({ ...filters, event_id: event.id })}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{event.name}</span>
                      <span className="text-[10px] text-muted-foreground">#{event.id}</span>
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
      />

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}

function MemberFilterButton({
  selectedMember,
  onSelect,
  getToken,
}: {
  selectedMember: { id: number; name: string } | null;
  onSelect: (member: { id: number; name: string } | null) => void;
  getToken: () => Promise<string | null>;
}) {
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

  const displayMembers = React.useMemo(() => {
    let result = members;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = members.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.uni_id.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    if (selectedMember) {
      result = result.filter((m) => m.id !== selectedMember.id);
    }
    return result.slice(0, MAX_DISPLAY);
  }, [members, searchQuery, selectedMember]);

  const showLimitHint = !searchQuery.trim() && members.length > MAX_DISPLAY;

  return (
    <>
      <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setOpen(true)}>
        <User className="h-3 w-3" />
        {selectedMember ? selectedMember.name : "Member"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg! max-h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Filter by Member</DialogTitle>
            <DialogDescription>Search by name, university ID, or email</DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                disabled={isLoading}
              />
            </div>
            {showLimitHint && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Showing {MAX_DISPLAY} of {members.length}. Use search to find more.
              </p>
            )}
          </div>
          {selectedMember && (
            <div className="mx-6 border rounded-lg">
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5">
                <span className="text-xs text-muted-foreground">Selected:</span>
                <span className="text-sm font-medium flex-1">{selectedMember.name}</span>
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
          <div className="flex-1 overflow-y-auto min-h-0 border-t">
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
                {searchQuery.trim() ? "No members found" : "No members available"}
              </div>
            ) : (
              <div className="divide-y">
                {displayMembers.map((member) => (
                  <button
                    key={member.id}
                    className="w-full flex items-center gap-3 px-6 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => {
                      onSelect({ id: member.id, name: member.name });
                      setOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.uni_id} &middot; {member.email}</p>
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
