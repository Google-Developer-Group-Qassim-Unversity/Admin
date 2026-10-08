/*
 * Design 1 — Mud & Doors / الطين والأبواب
 * A Najdi house in Qassim: limewash walls are the ground, colour lives only on
 * painted door plates, tarma triangles mark progress, the shurfa parapet tops
 * the header, and the booking calendar is a brick course.
 */
(function () {
  const D = window.GDG_DATA;

  /* ---------- geometry (exact SVG, used as masks so they follow the theme) ---------- */
  const SHURFA = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12'%3E%3Cpath d='M0 12V10H3V7H6V4H9V1H15V4H18V7H21V10H24V12Z'/%3E%3C/svg%3E\")";
  const BAND = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'%3E%3Cpath d='M0 10L4 4L8 10Z M8 0L12 6L16 0Z M7 4.2L8 3L9 4.2L8 5.4Z M15 4.2L16 3L17 4.2L16 5.4Z M-1 4.2L0 3L1 4.2L0 5.4Z'/%3E%3C/svg%3E\")";

  /* ---------- helpers ---------- */
  const stepOf = (r) => D.stages[r.stage].step;
  /** Colour = state. ochre: waiting on you; indigo: with a team; madder: returned; green: published. */
  function roleOf(r) {
    if (r.stage === "returned") return "madder";
    if (r.stage === "published") return "green";
    if (r.stage === "draft" || r.stage === "ready") return "ochre";
    return "indigo";
  }
  function tarma(r, size) {
    const s = size || 12;
    const cur = stepOf(r);
    const role = roleOf(r);
    const gap = Math.round(s * 0.42);
    const w = s * 5 + gap * 4;
    const h = Math.round(s * 0.9);
    let out = "";
    for (let i = 0; i < 5; i++) {
      const x = i * (s + gap);
      const pts = `${x},${h} ${x + s},${h} ${x + s / 2},0.5`;
      let cls = "t-future";
      if (r.stage === "published" || i < cur) cls = "t-done";
      else if (i === cur) cls = role === "madder" ? "t-returned" : `t-cur t-${role}`;
      out += `<polygon class="${cls}" points="${pts}"/>`;
    }
    return `<svg class="n-tarma" viewBox="-1 -1 ${w + 2} ${h + 2}" width="${w + 2}" height="${h + 2}" aria-hidden="true">${out}</svg>`;
  }
  function stageWords(ctx, r) {
    const cur = stepOf(r);
    if (r.stage === "published") return ctx.L(D.stages[r.stage]);
    return `${ctx.L(D.stages[r.stage])} · ${ctx.t(`الخطوة ${ctx.n(cur + 1)} من ${ctx.n(5)}`, `Step ${cur + 1} of 5`)}`;
  }
  function daysWord(ctx, n) {
    if (ctx.lang !== "ar") return n === 1 ? "1 day" : `${n} days`;
    if (n === 1) return "يوم واحد";
    if (n === 2) return "يومان";
    if (n <= 10) return `${ctx.n(n)} أيام`;
    return `${ctx.n(n)} يومًا`;
  }
  const stageCounts = () => {
    const c = [0, 0, 0, 0, 0];
    D.requests.forEach((r) => { const s = stepOf(r); if (s >= 0) c[s]++; });
    return c;
  };
  const teamIcon = { design: "palette", logistics: "truck", media: "megaphone" };
  const notifIcon = { request_received: "inbox", task_done: "check-check", returned: "corner-up-left", ready_to_publish: "send", media_received: "megaphone", dates_banned: "ban", hold_expired: "hourglass" };
  const notifRole = { request_received: "ochre", task_done: "green", returned: "madder", ready_to_publish: "ochre", media_received: "indigo" };
  const chev = (ctx) => ctx.icon("chevron-right", "flip-rtl n-chev");

  /* ---------- shared pieces ---------- */
  function topbar(ctx, title) {
    return `<header class="n-top">
      <div class="n-shurfa" aria-hidden="true"></div>
      <div class="n-top-in">
        <div class="n-brand">${ctx.logo(22)}<div><b>${title}</b><span>${ctx.t("GDG جامعة القصيم", "GDG Qassim University")}</span></div></div>
        <button class="n-iconbtn" aria-label="${ctx.t("الإشعارات، ٣ غير مقروءة", "Notifications, 3 unread")}">${ctx.icon("bell")}<span class="n-badge">${ctx.n(3)}</span></button>
        <span class="n-avatar" aria-label="${ctx.L(D.me.name)}">${ctx.t("إب", "IB")}</span>
      </div>
    </header>`;
  }
  function subbar(ctx, title, back) {
    return `<header class="n-top n-top-sub">
      <div class="n-shurfa" aria-hidden="true"></div>
      <div class="n-top-in">
        <button class="n-iconbtn" aria-label="${ctx.t("رجوع", "Back")}">${ctx.icon("arrow-right", "flip-rtl-rev")}</button>
        <div class="n-brand"><div><b>${title}</b><span>${back}</span></div></div>
        <button class="n-iconbtn" aria-label="${ctx.t("المزيد", "More")}">${ctx.icon("ellipsis")}</button>
      </div>
    </header>`;
  }
  function bottomNav(ctx, active) {
    const it = (key, icon, ar, en) => `<a class="n-nav-it${active === key ? " is-on" : ""}" href="#" ${active === key ? 'aria-current="page"' : ""}>${ctx.icon(icon)}<span>${ctx.t(ar, en)}</span></a>`;
    return `<nav class="n-nav" aria-label="${ctx.t("التنقل", "Navigation")}">
      ${it("home", "house", "الرئيسية", "Home")}
      ${it("pipeline", "route", "المسار", "Pipeline")}
      <a class="n-nav-book" href="#"><span class="n-plate n-ochre">${ctx.icon("calendar-plus")}</span><span>${ctx.t("احجز موعدًا", "Book dates")}</span></a>
      ${it("events", "calendar-days", "الفعاليات", "Events")}
      ${it("more", "layout-grid", "المزيد", "More")}
    </nav>`;
  }
  function yourTurnDoor(ctx, big) {
    const r = D.byId.r1;
    return `<section class="n-door n-ochre${big ? " n-door-big" : ""}" aria-labelledby="yt-${big ? "d" : "p"}">
      <div class="n-band" aria-hidden="true"></div>
      <div class="n-door-in">
        <div class="n-door-head">
          <h2 id="yt-${big ? "d" : "p"}" class="n-display">${ctx.t("دورك الآن", "Your turn")}</h2>
          <span class="n-hold">${ctx.icon("hourglass")}${ctx.t("ينتهي الحجز بعد", "Hold ends in")} <b class="tab">${ctx.cd(r.holdMs, "hms")}</b></span>
        </div>
        <div class="n-door-panel">
          <h3>${ctx.L(r.title)}</h3>
          <p>${ctx.L(D.departments[r.dept])} · ${ctx.range(r.start, r.end)}</p>
          <div class="n-door-prog">${tarma(r, 15)}<span>${stageWords(ctx, r)}</span></div>
          ${big ? `<ul class="n-door-missing">${r.sections.map((s) => `<li><span>${ctx.L(s)}</span><b>${ctx.L(s.missing[0])}</b></li>`).join("")}</ul>` : ""}
        </div>
        <div class="n-door-foot">
          <a class="n-btn n-btn-ink" href="#">${ctx.t("أكمل الطلب", "Continue")}${ctx.icon("arrow-left", "flip-ltr")}</a>
          <span>${ctx.t("بقيت ٣ أشياء قبل الإرسال", "3 things left before you can submit")}</span>
        </div>
      </div>
      <div class="n-band" aria-hidden="true"></div>
    </section>`;
  }
  function reqRow(ctx, r, opts) {
    const role = roleOf(r);
    const extra = r.stage === "returned"
      ? `<span class="n-clock n-madder-t">${ctx.icon("timer")}${ctx.t("التعديل خلال", "Fix within")} <b class="tab">${ctx.cd(r.fixMs, "hm")}</b></span>`
      : r.stage === "draft"
        ? `<span class="n-clock n-ochre-t">${ctx.icon("hourglass")}<b class="tab">${ctx.cd(r.holdMs, "hm")}</b></span>`
        : "";
    return `<a class="n-row" href="#">
      <span class="n-plate n-${role}" aria-hidden="true">${ctx.icon(r.stage === "published" ? "check" : r.stage === "returned" ? "corner-up-left" : r.stage === "draft" ? "pencil-line" : "door-open")}</span>
      <span class="n-row-main">
        <b>${ctx.L(r.title)}</b>
        <span class="n-row-sub">${opts && opts.dept ? `${ctx.L(D.departments[r.dept].short)} · ` : ""}${ctx.range(r.start, r.end)}</span>
        <span class="n-row-prog">${tarma(r, 11)}<span class="n-${role}-t">${ctx.L(D.stages[r.stage])}</span>${extra}</span>
      </span>
      ${chev(ctx)}
    </a>`;
  }
  function sectionHead(ctx, ar, en, linkAr, linkEn, count) {
    return `<div class="n-sh"><h2>${ctx.t(ar, en)}${count != null ? ` <span class="n-count tab">${ctx.n(count)}</span>` : ""}</h2>${linkAr ? `<a href="#">${ctx.t(linkAr, linkEn)}</a>` : ""}</div>`;
  }

  /* ---------- calendar (brick course) ---------- */
  function calendar(ctx, desk) {
    const C = D.calendar;
    const first = new Date(Date.UTC(C.year, C.month - 1, 1)).getUTCDay();
    const heads = [];
    for (let i = 0; i < 7; i++) heads.push(`<span class="n-wd">${ctx.weekday(`2026-10-${String(4 + i).padStart(2, "0")}`, desk ? "short" : "narrow")}</span>`);
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(`<span class="n-brick s-blank" aria-hidden="true"></span>`);
    for (let d = 1; d <= 31; d++) {
      const day = C.days[d];
      const iso = `2026-10-${String(d).padStart(2, "0")}`;
      const sel = d === 23 || d === 24;
      const r = day.request ? D.byId[day.request] : null;
      let label = "";
      if (desk) {
        if (r) label = `<small>${ctx.L(D.departments[r.dept].short)}</small>`;
        else if (day.status === "banned") label = `<small>${ctx.L(day.reason)}</small>`;
        else if (sel) label = `<small>${ctx.t("اختيارك", "Your pick")}</small>`;
      } else if (day.status === "banned") label = `<i class="n-x" aria-hidden="true"></i>`;
      const aria = `${ctx.date(iso, { weekday: "long", day: "numeric", month: "long" })}: ${ctx.L(D.dayStatus[day.status])}${day.reason ? ` (${ctx.L(day.reason)})` : ""}`;
      const cls = ["n-brick", `s-${day.status}`];
      if (sel) cls.push("is-sel", d === 23 ? "is-start" : "is-end");
      if (iso === C.today) cls.push("is-today");
      const disabled = day.status === "locked" || day.status === "banned";
      cells.push(`<button class="${cls.join(" ")}" data-day="${d}" aria-label="${aria}" ${sel ? 'aria-pressed="true"' : ""} ${disabled ? "disabled" : ""}><b class="tab">${ctx.n(d)}</b>${label}</button>`);
    }
    while (cells.length % 7) cells.push(`<span class="n-brick s-blank" aria-hidden="true"></span>`);
    return `<div class="n-cal${desk ? " n-cal-desk" : ""}"><div class="n-cal-head">${heads.join("")}</div><div class="n-course">${cells.join("")}</div></div>`;
  }
  function legend(ctx) {
    const items = [["open", "متاح", "Open"], ["locked", "قريب جدًا", "Too soon"], ["held", "محجوز مؤقتًا", "Held (draft)"], ["booked", "محجوز", "Booked"], ["published", "فعالية منشورة", "Published"], ["banned", "مغلق من اللوجستيات", "Closed by Logistics"], ["sel", "اختيارك", "Your pick"]];
    return `<ul class="n-legend">${items.map(([k, ar, en]) => `<li><i class="n-sw sw-${k}"></i>${ctx.t(ar, en)}</li>`).join("")}</ul>`;
  }
  function deptChoice(ctx) {
    return `<fieldset class="n-depts"><legend>${ctx.t("أي قسم؟", "Which department?")}</legend>
      ${["mobile", "ai", "cyber", "web"].map((k) => `<label class="n-dchip"><input type="radio" name="n-dept-${ctx.scope}" ${k === "mobile" ? "checked" : ""}><span>${ctx.icon(D.departments[k].icon)}${ctx.L(D.departments[k].short)}</span></label>`).join("")}
    </fieldset>`;
  }

  /* ---------- PHONE: home ---------- */
  function home(ctx) {
    const mine = D.requests.filter((r) => r.mine);
    const counts = stageCounts();
    return `<div class="n-screen n-ground">
      ${topbar(ctx, ctx.t("لوحة التحكم", "Dashboard"))}
      <main class="n-body">
        ${yourTurnDoor(ctx, false)}

        <section class="n-sec">
          ${sectionHead(ctx, "طلبات قسمك", "Your department's requests", "الكل", "All")}
          <div class="n-list">${mine.map((r) => reqRow(ctx, r)).join("")}</div>
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "بانتظار فريقك", "Waiting on your team", "افتح", "Open", D.inbox.length)}
          <div class="n-list">${D.inbox.map((it) => {
            const r = D.byId[it.request];
            return `<a class="n-row n-row-tight" href="#">
              <span class="n-plate n-ochre" aria-hidden="true">${ctx.icon(teamIcon[it.team])}</span>
              <span class="n-row-main"><b>${ctx.L(r.title)}</b><span class="n-row-sub">${ctx.L(D.departments[it.team])} · ${ctx.L(it.received)}</span></span>
              ${chev(ctx)}
            </a>`;
          }).join("")}</div>
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "المسار في النادي", "Across the club", "المسار", "Pipeline")}
          <ol class="n-doorways">${D.steps.map((s, i) => `<li><span class="n-dw-count tab">${ctx.n(counts[i])}</span><span class="n-dw-name">${ctx.L(s)}</span></li>`).join("")}</ol>
          <p class="n-note">${ctx.icon("corner-up-left")}${ctx.t("طلب واحد مُعاد للتعديل عند الذكاء الاصطناعي", "One request is back with AI for fixes")}</p>
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "الفعاليات", "Events", "كل الفعاليات", "All events")}
          <div class="n-list">${D.events.filter((e) => e.status !== "draft").map((e) => `<a class="n-row n-row-tight" href="#">
            <span class="n-sq n-${e.status === "active" ? "green" : "indigo"}" aria-hidden="true"></span>
            <span class="n-row-main"><b>${ctx.L(e.title)}</b><span class="n-row-sub">${e.status === "active" ? `<span class="n-green-t">${ctx.t("شغالة الحين", "Running now")}</span> · ${ctx.n(e.attended)} ${ctx.t("حضروا", "attended")}` : `${ctx.L(e.when)} · ${ctx.n(e.responses)} ${ctx.t("تسجيل", "sign-ups")}`}</span></span>
            <span class="n-act">${ctx.L(e.next)}</span>
          </a>`).join("")}</div>
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "يحتاج انتباهك", "Needs your attention", null, null, D.attention.length)}
          <div class="n-list">${D.attention.map((a) => attnRow(ctx, a)).join("")}</div>
        </section>

        <p class="n-stats tab">${ctx.t(`${ctx.n(D.stats.members)} عضو · ${ctx.n(D.stats.verified)} موثّق · ${ctx.n(D.stats.emails24h)} رسالة في ٢٤ ساعة`, `${ctx.n(D.stats.members)} members · ${ctx.n(D.stats.verified)} verified · ${ctx.n(D.stats.emails24h)} emails in 24h`)}</p>
      </main>
      ${bottomNav(ctx, "home")}
    </div>`;
  }
  const attnTone = { red: "madder", yellow: "ochre", blue: "indigo" };
  const attnIcon = { overdue: "clock-alert", certificates: "award", closingSoon: "users" };
  function attnRow(ctx, a) {
    return `<div class="n-row n-row-tight n-attn">
      <span class="n-plate n-${attnTone[a.tone]}" aria-hidden="true">${ctx.icon(attnIcon[a.kind])}</span>
      <span class="n-row-main"><b>${ctx.L(a.title)}</b><span class="n-row-sub">${ctx.L(a.event)} · ${ctx.L(a.detail)}</span></span>
      <a class="n-btn n-btn-line n-btn-sm" href="#">${ctx.L(a.action)}</a>
    </div>`;
  }

  /* ---------- PHONE: book ---------- */
  function book(ctx) {
    return `<div class="n-screen n-ground">
      ${subbar(ctx, ctx.t("احجز موعدًا", "Book dates"), ctx.t("مسار الفعاليات", "Event pipeline"))}
      <main class="n-body">
        <p class="n-hint">${ctx.t("اضغط أول يوم ثم آخر يوم. نحجزها لك ٢٤ ساعة حتى تُكمل الطلب.", "Tap the first day, then the last. We hold them for 24 hours while you fill in the request.")}</p>
        <div class="n-month">
          <button class="n-iconbtn" aria-label="${ctx.t("الشهر السابق", "Previous month")}">${ctx.icon("chevron-left", "flip-rtl")}</button>
          <h2 class="n-display">${ctx.date("2026-10-01", { month: "long", year: "numeric" })}</h2>
          <button class="n-iconbtn" aria-label="${ctx.t("الشهر التالي", "Next month")}">${ctx.icon("chevron-right", "flip-rtl")}</button>
        </div>
        ${calendar(ctx, false)}
        ${legend(ctx)}
        <p class="n-note">${ctx.icon("info")}${ctx.t(`أول يوم يمكنك حجزه هو ${ctx.date("2026-10-13", { day: "numeric", month: "long" })}. ١٨ و٢٥ مغلقة: اختبارات منتصف الفصل، وإجازة رسمية.`, `The first day you can book is ${ctx.date("2026-10-13", { day: "numeric", month: "long" })}. The 18th and 25th are closed: midterms, and an official holiday.`)}</p>
        ${deptChoice(ctx)}
      </main>
      <div class="n-sticky">
        <div class="n-sticky-sum"><b class="n-sum-range">${ctx.range("2026-10-23", "2026-10-24")}</b><span class="n-sum-days">${daysWord(ctx, 2)}</span><span class="n-sum-dept">${ctx.L(D.departments.mobile.short)}</span></div>
        <a class="n-btn n-btn-plate n-ochre" href="#">${ctx.icon("calendar-check")}${ctx.t("احجز", "Book")}</a>
      </div>
    </div>`;
  }

  /* ---------- PHONE: request ---------- */
  function progressSteps(ctx, r) {
    const cur = stepOf(r);
    return `<ol class="n-steps">${D.steps.map((s, i) => {
      const st = r.stage === "published" || i < cur ? "done" : i === cur ? "cur" : "future";
      return `<li class="is-${st}"><svg viewBox="-1 -1 22 20" width="22" height="20" aria-hidden="true"><polygon points="0,18 20,18 10,0.5"/></svg><span>${ctx.L(s)}</span></li>`;
    }).join("")}</ol>`;
  }
  function request(ctx) {
    const r = D.byId.r1;
    const det = r.details;
    return `<div class="n-screen n-ground">
      ${subbar(ctx, ctx.t("طلب فعالية", "Event request"), ctx.t("مسار الفعاليات", "Event pipeline"))}
      <main class="n-body">
        <div class="n-req-head">
          <span class="n-chip">${ctx.icon(D.departments[r.dept].icon)}${ctx.L(D.departments[r.dept])}</span>
          <h1 class="n-display">${ctx.L(r.title)}</h1>
          <p>${ctx.L(r.type)} · ${ctx.range(r.start, r.end, { weekday: "short", day: "numeric", month: "short" })} · ${ctx.t(`بدأه ${ctx.L(r.createdBy)}`, `Started by ${ctx.L(r.createdBy)}`)}</p>
        </div>

        <section class="n-door n-ochre n-door-hold" aria-label="${ctx.t("الأيام محجوزة", "Dates held")}">
          <div class="n-band" aria-hidden="true"></div>
          <div class="n-door-in">
            <div class="n-door-head"><h2 class="n-display">${ctx.t("الأيام محجوزة", "Dates held")}</h2><b class="n-big tab">${ctx.cd(r.holdMs, "hms")}</b></div>
            <p class="n-door-copy">${ctx.t("أكمل بيانات الفعالية والطلبين ثم أرسل قبل انتهاء الحجز.", "Fill in the event and both briefs, then submit before the hold runs out.")}</p>
          </div>
          <div class="n-band" aria-hidden="true"></div>
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "سير الطلب", "Progress")}
          ${progressSteps(ctx, r)}
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "ما الذي بقي", "What is left")}
          <div class="n-list">${r.sections.map((s) => `<a class="n-row n-sect" href="#">
            <span class="n-row-main">
              <span class="n-sect-top"><b>${ctx.L(s)}</b><span class="tab n-frac">${ctx.n(s.done)}/${ctx.n(s.total)}</span></span>
              <span class="n-courses" aria-hidden="true">${Array.from({ length: s.total }, (_, i) => `<i class="${i < s.done ? "on" : ""}"></i>`).join("")}</span>
              <span class="n-missing">${ctx.icon("circle-dashed")}${ctx.t("ناقص:", "Missing:")} <b>${ctx.L(s.missing[0])}</b></span>
            </span>
            ${chev(ctx)}
          </a>`).join("")}</div>
        </section>

        <section class="n-sec">
          ${sectionHead(ctx, "بيانات الفعالية", "Event details", "تعديل", "Edit")}
          <dl class="n-dl">
            <dt>${ctx.t("المقدّم", "Presenter")}</dt><dd>${ctx.L(det.presenter)}</dd>
            <dt>${ctx.t("بريد المقدّم", "Presenter email")}</dt><dd class="n-ochre-t">${ctx.t("مطلوب لأن أحد الأيام عن بُعد", "Required: one day is online")}</dd>
            <dt>${ctx.t("الوقت", "Time")}</dt><dd class="tab">${ctx.L(det.time)}</dd>
            <dt>${ctx.t("الأيام", "Days")}</dt><dd>${det.modes.map((m) => `${ctx.date(m.date, { weekday: "short", day: "numeric" })}: ${m.mode === "online" ? ctx.t("عن بُعد", "Online") : ctx.t("حضوري", "On-site")}`).join(" · ")}</dd>
            <dt>${ctx.t("الفئة", "Audience")}</dt><dd>${ctx.L(det.audience)}</dd>
            <dt>${ctx.t("التسجيل", "Registration")}</dt><dd>${ctx.L(det.registration)} · ${ctx.n(det.expected)} ${ctx.t("مقبول", "accepted")}</dd>
            <dt>${ctx.t("النوع", "Kind")}</dt><dd>${ctx.t("فعالية رسمية", "Official event")}</dd>
          </dl>
        </section>
      </main>
      <div class="n-sticky n-sticky-submit">
        <p>${ctx.icon("list-todo")}<span>${ctx.t("بقيت ٣ أشياء قبل الإرسال", "3 things left before you can submit")}</span></p>
        <div class="n-sticky-btns">
          <a class="n-btn n-btn-line" href="#">${ctx.t("إكمال لاحقًا", "Finish later")}</a>
          <button class="n-btn n-btn-plate n-green" disabled>${ctx.icon("send", "flip-rtl")}${ctx.t("إرسال", "Submit")}</button>
        </div>
      </div>
    </div>`;
  }

  /* ---------- PHONE: inbox ---------- */
  function inboxRow(ctx, it, open) {
    const r = D.byId[it.request];
    const team = D.departments[it.team];
    if (!open) {
      return `<a class="n-row" href="#" data-team="${it.team}">
        <span class="n-plate n-ochre" aria-hidden="true">${ctx.icon(teamIcon[it.team])}</span>
        <span class="n-row-main"><b>${ctx.L(r.title)}</b><span class="n-row-sub">${ctx.L(team)} · ${ctx.L(D.departments[r.dept].short)} · ${ctx.range(r.start, r.end)}</span><span class="n-row-sub">${ctx.t("وصل", "Received")} ${ctx.L(it.received)}</span></span>
        ${chev(ctx)}
      </a>`;
    }
    const b = it.brief;
    return `<article class="n-door n-ochre n-task" data-team="${it.team}">
      <div class="n-band" aria-hidden="true"></div>
      <div class="n-door-in">
        <div class="n-door-head"><span class="n-chip n-chip-on">${ctx.icon(teamIcon[it.team])}${ctx.t("دور التصميم", "Design's turn")}</span><span class="n-hold">${ctx.L(it.received)}</span></div>
        <div class="n-door-panel">
          <h3>${ctx.L(r.title)}</h3>
          <p>${ctx.L(D.departments[r.dept])} · ${ctx.date(r.start, { weekday: "short", day: "numeric", month: "short" })}</p>
          <dl class="n-dl n-dl-tight">
            <dt>${ctx.t("نوع التصميم", "Design type")}</dt><dd>${ctx.L(b.type)}</dd>
            <dt>${ctx.t("المقاس", "Size")}</dt><dd>${ctx.L(b.size)} · ${b.file}</dd>
            <dt>${ctx.t("المحتوى", "Content")}</dt><dd>${ctx.L(b.content)}</dd>
          </dl>
          <p class="n-until">${ctx.icon("corner-up-left")}${ctx.t(`يمكن إعادته حتى ${ctx.date(it.returnUntil, { day: "numeric", month: "long" })}`, `Can be returned until ${ctx.date(it.returnUntil, { day: "numeric", month: "long" })}`)}</p>
        </div>
        <div class="n-task-actions">
          <button class="n-btn n-btn-plate n-green">${ctx.icon("check")}${ctx.t("إنهاء مهمة التصميم", "Mark Design done")}</button>
          <button class="n-btn n-btn-ink-line">${ctx.icon("corner-up-left")}${ctx.t("إعادة مع ملاحظات", "Return with notes")}</button>
        </div>
      </div>
      <div class="n-band" aria-hidden="true"></div>
    </article>`;
  }
  function inbox(ctx) {
    const counts = { design: 1, logistics: 1, media: 1 };
    const seg = [["all", "الكل", "All", 3], ["design", "التصميم", "Design", counts.design], ["logistics", "اللوجستيات", "Logistics", counts.logistics], ["media", "الإعلام", "Media", counts.media]];
    return `<div class="n-screen n-ground">
      ${topbar(ctx, ctx.t("بانتظار فريقك", "Team inbox"))}
      <main class="n-body">
        <div class="n-seg" role="group" aria-label="${ctx.t("الفريق", "Team")}">${seg.map(([k, ar, en, c], i) => `<button data-f="${k}" aria-pressed="${i === 0}">${ctx.t(ar, en)} <span class="tab">${ctx.n(c)}</span></button>`).join("")}</div>
        <div class="n-list n-inbox">${D.inbox.map((it, i) => inboxRow(ctx, it, i === 0)).join("")}</div>

        <section class="n-sec">
          <div class="n-sh"><h2>${ctx.t("الإشعارات", "Notifications")} <span class="n-count tab">${ctx.n(3)}</span></h2><a href="#">${ctx.t("تعليم الكل كمقروء", "Mark all read")}</a></div>
          <ul class="n-notifs">${D.notifications.map((nt) => `<li class="${nt.unread ? "is-unread" : ""}">
            <span class="n-plate n-plate-sm n-${notifRole[nt.kind]}" aria-hidden="true">${ctx.icon(notifIcon[nt.kind])}</span>
            <span class="n-row-main"><span>${ctx.L(nt.text)}</span><span class="n-row-sub">${ctx.L(nt.ago)}</span></span>
            ${nt.unread ? `<i class="n-unread" aria-label="${ctx.t("غير مقروء", "Unread")}"></i>` : ""}
          </li>`).join("")}</ul>
        </section>
      </main>
      ${bottomNav(ctx, "pipeline")}
    </div>`;
  }

  /* ---------- DESKTOP ---------- */
  function desktop(ctx) {
    const counts = stageCounts();
    const navHtml = D.nav.map((g) => `<div class="n-sg"><span class="n-sg-t">${ctx.L(g.group)}</span>${g.items.map((it) => `<a href="#" class="n-sl${it.key === "home" ? " is-on" : ""}"${it.key === "home" ? ' aria-current="page"' : ""}>${ctx.icon(it.icon)}<span>${ctx.L(it)}</span>${it.key === "pipeline" ? `<span class="n-count tab">${ctx.n(3)}</span>` : ""}</a>`).join("")}</div>`).join("");
    const columns = D.steps.map((s, i) => {
      const rs = D.requests.filter((r) => stepOf(r) === i);
      return `<section class="n-col">
        <header><svg viewBox="-1 -1 14 12" width="14" height="12" aria-hidden="true"><polygon points="0,10.5 12,10.5 6,0.5"/></svg><h3>${ctx.L(s)}</h3><span class="tab">${ctx.n(counts[i])}</span></header>
        ${rs.map((r) => {
          const role = roleOf(r);
          const turn = r.whoseTurn === "you" ? ctx.t("دورك", "Your turn") : r.whoseTurn && D.departments[r.whoseTurn] ? ctx.t(`دور ${ctx.L(D.departments[r.whoseTurn].short)}`, `${ctx.L(D.departments[r.whoseTurn].short)}'s turn`) : ctx.t(`فعالية #${ctx.n(r.eventId)}`, `Event #${r.eventId}`);
          return `<a href="#" class="n-card n-card-${role}">
            <span class="n-card-top"><span class="n-sq n-${role}" aria-hidden="true"></span><span class="n-${role}-t">${r.stage === "returned" ? ctx.L(D.stages.returned) : turn}</span>${r.stage === "returned" ? `<b class="tab n-madder-t n-card-clock">${ctx.cd(r.fixMs, "hm")}</b>` : r.stage === "draft" ? `<b class="tab n-ochre-t n-card-clock">${ctx.cd(r.holdMs, "hm")}</b>` : ""}</span>
            <b>${ctx.L(r.title)}</b>
            <span class="n-row-sub">${ctx.L(D.departments[r.dept].short)} · ${ctx.range(r.start, r.end)}</span>
          </a>`;
        }).join("")}
      </section>`;
    }).join("");
    return `<div class="n-desk n-ground">
      <aside class="n-side">
        <div class="n-side-brand">${ctx.logo(26)}<div><b>${ctx.t("GDG القصيم", "GDG Qassim")}</b><span>${ctx.t("لوحة الإدارة", "Admin console")}</span></div></div>
        <nav aria-label="${ctx.t("التنقل", "Navigation")}">${navHtml}</nav>
        <a class="n-btn n-btn-plate n-ochre n-side-book" href="#">${ctx.icon("calendar-plus")}${ctx.t("احجز موعدًا", "Book dates")}</a>
        <div class="n-side-me"><span class="n-avatar">${ctx.t("إب", "IB")}</span><div><b>${ctx.L(D.me.name)}</b><span>${ctx.L(D.me.role)}</span></div></div>
      </aside>
      <div class="n-desk-main">
        <header class="n-dtop">
          <div class="n-shurfa" aria-hidden="true"></div>
          <div class="n-dtop-in">
            <h1 class="n-display">${ctx.t("أهلًا إبراهيم", "Welcome, Ibrahim")}</h1>
            <p class="n-dtop-sum">${ctx.t("فيه فعالية وحدة شغالة الحين، ووحدتان التسجيل فيها مفتوح.", "One event is running right now; two more are open for registration.")}</p>
            <label class="n-search">${ctx.icon("search")}<input placeholder="${ctx.t("ابحث عن فعالية أو عضو أو صفحة…", "Search events, members, pages…")}"><kbd>⌘K</kbd></label>
            <button class="n-iconbtn" aria-label="${ctx.t("الإشعارات، ٣ غير مقروءة", "Notifications, 3 unread")}">${ctx.icon("bell")}<span class="n-badge">${ctx.n(3)}</span></button>
            <span class="n-avatar" aria-label="${ctx.L(D.me.name)}">${ctx.t("إب", "IB")}</span>
          </div>
        </header>

        <div class="n-dgrid">
          <div class="n-d-turn">
            ${yourTurnDoor(ctx, true)}
            <section class="n-panel n-d-inbox">
              ${sectionHead(ctx, "بانتظار فريقك", "Waiting on your team", "افتح الصندوق", "Open inbox", D.inbox.length)}
              <div class="n-list">${D.inbox.map((it) => {
                const r = D.byId[it.request];
                return `<a class="n-row n-row-tight" href="#"><span class="n-plate n-ochre" aria-hidden="true">${ctx.icon(teamIcon[it.team])}</span><span class="n-row-main"><b>${ctx.L(r.title)}</b><span class="n-row-sub">${ctx.L(D.departments[it.team])} · ${ctx.L(it.received)}</span></span>${it.canReturn ? `<span class="n-act">${ctx.t("يُعاد حتى", "Return by")} ${ctx.date(it.returnUntil)}</span>` : ""}</a>`;
              }).join("")}</div>
            </section>
          </div>

          <section class="n-panel n-d-cal">
            <div class="n-sh">
              <h2>${ctx.t("تقويم الحجوزات", "Booking calendar")}</h2>
              <div class="n-month n-month-inline">
                <button class="n-iconbtn" aria-label="${ctx.t("الشهر السابق", "Previous month")}">${ctx.icon("chevron-left", "flip-rtl")}</button>
                <b>${ctx.date("2026-10-01", { month: "long", year: "numeric" })}</b>
                <button class="n-iconbtn" aria-label="${ctx.t("الشهر التالي", "Next month")}">${ctx.icon("chevron-right", "flip-rtl")}</button>
              </div>
            </div>
            ${calendar(ctx, true)}
            <div class="n-cal-foot">
              ${legend(ctx)}
              <div class="n-cal-pick"><span><b class="n-sum-range">${ctx.range("2026-10-23", "2026-10-24")}</b> · <span class="n-sum-days">${daysWord(ctx, 2)}</span> · ${ctx.L(D.departments.mobile.short)}</span><a class="n-btn n-btn-plate n-ochre n-btn-sm" href="#">${ctx.icon("calendar-check")}${ctx.t("احجز", "Book")}</a></div>
            </div>
          </section>

          <section class="n-panel n-d-board">
            ${sectionHead(ctx, "المسار في النادي", "The pipeline, across the club", "افتح المسار", "Open pipeline", D.requests.length)}
            <div class="n-cols">${columns}</div>
          </section>

          <section class="n-panel n-d-events">
            ${sectionHead(ctx, "الفعاليات", "Events", "كل الفعاليات", "All events")}
            <div class="n-list">${D.events.map((e) => {
              const role = e.status === "active" ? "green" : e.status === "open" ? "indigo" : "umber";
              const st = e.status === "active" ? ctx.t("شغالة الحين", "Running now") : e.status === "open" ? ctx.t("التسجيل مفتوح", "Open") : ctx.t("مسودة", "Draft");
              return `<a class="n-row n-row-tight" href="#"><span class="n-sq n-${role}" aria-hidden="true"></span><span class="n-row-main"><b>${ctx.L(e.title)}</b><span class="n-row-sub"><span class="n-${role}-t">${st}</span> · ${ctx.L(e.when)} · ${ctx.L(e.where)}</span></span><span class="n-act">${ctx.L(e.next)}</span></a>`;
            }).join("")}</div>
          </section>

          <section class="n-panel n-d-attn">
            ${sectionHead(ctx, "يحتاج انتباهك", "Needs your attention", null, null, D.attention.length)}
            <div class="n-list">${D.attention.map((a) => attnRow(ctx, a)).join("")}</div>
          </section>

          <section class="n-panel n-d-stats">
            <dl class="n-statl">
              <div><dt>${ctx.t("التسجيل مفتوح", "Open for registration")}</dt><dd class="tab">${ctx.n(D.stats.open)}</dd></div>
              <div><dt>${ctx.t("شغالة الحين", "Running now")}</dt><dd class="tab">${ctx.n(D.stats.live)}</dd></div>
              <div><dt>${ctx.t("الأعضاء", "Members")}</dt><dd class="tab">${ctx.n(D.stats.members)}<small>${ctx.t(`${ctx.n(D.stats.verified)} موثّق · ${ctx.n(D.stats.pending)} بانتظار التوثيق`, `${ctx.n(D.stats.verified)} verified · ${ctx.n(D.stats.pending)} pending`)}</small></dd></div>
              <div><dt>${ctx.t("الرسائل المرسلة (٢٤ ساعة)", "Emails sent (24h)")}</dt><dd class="tab">${ctx.n(D.stats.emails24h)}</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>`;
  }

  /* ---------- interactions ---------- */
  function after(root, ctx) {
    // Calendar: tap a first day then a last day.
    root.querySelectorAll(".d-najdi .n-cal").forEach((cal) => {
      const scope = cal.closest(".dz");
      let start = 23, end = 24;
      cal.addEventListener("click", (e) => {
        const b = e.target.closest("button.n-brick");
        if (!b || b.disabled) return;
        const d = +b.dataset.day;
        if (start && end) { start = d; end = null; } else if (d < start) { start = d; } else { end = d; }
        const a = start, z = end || start;
        cal.querySelectorAll("button.n-brick").forEach((x) => {
          const n = +x.dataset.day;
          const on = n >= a && n <= z;
          x.classList.toggle("is-sel", on);
          x.classList.toggle("is-start", n === a);
          x.classList.toggle("is-end", n === z);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
        const iso = (n) => `2026-10-${String(n).padStart(2, "0")}`;
        scope.querySelectorAll(".n-sum-range").forEach((el) => (el.textContent = ctx.range(iso(a), iso(z))));
        scope.querySelectorAll(".n-sum-days").forEach((el) => (el.textContent = daysWord(ctx, z - a + 1)));
      });
    });
    // Inbox: filter by team.
    root.querySelectorAll(".d-najdi .n-seg").forEach((seg) => {
      const list = seg.parentElement.querySelector(".n-inbox");
      seg.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-f]");
        if (!b) return;
        seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
        list.querySelectorAll("[data-team]").forEach((row) => { row.hidden = b.dataset.f !== "all" && row.dataset.team !== b.dataset.f; });
      });
    });
  }

  /* ---------- CSS ---------- */
  const css = `
.d-najdi {
  --ground: #F3F0E9; --raised: #FBFAF6; --sunk: #EAE4D8; --ink: #3A2A1F; --ink2: #6A5443; --ink3: #8C7360;
  --adobe: #B8916B; --rule: #DCD2C1; --mortar: #DDD3C2; --course: rgba(58, 42, 31, .045);
  --green: #1F6B57; --green-t: #1F6B57; --green-soft: #DCE9E2;
  --ochre: #D39A1C; --ochre-t: #8A5E08; --ochre-soft: #F5E6C4; --on-ochre: #2B1C0C; --ochre-carve: rgba(43, 28, 12, .32);
  --madder: #A63A2B; --madder-t: #A63A2B; --madder-soft: #F2DDD7;
  --indigo: #2B4A7E; --indigo-t: #2B4A7E; --indigo-soft: #DDE3EE;
  --umber: #6A5443; --umber-t: #6A5443;
  --focus: #2B4A7E;
  --sb: var(--ink); --sb-bg: var(--ground);
  --disp: "Reem Kufi", "Tajawal", sans-serif; --ui: "Tajawal", system-ui, sans-serif;
  color: var(--ink); background: var(--ground); font-family: var(--ui); font-size: 15px; line-height: 1.5;
  -webkit-font-smoothing: antialiased; scrollbar-color: var(--adobe) transparent;
}
.d-najdi[data-theme="dark"] {
  --ground: #1B1612; --raised: #241D18; --sunk: #15110E; --ink: #EFE6D8; --ink2: #BBA892; --ink3: #8F7C68;
  --adobe: #8A6E52; --rule: #3A2F26; --mortar: #0F0C0A; --course: rgba(239, 230, 216, .035);
  --green: #2C7A63; --green-t: #74C6A9; --green-soft: #1E3029;
  --ochre: #E0A93A; --ochre-t: #EBBE62; --ochre-soft: #3A2D16; --on-ochre: #241608; --ochre-carve: rgba(36, 22, 8, .38);
  --madder: #B5473A; --madder-t: #EE8B7A; --madder-soft: #3A211C;
  --indigo: #3D62A6; --indigo-t: #9DB7EA; --indigo-soft: #1F2638;
  --umber: #8F7C68; --umber-t: #BBA892;
  --focus: #9DB7EA;
}
.d-najdi ::selection { background: var(--ochre-soft); color: var(--ink); }
.d-najdi *, .d-najdi *::before, .d-najdi *::after { box-sizing: border-box; }
.d-najdi a { color: inherit; text-decoration: none; }
.d-najdi button { font: inherit; color: inherit; }
.d-najdi h1, .d-najdi h2, .d-najdi h3, .d-najdi p, .d-najdi dl, .d-najdi dd, .d-najdi ol, .d-najdi ul { margin: 0; }
.d-najdi ol, .d-najdi ul { padding: 0; list-style: none; }
.d-najdi .tab { font-variant-numeric: tabular-nums; }
.d-najdi svg.lucide { width: 18px; height: 18px; stroke-width: 1.75; flex: none; }
.d-najdi [dir="rtl"] .flip-ltr, .d-najdi[dir="rtl"] .flip-ltr { transform: none; }
.d-najdi[dir="ltr"] .flip-ltr { transform: scaleX(-1); }
.d-najdi[dir="rtl"] .flip-rtl-rev { transform: none; }
.d-najdi[dir="ltr"] .flip-rtl-rev { transform: scaleX(-1); }
.d-najdi :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 3px; }
.d-najdi .n-display { font-family: var(--disp); font-weight: 600; letter-spacing: 0; }

/* the wall: faint plaster courses on the 32px rhythm (4 × 8px) */
.d-najdi .n-ground { background-color: var(--ground); background-image: linear-gradient(to bottom, transparent 31px, var(--course) 31px); background-size: 100% 32px; }
.d-najdi .n-screen { display: flex; flex-direction: column; min-height: 100%; }
.d-najdi .n-body { flex: 1; display: flex; flex-direction: column; gap: 24px; padding: 16px 16px 32px; }

/* header with the shurfa parapet on its top edge */
.d-najdi .n-top { position: sticky; top: 47px; z-index: 30; }
.d-najdi .n-shurfa { height: 14px; background: var(--raised); -webkit-mask: ${SHURFA} repeat-x 0 100% / 28px 14px; mask: ${SHURFA} repeat-x 0 100% / 28px 14px; }
.d-najdi .n-top-in { display: flex; align-items: center; gap: 8px; padding: 6px 16px 10px; background: var(--raised); border-bottom: 1px solid var(--rule); }
.d-najdi .n-brand { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.d-najdi .n-brand b { display: block; font-family: var(--disp); font-weight: 600; font-size: 19px; line-height: 1.2; }
.d-najdi .n-brand span { display: block; font-size: 12.5px; color: var(--ink2); }
.d-najdi .n-iconbtn { position: relative; width: 44px; height: 44px; display: inline-grid; place-items: center; border: 0; background: transparent; border-radius: 4px; cursor: pointer; color: var(--ink); }
.d-najdi .n-iconbtn:hover { background: var(--sunk); }
.d-najdi .n-iconbtn:active { background: var(--rule); }
.d-najdi .n-badge { position: absolute; top: 3px; inset-inline-end: 1px; min-width: 17px; height: 17px; padding: 0 4px; box-shadow: 0 0 0 2px var(--raised); border-radius: 3px; background: var(--madder); color: #fff; font-size: 11px; font-weight: 700; line-height: 17px; text-align: center; }
.d-najdi .n-avatar { width: 36px; height: 36px; flex: none; display: grid; place-items: center; border-radius: 4px; background: var(--ink); color: var(--ground); font-weight: 800; font-size: 13.5px; letter-spacing: .02em; }

/* door plates: the only places colour lives */
.d-najdi .n-ochre { background: var(--ochre); color: var(--on-ochre); }
.d-najdi .n-green { background: var(--green); color: #fff; }
.d-najdi .n-madder { background: var(--madder); color: #fff; }
.d-najdi .n-indigo { background: var(--indigo); color: #fff; }
.d-najdi .n-umber { background: var(--umber); color: var(--ground); }
.d-najdi .n-green-t { color: var(--green-t); } .d-najdi .n-ochre-t { color: var(--ochre-t); }
.d-najdi .n-madder-t { color: var(--madder-t); } .d-najdi .n-indigo-t { color: var(--indigo-t); } .d-najdi .n-umber-t { color: var(--umber-t); }
.d-najdi .n-plate { width: 40px; height: 44px; flex: none; display: grid; place-items: center; border-radius: 4px 4px 2px 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08), inset 0 -3px 0 rgba(0,0,0,.12); }
.d-najdi .n-plate-sm { width: 32px; height: 36px; }
.d-najdi .n-plate-sm svg.lucide { width: 16px; height: 16px; }
.d-najdi .n-sq { width: 10px; height: 10px; flex: none; border-radius: 1px; }

.d-najdi .n-door { border-radius: 6px; overflow: hidden; box-shadow: 0 1px 0 rgba(0,0,0,.06), 0 10px 24px -14px rgba(58, 42, 31, .55); }
.d-najdi .n-band { height: 10px; background: var(--ochre-carve); -webkit-mask: ${BAND} repeat-x 0 0 / 16px 10px; mask: ${BAND} repeat-x 0 0 / 16px 10px; }
.d-najdi .n-door > .n-band:first-child { margin-top: 8px; }
.d-najdi .n-door > .n-band:last-child { margin-bottom: 8px; transform: scaleY(-1); }
.d-najdi .n-door-in { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.d-najdi .n-door-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.d-najdi .n-door-head h2 { font-size: 21px; line-height: 1.2; }
.d-najdi .n-hold { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; }
.d-najdi .n-hold svg.lucide { width: 15px; height: 15px; }
.d-najdi .n-hold b { font-weight: 800; font-size: 14px; }
.d-najdi .n-door-panel { background: rgba(255, 252, 243, .9); color: #3A2A1F; border-radius: 3px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; box-shadow: inset 0 0 0 1px rgba(43,28,12,.18); }
.d-najdi[data-theme="dark"] .n-door-panel { background: rgba(36, 22, 8, .82); color: #F5E8CF; box-shadow: inset 0 0 0 1px rgba(255,235,200,.12); }
.d-najdi .n-door-panel h3 { font-size: 19px; font-weight: 800; line-height: 1.3; }
.d-najdi .n-door-panel > p { font-size: 13.5px; opacity: .8; }
.d-najdi .n-door-prog { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: 13px; font-weight: 700; }
.d-najdi .n-door-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.d-najdi .n-door-foot span { font-size: 13.5px; font-weight: 700; }
.d-najdi .n-door-copy { font-size: 14px; font-weight: 500; }
.d-najdi .n-big { font-size: 24px; font-weight: 800; letter-spacing: .02em; }
.d-najdi .n-door-missing { display: grid; gap: 6px; margin-top: 8px; padding-top: 10px; border-top: 1px solid rgba(43,28,12,.18); }
.d-najdi[data-theme="dark"] .n-door-missing { border-top-color: rgba(255,235,200,.14); }
.d-najdi .n-door-missing li { display: flex; justify-content: space-between; gap: 8px; font-size: 13.5px; }
.d-najdi .n-door-missing b { font-weight: 700; color: #8A5E08; }
.d-najdi[data-theme="dark"] .n-door-missing b { color: #EBBE62; }

/* tarma progress */
.d-najdi .n-tarma { flex: none; overflow: visible; }
.d-najdi .n-tarma polygon { stroke-width: 1.4; stroke-linejoin: round; }
.d-najdi .t-done { fill: var(--green); stroke: var(--green); }
.d-najdi .t-future { fill: none; stroke: var(--adobe); opacity: .75; }
.d-najdi .t-returned { fill: var(--madder); stroke: var(--madder); }
.d-najdi .t-cur { fill: none; stroke-width: 2; }
.d-najdi .t-cur.t-ochre { stroke: var(--ochre-t); } .d-najdi .t-cur.t-indigo { stroke: var(--indigo-t); }
.d-najdi .t-cur.t-green { stroke: var(--green-t); }
.d-najdi .n-door .t-future { stroke: currentColor; opacity: .45; }
.d-najdi .n-door .t-cur.t-ochre { stroke: currentColor; fill: rgba(211,154,28,.45); }

/* buttons */
.d-najdi .n-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 4px; border: 0; font-weight: 700; font-size: 15px; cursor: pointer; white-space: nowrap; transition: transform .12s ease-out, box-shadow .12s ease-out, background-color .12s; }
.d-najdi .n-btn:active { transform: translateY(1px); }
.d-najdi .n-btn-sm { min-height: 36px; padding: 0 12px; font-size: 13.5px; }
.d-najdi .n-btn-ink { background: var(--on-ochre); color: #F8E9C9; }
.d-najdi .n-btn-ink:hover { background: #4A3216; }
.d-najdi .n-btn-plate { box-shadow: inset 0 0 0 1px rgba(0,0,0,.1), inset 0 -3px 0 rgba(0,0,0,.16); }
.d-najdi .n-btn-plate:hover { filter: brightness(1.05); }
.d-najdi .n-btn-plate:disabled { background: var(--sunk); color: var(--ink3); box-shadow: inset 0 0 0 1px var(--rule); cursor: not-allowed; transform: none; filter: none; }
.d-najdi .n-btn-line { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1px var(--adobe); }
.d-najdi .n-btn-line:hover { background: var(--sunk); }
.d-najdi .n-btn-ink-line { background: transparent; color: inherit; box-shadow: inset 0 0 0 1px currentColor; }
.d-najdi .n-btn-ink-line:hover { background: rgba(43,28,12,.08); }

/* sections + rows */
.d-najdi .n-sec { display: flex; flex-direction: column; gap: 8px; }
.d-najdi .n-sh { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--ink); }
.d-najdi .n-sh h2 { font-size: 16px; font-weight: 800; line-height: 1.3; display: inline-flex; align-items: center; gap: 8px; }
.d-najdi .n-sh a { font-size: 13.5px; font-weight: 700; color: var(--indigo-t); min-height: 32px; display: inline-flex; align-items: center; }
.d-najdi .n-sh a:hover { text-decoration: underline; text-underline-offset: 3px; }
.d-najdi .n-count { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 3px; background: var(--ink); color: var(--ground); font-size: 12.5px; font-weight: 700; display: inline-grid; place-items: center; }
.d-najdi .n-list { display: flex; flex-direction: column; }
.d-najdi .n-row { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid var(--rule); min-height: 64px; transition: background-color .12s; }
.d-najdi a.n-row:hover { background: var(--raised); }
.d-najdi a.n-row:active { background: var(--sunk); }
.d-najdi .n-row-tight { min-height: 56px; padding: 8px 4px; }
.d-najdi .n-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.d-najdi .n-row-main > b { font-weight: 700; font-size: 15px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-najdi .n-row-sub { font-size: 13px; color: var(--ink2); }
.d-najdi .n-row-prog { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 12.5px; font-weight: 700; flex-wrap: wrap; }
.d-najdi .n-clock { display: inline-flex; align-items: center; gap: 4px; margin-inline-start: auto; font-weight: 700; }
.d-najdi .n-clock svg.lucide { width: 14px; height: 14px; }
.d-najdi .n-chev { color: var(--ink3); width: 18px; height: 18px; }
.d-najdi .n-act { font-size: 12.5px; font-weight: 700; color: var(--ink2); white-space: nowrap; }
.d-najdi .n-attn .n-btn { flex: none; }
.d-najdi .n-note { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--ink2); }
.d-najdi .n-note svg.lucide { width: 16px; height: 16px; margin-top: 2px; }
.d-najdi .n-stats { font-size: 12.5px; color: var(--ink3); text-align: center; }

/* club pipeline as a row of doorways */
.d-najdi .n-doorways { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; background: var(--mortar); padding: 4px; border-radius: 4px; }
.d-najdi .n-doorways li { background: var(--raised); border-radius: 2px; padding: 8px 4px 8px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; min-height: 72px; }
.d-najdi .n-dw-count { font-size: 21px; font-weight: 800; line-height: 1.1; }
.d-najdi .n-dw-name { font-size: 11.5px; font-weight: 500; color: var(--ink2); line-height: 1.25; }
.d-najdi .n-doorways li:nth-child(2) .n-dw-count { color: var(--indigo-t); }
.d-najdi .n-doorways li:first-child .n-dw-count, .d-najdi .n-doorways li:nth-child(4) .n-dw-count { color: var(--ochre-t); }
.d-najdi .n-doorways li:last-child .n-dw-count { color: var(--green-t); }

/* phone bottom nav */
.d-najdi .n-nav { position: sticky; bottom: 0; z-index: 30; display: grid; grid-template-columns: repeat(5, 1fr); align-items: end; padding: 6px 4px 28px; background: var(--raised); border-top: 1px solid var(--ink); }
.d-najdi .n-nav-it { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 48px; justify-content: center; font-size: 11.5px; font-weight: 500; color: var(--ink2); position: relative; }
.d-najdi .n-nav-it svg.lucide { width: 21px; height: 21px; }
.d-najdi .n-nav-it.is-on { color: var(--ink); font-weight: 800; }
.d-najdi .n-nav-it.is-on::before { content: ""; position: absolute; top: -7px; width: 28px; height: 3px; background: var(--ink); border-radius: 0 0 2px 2px; }
.d-najdi .n-nav-it:hover { color: var(--ink); }
.d-najdi .n-nav-book { display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 11.5px; font-weight: 800; margin-top: -18px; }
.d-najdi .n-nav-book .n-plate { width: 56px; height: 52px; border-radius: 6px 6px 3px 3px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.1), inset 0 -4px 0 rgba(0,0,0,.18), 0 6px 14px -6px rgba(140, 94, 8, .7); }
.d-najdi .n-nav-book .n-plate svg.lucide { width: 24px; height: 24px; }
.d-najdi .n-nav-book:active .n-plate { transform: translateY(1px); }

/* calendar: a brick course with visible mortar */
.d-najdi .n-month { display: flex; align-items: center; justify-content: space-between; }
.d-najdi .n-month h2 { font-size: 21px; }
.d-najdi .n-month-inline { gap: 4px; }
.d-najdi .n-month-inline b { font-size: 15px; min-width: 120px; text-align: center; }
.d-najdi .n-cal-head { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 0 4px 4px; }
.d-najdi .n-wd { text-align: center; font-size: 12px; font-weight: 700; color: var(--ink2); }
.d-najdi .n-course { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 4px; background: var(--mortar); border-radius: 4px; }
.d-najdi .n-brick { position: relative; height: 48px; border: 0; border-radius: 2px; background: var(--raised); color: var(--ink); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; cursor: pointer; padding: 0; transition: background-color .12s, transform .12s; box-shadow: inset 0 -2px 0 rgba(58,42,31,.08); }
.d-najdi .n-brick b { font-size: 15px; font-weight: 700; line-height: 1; }
.d-najdi .n-brick small { font-size: 11px; font-weight: 500; line-height: 1.2; max-width: 100%; padding: 0 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.d-najdi button.n-brick:not(:disabled):hover { background: var(--ochre-soft); }
.d-najdi .n-brick.s-blank { background: transparent; box-shadow: none; }
.d-najdi .n-brick.s-locked { background: var(--sunk); color: var(--ink3); cursor: not-allowed; box-shadow: none; }
.d-najdi .n-brick.s-locked b { font-weight: 400; }
.d-najdi .n-brick.s-banned { background: var(--madder-soft); color: var(--madder-t); cursor: not-allowed; }
.d-najdi .n-brick.s-banned b { text-decoration: line-through; text-decoration-thickness: 1px; }
.d-najdi .n-x { position: absolute; inset-inline-end: 4px; top: 4px; width: 6px; height: 6px; background: var(--madder); border-radius: 1px; }
.d-najdi .n-brick.s-held { background: var(--ochre-soft); color: var(--ochre-t); box-shadow: inset 0 0 0 1.5px var(--ochre); }
.d-najdi .n-brick.s-booked { background: var(--indigo); color: #fff; }
.d-najdi .n-brick.s-published { background: var(--green); color: #fff; }
.d-najdi button.n-brick.s-booked:hover, .d-najdi button.n-brick.s-published:hover { filter: brightness(1.08); background: revert-layer; }
.d-najdi button.n-brick.s-booked:hover { background: var(--indigo); } .d-najdi button.n-brick.s-published:hover { background: var(--green); }
.d-najdi button.n-brick.s-held:hover { background: var(--ochre-soft); }
.d-najdi .n-brick.is-sel { background: var(--ochre) !important; color: var(--on-ochre) !important; box-shadow: inset 0 -3px 0 rgba(0,0,0,.18); }
.d-najdi .n-brick.is-start::after, .d-najdi .n-brick.is-end::after { content: ""; position: absolute; bottom: 5px; width: 14px; height: 2px; background: var(--on-ochre); border-radius: 1px; }
.d-najdi .n-brick.is-today { box-shadow: inset 0 0 0 2px var(--ink); }
.d-najdi .n-cal-desk .n-brick { height: 82px; align-items: flex-start; justify-content: space-between; padding: 8px 8px 6px; }
.d-najdi .n-cal-desk .n-brick small { padding: 0; }
.d-najdi .n-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12.5px; color: var(--ink2); }
.d-najdi .n-legend li { display: inline-flex; align-items: center; gap: 6px; }
.d-najdi .n-sw { width: 16px; height: 12px; border-radius: 1px; display: inline-block; background: var(--raised); box-shadow: inset 0 0 0 1px var(--rule); }
.d-najdi .sw-locked { background: var(--sunk); } .d-najdi .sw-banned { background: var(--madder-soft); box-shadow: inset 0 0 0 1px var(--madder-t); }
.d-najdi .sw-held { background: var(--ochre-soft); box-shadow: inset 0 0 0 1.5px var(--ochre); } .d-najdi .sw-booked { background: var(--indigo); box-shadow: none; }
.d-najdi .sw-published { background: var(--green); box-shadow: none; } .d-najdi .sw-sel { background: var(--ochre); box-shadow: none; }
.d-najdi .n-hint { font-size: 14px; color: var(--ink2); }

/* department choice */
.d-najdi .n-depts { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.d-najdi .n-depts legend { font-size: 16px; font-weight: 800; padding: 0 0 8px; width: 100%; border-bottom: 1px solid var(--ink); margin-bottom: 4px; }
.d-najdi .n-dchip input { position: absolute; opacity: 0; pointer-events: none; }
.d-najdi .n-dchip span { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 14px; border-radius: 4px; background: var(--raised); box-shadow: inset 0 0 0 1px var(--rule); font-weight: 700; font-size: 14px; cursor: pointer; }
.d-najdi .n-dchip span svg.lucide { width: 16px; height: 16px; }
.d-najdi .n-dchip input:checked + span { background: var(--ink); color: var(--ground); box-shadow: none; }
.d-najdi .n-dchip input:focus-visible + span { outline: 2px solid var(--focus); outline-offset: 2px; }

/* sticky action bars */
.d-najdi .n-sticky { position: sticky; bottom: 0; z-index: 30; display: flex; align-items: center; gap: 12px; padding: 12px 16px 32px; background: var(--raised); border-top: 1px solid var(--ink); }
.d-najdi .n-sticky-sum { flex: 1; display: flex; flex-direction: column; line-height: 1.3; }
.d-najdi .n-sticky-sum b { font-size: 17px; font-weight: 800; }
.d-najdi .n-sticky-sum span { font-size: 13px; color: var(--ink2); }
.d-najdi .n-sticky .n-btn-plate { min-width: 128px; min-height: 48px; font-size: 16px; }
.d-najdi .n-sticky-submit { flex-direction: column; align-items: stretch; gap: 10px; }
.d-najdi .n-sticky-submit p { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--ochre-t); }
.d-najdi .n-sticky-btns { display: grid; grid-template-columns: 1fr 1.3fr; gap: 8px; }

/* request */
.d-najdi .n-req-head { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.d-najdi .n-req-head h1 { font-size: 26px; line-height: 1.25; }
.d-najdi .n-req-head p { font-size: 13.5px; color: var(--ink2); }
.d-najdi .n-chip { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 3px; background: var(--sunk); font-size: 13px; font-weight: 700; }
.d-najdi .n-chip svg.lucide { width: 15px; height: 15px; }
.d-najdi .n-chip-on { background: var(--on-ochre); color: #F8E9C9; }
.d-najdi .n-steps { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; position: relative; }
.d-najdi .n-steps li { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; font-size: 11.5px; line-height: 1.3; color: var(--ink2); font-weight: 500; }
.d-najdi .n-steps li polygon { stroke-width: 1.6; stroke-linejoin: round; fill: none; stroke: var(--adobe); }
.d-najdi .n-steps li.is-done polygon { fill: var(--green); stroke: var(--green); }
.d-najdi .n-steps li.is-cur polygon { stroke: var(--ochre); fill: var(--ochre-soft); stroke-width: 2.2; }
.d-najdi .n-steps li.is-cur { color: var(--ink); font-weight: 800; }
.d-najdi .n-sect { align-items: center; }
.d-najdi .n-sect-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.d-najdi .n-sect-top b { font-weight: 700; }
.d-najdi .n-frac { font-size: 13px; font-weight: 700; color: var(--ink2); }
.d-najdi .n-courses { display: flex; gap: 2px; margin: 6px 0 4px; }
.d-najdi .n-courses i { flex: 1; height: 8px; border-radius: 1px; background: var(--sunk); box-shadow: inset 0 0 0 1px var(--rule); }
.d-najdi .n-courses i.on { background: var(--green); box-shadow: none; }
.d-najdi .n-missing { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ochre-t); }
.d-najdi .n-missing svg.lucide { width: 14px; height: 14px; }
.d-najdi .n-dl { display: grid; grid-template-columns: max-content 1fr; gap: 0; font-size: 14px; }
.d-najdi .n-dl dt, .d-najdi .n-dl dd { padding: 8px 0; border-bottom: 1px solid var(--rule); }
.d-najdi .n-dl dt { color: var(--ink2); padding-inline-end: 16px; }
.d-najdi .n-dl dd { font-weight: 500; }
.d-najdi .n-dl-tight { font-size: 13px; margin-top: 6px; }
.d-najdi .n-dl-tight dt, .d-najdi .n-dl-tight dd { padding-block: 5px; border-color: rgba(43,28,12,.14); }
.d-najdi .n-dl-tight dt { color: inherit; opacity: .75; }
.d-najdi[data-theme="dark"] .n-dl-tight dt, .d-najdi[data-theme="dark"] .n-dl-tight dd { border-color: rgba(255,235,200,.12); }

/* inbox */
.d-najdi .n-seg { display: grid; grid-template-columns: repeat(4, auto); gap: 4px; padding: 4px; background: var(--mortar); border-radius: 4px; overflow-x: auto; }
.d-najdi .n-seg button { min-height: 40px; border: 0; border-radius: 2px; background: var(--raised); font-size: 13px; font-weight: 700; color: var(--ink2); cursor: pointer; padding: 0 10px; white-space: nowrap; }
.d-najdi .n-seg button span { color: var(--ink3); }
.d-najdi .n-seg button[aria-pressed="true"] { background: var(--ink); color: var(--ground); }
.d-najdi .n-seg button[aria-pressed="true"] span { color: inherit; opacity: .7; }
.d-najdi .n-inbox { gap: 0; }
.d-najdi .n-task { margin-bottom: 8px; }
.d-najdi .n-until { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; margin-top: 8px; }
.d-najdi .n-until svg.lucide { width: 15px; height: 15px; }
.d-najdi .n-task-actions { display: grid; gap: 8px; }
.d-najdi .n-task-actions .n-btn { width: 100%; min-height: 48px; }
.d-najdi .n-notifs li { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid var(--rule); font-size: 14px; line-height: 1.4; }
.d-najdi .n-notifs li.is-unread { font-weight: 700; }
.d-najdi .n-notifs li:not(.is-unread) .n-plate { opacity: .55; }
.d-najdi .n-unread { width: 8px; height: 8px; border-radius: 1px; background: var(--ochre); flex: none; }

/* ---------- desktop ---------- */
.d-najdi .n-desk { display: grid; grid-template-columns: 256px minmax(0, 1fr); min-height: 900px; }
.d-najdi .n-side { position: sticky; top: 0; height: 900px; display: flex; flex-direction: column; gap: 16px; padding: 20px 16px 16px; background: var(--raised); border-inline-end: 1px solid var(--rule); }
.d-najdi .n-side-brand { display: flex; align-items: center; gap: 12px; padding: 0 8px; }
.d-najdi .n-side-brand b { display: block; font-family: var(--disp); font-weight: 600; font-size: 19px; line-height: 1.2; }
.d-najdi .n-side-brand span { display: block; font-size: 12.5px; color: var(--ink2); }
.d-najdi .n-side nav { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.d-najdi .n-sg { display: flex; flex-direction: column; gap: 2px; }
.d-najdi .n-sg-t { font-size: 12px; font-weight: 700; color: var(--ink3); padding: 0 12px 4px; }
.d-najdi .n-sl { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 12px; border-radius: 4px; font-size: 14.5px; font-weight: 500; color: var(--ink2); }
.d-najdi .n-sl:hover { background: var(--sunk); color: var(--ink); }
.d-najdi .n-sl.is-on { background: var(--ink); color: var(--ground); font-weight: 700; }
.d-najdi .n-sl span:not(.n-count) { flex: 1; }
.d-najdi .n-sl .n-count { background: var(--ochre); color: var(--on-ochre); }
.d-najdi .n-side-book { width: 100%; min-height: 48px; }
.d-najdi .n-side-me { display: flex; align-items: center; gap: 10px; padding: 12px 8px 0; border-top: 1px solid var(--rule); }
.d-najdi .n-side-me b { display: block; font-size: 14px; }
.d-najdi .n-side-me span { display: block; font-size: 12px; color: var(--ink2); line-height: 1.35; }
.d-najdi .n-desk-main { min-width: 0; }
.d-najdi .n-dtop { position: sticky; top: 0; z-index: 20; }
.d-najdi .n-dtop .n-shurfa { height: 16px; -webkit-mask-size: 32px 16px; mask-size: 32px 16px; }
.d-najdi .n-dtop-in { display: flex; align-items: center; gap: 16px; padding: 8px 32px 14px; background: var(--raised); border-bottom: 1px solid var(--rule); }
.d-najdi .n-dtop h1 { font-size: 24px; line-height: 1.2; white-space: nowrap; }
.d-najdi .n-dtop-sum { flex: 1; font-size: 14px; color: var(--ink2); min-width: 0; }
.d-najdi .n-search { display: flex; align-items: center; gap: 8px; width: 340px; height: 40px; padding: 0 12px; border-radius: 4px; background: var(--ground); box-shadow: inset 0 0 0 1px var(--rule); color: var(--ink2); }
.d-najdi .n-search:focus-within { box-shadow: inset 0 0 0 1.5px var(--ink); }
.d-najdi .n-search input { flex: 1; border: 0; background: transparent; font: inherit; font-size: 14px; color: var(--ink); outline: none; min-width: 0; }
.d-najdi .n-search input::placeholder { color: var(--ink3); }
.d-najdi .n-search kbd { font: 700 11.5px var(--ui); padding: 2px 6px; border-radius: 3px; box-shadow: inset 0 0 0 1px var(--rule); direction: ltr; }
.d-najdi .n-dgrid { display: grid; grid-template-columns: 392px minmax(0, 1fr); gap: 24px; padding: 24px 32px 40px; }
.d-najdi .n-panel { background: var(--raised); border-radius: 6px; box-shadow: inset 0 0 0 1px var(--rule); padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 12px; }
.d-najdi .n-d-turn { display: flex; flex-direction: column; gap: 24px; grid-row: span 1; }
.d-najdi .n-d-inbox { padding-bottom: 8px; }
.d-najdi .n-d-inbox .n-row:last-child { border-bottom: 0; }
.d-najdi .n-d-cal { gap: 12px; }
.d-najdi .n-cal-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.d-najdi .n-cal-foot .n-legend { flex: 1; }
.d-najdi .n-cal-pick { display: flex; align-items: center; gap: 12px; font-size: 13.5px; color: var(--ink2); white-space: nowrap; }
.d-najdi .n-cal-pick b { color: var(--ink); font-weight: 800; }
.d-najdi .n-d-board { grid-column: 1 / -1; }
.d-najdi .n-cols { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; background: var(--mortar); padding: 4px; border-radius: 4px; }
.d-najdi .n-col { background: var(--ground); border-radius: 2px; padding: 10px; display: flex; flex-direction: column; gap: 8px; min-height: 148px; }
.d-najdi .n-col header { display: flex; align-items: center; gap: 8px; font-size: 13px; padding-bottom: 6px; border-bottom: 1px solid var(--rule); }
.d-najdi .n-col header h3 { flex: 1; font-size: 13.5px; font-weight: 800; }
.d-najdi .n-col header span { font-weight: 700; color: var(--ink2); }
.d-najdi .n-col header polygon { fill: none; stroke: var(--adobe); stroke-width: 1.4; }
.d-najdi .n-col:last-child header polygon { fill: var(--green); stroke: var(--green); }
.d-najdi .n-card { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 4px; background: var(--raised); box-shadow: inset 0 0 0 1px var(--rule), 0 1px 0 rgba(58,42,31,.06); transition: box-shadow .12s, transform .12s; }
.d-najdi .n-card:hover { box-shadow: inset 0 0 0 1px var(--adobe), 0 6px 14px -10px rgba(58,42,31,.5); }
.d-najdi .n-card > b { font-size: 14px; font-weight: 700; line-height: 1.35; }
.d-najdi .n-card-top { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; }
.d-najdi .n-card-clock { margin-inline-start: auto; font-size: 12.5px; }
.d-najdi .n-card-madder { box-shadow: inset 0 0 0 1px var(--madder-t); background: var(--madder-soft); }
.d-najdi .n-card-ochre { box-shadow: inset 0 0 0 1.5px var(--ochre); }
.d-najdi .n-d-events, .d-najdi .n-d-attn { grid-column: auto; }
.d-najdi .n-dgrid > .n-d-events { grid-column: 1 / 2; }
.d-najdi .n-d-stats { grid-column: 1 / -1; padding: 0; }
.d-najdi .n-statl { display: grid; grid-template-columns: repeat(4, 1fr); }
.d-najdi .n-statl > div { padding: 14px 20px; border-inline-end: 1px solid var(--rule); }
.d-najdi .n-statl > div:last-child { border-inline-end: 0; }
.d-najdi .n-statl dt { font-size: 13px; color: var(--ink2); font-weight: 500; }
.d-najdi .n-statl dd { font-size: 21px; font-weight: 800; display: flex; align-items: baseline; gap: 10px; }
.d-najdi .n-statl dd small { font-size: 12.5px; font-weight: 500; color: var(--ink2); }
.d-najdi .n-door-big .n-door-panel h3 { font-size: 21px; }
`;

  (window.GDG_DESIGNS = window.GDG_DESIGNS || []).push({
    id: "najdi",
    order: 1,
    meta: {
      name: { ar: "الطين والأبواب", en: "Mud & Doors" },
      tagline: { ar: "جدران الجص وأبواب نجد الملوّنة", en: "Limewash walls, painted Najdi doors" },
      thesis: {
        ar: "اللوحة كبيت نجدي في القصيم: جدران الجص هادئة، واللون يعيش فقط على الأبواب الخشبية الملوّنة، وكل باب شيء تفتحه: دورك، طلب، صندوق فريق، يوم في التقويم. فتحات الطرمة المثلثة تبيّن وين وصل الطلب، والشُّرفات المدرّجة تعلو الترويسة، والتقويم مداميك طوب.",
        en: "The console as a Najdi house in Qassim: calm limewash walls, and colour only on the painted wooden doors, where every door is something you open: your turn, a request, a team inbox, a day. Triangular tarma openings show how far a request has come, the stepped shurfa parapet tops the header, and the booking calendar is a course of bricks.",
      },
      type: { ar: "Reem Kufi للعناوين فقط (هندسة كوفية مثل نقش الأبواب)، وTajawal لكل الواجهة بالعربي والإنجليزي. الأهمية بالوزن لا بالحجم.", en: "Reem Kufi for display headings only (kufic geometry like door carving); Tajawal for all UI in both scripts. Rank by weight, not size." },
      nav: { ar: "شريط سفلي (الرئيسية، المسار، الفعاليات، المزيد) وفي وسطه باب «احجز موعدًا» بالمغرة. على سطح المكتب قائمة جانبية بنفس المجموعات.", en: "Bottom bar (Home, Pipeline, Events, More) with an ochre “Book dates” door in the middle. On desktop, a sidebar with the same groups." },
      why: { ar: "هذي عمارة القصيم نفسها: اللي يمر عليه الطلاب كل يوم في بريدة وعنيزة، فتحس اللوحة بيت النادي مو قالب جاهز. والأبواب تخلي قاعدة «اللون = الحالة» حرفية: أخضر تم، مغرة ينتظر أحد، أحمر مُعاد، نيلي قيد العمل.", en: "It is Qassim's own architecture, what these students walk past daily in Buraidah and Unaizah, so the console feels like the club's home, not a SaaS template. Door plates make “colour = state” literal: green done, ochre waiting on someone, madder returned, indigo in progress." },
      risk: { ar: "ألوان الطين قريبة من «الكريمي مع الطوبي» اللي تنتهي له أغلب تصاميم الذكاء الاصطناعي. ما ينجح إلا إذا بقيت الأبواب مشبعة وتحمل الحالة، وبقيت الزخارف وظيفية (تقدّم، حواف) لا ورق جدران.", en: "The earth palette sits close to the “warm cream + terracotta” look most AI designs land on. It only works if the door plates stay saturated and carry state, and the heritage geometry stays functional (progress, edges), never wallpaper." },
      palette: [
        { name: { ar: "جص", en: "Limewash" }, hex: "#F3F0E9" },
        { name: { ar: "طين", en: "Mud-brick ink" }, hex: "#3A2A1F" },
        { name: { ar: "لِبن", en: "Adobe" }, hex: "#B8916B" },
        { name: { ar: "باب أخضر", en: "Door green" }, hex: "#1F6B57" },
        { name: { ar: "باب مغرة", en: "Door ochre" }, hex: "#D39A1C" },
        { name: { ar: "باب أحمر", en: "Door madder" }, hex: "#A63A2B" },
        { name: { ar: "باب نيلي", en: "Door indigo" }, hex: "#2B4A7E" },
        { name: { ar: "ليل اللِّبن", en: "Night adobe" }, hex: "#1B1612" },
      ],
      swatch: "#D39A1C",
      raises: [
        { ar: "من شبكة كراوِل: الواجهة على مدماك ٨ بكسل ظاهر، والتقويم صف طوب بفواصل مونة واضحة.", en: "From the Crouwel grid: the layout sits on a visible 8px course, and the booking calendar is a brick course with visible mortar joints." },
        { ar: "من صفحة العمود الأوسط: ثلاث قيم في الهدوء (جص، طين، باب واحد لكل منطقة)، وكل خط بسماكة بكسل واحد.", en: "From the centre-rail page: three values at rest (limewash, mud ink, one door plate per region), every rule one pixel." },
        { ar: "من جدول الرحلات: الأهمية بالوزن والحالة لا بتكبير الخط.", en: "From the timetable rack: rank by weight and case, not by size." },
      ],
      fonts: ["Reem+Kufi:wght@400;500;600;700", "Tajawal:wght@300;400;500;700;800"],
    },
    css,
    phone: { home, book, request, inbox },
    desktop,
    after,
  });
})();
