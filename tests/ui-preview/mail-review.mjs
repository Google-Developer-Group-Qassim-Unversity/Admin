// Error classification and stale-state checks for the send-detail query keys.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mail from "./fixtures/mail.mjs";

export default async function exercise({ page, locale, theme, viewport, out }) {
  const { manageEmails: m, common } = JSON.parse(await readFile(new URL(`../../messages/${locale}.json`, import.meta.url), "utf8"));
  const sheet = page.locator('[data-slot="sheet-content"]');
  const sends = mail[0].body({ query: {} }).items;
  const certificate = sends.find((send) => send.kind === "event-certificate" && send.status === "partial");
  const row = (id) => page.locator(`main li[data-send-id="${id}"] button`);
  const result = [];
  for (const status of [404, 422, 403, 429, 502, 503, 504, "network"]) {
    let requests = 0;
    const url = `**/emails/sends/${certificate.id}/certificate-sample`;
    await page.route(url, (route) => {
      requests++;
      return status === "network" ? route.abort("failed") : route.fulfill({ status, json: {} });
    });
    await page.reload({ waitUntil: "networkidle" });
    await row(certificate.id).click();
    const empty = status === 404 || status === 422;
    await sheet.getByText(empty ? m.details.noSample : m.details.sampleFailed, { exact: true }).waitFor();
    assert.equal(requests, typeof status === "number" && status < 500 ? 1 : 2, "retry only transient failures");
    assert.equal(await sheet.getByText(empty ? m.details.sampleFailed : m.details.noSample, { exact: true }).count(), 0);
    result.push({ status, requests, empty });
    await page.unroute(url);
  }
  await page.reload({ waitUntil: "networkidle" });
  const first = sends[0];
  await row(first.id).click();
  await sheet.locator("figure img").waitFor();
  await sheet.getByRole("radio", { name: m.details.desktop, exact: true }).click();
  await sheet.getByRole("searchbox").fill("retained-search");
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let markStarted, markComplete;
  const started = new Promise((resolve) => { markStarted = resolve; });
  const completed = new Promise((resolve) => { markComplete = resolve; });
  const url = `**/emails/sends/${first.id}/certificate-sample`;
  let pending = 0;
  await page.route(url, async (route) => {
    pending++;
    markStarted();
    await gate;
    const sample = mail[1].body({ pathname: `/emails/sends/${first.id}/certificate-sample` });
    try {
      await route.fulfill({ json: { ...sample, recipient: { ...sample.recipient, name: "Wrong send" } } });
    } finally {
      markComplete();
    }
  });
  try {
    const another = sheet.getByRole("button", { name: m.details.anotherName, exact: true });
    await another.evaluate((node) => { node.click(); node.click(); });
    await started;
    await sheet.locator("button:disabled").filter({ hasText: m.details.anotherName }).waitFor();
    assert.equal(await another.isDisabled(), true, "another-name requests cannot overlap");
    // Simulate selection changing while the old sample is still in flight.
    await row(certificate.id).evaluate((node) => node.click());
    await sheet.locator("figure img").waitFor();
    assert.equal(await sheet.getByRole("searchbox").inputValue(), "", "new send resets recipient filtering");
    assert.equal(await sheet.getByRole("radio", { name: m.details.phone, exact: true }).getAttribute("aria-checked"), "true", "new send resets the preview viewport");
    const name = await sheet.locator("figure img").getAttribute("alt");
    release();
    await completed;
    await page.waitForTimeout(250);
    assert.equal(pending, 1);
    assert.equal(await sheet.locator("figure img").getAttribute("alt"), name, "late sample response cannot overwrite another send");
    assert.equal((await sheet.innerText()).includes("Wrong send"), false);
  } finally {
    release();
    if (pending) await completed;
    await page.unroute(url);
  }
  await sheet.getByRole("button", { name: common.actions.close, exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  await row(certificate.id).click();
  assert.equal(await sheet.getByRole("searchbox").inputValue(), "");
  await writeFile(path.join(out, `sample-errors-${viewport}-${locale}-${theme}.json`), JSON.stringify(result, null, 2));
}
