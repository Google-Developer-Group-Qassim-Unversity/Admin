// Preview fixtures for people and system pages: members, club structure,
// permissions, semesters. Sample data only.

const NAMES = [
  "إبراهيم السكيتي", "نورة العتيبي", "ريم الحربي", "عبدالله الشمري", "سارة القحطاني", "فهد المطيري",
  "لمى الدوسري", "خالد الرشيدي", "هيا السبيعي", "محمد العنزي", "Omar Haddad", "جود الزهراني",
];

export const MEMBERS = NAMES.map((name, i) => ({
  id: i + 1,
  name,
  email: `member${i + 1}@qu.edu.sa`,
  phone_number: `05${String(51234567 + i * 7919).slice(0, 8)}`,
  uni_id: String(441100000 + i * 3571),
  gender: i % 2 ? "Female" : "Male",
  uni_level: (i % 8) + 1,
  uni_college: i % 3 ? "كلية الحاسب" : "كلية الهندسة",
  is_authenticated: i % 4 === 3 ? 0 : 1,
  created_at: "2025-09-01T10:00:00",
  updated_at: "2026-09-20T10:00:00",
  last_activity: i % 5 === 4 ? null : `2026-10-0${(i % 8) + 1}T18:00:00`,
}));

const ref = (id) => ({ id, name: MEMBERS[id - 1].name });

const SEMESTERS = [
  { id: "0192f0aa-0000-7000-8000-000000000001", term: "first", hijri_year: 1448, academic_year_start: 2026, hijri_code: 481, gregorian_code: 261, name: "Fall 2026", start_date: "2026-08-23", end_date: "2026-12-31", is_current: true, is_public: true },
  { id: "0192f0aa-0000-7000-8000-000000000003", term: "summer", hijri_year: 1447, academic_year_start: 2025, hijri_code: 475, gregorian_code: 253, name: "Summer 2026", start_date: "2026-06-14", end_date: "2026-08-10", is_current: false, is_public: false },
  { id: "0192f0aa-0000-7000-8000-000000000002", term: "second", hijri_year: 1447, academic_year_start: 2025, hijri_code: 472, gregorian_code: 252, name: "Spring 2026", start_date: "2026-01-11", end_date: "2026-05-28", is_current: false, is_public: true },
];

const ROLES = [
  { id: "role-leader", key: "leader", name: "Leader", ar_name: "قائد", max_holders: 1, sort_order: 1 },
  { id: "role-vp", key: "vp", name: "VP", ar_name: "نائب", max_holders: 2, sort_order: 2 },
  { id: "role-member", key: "member", name: "Member", ar_name: "عضو", max_holders: null, sort_order: 3 },
];

const dept = (id, name, ar_name, type, color, icon, extra = {}) => ({
  id, name, ar_name, type, color, icon, active: true, show_in_leaderboard: true, is_club_leadership: false,
  created_at: "2025-09-01T10:00:00", updated_at: "2026-09-01T10:00:00", semester_name: null, semester_ar_name: null, ...extra,
});

const CARDS = [
  { ...dept(1, "Leadership", "القيادة", "administrative", "#3b82f6", "crown", { is_club_leadership: true, show_in_leaderboard: false }), member_count: 2, roles: [{ key: "leader", max_holders: 2, holders: [ref(1), ref(4)] }] },
  { ...dept(11, "Mobile Development", "تطوير التطبيقات", "practical", "#22c55e", "smartphone"), member_count: 24, roles: [{ key: "leader", max_holders: 1, holders: [ref(1)] }, { key: "vp", max_holders: 2, holders: [ref(3), ref(6)] }] },
  { ...dept(12, "Artificial Intelligence", "الذكاء الاصطناعي", "practical", "#8b5cf6", "brain"), member_count: 31, roles: [{ key: "leader", max_holders: 1, holders: [ref(5)] }, { key: "vp", max_holders: 2, holders: [ref(8)] }] },
  { ...dept(21, "Design", "التصميم", "administrative", "#ec4899", "palette"), member_count: 12, roles: [{ key: "leader", max_holders: 1, holders: [ref(3)] }, { key: "vp", max_holders: 2, holders: [] }] },
  { ...dept(22, "Logistics", "اللوجستيات", "administrative", "#eab308", "truck"), member_count: 18, roles: [{ key: "leader", max_holders: 1, holders: [] }, { key: "vp", max_holders: 2, holders: [ref(10), ref(12)] }] },
  { ...dept(31, "Board", "المجلس", "administrative", "#14b8a6", "users", { show_in_leaderboard: false, active: false }), member_count: 5, roles: [] },
];

