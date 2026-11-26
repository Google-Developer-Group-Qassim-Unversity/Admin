"use client";

import { useState } from "react";

import { useEventAttendance } from "@/hooks/use-event";
import { useEventContext } from "@/contexts/event-context";
import { parseLocalDateTime, getEventDayCount } from "@/lib/utils";

import { QRCodeCard } from "./qr-code-card";
import { EventStatusItem } from "./event-status-item";
import { AttendanceListCard } from "./attendance-list-card";
import { ManageAttendanceDialog } from "./manage-attendance-dialog";
import type { Tab } from "./types";

export default function EventAttendancePage() {
  const { event } = useEventContext();
  const [selectedDay, setSelectedDay] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [manageInitialTab, setManageInitialTab] = useState<Tab>("mark");

  const {
    data: attendanceData,
    isLoading: isLoadingAttendance,
    isFetching: isFetchingAttendance,
    refetch: refetchAttendance,
  } = useEventAttendance(event?.id ?? 0, selectedDay, true);

  if (!event) {
    return null;
  }

  const canRecordAttendance = event.status === "published";
  const eventStart = parseLocalDateTime(event.start_datetime);
  const eventEnd = parseLocalDateTime(event.end_datetime);
  const dayCount = getEventDayCount(eventStart, eventEnd);
  const isMultiDay = dayCount > 1;

  const openManageDialog = (tab: Tab) => {
    setManageInitialTab(tab);
    setIsMarkAttendanceOpen(true);
  };

  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="lg:col-span-2">
        <EventStatusItem
          event={event}
          onOpenCertificates={canRecordAttendance ? () => openManageDialog("emails") : undefined}
        />
      </div>

      <QRCodeCard
        eventId={event.id}
        isMultiDay={isMultiDay}
        dayCount={dayCount}
        disabled={!canRecordAttendance}
      />

      <AttendanceListCard
        eventStart={eventStart}
        isMultiDay={isMultiDay}
        dayCount={dayCount}
        attendanceCount={attendanceData?.attendance_count ?? 0}
        attendanceData={attendanceData?.attendance}
        isLoading={isLoadingAttendance}
        isFetching={isFetchingAttendance}
        onRefresh={() => refetchAttendance()}
        onManageClick={() => openManageDialog("mark")}
        manageDisabled={!canRecordAttendance}
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <ManageAttendanceDialog
        open={isMarkAttendanceOpen}
        onOpenChange={setIsMarkAttendanceOpen}
        initialTab={manageInitialTab}
        eventId={event.id}
        dayCount={dayCount}
        isMultiDay={isMultiDay}
        eventStart={eventStart}
        attendanceData={attendanceData?.attendance}
      />
    </div>
  );
}
