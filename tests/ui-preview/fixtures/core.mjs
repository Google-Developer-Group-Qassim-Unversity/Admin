// Shared preview fixtures: who is signed in, the pipeline, events, and the
// dashboard's numbers. Sample data only. Dates are relative to today so the
// pipeline's clocks and the calendar always look current.
//
// Add an area's fixtures in its own file (fixtures/<area>.mjs) rather than
// here, so parallel work does not collide.

const DAY = 86_400_000;
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
export const iso = (days) => new Date(today.getTime() + days * DAY).toISOString().slice(0, 10);
export const at = (ms) => new Date(Date.now() + ms).toISOString();
const H = 3_600_000;

export const DEPARTMENTS = {
  mobile: { id: 11, name: "Mobile Development", ar_name: "تطوير التطبيقات", color: "#34A853", icon: "smartphone" },
  ai: { id: 12, name: "Artificial Intelligence", ar_name: "الذكاء الاصطناعي", color: "#4285F4", icon: "brain" },
  cyber: { id: 13, name: "Cybersecurity", ar_name: "الأمن السيبراني", color: "#EA4335", icon: "shield" },
  web: { id: 14, name: "Web Development", ar_name: "تطوير الويب", color: "#FBBC04", icon: "globe" },
  design: { id: 21, name: "Design", ar_name: "التصميم", color: "#A142F4", icon: "palette" },
  logistics: { id: 22, name: "Logistics", ar_name: "اللوجستيات", color: "#F29900", icon: "truck" },
  media: { id: 23, name: "Media", ar_name: "الإعلام", color: "#12B5CB", icon: "megaphone" },
};

const ALL_PERMS = [
  "admin.access", "events.view", "members.view", "club_structure.view", "events.create", "events.edit", "events.delete",
  "attendance.take", "attendance.backfill", "attendance.copy", "forms.manage", "submissions.review", "emails.event",
  "emails.direct", "emails.blast", "emails.logs", "certificates.manual", "points.catalogue", "points.custom",
  "members.create", "members.edit", "club_structure.manage", "permissions.manage", "semesters.manage",
  "pipeline.request", "pipeline.bans", "pipeline.design", "pipeline.logistics", "pipeline.media",
];

const access = {
  member_id: 1,
  is_staff: true,
  is_super_admin: true,
  semester: { id: "0192f0aa-0000-7000-8000-000000000001", name: "الفصل الأول 1448", hijri_code: 14481 },
  departments: [{ id: 11, name: "Mobile Development", ar_name: "تطوير التطبيقات", role: "leader", permissions: ALL_PERMS }],
  permissions: ALL_PERMS,
};

const pipelineMe = {
  member_id: 1,
  name: "Ibrahim",
  is_super_admin: true,
  has_access: true,
  // A super admin acts for every department; the roster (access/me) says Mobile is their own.
  departments: Object.entries(DEPARTMENTS).map(([key, d]) => ({
    ...d,
    is_officer: key === "mobile",
    teams: ["design", "logistics", "media"].includes(key) ? [key] : [],
  })),
  teams: [
    { team: "design", department: DEPARTMENTS.design },
    { team: "logistics", department: DEPARTMENTS.logistics },
    { team: "media", department: DEPARTMENTS.media },
  ],
};

function summary(id, dept, stage, title, start, end, extra = {}) {
  return {
    id,
    department: DEPARTMENTS[dept],
    stage,
    title,
    start_date: start,
    end_date: end,
    hold_expires_at: null,
    undated_reason: null,
    requested_at: at(-3 * DAY),
    ...extra,
  };
}

export const REQUESTS = [
  summary("r1", "mobile", "draft", "مقدمة في Flutter", iso(10), iso(11), { hold_expires_at: at(14 * H + 32 * 60_000) }),
  summary("r7", "mobile", "in_review", "واجهات Material 3 عمليًا", iso(17), iso(17)),
  summary("r6", "mobile", "published", "مسابقة البرمجة التنافسية", iso(6), iso(6)),
  summary("r3", "ai", "returned", "هاكاثون القصيم للذكاء الاصطناعي", iso(18), iso(20)),
  summary("r2", "cyber", "in_review", "ورشة أمن الشبكات اللاسلكية", iso(12), iso(12)),
  summary("r4", "web", "media", "لقاء مطوري الويب", iso(13), iso(13)),
  summary("r5", "ai", "ready", "معسكر تحليل البيانات", iso(23), iso(27)),
];
const byId = Object.fromEntries(REQUESTS.map((r) => [r.id, r]));

