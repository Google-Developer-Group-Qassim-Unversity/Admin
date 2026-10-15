// Who is signed in, for `shoot.mjs --as <persona>`, and the pipeline reads that
// depend on it. Sorts before core.mjs, so these answers win.
//
//   super      a super admin who also leads Mobile Development (the default)
//   design     a Design leader: Design's desk is theirs
//   logistics  a Logistics leader: Logistics' desk and the calendar bans are theirs
//   dept       an AI leader on no team: only their department's requests
//
// Sample data only.

import { ALL_PERMS, DEPARTMENTS, REQUESTS, at, notifications } from "./core.mjs";

const H = 3_600_000;
const SEMESTER = { id: "0192f0aa-0000-7000-8000-000000000001", name: "الفصل الأول 1448", hijri_code: 14481 };

const LEADER_PERMS = [
  "admin.access", "events.view", "club_structure.view", "uploads", "members.view", "events.create", "events.edit",
  "attendance.take", "forms.manage", "submissions.review", "emails.event", "pipeline.request",
];

const PERSONAS = {
  super: { name: "Ibrahim", dept: "mobile", super: true, teams: [] },
  design: { name: "Reem", dept: "design", super: false, teams: ["design"] },
  logistics: { name: "Faisal", dept: "logistics", super: false, teams: ["logistics"] },
  dept: { name: "Noura", dept: "ai", super: false, teams: [] },
};

const TEAM_PERMS = { design: ["pipeline.design"], logistics: ["pipeline.logistics", "pipeline.bans"], media: ["pipeline.media"] };

function who(as) {
  return PERSONAS[as] ?? PERSONAS.super;
}

function permsOf(p) {
  return p.super ? ALL_PERMS : [...LEADER_PERMS, ...p.teams.flatMap((t) => TEAM_PERMS[t])];
}

function access(as) {
  const p = who(as);
  const d = DEPARTMENTS[p.dept];
  return {
    member_id: 1,
    is_staff: true,
    is_super_admin: p.super,
    semester: SEMESTER,
    departments: [
      { id: d.id, name: d.name, ar_name: d.ar_name, roles: ["leader", "member"], permissions: ["events.create", "events.edit", "attendance.take", "pipeline.request"] },
      ...(as === "super" ? [{ id: DEPARTMENTS.ai.id, name: DEPARTMENTS.ai.name, ar_name: DEPARTMENTS.ai.ar_name, roles: ["member"], permissions: [] }] : []),
    ],
    permissions: permsOf(p),
  };
}

const TEAM_OF = { design: "design", logistics: "logistics", media: "media" };

function pipelineMe(as) {
  const p = who(as);
  const own = DEPARTMENTS[p.dept];
  const visible = p.super
    ? Object.values(DEPARTMENTS)
    : [own, ...p.teams.map((t) => DEPARTMENTS[t]).filter((d) => d.id !== own.id)];
  return {
    member_id: 1,
    name: p.name,
    is_super_admin: p.super,
    has_access: true,
    departments: visible.map((d) => {
      const key = Object.keys(DEPARTMENTS).find((k) => DEPARTMENTS[k].id === d.id);
      return { ...d, is_officer: d.id === own.id, teams: TEAM_OF[key] ? [TEAM_OF[key]] : [] };
    }),
    teams: ["design", "logistics", "media"].map((team) => ({ team, department: DEPARTMENTS[team] })),
    own_department_ids: [own.id],
    own_teams: p.teams,
  };
}

const PAST = new Set(["published", "cancelled"]);