const overview = {
  semester: { id: SEMESTERS[0].id, hijri_code: 481, gregorian_code: 261, name: "Fall 2026", start_date: "2026-08-23", end_date: "2026-12-31" },
  departments: CARDS,
  available_departments: [{ id: 41, name: "Cloud", ar_name: "الحوسبة السحابية" }],
  roles: ROLES,
  total_members: 87,
};

const roster = (id) => {
  const card = CARDS.find((c) => c.id === id) ?? CARDS[1];
  const officers = new Map();
  for (const seat of card.roles) for (const h of seat.holders) officers.set(h.id, [...(officers.get(h.id) ?? []), seat.key]);
  const ids = [...new Set([...officers.keys(), 2, 7, 9, 11])];
  return ids.map((mid) => ({ member: ref(mid), roles: [...(officers.get(mid) ?? []), "member"], added_at: "2026-09-02T10:00:00" }));
};

const CATALOGUE = [
  ["admin.access", "club", "Open the admin app", "فتح لوحة الإدارة"],
  ["events.view", "club", "View events", "عرض الفعاليات"],
  ["members.view", "club", "View members", "عرض الأعضاء"],
  ["club_structure.view", "club", "View the club structure", "عرض هيكلة النادي"],
  ["uploads", "club", "Upload files", "رفع الملفات"],
  ["events.create", "dept", "Create events", "إنشاء الفعاليات"],
  ["events.edit", "dept", "Edit events", "تعديل الفعاليات"],
  ["events.delete", "dept", "Delete events", "حذف الفعاليات"],
  ["attendance.take", "dept", "Take attendance", "تسجيل الحضور"],
  ["attendance.backfill", "dept", "Backfill attendance", "استدراك الحضور"],
  ["attendance.copy", "club", "Copy attendance", "نسخ الحضور"],
  ["forms.manage", "dept", "Manage forms", "إدارة النماذج"],
  ["submissions.review", "dept", "Review registrations", "مراجعة التسجيلات"],
  ["emails.event", "dept", "Email an event's attendees", "مراسلة حضور الفعالية"],
  ["emails.direct", "club", "Send direct emails", "إرسال رسائل مباشرة"],
  ["emails.blast", "club", "Send blast emails", "إرسال رسائل جماعية"],
  ["emails.logs", "club", "Read email logs", "سجل الرسائل"],
  ["certificates.manual", "club", "Send certificates by hand", "إرسال الشهادات يدويًا"],
  ["points.catalogue", "club", "Manage the points catalogue", "إدارة فئات النقاط"],
  ["points.custom", "club", "Grant custom points", "منح نقاط مخصصة"],
  ["members.create", "club", "Add members", "إضافة أعضاء"],
  ["club_structure.manage_roster", "dept", "Manage the roster", "إدارة أعضاء القسم"],
  ["club_structure.manage", "club", "Manage the club structure", "إدارة هيكلة النادي"],
  ["semesters.manage", "club", "Manage semesters", "إدارة الفصول"],
  ["permissions.grant", "dept", "Grant permissions", "منح الصلاحيات"],
  ["permissions.manage", "club", "Manage permissions", "إدارة الصلاحيات"],
  ["pipeline.request", "dept", "Request events", "طلب الفعاليات"],
  ["pipeline.bans", "club", "Close calendar days", "إغلاق أيام التقويم"],
  ["pipeline.design", "club", "Design team work", "مهام التصميم"],
  ["pipeline.logistics", "club", "Logistics team work", "مهام اللوجستيات"],
  ["pipeline.media", "club", "Media team work", "مهام الإعلام"],
  ["cache.reset", "club", "Rebuild the leaderboard", "إعادة بناء لوحة الصدارة"],
  ["forms.admin", "club", "Administer Google Forms", "إدارة نماذج Google"],
  ["settings.template_form", "club", "Template form", "النموذج القالب"],
].map(([key, scope, label, ar_label]) => ({ key, scope, label, ar_label }));

