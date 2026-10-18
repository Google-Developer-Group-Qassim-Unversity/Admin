/*
 * Design 3: Pocket / في الجيب
 * A friendly phone app first: soft cards on a warm blush ground, plain human
 * labels, and ONE saturated colour (blue) reserved for what can be pressed.
 * State colours come from a single mapping (TONE below) and nothing else.
 */
(function () {
  /* ---------- the one state mapping ---------- */
  // done = sage, wait = honey (waiting on someone / your turn), ret = clay (returned / overdue), info = slate
  const STAGE_TONE = { draft: "wait", in_review: "info", returned: "ret", media: "info", ready: "wait", published: "done", cancelled: "mute" };
  const ATTN_TONE = { red: "ret", yellow: "wait", blue: "info", green: "done" };
  const TEAM_ICON = { design: "palette", logistics: "truck", media: "megaphone" };
  const NOTE_ICON = { request_received: "inbox", task_done: "circle-check", returned: "corner-up-left", ready_to_publish: "send", media_received: "megaphone", dates_banned: "calendar-x", hold_expired: "timer-off" };
  const NOTE_TONE = { returned: "ret", task_done: "done", ready_to_publish: "done" };

  const fwd = (c) => c.icon("chevron-right", "flip-rtl pk-chev");

  /* ---------- shared pieces ---------- */

  /** The 5-stop progress, identical everywhere a request appears. */
  function prog(c, stage, opts) {
    const o = opts || {};
    const S = c.data.steps;
    const cur = c.data.stages[stage].step;
    const allDone = stage === "published";
    const tone = STAGE_TONE[stage];
    const stops = S.map((s, i) => {
      const done = allDone || i < cur;
      const isCur = !allDone && i === cur;
      const reached = allDone || i <= cur;
      const cls = done ? "done" : isCur ? `cur t-${tone}` : "todo";
      const label = o.labels ? `<span class="pk-stop-l">${c.L(s)}</span>` : "";
      const inner = done && o.labels ? c.icon("check") : "";
      return `<span class="pk-stop ${cls} ${i > 0 ? (reached ? "ln-on" : "ln-off") : ""}"><span class="pk-dot">${inner}</span>${label}</span>`;
    }).join("");
    const aria = allDone
      ? c.t("اكتملت كل الخطوات", "All steps done")
      : c.t(`الخطوة ${c.n(cur + 1)} من ${c.n(5)}: ${c.L(S[cur])}`, `Step ${cur + 1} of 5: ${c.L(S[cur])}`);
    return `<div class="pk-prog ${o.labels ? "lg" : ""}" role="img" aria-label="${aria}">${stops}</div>`;
  }

  /** Same component, carrying club-wide counts per stop. */
  function progCounts(c, counts) {
    const S = c.data.steps;
    const stops = S.map((s, i) => {
      const n = counts[i];
      return `<span class="pk-stop cnt ${n ? "has" : "none"} ${i > 0 ? "ln-off" : ""}"><span class="pk-dot">${c.n(n)}</span><span class="pk-stop-l">${c.L(s)}</span></span>`;
    }).join("");
    return `<div class="pk-prog lg counts" role="list">${stops}</div>`;
  }

  const stageText = (c, stage) => `<span class="pk-state t-${STAGE_TONE[stage]}"><i class="pk-sdot"></i>${c.L(c.data.stages[stage])}</span>`;

  function topbar(c, { title, back, bell = true } = {}) {
    const start = back
      ? `<button class="pk-iconbtn pk-press" aria-label="${c.t("رجوع", "Back")}">${c.icon("arrow-left", "flip-rtl")}</button><span class="pk-tb-title">${title}</span>`
      : `<span class="pk-brand">${c.logo(22)}<span>${c.t("GDG القصيم", "GDG Qassim")}</span></span>`;
    const end = bell
      ? `<button class="pk-iconbtn pk-press pk-bell" aria-label="${c.t("الإشعارات، ٣ جديدة", "Notifications, 3 new")}">${c.icon("bell")}<b>${c.n(3)}</b></button>
         <span class="pk-avatar" role="img" aria-label="${c.L(c.data.me.name)}">${c.icon("user-round")}</span>`
      : `<button class="pk-iconbtn pk-press" aria-label="${c.t("خيارات", "Options")}">${c.icon("ellipsis")}</button>`;
    return `<header class="pk-top"><div class="pk-top-s">${start}</div><div class="pk-top-e">${end}</div></header>`;
  }

  function bottomnav(c, active) {
    const item = (key, icon, ar, en) =>
      `<a class="pk-nav-i pk-press ${active === key ? "on" : ""}" ${active === key ? 'aria-current="page"' : ""} href="#">${c.icon(icon)}<span>${c.t(ar, en)}</span></a>`;
    return `<nav class="pk-nav" aria-label="${c.t("التنقل", "Navigation")}">
      ${item("home", "house", "الرئيسية", "Home")}
      ${item("requests", "route", "الطلبات", "Requests")}
      <a class="pk-nav-add pk-press" href="#" aria-label="${c.t("احجز موعدًا", "Book dates")}">${c.icon("plus")}</a>
      ${item("events", "calendar-days", "الفعاليات", "Events")}
      ${item("more", "layout-grid", "المزيد", "More")}
    </nav>`;
  }

  function requestRow(c, r) {
    const d = c.dept(r.dept);
    const dates = r.start ? c.range(r.start, r.end) : c.t("بلا تواريخ", "No dates");
    return `<a class="pk-req pk-press" href="#">
      <span class="pk-req-main">
        <span class="pk-req-t">${c.L(r.title)}</span>
        <span class="pk-req-m">${c.L(d.short)} · ${dates}</span>
        ${prog(c, r.stage)}
      </span>
      <span class="pk-req-e">${stageText(c, r.stage)}${fwd(c)}</span>
    </a>`;
  }

  function inboxRow(c, item) {
    const r = c.req(item.request);
    return `<a class="pk-row pk-press" href="#" data-team="${item.team}">
      <span class="pk-ico">${c.icon(TEAM_ICON[item.team])}</span>
      <span class="pk-row-main"><span class="pk-row-t">${c.L(r.title)}</span>
      <span class="pk-row-m">${c.L(c.dept(item.team))} · ${c.L(item.received)}</span></span>
      ${fwd(c)}
    </a>`;
  }

  function yourTurn(c, { desk } = {}) {
    const r = c.req("r1");
    const missing = r.sections.flatMap((s) => s.missing);
    return `<section class="pk-card pk-turn ${desk ? "desk" : ""}" aria-labelledby="pk-turn-h">
      <div class="pk-turn-head">
        <span class="pk-state t-wait"><i class="pk-sdot"></i>${c.t("دورك الحين", "Your turn")}</span>
        <span class="pk-hold">${c.icon("timer")}${c.t("الحجز ينتهي بعد", "Hold ends in")} <b>${c.cd(r.holdMs, "hm")}</b></span>
      </div>
      <h2 id="pk-turn-h" class="pk-turn-t">${c.L(r.title)}</h2>
      <p class="pk-turn-m">${c.L(c.dept(r.dept))} · ${c.range(r.start, r.end)} · ${c.L(r.type)}</p>
      ${prog(c, r.stage)}
      <div class="pk-missing">
        <p>${c.t(`بقيت ${c.n(3)} أشياء قبل الإرسال`, "3 things left before you can submit")}</p>
        <div class="pk-chips">${missing.map((m) => `<span class="pk-chip">${c.L(m)}</span>`).join("")}</div>
      </div>
      <a class="pk-btn pk-btn-primary pk-press" href="#">${c.t("أكمل الطلب", "Continue")}${c.icon("arrow-right", "flip-rtl")}</a>
    </section>`;
  }

  function bookCard(c) {
    return `<a class="pk-card pk-book pk-press" href="#">
      <span class="pk-book-ico">${c.icon("calendar-plus")}</span>
      <span class="pk-row-main"><span class="pk-book-t">${c.t("احجز موعدًا", "Book dates")}</span>
      <span class="pk-row-m">${c.t("نحجز لك الأيام ٢٤ ساعة حتى تكمل الطلب", "We hold the days for 24 hours while you fill it in")}</span></span>
      ${fwd(c)}
    </a>`;
  }

  function stageCounts(c) {
    const counts = [0, 0, 0, 0, 0];
    c.data.requests.forEach((r) => { const s = c.data.stages[r.stage].step; if (s >= 0) counts[s]++; });
    return counts;
  }

  function overview(c) {
    const r3 = c.req("r3");
    return `<section class="pk-card pk-pad">
      <div class="pk-card-h"><h3>${c.t("المسار في النادي", "Across the club")}</h3><span class="pk-mute">${c.t(`${c.n(c.data.requests.length)} طلبات`, `${c.data.requests.length} requests`)}</span></div>
      ${progCounts(c, stageCounts(c))}
      <a class="pk-note pk-press" href="#"><span class="pk-state t-ret"><i class="pk-sdot"></i>${c.t("مُعاد للتعديل", "Returned")}</span>
        <span class="pk-note-t">${c.L(r3.title)} · ${c.t("يعدّله القسم خلال", "fix due in")} <b>${c.cd(r3.fixMs, "hm")}</b></span>${fwd(c)}</a>
    </section>`;
  }

  function eventsCard(c) {
    const rows = c.data.events.filter((e) => e.status !== "draft").map((e) => {
      const live = e.status === "active";
      const state = live
        ? `<span class="pk-state t-done"><i class="pk-sdot"></i>${c.t("شغالة الحين", "Running now")}</span>`
        : `<span class="pk-state t-info"><i class="pk-sdot"></i>${c.t("التسجيل مفتوح", "Open for registration")}</span>`;
      const count = live ? c.t(`${c.n(e.attended)} حضروا`, `${e.attended} checked in`) : c.t(`${c.n(e.responses)} تسجيل`, `${e.responses} sign-ups`);
      return `<div class="pk-ev">
        <div class="pk-ev-top">${state}<span class="pk-mute">${c.L(e.when)}</span></div>
        <span class="pk-row-t">${c.L(e.title)}</span>
        <span class="pk-row-m">${c.L(e.where)} · ${count}</span>
        <a class="pk-link pk-press" href="#">${c.L(e.next)}${c.icon("arrow-right", "flip-rtl")}</a>
      </div>`;
    }).join("");
    return `<section class="pk-card pk-pad"><div class="pk-card-h"><h3>${c.t("الفعاليات الحين", "Events right now")}</h3><a class="pk-link pk-press" href="#">${c.t("كل الفعاليات", "All events")}</a></div><div class="pk-evs">${rows}</div></section>`;
  }

  function attentionCard(c) {
    const rows = c.data.attention.map((a) => `<div class="pk-att">
      <span class="pk-state t-${ATTN_TONE[a.tone]}"><i class="pk-sdot"></i>${c.L(a.title)}</span>
      <span class="pk-row-m">${c.L(a.event)} · ${c.L(a.detail)}</span>
      <a class="pk-btn pk-btn-soft pk-btn-sm pk-press" href="#">${c.L(a.action)}</a>
    </div>`).join("");
    return `<section class="pk-card pk-pad"><div class="pk-card-h"><h3>${c.t("يحتاج انتباهك", "Needs your attention")}</h3></div><div class="pk-atts">${rows}</div></section>`;
  }

  function statsCard(c) {
    const s = c.data.stats;
    const row = (label, value, hint) => `<div class="pk-stat"><span>${label}${hint ? `<small>${hint}</small>` : ""}</span><b>${value}</b></div>`;
    return `<section class="pk-card pk-pad"><div class="pk-card-h"><h3>${c.t("على السريع", "At a glance")}</h3></div>
      ${row(c.t("التسجيل مفتوح", "Open for registration"), c.n(s.open))}
      ${row(c.t("شغالة الحين", "Running now"), c.n(s.live))}
      ${row(c.t("الأعضاء", "Members"), c.n(s.members), c.t(`${c.n(s.verified)} موثّق · ${c.n(s.pending)} بانتظار التوثيق`, `${c.n(s.verified)} verified · ${c.n(s.pending)} pending`))}
      ${row(c.t("الرسائل المرسلة (٢٤ ساعة)", "Emails sent (24h)"), c.n(s.emails24h))}
    </section>`;
  }

  /** October 2026. sel = [start, end] day numbers. */
  function calendar(c, { sel = [], compact = false } = {}) {
    const cal = c.data.calendar;
    const heads = [4, 5, 6, 7, 8, 9, 10].map((d) => `<span class="pk-wd">${c.weekday(`2026-10-${String(d).padStart(2, "0")}`, "short")}</span>`).join("");
    const lead = new Date(Date.UTC(2026, 9, 1)).getUTCDay();
    let cells = "";
    for (let i = 0; i < lead; i++) cells += `<span></span>`;
    const [a, b] = sel;
    for (let d = 1; d <= 31; d++) {
      const day = cal.days[d];
      const iso = `2026-10-${String(d).padStart(2, "0")}`;
      const inSel = a && d >= a && d <= (b || a);
      const selCls = inSel ? ` sel${d === a ? " sel-a" : ""}${d === (b || a) ? " sel-b" : ""}` : "";
      const reason = day.reason ? ` · ${c.L(day.reason)}` : "";
      const label = `${c.date(iso, { day: "numeric", month: "long" })} · ${c.L(c.data.dayStatus[day.status])}${reason}`;
      const dis = day.status !== "open" ? " disabled" : "";
      cells += `<button class="pk-day s-${day.status}${selCls}${iso === cal.today ? " today" : ""}" data-d="${d}" aria-label="${label}" title="${label}"${dis}${inSel ? ' aria-pressed="true"' : ""}><span>${c.n(d)}</span>${["booked", "held", "published"].includes(day.status) ? '<i class="pk-cdot"></i>' : ""}</button>`;
    }
    return `<div class="pk-cal ${compact ? "compact" : ""}">${heads}${cells}</div>`;
  }

  function legend(c) {
    const order = ["open", "held", "booked", "published", "banned", "locked"];
    return `<div class="pk-legend">${order.map((s) => `<span><i class="pk-sw s-${s}"></i>${c.L(c.data.dayStatus[s])}</span>`).join("")}</div>`;
  }

  const dayCount = (c, n) => c.lang === "ar"
    ? n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${c.n(n)} أيام` : `${c.n(n)} يومًا`
    : n === 1 ? "1 day" : `${n} days`;

  /* ---------- phone screens ---------- */

  function home(c) {
    const mine = c.data.requests.filter((r) => r.mine);
    return `<div class="pk-phone">
      ${topbar(c)}
      <main class="pk-main">
        <div class="pk-hello">
          <h1>${c.t(`أهلًا ${c.L(c.data.me.name)}`, `Hi, ${c.L(c.data.me.name)}`)}</h1>
          <p>${c.t(`عندك طلب واحد دورك فيه، و${c.n(3)} تنتظر فريقك.`, "One request is waiting on you, and 3 on your team.")}</p>
        </div>
        ${yourTurn(c)}
        ${bookCard(c)}
        <section class="pk-sec">
          <div class="pk-sec-h"><h3>${c.t("طلبات قسمك", "Your department's requests")}</h3><a class="pk-link pk-press" href="#">${c.t("الكل", "See all")}</a></div>
          <div class="pk-card pk-list">${mine.map((r) => requestRow(c, r)).join("")}</div>
        </section>
        <section class="pk-sec">
          <div class="pk-sec-h"><h3>${c.t("بانتظار فريقك", "Waiting on your team")}</h3><span class="pk-count">${c.n(3)}</span></div>
          <div class="pk-card pk-list">${c.data.inbox.map((i) => inboxRow(c, i)).join("")}</div>
        </section>
        ${overview(c)}
        ${eventsCard(c)}
        ${attentionCard(c)}
        ${statsCard(c)}
      </main>
      ${bottomnav(c, "home")}
    </div>`;
  }

  function book(c) {
    const depts = ["mobile", "ai", "cyber", "web"];
    const banned = Object.entries(c.data.calendar.days).filter(([, d]) => d.status === "banned");
    return `<div class="pk-phone" data-pk-book>
      ${topbar(c, { title: c.t("احجز موعدًا", "Book dates"), back: true, bell: false })}
      <main class="pk-main">
        <p class="pk-hint">${c.icon("info")}<span>${c.t("اضغط أول يوم ثم آخر يوم. بصفتك مشرفًا عامًا يمكنك حجز أي يوم.", "Tap the first day, then the last. As a super admin you can book any day.")}</span></p>
        <section class="pk-card pk-pad">
          <div class="pk-month">
            <button class="pk-iconbtn pk-press" aria-label="${c.t("الشهر السابق", "Previous month")}">${c.icon("chevron-left", "flip-rtl")}</button>
            <h2>${c.date("2026-10-01", { month: "long", year: "numeric" })}</h2>
            <button class="pk-iconbtn pk-press" aria-label="${c.t("الشهر التالي", "Next month")}">${c.icon("chevron-right", "flip-rtl")}</button>
          </div>
          ${calendar(c, { sel: [23, 24] })}
          <p class="pk-first">${c.t(`أول يوم يمكنك حجزه هو ${c.date("2026-10-13", { day: "numeric", month: "long" })}.`, `The first day you can book is ${c.date("2026-10-13", { day: "numeric", month: "long" })}.`)}</p>
          ${legend(c)}
        </section>
        <section class="pk-card pk-pad">
          <div class="pk-card-h"><h3>${c.t("أيام أغلقتها اللوجستيات", "Days Logistics closed")}</h3></div>
          ${banned.map(([d, x]) => `<div class="pk-ban"><span class="pk-state t-ret"><i class="pk-sdot"></i>${c.date(`2026-10-${d}`, { weekday: "long", day: "numeric", month: "long" })}</span><span class="pk-row-m">${c.L(x.reason)}</span></div>`).join("")}
        </section>
        <section class="pk-sec">
          <div class="pk-sec-h"><h3>${c.t("أي قسم؟", "Which department?")}</h3></div>
          <div class="pk-card pk-list" role="radiogroup">
            ${depts.map((k, i) => { const d = c.dept(k); return `<label class="pk-radio pk-press"><input type="radio" name="pk-dept" ${i === 0 ? "checked" : ""}><span class="pk-ico">${c.icon(d.icon)}</span><span class="pk-row-t">${c.L(d)}</span><i class="pk-rdot"></i></label>`; }).join("")}
          </div>
        </section>
      </main>
      <div class="pk-sticky">
        <div class="pk-sticky-txt"><b data-pk-sum>${c.range("2026-10-23", "2026-10-24")} · ${dayCount(c, 2)}</b><span>${c.t("نحجزها لك ٢٤ ساعة", "Held for 24 hours")}</span></div>
        <button class="pk-btn pk-btn-primary pk-press" data-pk-bookbtn>${c.t("احجز", "Book")}</button>
      </div>
    </div>`;
  }

  function request(c) {
    const r = c.req("r1");
    const d = r.details;
    const secIcon = { details: "file-text", design: "palette", logistics: "truck" };
    const modeName = (m) => (m === "online" ? c.t("عن بُعد", "Online") : c.t("حضوري", "On-site"));
    const peek = [
      [c.t("المقدّم", "Presenter"), c.L(d.presenter)],
      [c.t("الوقت (كل يوم)", "Time (every day)"), c.L(d.time)],
      [c.t("الأيام", "Days"), d.modes.map((m) => `${c.date(m.date, { weekday: "short", day: "numeric" })} ${modeName(m.mode)}`).join(" · ")],
      [c.t("الفئة المستهدفة", "Audience"), c.L(d.audience)],
      [c.t("التسجيل", "Registration"), c.L(d.registration)],
      [c.t("عدد المقبولين", "Accepted"), c.n(d.expected)],
      [c.t("رسمية", "Official"), d.official ? c.t("نعم", "Yes") : c.t("لا", "No")],
    ];
    return `<div class="pk-phone">
      ${topbar(c, { title: c.t("مسار الفعاليات", "Pipeline"), back: true, bell: false })}
      <main class="pk-main">
        <div class="pk-title">
          <span class="pk-tag">${c.icon(c.dept(r.dept).icon)}${c.L(c.dept(r.dept))}</span>
          <h1>${c.L(r.title)}</h1>
          <p>${c.range(r.start, r.end, { weekday: "short", day: "numeric", month: "short" })} · ${c.L(r.type)} · ${c.t(`بدأه ${c.L(r.createdBy)}`, `Started by ${c.L(r.createdBy)}`)}</p>
        </div>
        <section class="pk-card pk-holdcard">
          <div><b>${c.t("الأيام محجوزة", "Dates held")}</b><p>${c.t("أكمل بيانات الفعالية والطلبين ثم أرسل قبل انتهاء الحجز:", "Fill in the event and both briefs, then submit before the hold runs out:")}</p></div>
          <span class="pk-clock">${c.cd(r.holdMs, "hms")}</span>
        </section>
        <section class="pk-card pk-pad">
          <div class="pk-card-h"><h3>${c.t("سير الطلب", "Progress")}</h3><span class="pk-mute">${c.t(`الخطوة ${c.n(1)} من ${c.n(5)}`, "Step 1 of 5")}</span></div>
          ${prog(c, r.stage, { labels: true })}
        </section>
        <section class="pk-sec">
          <div class="pk-sec-h"><h3>${c.t("عبّئ الطلب", "Fill it in")}</h3></div>
          <div class="pk-card pk-list">
            ${r.sections.map((s) => `<a class="pk-sect pk-press" href="#">
              <span class="pk-ico">${c.icon(secIcon[s.key])}</span>
              <span class="pk-row-main"><span class="pk-row-t">${c.L(s)}</span>
              <span class="pk-row-m">${c.t(`${c.n(s.done)} من ${c.n(s.total)} مكتمل`, `${s.done} of ${s.total} done`)}</span>
              <span class="pk-state t-wait"><i class="pk-sdot"></i>${c.t("ناقص:", "Missing:")} ${s.missing.map((m) => c.L(m)).join("، ")}</span></span>
              ${fwd(c)}
            </a>`).join("")}
          </div>
        </section>
        <section class="pk-sec">
          <div class="pk-sec-h"><h3>${c.t("بيانات الفعالية", "Event details")}</h3><a class="pk-link pk-press" href="#">${c.t("تعديل", "Edit")}</a></div>
          <div class="pk-card pk-pad pk-dl">${peek.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}
            <div class="pk-missrow"><span>${c.t("بريد المقدّم", "Presenter email")}</span><span class="pk-state t-wait"><i class="pk-sdot"></i>${c.t("مطلوب لأن أحد الأيام عن بُعد", "Required: one day is online")}</span></div>
          </div>
        </section>
        <button class="pk-cancel pk-press">${c.t("إلغاء الطلب", "Cancel request")}</button>
      </main>
      <div class="pk-sticky col">
        <div class="pk-sticky-txt"><b>${c.t(`بقيت ${c.n(3)} أشياء قبل الإرسال`, "3 things left before you can submit")}</b><span>${c.t("كل تعديل يُحفظ تلقائيًا", "Every change saves on its own")}</span></div>
        <div class="pk-sticky-btns">
          <button class="pk-btn pk-btn-ghost pk-press">${c.t("إكمال لاحقًا", "Finish later")}</button>
          <button class="pk-btn pk-btn-primary" disabled>${c.t("إرسال", "Submit")}</button>
        </div>
      </div>
    </div>`;
  }

  function inbox(c) {
    const i2 = c.data.inbox[0];
    const r2 = c.req("r2");
    const b = i2.brief;
    const brief = [
      [c.t("نوع التصميم", "Design type"), c.L(b.type)],
      [c.t("المقاس", "Size"), c.L(b.size)],
      [c.t("نوع الملف", "File type"), b.file],
      [c.t("حالة المحتوى", "Content"), c.L(b.content)],
    ];
    const counts = { design: 1, logistics: 1, media: 1 };
    const chip = (key, label, n, on) => `<button class="pk-seg pk-press" data-pk-filter="${key}" aria-pressed="${on}">${label}<span>${c.n(n)}</span></button>`;
    const notes = c.data.notifications.map((n) => `<a class="pk-notif pk-press ${n.unread ? "unread" : ""}" href="#">
      <span class="pk-ico ${NOTE_TONE[n.kind] ? "t-" + NOTE_TONE[n.kind] : ""}">${c.icon(NOTE_ICON[n.kind] || "bell")}</span>
      <span class="pk-row-main"><span class="pk-notif-t">${c.L(n.text)}</span><span class="pk-row-m">${c.L(n.ago)}</span></span>
      ${n.unread ? `<i class="pk-unread" aria-label="${c.t("جديد", "New")}"></i>` : ""}
    </a>`).join("");
    return `<div class="pk-phone" data-pk-inbox>
      ${topbar(c)}
      <main class="pk-main">
        <div class="pk-hello"><h1>${c.t("بانتظار فريقك", "Waiting on your team")}</h1><p>${c.t("أنت مشرف عام، فتشوف مهام كل الفرق.", "You're a super admin, so you see every team's tasks.")}</p></div>
        <div class="pk-segs" role="group" aria-label="${c.t("تصفية حسب الفريق", "Filter by team")}">
          ${chip("all", c.t("الكل", "All"), 3, true)}
          ${chip("design", c.L(c.dept("design")), counts.design, false)}
          ${chip("logistics", c.L(c.dept("logistics")), counts.logistics, false)}
          ${chip("media", c.L(c.dept("media")), counts.media, false)}
        </div>
        <section class="pk-card pk-task" data-team="design">
          <div class="pk-task-h">
            <span class="pk-ico">${c.icon("palette")}</span>
            <span class="pk-row-main"><span class="pk-row-m">${c.L(c.dept("design"))} · ${c.L(i2.received)}</span>
            <span class="pk-task-t">${c.L(r2.title)}</span>
            <span class="pk-row-m">${c.L(c.dept(r2.dept))} · ${c.date(r2.start, { weekday: "short", day: "numeric", month: "short" })}</span></span>
          </div>
          <div class="pk-turnnote"><span class="pk-state t-wait"><i class="pk-sdot"></i>${c.t("دور قسمك", "Your team's turn")}</span><p>${c.t("اقرأ الطلب بالأسفل، ثم علّم مهمتك كمنجزة عند الانتهاء.", "Read the request below, then mark your part done when it's finished.")}</p></div>
          <div class="pk-dl">${brief.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>
          <a class="pk-link pk-press" href="#">${c.t("اقرأ طلب التصميم كاملًا", "Read the full design brief")}${c.icon("arrow-right", "flip-rtl")}</a>
          <p class="pk-state t-info pk-until"><i class="pk-sdot"></i>${c.t(`يمكن إعادته حتى ${c.date(i2.returnUntil, { day: "numeric", month: "long" })}`, `Can be returned until ${c.date(i2.returnUntil, { day: "numeric", month: "long" })}`)}</p>
          <div class="pk-task-btns">
            <button class="pk-btn pk-btn-primary pk-press">${c.icon("check")}${c.t("إنهاء مهمة التصميم", "Mark Design done")}</button>
            <button class="pk-btn pk-btn-soft pk-press">${c.icon("corner-up-left", "flip-rtl")}${c.t("إعادة مع ملاحظات", "Return with notes")}</button>
          </div>
        </section>
        <div class="pk-card pk-list">${c.data.inbox.slice(1).map((i) => inboxRow(c, i)).join("")}</div>
        <section class="pk-sec">
          <div class="pk-sec-h"><h3>${c.t("الإشعارات", "Notifications")}</h3><button class="pk-link pk-press">${c.t("تعليم الكل كمقروء", "Mark all read")}</button></div>
          <div class="pk-card pk-list">${notes}</div>
        </section>
      </main>
      ${bottomnav(c, "requests")}
    </div>`;
  }

  /* ---------- desktop ---------- */

  function desktop(c) {
    const mine = c.data.requests.filter((r) => r.mine);
    const navGroups = c.data.nav.map((g) => `<div class="pk-dnav-g" role="group" aria-label="${c.L(g.group)}">${g.items.map((it) =>
      `<a class="pk-dnav-i pk-press ${it.key === "home" ? "on" : ""}" href="#" ${it.key === "home" ? 'aria-current="page"' : ""}>${c.icon(it.icon)}${c.L(it)}</a>`).join("")}</div>`).join('<span class="pk-dnav-sep"></span>');

    // requests grouped by stop, for the club board
    const S = c.data.steps;
    const byStep = S.map(() => []);
    c.data.requests.forEach((r) => { const s = c.data.stages[r.stage].step; if (s >= 0) byStep[s].push(r); });
    const board = `<div class="pk-board">${S.map((s, i) => `<div class="pk-col">
      <div class="pk-col-h"><span>${c.L(s)}</span><b>${c.n(byStep[i].length)}</b></div>
      ${byStep[i].map((r) => `<a class="pk-mini pk-press" href="#"><span class="pk-row-t">${c.L(r.title)}</span><span class="pk-row-m">${c.L(c.dept(r.dept).short)} · ${c.range(r.start, r.end)}</span>${r.stage === "returned" ? `<span class="pk-state t-ret"><i class="pk-sdot"></i>${c.t("مُعاد", "Returned")} · ${c.cd(r.fixMs, "hm")}</span>` : ""}</a>`).join("")}
    </div>`).join("")}</div>`;

    return `<div class="pk-desk">
      <header class="pk-dtop">
        <div class="pk-dtop-row">
          <span class="pk-brand lg">${c.logo(30)}<span>${c.t("GDG القصيم", "GDG Qassim")}<small>${c.t("لوحة الإدارة", "Admin console")}</small></span></span>
          <label class="pk-search">${c.icon("search")}<input placeholder="${c.t("ابحث عن فعالية أو عضو أو صفحة…", "Search events, members, pages…")}"><kbd>⌘K</kbd></label>
          <div class="pk-dtop-e">
            <button class="pk-iconbtn pk-press pk-bell" aria-label="${c.t("الإشعارات، ٣ جديدة", "Notifications, 3 new")}">${c.icon("bell")}<b>${c.n(3)}</b></button>
            <span class="pk-avatar lg" role="img" aria-label="${c.L(c.data.me.name)}">${c.icon("user-round")}</span>
          </div>
        </div>
        <nav class="pk-dnav" aria-label="${c.t("التنقل", "Navigation")}">${navGroups}</nav>
      </header>
      <main class="pk-dmain">
        <div class="pk-dhello">
          <div><h1>${c.t(`أهلًا ${c.L(c.data.me.name)}`, `Hi, ${c.L(c.data.me.name)}`)}</h1>
          <p>${c.t(`عندك طلب واحد دورك فيه، و${c.n(3)} تنتظر فريقك. فيه فعالية وحدة شغالة الحين.`, "One request is waiting on you and 3 on your team. One event is running right now.")}</p></div>
          <a class="pk-btn pk-btn-primary pk-press" href="#">${c.icon("calendar-plus")}${c.t("احجز موعدًا", "Book dates")}</a>
        </div>
        <div class="pk-dgrid">
          <div class="pk-dcol">
            ${yourTurn(c, { desk: true })}
            <section class="pk-sec">
              <div class="pk-sec-h"><h3>${c.t("طلبات قسمك", "Your department's requests")}</h3><a class="pk-link pk-press" href="#">${c.t("الكل", "See all")}</a></div>
              <div class="pk-card pk-list">${mine.map((r) => requestRow(c, r)).join("")}</div>
            </section>
          </div>
          <div class="pk-dcol">
            <section class="pk-card pk-pad">
              <div class="pk-month">
                <h3>${c.t("تقويم الحجوزات", "Booking calendar")} · ${c.date("2026-10-01", { month: "long" })}</h3>
                <span class="pk-month-nav"><button class="pk-iconbtn sm pk-press" aria-label="${c.t("الشهر السابق", "Previous month")}">${c.icon("chevron-left", "flip-rtl")}</button><button class="pk-iconbtn sm pk-press" aria-label="${c.t("الشهر التالي", "Next month")}">${c.icon("chevron-right", "flip-rtl")}</button></span>
              </div>
              ${calendar(c, { compact: true })}
              ${legend(c)}
            </section>
            <section class="pk-sec">
              <div class="pk-sec-h"><h3>${c.t("بانتظار فريقك", "Waiting on your team")}</h3><span class="pk-count">${c.n(3)}</span></div>
              <div class="pk-card pk-list">${c.data.inbox.map((i) => inboxRow(c, i)).join("")}</div>
            </section>
          </div>
        </div>
        <section class="pk-card pk-pad pk-boardcard">
          <div class="pk-card-h"><h3>${c.t("المسار في النادي", "Across the club")}</h3><span class="pk-mute">${c.t(`${c.n(c.data.requests.length)} طلبات في ${c.n(5)} محطات`, `${c.data.requests.length} requests across 5 steps`)}</span></div>
          ${board}
        </section>
        <div class="pk-d3">${eventsCard(c)}${attentionCard(c)}${statsCard(c)}</div>
      </main>
    </div>`;
  }

  /* ---------- interactions ---------- */

  function after(root, c) {
    root.querySelectorAll(".d-pocket [data-pk-inbox]").forEach((scr) => {
      scr.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pk-filter]");
        if (!b) return;
        const f = b.dataset.pkFilter;
        scr.querySelectorAll("[data-pk-filter]").forEach((x) => x.setAttribute("aria-pressed", x === b));
        scr.querySelectorAll(".pk-main [data-team]").forEach((el) => { el.hidden = f !== "all" && el.dataset.team !== f; });
        scr.querySelectorAll(".pk-list").forEach((l) => { if (l.querySelector("[data-team]")) l.hidden = ![...l.children].some((ch) => !ch.hidden); });
      });
    });
    root.querySelectorAll(".d-pocket [data-pk-book]").forEach((scr) => {
      let a = 23, b = 24;
      const days = c.data.calendar.days;
      const paint = () => {
        scr.querySelectorAll(".pk-day[data-d]").forEach((el) => {
          const d = +el.dataset.d;
          const on = a && d >= a && d <= (b || a);
          el.classList.toggle("sel", !!on);
          el.classList.toggle("sel-a", d === a);
          el.classList.toggle("sel-b", d === (b || a));
          if (on) el.setAttribute("aria-pressed", "true"); else el.removeAttribute("aria-pressed");
        });
        const sum = scr.querySelector("[data-pk-sum]");
        const iso = (d) => `2026-10-${String(d).padStart(2, "0")}`;
        if (sum) sum.textContent = `${c.range(iso(a), iso(b || a))} · ${dayCount(c, (b || a) - a + 1)}`;
      };
      scr.addEventListener("click", (e) => {
        const el = e.target.closest(".pk-day[data-d]");
        if (!el || el.disabled) return;
        const d = +el.dataset.d;
        if (!a || b || d < a) { a = d; b = null; }
        else {
          let ok = true;
          for (let x = a; x <= d; x++) if (days[x].status !== "open") ok = false;
          if (ok) b = d; else { a = d; b = null; }
        }
        paint();
      });
    });
  }

  /* ---------- styles ---------- */

  const css = `
.d-pocket {
  --bg: #F8EDE7; --card: #FFFFFF; --sunk: #F2E4DB; --line: #EAD9CE; --ink: #2A1F1C; --ink2: #6E5D57;
  --act: #1A73E8; --act-hover: #1765CC; --act-ink: #FFFFFF; --act-soft: #E3EDFC; --act-soft-ink: #1558B8;
  --done: #3A7752; --done-soft: #E3EFE6;
  --wait: #92600A; --wait-soft: #F7E9CF;
  --ret: #B0412D; --ret-soft: #F7E0D9;
  --info: #44658A; --info-soft: #E2EAF3;
  --mute: #8A7770;
  --shadow: 0 1px 2px rgb(92 52 32 / .05), 0 10px 28px -16px rgb(92 52 32 / .22);
  --sb: #2A1F1C; --sb-bg: #F8EDE7;
  --r-card: 20px; --r-ctl: 14px;
  background: var(--bg); color: var(--ink);
  font-family: "Almarai", "Noto Sans Arabic", system-ui, sans-serif; font-size: 16px; line-height: 1.5;
  -webkit-font-smoothing: antialiased; scrollbar-color: var(--line) transparent;
}
.d-pocket[data-theme="dark"] {
  --bg: #1B1513; --card: #261E1B; --sunk: #31271F; --line: #3B2F29; --ink: #F5EAE4; --ink2: #C3B2A9;
  --act: #8AB4F8; --act-hover: #A3C4FA; --act-ink: #0B1D3A; --act-soft: #24324A; --act-soft-ink: #B5CEF9;
  --done: #8CC9A0; --done-soft: #23332A;
  --wait: #E8B85E; --wait-soft: #3A2E1A;
  --ret: #F09A86; --ret-soft: #40241E;
  --info: #A3BBD8; --info-soft: #25303D;
  --mute: #9E8D85;
  --shadow: 0 1px 2px rgb(0 0 0 / .3), 0 12px 30px -18px rgb(0 0 0 / .6);
  --sb: #F5EAE4; --sb-bg: #1B1513;
}
.d-pocket ::selection { background: color-mix(in srgb, var(--act) 28%, transparent); }
.d-pocket :focus-visible { outline: 2px solid var(--act); outline-offset: 2px; border-radius: 10px; }
.d-pocket h1, .d-pocket h2, .d-pocket h3, .d-pocket p { margin: 0; }
.d-pocket a { color: inherit; text-decoration: none; }
.d-pocket button { font: inherit; color: inherit; }
.d-pocket svg.lucide { width: 20px; height: 20px; stroke-width: 2; flex: none; }
.d-pocket .pk-chev { width: 18px; height: 18px; color: var(--mute); }
.d-pocket .pk-press { transition: transform .2s cubic-bezier(.2,.9,.3,1.2), background-color .15s ease, border-color .15s ease; cursor: pointer; }
.d-pocket .pk-press:active { transform: scale(.97); }
@media (prefers-reduced-motion: reduce) { .d-pocket .pk-press { transition: none; } .d-pocket .pk-press:active { transform: none; } }

/* phone frame */
.d-pocket .pk-phone { display: flex; flex-direction: column; min-height: 100%; }
.d-pocket .pk-main { flex: 1; display: flex; flex-direction: column; gap: 14px; padding: 6px 16px 24px; }
.d-pocket .pk-top { position: sticky; top: 47px; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 12px 8px 16px; background: var(--bg); }
.d-pocket .pk-top-s, .d-pocket .pk-top-e { display: flex; align-items: center; gap: 6px; min-width: 0; }
.d-pocket .pk-brand { display: inline-flex; align-items: center; gap: 9px; font-weight: 800; font-size: 16px; }
.d-pocket .pk-brand small { display: block; font-weight: 400; font-size: 12.5px; color: var(--ink2); }
.d-pocket .pk-tb-title { font-weight: 800; font-size: 17px; }
.d-pocket .pk-iconbtn { width: 44px; height: 44px; border-radius: 50%; border: 0; background: transparent; display: inline-grid; place-items: center; position: relative; color: var(--ink); }
.d-pocket .pk-iconbtn:hover { background: var(--sunk); }
.d-pocket .pk-iconbtn.sm { width: 36px; height: 36px; }
.d-pocket .pk-bell b { position: absolute; top: 6px; inset-inline-end: 5px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px; background: var(--ret); color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; box-shadow: 0 0 0 2px var(--bg); }
.d-pocket[data-theme="dark"] .pk-bell b { color: #2A120D; }
.d-pocket .pk-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--sunk); color: var(--ink); display: grid; place-items: center; font-weight: 800; font-size: 15px; box-shadow: inset 0 0 0 1px var(--line); }
.d-pocket .pk-avatar.lg { width: 40px; height: 40px; }
.d-pocket .pk-avatar svg.lucide { width: 19px; height: 19px; color: var(--ink2); }

.d-pocket .pk-hello { padding: 6px 4px 2px; }
.d-pocket .pk-hello h1 { font-size: 27px; line-height: 1.25; font-weight: 800; letter-spacing: -0.01em; }
.d-pocket .pk-hello p { color: var(--ink2); margin-top: 4px; font-size: 15px; }

/* cards */
.d-pocket .pk-card { background: var(--card); border-radius: var(--r-card); box-shadow: var(--shadow); }
.d-pocket .pk-pad { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.d-pocket .pk-card-h, .d-pocket .pk-sec-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.d-pocket .pk-card-h h3, .d-pocket .pk-sec-h h3 { font-size: 17px; font-weight: 800; }
.d-pocket .pk-sec { display: flex; flex-direction: column; gap: 10px; }
.d-pocket .pk-sec-h { padding: 6px 4px 0; }
.d-pocket .pk-mute { color: var(--ink2); font-size: 13.5px; }
.d-pocket .pk-count { min-width: 26px; height: 26px; padding: 0 8px; border-radius: 13px; background: var(--wait-soft); color: var(--wait); font-weight: 700; font-size: 13px; display: grid; place-items: center; font-variant-numeric: tabular-nums; }
.d-pocket .pk-link { color: var(--act-soft-ink); font-weight: 700; font-size: 14.5px; display: inline-flex; align-items: center; gap: 4px; min-height: 36px; background: none; border: 0; padding: 0; }
.d-pocket .pk-link svg.lucide { width: 16px; height: 16px; }
.d-pocket .pk-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.d-pocket[data-theme="dark"] .pk-link { color: var(--act); }

/* state text: the one mapping */
.d-pocket .pk-state { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 700; color: var(--ink2); }
.d-pocket .pk-sdot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
.d-pocket .t-done { color: var(--done); } .d-pocket .t-wait { color: var(--wait); }
.d-pocket .t-ret { color: var(--ret); } .d-pocket .t-info { color: var(--info); } .d-pocket .t-mute { color: var(--mute); }

/* the 5-stop progress */
.d-pocket .pk-prog { display: grid; grid-template-columns: repeat(5, 1fr); align-items: start; }
.d-pocket .pk-stop { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; min-width: 0; }
.d-pocket .pk-stop::before { content: ""; position: absolute; top: 5px; height: 2px; inset-inline-start: calc(-50% + 9px); inset-inline-end: calc(50% + 9px); border-radius: 1px; background: var(--line); }
.d-pocket .pk-stop:first-child::before { display: none; }
.d-pocket .pk-stop.ln-on::before { background: var(--done); }
.d-pocket .pk-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--card); box-shadow: inset 0 0 0 2px var(--line); display: grid; place-items: center; position: relative; z-index: 1; }
.d-pocket .pk-stop.done .pk-dot { background: var(--done); box-shadow: none; }
.d-pocket .pk-stop.cur .pk-dot { background: currentColor; box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 22%, transparent); }
.d-pocket .pk-stop-l { font-size: 12px; line-height: 1.3; color: var(--ink2); text-align: center; font-weight: 700; }
.d-pocket .pk-stop.cur .pk-stop-l { color: currentColor; }
.d-pocket .pk-stop.done .pk-stop-l { color: var(--ink); }
.d-pocket .pk-prog.lg .pk-stop::before { top: 11px; inset-inline-start: calc(-50% + 14px); inset-inline-end: calc(50% + 14px); }
.d-pocket .pk-prog.lg .pk-dot { width: 24px; height: 24px; }
.d-pocket .pk-prog.lg .pk-dot svg.lucide { width: 14px; height: 14px; color: var(--card); stroke-width: 3; }
.d-pocket .pk-prog.lg .pk-stop.cur .pk-dot { box-shadow: 0 0 0 5px color-mix(in srgb, currentColor 20%, transparent); }
.d-pocket .pk-prog.counts .pk-stop::before { top: 15px; inset-inline-start: calc(-50% + 18px); inset-inline-end: calc(50% + 18px); }
.d-pocket .pk-prog.counts .pk-dot { width: 32px; height: 32px; font-size: 14px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; }
.d-pocket .pk-prog.counts .pk-stop.has .pk-dot { background: var(--sunk); box-shadow: inset 0 0 0 1.5px var(--ink2); }
.d-pocket .pk-prog.counts .pk-stop.none .pk-dot { color: var(--mute); }