/** `/pipeline/requests` with its filters, as the backend applies them. */
function requests({ url, as }) {
  const p = who(as);
  const q = url.searchParams;
  const departments = q.getAll("department_id").map(Number);
  const state = q.get("state");
  const team = q.get("team");
  const teamStatuses = q.getAll("team_status");
  const own = DEPARTMENTS[p.dept].id;
  let items = REQUESTS.filter((r) => {
    if (team) {
      const s = r.task_states.find((x) => x.team === team);
      if (!s || s.status === "brief") return false;
      if (teamStatuses.length && !teamStatuses.includes(s.status)) return false;
      return true;
    }
    if (departments.length) return departments.includes(r.department.id);
    return p.super || r.department.id === own;
  });
  if (q.get("stage")) items = items.filter((r) => r.stage === q.get("stage"));
  else if (state === "past") items = items.filter((r) => PAST.has(r.stage));
  else if (state === "active") items = items.filter((r) => !PAST.has(r.stage));
  else items = items.filter((r) => r.stage !== "cancelled");
  const size = Number(q.get("page_size") || 20);
  return { items: items.slice(0, size), total: items.length, page: 1, page_size: size, total_pages: Math.ceil(items.length / size) || 1 };
}

/** Open and returned team tasks, oldest first: every team for a super admin. */
function inbox({ as }) {
  const p = who(as);
  const teams = p.super ? ["design", "logistics", "media"] : p.teams;
  return REQUESTS.flatMap((r) =>
    r.task_states
      .filter((s) => teams.includes(s.team) && (s.status === "open" || s.status === "returned") && !PAST.has(r.stage))
      .map((s) => ({ request: r, team: s.team, status: s.status, opened_at: s.opened_at })),
  ).sort((a, b) => a.opened_at.localeCompare(b.opened_at));
}

/** A super admin's own notifications are only Mobile's; the club scope is everything. */
function notificationsFor({ as, query }) {
  const p = who(as);
  const own = DEPARTMENTS[p.dept].id;
  const mineIds = new Set([own, ...p.teams.map((t) => DEPARTMENTS[t].id)]);
  const extra = [
    { id: "n6", kind: "dates_banned", department: DEPARTMENTS.mobile, request: { id: "r1", title: REQUESTS[0].title, stage: "draft" }, payload: { reason: "اختبارات" }, created_at: at(-2 * H), read: false },
  ];
  const all = [...extra, ...notifications];
  const items = p.super && query.scope === "club" ? all : all.filter((n) => mineIds.has(n.department.id) || (!p.super && p.teams.length && n.kind === "request_received"));
  return { items, total: items.length, unread: items.filter((n) => !n.read).length, page: 1, page_size: 20, total_pages: 1 };
}

/** `/permissions/me`: where each of the person's permissions comes from. */
function mine({ as }) {
  const p = who(as);
  const d = DEPARTMENTS[p.dept];
  const held = (perm, sources) => ({ permission: perm, sources, granted_by: null, granted_at: null });
  return {
    member: { member_id: 1, name: p.name },
    is_super_admin: p.super,
    is_staff: true,
    semester: { id: SEMESTER.id, name: SEMESTER.name },
    basics: ["admin.access", "events.view", "club_structure.view", "uploads"],
    departments: [
      {
        department_id: d.id,
        name: d.name,
        ar_name: d.ar_name,
        color: d.color,
        icon: d.icon,
        roles: ["leader", "member"],
        permissions: [
          ...["members.view", "events.create", "events.edit", "attendance.take", "forms.manage", "submissions.review", "emails.event"].map((x) => held(x, ["shared"])),
          held("pipeline.request", ["department"]),
          ...p.teams.flatMap((t) => TEAM_PERMS[t]).map((x) => held(x, ["team"])),
        ],
      },
      ...(as === "super"
        ? [{ department_id: DEPARTMENTS.ai.id, name: DEPARTMENTS.ai.name, ar_name: DEPARTMENTS.ai.ar_name, color: DEPARTMENTS.ai.color, icon: DEPARTMENTS.ai.icon, roles: ["member"], permissions: [] }]
        : []),
    ],
    permissions: permsOf(p),
  };
}

export default [
  { path: /^\/access\/me$/, body: ({ as }) => access(as) },
  { path: /^\/pipeline\/me$/, body: ({ as }) => pipelineMe(as) },
  { path: /^\/pipeline\/requests$/, body: requests },
  { path: /^\/pipeline\/inbox$/, body: inbox },
  { path: /^\/pipeline\/notifications$/, body: notificationsFor },
  { path: /^\/permissions\/me$/, body: mine },
];
