// Sample-data interaction check for GDG-54, through the actual booking panel.
import assert from "node:assert/strict";
import path from "node:path";

export default async function ({ page, locale, theme, viewport, out }) {
  const ar = locale === "ar";
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 20)).toISOString().slice(0, 10);
  const department = { id: 12, name: "Artificial Intelligence", ar_name: "الذكاء الاصطناعي" };
  const requests = ["draft", "published"].map((stage) => ({
    request: { id: `existing-${stage}`, department, title: stage === "draft" ? "AI workshop" : "Published event", stage, start_date: date, end_date: date },
    recipients: [{ member_id: 2, name: "Noura" }],
  }));
  await page.route("**/pipeline/calendar?*", async (route) => {
    const url = new URL(route.request().url());
    const days = [];
    for (let day = new Date(`${url.searchParams.get("from")}T00:00:00Z`); day <= new Date(`${url.searchParams.get("to")}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
      const iso = day.toISOString().slice(0, 10);
      days.push({ date: iso, status: iso === date ? "published" : "open", requests: iso === date ? requests.map((r) => r.request) : [] });
    }
    await route.fulfill({ json: { today: date, first_bookable_date: date, days } });
  });
  await page.route("**/pipeline/overlaps?*", (route) => route.fulfill({ json: { requests } }));
  let sent;
  await page.route("**/pipeline/requests", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: "r1" } });
  });
  await page.reload({ waitUntil: "networkidle" });
  const day = page.locator(`[data-date="${date}"]`);
  assert.equal(await day.isEnabled(), true, "super admins can select published days");
  await day.click();
  await page.getByRole("button", { name: ar ? "احجز" : "Book", exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor();
  const confirm = dialog.getByRole("button", { name: ar ? "تأكيد الحجز" : "Confirm booking", exact: true });
  assert.equal(await confirm.isDisabled(), true);
  const groups = dialog.getByRole("radiogroup");
  assert.equal(await groups.nth(0).getByRole("radio").count(), 3);
  assert.equal(await groups.nth(1).getByRole("radio").count(), 1, "published events can only be kept");
  await groups.nth(0).getByRole("radio", { name: ar ? "إعادة الجدولة" : "Reschedule", exact: true }).click();
  assert.equal(await dialog.getByRole("button", { name: ar ? "عرض الأسماء" : "Show names" }).count(), 1);
  await groups.nth(0).getByRole("radio", { name: ar ? "إبقاء الحجز" : "Keep booking", exact: true }).click();
  assert.equal(await dialog.getByRole("button", { name: ar ? "عرض الأسماء" : "Show names" }).count(), 0);
  assert.equal(await confirm.isDisabled(), true);
  await groups.nth(1).getByRole("radio").click();
  assert.equal(await confirm.isEnabled(), true);
  assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth), true, "dialog must not overflow");
  await page.screenshot({ path: path.join(out, `double-booking-${viewport}-${locale}-${theme}.png`) });
  await confirm.click();
  await page.waitForURL("**/pipeline/requests/r1?*");
  assert.deepEqual(sent.bumps, { "existing-draft": "keep", "existing-published": "keep" });
}
