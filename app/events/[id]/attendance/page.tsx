'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

import { useEventAttendance } from '@/hooks/use-event';
import { useEventContext } from '@/contexts/event-context';
import { parseLocalDateTime, getEventDayCount } from '@/lib/utils';

import { QRCodeCard } from './qr-code-card';
import { EventStatusItem } from './event-status-item';
import { AttendanceListCard } from './attendance-list-card';
import { ManageAttendanceDialog } from './manage-attendance-dialog';

export default function EventAttendancePage() {
  const { event, refetch } = useEventContext();
  const { getToken } = useAuth();
  const [selectedDay, setSelectedDay] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);

  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useEventAttendance(event?.id ?? 0, selectedDay, getToken, true);

  if (!event) {
    return null;
  }

  const isEventClosed = event.status === 'closed';
  const eventStart = parseLocalDateTime(event.start_datetime);
  const eventEnd = parseLocalDateTime(event.end_datetime);
  const dayCount = getEventDayCount(eventStart, eventEnd);
  const isMultiDay = dayCount > 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <QRCodeCard eventId={event.id}>
        <EventStatusItem
          event={event}
          isEventClosed={isEventClosed}
          onStatusChange={() => refetch?.()}
          getToken={getToken}
        />
      </QRCodeCard>

      <AttendanceListCard
        eventStart={eventStart}
        isMultiDay={isMultiDay}
        dayCount={dayCount}
        attendanceCount={attendanceData?.attendance_count ?? 0}
        attendanceData={attendanceData?.attendance}
        isLoading={isLoadingAttendance}
        isFetching={isFetchingAttendance}
        onRefresh={() => refetchAttendance()}
        onManageClick={() => setIsMarkAttendanceOpen(true)}
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <ManageAttendanceDialog
        open={isMarkAttendanceOpen}
        onOpenChange={setIsMarkAttendanceOpen}
        eventId={event.id}
        dayCount={dayCount}
        isMultiDay={isMultiDay}
        eventStart={eventStart}
        attendanceData={attendanceData?.attendance}
      />
    </div>
  );
}