/* your turn */
.d-pocket .pk-turn { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.d-pocket .pk-turn-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.d-pocket .pk-hold { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--ink2); }
.d-pocket .pk-hold svg.lucide { width: 16px; height: 16px; }
.d-pocket .pk-hold b { color: var(--wait); font-variant-numeric: tabular-nums; }
.d-pocket .pk-turn-t { font-size: 24px; line-height: 1.25; font-weight: 800; letter-spacing: -0.01em; }
.d-pocket .pk-turn-m { color: var(--ink2); font-size: 14.5px; margin-top: -6px; }
.d-pocket .pk-turn .pk-prog { margin: 4px 0 2px; }
.d-pocket .pk-missing { background: var(--wait-soft); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.d-pocket .pk-missing p { font-size: 14px; font-weight: 700; color: var(--wait); }
.d-pocket .pk-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.d-pocket .pk-chip { font-size: 13px; padding: 5px 10px; border-radius: 99px; background: var(--card); color: var(--ink); font-weight: 700; }

/* buttons */
.d-pocket .pk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; padding: 0 22px; border-radius: 99px; border: 0; font-weight: 800; font-size: 16px; white-space: nowrap; }
.d-pocket .pk-btn svg.lucide { width: 18px; height: 18px; }
.d-pocket .pk-btn-primary { background: var(--act); color: var(--act-ink); box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--act) 70%, transparent); }
.d-pocket .pk-btn-primary:hover { background: var(--act-hover); }
.d-pocket .pk-btn-primary:disabled { background: var(--sunk); color: var(--mute); box-shadow: none; cursor: not-allowed; }
.d-pocket .pk-btn-soft { background: var(--act-soft); color: var(--act-soft-ink); }
.d-pocket .pk-btn-soft:hover { background: color-mix(in srgb, var(--act-soft) 80%, var(--act)); }
.d-pocket .pk-btn-ghost { background: transparent; color: var(--act-soft-ink); box-shadow: inset 0 0 0 1.5px var(--line); }
.d-pocket[data-theme="dark"] .pk-btn-ghost { color: var(--act); }
.d-pocket .pk-btn-ghost:hover { background: var(--sunk); }
.d-pocket .pk-btn-sm { min-height: 40px; padding: 0 16px; font-size: 14px; }
.d-pocket .pk-turn .pk-btn { width: 100%; }

