/*
 * Shared SAMPLE data for every design. Same people, same requests, same
 * calendar in all four, so the designs are compared on design alone.
 * Names, counts and titles are illustrative; the stages, states, rules and
 * copy are the real ones from the app (messages/*.json, pipeline-types.ts).
 */
(function () {
  const H = 3600e3;
  const M = 60e3;

  const departments = {
    mobile: { key: "mobile", ar: "تطوير التطبيقات", en: "Mobile Development", short: { ar: "التطبيقات", en: "Mobile" }, color: "#34A853", icon: "smartphone" },
    ai: { key: "ai", ar: "الذكاء الاصطناعي", en: "Artificial Intelligence", short: { ar: "الذكاء الاصطناعي", en: "AI" }, color: "#4285F4", icon: "brain" },
    cyber: { key: "cyber", ar: "الأمن السيبراني", en: "Cybersecurity", short: { ar: "السيبراني", en: "Cyber" }, color: "#EA4335", icon: "shield" },
    web: { key: "web", ar: "تطوير الويب", en: "Web Development", short: { ar: "الويب", en: "Web" }, color: "#FBBC04", icon: "globe" },
    design: { key: "design", ar: "التصميم", en: "Design", short: { ar: "التصميم", en: "Design" }, color: "#A142F4", icon: "palette" },
    logistics: { key: "logistics", ar: "اللوجستيات", en: "Logistics", short: { ar: "اللوجستيات", en: "Logistics" }, color: "#F29900", icon: "truck" },
    media: { key: "media", ar: "الإعلام", en: "Media", short: { ar: "الإعلام", en: "Media" }, color: "#12B5CB", icon: "megaphone" },
  };

  /** The path every request walks. "returned" is a detour inside step 2. */
  const steps = [
    { key: "draft", ar: "مسودة", en: "Draft", hint: { ar: "الأيام محجوزة ٢٤ ساعة", en: "Dates held for 24 hours" } },
    { key: "in_review", ar: "التصميم واللوجستيات", en: "Design & Logistics", hint: { ar: "الفريقان يعملان معًا", en: "Both teams at once" } },
    { key: "media", ar: "الإعلام", en: "Media", hint: { ar: "التغطية والنشر", en: "Coverage and posts" } },
    { key: "ready", ar: "جاهز للنشر", en: "Ready", hint: { ar: "اختر فئة النقاط", en: "Pick the points tier" } },
    { key: "published", ar: "منشور", en: "Published", hint: { ar: "مسودة في الفعاليات", en: "A draft in Events" } },
  ];

  const stages = {
    draft: { ar: "مسودة", en: "Draft", step: 0 },
    in_review: { ar: "عند التصميم واللوجستيات", en: "With Design & Logistics", step: 1 },
    returned: { ar: "مُعاد للتعديل", en: "Returned", step: 1 },
    media: { ar: "عند الإعلام", en: "With Media", step: 2 },
    ready: { ar: "جاهز للنشر", en: "Ready to publish", step: 3 },
    published: { ar: "منشور", en: "Published", step: 4 },
    cancelled: { ar: "ملغى", en: "Cancelled", step: -1 },
  };

  const taskStatus = {
    brief: { ar: "قيد الكتابة", en: "Being written" },
    open: { ar: "قيد العمل", en: "Working on it" },
    returned: { ar: "مُعاد", en: "Returned" },
    done: { ar: "تم", en: "Done" },
  };

  /**
   * whoseTurn: who has to act next, in words. "you" = the signed-in person's
   * department; a team key = that team.
   * holdMs / fixMs: milliseconds from page load until the clock runs out.
   */
  const requests = [
    {
      id: "r1", dept: "mobile", mine: true, stage: "draft",
      title: { ar: "مقدمة في Flutter", en: "Intro to Flutter" },
      type: { ar: "ورشة عمل", en: "Workshop" },
      start: "2026-10-19", end: "2026-10-20",
      holdMs: 14 * H + 32 * M,
      whoseTurn: "you",
      next: { ar: "أكمل ٣ حقول وأرسل قبل انتهاء الحجز", en: "Fill in 3 fields and submit before the hold ends" },
      sections: [
        { key: "details", ar: "بيانات الفعالية", en: "Event details", done: 13, total: 14, missing: [{ ar: "بريد المقدّم", en: "Presenter email" }] },
        { key: "design", ar: "طلب التصميم", en: "Design brief", done: 5, total: 6, missing: [{ ar: "المحتوى", en: "Content" }] },
        { key: "logistics", ar: "طلب اللوجستيات", en: "Logistics brief", done: 2, total: 3, missing: [{ ar: "المكان", en: "Venue" }] },
      ],
      tasks: [],
      createdBy: { ar: "إبراهيم", en: "Ibrahim" },
      details: {
        presenter: { ar: "نورة العتيبي", en: "Noura Alotaibi" },
        time: { ar: "٦:٠٠ م – ٨:٠٠ م", en: "6:00 – 8:00 PM" },
        modes: [{ date: "2026-10-19", mode: "on_site" }, { date: "2026-10-20", mode: "online" }],
        audience: { ar: "طلاب وطالبات", en: "Male and female students" },
        registration: { ar: "يحتاج قبول", en: "Needs acceptance" },
        expected: 60,
        official: true,
      },
    },
    {
      id: "r7", dept: "mobile", mine: true, stage: "in_review",
      title: { ar: "واجهات Material 3 عمليًا", en: "Material 3 UI, hands-on" },
      type: { ar: "ورشة عمل", en: "Workshop" },
      start: "2026-10-26", end: "2026-10-26",
      whoseTurn: "logistics",
      next: { ar: "بانتظار اللوجستيات · أنهى التصميم دوره", en: "Waiting on Logistics · Design is done" },
      tasks: [
        { team: "design", status: "done", by: { ar: "ريم الحربي", en: "Reem Alharbi" } },
        { team: "logistics", status: "open" },
      ],
    },
    {
      id: "r6", dept: "mobile", mine: true, stage: "published",
      title: { ar: "مسابقة البرمجة التنافسية", en: "Competitive programming contest" },
      type: { ar: "مسابقة", en: "Competition" },
      start: "2026-10-15", end: "2026-10-15",
      eventId: 214,
      whoseTurn: null,
      next: { ar: "نُشرت كفعالية رقم ٢١٤", en: "Published as event #214" },
      tasks: [
        { team: "design", status: "done" }, { team: "logistics", status: "done" }, { team: "media", status: "done" },
      ],
    },
    {
      id: "r3", dept: "ai", mine: false, stage: "returned",
      title: { ar: "هاكاثون القصيم للذكاء الاصطناعي", en: "Qassim AI Hackathon" },
      type: { ar: "مسابقة", en: "Competition" },
      start: "2026-10-27", end: "2026-10-29",
      fixMs: 6 * H + 10 * M,
      whoseTurn: "ai",
      returnNotes: { ar: "المحتوى ناقص: أضيفوا أسماء الحكّام وجدول الأيام الثلاثة.", en: "Content is incomplete: add the judges' names and the three-day schedule." },
      next: { ar: "أعاده التصميم · يعدّله القسم خلال ٦ ساعات", en: "Returned by Design · the team fixes it within 6 hours" },
      tasks: [
        { team: "design", status: "returned" }, { team: "logistics", status: "done" },
      ],
    },
    {
      id: "r2", dept: "cyber", mine: false, stage: "in_review",
      title: { ar: "ورشة أمن الشبكات اللاسلكية", en: "Wireless network security workshop" },
      type: { ar: "ورشة عمل", en: "Workshop" },
      start: "2026-10-21", end: "2026-10-21",
      whoseTurn: "design",
      next: { ar: "بانتظار التصميم · أنهت اللوجستيات دورها", en: "Waiting on Design · Logistics is done" },
      returnUntil: "2026-10-11",
      tasks: [
        { team: "design", status: "open" }, { team: "logistics", status: "done" },
      ],
    },
    {
      id: "r4", dept: "web", mine: false, stage: "media",
      title: { ar: "لقاء مطوري الويب", en: "Web developers meetup" },
      type: { ar: "لقاء", en: "Meetup" },
      start: "2026-10-22", end: "2026-10-22",
      whoseTurn: "media",
      next: { ar: "بانتظار الإعلام", en: "Waiting on Media" },
      tasks: [
        { team: "design", status: "done" }, { team: "logistics", status: "done" }, { team: "media", status: "open" },
      ],
    },
    {
      id: "r5", dept: "ai", mine: false, stage: "ready",
      title: { ar: "معسكر تحليل البيانات", en: "Data analysis bootcamp" },
      type: { ar: "معسكر", en: "Bootcamp" },
      start: "2026-11-01", end: "2026-11-05",
      whoseTurn: "ai",
      next: { ar: "جاهز · اختر فئة النقاط وانشر", en: "Ready · pick the points tier and publish" },
      tasks: [
        { team: "design", status: "done" }, { team: "logistics", status: "done" }, { team: "media", status: "done" },
      ],
    },
  ];

  /** What is waiting on a team. The signed-in person is a super admin, so they see every team's. */
  const inbox = [
    { request: "r2", team: "design", received: { ar: "قبل يوم", en: "1 day ago" }, canReturn: true, returnUntil: "2026-10-11",
      brief: { type: { ar: "صورة إعلانية", en: "Promotional image" }, size: { ar: "مربع", en: "Square" }, file: "PNG", content: { ar: "المحتوى مكتمل ونهائي", en: "Content is complete and final" } } },
    { request: "r7", team: "logistics", received: { ar: "قبل ٥ ساعات", en: "5 hours ago" },
      brief: { venue: "التيك فالي (60)", services: { ar: "تنظيم، متطوعون", en: "Organizing, volunteers" }, needs: { ar: "أجهزة، إنترنت", en: "Devices, internet" } } },
    { request: "r4", team: "media", received: { ar: "قبل ساعتين", en: "2 hours ago" } },
  ];

  /** Real notification kinds, sample requests. */
  const notifications = [
    { kind: "request_received", unread: true, request: "r2", ago: { ar: "قبل يوم", en: "1d" }, text: { ar: "طلب جديد لقسمكم: ورشة أمن الشبكات اللاسلكية", en: "New request for your team: Wireless network security workshop" } },
    { kind: "task_done", unread: true, request: "r7", ago: { ar: "قبل ٣ س", en: "3h" }, text: { ar: "أنهى قسم دوره في واجهات Material 3 عمليًا", en: "A team finished its part of Material 3 UI, hands-on" } },
    { kind: "returned", unread: true, request: "r3", ago: { ar: "قبل ٦ س", en: "6h" }, text: { ar: "أعاد التصميم هاكاثون القصيم للذكاء الاصطناعي مع ملاحظات", en: "Design returned Qassim AI Hackathon with notes" } },
    { kind: "ready_to_publish", unread: false, request: "r5", ago: { ar: "أمس", en: "1d" }, text: { ar: "معسكر تحليل البيانات جاهز للنشر", en: "Data analysis bootcamp is ready to publish" } },
    { kind: "media_received", unread: false, request: "r4", ago: { ar: "أمس", en: "1d" }, text: { ar: "لقاء مطوري الويب جاهز للإعلام", en: "Web developers meetup is ready for Media" } },
  ];

  /**
   * October 2026 (1 Oct is a Thursday; the week starts on Sunday). Today is
   * Fri 9 Oct; the first bookable day is Tue 13 Oct (four days ahead).
   */
  const calendar = { year: 2026, month: 10, today: "2026-10-09", firstBookable: "2026-10-13", days: {} };
  for (let d = 1; d <= 31; d++) calendar.days[d] = { status: d < 13 ? "locked" : "open" };
  const put = (from, to, status, extra) => { for (let d = from; d <= to; d++) calendar.days[d] = { status, ...extra }; };
  put(15, 15, "published", { request: "r6" });
  put(18, 18, "banned", { reason: { ar: "اختبارات منتصف الفصل", en: "Midterms" } });
  put(19, 20, "held", { request: "r1" });
  put(21, 21, "booked", { request: "r2" });
  put(22, 22, "booked", { request: "r4" });
  put(25, 25, "banned", { reason: { ar: "إجازة رسمية", en: "Official holiday" } });
  put(26, 26, "booked", { request: "r7" });
  put(27, 29, "booked", { request: "r3" });

  const dayStatus = {
    locked: { ar: "قريب جدًا", en: "Too soon" },
    banned: { ar: "مغلق من اللوجستيات", en: "Closed by Logistics" },
    open: { ar: "متاح", en: "Open" },
    held: { ar: "محجوز مؤقتًا", en: "Held (draft)" },
    booked: { ar: "محجوز", en: "Booked" },
    published: { ar: "فعالية منشورة", en: "Published event" },
  };

  /** After publishing, events live in Events. */
  const events = [
    { id: 209, status: "active", title: { ar: "ورشة Git و GitHub", en: "Git & GitHub workshop" }, dept: "web", when: { ar: "الآن · اليوم ٢ من ٢", en: "Now · day 2 of 2" }, where: { ar: "التيك فالي", en: "Tech Valley" }, attended: 86, next: { ar: "سجّل الحضور", en: "Take attendance" } },
    { id: 211, status: "open", title: { ar: "مقدمة في الحوسبة السحابية", en: "Intro to cloud computing" }, dept: "ai", when: { ar: "بعد ٣ أيام", en: "In 3 days" }, where: { ar: "عن بُعد", en: "Online" }, responses: 142, next: { ar: "راجع التسجيلات", en: "Review registrations" } },
    { id: 212, status: "open", title: { ar: "أساسيات اختبار الاختراق", en: "Penetration testing basics" }, dept: "cyber", when: { ar: "بعد ٦ أيام", en: "In 6 days" }, where: { ar: "معمل الأمن السيبراني", en: "Cybersecurity lab" }, responses: 57, next: { ar: "راجع التسجيلات", en: "Review registrations" } },
    { id: 214, status: "draft", title: { ar: "مسابقة البرمجة التنافسية", en: "Competitive programming contest" }, dept: "mobile", when: { ar: "١٥ أكتوبر", en: "15 Oct" }, where: { ar: "مسرح شطر الطلاب", en: "Student theatre" }, next: { ar: "أرفق النموذج وانشر", en: "Attach form & publish" } },
  ];

  /** The dashboard's derived "needs your attention" queue (real kinds). */
  const attention = [
    { kind: "overdue", tone: "red", title: { ar: "الحضور ما انقفل", en: "Attendance never closed" }, event: { ar: "ملتقى المبتدئين", en: "Beginners meetup" }, detail: { ar: "انتهت قبل ٣ أيام والنقاط ما انمنحت", en: "ended 3 days ago, points not awarded" }, action: { ar: "اقفل الفعالية", en: "Close event" } },
    { kind: "certificates", tone: "yellow", title: { ar: "٤٨ شهادة جاهزة للإرسال", en: "48 certificates ready to send" }, event: { ar: "دورة بايثون", en: "Python course" }, detail: { ar: "انقفلت قبل يومين", en: "closed 2 days ago" }, action: { ar: "أرسل", en: "Send" } },
    { kind: "closingSoon", tone: "blue", title: { ar: "تبدأ قريب — راجع التسجيلات", en: "Starts soon — review the registrations" }, event: { ar: "مقدمة في الحوسبة السحابية", en: "Intro to cloud computing" }, detail: { ar: "تبدأ بعد ٣ أيام", en: "starts in 3 days" }, action: { ar: "راجع", en: "Review" } },
  ];

  const stats = { open: 2, live: 1, members: 1284, verified: 1102, pending: 182, emails24h: 342 };

  const me = {
    name: { ar: "إبراهيم", en: "Ibrahim" },
    initials: { ar: "إ", en: "I" },
    role: { ar: "قائد تطوير التطبيقات · مشرف عام", en: "Mobile Development leader · Super admin" },
    dept: "mobile",
    superAdmin: true,
  };

  /** Sidebar / nav, grouped as in the app today. */
  const nav = [
    { group: { ar: "التشغيل", en: "Operate" }, items: [
      { key: "home", icon: "layout-dashboard", ar: "الرئيسية", en: "Home" },
      { key: "pipeline", icon: "route", ar: "مسار الفعاليات", en: "Event pipeline" },
      { key: "events", icon: "calendar-days", ar: "الفعاليات", en: "Events" },
    ] },
    { group: { ar: "الأشخاص", en: "People" }, items: [
      { key: "members", icon: "users", ar: "الأعضاء", en: "Members" },
      { key: "club", icon: "network", ar: "هيكلة النادي", en: "Club Structure" },
      { key: "permissions", icon: "key-round", ar: "الصلاحيات", en: "Permissions" },
    ] },
    { group: { ar: "التواصل", en: "Engage" }, items: [
      { key: "points", icon: "trophy", ar: "النقاط", en: "Points" },
      { key: "emails", icon: "mail", ar: "البريد", en: "Emails" },
    ] },
    { group: { ar: "النظام", en: "System" }, items: [
      { key: "settings", icon: "settings", ar: "الإعدادات", en: "Settings" },
    ] },
  ];

  const byId = Object.fromEntries(requests.map((r) => [r.id, r]));

  window.GDG_DATA = {
    departments, steps, stages, taskStatus, requests, byId, inbox, notifications,
    calendar, dayStatus, events, attention, stats, me, nav,
    venues: ["مسرح شطر الطلاب (180)", "التيك فالي (60)", "القاعة الكبرى بالمؤتمرات (2200)", "معمل الامن السيبراني", "بيت الثقافة"],
    weekStartsOn: 0,
  };
})();
