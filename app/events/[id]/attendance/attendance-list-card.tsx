'use client';

import { useMemo } from 'react';
import { Search, Users, RefreshCw, UserPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { SectionHead } from '@/components/najdi';
import { MemberDetailsTrigger } from '@/components/member-details';
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
    <section aria-labelledby="attendance-list" className="flex flex-col gap-3">
      <SectionHead
        id="attendance-list"
        title={t('title')}
        action={<span className="tabular text-ink-2 font-bold">{t('attendeesCount', { count: attendanceCount })}</span>}
      />
      <p className="text-ink-2 -mt-1 text-[13.5px]">{t('description')}</p>
      <div>
        {/* Phone: search + refresh, then day filter + manage. sm+: one row
            (the wrappers dissolve with `contents`). */}
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex gap-2 sm:contents">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
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
              className="shrink-0"
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
              <UserPlus />
              {t('manage')}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <ul className="flex flex-col" aria-busy="true" aria-label={t('loading')}>
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="border-rule flex min-h-14 items-center gap-3 border-b px-1 py-2.5">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-4 w-14" />
              </li>
            ))}
          </ul>
        ) : filteredAttendance.length === 0 ? (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyDescription>{searchQuery.trim() ? t('noMatchSearch') : t('noneYet')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {searchQuery.trim() && (
              <p className="mb-3 text-[13px] text-ink-2 tabular">
                {t('showingOf', { shown: filteredAttendance.length, total: attendanceCount })}
              </p>
            )}

            <ul className="flex flex-col">
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
                  <li key={member.id} className="border-rule flex min-h-14 items-center gap-3 border-b px-1 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold"><bdi><MemberDetailsTrigger member={member} /></bdi></p>
                      <p className="truncate text-[13px] text-ink-2">
                        <span className="tabular" dir="ltr">
                          {member.uni_id ?? member.email}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {latest && !Number.isNaN(latest.getTime()) && (
                        <time
                          dateTime={latest.toISOString()}
                          className="tabular text-[13px] text-ink-2"
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
                              className="tabular inline-flex h-6 min-w-6 items-center justify-center rounded-sm bg-door-green px-1 text-xs font-bold text-on-door"
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
      </div>
    </section>
  );
}