/* book shortcut */
.d-pocket .pk-book { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.d-pocket .pk-book:hover { background: color-mix(in srgb, var(--card) 92%, var(--act)); }
.d-pocket .pk-book-ico { width: 46px; height: 46px; border-radius: 15px; background: var(--act-soft); color: var(--act-soft-ink); display: grid; place-items: center; flex: none; }
.d-pocket[data-theme="dark"] .pk-book-ico { color: var(--act); }
.d-pocket .pk-book-t { font-weight: 800; font-size: 16px; color: var(--act-soft-ink); }
.d-pocket[data-theme="dark"] .pk-book-t { color: var(--act); }

/* lists */
.d-pocket .pk-list { display: flex; flex-direction: column; overflow: hidden; }
.d-pocket .pk-list > * + * { border-top: 1px solid var(--line); }
.d-pocket .pk-req { display: flex; gap: 12px; align-items: flex-start; padding: 15px 16px; }
.d-pocket .pk-req:hover, .d-pocket .pk-row:hover, .d-pocket .pk-sect:hover, .d-pocket .pk-notif:hover, .d-pocket .pk-radio:hover, .d-pocket .pk-mini:hover { background: color-mix(in srgb, var(--card) 94%, var(--ink)); }
.d-pocket .pk-req-main, .d-pocket .pk-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.d-pocket .pk-req-main .pk-prog { margin-top: 9px; max-width: 220px; }
.d-pocket .pk-req-t, .d-pocket .pk-row-t { font-weight: 700; font-size: 15.5px; line-height: 1.35; }
.d-pocket .pk-req-m, .d-pocket .pk-row-m { color: var(--ink2); font-size: 13.5px; }
.d-pocket .pk-req-e { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex: none; max-width: 42%; text-align: end; }
.d-pocket .pk-req-e .pk-state { font-size: 12.5px; }
.d-pocket .pk-row, .d-pocket .pk-sect, .d-pocket .pk-notif, .d-pocket .pk-radio { display: flex; align-items: center; gap: 12px; padding: 13px 16px; min-height: 64px; }
.d-pocket .pk-sect { align-items: flex-start; }
.d-pocket .pk-sect .pk-state { margin-top: 4px; font-size: 13px; }
.d-pocket .pk-ico { width: 40px; height: 40px; border-radius: 13px; background: var(--sunk); color: var(--ink); display: grid; place-items: center; flex: none; }
.d-pocket .pk-ico.t-ret { color: var(--ret); background: var(--ret-soft); }
.d-pocket .pk-ico.t-done { color: var(--done); background: var(--done-soft); }

/* overview */
.d-pocket .pk-note { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--ret-soft); border-radius: 14px; padding: 10px 14px; min-height: 48px; }
.d-pocket .pk-note-t { flex: 1; font-size: 13.5px; color: var(--ink); min-width: 0; }
.d-pocket .pk-note-t b { color: var(--ret); font-variant-numeric: tabular-nums; }

