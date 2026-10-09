// Preview-only entry: the real pages inside the real AppShell, routed by
// location.pathname. Bundled by shoot.mjs; never part of the Next.js app.
import { createRoot } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

import { AppShell } from "@/components/app-shell";
import { DirectionProvider } from "@/components/direction-provider";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-provider";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

import DashboardPage from "@/app/page";
import PipelinePage from "@/app/pipeline/page";
import PipelineRequestPage from "@/app/pipeline/requests/[id]/page";
import { EventsContent } from "@/app/events/events-content";
import CreateEventPage from "@/app/events/create/page";
import { EventLayoutContent } from "@/app/events/[id]/event-layout-content";
import EventInfoPage from "@/app/events/[id]/page";
import EventManagePage from "@/app/events/[id]/manage/page";
import EventResponsesPage from "@/app/events/[id]/responses/page";
import EventAttendancePage from "@/app/events/[id]/attendance/page";
import EventEditPage from "@/app/events/[id]/edit/page";
import { ManageMembersContent } from "@/app/manage-members/manage-members-content";
import { ClubStructureContent } from "@/app/club-structure/club-structure-content";
import CreateDepartmentPage from "@/app/club-structure/create/page";
import PermissionsPage from "@/app/permissions/page";
import PointsLayout from "@/app/points/layout";
import PointsPage from "@/app/points/page";
import PointsDetailPage from "@/app/points/[id]/page";
import PointsCreatePage from "@/app/points/create/page";
import PointsCustomPage from "@/app/points/custom/page";
import PointsFullPage from "@/app/points/full/page";
import PointsManagePage from "@/app/points/manage/page";
import ManageEmailsPage from "@/app/manage-emails/page";
import SettingsPage from "@/app/settings/page";
import SemestersPage from "@/app/settings/semesters/page";

function event(Page) {
  return function EventRoute({ id }) {
    return (
      <EventLayoutContent eventId={id}>
        <Page />
      </EventLayoutContent>
    );
  };
}
function points(Page) {
  return function PointsRoute() {
    return (
      <PointsLayout>
        <Page />
      </PointsLayout>
    );
  };
}

/** Most specific first. `:id` segments become useParams(). */
const ROUTES = [
  ["/", DashboardPage],
  ["/pipeline", PipelinePage],
  ["/pipeline/requests/:id", PipelineRequestPage],
  ["/events", EventsContent],
  ["/events/create", CreateEventPage],
  ["/events/:id", event(EventInfoPage)],
  ["/events/:id/manage", event(EventManagePage)],
  ["/events/:id/responses", event(EventResponsesPage)],
  ["/events/:id/attendance", event(EventAttendancePage)],
  ["/events/:id/edit", event(EventEditPage)],
  ["/manage-members", ManageMembersContent],
  ["/club-structure", ClubStructureContent],
  ["/club-structure/create", CreateDepartmentPage],
  ["/permissions", PermissionsPage],
  ["/points", points(PointsPage)],
  ["/points/create", PointsCreatePage],
  ["/points/custom", points(PointsCustomPage)],
  ["/points/full", points(PointsFullPage)],
  ["/points/manage", points(PointsManagePage)],
  ["/points/:id", PointsDetailPage],
  ["/manage-emails", ManageEmailsPage],
  ["/settings", SettingsPage],
  ["/settings/semesters", SemestersPage],
];

function match(pathname) {
  const parts = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  for (const [pattern, Page] of ROUTES) {
    const want = pattern.split("/").filter(Boolean);
    if (want.length !== parts.length) continue;
    const params = {};
    if (want.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = parts[i]), true) : seg === parts[i])))
      return { Page, params };
  }
  return { Page: function Missing() { return <p>No preview route for {pathname}</p>; }, params: {} };
}

const search = new URLSearchParams(location.search);
const locale = search.get("locale") || "ar";
const theme = search.get("theme") || "light";
const dir = locale === "ar" ? "rtl" : "ltr";
document.documentElement.lang = locale;
document.documentElement.dir = dir;

const { Page, params } = match(location.pathname);
window.__PREVIEW_PARAMS__ = params;

createRoot(document.getElementById("root")).render(
  <NextIntlClientProvider locale={locale} messages={locale === "ar" ? ar : en} timeZone="Asia/Riyadh">
    <ThemeProvider attribute="class" forcedTheme={theme} enableSystem={false} disableTransitionOnChange>
      <DirectionProvider dir={dir}>
        <QueryProvider>
          <AppShell>
            <Page {...params} />
          </AppShell>
          <Toaster />
        </QueryProvider>
      </DirectionProvider>
    </ThemeProvider>
  </NextIntlClientProvider>,
);
