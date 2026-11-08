// Sample deletion review data. Never calls a live backend.
import { MEMBERS } from "./events.mjs";
const resources = [
  { key: "submissions", count: 24 },
  { key: "members_logs", count: 7 },
  { key: "departments_logs", count: 1 },
  { key: "forms", count: 1 },
  { key: "logs", count: 2 },
  { key: "event_content_links", count: 3 },
];
export default [
  {
    path: /^\/events\/\d+\/deletion-impact$/,
    body: ({ pathname }) => ({
      event_id: Number(pathname.split("/")[2]),
      event_name: "ورشة Git و GitHub",
      resources,
      total: 1 + resources.reduce((sum, r) => sum + r.count, 0),
      retained_notifications: 0,
    }),
  },
  {
    path: /^\/events\/\d+\/deletion-impact\/[^/]+$/,
    body: ({ pathname, query }) => {
      const resource = pathname.split("/").pop();
      const total = resources.find((r) => r.key === resource)?.count ?? 0;
      const page = Number(query.page ?? 1);
      return {
        page,
        page_size: 20,
        total,
        items: Array.from(
          { length: Math.min(20, Math.max(0, total - (page - 1) * 20)) },
          (_, i) => ({
            id: String(9000 + (page - 1) * 20 + i),
            label: MEMBERS[i % MEMBERS.length].name,
            details:
              resource === "submissions"
                ? {
                    submitted_at: "2026-10-09T12:30:00",
                    is_accepted: i < 6 ? "1" : "0",
                  }
                : { date: "2026-10-10T18:00:00" },
          }),
        ),
      };
    },
  },
  {
    method: "DELETE",
    path: /^\/events\/\d+$/,
    body: { detail: "Event deleted successfully" },
  },
];