const SHARED = ["admin.access", "events.view", "club_structure.view", "uploads", "members.view", "events.create", "events.edit", "attendance.take", "submissions.review", "pipeline.request", "permissions.grant", "emails.event"];
const assignments = {
  shared: SHARED,
  departments: CARDS.filter((c) => !c.is_club_leadership).map((c) => ({
    department_id: c.id, name: c.name, ar_name: c.ar_name,
    permissions: [...SHARED, ...(c.id === 22 ? ["pipeline.bans", "pipeline.logistics"] : c.id === 21 ? ["pipeline.design"] : [])],
  })),
};

const person = (id) => ({ member_id: id, name: MEMBERS[id - 1].name });
const grants = {
  department_id: 11,
  grantable: ["attendance.take", "attendance.backfill", "emails.event", "submissions.review", "forms.manage"],
  members: [2, 7, 9, 11].map(person),
  grants: [
    { id: "g1", member: person(2), permission: "attendance.take", granted_by: person(1), granted_at: "2026-09-12T10:00:00Z", revoked_by: null, revoked_at: null },
    { id: "g2", member: person(7), permission: "submissions.review", granted_by: person(3), granted_at: "2026-09-20T10:00:00Z", revoked_by: null, revoked_at: null },
  ],
};

const memberAccess = (id) => ({
  member: person(id),
  is_super_admin: false,
  is_staff: true,
  semester: { id: SEMESTERS[0].id, name: "Fall 2026" },
  basics: ["admin.access", "events.view", "club_structure.view", "uploads"],
  departments: [
    {
      department_id: 11, name: "Mobile Development", ar_name: "تطوير التطبيقات", color: "#22c55e", icon: "smartphone", roles: ["vp", "member"],
      permissions: [
        ...["members.view", "events.create", "events.edit", "attendance.take", "submissions.review", "pipeline.request", "permissions.grant"].map((p) => ({ permission: p, sources: ["shared"], granted_by: null, granted_at: null })),
        { permission: "attendance.backfill", sources: ["grant"], granted_by: person(1), granted_at: "2026-09-14T10:00:00Z" },
      ],
    },
    {
      department_id: 21, name: "Design", ar_name: "التصميم", color: "#ec4899", icon: "palette", roles: ["leader", "member"],
      permissions: [
        { permission: "pipeline.design", sources: ["team", "department"], granted_by: null, granted_at: null },
        { permission: "events.create", sources: ["shared"], granted_by: null, granted_at: null },
      ],
    },
  ],
  permissions: [
    "admin.access", "events.view", "club_structure.view", "uploads", "members.view", "events.create", "events.edit",
    "attendance.take", "attendance.backfill", "submissions.review", "pipeline.request", "pipeline.design", "permissions.grant",
  ],
});

export default [
  { path: /^\/members$/, body: MEMBERS },
  { path: /^\/members\/paginated$/, body: ({ query }) => ({ items: MEMBERS, total: 1284, page: Number(query.page || 1), page_size: Number(query.page_size || 50), total_pages: 26 }) },
  { path: /^\/members\/\d+$/, body: ({ pathname }) => MEMBERS[(Number(pathname.split("/").pop()) - 1) % MEMBERS.length] },
  { path: /^\/semesters$/, body: SEMESTERS },
  { path: /^\/club-structure$/, body: overview },
  { path: /^\/club-structure\/departments\/\d+$/, body: ({ pathname }) => CARDS.find((c) => String(c.id) === pathname.split("/").pop()) ?? CARDS[1] },
  { path: /^\/club-structure\/departments\/\d+\/roster$/, body: ({ pathname }) => roster(Number(pathname.split("/")[3])) },
  { path: /^\/permissions\/catalogue$/, body: CATALOGUE },
  { path: /^\/permissions\/assignments$/, body: assignments },
  { path: /^\/permissions\/super-admins$/, body: [
    { ...person(1), added_at: "2025-09-01T10:00:00Z", added_by: null },
    { ...person(4), added_at: "2026-02-03T10:00:00Z", added_by: person(1) },
  ] },
  { path: /^\/permissions\/departments\/\d+\/grants$/, body: grants },
  { path: /^\/permissions\/members\/\d+$/, body: ({ pathname }) => memberAccess(Number(pathname.split("/").pop())) },
];
