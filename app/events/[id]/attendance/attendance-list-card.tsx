'use client';

import { useMemo } from 'react';
import { Search, Users, Loader2, RefreshCw, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MemberDetailsTrigger } from '@/components/member-details';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { AttendanceRecord } from '@/lib/api-types';
import { getDayNumberFromEffectiveDate } from './utils';
import { useFuzzySearch } from '@/lib/search-utils';
import { useFormatter, useTranslations } from 'next-intl';
import { parseLocalDateTime } from '@/lib/utils';

const emptyAttendance: AttendanceRecord[] = [];

interface AttendanceListCardProps {
  eventStart: Date;
  isMultiDay: boolean;
  dayCount: number;
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
  const t = useTranslations('attendance.listCard');
  const format = useFormatter();
  const dayOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    if (isMultiDay) {
      for (let i = 1; i <= dayCount; i++) {
        options.push({ value: String(i), label: t('day', { number: i }) });
      }
    }
    options.push({ value: 'all', label: t('allDays') });
    if (isMultiDay) {
      options.push({ value: 'exclusive_all', label: t('attendedAllDays') });
    }
    return options;
  }, [dayCount, isMultiDay, t]);

  const filteredAttendance = useFuzzySearch(
    attendanceData ?? emptyAttendance,
    searchQuery,
    ['Member.name', 'Member.uni_id', 'Member.email'],
  );

  const showDaySelect = isMultiDay || dayOptions.length > 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <Users className="h-5 w-5 text-muted-foreground" />
          {t('title')}
        </CardTitle>
        <CardDescription className="text-[13px] sm:text-sm">{t('description')}</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="tabular h-7 px-3 text-sm">
            {t('attendeesCount', { count: attendanceCount })}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* Phone: search + refresh, then day filter + manage. sm+: one row
            (the wrappers dissolve with `contents`). */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex gap-2 sm:contents">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={t('searchByName')}
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="ps-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isFetching}
              title={t('refresh')}
              aria-label={t('refresh')}
              className="shrink-0 pointer-coarse:size-10"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className={`grid gap-2 sm:contents ${showDaySelect ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showDaySelect && (
              <Select value={selectedDay} onValueChange={onSelectedDayChange}>
                <SelectTrigger className="w-full sm:order-first sm:w-[180px]">
                  <SelectValue placeholder={t('selectDay')} />
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
            <Button variant="outline" onClick={onManageClick} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              {t('manage')}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mb-3 h-8 w-8 animate-spin" />
            <p className="text-sm">{t('loading')}</p>
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="mb-3 h-10 w-10 opacity-40" />
            <p className="text-sm">
              {searchQuery.trim() ? t('noMatchSearch') : t('noneYet')}
            </p>
          </div>
        ) : (
          <>
            {searchQuery.trim() && (
              <p className="mb-3 text-[13px] text-muted-foreground tabular">
                {t('showingOf', { shown: filteredAttendance.length, total: attendanceCount })}
              </p>
            )}

            <ul className="divide-y divide-border overflow-hidden rounded-xl border">
              {filteredAttendance.map((record) => {
                const member = record.Member;
                const dayNumbers = record.dates
                  .map((d) => getDayNumberFromEffectiveDate(d, eventStart))
                  .sort((a, b) => a - b);
                const latest = record.dates.length
                  ? record.dates
                      .map((d) => parseLocalDateTime(d))
                      .reduce((a, b) => (b.getTime() > a.getTime() ? b : a))
                  : null;

                return (
                  <li key={member.id} className="flex min-h-14 items-center gap-3 px-3 py-2.5 sm:px-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium"><bdi><MemberDetailsTrigger member={member} /></bdi></p>
                      <p className="truncate text-[13px] text-muted-foreground">
                        <span className="tabular" dir="ltr">
                          {member.uni_id ?? member.email}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {latest && !Number.isNaN(latest.getTime()) && (
                        <time
                          dateTime={latest.toISOString()}
                          className="tabular text-[13px] text-muted-foreground"
                        >
                          {format.dateTime(latest, { hour: 'numeric', minute: '2-digit' })}
                        </time>
                      )}
                      {isMultiDay && dayNumbers.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {dayNumbers.map((dayNum) => (
                            <span
                              key={dayNum}
                              title={t('day', { number: dayNum })}
                              className="tabular inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-brand-green-soft px-1 text-xs font-semibold text-brand-green-ink"
                            >
                              {dayNum}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
