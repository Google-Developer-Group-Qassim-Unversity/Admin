/*
 * Design 4 — Google Tonal (Material 3).
 * Tonal surfaces seeded from GDG blue, Google Calendar's grammar for booking,
 * navigation bar + extended FAB on phones, navigation rail on desktop.
 * Colour means state only: blue open/info, green done/live, yellow waiting on
 * someone (your turn), red returned/overdue. Department colour is identity and
 * appears only as calendar chips and small avatars.
 */
(function () {
  const ID = "tonal";

  /* ---------- helpers ---------- */

  /** The state colour of a request: y = your turn, r = returned, g = done, b = in progress elsewhere. */
  function tone(r) {
    if (r.stage === "returned") return "r";
    if (r.stage === "published") return "g";
    if (r.whoseTurn === "you") return "y";
    return "b";
  }

  const LIGHT_DEPTS = new Set(["web", "logistics", "media"]);

  function av(c, key, size, cls) {
    const d = c.dept(key);
    return `<span class="av ${cls || ""}" style="--dc:${d.color};--sz:${size || 40}px" aria-hidden="true">${c.icon(d.icon)}</span>`;
  }

  function dayCount(c, n) {
    if (c.lang === "en") return n === 1 ? "1 day" : `${n} days`;
    if (n === 1) return "يوم واحد";
    if (n === 2) return "يومان";
    if (n <= 10) return `${c.n(n)} أيام`;
    return `${c.n(n)} يومًا`;
  }

  function thingsLeft(c, n) {
    if (c.lang === "en") return n === 1 ? "1 thing left before you can submit" : `${n} things left before you can submit`;
    if (n === 1) return "بقي شيء واحد قبل الإرسال";
    if (n === 2) return "بقي شيئان قبل الإرسال";
    return `بقيت ${c.n(n)} أشياء قبل الإرسال`;
  }

  /**
   * The ONE progress component. Five stations on a track; done = green,
   * current ringed in the request's state colour, returned red, upcoming outline.
   * size: "s" (list rows) | "l" (labelled). counts: club-wide totals per station.
   */
  function stepper(c, r, size, counts) {
    const steps = c.data.steps;
    let html = "";
    if (counts) {
      html = steps
        .map((s, i) => {
          const n = counts[s.key] || 0;
          const ret = s.key === "in_review" ? counts.returned || 0 : 0;
          return `<li class="st st-cnt${n ? "" : " st-zero"}"><span class="dot"><span class="tab">${c.n(n)}</span>${ret ? `<span class="rbadge" title="${c.t("مُعاد", "Returned")}">${c.n(ret)}</span>` : ""}</span><span class="lbl">${c.L(s)}</span>${ret ? `<span class="lbl-sub">${c.t(`منها ${c.n(ret)} مُعاد`, `${ret} returned`)}</span>` : ""}</li>`;
        })
        .join("");
      return `<ol class="stp stp-l stp-c" aria-label="${c.t("المسار في النادي", "Across the club")}">${html}</ol>`;
    }
    const cur = c.data.stages[r.stage].step;
    const published = r.stage === "published";
    const returned = r.stage === "returned";
    const t = tone(r);
    html = steps
      .map((s, i) => {
        const state = published || i < cur ? "done" : i === cur ? (returned ? "ret" : "cur") : "todo";
        const linkDone = published || i <= cur;
        let inner = "";
        if (size === "l") {
          inner = state === "done" ? c.icon("check") : state === "ret" ? c.icon("corner-up-left", "flip-rtl") : `<span class="tab">${c.n(i + 1)}</span>`;
        }
        return `<li class="st st-${state}${linkDone ? " lk" : ""}" ${state === "cur" || state === "ret" ? 'aria-current="step"' : ""}><span class="dot">${inner}</span>${size === "l" ? `<span class="lbl">${c.L(s)}</span>` : ""}</li>`;
      })
      .join("");
    const label = c.t(`الخطوة ${c.n(Math.max(cur, 0) + 1)} من ٥`, `Step ${Math.max(cur, 0) + 1} of 5`);
    return `<ol class="stp stp-${size || "s"} t-${t}" aria-label="${label}">${html}</ol>`;
  }

  function stageChip(c, r) {
    return `<span class="sc t-${tone(r)}">${c.L(c.data.stages[r.stage])}</span>`;
  }

  function dateTile(c, iso) {
    return `<span class="dt" aria-hidden="true"><b class="tab">${c.n(+iso.slice(8))}</b><small>${c.date(iso, { month: "short" })}</small></span>`;
  }

  function teamName(c, team) {
    return c.L(c.dept(team));
  }

  function navbar(c, active, fab) {
    const items = [
      { k: "home", i: "house", ar: "الرئيسية", en: "Home" },
      { k: "pipeline", i: "route", ar: "المسار", en: "Pipeline", badge: 3 },
      { k: "events", i: "calendar-days", ar: "الفعاليات", en: "Events" },
      { k: "more", i: "menu", ar: "المزيد", en: "More" },
    ];
    return `<nav class="nb" aria-label="${c.t("التنقل", "Navigation")}">
      ${fab ? `<button class="fab" type="button">${c.icon("calendar-plus")}<span>${c.t("احجز موعدًا", "Book dates")}</span></button>` : ""}
      <div class="nb-in">${items
        .map(
          (it) => `<button type="button" class="nbi${it.k === active ? " on" : ""}" ${it.k === active ? 'aria-current="page"' : ""}>
          <span class="pill">${c.icon(it.i)}${it.badge ? `<span class="nbadge tab">${c.n(it.badge)}</span>` : ""}</span><span class="nbl">${c.t(it.ar, it.en)}</span></button>`,
        )
        .join("")}</div></nav>`;
  }

  function searchBar(c) {
    return `<div class="sbar" role="search">
      <span class="sbar-logo">${c.logo(17)}</span>
      <span class="sbar-ph">${c.t("ابحث عن فعالية أو عضو…", "Search events, members…")}</span>
      <button type="button" class="ib" aria-label="${c.t("الإشعارات", "Notifications")}">${c.icon("bell")}<span class="badge tab">${c.n(3)}</span></button>
      <span class="avatar" aria-label="${c.L(c.data.me.name)}">${c.t("إب", "I")}</span>
    </div>`;
  }

  /** Your turn: the request that needs the signed-in person now. */
  function turnCard(c, cls) {
    const r = c.req("r1");
    const missing = r.sections.flatMap((s) => s.missing);
    return `<section class="turn ${cls || ""}" aria-labelledby="turn-${cls || "p"}">
      <div class="turn-top">
        <span class="sc t-y">${c.icon("hand")}${c.t("دورك", "Your turn")}</span>
        <span class="timer">${c.icon("timer")}${c.t("ينتهي الحجز بعد", "Hold ends in")} <b class="tab">${c.cd(r.holdMs, "hm")}</b></span>
      </div>
      <h3 id="turn-${cls || "p"}">${c.L(r.title)}</h3>
      <div class="turn-meta">${av(c, r.dept, 24)}<span>${c.L(c.dept(r.dept))}</span><span class="sep">·</span><span class="tab">${c.range(r.start, r.end)}</span></div>
      ${stepper(c, r, "s")}
      <div class="turn-miss">
        <span>${thingsLeft(c, missing.length)}</span>
        <div class="mchips">${missing.map((m) => `<span class="mchip">${c.L(m)}</span>`).join("")}</div>
      </div>
      <div class="acts">
        <button type="button" class="btn btn-f">${c.t("أكمل الطلب", "Continue")}${c.icon("arrow-right", "flip-rtl")}</button>
        <button type="button" class="btn btn-t">${c.t("إكمال لاحقًا", "Finish later")}</button>
      </div>
    </section>`;
  }

  function myRequestRows(c) {
    return c.data.requests
      .filter((r) => r.mine)
      .map(
        (r) => `<button type="button" class="row">
        ${dateTile(c, r.start)}
        <span class="row-m">
          <span class="row-t">${c.L(r.title)}</span>
          <span class="row-s">${stageChip(c, r)}<span class="tab">${c.range(r.start, r.end)}</span></span>
          ${stepper(c, r, "s")}
        </span>
        ${c.icon("chevron-right", "flip-rtl chev")}
      </button>`,
      )
      .join("");
  }

  function inboxRows(c) {
    return c.data.inbox
      .map((it) => {
        const r = c.req(it.request);
        return `<button type="button" class="row">
          ${av(c, it.team, 40)}
          <span class="row-m">
            <span class="row-t">${c.L(r.title)}</span>
            <span class="row-s"><span>${teamName(c, it.team)}</span><span class="sep">·</span><span>${c.L(it.received)}</span></span>
          </span>
          <span class="sc t-y sm">${c.L(c.data.taskStatus.open)}</span>
        </button>`;
      })
      .join("");
  }

  function stageCounts(c) {
    const out = { returned: 0 };
    c.data.requests.forEach((r) => {
      if (r.stage === "returned") out.returned++;
      const key = r.stage === "returned" ? "in_review" : r.stage;
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  }

  const EVENT_TONE = { active: "g", open: "b", draft: "n", closed: "n" };
  const EVENT_LABEL = {
    active: { ar: "شغالة الحين", en: "Running now" },
    open: { ar: "التسجيل مفتوح", en: "Registration open" },
    draft: { ar: "مسودة", en: "Draft" },
  };
  function eventRows(c) {
    return c.data.events
      .map((e) => {
        const metric =
          e.attended != null
            ? c.t(`${c.n(e.attended)} حضروا`, `${c.n(e.attended)} attended`)
            : e.responses != null
              ? c.t(`${c.n(e.responses)} تسجيل`, `${c.n(e.responses)} responses`)
              : c.L(e.next);
        return `<button type="button" class="row">
          ${av(c, e.dept, 40)}
          <span class="row-m">
            <span class="row-t">${c.L(e.title)}</span>
            <span class="row-s"><span class="sc t-${EVENT_TONE[e.status]} sm">${e.status === "active" ? '<span class="live"></span>' : ""}${c.L(EVENT_LABEL[e.status])}</span><span>${c.L(e.when)}</span><span class="sep">·</span><span class="tab">${metric}</span></span>
          </span>
          ${c.icon("chevron-right", "flip-rtl chev")}
        </button>`;
      })
      .join("");
  }

  const ATT_ICON = { red: "triangle-alert", yellow: "award", blue: "calendar-clock" };
  const ATT_TONE = { red: "r", yellow: "y", blue: "b" };
  function attentionRows(c) {
    return c.data.attention
      .map(
        (a) => `<div class="row row-static">
        <span class="ti t-${ATT_TONE[a.tone]}">${c.icon(ATT_ICON[a.tone])}</span>
        <span class="row-m">
          <span class="row-t">${c.L(a.title)}</span>
          <span class="row-s"><span>${c.L(a.event)}</span><span class="sep">·</span><span>${c.L(a.detail)}</span></span>
        </span>
        <button type="button" class="btn btn-t sm">${c.L(a.action)}</button>
      </div>`,
      )
      .join("");
  }

  function statsGrid(c) {
    const s = c.data.stats;
    const cells = [
      { l: { ar: "التسجيل مفتوح", en: "Open for registration" }, v: c.n(s.open), h: { ar: "الأعضاء يقدرون يسجلون", en: "Members can still sign up" } },
      { l: { ar: "شغالة الحين", en: "Running now" }, v: c.n(s.live), h: { ar: "ورشة Git و GitHub", en: "Git & GitHub workshop" } },
      { l: { ar: "الأعضاء", en: "Members" }, v: c.n(s.members), h: { ar: `${c.n(s.verified)} موثّق · ${c.n(s.pending)} بانتظار التوثيق`, en: `${c.n(s.verified)} verified · ${c.n(s.pending)} pending` } },
      { l: { ar: "الرسائل المرسلة (٢٤ ساعة)", en: "Emails sent (24h)" }, v: c.n(s.emails24h), h: { ar: "من كل المزوّدين", en: "Across every provider" } },
    ];
    return cells.map((x) => `<div class="stat"><span class="stat-l">${c.L(x.l)}</span><span class="stat-v tab">${x.v}</span><span class="stat-h">${c.L(x.h)}</span></div>`).join("");
  }

  function sectionHead(c, ar, en, action, id) {
    return `<div class="sh"><h2 ${id ? `id="${id}"` : ""}>${c.t(ar, en)}</h2>${action ? `<button type="button" class="btn btn-t sm">${c.L(action)}</button>` : ""}</div>`;
  }

  const ALL = { ar: "عرض الكل", en: "See all" };

  /* ---------- the phone calendar ---------- */

  function phoneMonth(c, sel) {
    const cal = c.data.calendar;
    const heads = [4, 5, 6, 7, 8, 9, 10].map((d) => `<span class="wd">${c.weekday(`2026-10-${String(d).padStart(2, "0")}`, "narrow")}</span>`).join("");
    let cells = "";
    for (let i = 0; i < 4; i++) cells += `<span class="cday blank" aria-hidden="true"></span>`;
    for (let d = 1; d <= 31; d++) {
      const day = cal.days[d];
      const iso = `2026-10-${String(d).padStart(2, "0")}`;
      const s = day.status;
      let selc = "";
      if (sel && d >= sel[0] && d <= sel[1]) selc = sel[0] === sel[1] ? " sel-one" : d === sel[0] ? " sel-a" : d === sel[1] ? " sel-b" : " sel-m";
      const r = day.request ? c.req(day.request) : null;
      const label = `${c.date(iso, { day: "numeric", month: "long" })}: ${c.L(c.data.dayStatus[s])}${day.reason ? ` (${c.L(day.reason)})` : ""}${r ? ` · ${c.L(r.title)}` : ""}`;
      const mk = s === "booked" || s === "published" ? `<span class="mk" style="--dc:${c.dept(r.dept).color}"></span>` : "";
      cells += `<button type="button" class="cday s-${s}${selc}${iso === cal.today ? " today" : ""}" data-d="${d}" aria-label="${label}" ${s === "open" ? "" : "disabled"} ${selc ? 'aria-pressed="true"' : ""}><span class="num tab">${c.n(d)}</span>${mk}</button>`;
    }
    return `<div class="month" role="grid"><div class="wds">${heads}</div><div class="days">${cells}</div></div>`;
  }

  function legend(c) {
    const order = ["open", "locked", "banned", "held", "booked", "published"];
    return `<ul class="legend">${order
      .map((k) => `<li><span class="lg-sw s-${k}"><span class="num tab">${c.n(k === "locked" ? 9 : 7)}</span>${k === "booked" || k === "published" ? '<span class="mk"></span>' : ""}</span>${c.L(c.data.dayStatus[k])}</li>`)
      .join("")}</ul>`;
  }

  /* ---------- desktop calendar ---------- */

  function deskMonth(c) {
    const cal = c.data.calendar;
    const weeks = [];
    // Sun 27 Sep … Sat 31 Oct, five rows.
    const days = [];
    for (let d = 27; d <= 30; d++) days.push({ iso: `2026-09-${d}`, d, out: true });
    for (let d = 1; d <= 31; d++) days.push({ iso: `2026-10-${String(d).padStart(2, "0")}`, d, out: false });
    for (let w = 0; w < 5; w++) weeks.push(days.slice(w * 7, w * 7 + 7));

    // Bookings as spans: [first day, last day, request]
    const spans = [];
    const seen = new Set();
    for (let d = 1; d <= 31; d++) {
      const day = cal.days[d];
      if (day.request && !seen.has(day.request)) {
        seen.add(day.request);
        let e = d;
        while (e < 31 && cal.days[e + 1].request === day.request) e++;
        spans.push({ a: d, b: e, r: c.req(day.request), status: day.status });
      }
    }
    const heads = weeks[1].map((x) => `<div class="dwh">${c.weekday(x.iso, "short")}</div>`).join("");

    const rows = weeks
      .map((wk) => {
        const cells = wk
          .map((x, i) => {
            const day = x.out ? { status: "locked" } : cal.days[x.d];
            const isToday = x.iso === cal.today;
            const numTxt = x.d === 1 && !x.out ? c.date(x.iso, { day: "numeric", month: "short" }) : c.n(x.d);
            return `<div class="dc s-${day.status}${x.out ? " out" : ""}" style="grid-column:${i + 1}">
              <span class="dn${isToday ? " today" : ""} tab">${numTxt}</span>
              ${day.status === "open" ? `<button type="button" class="dc-add" aria-label="${c.t("احجز", "Book")} ${c.date(x.iso)}">${c.icon("plus")}</button>` : ""}
            </div>`;
          })
          .join("");
        let extras = "";
        wk.forEach((x, i) => {
          if (x.out) return;
          const day = cal.days[x.d];
          if (day.status === "banned") {
            extras += `<div class="dban" style="grid-column:${i + 1}">${c.icon("ban")}<span>${c.L(day.reason)}</span></div>`;
          }
          if (x.iso === cal.firstBookable) {
            extras += `<div class="dfirst" style="grid-column:${i + 1}">${c.t("أول يوم متاح", "First bookable")}</div>`;
          }
        });
        const chips = spans
          .filter((s) => wk.some((x) => !x.out && x.d === s.a))
          .map((s) => {
            const col = wk.findIndex((x) => !x.out && x.d === s.a) + 1;
            const span = s.b - s.a + 1;
            const d = c.dept(s.r.dept);
            const ic = s.status === "held" ? "clock-3" : s.r.stage === "returned" ? "corner-up-left" : s.status === "published" ? "circle-check" : "";
            const kind = s.status === "held" ? "held" : "solid";
            return `<button type="button" class="dchip k-${kind}${LIGHT_DEPTS.has(s.r.dept) ? " lt" : ""}" style="grid-column:${col} / span ${span};--dc:${d.color}" title="${c.L(s.r.title)} · ${c.L(c.data.stages[s.r.stage])}">
              ${ic ? c.icon(ic, ic === "corner-up-left" ? "flip-rtl" : "") : ""}<span class="dchip-t">${c.L(s.r.title)}</span>${span > 1 ? `<span class="dchip-s">${c.L(d.short)}</span>` : ""}</button>`;
          })
          .join("");
        return `<div class="dwk">${cells}${extras}${chips}</div>`;
      })
      .join("");
    return `<div class="dmonth"><div class="dwhs">${heads}</div>${rows}</div>`;
  }

  function deskLegend(c) {
    return `<div class="dleg">
      <span><i class="lgk k-solid" style="--dc:#34A853"></i>${c.t("محجوز", "Booked")}</span>
      <span><i class="lgk k-held" style="--dc:#34A853"></i>${c.t("محجوز مؤقتًا", "Held (draft)")}</span>
      <span>${c.icon("circle-check")}${c.t("منشور", "Published")}</span>
      <span class="r">${c.icon("ban")}${c.t("مغلق", "Closed")}</span>
      <span><i class="lgk k-lock"></i>${c.t("قريب جدًا", "Too soon")}</span>
    </div>`;
  }

  /* ---------- CSS ---------- */

  const css = `
.d-tonal {
  --p:#0B57D0; --onp:#FFFFFF; --pc:#D3E3FD; --onpc:#041E49; --sc2:#C2E7FF; --onsc2:#001D35;
  --s:#F8FAFD; --s0:#FFFFFF; --s1:#F0F4F9; --s2:#E9EEF6; --s3:#DDE3EA; --card:#FFFFFF;
  --on:#1F1F1F; --onv:#444746; --ol:#747775; --olv:#C4C7C5;
  --g:#146C2E; --gc:#C4EED0; --ong:#072711; --gdot:#34A853;
  --yi:#7A4F01; --yc:#FFE08A; --ony:#2B1700; --ydot:#FBBC04; --ysoft:#FFF6DA;
  --r:#B3261E; --rc:#F9DEDC; --onr:#410E0B; --rdot:#EA4335;
  --n:#444746; --nc:#E3E3E3;
  --sb:#1F1F1F; --sb-bg:#F8FAFD;
  --sh1:0 1px 2px rgb(0 0 0 / .3), 0 1px 3px 1px rgb(0 0 0 / .15);
  --sh3:0 1px 3px rgb(0 0 0 / .3), 0 4px 8px 3px rgb(0 0 0 / .15);
  background: var(--s); color: var(--on);
  font-family: "Google Sans", "Noto Sans Arabic", system-ui, sans-serif;
  font-size: 14px; line-height: 20px; letter-spacing: .01em;
  scrollbar-color: var(--olv) transparent;
}
.d-tonal[data-theme="dark"] {
  --p:#A8C7FA; --onp:#062E6F; --pc:#0842A0; --onpc:#D3E3FD; --sc2:#004A77; --onsc2:#C2E7FF;
  --s:#131314; --s0:#0E0E0F; --s1:#1B1B1C; --s2:#1E1F20; --s3:#282A2C; --card:#1E1F20;
  --on:#E3E3E3; --onv:#C4C7C5; --ol:#8E918F; --olv:#444746;
  --g:#6DD58C; --gc:#0F5223; --ong:#C4EED0; --gdot:#6DD58C;
  --yi:#FDD663; --yc:#5C4300; --ony:#FFE08A; --ydot:#FDD663; --ysoft:#262113;
  --r:#F2B8B5; --rc:#8C1D18; --onr:#F9DEDC; --rdot:#F28B82;
  --n:#C4C7C5; --nc:#333537;
  --sb:#E3E3E3; --sb-bg:#131314;
  --sh1:0 1px 2px rgb(0 0 0 / .5), 0 1px 3px 1px rgb(0 0 0 / .3);
  --sh3:0 1px 3px rgb(0 0 0 / .5), 0 4px 8px 3px rgb(0 0 0 / .3);
  color-scheme: dark;
}
.d-tonal[lang="ar"] { letter-spacing: 0; line-height: 22px; }
.d-tonal ::selection { background: var(--pc); color: var(--onpc); }
.d-tonal *, .d-tonal *::before, .d-tonal *::after { box-sizing: border-box; }
.d-tonal h1, .d-tonal h2, .d-tonal h3, .d-tonal p { margin: 0; }
.d-tonal button { font: inherit; color: inherit; letter-spacing: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: start; }
.d-tonal button:disabled { cursor: default; }
.d-tonal :focus-visible { outline: 2px solid var(--p); outline-offset: 2px; }
.d-tonal .tab { font-variant-numeric: tabular-nums; }
.d-tonal svg.lucide { width: 20px; height: 20px; stroke-width: 2; flex: none; }
.d-tonal .sep { color: var(--ol); }

/* state layer: hover 8%, pressed 12% of the content colour */
.d-tonal .btn, .d-tonal .row, .d-tonal .ib, .d-tonal .nbi .pill, .d-tonal .fab, .d-tonal .chip, .d-tonal .cday, .d-tonal .rli, .d-tonal .dchip, .d-tonal .dc-add, .d-tonal .seg button, .d-tonal .field { position: relative; isolation: isolate; }
.d-tonal .btn::after, .d-tonal .row::after, .d-tonal .ib::after, .d-tonal .nbi .pill::after, .d-tonal .fab::after, .d-tonal .chip::after, .d-tonal .cday:not(:disabled)::after, .d-tonal .rli::after, .d-tonal .dchip::after, .d-tonal .dc-add::after, .d-tonal .seg button::after, .d-tonal .field::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; background: currentColor; opacity: 0; transition: opacity .15s; pointer-events: none; z-index: -1;
}
.d-tonal .btn:hover::after, .d-tonal .row:hover::after, .d-tonal .ib:hover::after, .d-tonal .nbi:hover .pill::after, .d-tonal .fab:hover::after, .d-tonal .chip:hover::after, .d-tonal .cday:not(:disabled):hover::after, .d-tonal .rli:hover::after, .d-tonal .dchip:hover::after, .d-tonal .dc-add:hover::after, .d-tonal .seg button:hover::after, .d-tonal .field:hover::after { opacity: .08; }
.d-tonal .btn:active::after, .d-tonal .row:active::after, .d-tonal .ib:active::after, .d-tonal .nbi:active .pill::after, .d-tonal .fab:active::after, .d-tonal .chip:active::after, .d-tonal .cday:not(:disabled):active::after, .d-tonal .rli:active::after, .d-tonal .dchip:active::after, .d-tonal .seg button:active::after { opacity: .12; }

/* buttons */
.d-tonal .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 24px; border-radius: 20px; font-weight: 500; font-size: 14px; white-space: nowrap; }
.d-tonal .btn svg.lucide { width: 18px; height: 18px; }
.d-tonal .btn-f { background: var(--p); color: var(--onp); }
.d-tonal .btn-f:hover { box-shadow: var(--sh1); }
.d-tonal .btn-f:disabled { background: color-mix(in srgb, var(--on) 12%, transparent); color: color-mix(in srgb, var(--on) 38%, transparent); box-shadow: none; }
.d-tonal .btn-f:disabled::after { display: none; }
.d-tonal .btn-tn { background: var(--sc2); color: var(--onsc2); }
.d-tonal .btn-o { border: 1px solid var(--ol); color: var(--p); padding: 0 23px; }
.d-tonal .btn-t { color: var(--p); padding: 0 12px; }
.d-tonal .btn.sm { height: 36px; padding: 0 12px; font-size: 14px; }
.d-tonal .btn.big { height: 56px; border-radius: 28px; padding: 0 28px; font-size: 16px; }
.d-tonal .ib { width: 48px; height: 48px; border-radius: 24px; display: inline-grid; place-items: center; color: var(--onv); flex: none; }
.d-tonal .ib svg.lucide { width: 24px; height: 24px; }
.d-tonal .badge { position: absolute; top: 8px; inset-inline-end: 6px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--rdot); color: #fff; font-size: 11px; line-height: 16px; font-weight: 500; text-align: center; }
.d-tonal[data-theme="dark"] .badge { background: #F2B8B5; color: #601410; }
.d-tonal .avatar { width: 32px; height: 32px; border-radius: 50%; background: #0F9D58; color: #fff; display: grid; place-items: center; font-weight: 500; font-size: 15px; flex: none; }

/* status chips (M3 assist-chip shape, tonal state colour) */
.d-tonal .sc { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 8px; font-size: 12px; font-weight: 500; line-height: 16px; white-space: nowrap; letter-spacing: .03em; }
.d-tonal[lang="ar"] .sc { letter-spacing: 0; }
.d-tonal .sc svg.lucide { width: 16px; height: 16px; margin-inline-start: -4px; }
.d-tonal .sc.sm { height: 24px; padding: 0 8px; }
.d-tonal .t-y.sc { background: var(--yc); color: var(--ony); }
.d-tonal .t-r.sc { background: var(--rc); color: var(--onr); }
.d-tonal .t-g.sc { background: var(--gc); color: var(--ong); }
.d-tonal .t-b.sc { background: var(--pc); color: var(--onpc); }
.d-tonal .t-n.sc { background: var(--nc); color: var(--on); }
.d-tonal .live { width: 8px; height: 8px; border-radius: 50%; background: var(--gdot); box-shadow: 0 0 0 0 var(--gdot); animation: tonal-live 2s ease-out infinite; }
@keyframes tonal-live { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gdot) 60%, transparent); } 70%, 100% { box-shadow: 0 0 0 6px transparent; } }
@media (prefers-reduced-motion: reduce) { .d-tonal .live { animation: none; } }

/* avatars */
.d-tonal .av { width: var(--sz); height: var(--sz); border-radius: 50%; display: inline-grid; place-items: center; flex: none;
  background: color-mix(in oklab, var(--dc) 18%, var(--s0)); color: color-mix(in oklab, var(--dc) 72%, var(--on)); }
.d-tonal .av svg.lucide { width: calc(var(--sz) * .5); height: calc(var(--sz) * .5); }
.d-tonal[data-theme="dark"] .av { background: color-mix(in oklab, var(--dc) 26%, var(--s2)); color: color-mix(in oklab, var(--dc) 70%, #fff); }
.d-tonal .ti { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; }
.d-tonal .ti.t-r { background: var(--rc); color: var(--onr); }
.d-tonal .ti.t-y { background: var(--yc); color: var(--ony); }
.d-tonal .ti.t-b { background: var(--pc); color: var(--onpc); }
.d-tonal .ti.t-g { background: var(--gc); color: var(--ong); }

/* the one stepper */
.d-tonal .stp { list-style: none; margin: 0; padding: 0; display: flex; align-items: flex-start; --d: 12px; }
.d-tonal .stp .st { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 0; }
.d-tonal .stp .st + .st::before { content: ""; position: absolute; top: calc(var(--d) / 2 - 1px); height: 2px; border-radius: 1px;
  inset-inline-end: calc(50% + var(--d) / 2 + 3px); width: calc(100% - var(--d) - 6px); background: var(--olv); }
.d-tonal .stp .st.lk + .st.lk::before, .d-tonal .stp .st.st-done + .st::before { background: var(--gdot); }
.d-tonal .stp .dot { width: var(--d); height: var(--d); border-radius: 50%; display: grid; place-items: center; position: relative;
  box-shadow: inset 0 0 0 2px var(--olv); color: var(--onv); font-size: 13px; font-weight: 500; }
.d-tonal .stp .st-done .dot { background: var(--gdot); box-shadow: none; color: #fff; }
.d-tonal[data-theme="dark"] .stp .st-done .dot { color: #0F5223; }
.d-tonal .stp .st-cur .dot { box-shadow: inset 0 0 0 2px var(--tc), 0 0 0 4px color-mix(in srgb, var(--tc) 22%, transparent); background: var(--s0); }
.d-tonal .stp .st-ret .dot { background: var(--rc); color: var(--onr); box-shadow: inset 0 0 0 2px var(--rdot), 0 0 0 4px color-mix(in srgb, var(--rdot) 22%, transparent); }
.d-tonal .stp.t-y { --tc: var(--ydot); } .d-tonal .stp.t-b { --tc: var(--p); } .d-tonal .stp.t-r { --tc: var(--rdot); } .d-tonal .stp.t-g { --tc: var(--gdot); }
.d-tonal .stp-s { padding: 2px 0; }
.d-tonal .stp-l { --d: 32px; }
.d-tonal .stp-l .dot svg.lucide { width: 18px; height: 18px; }
.d-tonal .stp-l .lbl { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--onv); text-align: center; padding: 0 2px; }
.d-tonal .stp-l .st-cur .lbl, .d-tonal .stp-l .st-ret .lbl { color: var(--on); font-weight: 700; }
.d-tonal .stp-l .st-cur .dot { color: var(--on); }
.d-tonal .stp-c { --d: 36px; }
.d-tonal .stp-c .st + .st::before { background: var(--olv); }
.d-tonal .stp-c .dot { background: var(--pc); color: var(--onpc); box-shadow: none; font-size: 15px; }
.d-tonal .stp-c .st-zero .dot { background: transparent; box-shadow: inset 0 0 0 2px var(--olv); color: var(--ol); }
.d-tonal .stp-c .rbadge { position: absolute; top: -4px; inset-inline-end: -6px; min-width: 18px; height: 18px; border-radius: 9px; background: var(--rdot); color: #fff; font-size: 11px; line-height: 18px; text-align: center; box-shadow: 0 0 0 2px var(--card); }
.d-tonal .stp-c .lbl-sub { font-size: 11px; line-height: 14px; color: var(--r); font-weight: 500; }

/* lists */
.d-tonal .lst { background: var(--card); border-radius: 16px; overflow: hidden; }
.d-tonal[data-theme="light"] .lst.o, .d-tonal:not([data-theme="dark"]) .lst.o { box-shadow: inset 0 0 0 1px var(--olv); background: var(--s0); }
.d-tonal .row { display: flex; align-items: center; gap: 16px; width: 100%; min-height: 72px; padding: 12px 16px; }
.d-tonal .row + .row { border-top: 1px solid var(--olv); }
.d-tonal[data-theme="dark"] .row + .row { border-top-color: color-mix(in srgb, var(--olv) 70%, transparent); }
.d-tonal .row-m { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.d-tonal .row-t { font-size: 16px; line-height: 24px; color: var(--on); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-tonal .row-s { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 14px; line-height: 20px; color: var(--onv); }
.d-tonal .row .chev { color: var(--onv); width: 20px; height: 20px; }
.d-tonal .row .stp-s { margin-top: 6px; max-width: 220px; }
.d-tonal .dt { width: 44px; flex: none; display: flex; flex-direction: column; align-items: center; line-height: 1; gap: 4px; align-self: flex-start; padding-top: 4px; }
.d-tonal .dt b { font-size: 22px; font-weight: 500; color: var(--on); }
.d-tonal .dt small { font-size: 12px; color: var(--onv); font-weight: 500; }

.d-tonal .sh { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; padding: 0 4px 0 4px; }
.d-tonal .sh h2 { font-size: 16px; line-height: 24px; font-weight: 500; color: var(--on); }
.d-tonal[lang="ar"] .sh h2 { font-weight: 600; }

/* phone frame */
.d-tonal .ph { display: flex; flex-direction: column; min-height: 100%; background: var(--s); }
.d-tonal .ph-main { flex: 1; padding: 0 16px 104px; display: flex; flex-direction: column; gap: 8px; }
.d-tonal .ph-main.flow { padding-bottom: 24px; }
.d-tonal .sbar { display: flex; align-items: center; gap: 4px; height: 56px; border-radius: 28px; background: var(--s2); padding-inline: 16px 8px; margin: 8px 0 8px; }
.d-tonal .sbar-logo { display: grid; place-items: center; width: 32px; }
.d-tonal .sbar-ph { flex: 1; color: var(--onv); font-size: 16px; padding-inline-start: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.d-tonal .hello { padding: 8px 4px 12px; }
.d-tonal .hello h1 { font-size: 28px; line-height: 36px; font-weight: 400; color: var(--on); }
.d-tonal[lang="ar"] .hello h1 { font-weight: 600; font-size: 26px; }
.d-tonal .hello p { color: var(--onv); font-size: 14px; margin-top: 4px; }

/* your turn */
.d-tonal .turn { background: var(--ysoft); border-radius: 28px; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
.d-tonal .turn-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.d-tonal .timer { display: inline-flex; align-items: center; gap: 6px; color: var(--yi); font-size: 14px; font-weight: 500; }
.d-tonal .timer svg.lucide { width: 18px; height: 18px; }
.d-tonal .turn h3 { font-size: 24px; line-height: 32px; font-weight: 400; color: var(--on); }
.d-tonal[lang="ar"] .turn h3 { font-weight: 600; font-size: 22px; }
.d-tonal .turn-meta { display: flex; align-items: center; gap: 8px; color: var(--onv); font-size: 14px; margin-top: -6px; }
.d-tonal .turn .stp { margin: 6px 0 2px; }
.d-tonal .turn .stp .st-cur .dot { background: var(--ysoft); }
.d-tonal .turn-miss { display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: var(--on); font-weight: 500; }
.d-tonal .mchips { display: flex; flex-wrap: wrap; gap: 8px; }
.d-tonal .mchip { height: 32px; display: inline-flex; align-items: center; padding: 0 12px; border-radius: 8px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--yi) 45%, transparent); color: var(--yi); font-size: 14px; font-weight: 500; }
.d-tonal .acts { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 4px; }

/* nav bar + FAB */
.d-tonal .nb { position: sticky; bottom: 0; z-index: 20; background: var(--s2); padding-bottom: 28px; }
.d-tonal .nb-in { display: flex; height: 80px; padding-top: 12px; }
.d-tonal .nbi { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--onv); }
.d-tonal .nbi .pill { width: 64px; height: 32px; border-radius: 16px; display: grid; place-items: center; position: relative; }
.d-tonal .nbi .pill svg.lucide { width: 24px; height: 24px; }
.d-tonal .nbi.on .pill { background: var(--sc2); color: var(--onsc2); }
.d-tonal .nbi.on .nbl { color: var(--on); font-weight: 700; }
.d-tonal .nbl { font-size: 12px; line-height: 16px; font-weight: 500; }
.d-tonal .nbadge { position: absolute; top: -2px; inset-inline-end: 10px; min-width: 16px; height: 16px; border-radius: 8px; padding: 0 4px; background: var(--rdot); color: #fff; font-size: 11px; line-height: 16px; text-align: center; }
.d-tonal[data-theme="dark"] .nbadge { background: #F2B8B5; color: #601410; }
.d-tonal .fab { position: absolute; bottom: calc(100% + 16px); inset-inline-end: 16px; height: 56px; padding: 0 20px 0 16px; border-radius: 16px; background: var(--pc); color: var(--onpc); display: inline-flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500; box-shadow: var(--sh3); }
.d-tonal[dir="rtl"] .fab { padding: 0 16px 0 20px; }
.d-tonal .fab svg.lucide { width: 24px; height: 24px; }

/* small top app bar */
.d-tonal .tab-bar { display: flex; align-items: center; gap: 4px; height: 64px; margin: 0 -12px; padding: 0 4px; }
.d-tonal .tab-bar h1 { flex: 1; font-size: 22px; line-height: 28px; font-weight: 400; color: var(--on); }
.d-tonal[lang="ar"] .tab-bar h1 { font-weight: 600; font-size: 20px; }
.d-tonal .tab-bar .ib { color: var(--on); }

/* flow / stats / misc cards */
.d-tonal .card { background: var(--card); border-radius: 16px; padding: 16px; }
.d-tonal:not([data-theme="dark"]) .card.o { background: var(--s0); box-shadow: inset 0 0 0 1px var(--olv); }
.d-tonal .stats { display: grid; grid-template-columns: 1fr 1fr; }
.d-tonal .stat { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; min-width: 0; }
.d-tonal .stats .stat:nth-child(n+3) { border-top: 1px solid var(--olv); }
.d-tonal .stats .stat:nth-child(odd) { border-inline-end: 1px solid var(--olv); }
.d-tonal .stat-l { font-size: 12px; line-height: 16px; color: var(--onv); font-weight: 500; }
.d-tonal .stat-v { font-size: 22px; line-height: 28px; color: var(--on); }
.d-tonal .stat-h { font-size: 12px; line-height: 16px; color: var(--onv); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-tonal .row-static .btn { margin-inline-end: -8px; }

/* book screen */
.d-tonal .field { border-radius: 4px; box-shadow: inset 0 0 0 1px var(--ol); height: 56px; display: flex; align-items: center; gap: 12px; padding: 0 12px 0 16px; width: 100%; margin-top: 8px; }
.d-tonal[dir="rtl"] .field { padding: 0 16px 0 12px; }
.d-tonal .field .flabel { position: absolute; top: -9px; inset-inline-start: 12px; padding: 0 4px; background: var(--s); font-size: 12px; line-height: 16px; color: var(--onv); }
.d-tonal .field .fval { flex: 1; font-size: 16px; color: var(--on); display: flex; align-items: center; gap: 12px; }
.d-tonal .field > svg.lucide { color: var(--onv); }
.d-tonal .support { font-size: 12px; line-height: 16px; color: var(--onv); padding: 4px 16px 0; }
.d-tonal .hint { display: flex; gap: 12px; align-items: flex-start; padding: 12px 16px; border-radius: 12px; background: var(--s1); color: var(--onv); font-size: 14px; margin-top: 8px; }
.d-tonal .hint svg.lucide { color: var(--p); margin-top: 1px; }
.d-tonal .mhead { display: flex; align-items: center; gap: 4px; margin-top: 8px; }
.d-tonal .mhead h2 { flex: 1; font-size: 16px; font-weight: 500; padding-inline-start: 8px; }
.d-tonal .mhead .ib { width: 40px; height: 40px; }
.d-tonal .month { padding: 0 2px; }
.d-tonal .wds, .d-tonal .days { display: grid; grid-template-columns: repeat(7, 1fr); }
.d-tonal .wd { height: 32px; display: grid; place-items: center; font-size: 12px; color: var(--onv); font-weight: 500; }
.d-tonal .cday { height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; border-radius: 0; }
.d-tonal .cday::after { inset: 4px calc(50% - 20px) !important; border-radius: 20px !important; }
.d-tonal .cday .num { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; position: relative; z-index: 1; color: var(--on); }
.d-tonal .cday .mk { position: absolute; bottom: 3px; width: 6px; height: 6px; border-radius: 50%; background: var(--dc, var(--ol)); }
.d-tonal .cday.today .num { box-shadow: inset 0 0 0 1px var(--p); color: var(--p); }
.d-tonal .s-locked .num { color: color-mix(in srgb, var(--on) 38%, transparent); }
.d-tonal .cday.s-locked.today .num { color: var(--p); opacity: .7; }
.d-tonal .s-banned .num { color: var(--r); text-decoration: line-through; text-decoration-thickness: 1.5px; background: color-mix(in srgb, var(--rc) 55%, transparent); }
.d-tonal .s-held .num { background: repeating-linear-gradient(135deg, var(--yc) 0 4px, color-mix(in srgb, var(--yc) 35%, transparent) 4px 8px); box-shadow: inset 0 0 0 1.5px var(--ydot); color: var(--ony); }
.d-tonal .s-booked .num { background: var(--s2); color: var(--onv); }
.d-tonal .s-published .num { background: var(--gc); color: var(--ong); }
.d-tonal .cday.sel-a::before, .d-tonal .cday.sel-b::before, .d-tonal .cday.sel-m::before { content: ""; position: absolute; top: 4px; bottom: 4px; background: var(--pc); z-index: 0; }
.d-tonal .cday.sel-m::before { inset-inline: 0; }
.d-tonal .cday.sel-a::before { inset-inline-start: 50%; inset-inline-end: 0; }
.d-tonal .cday.sel-b::before { inset-inline-end: 50%; inset-inline-start: 0; }
.d-tonal .cday.sel-a .num, .d-tonal .cday.sel-b .num, .d-tonal .cday.sel-one .num { background: var(--p); color: var(--onp); font-weight: 500; }
.d-tonal .cday.sel-m .num { color: var(--onpc); }
.d-tonal .legend { list-style: none; margin: 8px 0 0; padding: 12px 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; border-radius: 16px; background: var(--s1); }
.d-tonal .legend li { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--onv); line-height: 18px; }
.d-tonal .lg-sw { width: 32px; height: 32px; position: relative; display: grid; place-items: center; flex: none; }
.d-tonal .lg-sw .num { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; color: var(--on); }
.d-tonal .lg-sw.s-open .num { box-shadow: inset 0 0 0 1px var(--olv); }
.d-tonal .lg-sw .mk { position: absolute; bottom: -1px; width: 5px; height: 5px; border-radius: 50%; background: #34A853; }
.d-tonal .closed { display: flex; flex-direction: column; margin-top: 8px; }
.d-tonal .closed .rli { display: flex; align-items: center; gap: 16px; min-height: 56px; padding: 8px 16px; }
.d-tonal .closed .rli + .rli { border-top: 1px solid var(--olv); }
.d-tonal .closed .ti { width: 36px; height: 36px; }
.d-tonal .closed .ti svg.lucide { width: 18px; height: 18px; }
.d-tonal .sticky-bar { position: sticky; bottom: 0; z-index: 20; background: var(--s2); padding: 16px 16px 36px; display: flex; flex-direction: column; gap: 12px; border-radius: 28px 28px 0 0; box-shadow: 0 -1px 3px rgb(0 0 0 / .06); }
.d-tonal .bk-row { display: flex; align-items: center; gap: 12px; }
.d-tonal .bk-sum { flex: 1; min-width: 0; }
.d-tonal .bk-r { font-size: 18px; line-height: 24px; color: var(--on); font-weight: 500; }
.d-tonal .bk-d { font-size: 13px; line-height: 18px; color: var(--onv); }

/* request screen */
.d-tonal .rq-head { display: flex; flex-direction: column; gap: 8px; padding: 0 4px 8px; }
.d-tonal .rq-head h1 { font-size: 28px; line-height: 36px; font-weight: 400; }
.d-tonal[lang="ar"] .rq-head h1 { font-weight: 600; font-size: 26px; }
.d-tonal .rq-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; color: var(--onv); font-size: 14px; }
.d-tonal .rq-meta span { display: inline-flex; align-items: center; gap: 6px; }
.d-tonal .rq-meta svg.lucide { width: 16px; height: 16px; }
.d-tonal .hold { background: var(--ysoft); border-radius: 16px; padding: 16px; display: flex; gap: 16px; align-items: center; }
.d-tonal .hold .ti { background: var(--yc); color: var(--ony); }
.d-tonal .hold-m { flex: 1; min-width: 0; }
.d-tonal .hold-t { font-size: 14px; font-weight: 500; color: var(--on); }
.d-tonal .hold-b { font-size: 13px; color: var(--onv); line-height: 18px; }
.d-tonal .hold-cd { font-size: 24px; line-height: 32px; font-weight: 500; color: var(--yi); direction: ltr; }
.d-tonal .stp-card { padding: 20px 8px 16px; }
.d-tonal .sec .row { min-height: 88px; align-items: flex-start; }
.d-tonal .sec .ti { margin-top: 2px; }
.d-tonal .bar { height: 4px; border-radius: 2px; background: var(--s3); overflow: hidden; margin-top: 4px; }
.d-tonal .bar i { display: block; height: 100%; border-radius: 2px; background: var(--p); }
.d-tonal .miss { display: inline-flex; align-items: center; gap: 6px; color: var(--yi); font-size: 13px; font-weight: 500; }
.d-tonal .miss svg.lucide { width: 16px; height: 16px; }
.d-tonal .kv { display: grid; grid-template-columns: auto 1fr; gap: 12px 16px; font-size: 14px; }
.d-tonal .kv dt { color: var(--onv); }
.d-tonal .kv dd { margin: 0; color: var(--on); text-align: end; display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
.d-tonal .kv .chip-s { height: 24px; padding: 0 8px; border-radius: 6px; background: var(--s2); font-size: 12px; display: inline-flex; align-items: center; gap: 4px; color: var(--onv); }
.d-tonal .kv .chip-s svg.lucide { width: 14px; height: 14px; }
.d-tonal .submit-row { display: flex; align-items: center; gap: 8px; }
.d-tonal .submit-row .btn-f { flex: 1; }
.d-tonal .submit-note { display: flex; align-items: center; gap: 8px; color: var(--yi); font-size: 14px; font-weight: 500; }

/* inbox */
.d-tonal .chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 4px 0 8px; margin: 0 -16px; padding-inline: 16px; }
.d-tonal .chip { height: 32px; display: inline-flex; align-items: center; gap: 8px; padding: 0 16px; border-radius: 8px; box-shadow: inset 0 0 0 1px var(--ol); color: var(--onv); font-size: 14px; font-weight: 500; white-space: nowrap; flex: none; }
.d-tonal .chip svg.lucide { width: 18px; height: 18px; margin-inline-start: -8px; display: none; }
.d-tonal .chip[aria-pressed="true"] { background: var(--sc2); color: var(--onsc2); box-shadow: none; padding-inline-start: 8px; }
.d-tonal .chip[aria-pressed="true"] svg.lucide { display: block; margin-inline-start: 0; }
.d-tonal .chip .cnt { opacity: .8; }
.d-tonal .task { background: var(--card); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.d-tonal:not([data-theme="dark"]) .task { background: var(--s0); box-shadow: var(--sh1); }
.d-tonal .task-top { display: flex; align-items: center; gap: 12px; }
.d-tonal .task-top .row-m { gap: 0; }
.d-tonal .task h3 { font-size: 18px; line-height: 24px; font-weight: 500; }
.d-tonal .brief { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; border-radius: 12px; overflow: hidden; background: var(--olv); }
.d-tonal .brief div { background: var(--s1); padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.d-tonal .brief span { font-size: 12px; line-height: 16px; color: var(--onv); }
.d-tonal .brief b { font-size: 14px; line-height: 20px; font-weight: 500; color: var(--on); }
.d-tonal .brief .wide { grid-column: 1 / -1; }
.d-tonal .note { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--onv); }
.d-tonal .note svg.lucide { width: 18px; height: 18px; color: var(--p); }
.d-tonal .task .acts .btn { flex: 1; padding: 0 12px; }
.d-tonal .notif { display: flex; gap: 16px; align-items: flex-start; padding: 12px 16px; min-height: 64px; }
.d-tonal .notif + .notif { border-top: 1px solid var(--olv); }
.d-tonal .notif.unread { background: color-mix(in srgb, var(--pc) 35%, transparent); }
.d-tonal .notif .row-t { white-space: normal; font-size: 14px; line-height: 20px; }
.d-tonal .notif.unread .row-t { font-weight: 600; }
.d-tonal .notif .ago { font-size: 12px; color: var(--onv); white-space: nowrap; padding-top: 2px; }
.d-tonal .notif .udot { width: 8px; height: 8px; border-radius: 50%; background: var(--p); margin-top: 8px; flex: none; }
.d-tonal .notif .ti { width: 36px; height: 36px; }
.d-tonal .notif .ti svg.lucide { width: 18px; height: 18px; }
.d-tonal [hidden] { display: none !important; }

/* ---------- desktop ---------- */
.d-tonal .dkt { display: grid; grid-template-columns: 88px minmax(0, 1fr); min-height: 900px; background: var(--s); }
.d-tonal .rail { position: sticky; top: 0; height: 900px; display: flex; flex-direction: column; align-items: center; padding: 20px 0 16px; gap: 4px; }
.d-tonal .rail-logo { height: 40px; display: grid; place-items: center; margin-bottom: 8px; }
.d-tonal .rail .fab { position: static; width: 56px; height: 56px; padding: 0; justify-content: center; border-radius: 16px; box-shadow: var(--sh1); }
.d-tonal .rail .fab-l { font-size: 12px; font-weight: 500; color: var(--onv); margin: 6px 0 14px; text-align: center; line-height: 16px; }
.d-tonal .ri { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 80px; padding: 2px 0 6px; color: var(--onv); }
.d-tonal .ri .pill { width: 56px; height: 32px; border-radius: 16px; display: grid; place-items: center; position: relative; isolation: isolate; }
.d-tonal .ri .pill::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: currentColor; opacity: 0; z-index: -1; transition: opacity .15s; }
.d-tonal .ri:hover .pill::after { opacity: .08; }
.d-tonal .ri .pill svg.lucide { width: 24px; height: 24px; }
.d-tonal .ri.on .pill { background: var(--sc2); color: var(--onsc2); }
.d-tonal .ri.on .rl { color: var(--on); font-weight: 700; }
.d-tonal .rl { font-size: 12px; line-height: 16px; font-weight: 500; text-align: center; max-width: 80px; }
.d-tonal .rdiv { width: 32px; height: 1px; background: var(--olv); margin: 6px 0; }
.d-tonal .dmain { display: flex; flex-direction: column; min-width: 0; padding-inline-end: 16px; }
.d-tonal .dtop { height: 72px; display: flex; align-items: center; gap: 16px; padding-inline: 8px 0; }
.d-tonal .dtop h1 { font-size: 22px; line-height: 28px; font-weight: 400; min-width: 180px; }
.d-tonal[lang="ar"] .dtop h1 { font-weight: 600; }
.d-tonal .dsearch { flex: 1; max-width: 720px; height: 48px; border-radius: 24px; background: var(--s2); display: flex; align-items: center; gap: 12px; padding: 0 8px 0 16px; color: var(--onv); font-size: 16px; margin-inline: auto; }
.d-tonal[dir="rtl"] .dsearch { padding: 0 16px 0 8px; }
.d-tonal .dsearch .ph-t { flex: 1; }
.d-tonal .kbd { font-size: 12px; line-height: 20px; padding: 0 8px; border-radius: 6px; box-shadow: inset 0 0 0 1px var(--olv); color: var(--onv); direction: ltr; font-family: "Google Sans", system-ui, sans-serif; }
.d-tonal .dme { display: flex; align-items: center; gap: 4px; }
.d-tonal .dme .avatar { margin-inline-start: 8px; }
.d-tonal .dgrid { display: grid; grid-template-columns: minmax(0, 1fr) 392px; gap: 16px; padding-bottom: 24px; }
.d-tonal .dcol { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.d-tonal .dcal { background: var(--card); border-radius: 24px; padding: 16px 0 0; overflow: hidden; }
.d-tonal .dcal-h { display: flex; align-items: center; gap: 8px; padding: 0 16px 12px 20px; }
.d-tonal[dir="rtl"] .dcal-h { padding: 0 20px 12px 16px; }
.d-tonal .dcal-h h2 { font-size: 22px; line-height: 28px; font-weight: 400; margin-inline-end: 4px; }
.d-tonal[lang="ar"] .dcal-h h2 { font-weight: 600; }
.d-tonal .dcal-h .ib { width: 40px; height: 40px; }
.d-tonal .dcal-h .grow { flex: 1; }
.d-tonal .dleg { display: flex; gap: 14px; align-items: center; font-size: 12px; color: var(--onv); flex-wrap: wrap; }
.d-tonal .dleg span { display: inline-flex; align-items: center; gap: 6px; }
.d-tonal .dleg svg.lucide { width: 14px; height: 14px; }
.d-tonal .dleg .r { color: var(--r); }
.d-tonal .lgk { width: 18px; height: 10px; border-radius: 3px; display: inline-block; }
.d-tonal .lgk.k-solid { background: color-mix(in oklab, var(--dc) 84%, #000); }
.d-tonal .lgk.k-held { background: repeating-linear-gradient(135deg, color-mix(in oklab, var(--dc) 35%, var(--card)) 0 3px, color-mix(in oklab, var(--dc) 12%, var(--card)) 3px 6px); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dc) 70%, var(--on)); }
.d-tonal .lgk.k-lock { background: var(--s1); box-shadow: inset 0 0 0 1px var(--olv); }
.d-tonal .dwhs { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--olv); }
.d-tonal .dwh { text-align: center; font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; color: var(--onv); padding: 6px 0; }
.d-tonal[lang="ar"] .dwh { letter-spacing: 0; font-size: 12px; }
.d-tonal .dwk { display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: 34px repeat(3, 26px) 1fr; height: 112px; position: relative; }
.d-tonal .dwk + .dwk { border-top: 1px solid var(--olv); }
.d-tonal .dc { grid-row: 1 / -1; display: flex; justify-content: center; padding-top: 6px; position: relative; isolation: isolate; }
.d-tonal .dc + .dc { border-inline-start: 1px solid var(--olv); }
.d-tonal .dc.s-locked { background: color-mix(in srgb, var(--s1) 80%, transparent); }
.d-tonal[data-theme="dark"] .dc.s-locked { background: var(--s1); }
.d-tonal .dc.s-banned { background: color-mix(in srgb, var(--rc) 32%, transparent); }
.d-tonal[data-theme="dark"] .dc.s-banned { background: color-mix(in srgb, var(--rc) 20%, transparent); }
.d-tonal .dn { height: 24px; min-width: 24px; padding: 0 6px; border-radius: 12px; display: grid; place-items: center; font-size: 12px; font-weight: 500; color: var(--on); }
.d-tonal .dc.s-locked .dn { color: color-mix(in srgb, var(--on) 40%, transparent); }
.d-tonal .dc.s-banned .dn { color: var(--r); text-decoration: line-through; }
.d-tonal .dn.today { background: var(--p); color: var(--onp) !important; }
.d-tonal .dc-add { position: absolute; top: 4px; inset-inline-end: 4px; width: 28px; height: 28px; border-radius: 14px; display: grid; place-items: center; color: var(--p); opacity: 0; transition: opacity .15s; }
.d-tonal .dc-add svg.lucide { width: 18px; height: 18px; }
.d-tonal .dc.s-open:hover .dc-add, .d-tonal .dc-add:focus-visible { opacity: 1; }
.d-tonal .dc.s-open:hover { background: color-mix(in srgb, var(--p) 5%, transparent); }
.d-tonal .dban { grid-row: 2 / span 2; z-index: 1; display: flex; align-items: flex-start; gap: 6px; padding: 2px 10px; color: var(--r); font-size: 12px; line-height: 16px; font-weight: 500; }
.d-tonal .dban svg.lucide { width: 14px; height: 14px; margin-top: 1px; }
.d-tonal .dfirst { grid-row: 2; z-index: 1; margin: 1px 6px; align-self: center; justify-self: center; font-size: 11px; font-weight: 500; color: var(--p); padding: 0 8px; height: 22px; line-height: 22px; border-radius: 6px; background: var(--pc); color: var(--onpc); }
.d-tonal .dchip { grid-row: 2; z-index: 2; margin: 1px 4px; height: 24px; border-radius: 6px; padding: 0 8px; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; overflow: hidden; white-space: nowrap; min-width: 0;
  background: color-mix(in oklab, var(--dc) 84%, #000); color: #fff; }
.d-tonal .dchip.lt { background: var(--dc); color: #1F1F1F; }
.d-tonal .dchip svg.lucide { width: 14px; height: 14px; flex: none; }
.d-tonal .dchip-t { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.d-tonal .dchip-s { opacity: .8; font-weight: 400; margin-inline-start: auto; padding-inline-start: 4px; }
.d-tonal .dchip.k-held { background: repeating-linear-gradient(135deg, color-mix(in oklab, var(--dc) 30%, var(--card)) 0 5px, color-mix(in oklab, var(--dc) 12%, var(--card)) 5px 10px); color: var(--on); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--dc) 70%, var(--on)); }
.d-tonal[data-theme="dark"] .dchip:not(.k-held) { background: color-mix(in oklab, var(--dc) 72%, #fff); color: #131314; }
.d-tonal .dside .card, .d-tonal .dside .lst, .d-tonal .dside .turn { border-radius: 24px; }
.d-tonal .dside .turn { padding: 20px 20px 16px; }
.d-tonal .dside .turn h3 { font-size: 22px; line-height: 28px; }
.d-tonal .panel { background: var(--card); border-radius: 24px; padding: 8px 0 4px; }
.d-tonal .panel .sh { padding: 0 12px 0 20px; }
.d-tonal[dir="rtl"] .panel .sh { padding: 0 20px 0 12px; }
.d-tonal .panel .row { padding: 10px 20px; min-height: 64px; }
.d-tonal .panel .row + .row { border-top: 0; }
.d-tonal .panel .row .stp-s { max-width: 200px; }
.d-tonal .flow-card { background: var(--card); border-radius: 24px; padding: 8px 20px 20px; }
.d-tonal .flow-card .sh { padding: 0; }
.d-tonal .drow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.d-tonal .dstats { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--card); border-radius: 24px; }
.d-tonal .dstats .stat { padding: 16px 20px; }
.d-tonal .dstats .stat + .stat { border-inline-start: 1px solid var(--olv); }
`;

  /* ---------- screens ---------- */

  const phone = {
    home(c) {
      const counts = stageCounts(c);
      return `<div class="ph">
        <div class="ph-main">
          ${searchBar(c)}
          <section class="hello">
            <h1>${c.t("أهلًا إبراهيم", "Hi Ibrahim")}</h1>
            <p>${c.t("دورك الحين في طلب واحد، و٣ طلبات بانتظار فرقك.", "One request needs you, and 3 are waiting on your teams.")}</p>
          </section>
          ${turnCard(c)}
          ${sectionHead(c, "طلبات قسمك", "Your department's requests", ALL)}
          <div class="lst o">${myRequestRows(c)}</div>
          ${sectionHead(c, "بانتظار فرقك", "Waiting on your teams", ALL)}
          <div class="lst o">${inboxRows(c)}</div>
          ${sectionHead(c, "المسار في النادي", "Across the club")}
          <div class="card o" style="padding:20px 8px 16px">${stepper(c, null, "l", counts)}</div>
          ${sectionHead(c, "الفعاليات", "Events", ALL)}
          <div class="lst o">${eventRows(c)}</div>
          ${sectionHead(c, "يحتاج انتباهك", "Needs your attention")}
          <div class="lst o">${attentionRows(c)}</div>
          ${sectionHead(c, "الأرقام", "Numbers")}
          <div class="lst o stats">${statsGrid(c)}</div>
        </div>
        ${navbar(c, "home", true)}
      </div>`;
    },

    book(c) {
      return `<div class="ph">
        <div class="ph-main flow">
          <div class="tab-bar">
            <button type="button" class="ib" aria-label="${c.t("رجوع", "Back")}">${c.icon("arrow-left", "flip-rtl")}</button>
            <h1>${c.t("احجز موعدًا", "Book dates")}</h1>
            <button type="button" class="ib" aria-label="${c.t("مساعدة", "Help")}">${c.icon("circle-help")}</button>
          </div>
          <button type="button" class="field"><span class="flabel">${c.t("أي قسم؟", "Which department?")}</span>
            <span class="fval">${av(c, "mobile", 28)}${c.L(c.dept("mobile"))}</span>${c.icon("chevron-down")}</button>
          <div class="support">${c.t("بصفتك مشرفًا عامًا يمكنك الحجز لأي قسم وفي أي يوم.", "As a super admin you can book for any department, on any day.")}</div>
          <div class="hint">${c.icon("info")}<span>${c.t("اضغط أول يوم ثم آخر يوم. نحجزها لك ٢٤ ساعة حتى تُكمل الطلب.", "Tap the first day, then the last. We hold them for 24 hours while you fill in the request.")}</span></div>
          <div class="mhead">
            <h2>${c.date("2026-10-01", { month: "long", year: "numeric" })}</h2>
            <button type="button" class="ib" aria-label="${c.t("الشهر السابق", "Previous month")}">${c.icon("chevron-left", "flip-rtl")}</button>
            <button type="button" class="ib" aria-label="${c.t("الشهر التالي", "Next month")}">${c.icon("chevron-right", "flip-rtl")}</button>
          </div>
          ${phoneMonth(c, [23, 24])}
          ${legend(c)}
          ${sectionHead(c, "أيام أغلقتها اللوجستيات", "Days Logistics closed")}
          <div class="lst o closed">${[18, 25]
            .map((d) => {
              const day = c.data.calendar.days[d];
              const iso = `2026-10-${d}`;
              return `<div class="rli"><span class="ti t-r">${c.icon("ban")}</span><span class="row-m"><span class="row-t" style="font-size:14px">${c.date(iso, { weekday: "long", day: "numeric", month: "long" })}</span><span class="row-s">${c.L(day.reason)}</span></span></div>`;
            })
            .join("")}</div>
        </div>
        <div class="sticky-bar">
          <div class="bk-row">
            <div class="bk-sum">
              <div class="bk-r tab" data-bk-range>${c.range("2026-10-23", "2026-10-24")} · ${dayCount(c, 2)}</div>
              <div class="bk-d">${c.L(c.dept("mobile"))} · ${c.t("تُحجز لك ٢٤ ساعة", "held for 24 hours")}</div>
            </div>
            <button type="button" class="btn btn-t">${c.t("إلغاء", "Cancel")}</button>
          </div>
          <button type="button" class="btn btn-f big" data-bk-go>${c.icon("calendar-check")}${c.t("احجز", "Book")}</button>
        </div>
      </div>`;
    },

    request(c) {
      const r = c.req("r1");
      const d = r.details;
      const SEC_ICON = { details: "file-text", design: "palette", logistics: "truck" };
      const missing = r.sections.flatMap((s) => s.missing).length;
      return `<div class="ph">
        <div class="ph-main flow">
          <div class="tab-bar">
            <button type="button" class="ib" aria-label="${c.t("مسار الفعاليات", "Pipeline")}">${c.icon("arrow-left", "flip-rtl")}</button>
            <h1></h1>
            <button type="button" class="ib" aria-label="${c.t("خيارات", "Options")}">${c.icon("ellipsis-vertical")}</button>
          </div>
          <div class="rq-head">
            <span>${stageChip(c, r)}</span>
            <h1>${c.L(r.title)}</h1>
            <div class="rq-meta">
              <span>${av(c, r.dept, 24)}${c.L(c.dept(r.dept))}</span>
              <span>${c.icon("calendar")}<span class="tab">${c.range(r.start, r.end)}</span></span>
              <span>${c.icon("user")}${c.t(`بدأه ${c.L(r.createdBy)}`, `Started by ${c.L(r.createdBy)}`)}</span>
            </div>
          </div>
          <div class="hold">
            <span class="ti">${c.icon("timer")}</span>
            <div class="hold-m">
              <div class="hold-t">${c.t("الأيام محجوزة", "Dates held")}</div>
              <div class="hold-b">${c.t("أكمل بيانات الفعالية والطلبين ثم أرسل قبل انتهاء الحجز:", "Fill in the event and both briefs, then submit before the hold runs out:")}</div>
            </div>
            <div class="hold-cd tab">${c.cd(r.holdMs, "hms")}</div>
          </div>
          <div class="card o stp-card">${stepper(c, r, "l")}</div>
          ${sectionHead(c, "ما المطلوب", "What's needed")}
          <div class="lst o sec">${r.sections
            .map(
              (s) => `<button type="button" class="row">
              <span class="ti t-b">${c.icon(SEC_ICON[s.key])}</span>
              <span class="row-m">
                <span class="row-t">${c.L(s)}</span>
                <span class="row-s tab">${c.t(`${c.n(s.done)} من ${c.n(s.total)}`, `${s.done} of ${s.total}`)}</span>
                <span class="bar"><i style="width:${(s.done / s.total) * 100}%"></i></span>
                ${s.missing.map((m) => `<span class="miss">${c.icon("circle-alert")}${c.t("ناقص:", "Missing:")} ${c.L(m)}</span>`).join("")}
              </span>
              ${c.icon("chevron-right", "flip-rtl chev")}
            </button>`,
            )
            .join("")}</div>
          ${sectionHead(c, "بيانات الفعالية", "Event details", { ar: "تعديل", en: "Edit" })}
          <div class="card o">
            <dl class="kv">
              <dt>${c.t("نوع الفعالية", "Event type")}</dt><dd>${c.L(r.type)}</dd>
              <dt>${c.t("المقدّم", "Presenter")}</dt><dd>${c.L(d.presenter)}</dd>
              <dt>${c.t("الوقت (كل يوم)", "Time (every day)")}</dt><dd class="tab">${c.L(d.time)}</dd>
              <dt>${c.t("الأيام", "Days")}</dt><dd>${d.modes
                .map((m) => `<span class="chip-s">${c.icon(m.mode === "online" ? "video" : "map-pin")}${c.date(m.date)} · ${m.mode === "online" ? c.t("عن بُعد", "Online") : c.t("حضوري", "On-site")}</span>`)
                .join("")}</dd>
              <dt>${c.t("الفئة", "Audience")}</dt><dd>${c.L(d.audience)}</dd>
              <dt>${c.t("التسجيل", "Registration")}</dt><dd>${c.L(d.registration)}</dd>
              <dt>${c.t("المقبولون", "Accepted")}</dt><dd class="tab">${c.n(d.expected)}</dd>
            </dl>
          </div>
        </div>
        <div class="sticky-bar">
          <div class="submit-note">${c.icon("circle-alert")}${thingsLeft(c, missing)}</div>
          <div class="submit-row">
            <button type="button" class="btn btn-o">${c.t("إكمال لاحقًا", "Finish later")}</button>
            <button type="button" class="btn btn-f big" disabled>${c.icon("send", "flip-rtl")}${c.t("إرسال", "Submit")}</button>
          </div>
        </div>
      </div>`;
    },

    inbox(c) {
      const it = c.data.inbox[0];
      const r = c.req(it.request);
      const b = it.brief;
      const rest = c.data.inbox.slice(1);
      const NIC = { request_received: ["inbox", "b"], task_done: ["circle-check", "g"], returned: ["corner-up-left", "r"], ready_to_publish: ["rocket", "b"], media_received: ["megaphone", "b"], dates_banned: ["ban", "r"], hold_expired: ["timer-off", "r"] };
      const teams = ["design", "logistics", "media"];
      return `<div class="ph">
        <div class="ph-main">
          <div class="tab-bar">
            <button type="button" class="ib" aria-label="${c.t("رجوع", "Back")}">${c.icon("arrow-left", "flip-rtl")}</button>
            <h1>${c.t("بانتظار فرقك", "Waiting on your teams")}</h1>
            <button type="button" class="ib" aria-label="${c.t("بحث", "Search")}">${c.icon("search")}</button>
          </div>
          <div class="chips" role="group" aria-label="${c.t("الفريق", "Team")}">
            <button type="button" class="chip" data-team="all" aria-pressed="true">${c.icon("check")}${c.t("الكل", "All")} <span class="cnt tab">${c.n(3)}</span></button>
            ${teams.map((t) => `<button type="button" class="chip" data-team="${t}" aria-pressed="false">${c.icon("check")}${teamName(c, t)} <span class="cnt tab">${c.n(1)}</span></button>`).join("")}
          </div>
          <article class="task" data-team="${it.team}">
            <div class="task-top">
              ${av(c, r.dept, 40)}
              <span class="row-m"><span class="row-s" style="color:var(--on)">${c.L(c.dept(r.dept))}</span><span class="row-s">${c.L(it.received)}</span></span>
              <span class="sc t-y sm">${teamName(c, it.team)} · ${c.L(c.data.taskStatus.open)}</span>
            </div>
            <h3>${c.L(r.title)}</h3>
            <div class="rq-meta" style="margin-top:-8px"><span>${c.icon("calendar")}<span class="tab">${c.range(r.start, r.end)}</span></span><span>${c.icon("map-pin")}${c.t("حضوري", "On-site")}</span></div>
            ${stepper(c, r, "s")}
            <div class="brief">
              <div><span>${c.t("نوع التصميم", "Design type")}</span><b>${c.L(b.type)}</b></div>
              <div><span>${c.t("المقاس", "Size")}</span><b>${c.L(b.size)}</b></div>
              <div><span>${c.t("نوع الملف النهائي", "Final file type")}</span><b>${b.file}</b></div>
              <div><span>${c.t("اللوجستيات", "Logistics")}</span><b style="color:var(--g)">${c.L(c.data.taskStatus.done)}</b></div>
              <div class="wide"><span>${c.t("حالة المحتوى", "Content status")}</span><b>${c.L(b.content)}</b></div>
            </div>
            <div class="note">${c.icon("info")}${c.t(`يمكن إعادته حتى ${c.date(it.returnUntil, { day: "numeric", month: "long" })}`, `Can be returned until ${c.date(it.returnUntil, { day: "numeric", month: "long" })}`)}</div>
            <div class="acts">
              <button type="button" class="btn btn-o">${c.icon("corner-up-left", "flip-rtl")}${c.t("إعادة مع ملاحظات", "Return with notes")}</button>
              <button type="button" class="btn btn-f">${c.icon("check")}${c.t("إنهاء مهمة التصميم", "Mark Design done")}</button>
            </div>
          </article>
          <div class="lst o" style="margin-top:8px">${rest
            .map((x) => {
              const rq = c.req(x.request);
              const extra = x.brief && x.brief.venue ? ` · ${x.brief.venue}` : "";
              return `<button type="button" class="row" data-team="${x.team}">${av(c, x.team, 40)}<span class="row-m"><span class="row-t">${c.L(rq.title)}</span><span class="row-s"><span>${teamName(c, x.team)}</span><span class="sep">·</span><span>${c.L(x.received)}${extra}</span></span></span>${c.icon("chevron-right", "flip-rtl chev")}</button>`;
            })
            .join("")}</div>
          ${sectionHead(c, "الإشعارات", "Notifications", { ar: "تعليم الكل كمقروء", en: "Mark all read" })}
          <div class="lst o">${c.data.notifications
            .map((n) => {
              const [ic, tn] = NIC[n.kind];
              return `<div class="notif${n.unread ? " unread" : ""}"><span class="ti t-${tn}">${c.icon(ic, ic === "corner-up-left" ? "flip-rtl" : "")}</span><span class="row-m"><span class="row-t">${c.L(n.text)}</span></span><span class="ago">${c.L(n.ago)}</span>${n.unread ? '<span class="udot" aria-label="unread"></span>' : ""}</div>`;
            })
            .join("")}</div>
        </div>
        ${navbar(c, "pipeline", false)}
      </div>`;
    },
  };

  function desktop(c) {
    const counts = stageCounts(c);
    let first = true;
    const rail = c.data.nav
      .map((g, gi) => {
        const items = g.items
          .map((it) => {
            const on = it.key === "home";
            return `<button type="button" class="ri${on ? " on" : ""}" ${on ? 'aria-current="page"' : ""}><span class="pill">${c.icon(it.icon)}${it.key === "pipeline" ? `<span class="nbadge tab">${c.n(3)}</span>` : ""}</span><span class="rl">${c.L(it)}</span></button>`;
          })
          .join("");
        const div = first ? "" : '<span class="rdiv" aria-hidden="true"></span>';
        first = false;
        return div + items;
      })
      .join("");
    return `<div class="dkt">
      <nav class="rail" aria-label="${c.t("التنقل", "Navigation")}">
        <div class="rail-logo">${c.logo(22)}</div>
        <button type="button" class="fab" aria-label="${c.t("احجز موعدًا", "Book dates")}">${c.icon("calendar-plus")}</button>
        <span class="fab-l">${c.t("احجز موعدًا", "Book dates")}</span>
        ${rail}
      </nav>
      <div class="dmain">
        <header class="dtop">
          <h1>${c.t("الرئيسية", "Home")}</h1>
          <div class="dsearch" role="search">${c.icon("search")}<span class="ph-t">${c.t("ابحث عن فعالية أو عضو أو صفحة…", "Search events, members, pages…")}</span><span class="kbd">⌘K</span></div>
          <div class="dme">
            <button type="button" class="ib" aria-label="${c.t("مساعدة", "Help")}">${c.icon("circle-help")}</button>
            <button type="button" class="ib" aria-label="${c.t("الإشعارات", "Notifications")}">${c.icon("bell")}<span class="badge tab">${c.n(3)}</span></button>
            <span class="avatar">${c.t("إب", "I")}</span>
          </div>
        </header>
        <div class="dgrid">
          <div class="dcol">
            <section class="dcal" aria-labelledby="dcal-h">
              <div class="dcal-h">
                <h2 id="dcal-h">${c.date("2026-10-01", { month: "long", year: "numeric" })}</h2>
                <button type="button" class="ib" aria-label="${c.t("الشهر السابق", "Previous month")}">${c.icon("chevron-left", "flip-rtl")}</button>
                <button type="button" class="ib" aria-label="${c.t("الشهر التالي", "Next month")}">${c.icon("chevron-right", "flip-rtl")}</button>
                <button type="button" class="btn btn-o sm" style="padding:0 16px">${c.t("اليوم", "Today")}</button>
                <span class="grow"></span>
                ${deskLegend(c)}
              </div>
              ${deskMonth(c)}
            </section>
            <section class="flow-card">
              ${sectionHead(c, "المسار في النادي", "Across the club", { ar: "كل الطلبات", en: "All requests" })}
              ${stepper(c, null, "l", counts)}
            </section>
            <div class="drow">
              <section class="panel">${sectionHead(c, "الفعاليات", "Events", ALL)}${eventRows(c)}</section>
              <section class="panel">${sectionHead(c, "يحتاج انتباهك", "Needs your attention")}${attentionRows(c)}</section>
            </div>
            <section class="dstats" aria-label="${c.t("الأرقام", "Numbers")}">${statsGrid(c)}</section>
          </div>
          <aside class="dcol dside">
            ${turnCard(c, "side")}
            <section class="panel">${sectionHead(c, "بانتظار فرقك", "Waiting on your teams", ALL)}${inboxRows(c)}</section>
            <section class="panel">${sectionHead(c, "طلبات قسمك", "Your department's requests", ALL)}${myRequestRows(c)}</section>
          </aside>
        </div>
      </div>
    </div>`;
  }

  /* ---------- interactions ---------- */

  function after(root, c) {
    // Book: tap first day, then last; a closed/booked day in between starts over.
    root.querySelectorAll('.d-tonal[data-screen="book"]').forEach((scr) => {
      let sel = [23, 24];
      let picking = false;
      const days = c.data.calendar.days;
      const paint = () => {
        scr.querySelectorAll(".cday[data-d]").forEach((b) => {
          const d = +b.dataset.d;
          b.classList.remove("sel-a", "sel-b", "sel-m", "sel-one");
          b.removeAttribute("aria-pressed");
          if (d >= sel[0] && d <= sel[1]) {
            b.classList.add(sel[0] === sel[1] ? "sel-one" : d === sel[0] ? "sel-a" : d === sel[1] ? "sel-b" : "sel-m");
            b.setAttribute("aria-pressed", "true");
          }
        });
        const pad = (x) => `2026-10-${String(x).padStart(2, "0")}`;
        const n = sel[1] - sel[0] + 1;
        const out = scr.querySelector("[data-bk-range]");
        if (out) out.textContent = `${c.range(pad(sel[0]), pad(sel[1]))} · ${dayCount(c, n)}`;
      };
      scr.addEventListener("click", (e) => {
        const b = e.target.closest(".cday[data-d]");
        if (!b || b.disabled) return;
        const d = +b.dataset.d;
        if (!picking || d < sel[0]) {
          sel = [d, d];
          picking = true;
        } else {
          let ok = true;
          for (let x = sel[0]; x <= d; x++) if (days[x].status !== "open") ok = false;
          sel = ok ? [sel[0], d] : [d, d];
          picking = !ok;
        }
        paint();
      });
    });
    // Inbox: filter chips.
    root.querySelectorAll('.d-tonal[data-screen="inbox"]').forEach((scr) => {
      scr.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip[data-team]");
        if (!chip) return;
        const team = chip.dataset.team;
        scr.querySelectorAll(".chip[data-team]").forEach((x) => x.setAttribute("aria-pressed", String(x === chip)));
        scr.querySelectorAll(".task[data-team], .row[data-team]").forEach((el) => {
          el.hidden = team !== "all" && el.dataset.team !== team;
        });
      });
    });
  }

  (window.GDG_DESIGNS = window.GDG_DESIGNS || []).push({
    id: ID,
    order: 4,
    meta: {
      name: { ar: "طابع Google", en: "Google Tonal" },
      tagline: { ar: "كأنه تطبيق من Google", en: "Feels like a Google app" },
      badge: { ar: "اختيار Claude", en: "Claude's pick" },
      thesis: {
        ar: "GDG مجتمع Google، فخلّ اللوحة تحس إنها تطبيق من Google: أسطح Material 3 هادئة مشتقة من أزرق GDG، وتقويم حجز بلغة Google Calendar (الحجوزات شرائح بلون القسم، واليوم محاط، والاختيار شريط ملوّن)، وشريط تنقل مع زر «احجز موعدًا» العائم في الجوال، وشريط جانبي في سطح المكتب. وألوان Google الأربعة تُستخدم مثل ما تستخدمها Google: للحالة فقط.",
        en: "GDG is Google's community, so make the console feel like a Google app: calm Material 3 tonal surfaces seeded from GDG blue, a booking calendar in Google Calendar's grammar (bookings as department-coloured chips, today ringed, the selection a tonal band), a navigation bar with a floating “Book dates” button on phones and a navigation rail on desktop. The four Google colours are used the way Google uses them: for status only.",
      },
      type: { ar: "Google Sans للاتيني و Noto Sans Arabic للعربي، بأدوار Material 3 (عنوان ٢٤، عنوان قائمة ١٦، نص ١٤).", en: "Google Sans for Latin, Noto Sans Arabic for Arabic, on Material 3 type roles (headline 24, title 16, body 14)." },
      nav: { ar: "الجوال: شريط سفلي (الرئيسية، المسار، الفعاليات، المزيد) وزر عائم «احجز موعدًا». سطح المكتب: شريط تنقل جانبي والزر العائم أعلاه.", en: "Phone: bottom navigation bar (Home, Pipeline, Events, More) plus an extended “Book dates” FAB. Desktop: navigation rail with the FAB at the top." },
      why: { ar: "هي لغة أدوات Google اللي يعيش فيها النادي أصلًا (التقويم، النماذج، Gmail) والعلامة اللي يمثلها النادي. ما أحد يحتاج يتعلم شيء، ومكونات Material تغطي كل أنماط الإدارة (جداول، نماذج، نوافذ) اللي يحتاجها باقي التطبيق.", en: "It is the language of the Google tools the club already lives in (Calendar, Forms, Gmail) and the brand the club represents. Nobody has to learn anything, and Material's components cover every admin pattern (tables, forms, dialogs) the rest of the app needs." },
      risk: { ar: "الأكثر ألفة بين الأربعة: يبان كأنه تطبيق Google، وهذا المقصود لنادي GDG، لكنه أيضًا المكان اللي توصل له أغلب التصاميم في هذا النوع. تميّزه يجي من الإتقان والتقويم فقط.", en: "The most familiar of the four: it reads like a Google app, which is the point for a GDG club, but it is also where most designs in this category land. Its distinctiveness comes only from craft and the calendar." },
      palette: [
        { name: { ar: "أساسي", en: "Primary" }, hex: "#0B57D0" },
        { name: { ar: "حاوية أساسية", en: "Primary container" }, hex: "#D3E3FD" },
        { name: { ar: "سطح", en: "Surface" }, hex: "#F8FAFD" },
        { name: { ar: "حاوية سطح", en: "Surface container" }, hex: "#E9EEF6" },
        { name: { ar: "حبر", en: "On surface" }, hex: "#1F1F1F" },
        { name: { ar: "تم / شغال", en: "Done / live" }, hex: "#34A853" },
        { name: { ar: "دورك", en: "Your turn" }, hex: "#FBBC04" },
        { name: { ar: "مُعاد / متأخر", en: "Returned / overdue" }, hex: "#EA4335" },
        { name: { ar: "سطح داكن", en: "Dark surface" }, hex: "#131314" },
      ],
      swatch: "#0B57D0",
      raises: [
        { ar: "من «خط المترو»: تقدّم الطلب مكوّن واحد بنفس الشكل في كل مكان (محطات على مسار، الحالية محاطة، المُعاد بالأحمر)، حتى أرقام المسار في النادي تستخدمه.", en: "From Metro Line: request progress is one component, identical everywhere (stations on a track, current ringed, returned red); even the club-wide counts use it." },
        { ar: "من «الطين والأبواب»: اللون يظهر فقط حيث يعني حالة؛ كل ما عداه أسطح محايدة.", en: "From Mud & Doors: colour appears only where it means state; everything else is tonal neutral." },
      ],
      fonts: ["Google+Sans:wght@400;500;700"],
    },
    css,
    phone,
    desktop,
    after,
  });
})();
