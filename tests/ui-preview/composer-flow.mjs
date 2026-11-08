// Composer-only visual and interaction checks. All requests use the preview fixtures.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function exercise({ page, locale, theme, viewport, out }) {
  const messages = JSON.parse(await readFile(new URL(`../../messages/${locale}.json`, import.meta.url), "utf8"));
  const m = messages.manageEmails;
  const action = messages.common.actions;
  const sheet = page.locator('[data-slot="sheet-content"]');
  const name = (field) => m.composer.helpLabel.replace("{field}", field);
  const shot = async (state) => {
    await page.waitForTimeout(250);
    const small = await page.locator('[data-slot="sheet-content"] button, [data-slot="popover-content"] button').evaluateAll((nodes) => nodes.filter((n) => n.checkVisibility() && n.getBoundingClientRect().height < 44).map((n) => n.outerHTML));
    if (viewport !== "desktop") assert.deepEqual(small, [], "44px touch targets");
    assert.equal(await sheet.evaluate((n) => n.scrollWidth > n.clientWidth), false, "no drawer overflow");
    await page.screenshot({ path: path.join(out, `${state}-${viewport}-${locale}-${theme}.png`) });
  };
  await page.getByRole("button", { name: m.newEmail, exact: true }).click();
  await sheet.locator("#composer-count").waitFor();
  const count = sheet.locator("#composer-count");
  assert.equal(await count.inputValue(), "2184");
  const slider = sheet.getByRole("slider");
  assert.equal(await slider.getAttribute("aria-valuemax"), "3951");
  await slider.focus();
  await slider.press(locale === "ar" ? "ArrowLeft" : "ArrowRight");
  assert.equal(await count.inputValue(), "2185", "direction-aware arrows step by one");
  await slider.press("PageUp");
  assert.equal(await count.inputValue(), "2580", "PageUp steps by ten percent");
  await slider.press("PageDown");
  assert.equal(await count.inputValue(), "2185");
  if (viewport !== "desktop") {
    // Synthesize an actual Chromium touch drag, beyond a narrow viewport check.
    const bounds = await sheet.locator('[data-slot="slider"]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const y = bounds.y + bounds.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: bounds.x + bounds.width * 0.25, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: bounds.x + bounds.width * 0.75, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert.ok(Number(await count.inputValue()) > 1 && Number(await count.inputValue()) < 3951);
    assert.ok(locale === "ar" ? Number(await count.inputValue()) < 2185 : Number(await count.inputValue()) > 2185, "touch drag follows RTL/LTR direction");
    await cdp.detach();
  }
  await sheet.getByRole("button", { name: m.composer.everyone, exact: true }).click();
  assert.equal(await count.inputValue(), "2184", "Everyone restores capacity default");
  await count.fill("3000");
  const mark = sheet.locator("[data-capacity-mark]");
  await mark.waitFor();
  const boxes = await Promise.all([mark.boundingBox(), sheet.locator('[data-slot="slider"]').boundingBox()]);
  assert.ok(boxes[0].x > boxes[1].x && boxes[0].x < boxes[1].x + boxes[1].width);
  const paste = sheet.locator("#composer-always");
  await paste.fill('Name\tEmail\nنورة العلي\tNOURA@example.com\nAli Ahmad\tali@example.com\nNoura\tnoura@example.com\nناقص\tbroken@');
  assert.ok((await sheet.locator("#composer-always-summary").innerText()).includes(locale === "ar" ? "عنوانين" : "2"));
  await shot("slider-paste");
  await sheet.getByRole("button", { name: name(m.composer.count), exact: true }).click();
  await page.locator('[data-slot="popover-content"]').waitFor();
  await shot("help-count");
  await page.keyboard.press("Escape");
  await paste.locator("..").getByRole("button", { name: m.recipients.add, exact: true }).click();
  assert.equal(await paste.inputValue(), "broken@", "invalid input is retained");
  await sheet.getByText("نورة العلي", { exact: true }).waitFor();
  await sheet.getByText("Ali Ahmad", { exact: true }).waitFor();
  await paste.fill("ali@example.com; fresh@example.com; bad@");
  assert.ok((await sheet.locator("#composer-always-summary").innerText()).includes(locale === "ar" ? "عنوان مكرر" : "1"));
  await shot("paste-retained");
  await sheet.getByRole("radio", { name: m.composer.audience.people, exact: true }).click();
  await sheet.locator("#composer-people").fill('"Sara" <sara@example.com>، SARA@example.com; wrong@');
  await shot("people-paste");
  await sheet.locator("#composer-people").press("Control+Enter");
  assert.equal(await sheet.locator("#composer-people").inputValue(), "wrong@");
  await sheet.getByRole("radio", { name: m.composer.audience.members, exact: true }).click();
  await count.waitFor({ state: "visible" });
  assert.equal(await count.inputValue(), "3000", "audience change preserves member settings");
  await sheet.locator("#composer-subject").fill("Composer preview");
  await sheet.locator("#composer-html").fill("<h1>رسالة لأعضاء النادي</h1><p>تفاصيل اللقاء القادم</p>");
  if (viewport !== "desktop") {
    await sheet.getByRole("radio", { name: m.composer.preview, exact: true }).click();
    await sheet.locator("iframe").waitFor();
    const previewBox = await sheet.locator("#composer-preview-pane").boundingBox();
    assert.ok(previewBox.x >= 16 && previewBox.x + previewBox.width <= (viewport === "phone-small" ? 360 : 390) - 16, "preview stays inside the editor column");
    await shot("phone-preview");
    await sheet.getByRole("radio", { name: m.composer.write, exact: true }).click();
  }
  await sheet.getByRole("button", { name: name(m.composer.test), exact: true }).click();
  await shot("help-test");
  await page.keyboard.press("Escape");
  await sheet.getByRole("button", { name: action.close, exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: m.composer.keepWriting, exact: true }).click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await sheet.getByRole("button", { name: action.close, exact: true }).click();
  const discard = page.getByRole("alertdialog");
  await discard.waitFor();
  await page.waitForTimeout(220);
  // A synchronous DOM click avoids Playwright waiting for the exit to complete.
  await discard.getByRole("button", { name: m.composer.discard, exact: true }).evaluate((n) => n.click());
  await page.waitForTimeout(45);
  const evidence = await sheet.evaluate((n) => ({
    state: n.dataset.state,
    animation: getComputedStyle(n).animationName,
    duration: getComputedStyle(n).animationDuration,
    opacity: getComputedStyle(n).opacity,
    transform: getComputedStyle(n).transform,
    animations: n.getAnimations().map((a) => ({ state: a.playState, time: a.currentTime })),
  }));
  assert.equal(evidence.state, "closed", "closed content stays mounted");
  assert.equal(evidence.animation, "exit");
  assert.equal(evidence.duration, "0.2s");
  assert.ok(evidence.animations.some((a) => a.state === "running"));
  await writeFile(path.join(out, `exit-${viewport}-${locale}-${theme}.json`), JSON.stringify(evidence, null, 2));
  await page.screenshot({ path: path.join(out, `exit-${viewport}-${locale}-${theme}.png`) });
  await sheet.waitFor({ state: "hidden" });
  if (viewport === "desktop" && locale === "en" && theme === "light") {
    const shared = {};
    const inspectExit = async (locator, key) => {
      await page.waitForTimeout(40);
      shared[key] = await locator.evaluate((n) => ({
        state: n.dataset.state, name: getComputedStyle(n).animationName,
        duration: getComputedStyle(n).animationDuration,
        easing: getComputedStyle(n).animationTimingFunction,
        search: n.querySelector('input[type="search"]')?.value,
      }));
      assert.equal(shared[key].state, "closed");
      assert.equal(shared[key].name, "exit");
      assert.equal(shared[key].duration, "0.2s");
      if (key === "dialog") assert.equal(shared[key].search, "نورة", "picker preserves its search during exit");
      await locator.waitFor({ state: "hidden" });
    };
    await page.getByRole("button", { name: m.newEmail, exact: true }).click();
    await page.waitForTimeout(220);
    await sheet.getByRole("button", { name: name(m.composer.to), exact: true }).click();
    const popover = page.locator('[data-slot="popover-content"]');
    await popover.waitFor();
    await page.waitForTimeout(220);
    await page.keyboard.press("Escape");
    await inspectExit(popover, "popover");
    await sheet.getByRole("button", { name: m.recipients.pickMembers, exact: true }).first().click();
    const dialog = page.locator('[data-slot="dialog-content"]');
    await dialog.waitFor();
    await page.waitForTimeout(220);
    await dialog.getByRole("searchbox").fill("نورة");
    await page.waitForTimeout(350);
    await dialog.getByRole("button", { name: action.cancel, exact: true }).evaluate((n) => n.click());
    await inspectExit(dialog, "dialog");
    await sheet.locator("#composer-subject").fill("Unsaved draft");
    await sheet.getByRole("button", { name: action.close, exact: true }).click();
    const alert = page.locator('[data-slot="alert-dialog-content"]');
    await alert.waitFor();
    await page.waitForTimeout(220);
    await alert.getByRole("button", { name: m.composer.keepWriting, exact: true }).evaluate((n) => n.click());
    await inspectExit(alert, "alertDialog");
    await writeFile(path.join(out, "shared-exits.json"), JSON.stringify(shared, null, 2));
    await sheet.getByRole("button", { name: action.close, exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: m.composer.discard, exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
  }
  // Reduced motion closes without any spatial animation or an orphaned overlay.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: m.newEmail, exact: true }).click();
  assert.equal(await sheet.evaluate((n) => getComputedStyle(n).animationName), "none");
  await sheet.getByRole("button", { name: action.close, exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  await page.waitForTimeout(50);
  assert.equal(await page.getByRole("button", { name: m.newEmail, exact: true }).evaluate((node) => node === document.activeElement), true, "composer restores focus");
  await page.getByRole("button", { name: m.newEmail, exact: true }).click();
  await sheet.locator("#composer-always").fill("still-fixing@");
  await sheet.getByRole("button", { name: action.close, exact: true }).click();
  await page.getByRole("alertdialog").waitFor();
  await page.getByRole("alertdialog").getByRole("button", { name: m.composer.discard, exact: true }).click();
  await sheet.waitFor({ state: "hidden" });
  if (viewport === "desktop" && locale === "en" && theme === "light") {
    for (const [eligible, remaining] of [[0, 0], [1, 1], [3951, 0]]) {
      await page.route("**/emails/blast/eligible-count*", (route) => route.fulfill({ json: { eligible_count: eligible, remaining_capacity: remaining } }));
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("button", { name: m.newEmail, exact: true }).click();
      await sheet.locator("#composer-count").waitFor();
      const control = sheet.getByRole("slider");
      assert.equal(await control.getAttribute("aria-valuenow"), String(Math.min(eligible, remaining)));
      assert.equal(await control.getAttribute("aria-valuemax"), String(Math.max(1, eligible)));
      assert.equal(await sheet.locator("#composer-count").inputValue(), String(Math.min(eligible, remaining)));
      if (eligible < 2) assert.equal(await control.getAttribute("aria-disabled"), "true");
      await shot(`capacity-${eligible}-${remaining}`);
      await sheet.getByRole("button", { name: action.close, exact: true }).click();
      await sheet.waitFor({ state: "hidden" });
      await page.unroute("**/emails/blast/eligible-count*");
    }
  }
}