const TASKS = {
  r1: [
    { team: "design", status: "brief" },
    { team: "logistics", status: "brief" },
  ],
  r7: [
    { team: "design", status: "done", done_by: { member_id: 5, name: "Reem Alharbi" } },
    { team: "logistics", status: "open" },
  ],
  r6: [
    { team: "design", status: "done" },
    { team: "logistics", status: "done" },
    { team: "media", status: "done" },
  ],
  r3: [
    { team: "design", status: "returned" },
    { team: "logistics", status: "done" },
  ],
  r2: [
    { team: "design", status: "open" },
    { team: "logistics", status: "done" },
  ],
  r4: [
    { team: "design", status: "done" },
    { team: "logistics", status: "done" },
    { team: "media", status: "open" },
  ],
  r5: [
    { team: "design", status: "done" },
    { team: "logistics", status: "done" },
    { team: "media", status: "done" },
  ],
};

// A stand-in poster: a mud-coloured square with the title area, as a data URI.
const POSTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#2b4a7e"/><rect x="60" y="60" width="480" height="300" fill="#f8f3ea"/><rect x="60" y="400" width="300" height="40" fill="#d39a1c"/><rect x="60" y="460" width="220" height="24" fill="#f8f3ea"/></svg>');

function confirmation(s) {
  return {
    start_date: s.start_date,
    end_date: s.end_date,
    day_modes: s.start_date ? { [s.start_date]: "on_site", ...(s.end_date && s.end_date !== s.start_date ? { [s.end_date]: "online" } : {}) } : null,
    daily_start_time: "18:00:00",
    daily_end_time: "20:00:00",
    venue: "التيك فالي (60)",
    room: "قاعة 2",
    meet_link: s.end_date && s.end_date !== s.start_date ? "https://meet.google.com/abc-defg-hij" : null,
    event_type: "workshop",
    description: "وصف الفعالية.",
  };
}

const HISTORY = (s) => [
  { action: "booked", at: at(-4 * DAY), actor: { member_id: 1, name: "Ibrahim" }, details: { start_date: s.start_date, end_date: s.end_date } },
  { action: "submitted", at: at(-2 * DAY), actor: { member_id: 1, name: "Ibrahim" }, details: null },
  { action: "brief_edited", at: at(-40 * H), actor: { member_id: 1, name: "Ibrahim" }, details: { team: "design", after_submit: true } },
  { action: "returned", at: at(-30 * H), actor: { member_id: 5, name: "Reem Alharbi" }, details: { notes: "أضيفوا أسماء المتحدثين." } },
  { action: "resubmitted", at: at(-26 * H), actor: { member_id: 1, name: "Ibrahim" }, details: { late_days: 0 } },
  { action: "poster_uploaded", at: at(-20 * H), actor: { member_id: 5, name: "Reem Alharbi" }, details: { replaced: false } },
  { action: "task_done", at: at(-19 * H), actor: { member_id: 5, name: "Reem Alharbi" }, details: { team: "design" } },
  { action: "hold_expired", at: at(-10 * H), actor: null, details: null },
];

