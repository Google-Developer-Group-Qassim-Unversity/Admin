/*
 * Design 2: Metro Line. Every request is a train on one line, drawn in
 * Riyadh Metro wayfinding grammar. Scoped under .d-metro.
 */
(function () {
  const STEP = { draft: 0, in_review: 1, returned: 1, media: 2, ready: 3, published: 4 };
  const TEAM_ICON = { design: "palette", logistics: "truck", media: "megaphone" };

  /** amber = your turn, scarlet = returned/overdue, green = done/live, cobalt = moving/open. */
  function stateOf(r) {
    if (r.stage === "returned") return "scarlet";
    if (r.stage === "published") return "green";
    if (r.whoseTurn === "you") return "amber";
    return "cobalt";
  }

  function whereLabel(c, r) {
    if (r.stage === "published") return c.L(c.data.stages.published);
    if (r.stage === "ready") return c.L(c.data.stages.ready);
    if (r.stage === "draft") return c.L(c.data.stages.draft);
    if (r.stage === "returned") return c.t("عند " + c.dept(r.dept).short.ar, "With " + c.dept(r.dept).short.en);
    const team = c.dept(r.whoseTurn);
    return team ? c.t("عند " + team.ar, "With " + team.en) : c.L(c.data.stages[r.stage]);
  }

  /* ---------- the line map ---------- */

  function lineMap(c, o) {
    const D = c.data;
    const rtl = c.dir === "rtl";
    const { W, H, Y, pad, d, spread, loop, lw, r } = o;
    const X = (x) => (rtl ? W - x : x);
    const fr = [0, 0.33, 0.6, 0.81, 1];
    const xs = fr.map((f) => pad + (W - 2 * pad) * f);
    const counts = { draft: 0, in_review: 0, returned: 0, media: 0, ready: 0, published: 0 };
    D.requests.forEach((q) => counts[q.stage]++);
    const a = xs[1] - spread;
    const b = xs[1] + spread;
    const ly = Y + loop;
    const ls = xs[1] - 6; // loop leaves the lower track just before the interchange
    const lx1 = ls - (ly - (Y + d));
    const lx2 = xs[0] + (ly - Y);
    const P = (pts) => "M" + pts.map(([x, y]) => `${X(x).toFixed(1)} ${y.toFixed(1)}`).join(" L");

    const tracks = `
      <path class="trk loop" d="${P([[ls, Y + d], [lx1, ly], [lx2, ly], [xs[0], Y]])}" stroke-width="${lw - 2}"/>
      <path class="trk cob" d="${P([[xs[0], Y], [a, Y]])}" stroke-width="${lw}"/>
      <path class="trk cob" d="${P([[a, Y], [a + d, Y - d], [b - d, Y - d], [b, Y]])}" stroke-width="${lw}"/>
      <path class="trk cob" d="${P([[a, Y], [a + d, Y + d], [b - d, Y + d], [b, Y]])}" stroke-width="${lw}"/>
      <path class="trk cob" d="${P([[b, Y], [xs[3], Y]])}" stroke-width="${lw}"/>
      <path class="trk grn" d="${P([[xs[3], Y], [xs[4], Y]])}" stroke-width="${lw}"/>`;

    const labels = [
      [c.t("مسودة", "Draft")],
      c.lang === "ar" ? ["التصميم", "واللوجستيات"] : ["Design &", "Logistics"],
      [c.t("الإعلام", "Media")],
      [c.t("جاهز", "Ready")],
      [c.t("منشور", "Published")],
    ];
    const keys = ["draft", "in_review", "media", "ready", "published"];
    const fs = o.fs || 11.5;

    const stations = keys
      .map((k, i) => {
        const x = X(xs[i]);
        const n = counts[k];
        const lab = labels[i];
        const ty = i === 1 ? Y - d - r - 8 - (lab.length - 1) * (fs + 3) : Y - r - 8 - (lab.length - 1) * (fs + 3);
        const text = `<text class="st-lab" x="${x}" y="${ty}" text-anchor="middle" font-size="${fs}">${lab
          .map((l, j) => `<tspan x="${x}" dy="${j ? fs + 3 : 0}">${l}</tspan>`)
          .join("")}</text>`;
        const num = `<text class="st-num" x="${x}" y="${Y}" text-anchor="middle" dominant-baseline="central" font-size="${r * 1.05}">${c.n(n)}</text>`;
        let mark;
        if (i === 1) {
          mark = `<rect class="st ic" x="${x - r}" y="${Y - d - r}" width="${2 * r}" height="${2 * d + 2 * r}" rx="${r}"/>`;
        } else if (i === 4) {
          mark = `<circle class="st term" cx="${x}" cy="${Y}" r="${r}"/>`;
        } else {
          mark = `<circle class="st" cx="${x}" cy="${Y}" r="${r}"/>`;
        }
        const pulse = k === "draft" ? `<circle class="pulse" cx="${x}" cy="${Y}" r="${r + 3}"/><circle class="turn-ring" cx="${x}" cy="${Y}" r="${r + 3}"/>` : "";
        return `<g class="station s-${k}">${pulse}${mark}${num}${text}</g>`;
      })
      .join("");

    const rx = X((lx1 + lx2) / 2);
    const ret = `<g class="station s-ret"><circle class="st ret" cx="${rx}" cy="${ly}" r="${r - 2}"/>
      <text class="st-num on" x="${rx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="${(r - 2) * 1.05}">${c.n(counts.returned)}</text>
      <text class="st-lab ret-lab" x="${rx}" y="${ly + r + fs + 2}" text-anchor="middle" font-size="${fs - 0.5}">${c.t("مُعاد", "Returned")}</text></g>`;

    return {
      svg: `<svg class="m-map" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${c.t("خط المسار: عدد الطلبات في كل محطة", "The pipeline line: requests at each station")}">${tracks}${stations}${ret}</svg>`,
      xs: xs.map(X),
      retX: rx,
    };
  }

  /** A five-tick line showing how far one request has travelled. */
  function miniLine(step, state) {
    const ticks = [0, 1, 2, 3, 4]
      .map((i) => {
        const x = 5 + i * 19;
        const cls = i < step ? "past" : i === step ? `now ${state}` : "fut";
        return `<circle class="mt ${cls}" cx="${x}" cy="6" r="${i === step ? 4.5 : 3.5}"/>`;
      })
      .join("");
    const done = 5 + Math.max(0, step) * 19;
    return `<svg class="m-mini flip-rtl" viewBox="0 0 86 12" width="86" height="12" aria-hidden="true">
      <line class="ml" x1="5" y1="6" x2="81" y2="6"/><line class="ml past" x1="5" y1="6" x2="${done}" y2="6"/>${ticks}</svg>`;
  }

  /* ---------- shared pieces ---------- */

  function whenTile(c, iso, state) {
    return `<span class="flap ${state || ""}"><b>${c.date(iso, { day: "numeric" })}</b><small>${c.date(iso, { month: "short" })}</small></span>`;
  }

  function deptTag(c, key, short) {
    const dp = c.dept(key);
    return `<span class="dtag"><i style="--dc:${dp.color}"></i>${short ? c.L(dp.short) : c.L(dp)}</span>`;
  }

  function statusCell(c, r) {
    const st = stateOf(r);
    if (r.stage === "draft" && r.holdMs) return `<span class="clock amber" title="${c.t("ينتهي الحجز", "Hold ends")}">${c.cd(r.holdMs, "hms")}</span>`;
    if (r.stage === "returned" && r.fixMs) return `<span class="clock scarlet" title="${c.t("مهلة التعديل", "Fix window")}">${c.cd(r.fixMs, "hms")}</span>`;
    return `<span class="pill ${st}">${whereLabel(c, r)}</span>`;
  }

  function boardRowPhone(c, r) {
    const st = stateOf(r);
    return `<a class="brow ${st}" href="#" onclick="return false">
      ${whenTile(c, r.start, st === "cobalt" ? "" : st)}
      <span class="bmain">
        <b class="btitle">${c.L(r.title)}</b>
        <span class="bsub">${deptTag(c, r.dept, true)}<span class="sep">·</span>${c.range(r.start, r.end)}</span>
        ${miniLine(STEP[r.stage], st)}
      </span>
      <span class="bstat">${statusCell(c, r)}</span>
    </a>`;
  }

  function topBar(c) {
    return `<header class="m-top">
      <span class="brand">${c.logo(22)}<span><b>${c.t("GDG القصيم", "GDG Qassim")}</b><small>${c.t("لوحة الإدارة", "Admin console")}</small></span></span>
      <span class="top-actions">
        <button class="icon-btn" aria-label="${c.t("الإشعارات (٣ جديدة)", "Notifications (3 new)")}">${c.icon("bell")}<span class="badge">${c.n(3)}</span></button>
        <span class="avatar" aria-hidden="true">${c.t("إب", "I")}</span>
      </span>
    </header>`;
  }

  function navBar(c, active) {
    const items = [
      ["home", "house", c.t("الرئيسية", "Home")],
      ["line", "route", c.t("الخط", "Line")],
      ["events", "calendar-days", c.t("الفعاليات", "Events")],
      ["inbox", "inbox", c.t("بانتظارك", "For you"), 3],
      ["more", "menu", c.t("المزيد", "More")],
    ];
    return `<nav class="m-nav" aria-label="${c.t("التنقل", "Navigation")}">${items
      .map(
        ([k, ic, lab, badge]) =>
          `<a href="#" onclick="return false" class="${k === active ? "on" : ""}" ${k === active ? 'aria-current="page"' : ""}><span class="ni">${c.icon(ic)}${badge ? `<span class="badge">${c.n(badge)}</span>` : ""}</span><span>${lab}</span></a>`,
      )
      .join("")}</nav>`;
  }

  function sectionHead(c, title, link, count) {
    return `<div class="sh"><h2>${title}${count != null ? ` <span class="cnt">${c.n(count)}</span>` : ""}</h2>${link ? `<a href="#" onclick="return false">${link}${c.icon("chevron-right", "flip-rtl")}</a>` : ""}</div>`;
  }

  function teamBadge(c, team, size) {
    const dp = c.dept(team);
    return `<span class="tbadge${size ? " " + size : ""}" style="--tc:${dp.color}" title="${c.L(dp)}">${c.icon(TEAM_ICON[team])}</span>`;
  }

  function inboxRow(c, item) {
    const r = c.req(item.request);
    return `<a class="irow" href="#" onclick="return false">${teamBadge(c, item.team)}
      <span class="bmain"><b class="btitle">${c.L(r.title)}</b>
      <span class="bsub"><span class="tname" style="--tc:${c.dept(item.team).color}">${c.L(c.dept(item.team))}</span><span class="sep">·</span>${deptTag(c, r.dept, true)}<span class="sep">·</span>${c.L(item.received)}</span></span>
      ${c.icon("chevron-right", "flip-rtl chev")}</a>`;
  }

  function eventRow(c, e) {
    const st = e.status === "active" ? "green" : e.status === "open" ? "cobalt" : "neutral";
    const when = e.status === "active" ? c.t("الآن", "Now") : c.L(e.when);
    const extra =
      e.attended != null ? c.t(`${c.n(e.attended)} حضروا`, `${c.n(e.attended)} attended`) : e.responses != null ? c.t(`${c.n(e.responses)} تسجيل`, `${c.n(e.responses)} sign-ups`) : c.t("مسودة", "Draft");
    return `<div class="erow ${st}">
      <span class="etime ${st}">${e.status === "active" ? '<span class="live-dot"></span>' : ""}${when}</span>
      <span class="bmain"><b class="btitle">${c.L(e.title)}</b><span class="bsub">${deptTag(c, e.dept, true)}<span class="sep">·</span>${c.L(e.where)}<span class="sep">·</span>${extra}</span></span>
      <button class="btn sm ghost">${c.L(e.next)}</button></div>`;
  }

  function attentionRow(c, a) {
    const tone = { red: "scarlet", yellow: "amber", blue: "cobalt" }[a.tone];
    const ic = { overdue: "clock-alert", certificates: "award", closingSoon: "users" }[a.kind];
    return `<div class="arow">
      <span class="aic ${tone}">${c.icon(ic)}</span>
      <span class="bmain"><b class="btitle">${c.L(a.title)}</b><span class="bsub">${c.L(a.event)}<span class="sep">·</span>${c.L(a.detail)}</span></span>
      <button class="btn sm ${tone === "scarlet" ? "danger" : "ghost"}">${c.L(a.action)}</button></div>`;
  }

  function statsPanel(c) {
    const s = c.data.stats;
    const row = (k, v, h) => `<div class="kv"><span>${k}${h ? `<small>${h}</small>` : ""}</span><b>${v}</b></div>`;
    return `<div class="panel stats">
      ${row(c.t("التسجيل مفتوح", "Open for registration"), c.n(s.open))}
      ${row(c.t("شغالة الحين", "Running now"), c.n(s.live))}
      ${row(c.t("الأعضاء", "Members"), c.n(s.members), c.t(`${c.n(s.verified)} موثّق · ${c.n(s.pending)} بانتظار التوثيق`, `${c.n(s.verified)} verified · ${c.n(s.pending)} pending`))}
      ${row(c.t("الرسائل المرسلة (٢٤ ساعة)", "Emails sent (24h)"), c.n(s.emails24h))}
    </div>`;
  }

  /* ---------- calendar ---------- */

  function weekdays(c, style) {
    // 4 Oct 2026 is a Sunday.
    return [4, 5, 6, 7, 8, 9, 10].map((d) => c.weekday(`2026-10-${String(d).padStart(2, "0")}`, style));
  }

  function calendarGrid(c, opts) {
    const D = c.data;
    const sel = opts.sel || [23, 24];
    const cells = [];
    for (let i = 0; i < 4; i++) cells.push(`<span class="cd-empty"></span>`);
    for (let d = 1; d <= 31; d++) {
      const day = D.calendar.days[d];
      const iso = `2026-10-${String(d).padStart(2, "0")}`;
      const req = day.request ? c.req(day.request) : null;
      const isSel = d >= sel[0] && d <= sel[1];
      const classes = ["day", day.status];
      if (d === 9) classes.push("today");
      if (isSel) classes.push("sel");
      if (d === sel[0]) classes.push("sel-a");
      if (d === sel[1]) classes.push("sel-b");
      const label = `${c.date(iso, { day: "numeric", month: "long" })}: ${c.L(D.dayStatus[day.status])}${day.reason ? " — " + c.L(day.reason) : ""}${req ? " — " + c.L(req.title) : ""}`;
      let mark = "";
      if (req) mark = `<i class="ddot" style="--dc:${c.dept(req.dept).color}"></i>`;
      if (day.status === "banned") mark = c.icon("ban", "dban");
      cells.push(
        `<button class="${classes.join(" ")}" data-day="${d}" ${day.status === "locked" ? "disabled" : ""} aria-pressed="${isSel}" aria-label="${label}" title="${label}"><span class="dn">${c.n(d)}</span>${mark}</button>`,
      );
    }
    return `<div class="cal ${opts.size || ""}">
      <div class="cal-wd">${weekdays(c, opts.wd || "narrow").map((w) => `<span>${w}</span>`).join("")}</div>
      <div class="cal-grid">${cells.join("")}</div></div>`;
  }

  function legend(c) {
    const D = c.data;
    return `<ul class="legend">${["open", "held", "booked", "published", "banned", "locked"]
      .map((k) => `<li><i class="lg ${k}"></i>${c.L(D.dayStatus[k])}</li>`)
      .join("")}</ul>`;
  }

  /* ---------- CSS ---------- */

  const css = `
.d-metro {
  --bg: #F3F4F1; --panel: #FFFFFF; --panel-2: #ECEEEF; --ink: #0B1230; --mute: #545B76; --hair: rgb(11 18 48 / .11); --hair-2: rgb(11 18 48 / .2);
  --cobalt: #3F7BF5; --cobalt-ink: #1F52CC; --cobalt-soft: #E4ECFE; --btn: #2A62E0; --btn-ink: #FFFFFF;
  --green: #2BA65A; --green-ink: #17733B; --green-soft: #DDF2E4; --green-flap: #1E8A4A;
  --amber: #F9B814; --amber-ink: #835600; --amber-soft: #FDF0C9;
  --scarlet: #E8453C; --scarlet-ink: #BC2A22; --scarlet-soft: #FBE2E0; --scarlet-flap: #C8342B;
  --st-fill: #FFFFFF; --st-ring: #0B1230; --st-num: #0B1230;
  --shadow: 0 1px 2px rgb(11 18 48 / .06), 0 8px 24px -12px rgb(11 18 48 / .18);
  --sb: #0B1230; --sb-bg: #F3F4F1;
  background: var(--bg); color: var(--ink);
  font-family: "Readex Pro", "Noto Sans Arabic", system-ui, sans-serif;
  font-size: 14px; line-height: 1.45; font-feature-settings: "tnum" 0;
  scrollbar-color: var(--hair-2) transparent;
  ::selection { background: rgb(63 123 245 / .28); }
  * { box-sizing: border-box; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; color: inherit; }
  :focus-visible { outline: 2px solid var(--cobalt); outline-offset: 2px; border-radius: 8px; }
  h1, h2, h3 { margin: 0; font-weight: 600; letter-spacing: -0.01em; }
  svg.lucide { width: 18px; height: 18px; stroke-width: 1.9; flex: none; }

  &[data-theme="dark"] {
    --bg: #0B1230; --panel: #121B42; --panel-2: #1A2556; --ink: #F4F5F2; --mute: #A4ABCB; --hair: rgb(244 245 242 / .1); --hair-2: rgb(244 245 242 / .2);
    --cobalt: #5B8EFF; --cobalt-ink: #93B4FF; --cobalt-soft: rgb(91 142 255 / .17); --btn: #6B98FF; --btn-ink: #07102E;
    --green: #34B866; --green-ink: #7AD69E; --green-soft: rgb(52 184 102 / .17); --green-flap: #2AA35A;
    --amber: #F9B814; --amber-ink: #FFD25E; --amber-soft: rgb(249 184 20 / .15);
    --scarlet: #F0564D; --scarlet-ink: #FF8E87; --scarlet-soft: rgb(240 86 77 / .17); --scarlet-flap: #D8433A;
    --st-fill: #121B42; --st-ring: #F4F5F2; --st-num: #F4F5F2;
    --shadow: 0 1px 0 rgb(244 245 242 / .04) inset, 0 12px 30px -14px rgb(0 0 0 / .6);
    --sb: #F4F5F2; --sb-bg: #0B1230;
  }

  /* --- type helpers --- */
  .tab, .cd, .flap, .clock, .cnt, .badge, .st-num, .kv b { font-variant-numeric: tabular-nums; }

  /* --- buttons --- */
  .btn {
    appearance: none; border: 0; border-radius: 999px; min-height: 44px; padding: 0 18px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    font-weight: 600; font-size: 14px; cursor: pointer; background: var(--btn); color: var(--btn-ink); transition: transform .15s cubic-bezier(.2,.8,.2,1), background-color .15s, box-shadow .15s;
    &:hover { box-shadow: 0 6px 16px -8px var(--btn); }
    &:active { transform: scale(.98); }
    &:disabled { background: var(--panel-2); color: var(--mute); cursor: not-allowed; box-shadow: none; transform: none; }
    &.ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1px var(--hair-2); &:hover { background: var(--panel-2); } }
    &.danger { background: transparent; color: var(--scarlet-ink); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--scarlet) 55%, transparent); &:hover { background: var(--scarlet-soft); } }
    &.sm { min-height: 36px; padding: 0 13px; font-size: 13px; }
    &.block { width: 100%; }
  }
  .icon-btn {
    appearance: none; border: 0; background: transparent; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; position: relative;
    &:hover { background: var(--panel-2); }
    .badge { position: absolute; top: 6px; inset-inline-end: 5px; }
  }
  .badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--scarlet-flap); color: #fff; font-size: 11px; font-weight: 600; display: inline-grid; place-items: center; line-height: 1; box-shadow: 0 0 0 2px var(--panel); }
  .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-weight: 600; background: var(--cobalt-soft); color: var(--cobalt-ink); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--cobalt) 45%, transparent); font-size: 14px; line-height: 1; flex: none; }

  /* --- pills, flaps, tags --- */
  .pill { display: inline-flex; align-items: center; height: 26px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap;
    background: var(--cobalt-soft); color: var(--cobalt-ink);
    &.green { background: var(--green-soft); color: var(--green-ink); }
    &.amber { background: var(--amber-soft); color: var(--amber-ink); }
    &.scarlet { background: var(--scarlet-soft); color: var(--scarlet-ink); }
    &.neutral { background: var(--panel-2); color: var(--mute); }
  }
  .flap {
    position: relative; display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 48px; height: 52px; border-radius: 9px; flex: none;
    background: var(--panel-2); color: var(--ink); line-height: 1.05;
    b { font-size: 19px; font-weight: 600; }
    small { font-size: 10.5px; color: var(--mute); margin-top: 2px; }
    &::after { content: ""; position: absolute; inset-inline: 0; top: 50%; height: 1px; background: rgb(0 0 0 / .13); }
    &.amber { background: var(--amber); color: #0B1230; small { color: rgb(11 18 48 / .72); } }
    &.scarlet { background: var(--scarlet-flap); color: #fff; small { color: rgb(255 255 255 / .82); } }
    &.green { background: var(--green-flap); color: #fff; small { color: rgb(255 255 255 / .85); } }
  }
  .clock {
    position: relative; display: inline-flex; align-items: center; height: 28px; padding: 0 8px; border-radius: 7px; font-size: 13px; font-weight: 600; direction: ltr; letter-spacing: .02em;
    &::after { content: ""; position: absolute; inset-inline: 0; top: 50%; height: 1px; background: rgb(0 0 0 / .14); }
    &.amber { background: var(--amber); color: #0B1230; }
    &.scarlet { background: var(--scarlet-flap); color: #fff; }
  }
  .dtag { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; i { width: 8px; height: 8px; border-radius: 50%; background: var(--dc); flex: none; } }
  .sep { color: var(--hair-2); margin-inline: 5px; }
  .tbadge { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: none;
    background: color-mix(in srgb, var(--tc) 16%, var(--panel)); color: color-mix(in srgb, var(--tc) 75%, var(--ink));
    svg.lucide { width: 19px; height: 19px; }
    &.lg { width: 44px; height: 44px; }
  }
  .tname { color: color-mix(in srgb, var(--tc) 70%, var(--ink)); font-weight: 600; }

  /* --- panels and rows --- */
  .panel { background: var(--panel); border-radius: 16px; box-shadow: var(--shadow); }
  .sh { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px; margin: 0 0 10px;
    h2 { font-size: 16px; display: flex; align-items: center; gap: 8px; }
    a { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; font-weight: 500; color: var(--cobalt-ink); min-height: 32px; svg.lucide { width: 16px; height: 16px; } &:hover { text-decoration: underline; text-underline-offset: 3px; } }
  }
  .cnt { font-size: 12px; font-weight: 600; color: var(--mute); background: var(--panel-2); border-radius: 999px; padding: 1px 8px; }
  .bmain { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .btitle { font-weight: 600; font-size: 14.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bsub { display: flex; align-items: center; flex-wrap: nowrap; font-size: 12.5px; color: var(--mute); white-space: nowrap; overflow: hidden; }
  .brow, .irow, .erow, .arow { display: flex; align-items: center; gap: 12px; padding: 12px 14px; position: relative; transition: background-color .15s;
    & + & { box-shadow: 0 -1px 0 var(--hair); }
  }
  a.brow:hover, a.irow:hover { background: color-mix(in srgb, var(--panel-2) 55%, transparent); }
  .bstat { flex: none; display: flex; }
  .chev { color: var(--mute); }
  .m-mini { margin-top: 3px;
    .ml { stroke: var(--hair-2); stroke-width: 2.5; stroke-linecap: round; }
    .ml.past { stroke: var(--cobalt); }
    .mt { fill: var(--panel); stroke: var(--hair-2); stroke-width: 2; }
    .mt.past { fill: var(--cobalt); stroke: var(--cobalt); }
    .mt.now { fill: var(--panel); stroke-width: 3; stroke: var(--cobalt); }
    .mt.now.amber { stroke: var(--amber); fill: var(--amber); }
    .mt.now.scarlet { stroke: var(--scarlet); fill: var(--scarlet); }
    .mt.now.green { stroke: var(--green); fill: var(--green); }
  }
  .etime { flex: none; min-width: 64px; height: 30px; padding: 0 9px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 12.5px; font-weight: 600;
    background: var(--panel-2); color: var(--ink); position: relative;
    &.green { background: var(--green-flap); color: #fff; }
    &.cobalt { background: var(--cobalt-soft); color: var(--cobalt-ink); }
  }
  .live-dot { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: m-blink 1.6s ease-in-out infinite; }
  .aic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none;
    &.scarlet { background: var(--scarlet-soft); color: var(--scarlet-ink); }
    &.amber { background: var(--amber-soft); color: var(--amber-ink); }
    &.cobalt { background: var(--cobalt-soft); color: var(--cobalt-ink); }
  }
  .stats { padding: 4px 16px; }
  .kv { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; font-size: 13.5px;
    & + & { box-shadow: 0 -1px 0 var(--hair); }
    span { display: flex; flex-direction: column; color: var(--mute); }
    small { font-size: 12px; opacity: .85; }
    b { font-size: 18px; font-weight: 600; color: var(--ink); }
  }

  /* --- line map --- */
  .m-map { display: block; overflow: visible;
    .trk { fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .cob { stroke: var(--cobalt); }
    .grn { stroke: var(--green); }
    .loop { stroke: var(--scarlet); stroke-dasharray: 0.1 9; stroke-linecap: round; }
    .st { fill: var(--st-fill); stroke: var(--st-ring); stroke-width: 3; }
    .st.term { stroke: var(--green); stroke-width: 4; }
    .st.ret { fill: var(--scarlet-flap); stroke: var(--st-fill); stroke-width: 2.5; }
    .st-num { fill: var(--st-num); font-weight: 600; }
    .st-num.on { fill: #fff; }
    .st-lab { fill: var(--ink); font-weight: 500; }
    .ret-lab { fill: var(--scarlet-ink); font-weight: 600; }
    .turn-ring { fill: none; stroke: var(--amber); stroke-width: 3.5; }
    .pulse { fill: none; stroke: var(--amber); stroke-width: 2; transform-box: fill-box; transform-origin: center; animation: m-pulse 2.2s cubic-bezier(.2,.7,.2,1) infinite; }
  }
  @keyframes m-pulse { from { transform: scale(1); opacity: .9; } to { transform: scale(1.9); opacity: 0; } }
  @keyframes m-blink { 50% { opacity: .35; } }
  @media (prefers-reduced-motion: reduce) { .pulse, .live-dot { animation: none; } .pulse { opacity: 0; } }

  /* ================= PHONE ================= */
  .m-phone { display: flex; flex-direction: column; min-height: 100%; background: var(--bg); }
  .m-body { flex: 1; padding: 2px 16px 20px; display: flex; flex-direction: column; gap: 18px; }
  .m-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 12px 6px 16px;
    .brand { display: flex; align-items: center; gap: 10px; span { display: flex; flex-direction: column; line-height: 1.15; } b { font-size: 15px; font-weight: 600; } small { font-size: 11.5px; color: var(--mute); } }
    .top-actions { display: flex; align-items: center; gap: 4px; }
  }
  [dir="rtl"] & .m-top, &[dir="rtl"] .m-top { padding: 6px 16px 6px 12px; }
  .hello { display: flex; flex-direction: column; gap: 2px; padding: 0 2px;
    h1 { font-size: 23px; line-height: 1.25; }
    p { margin: 0; color: var(--mute); font-size: 13.5px; }
  }
  .map-panel { padding: 14px 16px 10px; }
  .map-panel .sh { margin-bottom: 4px; }
  .map-foot { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11.5px; color: var(--mute); padding-top: 6px; border-top: 1px solid var(--hair); margin-top: 4px;
    span { display: inline-flex; align-items: center; gap: 6px; }
    i { width: 14px; height: 4px; border-radius: 2px; display: inline-block; }
  }
  .turn { display: grid; grid-template-columns: auto 1fr; gap: 14px; padding: 14px; align-items: start; }
  .turn-clock { width: 104px; border-radius: 12px; background: var(--amber); color: #0B1230; padding: 10px 8px 9px; display: flex; flex-direction: column; align-items: center; gap: 3px; position: relative;
    small { font-size: 11px; font-weight: 500; color: rgb(11 18 48 / .75); }
    .cd { font-size: 19px; font-weight: 600; direction: ltr; letter-spacing: .01em; position: relative; }
    .cd::after { content: ""; position: absolute; inset-inline: -6px; top: 50%; height: 1px; background: rgb(11 18 48 / .16); }
  }
  .turn-body { display: flex; flex-direction: column; gap: 4px; min-width: 0;
    h3 { font-size: 17px; line-height: 1.3; }
    .bsub { flex-wrap: wrap; white-space: normal; row-gap: 2px; }
    .left { font-size: 13px; color: var(--amber-ink); font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  }
  .turn .btn { grid-column: 1 / -1; }
  .turn-head { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; margin-bottom: -4px;
    h2 { font-size: 16px; }
  }
  .board { overflow: hidden; }
  .book-fab { position: sticky; bottom: 94px; z-index: 20; align-self: flex-end; margin: -6px 16px 12px; box-shadow: 0 10px 24px -10px rgb(11 18 48 / .55), 0 2px 6px rgb(11 18 48 / .18); min-height: 50px; padding: 0 20px; font-size: 15px; }
  .m-nav { position: sticky; bottom: 0; z-index: 30; display: grid; grid-template-columns: repeat(5, 1fr); background: var(--panel); box-shadow: 0 -1px 0 var(--hair); padding: 6px 6px 28px;
    a { display: flex; flex-direction: column; align-items: center; gap: 3px; min-height: 52px; justify-content: center; font-size: 11px; font-weight: 500; color: var(--mute); position: relative; border-radius: 12px; }
    a.on { color: var(--cobalt-ink); font-weight: 600; }
    a.on::before { content: ""; position: absolute; top: -6px; width: 28px; height: 3px; border-radius: 0 0 3px 3px; background: var(--cobalt); }
    .ni { position: relative; display: grid; place-items: center; }
    .ni .badge { position: absolute; top: -6px; inset-inline-end: -11px; }
    svg.lucide { width: 22px; height: 22px; }
  }

  /* pushed screens */
  .m-head { display: flex; align-items: center; gap: 6px; padding: 4px 8px 6px;
    .ttl { display: flex; flex-direction: column; line-height: 1.2; flex: 1; min-width: 0; }
    .ttl b { font-size: 16px; font-weight: 600; }
    .ttl small { font-size: 12px; color: var(--mute); }
  }
  .m-actionbar { position: sticky; bottom: 0; z-index: 30; background: var(--panel); box-shadow: 0 -1px 0 var(--hair), 0 -12px 24px -18px rgb(11 18 48 / .3); padding: 12px 16px 30px; display: flex; align-items: center; gap: 12px; }
  .ab-sum { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.3;
    b { font-size: 15px; font-weight: 600; }
    small { font-size: 12px; color: var(--mute); }
  }

  /* calendar */
  .cal-panel { padding: 14px 12px 12px; }
  .mon { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 8px;
    h2 { font-size: 17px; }
  }
  .cal-wd, .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .cal-wd span { text-align: center; font-size: 11.5px; color: var(--mute); font-weight: 500; padding-bottom: 4px; }
  .day { appearance: none; border: 0; position: relative; height: 54px; border-radius: 10px; background: var(--panel); box-shadow: inset 0 0 0 1px var(--hair-2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; padding: 0; transition: background-color .15s, box-shadow .15s;
    .dn { font-size: 15px; font-weight: 500; }
    .ddot { width: 7px; height: 7px; border-radius: 50%; background: var(--dc); }
    .dban { width: 13px; height: 13px; }
    &:hover:not(:disabled) { box-shadow: inset 0 0 0 1.5px var(--cobalt); }
    &.locked { background: transparent; box-shadow: none; color: var(--mute); opacity: .5; cursor: not-allowed; }
    &.banned { background: var(--scarlet-soft); box-shadow: none; color: var(--scarlet-ink); }
    &.held { background: var(--amber-soft); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--amber) 80%, transparent); color: var(--amber-ink); }
    &.booked { background: var(--cobalt-soft); box-shadow: none; color: var(--cobalt-ink); }
    &.published { background: var(--green-soft); box-shadow: none; color: var(--green-ink); }
    &.today .dn { text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; }
    &.sel { background: var(--btn); color: var(--btn-ink); box-shadow: none; z-index: 1; }
    &.sel.sel-a:not(.sel-b)::after { content: ""; position: absolute; top: 50%; inset-inline-start: 100%; width: 6px; height: 6px; margin-top: -3px; background: var(--btn); }
  }
  .cal.lg .day { height: 60px; }
  .cal.sm .day { height: 40px; border-radius: 8px; gap: 2px; .dn { font-size: 13px; } .ddot { width: 6px; height: 6px; } }
  .legend { list-style: none; margin: 12px 0 0; padding: 12px 2px 0; border-top: 1px solid var(--hair); display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 12px; color: var(--mute);
    li { display: flex; align-items: center; gap: 8px; }
    .lg { width: 16px; height: 16px; border-radius: 5px; flex: none; box-shadow: inset 0 0 0 1px var(--hair-2); }
    .lg.open { background: var(--panel); }
    .lg.held { background: var(--amber-soft); box-shadow: inset 0 0 0 1.5px var(--amber); }
    .lg.booked { background: var(--cobalt-soft); box-shadow: none; }
    .lg.published { background: var(--green-soft); box-shadow: none; }
    .lg.banned { background: var(--scarlet-soft); box-shadow: none; }
    .lg.locked { background: transparent; box-shadow: inset 0 0 0 1px var(--hair); opacity: .6; }
  }
  .hint { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--mute); padding: 0 4px;
    svg.lucide { color: var(--cobalt-ink); margin-top: 1px; }
  }
  .closures { padding: 4px 14px; }
  .cl { display: flex; align-items: center; gap: 12px; padding: 10px 0; font-size: 13.5px;
    & + & { box-shadow: 0 -1px 0 var(--hair); }
    .flap { width: 42px; height: 44px; b { font-size: 16px; } }
    .bmain small { color: var(--mute); font-size: 12px; }
  }
  .depts { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding: 2px; margin: 0 -2px; }
  .dchip { appearance: none; border: 0; flex: none; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px; border-radius: 999px; background: var(--panel); box-shadow: inset 0 0 0 1px var(--hair-2); font-size: 13.5px; font-weight: 500; cursor: pointer;
    i { width: 10px; height: 10px; border-radius: 50%; background: var(--dc); }
    &[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--cobalt); color: var(--cobalt-ink); font-weight: 600; background: var(--cobalt-soft); }
    svg.lucide { width: 16px; height: 16px; }
  }
  .lbl { font-size: 13px; font-weight: 600; color: var(--mute); margin: 0 2px 8px; }

  /* request route */
  .req-hero { display: flex; flex-direction: column; gap: 6px; padding: 0 2px;
    h1 { font-size: 24px; line-height: 1.25; }
    .bsub { flex-wrap: wrap; white-space: normal; font-size: 13px; row-gap: 4px; }
  }
  .hold { display: flex; align-items: center; gap: 14px; padding: 14px; background: var(--amber-soft); border-radius: 16px;
    .hold-txt { flex: 1; display: flex; flex-direction: column; gap: 2px; b { font-size: 14.5px; } small { font-size: 12.5px; color: var(--amber-ink); line-height: 1.4; } }
    .bigclock { position: relative; background: var(--amber); color: #0B1230; border-radius: 10px; padding: 9px 10px; font-size: 21px; font-weight: 600; direction: ltr; flex: none; }
    .bigclock::after { content: ""; position: absolute; inset-inline: 0; top: 50%; height: 1px; background: rgb(11 18 48 / .16); }
  }
  .route { list-style: none; margin: 0; padding: 0; position: relative; }
  .route > li { position: relative; display: grid; grid-template-columns: 36px 1fr; gap: 12px; padding-bottom: 18px; }
  .route > li::before { content: ""; position: absolute; inset-inline-start: 15px; top: 18px; bottom: -6px; width: 6px; background: var(--cobalt); border-radius: 3px; }
  .route > li.fut::before { background: var(--hair-2); }
  .route > li.to-green::before { background: color-mix(in srgb, var(--green) 45%, var(--hair-2)); }
  .route > li:last-child::before { display: none; }
  .rs { position: relative; z-index: 1; width: 36px; height: 36px; display: grid; place-items: center; }
  .rs i { width: 22px; height: 22px; border-radius: 50%; background: var(--st-fill); box-shadow: inset 0 0 0 3px var(--st-ring); display: block; }
  .rs.ic i { height: 34px; width: 22px; border-radius: 11px; }
  .rs.term i { box-shadow: inset 0 0 0 4px var(--green); }
  .rs.now i { width: 26px; height: 26px; background: var(--amber); box-shadow: 0 0 0 4px var(--bg), 0 0 0 7px var(--amber); }
  .rs.now::after { content: ""; position: absolute; inset: 2px; border-radius: 50%; border: 2px solid var(--amber); animation: m-pulse 2.2s cubic-bezier(.2,.7,.2,1) infinite; }
  @media (prefers-reduced-motion: reduce) { .rs.now::after { animation: none; opacity: 0; } }
  .rbody { display: flex; flex-direction: column; gap: 2px; padding-top: 7px; min-width: 0;
    b { font-size: 15px; font-weight: 600; }
    small { font-size: 12.5px; color: var(--mute); }
  }
  .route li.fut .rbody b { color: var(--mute); font-weight: 500; }
  .stops { margin-top: 10px; overflow: hidden; }
  .stop { display: flex; align-items: center; gap: 12px; padding: 12px 14px; min-height: 64px;
    & + & { box-shadow: 0 -1px 0 var(--hair); }
    .sring { width: 38px; height: 38px; flex: none; }
    .sring circle { fill: none; stroke-width: 4; }
    .sring .bg { stroke: var(--panel-2); }
    .sring .fg { stroke: var(--cobalt); stroke-linecap: round; transform: rotate(-90deg); transform-origin: center; }
    .sring text { fill: var(--ink); font-size: 10.5px; font-weight: 600; }
    .miss { color: var(--amber-ink); font-weight: 500; }
  }
  .peek { padding: 4px 16px; }
  .peek .kv b { font-size: 14px; font-weight: 500; text-align: end; }
  .peek .kv span { color: var(--mute); }
  .ab-left { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;
    b { font-size: 13.5px; color: var(--amber-ink); font-weight: 600; }
    a { font-size: 13px; color: var(--cobalt-ink); font-weight: 500; }
  }

  /* inbox */
  .chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px; }
  .chip { appearance: none; border: 0; flex: none; min-height: 40px; padding: 0 14px; border-radius: 999px; background: var(--panel); box-shadow: inset 0 0 0 1px var(--hair-2); display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 500; cursor: pointer;
    i { width: 8px; height: 8px; border-radius: 50%; background: var(--tc); }
    .n { color: var(--mute); font-variant-numeric: tabular-nums; }
    &[aria-pressed="true"] { background: var(--ink); color: var(--bg); box-shadow: none; .n { color: inherit; opacity: .7; } }
  }
  .task { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .task-head { display: flex; align-items: center; gap: 12px;
    .bmain small { font-size: 12.5px; color: var(--mute); }
  }
  .task h3 { font-size: 18px; line-height: 1.3; }
  .tracks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .trk-chip { border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 1px; font-size: 12px; color: var(--mute); background: var(--panel-2);
    b { font-size: 13px; color: var(--ink); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    b i { width: 8px; height: 8px; border-radius: 50%; }
    &.open b i { background: var(--amber); }
    &.done b i { background: var(--green); }
    &.open { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--amber) 70%, transparent); background: var(--amber-soft); }
  }
  .brief { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 13px; margin: 0; padding: 12px 0 0; border-top: 1px solid var(--hair);
    dt { color: var(--mute); }
    dd { margin: 0; font-weight: 500; }
  }
  .until { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--mute); svg.lucide { width: 16px; height: 16px; } }
  .task-acts { display: grid; grid-template-columns: 1fr; gap: 8px; }
  .notif { display: flex; gap: 12px; padding: 12px 14px; align-items: flex-start;
    & + & { box-shadow: 0 -1px 0 var(--hair); }
    .aic { width: 34px; height: 34px; }
    .aic.green { background: var(--green-soft); color: var(--green-ink); }
    .ntxt { flex: 1; font-size: 13.5px; color: var(--mute); line-height: 1.45; }
    &.unread .ntxt { color: var(--ink); font-weight: 500; }
    .nmeta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; font-size: 11.5px; color: var(--mute); flex: none; }
    .udot { width: 8px; height: 8px; border-radius: 50%; background: var(--cobalt); }
  }

  /* ================= DESKTOP ================= */
  .m-desk { display: grid; grid-template-columns: 248px 1fr; min-height: 900px; background: var(--bg); }
  .side { position: sticky; top: 0; height: 900px; display: flex; flex-direction: column; gap: 20px; padding: 20px 14px; background: var(--panel); box-shadow: 1px 0 0 var(--hair);
    .brand { display: flex; align-items: center; gap: 10px; padding: 2px 8px 6px; span { display: flex; flex-direction: column; line-height: 1.2; } b { font-size: 15px; font-weight: 600; } small { font-size: 12px; color: var(--mute); } }
  }
  &[dir="rtl"] .side { box-shadow: -1px 0 0 var(--hair); }
  .ngroup { display: flex; flex-direction: column; gap: 2px;
    h4 { margin: 0 0 4px; padding: 0 10px; font-size: 11.5px; font-weight: 600; color: var(--mute); }
    a { display: flex; align-items: center; gap: 11px; min-height: 38px; padding: 0 10px; border-radius: 10px; font-size: 14px; font-weight: 500; color: var(--mute); transition: background-color .15s, color .15s; }
    a:hover { background: var(--panel-2); color: var(--ink); }
    a.on { background: var(--ink); color: var(--bg); font-weight: 600; }
    a .cnt { margin-inline-start: auto; }
    a.on .cnt { background: rgb(255 255 255 / .16); color: inherit; }
  }
  &[data-theme="dark"] .ngroup a.on .cnt { background: rgb(11 18 48 / .14); }
  .me { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 12px; background: var(--panel-2);
    span { display: flex; flex-direction: column; line-height: 1.25; min-width: 0; } b { font-size: 13.5px; } small { font-size: 11.5px; color: var(--mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  }
  .dmain { padding: 0 28px 40px; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
  .dtop { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; height: 68px; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(8px); margin: 0 -28px; padding: 0 28px; box-shadow: 0 1px 0 var(--hair);
    h1 { font-size: 20px; margin-inline-end: auto; }
  }
  .search { display: flex; align-items: center; gap: 10px; width: 380px; height: 42px; padding: 0 12px; border-radius: 999px; background: var(--panel); box-shadow: inset 0 0 0 1px var(--hair-2); color: var(--mute); font-size: 13.5px;
    span { flex: 1; }
    kbd { font: 500 11.5px/1 "Readex Pro", system-ui; padding: 4px 7px; border-radius: 6px; background: var(--panel-2); color: var(--mute); direction: ltr; }
  }
  .dmap { padding: 18px 24px 16px; }
  .dmap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 4px;
    h2 { font-size: 18px; }
    p { margin: 2px 0 0; color: var(--mute); font-size: 13px; }
  }
  .dturn { display: flex; align-items: center; gap: 14px; padding: 8px 8px 8px 8px; border-radius: 14px; background: var(--amber-soft);
    .turn-clock { width: auto; padding: 7px 12px; flex-direction: row; gap: 8px; }
    .turn-clock .cd { font-size: 17px; }
    .tt { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; b { font-size: 14.5px; } small { font-size: 12.5px; color: var(--amber-ink); font-weight: 500; } }
  }
  .trains { position: relative; height: 66px; margin-top: 2px; }
  .tcol { position: absolute; top: 0; width: 144px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .tchip { max-width: 142px; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 9px; border-radius: 7px; font-size: 12px; font-weight: 500; background: var(--panel-2); white-space: nowrap; overflow: hidden;
    i { width: 7px; height: 7px; border-radius: 50%; background: var(--dc); flex: none; }
    span { overflow: hidden; text-overflow: ellipsis; }
    &.amber { background: var(--amber); color: #0B1230; }
    &.scarlet { background: var(--scarlet-flap); color: #fff; }
    &.green { background: var(--green-soft); color: var(--green-ink); }
  }
  .drow { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start; }
  .drow3 { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
  .dpanel { padding: 16px 0 6px; }
  .dpanel > .sh { padding: 0 18px; }
  .dboard { display: grid; grid-template-columns: 56px minmax(0, 1fr) 150px 170px 104px; }
  .dboard .hd { display: contents; }
  .dboard .hd span { font-size: 11.5px; font-weight: 600; color: var(--mute); padding: 4px 0 8px; border-bottom: 1px solid var(--hair); }
  .dboard .hd span:first-child { padding-inline-start: 18px; }
  .dboard .r { display: contents; }
  .dboard .r > * { display: flex; align-items: center; min-height: 66px; border-bottom: 1px solid var(--hair); min-width: 0; }
  .dboard .r:last-child > * { border-bottom: 0; }
  .dboard .r > :first-child { padding-inline-start: 18px; }
  .dboard .r > :last-child { padding-inline-end: 18px; justify-content: flex-end; }
  .dboard .r .flap { width: 44px; height: 46px; b { font-size: 17px; } }
  .dboard .r .bmain { padding-inline: 14px; flex-direction: column; align-items: flex-start; justify-content: center; }
  .dboard .r:hover > * { background: color-mix(in srgb, var(--panel-2) 50%, transparent); }
  .dboard .hd span:last-child { text-align: end; padding-inline-end: 18px; }
  .dcal { padding: 16px; }
  .dcal .legend { grid-template-columns: 1fr 1fr 1fr; font-size: 11.5px; }
  .dinbox .irow { padding: 11px 16px; }
`;

  /* ---------- screens ---------- */

  const R = (c) => c.data.requests;

  function home(c) {
    const D = c.data;
    const r1 = c.req("r1");
    const mine = R(c).filter((r) => r.mine);
    const map = lineMap(c, { W: 326, H: 132, Y: 70, pad: 24, d: 6, spread: 32, loop: 30, lw: 6, r: 11, fs: 11.5 });
    return `<div class="m-phone">
      ${topBar(c)}
      <main class="m-body">
        <div class="hello"><h1>${c.t("أهلًا " + D.me.name.ar, "Hi " + D.me.name.en)}</h1>
          <p>${c.t(`${c.n(R(c).length)} طلبات على الخط · واحد بانتظارك`, `${c.n(R(c).length)} requests on the line · one waiting on you`)}</p></div>

        <section class="panel turn" aria-labelledby="m-turn">
          <div class="turn-head"><h2 id="m-turn">${c.t("دورك الآن", "Your turn")}</h2><span class="pill amber">${c.L(D.stages.draft)}</span></div>
          <div class="turn-clock"><small>${c.t("ينتهي الحجز بعد", "Hold ends in")}</small>${c.cd(r1.holdMs, "hms")}</div>
          <div class="turn-body">
            <h3>${c.L(r1.title)}</h3>
            <span class="bsub">${deptTag(c, r1.dept, true)}<span class="sep">·</span>${c.range(r1.start, r1.end)}</span>
            <span class="left">${c.icon("list-checks")}${c.t("بقيت ٣ أشياء قبل الإرسال", "3 things left before you can submit")}</span>
          </div>
          <button class="btn block">${c.t("أكمل الطلب", "Continue")}${c.icon("arrow-right", "flip-rtl")}</button>
        </section>

        <section class="panel map-panel" aria-labelledby="m-line">
          ${sectionHead(c, `<span id="m-line">${c.t("خط المسار", "The line")}</span>`, c.t("افتح الخط", "Open"))}
          ${map.svg}
          <div class="map-foot">
            <span><i style="background:var(--cobalt)"></i>${c.t("في الطريق", "Moving")}</span>
            <span><i style="background:var(--amber)"></i>${c.t("بانتظارك", "Your turn")}</span>
            <span><i style="background:var(--scarlet)"></i>${c.t("مُعاد", "Returned")}</span>
            <span><i style="background:var(--green)"></i>${c.t("منشور", "Published")}</span>
          </div>
        </section>

        <section>
          ${sectionHead(c, c.t("طلبات قسمك", "Your department's requests"), c.t("الكل", "All"), mine.length)}
          <div class="panel board">${mine.map((r) => boardRowPhone(c, r)).join("")}</div>
        </section>

        <section>
          ${sectionHead(c, c.t("بانتظار فريقك", "Waiting on your team"), c.t("افتح", "Open"), D.inbox.length)}
          <div class="panel board">${D.inbox.map((i) => inboxRow(c, i)).join("")}</div>
        </section>

        <section>
          ${sectionHead(c, c.t("على المنصة", "On the platform"), c.t("كل الفعاليات", "All events"))}
          <div class="panel board">${D.events.slice(0, 3).map((e) => eventRow(c, e)).join("")}</div>
        </section>

        <section>
          ${sectionHead(c, c.t("يحتاج انتباهك", "Needs your attention"), null, D.attention.length)}
          <div class="panel board">${D.attention.map((a) => attentionRow(c, a)).join("")}</div>
        </section>

        <section>${statsPanel(c)}</section>
      </main>
      <button class="btn book-fab">${c.icon("calendar-plus")}${c.t("احجز موعدًا", "Book dates")}</button>
      ${navBar(c, "home")}
    </div>`;
  }

  function book(c) {
    const D = c.data;
    const depts = ["mobile", "ai", "cyber", "web", "design", "logistics", "media"];
    const closures = [18, 25].map((d) => {
      const day = D.calendar.days[d];
      const iso = `2026-10-${d}`;
      return `<div class="cl">${whenTile(c, iso, "scarlet")}<span class="bmain"><b>${c.L(day.reason)}</b><small>${c.L(D.dayStatus.banned)} · ${c.weekday(iso, "long")}</small></span></div>`;
    });
    return `<div class="m-phone">
      <header class="m-head">
        <button class="icon-btn" aria-label="${c.t("رجوع", "Back")}">${c.icon("arrow-left", "flip-rtl")}</button>
        <span class="ttl"><b>${c.t("احجز موعدًا", "Book dates")}</b><small>${c.t("الخطوة الأولى لكل فعالية", "The first stop of every event")}</small></span>
      </header>
      <main class="m-body" style="gap:16px">
        <p class="hint">${c.icon("info")}<span>${c.t("اضغط أول يوم ثم آخر يوم. نحجزها لك ٢٤ ساعة حتى تُكمل الطلب. أول يوم يمكنك حجزه هو ١٣ أكتوبر.", "Tap the first day, then the last. We hold them for 24 hours while you fill in the request. The first day you can book is 13 Oct.")}</span></p>
        <section class="panel cal-panel">
          <div class="mon">
            <button class="icon-btn" aria-label="${c.t("الشهر السابق", "Previous month")}">${c.icon("chevron-left", "flip-rtl")}</button>
            <h2>${c.date("2026-10-01", { month: "long", year: "numeric" })}</h2>
            <button class="icon-btn" aria-label="${c.t("الشهر التالي", "Next month")}">${c.icon("chevron-right", "flip-rtl")}</button>
          </div>
          ${calendarGrid(c, { sel: [23, 24], wd: "narrow" })}
          ${legend(c)}
        </section>
        <section>
          <p class="lbl">${c.t("أي قسم؟", "Which department?")}</p>
          <div class="depts">${depts
            .map((k, i) => `<button class="dchip" aria-pressed="${i === 0}"><i style="--dc:${c.dept(k).color}"></i>${c.L(c.dept(k))}${i === 0 ? c.icon("check") : ""}</button>`)
            .join("")}</div>
        </section>
        <section>
          <p class="lbl">${c.t("أيام أغلقتها اللوجستيات", "Days Logistics closed")}</p>
          <div class="panel closures">${closures.join("")}</div>
        </section>
      </main>
      <div class="m-actionbar">
        <span class="ab-sum"><b data-m-sum>${c.range("2026-10-23", "2026-10-24")} · ${c.t("يومان", "2 days")}</b><small>${c.t("تطوير التطبيقات · تُحجز ٢٤ ساعة", "Mobile Development · held for 24 hours")}</small></span>
        <button class="btn">${c.t("احجز", "Book")}${c.icon("arrow-right", "flip-rtl")}</button>
      </div>
    </div>`;
  }

  function ring(done, total, c) {
    const C = 2 * Math.PI * 15;
    return `<svg class="sring" viewBox="0 0 38 38" aria-hidden="true"><circle class="bg" cx="19" cy="19" r="15"/><circle class="fg" cx="19" cy="19" r="15" stroke-dasharray="${(C * done) / total} ${C}"/>
      <text x="19" y="19" text-anchor="middle" dominant-baseline="central">${c.n(done)}/${c.n(total)}</text></svg>`;
  }

  function request(c) {
    const D = c.data;
    const r = c.req("r1");
    const det = r.details;
    const modeLab = (m) => (m === "online" ? c.t("عن بُعد", "Online") : c.t("حضوري", "On-site"));
    const stops = r.sections
      .map(
        (s) => `<a class="stop" href="#" onclick="return false">${ring(s.done, s.total, c)}
        <span class="bmain"><b class="btitle">${c.L(s)}</b><small class="miss">${c.t("ناقص: ", "Missing: ")}${s.missing.map((m) => c.L(m)).join("، ")}</small></span>
        ${c.icon("chevron-right", "flip-rtl chev")}</a>`,
      )
      .join("");
    const st = D.steps;
    const li = (i, cls, mark, extra) =>
      `<li class="${cls}"><span class="rs ${mark}"><i></i></span><div class="rbody"><b>${c.L(st[i])}</b><small>${c.L(st[i].hint)}</small>${extra || ""}</div></li>`;
    return `<div class="m-phone">
      <header class="m-head">
        <button class="icon-btn" aria-label="${c.t("رجوع", "Back")}">${c.icon("arrow-left", "flip-rtl")}</button>
        <span class="ttl"><b>${c.t("مسار الفعاليات", "Event pipeline")}</b><small>${c.t("بدأه إبراهيم", "Started by Ibrahim")}</small></span>
        <button class="icon-btn" aria-label="${c.t("خيارات", "Options")}">${c.icon("ellipsis")}</button>
      </header>
      <main class="m-body" style="gap:18px">
        <div class="req-hero">
          <span><span class="pill amber">${c.t("الخطوة ١ من ٥ · مسودة", "Step 1 of 5 · Draft")}</span></span>
          <h1>${c.L(r.title)}</h1>
          <span class="bsub">${deptTag(c, r.dept)}<span class="sep">·</span>${c.range(r.start, r.end)}<span class="sep">·</span>${c.L(r.type)}</span>
        </div>
        <div class="hold">
          <span class="hold-txt"><b>${c.t("الأيام محجوزة", "Dates held")}</b><small>${c.t("أكمل بيانات الفعالية والطلبين ثم أرسل قبل انتهاء الحجز:", "Fill in the event and both briefs, then submit before the hold runs out:")}</small></span>
          <span class="bigclock">${c.cd(r.holdMs, "hms")}</span>
        </div>
        <ol class="route" aria-label="${c.t("سير الطلب", "Progress")}">
          ${li(0, "now", "now", `<div class="panel stops">${stops}</div>`)}
          ${li(1, "fut", "ic")}
          ${li(2, "fut", "")}
          ${li(3, "fut to-green", "")}
          ${li(4, "fut", "term")}
        </ol>
        <section>
          ${sectionHead(c, c.t("بيانات الفعالية", "Event details"), c.t("تعديل", "Edit"))}
          <div class="panel peek">
            <div class="kv"><span>${c.t("اسم المقدّم", "Presenter")}</span><b>${c.L(det.presenter)}</b></div>
            <div class="kv"><span>${c.t("الوقت (كل يوم)", "Time (every day)")}</span><b>${c.L(det.time)}</b></div>
            ${det.modes.map((m) => `<div class="kv"><span>${c.date(m.date, { weekday: "long", day: "numeric", month: "short" })}</span><b>${modeLab(m.mode)}</b></div>`).join("")}
            <div class="kv"><span>${c.t("الفئة المستهدفة", "Audience")}</span><b>${c.L(det.audience)}</b></div>
            <div class="kv"><span>${c.t("التسجيل", "Registration")}</span><b>${c.L(det.registration)} · ${c.n(det.expected)}</b></div>
            <div class="kv"><span>${c.t("بريد المقدّم", "Presenter email")}</span><b class="miss" style="color:var(--amber-ink)">${c.t("ناقص", "Missing")}</b></div>
          </div>
        </section>
      </main>
      <div class="m-actionbar">
        <span class="ab-left"><b>${c.t("بقيت ٣ أشياء قبل الإرسال", "3 things left before you can submit")}</b><a href="#" onclick="return false">${c.t("إكمال لاحقًا", "Finish later")}</a></span>
        <button class="btn" disabled>${c.icon("send", "flip-rtl")}${c.t("إرسال", "Submit")}</button>
      </div>
    </div>`;
  }

  function inbox(c) {
    const D = c.data;
    const first = D.inbox[0];
    const r2 = c.req(first.request);
    const kindIcon = { request_received: ["inbox", "cobalt"], task_done: ["check", "green"], returned: ["corner-up-left", "scarlet"], ready_to_publish: ["flag", "green"], media_received: ["megaphone", "cobalt"] };
    const teams = ["design", "logistics", "media"];
    return `<div class="m-phone">
      ${topBar(c)}
      <main class="m-body" style="gap:16px">
        <div class="hello"><h1>${c.t("بانتظار فريقك", "Waiting on your team")}</h1><p>${c.t("بصفتك مشرفًا عامًا ترى مهام كل الفرق", "As a super admin you see every team's tasks")}</p></div>
        <div class="chips" role="group" aria-label="${c.t("الفريق", "Team")}">
          <button class="chip" aria-pressed="true">${c.t("الكل", "All")} <span class="n">${c.n(3)}</span></button>
          ${teams.map((k) => `<button class="chip" aria-pressed="false" style="--tc:${c.dept(k).color}"><i></i>${c.L(c.dept(k))} <span class="n">${c.n(1)}</span></button>`).join("")}
        </div>
        <article class="panel task">
          <div class="task-head">${teamBadge(c, "design", "lg")}<span class="bmain"><b>${c.t("دور التصميم", "Design's turn")}</b><small>${c.t("وصل ", "Arrived ")}${c.L(first.received)}</small></span><span class="pill amber">${c.t("قيد العمل", "Working on it")}</span></div>
          <h3>${c.L(r2.title)}</h3>
          <span class="bsub">${deptTag(c, r2.dept)}<span class="sep">·</span>${c.range(r2.start, r2.end)}<span class="sep">·</span>${c.L(r2.type)}</span>
          <div class="tracks">
            <span class="trk-chip open"><b><i></i>${c.t("التصميم", "Design")}</b>${c.t("قيد العمل", "Working on it")}</span>
            <span class="trk-chip done"><b><i></i>${c.t("اللوجستيات", "Logistics")}</b>${c.t("تم", "Done")}</span>
          </div>
          <dl class="brief">
            <dt>${c.t("نوع التصميم", "Design type")}</dt><dd>${c.L(first.brief.type)}</dd>
            <dt>${c.t("المقاس", "Size")}</dt><dd>${c.L(first.brief.size)}</dd>
            <dt>${c.t("نوع الملف", "File type")}</dt><dd>${first.brief.file}</dd>
            <dt>${c.t("حالة المحتوى", "Content")}</dt><dd>${c.L(first.brief.content)}</dd>
          </dl>
          <span class="until">${c.icon("clock-3")}${c.t("يمكن إعادته حتى ", "Can be returned until ")}${c.date(first.returnUntil, { day: "numeric", month: "long" })}</span>
          <div class="task-acts">
            <button class="btn">${c.icon("check")}${c.t("إنهاء مهمة التصميم", "Mark Design done")}</button>
            <button class="btn danger">${c.icon("corner-up-left", "flip-rtl")}${c.t("إعادة مع ملاحظات", "Return with notes")}</button>
          </div>
        </article>
        <div class="panel board">${D.inbox.slice(1).map((i) => inboxRow(c, i)).join("")}</div>
        <section>
          ${sectionHead(c, c.t("الإشعارات", "Notifications"), c.t("تعليم الكل كمقروء", "Mark all read"))}
          <div class="panel board">${D.notifications
            .map((n) => {
              const [ic, tone] = kindIcon[n.kind];
              return `<div class="notif ${n.unread ? "unread" : ""}"><span class="aic ${tone}">${c.icon(ic, ic === "corner-up-left" ? "flip-rtl" : "")}</span><span class="ntxt">${c.L(n.text)}</span><span class="nmeta">${c.L(n.ago)}${n.unread ? '<i class="udot"></i>' : ""}</span></div>`;
            })
            .join("")}</div>
        </section>
      </main>
      ${navBar(c, "inbox")}
    </div>`;
  }

  function desktop(c) {
    const D = c.data;
    const r1 = c.req("r1");
    const W = 1072;
    const map = lineMap(c, { W, H: 176, Y: 92, pad: 70, d: 10, spread: 84, loop: 46, lw: 8, r: 15, fs: 13 });
    const at = {
      draft: R(c).filter((r) => r.stage === "draft"),
      in_review: R(c).filter((r) => r.stage === "in_review"),
      media: R(c).filter((r) => r.stage === "media"),
      ready: R(c).filter((r) => r.stage === "ready"),
      published: R(c).filter((r) => r.stage === "published"),
    };
    const chip = (r) => `<span class="tchip ${stateOf(r) === "cobalt" ? "" : stateOf(r)}" title="${c.L(r.title)}"><i style="--dc:${c.dept(r.dept).color}"></i><span>${c.L(r.title)}</span></span>`;
    const cols = ["draft", "in_review", "media", "ready", "published"]
      .map((k, i) => `<div class="tcol" style="left:${((map.xs[i] / W) * 100).toFixed(2)}%">${at[k].map(chip).join("")}</div>`)
      .join("");
    const retCol = `<div class="tcol" style="left:${((map.retX / W) * 100).toFixed(2)}%">${R(c).filter((r) => r.stage === "returned").map(chip).join("")}</div>`;
    const order = ["r1", "r3", "r2", "r4", "r7", "r5", "r6"].map((id) => c.req(id));
    const boardRows = order
      .map((r) => {
        const st = stateOf(r);
        return `<div class="r"><span>${whenTile(c, r.start, st === "cobalt" ? "" : st)}</span>
          <span class="bmain"><b class="btitle">${c.L(r.title)}</b>${miniLine(STEP[r.stage], st)}</span>
          <span class="bsub">${deptTag(c, r.dept)}</span>
          <span><span class="pill ${st}">${whereLabel(c, r)}</span></span>
          <span>${r.holdMs ? `<span class="clock amber">${c.cd(r.holdMs, "hms")}</span>` : r.fixMs ? `<span class="clock scarlet">${c.cd(r.fixMs, "hms")}</span>` : `<span class="bsub">${c.range(r.start, r.end)}</span>`}</span></div>`;
      })
      .join("");
    const nav = D.nav
      .map(
        (g) => `<div class="ngroup"><h4>${c.L(g.group)}</h4>${g.items
          .map((it) => `<a href="#" onclick="return false" class="${it.key === "home" ? "on" : ""}">${c.icon(it.icon)}${c.L(it)}${it.key === "pipeline" ? `<span class="cnt">${c.n(R(c).length)}</span>` : ""}</a>`)
          .join("")}</div>`,
      )
      .join("");
    return `<div class="m-desk">
      <aside class="side">
        <span class="brand">${c.logo(26)}<span><b>${c.t("GDG القصيم", "GDG Qassim")}</b><small>${c.t("لوحة الإدارة", "Admin console")}</small></span></span>
        ${nav}
        <div class="me"><span class="avatar">${c.t("إب", "I")}</span><span><b>${c.L(D.me.name)}</b><small>${c.L(D.me.role)}</small></span></div>
      </aside>
      <main class="dmain">
        <div class="dtop">
          <h1>${c.t("الرئيسية", "Home")}</h1>
          <span class="search">${c.icon("search")}<span>${c.t("ابحث عن فعالية أو عضو أو صفحة…", "Search events, members, pages…")}</span><kbd>⌘K</kbd></span>
          <button class="btn">${c.icon("calendar-plus")}${c.t("احجز موعدًا", "Book dates")}</button>
          <button class="icon-btn" aria-label="${c.t("الإشعارات", "Notifications")}">${c.icon("bell")}<span class="badge">${c.n(3)}</span></button>
        </div>

        <section class="panel dmap" aria-labelledby="d-line">
          <div class="dmap-head">
            <div><h2 id="d-line">${c.t("خط المسار", "The line")}</h2><p>${c.t(`${c.n(R(c).length)} طلبات على الخط الآن، من الحجز حتى النشر`, `${c.n(R(c).length)} requests on the line now, from booking to published`)}</p></div>
            <div class="dturn">
              <span class="turn-clock"><small>${c.t("ينتهي الحجز", "Hold ends")}</small>${c.cd(r1.holdMs, "hms")}</span>
              <span class="tt"><b>${c.t("دورك الآن: ", "Your turn: ")}${c.L(r1.title)}</b><small>${c.t("بقيت ٣ أشياء قبل الإرسال", "3 things left before you can submit")}</small></span>
              <button class="btn sm">${c.t("أكمل الطلب", "Continue")}${c.icon("arrow-right", "flip-rtl")}</button>
            </div>
          </div>
          ${map.svg}
          <div class="trains">${cols}${retCol}</div>
        </section>

        <div class="drow">
          <section class="panel dpanel">
            ${sectionHead(c, c.t("لوحة المغادرة", "Departures"), c.t("مسار الفعاليات", "Event pipeline"), order.length)}
            <div class="dboard">
              <div class="hd"><span>${c.t("اليوم", "Day")}</span><span style="padding-inline-start:14px">${c.t("الطلب", "Request")}</span><span>${c.t("القسم", "Department")}</span><span>${c.t("المحطة", "Station")}</span><span>${c.t("الوقت", "Clock")}</span></div>
              ${boardRows}
            </div>
          </section>
          <div style="display:flex;flex-direction:column;gap:20px">
            <section class="panel dcal">
              <div class="mon">
                <button class="icon-btn" aria-label="${c.t("الشهر السابق", "Previous month")}">${c.icon("chevron-left", "flip-rtl")}</button>
                <h2 style="font-size:16px">${c.date("2026-10-01", { month: "long", year: "numeric" })}</h2>
                <button class="icon-btn" aria-label="${c.t("الشهر التالي", "Next month")}">${c.icon("chevron-right", "flip-rtl")}</button>
              </div>
              ${calendarGrid(c, { sel: [23, 24], wd: "narrow", size: "sm" })}
              ${legend(c)}
            </section>
            <section class="panel dpanel dinbox">
              ${sectionHead(c, c.t("بانتظار فريقك", "Waiting on your team"), c.t("افتح", "Open"), D.inbox.length)}
              ${D.inbox.map((i) => inboxRow(c, i)).join("")}
            </section>
          </div>
        </div>

        <div class="drow3">
          <section class="panel dpanel">
            ${sectionHead(c, c.t("على المنصة", "On the platform"), c.t("كل الفعاليات", "All events"))}
            ${D.events.map((e) => eventRow(c, e)).join("")}
          </section>
          <section class="panel dpanel">
            ${sectionHead(c, c.t("يحتاج انتباهك", "Needs your attention"), null, D.attention.length)}
            ${D.attention.map((a) => attentionRow(c, a)).join("")}
          </section>
          <section>${statsPanel(c)}</section>
        </div>
      </main>
    </div>`;
  }

  /** Tap two open days to pick a range; tap a chip to filter. Purely visual. */
  function after(root, c) {
    root.querySelectorAll(".d-metro .cal-grid").forEach((grid) => {
      let a = 23, b = 24;
      const paint = () => {
        grid.querySelectorAll(".day").forEach((el) => {
          const d = +el.dataset.day;
          const on = b ? d >= a && d <= b : d === a;
          el.classList.toggle("sel", on);
          el.classList.toggle("sel-a", d === a);
          el.classList.toggle("sel-b", d === (b || a));
          el.setAttribute("aria-pressed", on);
        });
        const sum = grid.closest(".screen, .desk-screen")?.querySelector("[data-m-sum]");
        if (sum) {
          const iso = (d) => `2026-10-${String(d).padStart(2, "0")}`;
          const n = b ? b - a + 1 : 1;
          sum.textContent = `${c.range(iso(a), iso(b || a))} · ${c.lang === "ar" ? (n === 1 ? "يوم واحد" : n === 2 ? "يومان" : `${c.n(n)} أيام`) : `${n} day${n > 1 ? "s" : ""}`}`;
        }
      };
      grid.addEventListener("click", (e) => {
        const el = e.target.closest(".day.open, .day.sel");
        if (!el) return;
        const d = +el.dataset.day;
        if (b || d < a) { a = d; b = null; }
        else {
          let ok = true;
          for (let x = a; x <= d; x++) if (c.data.calendar.days[x].status !== "open") ok = false;
          if (ok && d - a < 5) b = d; else { a = d; b = null; }
        }
        paint();
      });
    });
    root.querySelectorAll(".d-metro .chips, .d-metro .depts").forEach((g) => {
      g.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === btn));
      });
    });
  }

  (window.GDG_DESIGNS = window.GDG_DESIGNS || []).push({
    id: "metro",
    order: 2,
    meta: {
      name: { ar: "خط المترو", en: "Metro Line" },
      tagline: { ar: "كل طلب قطار على خط واحد", en: "Every request is a train on one line" },
      badge: { ar: "أقوى منافس", en: "Strongest challenger" },
      thesis: {
        ar: "مسار الفعاليات مرسوم كخريطة مترو الرياض: المحطات هي خطوات الطلب (مسودة ← التصميم واللوجستيات ← الإعلام ← جاهز ← منشور)، والتصميم واللوجستيات محطة تبادل يمشي فيها مساران متوازيان ثم يلتقيان، و«مُعاد» حلقة حمراء ترجع للخلف. كل طلب قطار واقف عند محطته، والرئيسية تبدأ بالخط نفسه وعدد الطلبات عند كل محطة. ألوان Google الأربعة صارت أحبار الخطوط.",
        en: "The pipeline drawn as a Riyadh Metro map: stations are the request's steps (Draft → Design & Logistics → Media → Ready → Published), Design & Logistics is an interchange where two parallel tracks merge, and Returned is a red loop running back. Each request is a train at its station, and home opens on the live line with a count at every stop. Google's four colours become the line inks.",
      },
      palette: [
        { name: { ar: "مينا منتصف الليل", en: "Midnight enamel" }, hex: "#0B1230" },
        { name: { ar: "خزف", en: "Porcelain" }, hex: "#F3F4F1" },
        { name: { ar: "كوبالت · في الطريق", en: "Cobalt · moving" }, hex: "#3F7BF5" },
        { name: { ar: "كهرماني · دورك", en: "Amber · your turn" }, hex: "#F9B814" },
        { name: { ar: "قرمزي · مُعاد", en: "Scarlet · returned" }, hex: "#E8453C" },
        { name: { ar: "أخضر · منشور", en: "Green · published" }, hex: "#2BA65A" },
      ],
      swatch: "#3F7BF5",
      type: { ar: "Readex Pro لكل شيء: حروف لوحات المحطات، واضحة بالعربي والإنجليزي، وأرقام جدولية للأوقات.", en: "Readex Pro throughout: station-sign lettering, clear in Arabic and English, tabular figures for clocks." },
      nav: { ar: "شريط سفلي مثل تطبيقات النقل (الرئيسية، الخط، الفعاليات، بانتظارك، المزيد) وزر «احجز موعدًا» عائم. على الشاشة الكبيرة قائمة جانبية بمجموعات التطبيق.", en: "A transit-app bottom bar (Home, Line, Events, For you, More) with a floating Book dates pill. On desktop, a sidebar with the app's nav groups." },
      why: { ar: "خطوط مترو الرياض الملونة صارت جزءًا من لغة كل طالب، والمسار فعلًا خط بمحطات ومحطة تبادل، وألوان GDG الأربعة تصير أحبار الخطوط بمعنى ثابت.", en: "Riyadh Metro's coloured lines are part of every Saudi student's daily vocabulary, the pipeline literally is a line with stations and an interchange, and the four GDG colours become line inks with fixed meanings." },
      risk: { ar: "المينا الداكنة جميلة بالليل لكنها ثقيلة في النهار، فلازم الوضع الفاتح (الخزف) يقوم بنفسه. واستعارة الخريطة تحتاج انضباطًا صارمًا في التسميات على جوال عرضه ٣٩٠ وفي الاتجاه من اليمين لليسار.", en: "The midnight enamel is beautiful at night but heavy in daylight, so the porcelain light theme has to stand on its own; a map metaphor needs strict label discipline on a 390px phone and in RTL." },
      raises: [
        { ar: "من لوحة المغادرة المتقلبة: لوحة «المغادرة» بأعمدة ثابتة (اليوم · الطلب · القسم · المحطة · الوقت)؛ الحالة تلوّن خانة اليوم فقط (كهرماني، قرمزي، أخضر) بدون ما تكسر الشبكة، والعدّاد في خانة ثابتة بخط منتصف مثل الألواح.", en: "From the split-flap board: a Departures board with fixed columns (day · request · department · station · clock); state recolours only the day flap (amber, scarlet, green) without breaking the grid, and countdowns sit in fixed split cells." },
      ],
      fonts: ["Readex+Pro:wght@300;400;500;600;700"],
    },
    css,
    phone: { home, book, request, inbox },
    desktop,
    after,
  });
})();
