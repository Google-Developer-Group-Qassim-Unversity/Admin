// Shared Radix motion on real consumers, including a Popover inside a Dialog.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function exercise({ page, locale, theme, viewport, out }) {
  const m = JSON.parse(await readFile(new URL(`../../messages/${locale}.json`, import.meta.url), "utf8"));
  const route = new URL(page.url()).pathname;
  const evidence = {};
  const state = (locator) => locator.evaluate((node) => ({
    state: node.dataset.state, name: getComputedStyle(node).animationName,
    duration: getComputedStyle(node).animationDuration, opacity: getComputedStyle(node).opacity,
    animations: node.getAnimations().filter((animation) => animation.playState === "running").length,
  }));
  const settled = async (locator, key) => {
    await locator.waitFor();
    await page.waitForTimeout(230);
    evidence[`${key}-open`] = await state(locator);
    assert.equal(evidence[`${key}-open`].opacity, "1");
    assert.equal(evidence[`${key}-open`].animations, 0, "no overlapping or repeating motion at rest");
  };
  const exit = async (locator, key, duration = "0.2s", check) => {
    // Hoverable tooltips keep a pointer grace period before entering closed state.
    await page.waitForFunction(({ id, slot }) => (id ? document.getElementById(id) : document.querySelector(`[data-slot="${slot}"]`))?.dataset.state === "closed", {
      id: await locator.getAttribute("id"), slot: await locator.getAttribute("data-slot"),
    });
    await page.waitForTimeout(35);
    evidence[`${key}-exit`] = await state(locator);
    assert.equal(evidence[`${key}-exit`].state, "closed");
    assert.equal(evidence[`${key}-exit`].name, "exit");
    assert.equal(evidence[`${key}-exit`].duration, duration);
    assert.equal(evidence[`${key}-exit`].animations, 1);
    if (check) await check();
    await locator.waitFor({ state: "hidden" });
  };
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const dialog = page.locator('[data-slot="dialog-content"]');
  if (route === "/manage-members") {
    await page.getByRole("button", { name: m.createMember.createMember, exact: true }).click();
    await settled(dialog, "members-dialog");
    await dialog.locator("#name").fill("Kept during exit");
    await dialog.locator("#gender").click();
    const select = page.locator('[data-slot="select-content"]');
    await settled(select, "members-select");
    assert.equal(evidence["members-select-open"].duration, "0.15s");
    await page.keyboard.press("Escape");
    await select.waitFor({ state: "hidden" });
    assert.equal(await dialog.getAttribute("data-state"), "open");
    await page.screenshot({ path: path.join(out, `members-dialog-${viewport}-${locale}-${theme}.png`) });
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "members-dialog", "0.2s", async () => assert.equal(await dialog.locator("#name").inputValue(), "Kept during exit"));
    await page.getByRole("button", { name: m.createMember.createMember, exact: true }).click();
    await settled(dialog, "members-reopen");
    assert.equal(await dialog.locator("#name").inputValue(), "", "form resets after exit");
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "members-reopen");
    await page.getByRole("button", { name: m.manageMembersPage.batchImport, exact: true }).click();
    await settled(dialog, "members-batch");
    await dialog.locator("#batch-token").fill("Kept during exit");
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "members-batch", "0.2s", async () => assert.equal(await dialog.locator("#batch-token").inputValue(), "Kept during exit"));
    await page.locator('main [data-slot="dropdown-menu-trigger"]:visible').first().click();
    const menu = page.locator('[data-slot="dropdown-menu-content"]');
    await settled(menu, "members-menu");
    await page.keyboard.press("Escape");
    await exit(menu, "members-menu", "0.15s");
  } else if (route === "/settings/semesters") {
    await page.getByRole("button", { name: m.semestersPage.addSemester, exact: true }).click();
    await settled(dialog, "semester-dialog");
    await dialog.locator("#semester-start").click();
    const popover = page.locator('[data-slot="popover-content"]');
    await settled(popover, "calendar-in-dialog");
    await page.screenshot({ path: path.join(out, `calendar-in-dialog-${viewport}-${locale}-${theme}.png`) });
    await page.keyboard.press("Escape");
    await exit(popover, "calendar-in-dialog");
    assert.equal(await dialog.getAttribute("data-state"), "open", "Escape closes only the top layer");
    assert.equal(await dialog.locator("#semester-start").evaluate((node) => node === document.activeElement), true);
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "semester-dialog");
    await page.locator('main button[title]:visible').filter({ hasText: m.semestersPage.editSr.split("{name}")[0] }).first().click();
    await settled(dialog, "semester-edit");
    const editTitle = await dialog.locator('[data-slot="dialog-title"]').innerText();
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "semester-edit", "0.2s", async () => assert.equal(await dialog.locator('[data-slot="dialog-title"]').innerText(), editTitle));
    await page.locator('main button[title]:visible').filter({ hasText: m.semestersPage.deleteSr.split("{name}")[0] }).first().click();
    const alert = page.locator('[data-slot="alert-dialog-content"]');
    await settled(alert, "semester-delete");
    const deleteTitle = await alert.locator('[data-slot="alert-dialog-title"]').innerText();
    await alert.getByRole("button", { name: m.common.actions.cancel, exact: true }).evaluate((node) => node.click());
    await exit(alert, "semester-delete", "0.2s", async () => assert.equal(await alert.locator('[data-slot="alert-dialog-title"]').innerText(), deleteTitle));
  } else if (route.endsWith("/content")) {
    const addLink = page.getByRole("button", { name: m.eventContent.addRecordingLink, exact: true });
    await addLink.focus();
    await addLink.press("Enter");
    await settled(dialog, "content-link");
    await dialog.locator("#content-link-label").fill("Kept during exit");
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "content-link", "0.2s", async () => assert.equal(await dialog.locator("#content-link-label").inputValue(), "Kept during exit"));
    await page.locator('main input[type="file"]').first().setInputFiles({ name: "kept.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
    await settled(dialog, "content-upload");
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "content-upload", "0.2s", async () => assert.ok((await dialog.innerText()).includes("kept.pdf")));
  } else if (route.endsWith("/manage")) {
    await page.locator('main [data-slot="dialog-trigger"]').first().click();
    await settled(dialog, "event-qr-dialog");
    await page.screenshot({ path: path.join(out, `event-qr-dialog-${viewport}-${locale}-${theme}.png`) });
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "event-qr-dialog");
  } else if (route.endsWith("/responses")) {
    const prefix = m.responses.sendAcceptance.match(/=0 \{([^}]+)\}/)[1];
    await page.locator("main button:visible").filter({ hasText: prefix }).first().click();
    await settled(dialog, "event-acceptance");
    await dialog.locator("#subject").fill("Kept during exit");
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "event-acceptance", "0.2s", async () => assert.equal(await dialog.locator("#subject").inputValue(), "Kept during exit"));
  } else if (route.endsWith("/attendance")) {
    await page.getByRole("button", { name: m.attendance.listCard.manage, exact: true }).click();
    await settled(dialog, "event-attendance");
    await dialog.getByRole("tab", { name: m.attendance.manageDialog.tabs.emails, exact: true }).click();
    await dialog.getByRole("radio").last().click();
    await dialog.getByRole("button", { name: m.attendance.certificateTab.sendCustomEmail, exact: true }).click();
    const custom = page.locator('[data-slot="dialog-content"]').filter({ has: page.locator("#custom-email-subject") });
    await settled(custom, "event-custom-email");
    await custom.locator("#custom-email-subject").fill("Kept during exit");
    await custom.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(custom, "event-custom-email", "0.2s", async () => assert.equal(await custom.locator("#custom-email-subject").inputValue(), "Kept during exit"));
    await dialog.locator('[data-slot="dialog-close"]').evaluate((node) => node.click());
    await exit(dialog, "event-attendance", "0.2s", async () => assert.equal(await dialog.getByRole("tab", { name: m.attendance.manageDialog.tabs.emails, exact: true }).getAttribute("aria-selected"), "true"));
    if (viewport === "desktop") {
    await page.getByRole("button", { name: m.attendance.qrCode.advancedRules, exact: true }).click();
    const trigger = page.locator('[data-slot="tooltip-trigger"]:visible').first();
    await trigger.hover();
    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await settled(tooltip, "event-tooltip");
    assert.ok(["instant-open", "delayed-open"].includes(evidence["event-tooltip-open"].state));
    assert.equal(evidence["event-tooltip-open"].duration, "0.15s");
    await page.mouse.move(0, 0);
    await page.keyboard.press("Escape");
    await exit(tooltip, "event-tooltip", "0.15s");
    await trigger.focus();
    await settled(tooltip, "event-tooltip-focus");
    assert.equal(evidence["event-tooltip-focus-open"].state, "instant-open", "keyboard tooltips open immediately");
    await trigger.evaluate((node) => node.blur());
    await exit(tooltip, "event-tooltip-focus", "0.15s");
    }
  }
  assert.equal(await page.locator('[data-slot$="-overlay"]').count(), 0, "no orphaned overlays");
  await writeFile(path.join(out, `${route.replaceAll("/", "-")}-${viewport}-${locale}-${theme}.json`), JSON.stringify(evidence, null, 2));
}