function detail(id) {
  const s = byId[id] ?? REQUESTS[0];
  const draft = s.stage === "draft";
  return {
    ...s,
    requested_by: { member_id: 1, name: "Ibrahim" },
    submitted_by: draft ? null : { member_id: 1, name: "Ibrahim" },
    returned_by: s.stage === "returned" ? { member_id: 5, name: "Reem Alharbi" } : null,
    published_at: s.stage === "published" ? at(-DAY) : null,
    published_by: s.stage === "published" ? { member_id: 9, name: "Abdullah" } : null,
    history: draft ? [{ action: "booked", at: at(-3 * DAY), actor: { member_id: 1, name: "Ibrahim" }, details: { start_date: s.start_date, end_date: s.end_date } }] : HISTORY(s),
    details: {
      title: s.title,
      description: draft ? "ورشة عملية نبني فيها أول تطبيق Flutter من الصفر." : "وصف الفعالية.",
      event_type: "workshop",
      presenter_name: "نورة العتيبي",
      presenter_email: draft ? null : "noura@example.com",
      day_modes: s.start_date ? { [s.start_date]: "on_site", ...(s.end_date && s.end_date !== s.start_date ? { [s.end_date]: "online" } : {}) } : null,
      daily_start_time: "18:00",
      daily_end_time: "20:00",
      is_official: true,
      location_scope: "inside",
      audience: "mixed",
      registration: "acceptance",
      expected_accepted: 60,
      help_needed: null,
    },
    partners: [],
    within_official_hours: false,
    submitted_at: draft ? null : at(-2 * DAY),
    updated_at: at(-H),
    event_id: s.stage === "published" ? 214 : null,
    can_edit: draft || s.stage === "returned",
    tasks: (TASKS[id] ?? []).map((t) => ({
      brief: t.team === "design" ? { design_type: "poster", size: "square", file_type: "png", content_status: draft ? undefined : "final", idea: "ألوان التطبيق، ونفس روح شعار GDG." } : t.team === "logistics" ? { venue: draft ? null : "التيك فالي (60)", services: ["organizing", "volunteers"], venue_needs: ["devices", "internet"], buses_needed: false } : null,
      brief_version: 1,
      opened_at: t.status === "brief" ? null : at(-DAY),
      done_at: t.status === "done" ? at(-5 * H) : null,
      done_by: t.done_by ?? (t.status === "done" ? { member_id: 7, name: "Sara" } : null),
      deliverable: t.status === "brief" ? null : t.team === "design" ? (t.status === "done" ? { poster_url: POSTER } : null) : t.team === "logistics" ? confirmation(s) : null,
      deliverable_missing: t.team === "design" && t.status !== "done" ? ["poster.poster_url"] : [],
      ...t,
    })),
    missing: draft ? ["details.presenter_email", "design.content", "logistics.venue"] : [],
    returned_at: s.stage === "returned" ? at(-6 * H) : null,
    return_count: s.stage === "returned" ? 1 : 0,
    return_notes: s.stage === "returned" ? "المحتوى ناقص: أضيفوا أسماء الحكّام وجدول الأيام الثلاثة." : null,
    return_due_at: s.stage === "returned" ? at(6 * H + 10 * 60_000) : null,
    return_deadline: s.stage === "in_review" ? at(2 * DAY) : null,
    penalty: null,
    actions: {
      can_submit: false,
      can_return: id === "r2",
      can_resubmit: s.stage === "returned",
      complete: id === "r2" ? ["design"] : id === "r7" ? ["logistics"] : id === "r4" ? ["media"] : [],
      can_publish: s.stage === "ready",
      can_upload_poster: id === "r2",
    },
    now: new Date().toISOString(),
  };
}

function calendar({ from, to }) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const days = [];
  const bookings = {};
  for (const r of REQUESTS) {
    if (!r.start_date) continue;
    for (let d = new Date(`${r.start_date}T00:00:00Z`); d <= new Date(`${(r.end_date || r.start_date)}T00:00:00Z`); d = new Date(d.getTime() + DAY)) {
      bookings[d.toISOString().slice(0, 10)] = r;
    }
  }
  const banned = { [iso(9)]: "اختبارات منتصف الفصل", [iso(16)]: "إجازة رسمية" };
  for (let d = start; d <= end; d = new Date(d.getTime() + DAY)) {
    const date = d.toISOString().slice(0, 10);
    const r = bookings[date];
    let status = date < iso(4) ? "locked" : "open";
    if (banned[date]) status = "banned";
    if (r) status = r.stage === "published" ? "published" : r.stage === "draft" ? "held" : "booked";
    days.push({
      date,
      status,
      reason: banned[date] ?? null,
      requests: r ? [{ id: r.id, department: r.department, title: r.title, stage: r.stage }] : [],
    });
  }
  return { today: iso(0), first_bookable_date: iso(4), days };
}

const inbox = [
  { request: byId.r2, team: "design", status: "open", opened_at: at(-DAY) },
  { request: byId.r7, team: "logistics", status: "open", opened_at: at(-5 * H) },
  { request: byId.r4, team: "media", status: "open", opened_at: at(-2 * H) },
];

const notification = (id, kind, req, ago, read) => ({
  id,
  kind,
  department: byId[req].department,
  request: { id: req, title: byId[req].title, stage: byId[req].stage },
  payload: null,
  created_at: at(-ago),
  read,
});
const notifications = [
  notification("n1", "request_received", "r2", DAY, false),
  notification("n2", "task_done", "r7", 3 * H, false),
  notification("n3", "returned", "r3", 6 * H, false),
  notification("n4", "ready_to_publish", "r5", 26 * H, true),
  notification("n5", "media_received", "r4", 30 * H, true),
];