/* events / attention / stats */
.d-pocket .pk-evs, .d-pocket .pk-atts { display: flex; flex-direction: column; }
.d-pocket .pk-evs > * + *, .d-pocket .pk-atts > * + * { border-top: 1px solid var(--line); }
.d-pocket .pk-ev, .d-pocket .pk-att { display: flex; flex-direction: column; gap: 4px; padding: 12px 0; }
.d-pocket .pk-ev:first-child, .d-pocket .pk-att:first-child { padding-top: 0; }
.d-pocket .pk-ev:last-child, .d-pocket .pk-att:last-child { padding-bottom: 0; }
.d-pocket .pk-ev-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.d-pocket .pk-ev .pk-link { align-self: flex-start; }
.d-pocket .pk-att .pk-btn { align-self: flex-start; margin-top: 6px; }
.d-pocket .pk-stat { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 4px 0; font-size: 14.5px; color: var(--ink2); }
.d-pocket .pk-stat small { display: block; font-size: 12.5px; }
.d-pocket .pk-stat b { color: var(--ink); font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }

/* bottom nav */
.d-pocket .pk-nav { position: sticky; bottom: 0; z-index: 30; display: grid; grid-template-columns: 1fr 1fr 72px 1fr 1fr; align-items: center; padding: 8px 10px 30px; background: color-mix(in srgb, var(--card) 96%, var(--bg)); border-top: 1px solid var(--line); }
.d-pocket .pk-nav-i { display: flex; flex-direction: column; align-items: center; gap: 3px; min-height: 52px; justify-content: center; font-size: 12px; font-weight: 700; color: var(--ink2); border-radius: 14px; }
.d-pocket .pk-nav-i svg.lucide { width: 22px; height: 22px; }
.d-pocket .pk-nav-i.on { color: var(--act-soft-ink); }
.d-pocket[data-theme="dark"] .pk-nav-i.on { color: var(--act); }
.d-pocket .pk-nav-i.on svg.lucide { stroke-width: 2.4; }
.d-pocket .pk-nav-add { width: 58px; height: 58px; border-radius: 50%; background: var(--act); color: var(--act-ink); display: grid; place-items: center; justify-self: center; margin-top: -26px; box-shadow: 0 10px 22px -10px color-mix(in srgb, var(--act) 80%, transparent), 0 0 0 5px var(--bg); }
.d-pocket .pk-nav-add svg.lucide { width: 28px; height: 28px; stroke-width: 2.5; }

