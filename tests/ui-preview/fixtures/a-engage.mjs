// Points and email preview fixtures. Sample data only.
//
// Named a-engage so it sorts before core.mjs: GET /events here answers with the
// core events plus the custom (points-only) events the points pages list,
// which is what the real endpoint returns too.

import { EVENTS, at, iso } from "./core.mjs";

const DAY = 86_400_000;
const dt = (days, hour) => `${iso(days)}T${String(hour).padStart(2, "0")}:00:00`;

const custom = (id, name, days, hidden = false) => ({
  id,
  name,
  description: null,
  location_type: hidden ? "hidden" : "none",
  location: "",
  start_datetime: dt(days, 10),
  end_datetime: dt(days, 12),
  status: "closed",
  image_url: null,
  meeting_url: null,
  is_official: true,
  created_at: at(days * DAY),
  attendance_count: 0,
});

const CUSTOM_EVENTS = [
  custom(301, "مشاركة في معرض الأندية", -3),
  custom(302, "تنظيم يوم الترحيب بالطلاب", -9),
  custom(303, "مكافأة أفضل قسم في الشهر", -14, true),
  custom(304, "تغطية هاكاثون الجامعة", -21),
  custom(305, "خصم تأخير تسليم التصاميم", -26, true),
];

const DEPARTMENTS = [
  { id: 11, name: "Mobile Development", ar_name: "تطوير التطبيقات", type: "practical" },
  { id: 12, name: "Artificial Intelligence", ar_name: "الذكاء الاصطناعي", type: "practical" },
  { id: 13, name: "Cybersecurity", ar_name: "الأمن السيبراني", type: "practical" },
  { id: 14, name: "Web Development", ar_name: "تطوير الويب", type: "practical" },
  { id: 21, name: "Design", ar_name: "التصميم", type: "administrative" },
  { id: 22, name: "Logistics", ar_name: "اللوجستيات", type: "administrative" },
  { id: 23, name: "Media", ar_name: "الإعلام", type: "administrative" },
];

const MEMBERS = [
  ["نورة العتيبي", "441100231"],
  ["عبدالله الحربي", "441200118"],
  ["ريم السبيعي", "442100552"],
  ["فهد المطيري", "443100907"],
  ["سارة القحطاني", "442200340"],
  ["محمد الدوسري", "441300771"],
].map(([name, uni], i) => ({
  id: 100 + i,
  name,
  email: `member${i + 1}@qu.edu.sa`,
  phone_number: "05xxxxxxxx",
  uni_id: uni,
  gender: i % 2 ? "male" : "female",
  uni_level: 5,
  uni_college: "الحاسب",
  is_authenticated: 1,
}));

const action = (id, action_name, ar_action_name, action_type, points, usage_count, order, is_hidden = false) => ({
  id,
  action_name,
  ar_action_name,
  action_type,
  points,
  usage_count,
  order,
  is_hidden,
  action_description: "",
});
const ACTIONS = [
  action(1, "Hosting a workshop", "تقديم ورشة عمل", "department", 20, 42, 1),
  action(2, "Organizing an event", "تنظيم فعالية", "department", 15, 31, 2),
  action(3, "Attending an event", "حضور فعالية", "member", 2, 812, 3),
  action(4, "Presenting a session", "تقديم جلسة", "member", 10, 64, 4),
  action(5, "Volunteering", "التطوع", "member", 5, 120, 5),
  action(6, "Best department of the month", "أفضل قسم في الشهر", "bonus", 25, 6, 6, true),
  action(7, "Late design delivery", "تأخير تسليم التصميم", "bonus", -5, 3, 7, true),
  action(8, "Workshop + attendance", "ورشة مع حضور", "composite", 22, 18, 8),
];

const customDepartment = (id) => ({
  event_id: id,
  start_datetime: dt(-3, 10),
  end_datetime: dt(-3, 12),
  event_name: CUSTOM_EVENTS.find((e) => e.id === id)?.name ?? "مشاركة في معرض الأندية",
  point_details: [
    { log_id: 9001, departments_id: [11, 14], points: 15, action_id: 2, action_name: "Organizing an event" },
    { log_id: 9002, departments_id: [23], points: 10, action_id: null, action_name: "تغطية المعرض" },
  ],
});
const customMember = (id) => ({
  event_id: id,
  start_datetime: dt(-3, 10),
  end_datetime: dt(-3, 12),
  event_name: CUSTOM_EVENTS.find((e) => e.id === id)?.name ?? "مشاركة في معرض الأندية",
  point_details: [{ log_id: 9101, member_ids: [100, 101, 102], points: 5, action_id: 5, action_name: "Volunteering" }],
});

const eventDetails = (id) => {
  const e = [...EVENTS, ...CUSTOM_EVENTS].find((x) => String(x.id) === String(id)) ?? CUSTOM_EVENTS[0];
  return {
    event: { ...e },
    actions: [
      { action_id: 2, ar_action_name: "تنظيم فعالية", department_id: 11, department_ar_name: "تطوير التطبيقات" },
      { action_id: 3, ar_action_name: "حضور فعالية", department_id: 11, department_ar_name: "تطوير التطبيقات" },
    ],
  };
};

