'use client';

import { useMemo } from 'react';
import { Search, Users, Loader2, RefreshCw, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
  ItemGroup,
} from '@/components/ui/item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { AttendanceRecord } from '@/lib/api-types';
import { getDayNumberFromEffectiveDate } from './utils';

interface AttendanceListCardProps {
  eventStart: Date;
  isMultiDay: boolean;
  dayCount: number;
  isEventClosed: boolean;
  attendanceCount: number;
  attendanceData: AttendanceRecord[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  onManageClick: () => void;
  selectedDay: string;
  onSelectedDayChange: (day: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function AttendanceListCard({
  eventStart,
  isMultiDay,
  dayCount,
  isEventClosed,
  attendanceCount,
  attendanceData,
  isLoading,
  isFetching,
  onRefresh,
  onManageClick,
  selectedDay,
  onSelectedDayChange,
  searchQuery,
  onSearchQueryChange,
}: AttendanceListCardProps) {
  const dayOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (isMultiDay) {
      for (let i = 1; i <= dayCount; i++) {
        options.push({ value: String(i), label: `Day ${i}` });
      }
    }
    options.push({ value: 'all', label: 'All Days' });
    if (isMultiDay) {
      options.push({ value: 'exclusive_all', label: 'Attended All Days' });
    }
    return options;
  }, [dayCount, isMultiDay]);

  const filteredAttendance = useMemo(() => {
    if (!attendanceData) return [];
    if (!searchQuery.trim()) return attendanceData;

    const queryWords = searchQuery.trim().toLowerCase().split(/\s+/);
    return attendanceData.filter((record) => {
      const name = record.Members.name.toLowerCase();
      return queryWords.every((word) => name.includes(word));
    });
  }, [attendanceData, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance
            </CardTitle>
            <CardDescription>
              Members who scanned the QR code and marked their attendance.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onManageClick}
              disabled={isEventClosed}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Manage
            </Button>
            <Badge variant="secondary" className="text-sm h-7 px-3">
              {attendanceCount} attendees
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {(isMultiDay || dayOptions.length > 1) && (
            <Select value={selectedDay} onValueChange={onSelectedDayChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-8"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isFetching}
            title="Refresh attendance"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading attendance...</p>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">
              {searchQuery.trim() ? 'No members match your search.' : 'No attendance records yet.'}
            </p>
          </div>
        ) : (
          <>
            {searchQuery.trim() && (
              <p className="text-xs text-muted-foreground mb-3">
                Showing {filteredAttendance.length} of {attendanceCount} attendees
              </p>
            )}

            <ItemGroup>
              {filteredAttendance.map((record) => {
                const member = record.Members;
                const dayNumbers = record.dates
                  .map((d) => getDayNumberFromEffectiveDate(d, eventStart))
                  .sort((a, b) => a - b);

                return (
                  <Item key={member.id} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{member.name}</ItemTitle>
                      <ItemDescription>{member.uni_id}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {isMultiDay &&
                          dayNumbers.map((dayNum) => (
                            <Badge
                              key={dayNum}
                              variant="default"
                              className="tabular-nums text-xs font-semibold px-2 h-7 w-7 flex items-center justify-center rounded-sm"
                            >
                              {dayNum}
                            </Badge>
                          ))}
                      </div>
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          </>
        )}
      </CardContent>
    </Card>
  );
}