/* book */
.d-pocket .pk-hint { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: var(--ink2); padding: 4px 4px 0; }
.d-pocket .pk-hint svg.lucide { width: 18px; height: 18px; margin-top: 2px; color: var(--info); }
.d-pocket .pk-month { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.d-pocket .pk-month h2 { font-size: 19px; font-weight: 800; }
.d-pocket .pk-month h3 { font-size: 17px; font-weight: 800; }
.d-pocket .pk-month-nav { display: inline-flex; gap: 2px; }
.d-pocket .pk-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.d-pocket .pk-wd { font-size: 11.5px; color: var(--ink2); text-align: center; font-weight: 700; padding-bottom: 4px; overflow: hidden; white-space: nowrap; text-overflow: clip; }
.d-pocket .pk-day { height: 46px; border-radius: 13px; border: 0; background: transparent; font-weight: 700; font-size: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; position: relative; font-variant-numeric: tabular-nums; color: var(--ink); }
.d-pocket .pk-cal.compact .pk-day { height: 40px; font-size: 14px; border-radius: 11px; }
.d-pocket .pk-cdot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.d-pocket .pk-day.s-open { box-shadow: inset 0 0 0 1px var(--line); cursor: pointer; transition: background-color .15s ease, transform .2s cubic-bezier(.2,.9,.3,1.2); }
.d-pocket .pk-day.s-open:hover { background: var(--act-soft); }
.d-pocket .pk-day.s-open:active { transform: scale(.94); }
.d-pocket .pk-day.s-locked { color: var(--mute); font-weight: 400; opacity: .7; }
.d-pocket .pk-day.s-banned { background: var(--ret-soft); color: var(--ret); }
.d-pocket .pk-day.s-banned span { text-decoration: line-through; text-decoration-thickness: 1.5px; }
.d-pocket .pk-day.s-held { background: var(--wait-soft); color: var(--wait); }
.d-pocket .pk-day.s-booked { background: var(--info-soft); color: var(--info); }
.d-pocket .pk-day.s-published { background: var(--done-soft); color: var(--done); }
.d-pocket .pk-day.today { box-shadow: inset 0 0 0 2px var(--ink2); opacity: 1; color: var(--ink); }
.d-pocket .pk-day.sel { background: var(--act); color: var(--act-ink); box-shadow: none; }
.d-pocket .pk-day:disabled { cursor: default; }
.d-pocket .pk-first { font-size: 13.5px; color: var(--ink2); }
.d-pocket .pk-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 12.5px; color: var(--ink2); }
.d-pocket .pk-legend span { display: inline-flex; align-items: center; gap: 6px; }
.d-pocket .pk-sw { width: 14px; height: 14px; border-radius: 5px; display: inline-block; }
.d-pocket .pk-sw.s-open { box-shadow: inset 0 0 0 1.5px var(--line); }
.d-pocket .pk-sw.s-held { background: var(--wait-soft); box-shadow: inset 0 0 0 1.5px var(--wait); }
.d-pocket .pk-sw.s-booked { background: var(--info-soft); box-shadow: inset 0 0 0 1.5px var(--info); }
.d-pocket .pk-sw.s-published { background: var(--done-soft); box-shadow: inset 0 0 0 1.5px var(--done); }
.d-pocket .pk-sw.s-banned { background: var(--ret-soft); box-shadow: inset 0 0 0 1.5px var(--ret); }
.d-pocket .pk-sw.s-locked { background: var(--sunk); }
.d-pocket .pk-ban { display: flex; flex-direction: column; gap: 2px; }
.d-pocket .pk-radio input { position: absolute; opacity: 0; pointer-events: none; }
.d-pocket .pk-radio { cursor: pointer; position: relative; }
.d-pocket .pk-rdot { width: 22px; height: 22px; border-radius: 50%; box-shadow: inset 0 0 0 2px var(--line); flex: none; }
.d-pocket .pk-radio input:checked ~ .pk-rdot { box-shadow: inset 0 0 0 2px var(--act), inset 0 0 0 6px var(--card), inset 0 0 0 11px var(--act); }
.d-pocket .pk-radio input:focus-visible ~ .pk-rdot { outline: 2px solid var(--act); outline-offset: 2px; }
.d-pocket .pk-radio:has(input:checked) .pk-row-t { color: var(--ink); }

