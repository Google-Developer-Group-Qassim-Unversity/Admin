// The Mail page's outbox: GET /emails/sends (one row per send), a send's
// details, and today's capacity for the composer. Sample data only; times are
// relative to now so the day groups read "today", "yesterday", then dates.
//
//   node tests/ui-preview/shoot.mjs --routes /manage-emails --viewports phone,desktop --locales ar,en --themes light,dark
//   ... --click "main li button"          the details drawer of the newest send
//   ... --click "text=New email"          the composer (use --locales en; "رسالة جديدة" in ar)
//   ... --fill "main input[type=search]=نورة"   the person lookup

import { MEMBERS } from "./people.mjs";

const H = 3_600_000;
const DAY = 24 * H;
// The API's times are naive Riyadh-local strings (UTC+3, no offset): keep the sample that shape.
const at = (ms) => new Date(Date.now() + ms + 3 * H).toISOString().slice(0, 19);
const GMAIL = "gdg.qu1@gmail.com";
const KERNELTICS = "info@kerneltics.com";

const SENDERS = [
  { id: 1, name: "إبراهيم السكيتي" },
  { id: 3, name: "ريم الحربي" },
  { id: 4, name: "عبدالله الشمري" },
  { id: 6, name: "فهد المطيري" },
];

const EVENTS = {
  girls: { id: 214, name: "لقاء أعضاء قوقل للطالبات" },
  gpa: { id: 212, name: "Upgrade Your GPA" },
  esports: { id: 211, name: "بطولة الألعاب الإلكترونية | Quick Series" },
  security: { id: 209, name: "التهديدات الأمنية للذكاء الاصطناعي" },
  microbit: { id: 198, name: "Introduction to micro:bit" },
};

const HTML = (title, body) => `<!DOCTYPE html><html dir="rtl" lang="ar"><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 12px">
<div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #e2e8f0">
<img src="https://www.gdg-q.com/gdg.png" width="56" alt="GDG" />
<h1 style="font-size:22px;color:#0f172a">${title}</h1>
<p style="font-size:15px;line-height:1.8;color:#334155">${body}</p>
<a href="https://gdg-q.com" style="display:inline-block;background:#1a73e8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">التفاصيل</a>
</div></div></body></html>`;

let nextId = 400;
const send = (kind, status, total, ago, extra = {}) => {
  const succeeded = extra.succeeded ?? (status === "succeeded" ? total : status === "failed" ? 0 : total);
  const failed = extra.failed ?? (status === "failed" ? total : 0);
  return {
    id: nextId--,
    kind,
    status,
    subject: null,
    event: null,
    sender: SENDERS[0],
    total,
    succeeded,
    failed,
    created_at: at(-ago),
    finished_at: status === "queued" || status === "running" ? null : at(-ago + 4 * 60_000),
    from_addresses: [{ address: GMAIL, count: succeeded + failed }],
    ...extra,
  };
};

const SENDS = [
  send("event-certificate", "running", 17, 0.3 * H, { succeeded: 11, failed: 0, event: EVENTS.girls, sender: SENDERS[1], from_addresses: [{ address: GMAIL, count: 11 }] }),
  send("team-notification", "succeeded", 25, 0.9 * H, { subject: "طلب فعالية رجع لك: ورشة Flutter" }),
  send("event-message", "succeeded", 21, 1 * DAY + 2 * H, { subject: "[Name]، تذكير: [Event Name] بكرة الساعة 7", event: EVENTS.gpa, sender: SENDERS[2] }),
  send("acceptance", "succeeded", 32, 1 * DAY + 5 * H, { subject: "تم قبولك في بطولة الألعاب الإلكترونية", event: EVENTS.esports, sender: SENDERS[1] }),
  send("event-certificate", "partial", 67, 3 * DAY, { succeeded: 65, failed: 2, event: EVENTS.security, sender: SENDERS[3] }),
  send("acceptance", "succeeded", 74, 3 * DAY + 6 * H, { subject: "تم قبولك في التهديدات الأمنية للذكاء الاصطناعي", event: EVENTS.security, sender: SENDERS[3] }),
  send("direct", "failed", 1, 4 * DAY, { subject: "بخصوص شهادة التطوع", sender: SENDERS[0] }),
  send("campaign", "failed", 7, 5 * DAY, { failed: 0, from_addresses: [] }),
  send("event-message", "partial", 300, 6 * DAY, { succeeded: 150, failed: 150, subject: "تغيير موعد ورشة micro:bit", event: EVENTS.microbit, sender: SENDERS[2] }),
  send("event-certificate", "succeeded", 80, 9 * DAY, { succeeded: 1, event: EVENTS.microbit, sender: SENDERS[1] }),
  send("event-certificate", "succeeded", 43, 10 * DAY, { succeeded: 0, event: EVENTS.gpa, from_addresses: [] }),
  send("campaign", "succeeded", 2457, 11 * DAY, {
    subject: "[Name]، دعوة لزيارة بوث GDG Qassim | [Event Name] معرض مشارق",
    sender: SENDERS[2],
    from_addresses: [{ address: GMAIL, count: 500 }, { address: KERNELTICS, count: 1957 }],
  }),
  send("manual-certificate", "succeeded", 3, 12 * DAY, { event: EVENTS.microbit, sender: SENDERS[0] }),
  send("team-notification", "succeeded", 4, 12 * DAY + 3 * H, { subject: "طلب جديد بانتظار التصميم" }),
  // Older history, so "show more" has a second page.
  ...Array.from({ length: 26 }, (_, i) =>
    send(i % 3 ? "event-certificate" : "acceptance", i === 22 ? "running" : "succeeded", 20 + ((i * 7) % 40), (14 + i * 2) * DAY, {
      ...(i === 22 ? { succeeded: 3, failed: 0 } : {}),
      event: Object.values(EVENTS)[i % 5],
      subject: i % 3 ? null : `تم قبولك في ${Object.values(EVENTS)[i % 5].name}`,
      sender: SENDERS[i % 4],
    }),
  ),
];

