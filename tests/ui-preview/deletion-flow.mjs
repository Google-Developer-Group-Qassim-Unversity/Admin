import assert from "node:assert/strict";
import path from "node:path";

export default async function ({ page, locale, theme, viewport, out }) {
  const ar = locale === "ar";
  await page
    .getByRole("button", {
      name: ar ? "احذف الفعالية" : "Delete event",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog
    .getByRole("button", {
      name: ar ? "احذفها نهائي" : "Delete permanently",
      exact: true,
    })
    .waitFor();
  await page.waitForTimeout(200);
  assert.equal(
    await dialog
      .getByRole("button", {
        name: ar ? "احذفها نهائي" : "Delete permanently",
        exact: true,
      })
      .isEnabled(),
    true,
  );
  const assertCountAlignment = async () => {
    const counts = await dialog
      .locator("[data-deletion-count]")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          x: element.getBoundingClientRect().x,
          width: element.getBoundingClientRect().width,
        })),
      );
    assert(counts.length >= 3, "Counts include the event and resources");
    assert(
      Math.max(...counts.map((count) => count.x)) -
        Math.min(...counts.map((count) => count.x)) <=
        1,
      "All counts share one column, including rows without a page link",
    );
    assert(
      Math.max(...counts.map((count) => count.width)) -
        Math.min(...counts.map((count) => count.width)) <=
        1,
      "Single and double digit counts have the same width",
    );
  };
  await assertCountAlignment();
  const submissions = dialog.getByRole("button", {
    name: ar
      ? /التسجيلات، بما فيها الملغاة/
      : /Submissions, including cancellations/,
  });
  const link = dialog.getByRole("link", {
    name: ar ? /افتح التسجيلات/ : /Open Submissions/,
  });
  assert.match(await link.getAttribute("href"), /\/responses(?:\?|$)/);
  assert.equal(await link.getAttribute("target"), "_blank");
  await page.screenshot({
    path: path.join(out, `deletion-summary-${viewport}-${locale}-${theme}.png`),
  });
  await submissions.click();
  await dialog.getByText("عبدالله القحطاني", { exact: true }).first().waitFor();
  await dialog
    .getByRole("button", { name: ar ? "التالي" : "Next", exact: true })
    .click();
  await dialog.getByText("#9020", { exact: true }).waitFor();
  await dialog
    .getByRole("button", { name: ar ? "السابق" : "Previous", exact: true })
    .click();
  await dialog.getByText("#9000", { exact: true }).waitFor();
  const action = dialog.getByRole("button", {
    name: ar ? "احذفها نهائي" : "Delete permanently",
    exact: true,
  });
  const bounds = await action.boundingBox();
  assert(
    bounds.y >= 0 &&
      bounds.y + bounds.height <= (await page.viewportSize()).height,
    "Delete button stays visible",
  );
  assert.equal(
    await dialog.evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
    "No horizontal dialog overflow",
  );
  await dialog.locator("[data-deletion-scroll]").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({
    path: path.join(
      out,
      `deletion-submissions-${viewport}-${locale}-${theme}.png`,
    ),
  });
  await submissions.click();
  await dialog
    .getByRole("button", {
      name: ar ? "احتفظ بالفعالية" : "Keep event",
      exact: true,
    })
    .click();

  // A quiet event should fit in a short review. The same real component is used.
  const impactUrl = "http://api.test/events/209/deletion-impact";
  await page.route(impactUrl, (route) =>
    route.fulfill({
      json: {
        event_id: 209,
        event_name: "ورشة Git و GitHub",
        total: 4,
        retained_notifications: 0,
        resources: [
          { key: "submissions", count: 0 },
          { key: "members_logs", count: 0 },
          { key: "logs", count: 2 },
          { key: "forms", count: 1 },
        ],
      },
    }),
  );
  await page
    .getByRole("button", {
      name: ar ? "احذف الفعالية" : "Delete event",
      exact: true,
    })
    .click();
  await dialog
    .getByText(
      ar ? /ما فيه تسجيلات أو حضور/ : /No submissions or attendance/,
    )
    .waitFor();
  await page.waitForTimeout(200);
  await assertCountAlignment();
  await page.screenshot({
    path: path.join(out, `deletion-quiet-${viewport}-${locale}-${theme}.png`),
  });
  await dialog
    .getByRole("button", {
      name: ar ? "احتفظ بالفعالية" : "Keep event",
      exact: true,
    })
    .click();
  await page.unroute(impactUrl);
}