/* sticky action bar */
.d-pocket .pk-sticky { position: sticky; bottom: 0; z-index: 30; display: flex; align-items: center; gap: 12px; padding: 14px 16px 32px; background: var(--card); border-top: 1px solid var(--line); box-shadow: 0 -10px 30px -20px rgb(0 0 0 / .25); }
.d-pocket .pk-sticky.col { flex-direction: column; align-items: stretch; gap: 10px; }
.d-pocket .pk-sticky-txt { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.d-pocket .pk-sticky-txt b { font-weight: 800; font-size: 15.5px; font-variant-numeric: tabular-nums; }
.d-pocket .pk-sticky-txt span { font-size: 13px; color: var(--ink2); }
.d-pocket .pk-sticky.col .pk-sticky-txt b { color: var(--wait); }
.d-pocket .pk-sticky-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.d-pocket .pk-sticky .pk-btn { min-width: 112px; }

/* request */
.d-pocket .pk-title { display: flex; flex-direction: column; gap: 6px; padding: 4px 4px 0; }
.d-pocket .pk-title h1 { font-size: 28px; line-height: 1.2; font-weight: 800; letter-spacing: -0.01em; }
.d-pocket .pk-title p { color: var(--ink2); font-size: 14.5px; }
.d-pocket .pk-tag { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 99px; background: var(--card); font-size: 13px; font-weight: 700; box-shadow: inset 0 0 0 1px var(--line); }
.d-pocket .pk-tag svg.lucide { width: 15px; height: 15px; }
.d-pocket .pk-holdcard { background: var(--wait-soft); box-shadow: none; padding: 16px 18px; display: flex; align-items: center; gap: 14px; }
.d-pocket .pk-holdcard b { color: var(--wait); font-weight: 800; }
.d-pocket .pk-holdcard p { font-size: 13.5px; color: var(--ink); margin-top: 2px; }
.d-pocket .pk-clock { font-size: 26px; font-weight: 800; color: var(--wait); font-variant-numeric: tabular-nums; direction: ltr; letter-spacing: 0.01em; flex: none; }
.d-pocket .pk-dl { display: flex; flex-direction: column; gap: 0; }
.d-pocket .pk-dl > div { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 9px 0; font-size: 14.5px; }
.d-pocket .pk-dl > div + div { border-top: 1px solid var(--line); }
.d-pocket .pk-dl span { color: var(--ink2); flex: none; }
.d-pocket .pk-dl b { font-weight: 700; text-align: end; }
.d-pocket .pk-missrow .pk-state { font-size: 13px; text-align: end; }
.d-pocket .pk-cancel { align-self: center; border: 0; background: none; color: var(--ret); font-weight: 700; font-size: 14.5px; min-height: 44px; padding: 0 16px; border-radius: 99px; }
.d-pocket .pk-cancel:hover { background: var(--ret-soft); }

/* inbox */
.d-pocket .pk-segs { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px; }
.d-pocket .pk-seg { flex: none; display: inline-flex; align-items: center; gap: 7px; min-height: 42px; padding: 0 15px; border-radius: 99px; border: 0; background: var(--card); font-weight: 700; font-size: 14px; box-shadow: inset 0 0 0 1px var(--line); }
.d-pocket .pk-seg span { font-size: 12.5px; color: var(--ink2); font-variant-numeric: tabular-nums; }
.d-pocket .pk-seg[aria-pressed="true"] { background: var(--act); color: var(--act-ink); box-shadow: none; }
.d-pocket .pk-seg[aria-pressed="true"] span { color: inherit; opacity: .8; }
.d-pocket .pk-task { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.d-pocket .pk-task[hidden], .d-pocket [hidden] { display: none !important; }
.d-pocket .pk-task-h { display: flex; gap: 12px; align-items: flex-start; }
.d-pocket .pk-task-t { font-size: 19px; font-weight: 800; line-height: 1.3; }
.d-pocket .pk-turnnote { background: var(--wait-soft); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.d-pocket .pk-turnnote p { font-size: 13.5px; }
.d-pocket .pk-until { font-size: 13px; }
.d-pocket .pk-task-btns { display: flex; flex-direction: column; gap: 8px; }
.d-pocket .pk-notif { align-items: flex-start; }
.d-pocket .pk-notif-t { font-size: 14.5px; line-height: 1.45; }
.d-pocket .pk-notif.unread .pk-notif-t { font-weight: 700; }
.d-pocket .pk-unread { width: 9px; height: 9px; border-radius: 50%; background: var(--info); margin-top: 8px; flex: none; }

/* desktop */
.d-pocket .pk-desk { min-height: 100%; }
.d-pocket .pk-dtop { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 94%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.d-pocket .pk-dtop-row { max-width: 1280px; margin: 0 auto; padding: 14px 40px 6px; display: flex; align-items: center; gap: 24px; }
.d-pocket .pk-brand.lg { font-size: 17px; line-height: 1.2; }
.d-pocket .pk-search { flex: 1; max-width: 520px; margin-inline: auto; display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 16px; border-radius: 99px; background: var(--card); box-shadow: inset 0 0 0 1px var(--line); color: var(--ink2); }
.d-pocket .pk-search:focus-within { box-shadow: inset 0 0 0 2px var(--act); }
.d-pocket .pk-search input { flex: 1; border: 0; background: none; font: inherit; font-size: 15px; color: var(--ink); outline: none; min-width: 0; }
.d-pocket .pk-search input::placeholder { color: var(--ink2); }
.d-pocket .pk-search kbd { font: 700 12px/1 "Almarai", system-ui; padding: 5px 7px; border-radius: 7px; background: var(--sunk); color: var(--ink2); direction: ltr; }
.d-pocket .pk-dtop-e { display: flex; align-items: center; gap: 8px; }
.d-pocket .pk-dnav { max-width: 1280px; margin: 0 auto; padding: 4px 34px 10px; display: flex; align-items: center; gap: 6px; }
.d-pocket .pk-dnav-g { display: flex; gap: 2px; }
.d-pocket .pk-dnav-sep { width: 1px; height: 20px; background: var(--line); margin: 0 6px; }
.d-pocket .pk-dnav-i { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 13px; border-radius: 99px; font-size: 14px; font-weight: 700; color: var(--ink2); white-space: nowrap; }
.d-pocket .pk-dnav-i svg.lucide { width: 17px; height: 17px; }
.d-pocket .pk-dnav-i:hover { background: var(--sunk); color: var(--ink); }
.d-pocket .pk-dnav-i.on { background: var(--act-soft); color: var(--act-soft-ink); }
.d-pocket[data-theme="dark"] .pk-dnav-i.on { color: var(--act); }
.d-pocket .pk-dmain { max-width: 1280px; margin: 0 auto; padding: 26px 40px 60px; display: flex; flex-direction: column; gap: 22px; }
.d-pocket .pk-dhello { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
.d-pocket .pk-dhello h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.2; }
.d-pocket .pk-dhello p { color: var(--ink2); margin-top: 4px; }
.d-pocket .pk-dgrid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 22px; align-items: start; }
.d-pocket .pk-dcol { display: flex; flex-direction: column; gap: 18px; }
.d-pocket .pk-turn.desk { padding: 22px 24px; gap: 14px; }
.d-pocket .pk-turn.desk .pk-turn-t { font-size: 28px; }
.d-pocket .pk-turn.desk .pk-btn { width: auto; align-self: flex-start; }
.d-pocket .pk-turn.desk .pk-prog { max-width: 420px; }
.d-pocket .pk-board { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.d-pocket .pk-col { background: var(--sunk); border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.d-pocket .pk-col-h { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; font-size: 13.5px; font-weight: 800; }
.d-pocket .pk-col-h b { font-variant-numeric: tabular-nums; color: var(--ink2); }
.d-pocket .pk-mini { background: var(--card); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; box-shadow: 0 1px 2px rgb(0 0 0 / .05); }
.d-pocket .pk-mini .pk-row-t { font-size: 14px; }
.d-pocket .pk-mini .pk-row-m { font-size: 12.5px; }
.d-pocket .pk-mini .pk-state { font-size: 12.5px; margin-top: 2px; }
.d-pocket .pk-d3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start; }
.d-pocket .pk-desk .pk-legend { font-size: 12px; gap: 6px 12px; }
`;

  (window.GDG_DESIGNS = window.GDG_DESIGNS || []).push({
    id: "pocket",
    order: 3,
    meta: {
      name: { ar: "في الجيب", en: "Pocket" },
      tagline: { ar: "تطبيق جوال ودود، ولون واحد للضغط", en: "A friendly phone app, one colour for pressing" },
      thesis: {
        ar: "لوحة الإدارة كتطبيق جوال قبل كل شيء: بطاقات ناعمة في عمود واحد على أرضية دافئة، وكلام يشبه كلام الناس، ولون أزرق واحد محجوز لكل شيء تقدر تضغطه وما غيره. بطاقة «دورك الحين» تتصدر، والمسار مجرد بطاقات قليلة بخط تقدّم من خمس نقاط، مو لوحة مربعات. على سطح المكتب نفس المنتج بمساحة أكبر: شريط علوي وعمودين في الوسط.",
        en: "The admin console as a friendly phone app first: soft cards in one column on a warm ground, labels that sound like a person, and one blue reserved for everything you can press, and nothing else. A big \"your turn\" card leads, and the pipeline is a short stack of cards with a five-dot progress line, not a dashboard of tiles. On desktop it's the same product with more room: a top bar and a centred two-column feed.",
      },
      type: { ar: "Almarai (خط سعودي إنساني يغطي العربية واللاتينية)، جسم ١٦px، عناوين بوزن ٨٠٠", en: "Almarai (a Saudi-made humanist face for both scripts), 16px body, 800-weight headings" },
      nav: { ar: "شريط سفلي ثابت فيه زر «+» دائري في الوسط للحجز، وعلى المكتب شريط علوي بمجموعات التنقل", en: "A persistent bottom bar with a round centre “+” to book; a top bar with the nav groups on desktop" },
      why: {
        ar: "هذي الطريقة اللي يستخدم فيها الطلاب جوالاتهم كل يوم (البنوك، التوصيل، أبشر): ما يحتاج تعلّم، أهداف ضغط كبيرة، كل شيء تحت الإبهام، وهو الأريح للعين بين الأربعة.",
        en: "It's how these students already use their phones every day (banking, delivery, Absher): nothing to learn, big targets, one-thumb reach, and the most comfortable on the eyes of the four.",
      },
      risk: {
        ar: "الأقرب لتطبيق استهلاكي عام. الشغل الكثيف (الأعضاء، الردود، سجل البريد) راح يحس بنعومة زايدة على المكتب ويحتاج وضع جدول أكثف.",
        en: "It's the closest to a generic consumer app; dense admin work (members, responses, email logs) will feel soft on desktop and will need a denser table mode.",
      },
      palette: [
        { name: { ar: "الأرضية", en: "Ground" }, hex: "#F8EDE7" },
        { name: { ar: "البطاقة", en: "Card" }, hex: "#FFFFFF" },
        { name: { ar: "الحبر", en: "Ink" }, hex: "#2A1F1C" },
        { name: { ar: "لون الضغط", en: "Action" }, hex: "#1A73E8" },
        { name: { ar: "تم", en: "Done" }, hex: "#3A7752" },
        { name: { ar: "بانتظار أحد", en: "Waiting" }, hex: "#92600A" },
        { name: { ar: "مُعاد / متأخر", en: "Returned / late" }, hex: "#B0412D" },
        { name: { ar: "معلومة", en: "Info" }, hex: "#44658A" },
      ],
      swatch: "#1A73E8",
      raises: [
        { ar: "من «تونال»: ألوان الحالة من خريطة واحدة موثقة (تم، بانتظار، مُعاد، معلومة) وما يدخل أي لون غيرها.", en: "From Google Tonal: state colours come from one documented mapping (done, waiting, returned, info), and nothing else may introduce a colour." },
        { ar: "من «خط المترو»: خط تقدّم بخمس محطات، نفسه بالضبط في كل مكان يظهر فيه طلب.", en: "From Metro Line: one five-stop progress line, reused identically everywhere a request appears." },
      ],
      fonts: ["Almarai:wght@300;400;700;800"],
    },
    css,
    phone: { home, book, request, inbox },
    desktop,
    after,
  });
})();