const KIND_FILTER = {
  campaign: ["campaign"],
  certificate: ["event-certificate", "manual-certificate"],
  acceptance: ["acceptance"],
  "event-message": ["event-message"],
  direct: ["direct"],
  "team-notification": ["team-notification"],
};

/** Who each send went to: a slice of the sample members, the same people every time. */
const recipientsOf = (s) =>
  s.kind === "campaign" && !s.subject ? [] : Array.from({ length: Math.min(s.succeeded + s.failed, 140) }, (_, i) => {
    const m = MEMBERS[(s.id + i) % MEMBERS.length];
    return { name: m.name, email: i < MEMBERS.length ? m.email : `student${s.id}${i}@qu.edu.sa`, member_id: i < MEMBERS.length ? m.id : null };
  });

const failuresOf = (s) =>
  recipientsOf(s)
    .slice(0, s.failed)
    .map((r, i) => ({
      recipient: r.email,
      error: i % 2 ? "550 5.1.1 The email account that you tried to reach does not exist." : "421 4.7.0 Try again later, closing connection.",
    }));

const contentOf = (s) => {
  if (!s.subject) return null;
  if (s.kind === "event-certificate" || s.kind === "manual-certificate") return null;
  return {
    subject: s.kind === "event-message" ? null : s.subject,
    preview_text: s.kind === "campaign" ? "بوث النادي يوم الأحد في مركز المؤتمرات" : null,
    html_content: s.kind === "direct" ? null : HTML(s.subject, "يسعدنا نشوفك معنا. التفاصيل كاملة في الرابط تحت.") +
      '<script>window.mailXss = true</script><img onerror="window.mailXss = true" src="x"><svg onload="alert(1)"></svg><a href="javascript:alert(1)">unsafe</a><iframe srcdoc="unsafe"></iframe><meta http-equiv="refresh" content="0;url=https://example.com"><form action="https://example.com"><input autofocus onfocus="alert(1)"></form>',
    attachments: s.kind === "campaign" ? [{ filename: "خريطة-المعرض.pdf", url: "https://example.com/map.pdf" }] : [],
  };
};

const detail = (s) => ({ ...s, recipients: recipientsOf(s), failures: failuresOf(s), content: contentOf(s) });

function list({ query }) {
  let items = query.kind ? SENDS.filter((s) => KIND_FILTER[query.kind]?.includes(s.kind)) : SENDS.filter((s) => s.kind !== "team-notification");
  if (query.member_id || query.email) {
    items = items.filter((s) =>
      recipientsOf(s).some((r) => String(r.member_id) === query.member_id || r.email === query.email),
    );
  }
  if (query.before) items = items.filter((s) => s.id < Number(query.before));
  const limit = Number(query.limit || 30);
  const page = items.slice(0, limit);
  return { items: page, next_before: items.length > limit ? page.at(-1).id : null };
}

const initialSends = [...SENDS];
let queuedId = 1000;
/** Each screenshot/flow starts with the same history, including after a queued-send check. */
export function reset() {
  SENDS.splice(0, SENDS.length, ...initialSends);
  queuedId = 1000;
}
export function queue(kind, body) {
  const total = kind === "campaign" ? body.count + body.guaranteed_recipients.length : body.recipients.length;
  const item = send(kind, "queued", total, 0, { id: queuedId++, subject: body.subject, succeeded: 0, failed: 0, from_addresses: [] });
  SENDS.unshift(item);
  return { message: "Queued", recipient_count: total, guaranteed_count: body.guaranteed_recipients?.length ?? 0, algorithmic_count: body.count ?? 0, job_id: item.id };
}

/** Finish a fixture job without mutating the reset snapshot. */
export function finish(id) {
  const index = SENDS.findIndex((s) => s.id === id);
  const s = SENDS[index];
  SENDS[index] = { ...s, status: "succeeded", succeeded: s.total, failed: 0, finished_at: at(0) };
}

export default [
  { path: /^\/emails\/sends$/, body: list },
  { path: /^\/emails\/sends\/\d+$/, body: ({ pathname }) => detail(SENDS.find((s) => String(s.id) === pathname.split("/").pop()) ?? SENDS[0]) },
  { path: /^\/emails\/blast\/eligible-count$/, body: { eligible_count: 3951, remaining_capacity: 2184 } },
  { method: "POST", path: /^\/emails\/blast$/, body: ({ body }) => queue("campaign", body) },
  { method: "POST", path: /^\/emails\/direct$/, body: ({ body }) => queue("direct", body) },
  { method: "POST", path: /^\/emails\/\d+$/, body: { message: "Queued", recipient_count: 2, job_id: 1 } },
  { method: "POST", path: /^\/emails\/blast\/test$/, body: ({ body }) => ({ sent_count: body.test_emails.length, emails: body.test_emails }) },
];