const log = (id, email_type, minutesAgo, extra) => ({
  id,
  email_type,
  from_address: email_type === "blast" ? "gdg.qu1@gmail.com" : "info@kerneltics.com",
  sent_at: at(-minutesAgo * 60_000),
  sent_by: 1,
  recipient_count: 1,
  data: null,
  member_id: 100,
  event_id: 209,
  member_name: "نورة العتيبي",
  member_email: "member1@qu.edu.sa",
  event_name: "ورشة Git و GitHub",
  event_is_official: 1,
  sender_name: "Ibrahim",
  ...extra,
});
const LOGS = [
  log(5012, "acceptance", 4, { data: { subject: "تم قبولك في ورشة Git و GitHub" } }),
  log(5011, "event-certificate", 18, { member_name: "عبدالله الحربي", member_email: "member2@qu.edu.sa", event_name: "دورة بايثون", event_id: 198 }),
  log(5010, "blast", 42, { recipient_count: 1284, member_id: null, member_name: null, member_email: null, event_id: null, event_name: null, data: { subject: "انطلاق فعاليات الفصل الأول" } }),
  log(5009, "manual-certificate", 95, { member_name: "ريم السبيعي", member_email: "member3@qu.edu.sa", event_name: "ملتقى المبتدئين", event_id: 201 }),
  log(5008, "event_announcement", 180, { recipient_count: 142, member_id: null, member_name: null, member_email: null, event_name: "مقدمة في الحوسبة السحابية", event_id: 211 }),
];

const job = (id, job_type, status, total, succeeded, failed, minutesAgo, extra = {}) => ({
  id,
  job_type,
  status,
  created_by: 1,
  event_id: 198,
  total,
  succeeded,
  failed,
  error: null,
  created_at: at(-minutesAgo * 60_000),
  started_at: status === "queued" ? null : at(-minutesAgo * 60_000 + 20_000),
  finished_at: ["succeeded", "partial", "failed"].includes(status) ? at(-minutesAgo * 60_000 + 240_000) : null,
  ...extra,
});
const JOBS = [
  job(77, "event-certificate", "running", 48, 31, 0, 2),
  job(76, "blast", "succeeded", 1284, 1284, 0, 45, { event_id: null }),
  job(75, "acceptance", "partial", 142, 139, 3, 180, { event_id: 211, error: "3 addresses bounced" }),
  job(74, "direct-email", "failed", 1, 0, 1, 1440, { event_id: null, error: "SMTP authentication failed" }),
  job(73, "custom-email", "succeeded", 86, 86, 0, 2880, { event_id: 209 }),
];

const TEMPLATES = [
  { id: 1, name: "إعلان فعالية", subject: "فعالية جديدة من GDG القصيم", html_content: "<h1>فعالية جديدة</h1><p>سجّل الآن.</p>", preview_text: "سجّل الآن", created_by: 1, created_at: at(-30 * DAY), updated_at: at(-2 * DAY) },
  { id: 2, name: "تذكير قبل الفعالية", subject: "فعاليتك بكرة!", html_content: "<p>نشوفك بكرة.</p>", preview_text: null, created_by: 1, created_at: at(-20 * DAY), updated_at: at(-20 * DAY) },
];

export default [
  { path: /^\/events$/, body: [...EVENTS, ...CUSTOM_EVENTS] },
  { path: /^\/events\/\d+\/details$/, body: ({ pathname }) => eventDetails(pathname.split("/")[2]) },
  { path: /^\/custom\/departments\/\d+$/, body: ({ pathname }) => customDepartment(Number(pathname.split("/").pop())) },
  { path: /^\/custom\/members\/\d+$/, body: ({ pathname }) => customMember(Number(pathname.split("/").pop())) },
  { path: /^\/departments$/, body: DEPARTMENTS },
  { path: /^\/members$/, body: MEMBERS },
  {
    path: /^\/actions$/,
    body: {
      composite_actions: [[ACTIONS[0], ACTIONS[2]]],
      department_actions: ACTIONS.filter((a) => a.action_type === "department"),
      member_actions: ACTIONS.filter((a) => a.action_type === "member"),
      custom_actions: ACTIONS.filter((a) => a.action_type === "bonus"),
    },
  },
  { path: /^\/actions\/all$/, body: ACTIONS },
  { path: /^\/emails\/logs\/enriched$/, body: LOGS },
  // The live stream: refusing it leaves the tab in its "disconnected" state, so
  // the preview shows the static list instead (see email-logs-tab).
  { path: /^\/emails\/logs\/enriched\/stream$/, status: 503, body: { detail: "preview" } },
  { path: /^\/emails\/jobs$/, body: JOBS },
  { path: /^\/emails\/jobs\/unfinished$/, body: JOBS.filter((j) => j.status === "running" || j.status === "queued") },
  { path: /^\/emails\/jobs\/\d+$/, body: ({ pathname }) => JOBS.find((j) => String(j.id) === pathname.split("/").pop()) ?? JOBS[0] },
  { path: /^\/emails\/blast\/templates$/, body: TEMPLATES },
  { path: /^\/emails\/blast\/eligible-count$/, body: { eligible_count: 1102, remaining_capacity: 398 } },
  { path: /^\/emails\/certificate-event\/eligible-count\/\d+$/, body: { eligible_count: 48, eligible_members: [], sent_count: 0 } },
  { path: /^\/emails\/stats\/dashboard$/, body: { addresses: { "info@kerneltics.com": { usage: 412 }, "gdg.qu1@gmail.com": { usage: 1290 } }, by_type: { acceptance: 210, "event-certificate": 132, blast: 1284, "manual-certificate": 4 }, total_24h: 342 } },
];

