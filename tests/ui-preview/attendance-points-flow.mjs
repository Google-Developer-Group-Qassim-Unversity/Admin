import assert from "node:assert/strict";

export default async function ({ page, locale }) {
  const points = page.locator("#attendance_points");
  await points.waitFor();
  assert.equal(await points.inputValue(), "2");
  const saves = [];
  await page.route("http://api.test/events/209", async (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const payload = route.request().postDataJSON();
    saves.push(payload);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload.event) });
  });
  const save = page.getByRole("button", { name: locale === "ar" ? "حفظ التغييرات" : "Save Changes", exact: true });
  for (const value of ["0", "12", "12"]) {
    await points.fill(value);
    const request = page.waitForRequest((r) => r.method() === "PUT" && r.url() === "http://api.test/events/209");
    await save.click();
    await request;
    await page.waitForFunction(() => !document.querySelector('button[type="submit"]')?.disabled);
    assert.equal(saves.at(-1).attendance_points, Number(value));
  }
  assert.equal(saves.length, 3);
  await points.scrollIntoViewIfNeeded();
}
