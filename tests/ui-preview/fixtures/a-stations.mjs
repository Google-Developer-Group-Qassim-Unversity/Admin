// A request's stations, as each persona sees them (`shoot.mjs --as ...`).
// The detail's `can_edit` and `actions` follow the backend's rules for who is
// asking, and two requests exist only to be acted on:
//
//   r11  a Mobile draft with nothing missing: Submit answers with the request
//        in review, so `--click` on Submit shows the page moving forward
//   r12  Web's request in review with Design and Logistics both open
//
// Sorts after a-roles.mjs (whose personas it reads) and before core.mjs.
// Sample data only.

import { DEPARTMENTS, at, detail, iso } from "./core.mjs";

const H = 3_600_000;

// Who each persona is: their own department and team (mirrors a-roles.mjs, plus Media).
const PERSONAS = {
  super: { dept: DEPARTMENTS.mobile.id, teams: [], super: true },
  design: { dept: DEPARTMENTS.design.id, teams: ["design"] },
  logistics: { dept: DEPARTMENTS.logistics.id, teams: ["logistics"] },
  media: { dept: DEPARTMENTS.media.id, teams: ["media"] },
  dept: { dept: DEPARTMENTS.ai.id, teams: [] },
};

const EXTRA = {
  r11: {
    id: "r11",
    department: DEPARTMENTS.mobile,
    stage: "draft",
    title: "تطبيقات Flutter مع Firebase",
    start_date: iso(14),
    end_date: iso(14),
    hold_expires_at: at(20 * H),
    tasks: [
      { team: "design", status: "brief" },
      { team: "logistics", status: "brief" },
    ],
  },
  r12: {
    id: "r12",
    department: DEPARTMENTS.web,
    stage: "in_review",
    title: "أساسيات TypeScript",
    // Online, so Logistics' confirmation offers to make the Meet link.
    mode: "online",
    start_date: iso(19),
    end_date: iso(19),
    hold_expires_at: null,
    tasks: [
      { team: "design", status: "open" },
      { team: "logistics", status: "open" },
    ],
  },
};

function base(id) {
  const extra = EXTRA[id];
  if (!extra) return detail(id);
  // Build on another request of the same stage, then make it this one.
  const d = detail(extra.stage === "draft" ? "r1" : "r2");
  const tasks = extra.tasks.map((t) => {
    const like = d.tasks.find((x) => x.team === t.team) ?? {};
    return {
      ...like,
      ...t,
      opened_at: t.status === "brief" ? null : at(-7 * H),
      deliverable:
        t.team === "logistics" && t.status !== "brief"
          ? { ...like.deliverable, start_date: extra.start_date, end_date: extra.end_date, day_modes: { [extra.start_date]: extra.mode ?? "on_site" }, meet_link: null }
          : null,
      deliverable_missing: t.team === "design" && t.status !== "done" ? ["poster.poster_url"] : [],
      brief:
        t.team === "design"
          ? { design_type: "poster", size: "portrait", file_type: "png", content_status: "final", idea: "خلفية داكنة وشعار Firebase.", content: "تطبيقات Flutter مع Firebase\nالثلاثاء ٦ مساءً\nالتيك فالي", image_links: ["https://drive.google.com/file/d/firebase-logo"] }
          : { venue: "التيك فالي (60)", room: "قاعة 3", services: ["organizing"], venue_needs: ["devices", "internet"], buses_needed: false, notes: "نحتاج شاشة إضافية." },
    };
  });
  return {
    ...d,
    ...extra,
    details: { ...d.details, title: extra.title, presenter_email: "noura@example.com", day_modes: { [extra.start_date]: extra.mode ?? "on_site" } },
    tasks,
    task_states: tasks.map((t) => ({ team: t.team, status: t.status, opened_at: t.opened_at, done_at: null })),
    missing: [],
    history: d.history.slice(0, 1),
  };
}

/** The request's controls for whoever is asking, as `_actions` in the backend's pipeline_requests.py gives them. */
function forPersona(d, as) {
  const p = PERSONAS[as] ?? PERSONAS.super;
  const requester = p.super || d.department.id === p.dept;
  const open = (team) => d.tasks.find((t) => t.team === team)?.status === "open";
  const onTeam = (team) => p.super || p.teams.includes(team);
  const complete = ["design", "logistics", "media"].filter((team) => open(team) && onTeam(team));
  return {
    ...d,
    can_edit: requester && (d.stage === "draft" || d.stage === "returned"),
    actions: {
      ...d.actions,
      can_submit: requester && d.stage === "draft",
      can_resubmit: requester && d.stage === "returned",
      complete,
      can_return: open("design") && onTeam("design") && d.return_count === 0 && (d.id === "r2" || d.id === "r12"),
      can_upload_poster: onTeam("design") && d.tasks.some((t) => t.team === "design" && t.status !== "brief") && d.stage !== "published",
      can_publish: (requester && d.stage === "ready") || (p.super && ["in_review", "media", "ready"].includes(d.stage)),
      can_cancel: requester && !["published", "cancelled"].includes(d.stage),
      can_delete: requester && d.stage === "cancelled",
      can_generate_meet: open("logistics") && onTeam("logistics"),
    },
    missing: requester ? d.missing : [],
  };
}

function submitted(id) {
  const d = base(id);
  const tasks = d.tasks.map((t) => ({ ...t, status: "open", opened_at: at(0) }));
  return {
    ...d,
    stage: "in_review",
    hold_expires_at: null,
    submitted_at: at(0),
    submitted_by: { member_id: 1, name: "Ibrahim" },
    return_deadline: at(48 * H),
    tasks,
    task_states: tasks.map((t) => ({ team: t.team, status: t.status, opened_at: t.opened_at, done_at: null })),
  };
}

export default [
  { path: /^\/pipeline\/requests\/(r11|r12)$/, body: ({ pathname, as }) => forPersona(base(pathname.split("/").pop()), as) },
  { path: /^\/pipeline\/requests\/[\w-]+$/, body: ({ pathname, as }) => forPersona(detail(pathname.split("/").pop()), as) },
  { method: "POST", path: /^\/pipeline\/requests\/[\w-]+\/submit$/, body: ({ pathname, as }) => forPersona(submitted(pathname.split("/")[3]), as) },
];
