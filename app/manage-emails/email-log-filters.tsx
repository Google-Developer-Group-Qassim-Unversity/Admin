"use client";

import * as React from "react";
import { Activity, CalendarIcon, Filter, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

export function EmailLogFiltersBar({ filters, onFiltersChange, isLive, onLiveToggle }: EmailLogFiltersBarProps) {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = React.useState("");
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [selectedMember, setSelectedMember] = React.useState<{ id: number; name: string } | null>(null);

  React.useEffect(() => {
    getEvents().then((res) => {
      if (res.success) setEvents(res.data);
    });
  }, []);

  React.useEffect(() => {
    if (memberDialogOpen) {
      getMembers().then((res) => {
        if (res.success) setMembers(res.data);
      });
    }
  }, [memberDialogOpen]);

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
    onFiltersChange({
      ...filters,
      start_date: range.from?.toISOString(),
      end_date: range.to?.toISOString(),
    });
    if (range.from || range.to) {
      onLiveToggle(false);
    }
  };

  const dateRange = filters.start_date && filters.end_date
    ? { from: new Date(filters.start_date), to: new Date(filters.end_date) }
    : filters.start_date
      ? { from: new Date(filters.start_date) }
      : undefined;

  const filteredMembers = React.useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 50);
    const q = memberSearch.toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.uni_id.toLowerCase().includes(q))
      .slice(0, 50);
  }, [members, memberSearch]);

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
              {filters.start_date ? "Custom" : "Period"}
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

      <Popover open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
            <User className="h-3 w-3" />
            {selectedMember ? selectedMember.name : "Member"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search members..."
              value={memberSearch}
              onValueChange={setMemberSearch}
              className="h-8"
            />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all-members"
                  onSelect={() => {
                    onFiltersChange({ ...filters, member_id: undefined });
                    setSelectedMember(null);
                    setMemberDialogOpen(false);
                  }}
                >
                  All members
                </CommandItem>
                {filteredMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.name}
                    onSelect={() => {
                      onFiltersChange({ ...filters, member_id: member.id });
                      setSelectedMember({ id: member.id, name: member.name });
                      setMemberDialogOpen(false);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{member.name}</span>
                      <span className="text-[10px] text-muted-foreground">{member.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
          <X className="h-3 w-3 mr-1" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
