import assert from "node:assert/strict";
export default async function ({ page, locale }) {
  const ar = locale === "ar";
  const impactUrl = "http://api.test/events/209/deletion-impact";
  const deleteUrl = "http://api.test/events/209";
  let recover = false;
  await page.route(impactUrl, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (recover) return route.fallback();
    return route.fulfill({
      status: 503,
      json: { detail: "Sample temporary failure" },
    });
  });
  await page
    .getByRole("button", {
      name: ar ? "حذف الفعالية" : "Delete event",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("alertdialog");
  const action = dialog.getByRole("button", {
    name: ar ? "حذف نهائي" : "Delete permanently",
    exact: true,
  });
  assert.equal(await action.isDisabled(), true);
  await dialog
    .getByText(
      ar ? "تعذّر تحميل تفاصيل الحذف" : "Could not load deletion details",
      { exact: true },
    )
    .waitFor({ timeout: 15000 });
  assert.equal(await action.isDisabled(), true);
  recover = true;
  await dialog
    .getByRole("button", {
      name: ar ? "إعادة المحاولة" : "Try again",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="alert-dialog-action"]').disabled,
  );
  await page.route(deleteUrl, async (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      status: 409,
      json: { detail: "Sample deletion conflict" },
    });
  });
  await action.click();
  await dialog
    .getByText(ar ? "تعذّر حذف الفعالية" : "Could not delete the event", {
      exact: true,
    })
    .waitFor();
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await action.isEnabled(), true);
  await page.unroute(deleteUrl);
  await action.click();
  await dialog.waitFor({ state: "hidden" });
}