const dt = (days, hour) => `${iso(days)}T${String(hour).padStart(2, "0")}:00:00`;
export const EVENTS = [
  { id: 209, name: "ورشة Git و GitHub", description: "أساسيات التحكم بالإصدارات.", location_type: "on-site", location: "التيك فالي", start_datetime: dt(-1, 18), end_datetime: dt(0, 20), status: "active", image_url: null, meeting_url: null, is_official: true, created_at: at(-20 * DAY), department_id: 14, department_name: "Web Development", department_ar_name: "تطوير الويب", attendance_count: 86 },
  { id: 211, name: "مقدمة في الحوسبة السحابية", description: null, location_type: "online", location: "Google Meet", start_datetime: dt(3, 19), end_datetime: dt(3, 21), status: "open", image_url: null, meeting_url: null, is_official: true, created_at: at(-9 * DAY), department_id: 12, department_name: "Artificial Intelligence", department_ar_name: "الذكاء الاصطناعي", attendance_count: 0 },
  { id: 212, name: "أساسيات اختبار الاختراق", description: null, location_type: "on-site", location: "معمل الأمن السيبراني", start_datetime: dt(6, 17), end_datetime: dt(6, 19), status: "open", image_url: null, meeting_url: null, is_official: false, created_at: at(-7 * DAY), department_id: 13, department_name: "Cybersecurity", department_ar_name: "الأمن السيبراني", attendance_count: 0 },
  { id: 214, name: "مسابقة البرمجة التنافسية", description: null, location_type: "on-site", location: "مسرح شطر الطلاب", start_datetime: dt(6, 16), end_datetime: dt(6, 21), status: "draft", image_url: null, meeting_url: null, is_official: true, created_at: at(-DAY), department_id: 11, department_name: "Mobile Development", department_ar_name: "تطوير التطبيقات", attendance_count: 0 },
  { id: 201, name: "ملتقى المبتدئين", description: null, location_type: "on-site", location: "بيت الثقافة", start_datetime: dt(-4, 18), end_datetime: dt(-3, 20), status: "active", image_url: null, meeting_url: null, is_official: true, created_at: at(-30 * DAY), department_id: 11, department_name: "Mobile Development", department_ar_name: "تطوير التطبيقات", attendance_count: 112 },
  { id: 198, name: "دورة بايثون", description: null, location_type: "online", location: "Google Meet", start_datetime: dt(-12, 18), end_datetime: dt(-2, 20), status: "closed", image_url: null, meeting_url: null, is_official: true, created_at: at(-40 * DAY), department_id: 12, department_name: "Artificial Intelligence", department_ar_name: "الذكاء الاصطناعي", attendance_count: 48 },
];

export default [
  { path: /^\/access\/me$/, body: access },
  { path: /^\/access\/events\/\d+$/, body: ({ match }) => ({ event_id: Number(match[0].split("/").pop()), permissions: ALL_PERMS }) },
  { path: /^\/pipeline\/me$/, body: pipelineMe },
  { path: /^\/pipeline\/calendar$/, body: ({ query }) => calendar(query) },
  // A super admin sees every department's requests.
  { path: /^\/pipeline\/requests$/, body: { items: REQUESTS, total: REQUESTS.length, page: 1, page_size: 20, total_pages: 1 } },
  { path: /^\/pipeline\/requests\/[\w-]+$/, body: ({ pathname }) => detail(pathname.split("/").pop()) },
  { path: /^\/pipeline\/inbox$/, body: inbox },
  { path: /^\/pipeline\/notifications$/, body: { items: notifications, total: 5, unread: 3, page: 1, page_size: 20, total_pages: 1 } },
  { path: /^\/events$/, body: EVENTS },
  { path: /^\/events\/paginated$/, body: { items: EVENTS, total: EVENTS.length, page: 1, page_size: 12, total_pages: 1 } },
  { path: /^\/events\/\d+$/, body: ({ pathname }) => EVENTS.find((e) => String(e.id) === pathname.split("/").pop()) ?? EVENTS[0] },
  { path: /^\/emails\/stats\/dashboard$/, body: { addresses: {}, by_type: { acceptance: 210, certificate: 132 }, total_24h: 342 } },
  { path: /^\/members\/stats$/, body: { total: 1284, authenticated: 1102, manual: 182, male: 640, female: 644 } },
];
