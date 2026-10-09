// Events area preview fixtures: event details, forms, responses, attendance,
// and the lookups the event form needs. Sample data only.
import { EVENTS, iso } from "./core.mjs";

const NAMES = [
  ["عبدالله القحطاني", "Male", 4, "كلية الحاسب"],
  ["نورة العتيبي", "Female", 6, "كلية الحاسب"],
  ["فيصل الشمري", "Male", 2, "كلية الهندسة"],
  ["ريم الحربي", "Female", 5, "كلية العلوم"],
  ["سعد الدوسري", "Male", 7, "كلية الحاسب"],
  ["لمى المطيري", "Female", 3, "كلية إدارة الأعمال"],
  ["خالد الرشيدي", "Male", 8, "كلية الحاسب"],
  ["هيا السبيعي", "Female", 1, "كلية الحاسب"],
  ["تركي العنزي", "Male", 5, "كلية الهندسة"],
  ["جود الزهراني", "Female", 4, "كلية العلوم"],
];

export const MEMBERS = NAMES.map(([name, gender, level, college], i) => ({
  id: 300 + i,
  name,
  email: `member${i + 1}@qu.edu.sa`,
  phone_number: `05${String(51234567 + i * 7919).slice(0, 8)}`,
  uni_id: String(441100000 + i * 137),
  clerk_user_id: i % 3 === 0 ? null : `user_${i}`,
  gender,
  uni_level: level,
  uni_college: college,
  is_authenticated: i % 3 === 0 ? 0 : 1,
  created_at: `${iso(-200 + i)}T10:00:00`,
  updated_at: `${iso(-10)}T10:00:00`,
  last_activity: `${iso(-i)}T12:00:00`,
}));

const submissions = (eventId) =>
  MEMBERS.map((member, i) => ({
    member,
    submission_id: 9000 + i,
    submitted_at: `${iso(-6 + Math.floor(i / 3))}T${String(9 + i).padStart(2, "0")}:12:00`,
    form_type: "registration",
    submission_type: "none",
    is_accepted: i < 6,
    is_invited: i < 4,
    google_submission_value: "",
    event_id: eventId,
    form_id: 70,
    google_form_id: "",
  }));

const attendance = (eventId, type) => {
  const event = EVENTS.find((e) => e.id === eventId) ?? EVENTS[0];
  const day1 = event.start_datetime.slice(0, 10);
  const day2 = event.end_datetime.slice(0, 10);
  if (type === "count") return { attendance_count: event.attendance_count ?? 0, attendance: [] };
  return {
    attendance_count: 7,
    attendance: MEMBERS.slice(0, 7).map((m, i) => ({
      Member: { ...m },
      dates: i < 4 && day1 !== day2 ? [`${day1}T18:${String(10 + i).padStart(2, "0")}:00`, `${day2}T18:05:00`] : [`${day1}T18:${String(20 + i).padStart(2, "0")}:00`],
    })),
  };
};

const details = (eventId) => {
  const e = EVENTS.find((x) => x.id === eventId) ?? EVENTS[0];
  return {
    event: {
      id: e.id,
      name: e.name,
      description: e.description ?? "ورشة عملية خطوة بخطوة.",
      location_type: e.location_type,
      location: e.location,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      status: e.status,
      image_url: e.image_url,
      is_official: e.is_official ? 1 : 0,
      created_at: e.created_at,
    },
    actions: [
      { action_id: 1, ar_action_name: "إقامة ورشة عمل", department_id: e.department_id ?? 14, department_ar_name: e.department_ar_name ?? "تطوير الويب" },
      { action_id: 5, ar_action_name: "حضور ورشة عمل", department_id: e.department_id ?? 14, department_ar_name: e.department_ar_name ?? "تطوير الويب" },
    ],
  };
};

const action = (id, name, ar, type, points) => ({ id, action_name: name, ar_action_name: ar, action_type: type, action_description: "", points });

export default [
  {
    path: /^\/events\/\d+\/history$/,
    body: {
      items: [
        { action: "created", at: new Date(Date.now() - 9 * 86_400_000).toISOString(), actor: { member_id: 1, name: "Ibrahim" }, details: null },
        { action: "edited", at: new Date(Date.now() - 5 * 86_400_000).toISOString(), actor: { member_id: 1, name: "Ibrahim" }, details: { name: ["ورشة Git", "ورشة Git و GitHub"], description: ["", "أساسيات التحكم بالإصدارات."] } },
        { action: "status_changed", at: new Date(Date.now() - 2 * 86_400_000).toISOString(), actor: { member_id: 9, name: "Abdullah" }, details: { status: ["open", "active"] } },
        { action: "attendance_marked", at: new Date(Date.now() - 3_600_000).toISOString(), actor: { member_id: 9, name: "Abdullah" }, details: { members: [{ member_id: 3, name: "سارة" }, { member_id: 4, name: "خالد" }] } },
      ],
      pipeline_request_id: "r6",
    },
  },
  { path: /^\/events\/\d+\/details$/, body: ({ pathname }) => details(Number(pathname.split("/")[2])) },
  {
    path: /^\/events\/\d+\/form$/,
    body: ({ pathname }) => ({
      id: 70,
      event_id: Number(pathname.split("/")[2]),
      form_type: "registration",
      google_form_id: null,
      google_watch_id: null,
      google_responders_url: null,
      admin_google_email: null,
      granted_emails: [],
      google_form_schema: null,
    }),
  },
  { path: /^\/events\/submissions\/\d+$/, body: ({ pathname }) => submissions(Number(pathname.split("/").pop())) },
  { path: /^\/attendance\/\d+$/, body: ({ pathname, query }) => attendance(Number(pathname.split("/").pop()), query.type) },
  { path: /^\/emails\/certificate-event\/eligible-count\/\d+$/, body: { eligible: 48, total: 52 } },
  {
    path: /^\/departments$/,
    body: [
      { id: 11, name: "Mobile Development", ar_name: "تطوير التطبيقات", type: "practical" },
      { id: 12, name: "Artificial Intelligence", ar_name: "الذكاء الاصطناعي", type: "practical" },
      { id: 13, name: "Cybersecurity", ar_name: "الأمن السيبراني", type: "practical" },
      { id: 14, name: "Web Development", ar_name: "تطوير الويب", type: "practical" },
      { id: 21, name: "Design", ar_name: "التصميم", type: "administrative" },
    ],
  },
  {
    path: /^\/actions$/,
    body: {
      composite_actions: [[action(1, "Host a workshop", "إقامة ورشة عمل", "department", 20), action(5, "Attend a workshop", "حضور ورشة عمل", "member", 5)]],
      department_actions: [action(1, "Host a workshop", "إقامة ورشة عمل", "department", 20), action(2, "Host a course", "إقامة دورة", "department", 40)],
      member_actions: [action(5, "Attend a workshop", "حضور ورشة عمل", "member", 5), action(6, "Attend a course", "حضور دورة", "member", 10)],
      custom_actions: [],
    },
  },
  {
    path: /^\/semesters$/,
    body: [
      { id: "0192f0aa-0000-7000-8000-000000000001", term: "first", hijri_year: 1448, academic_year_start: 2026, hijri_code: 481, gregorian_code: 261, name: "Fall 2026", start_date: "2026-08-23", end_date: "2026-12-31", is_current: true, is_public: true },
      { id: "0192f0aa-0000-7000-8000-000000000002", term: "second", hijri_year: 1447, academic_year_start: 2025, hijri_code: 472, gregorian_code: 252, name: "Spring 2026", start_date: "2026-01-11", end_date: "2026-05-28", is_current: false, is_public: true },
    ],
  },
];
