export const DEFAULT_STYLES = `
body {
  margin: 0;
  padding: 0;
  background-color: #f1f5f9;
  font-family: Roboto, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, "Noto Sans Arabic", sans-serif;
  color: #111827;
  direction: rtl;
}
.container { max-width: 600px; margin: 0 auto; padding: 24px 12px; direction: rtl; }
.hero { background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid rgba(15, 23, 42, 0.12); }
.hero-top { padding: 18px 18px 0 18px; }
.logo-link { text-decoration: none; }
.logo { display: block; border: 0; }
.org-text { margin: 8px 0 0 0; font-size: 12px; line-height: 1.5; color: rgba(15, 23, 42, 0.70); text-align: right; }
.hero-content { padding: 10px 18px 18px 18px; text-align: right; }
.kicker { margin: 0; font-size: 13px; color: rgba(15, 23, 42, 0.70); direction: rtl; unicode-bidi: embed; }
.title { margin: 10px 0 6px 0; font-size: 24px; font-weight: 800; line-height: 1.4; color: #0f172a; letter-spacing: -0.02em; direction: rtl; unicode-bidi: embed; }
.subtitle { margin: 0 0 14px 0; font-size: 15px; line-height: 1.7; color: rgba(15, 23, 42, 0.80); direction: rtl; unicode-bidi: embed; }
.google-bar { height: 6px; background: linear-gradient(to right, #4285f4 0%, #4285f4 25%, #db4437 25%, #db4437 50%, #f4b400 50%, #f4b400 75%, #0f9d58 75%, #0f9d58 100%); }
.card { margin-top: 14px; background-color: #ffffff; border-radius: 18px; padding: 22px 20px; border: 1px solid rgba(15, 23, 42, 0.08); text-align: right; }
.card h1, .card h2, .card h3 { margin: 0 0 12px 0; color: #0f172a; }
.card p { margin: 0 0 12px 0; font-size: 15px; line-height: 1.8; color: #334155; }
.card ul, .card ol { margin: 0 0 12px 0; padding-right: 22px; padding-left: 0; font-size: 15px; line-height: 1.8; color: #334155; }
.card blockquote { margin: 0 0 12px 0; padding: 8px 14px; border-right: 3px solid #1a73e8; background-color: #f8fafc; color: #475569; }
.card code { background-color: #f1f5f9; border-radius: 4px; padding: 2px 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; direction: ltr; display: inline-block; }
.card pre { background-color: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 14px 16px; overflow-x: auto; direction: ltr; text-align: left; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
.card table { width: 100%; border-collapse: collapse; margin: 0 0 12px 0; }
.card th, .card td { border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 13px; text-align: right; }
.card th { background-color: #f8fafc; }
.card hr { border: none; border-top: 1px solid rgba(15, 23, 42, 0.08); margin: 16px 0; }
.card a { color: #1a73e8; text-decoration: underline; }
.footer { padding: 14px 6px 0 6px; text-align: center; }
.footer-hr { border: none; border-top: 1px solid rgba(15, 23, 42, 0.12); margin: 18px 0 12px 0; }
.footer-text { margin: 0 0 6px 0; font-size: 12px; color: rgba(15, 23, 42, 0.65); }
.footer-link { color: rgba(15, 23, 42, 0.85); text-decoration: none; }
`;

export const DEFAULT_BODY = `<div class="container" dir="rtl">
  <div class="hero" dir="rtl">
    <div class="hero-top" dir="rtl">
      <a href="https://gdg-q.com" class="logo-link">
        <img src="https://www.gdg-q.com/gdg.png" width="64" alt="GDG Logo" class="logo" />
      </a>
      <p class="org-text">Google Developer Groups - Qassim</p>
    </div>

    <div class="hero-content" dir="rtl">
      <p class="kicker">&#8207;إعلان</p>
      <p class="title">&#8207;عنوان الرسالة الرئيسي 🎉</p>
      <p class="subtitle">&#8207;اكتب وصف مختصر لمحتوى هذه الرسالة</p>
    </div>

    <div class="google-bar"></div>
  </div>

  <div class="card" dir="rtl">
    <h1>عنوان رئيسي — Heading 1</h1>
    <h2>عنوان فرعي — Heading 2</h2>
    <h3>عنوان أصغر — Heading 3</h3>

    <p>هذا نص عادي (paragraph). يمكنك كتابة <strong>نص عريض (bold)</strong>، و<em>نص مائل (italic)</em>، و<del>نص يتوسطه خط (strikethrough)</del>، و<code>كود مضمّن (inline code)</code>.</p>

    <p>هذا <a href="https://example.com">رابط (link)</a> كمثال يمكن نسخه.</p>

    <blockquote>هذا اقتباس (blockquote) — استخدمه لتمييز جملة أو تنبيه مهم.</blockquote>

    <p><strong>قائمة غير مرتبة (unordered list):</strong></p>
    <ul>
      <li>عنصر أول</li>
      <li>عنصر ثاني</li>
      <li>عنصر ثالث</li>
    </ul>

    <p><strong>قائمة مرتبة (ordered list):</strong></p>
    <ol>
      <li>الخطوة الأولى</li>
      <li>الخطوة الثانية</li>
      <li>الخطوة الثالثة</li>
    </ol>

    <hr />

    <p><strong>جدول (table):</strong></p>
    <table>
      <thead>
        <tr><th>العمود الأول</th><th>العمود الثاني</th></tr>
      </thead>
      <tbody>
        <tr><td>قيمة 1</td><td>قيمة 2</td></tr>
        <tr><td>قيمة 3</td><td>قيمة 4</td></tr>
      </tbody>
    </table>

    <p><strong>كتلة كود (code block):</strong></p>
    <pre>function hello() {
  console.log("Hello, GDG Qassim!");
}</pre>

    <p>اكتب محتوى الرسالة هنا، واحذف أو عدّل الأمثلة أعلاه حسب الحاجة.</p>
  </div>

  <div class="footer" dir="rtl">
    <hr class="footer-hr" />
    <p class="footer-text"><strong>Google Developer Groups - Qassim</strong></p>
    <p class="footer-text">الموقع الإلكتروني: <a href="https://gdg-q.com" class="footer-link">gdg-q.com</a></p>
    <p class="footer-text">تابعنا على تويتر: <a href="https://x.com/gdg_qu" class="footer-link">@gdg_qu</a></p>
    <p class="footer-text">هاشتاق: <a href="https://x.com/hashtag/GDG_QU?src=hashtag_click" class="footer-link">#GDG_QU</a></p>
  </div>
</div>`;

export function extractTemplateParts(html: string): { styleContent: string; bodyContent: string } {
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const styleContent = styleMatch ? styleMatch[1] : "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  return { styleContent, bodyContent };
}

export function buildEmailHtml(styleContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styleContent}</style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: Roboto, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Arial, 'Noto Sans Arabic', sans-serif; color: #111827;" dir="rtl">
${bodyContent}
</body>
</html>`;
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script").forEach((el) => el.remove());
  doc
    .querySelectorAll("[onclick], [onerror], [onload], [onmouseover]")
    .forEach((el) => {
      el.removeAttribute("onclick");
      el.removeAttribute("onerror");
      el.removeAttribute("onload");
      el.removeAttribute("onmouseover");
    });
  return doc.documentElement.outerHTML;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
