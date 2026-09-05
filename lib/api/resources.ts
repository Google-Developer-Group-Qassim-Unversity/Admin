import { format } from "date-fns";

import type { Requester } from "@/lib/api/request";
import type {
  ActionsResponse,
  AttendanceResponse,
  AttendanceType,
  BackfillMember,
  BackfillResponse,
  CertificateEligibleCount,
  CreateEventPayload,
  Department,
  Event,
  EventDetails,
  EventStatus,
  Form,
  SendCertificatesResponse,
  UpdateEventPayload,
  UpdateFormPayload,
} from "@/lib/api-types";

export interface EventsFilters {
  semester?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * The endpoints this app calls, grouped by what they are about.
 *
 * Migrated from the flat list of one-line wrappers in `lib/api.ts`. Each entry
 * here is the URL and the payload shape and nothing else - the token, the
 * headers, the query string and the error handling all live in `Requester`, so
 * adding an endpoint is one line rather than a new exported function with its
 * own optional `getToken` parameter to forget.
 *
 * Resources are migrated a group at a time; anything still exported from
 * `lib/api.ts` has not moved yet.
 */
export function createApi(request: Requester) {
  const events = {
    list: (filters?: EventsFilters) =>
      request.json<Event[]>("/events/", {
        query: {
          semester: filters?.semester === "all" ? undefined : filters?.semester,
          start_date: filters?.startDate ? format(filters.startDate, "yyyy-MM-dd") : undefined,
          end_date: filters?.endDate ? format(filters.endDate, "yyyy-MM-dd") : undefined,
        },
      }),

    get: (id: number | string) => request.json<Event>(`/events/${id}`),

    details: (id: number | string) => request.json<EventDetails>(`/events/${id}/details`),

    create: (payload: CreateEventPayload) => request.json<Event>("/events", { method: "POST", body: payload }),

    update: (id: number, payload: UpdateEventPayload) =>
      request.json<Event>(`/events/${id}`, { method: "PUT", body: payload }),

    updatePartial: (id: number, payload: Partial<Event>) =>
      request.json<Event>(`/events/${id}`, { method: "PATCH", body: payload }),

    updateMeetingUrl: (id: number, meetingUrl: string | null) =>
      request.json<Event>(`/events/${id}/meeting-url`, { method: "PUT", body: { meeting_url: meetingUrl } }),

    setStatus: (id: number, status: EventStatus) =>
      request.json<Event>(`/events/${id}/status`, { method: "PUT", body: { status } }),

    remove: (id: number) => request.json<{ detail: string }>(`/events/${id}`, { method: "DELETE" }),

    /** Events that can carry certificates - the placeholder location types cannot. */
    withCertificates: async () => {
      const all = await events.list();
      return all.filter((event) => event.location_type !== "none" && event.location_type !== "hidden");
    },
  };

  // The status transitions, named for what they mean rather than for the value
  // they write. `publish` and `openResponses` both set "open"; keeping both
  // names is deliberate, they are different actions to an admin.
  const eventStatus = {
    publish: (id: number) => events.setStatus(id, "open"),
    unpublish: (id: number) => events.setStatus(id, "draft"),
    closeResponses: (id: number) => events.setStatus(id, "active"),
    openResponses: (id: number) => events.setStatus(id, "open"),
    close: (id: number) => events.setStatus(id, "closed"),
    reopen: (id: number) => events.setStatus(id, "active"),
  };

  const attendance = {
    forEvent: (eventId: number, day: string, type: AttendanceType = "detailed") =>
      request.json<AttendanceResponse>(`/attendance/${eventId}`, { query: { type, day } }),

    markManual: (eventId: number, memberIds: number[], days?: number[]) =>
      request.json<{ success: number; failed: number }>(`/attendance/${eventId}/manual`, {
        method: "POST",
        body: { member_ids: memberIds, days },
      }),

    removeManual: (eventId: number, memberIds: number[], day?: number) =>
      request.json<{ success: number; failed: number }>(`/attendance/${eventId}/manual`, {
        method: "DELETE",
        body: { member_ids: memberIds, day },
      }),

    copy: (eventId: number, sourceDay: number, targetDays: number[]) =>
      request.json<{ copied: number; skipped: number }>(`/attendance/${eventId}/copy`, {
        method: "POST",
        body: { source_day: sourceDay, target_days: targetDays },
      }),

    backfill: (eventId: number, members: BackfillMember[], day: number) =>
      request.json<BackfillResponse>(`/attendance/${eventId}/backfill`, {
        method: "POST",
        body: { members, day },
      }),
  };

  const certificates = {
    sendForEvent: (eventId: number) =>
      request.json<SendCertificatesResponse>(`/emails/${eventId}`, { method: "POST" }),

    eligibleCount: (eventId: number) =>
      request.json<CertificateEligibleCount>(`/emails/certificate-event/eligible-count/${eventId}`),
  };

  const actions = {
    list: () => request.json<ActionsResponse>("/actions"),
  };

  const departments = {
    list: () => request.json<Department[]>("/departments"),
  };

  const forms = {
    forEvent: (eventId: number) => request.json<Form>(`/events/${eventId}/form/`),

    update: (formId: number, payload: UpdateFormPayload) =>
      request.json<Form>(`/forms/${formId}/`, { method: "PUT", body: payload }),
  };

  return { events, eventStatus, attendance, certificates, actions, departments, forms };
}

export type Api = ReturnType<typeof createApi>;
