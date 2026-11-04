import assert from "node:assert/strict";
export default async function ({ page, locale }) {
  assert.equal(
    await page
      .getByRole("button", {
        name: locale === "ar" ? "حذف الفعالية" : "Delete event",
        exact: true,
      })
      .count(),
    0,
  );
}
