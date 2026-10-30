// Browser regression checks against the real Mail components and preview API fixtures.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import mail, { queue, finish } from "./fixtures/mail.mjs";

const messages = Object.fromEntries(await Promise.all(["ar", "en"].map(async (l) => [l, JSON.parse(await readFile(new URL(`../../messages/${l}.json`, import.meta.url), "utf8"))])));

export default async function exercise({ page, locale, theme, viewport, out }) {
  const m = messages[locale].manageEmails;
  const actions = messages[locale].common.actions;
  const requests = [];
  const record = (request) => { if (request.url().startsWith("http://api.test/")) requests.push(request); };
  page.on("request", record);
  const main = page.locator("main");
  const sheet = () => page.locator('[data-slot="sheet-content"]');
  const button = (root, name) => root.getByRole("button", { name, exact: true });
  // Single-choice ToggleGroup items expose radio semantics.
  const filter = async (label) => { await main.getByRole("radio", { name: label, exact: true }).click(); await page.waitForTimeout(100); };
  const capture = async (state) => {
    await page.waitForTimeout(350); // Let a sheet finish sliding in.
    if (viewport !== "desktop") {
      const small = await page.locator('main button, [data-slot="sheet-content"] button, [role="alertdialog"] button').evaluateAll((nodes) =>
        // A feed row's button stretches over the whole row, so the row is the target.
        nodes.filter((n) => n.checkVisibility() && (n.closest("section li") ?? n).getBoundingClientRect().height < 44).map((n) => `${n.getAttribute("aria-label") || n.innerText}: ${n.getBoundingClientRect().height}`));
      assert.deepEqual(small, [], `${state}: targets under 44px`);
    }
    const overflow = await page.evaluate(() => ({ width: innerWidth, actual: document.documentElement.scrollWidth }));
    assert.ok(overflow.actual <= overflow.width, `${state}: horizontal overflow`);
    const modalOverflow = await sheet().evaluateAll((nodes) => nodes.some((node) => node.scrollWidth > node.clientWidth));
    assert.equal(modalOverflow, false, `${state}: drawer overflow`);
    await page.screenshot({ path: path.join(out, `${state}-${viewport}-${locale}-${theme}.png`) });
  };
  const close = async () => { await button(sheet(), actions.close).click(); await sheet().waitFor({ state: "hidden" }); };
  const row = (subject) => main.locator("li button").filter({ hasText: subject });
  // A send's details, at the top of the drawer and scrolled to one of its sections.
  const drawer = async (state, section) => {
    await capture(state);
    await sheet().locator(section).scrollIntoViewIfNeeded();
    await capture(`${state}-section`);
  };
  try {
    await main.locator("li button").first().waitFor();

    // API times are naive Riyadh-local: the same wall clock and calendar day on any device.
    const newest = mail[0].body({ query: {} }).items[0];
    const [hours, minutes] = newest.created_at.slice(11, 16).split(":");
    const time = `${Number(hours) % 12 || 12}:${minutes}`;
    assert.ok((await main.locator("section li").first().innerText()).includes(time), `newest row shows ${time}`);
    assert.equal(await main.locator("section h3").first().innerText(), m.feed.today, "day groups follow Riyadh's calendar");

    await main.getByRole("button", { name: m.feed.showMore, exact: true }).click();
    await page.waitForTimeout(100);
    assert.ok(requests.some((r) => new URL(r.url()).searchParams.has("before")), "loads the next cursor");
    if (viewport === "phone-small" && locale === "ar" && theme === "light") {
      const olderCursor = new URL(requests.find((r) => new URL(r.url()).searchParams.has("before")).url()).searchParams.get("before");
      const olderCount = requests.filter((r) => new URL(r.url()).searchParams.get("before") === olderCursor).length;
      const heads = requests.filter((r) => new URL(r.url()).pathname === "/emails/sends" && !new URL(r.url()).searchParams.has("before")).length;
      const idsBefore = await main.locator("li[data-send-id]").evaluateAll((rows) => rows.map((r) => r.dataset.sendId));
      for (let i = 0; i < 35; i++) queue("event-certificate", { recipients: [{}], subject: "Polling regression" });
      const oldActive = mail[0].body({ query: { before: "370" } }).items.find((s) => s.status === "running");
      finish(oldActive.id);
      await page.waitForTimeout(4200);
      const idsAfter = await main.locator("li[data-send-id]").evaluateAll((rows) => rows.map((r) => r.dataset.sendId));
      assert.ok(idsBefore.every((id) => idsAfter.includes(id)), "new head preserves every loaded row");
      assert.equal(idsAfter.length, idsBefore.length + 35, "more than a page of new sends has no gaps or duplicates");
      assert.equal(new Set(idsAfter).size, idsAfter.length, "loaded IDs stay unique");
      assert.equal(await main.locator(`li[data-send-id="${oldActive.id}"] [role="progressbar"]`).count(), 0, "older active send refreshes to finished");
      assert.equal(requests.filter((r) => new URL(r.url()).searchParams.get("before") === olderCursor).length, olderCount, "polling leaves older pages alone");
      assert.ok(requests.filter((r) => new URL(r.url()).pathname === "/emails/sends" && !new URL(r.url()).searchParams.has("before")).length > heads, "active sends poll the first page");
    }

    const lookup = main.getByRole("combobox");
    await lookup.fill("outside@example.com");
    await lookup.press("Enter");
    await main.getByText(/outside@example.com/, { exact: false }).first().waitFor();
    await main.getByText(m.feed.emptyPerson.split("{name}")[0], { exact: false }).waitFor();
    await capture("empty");
    assert.ok(requests.some((r) => new URL(r.url()).searchParams.get("email") === "outside@example.com"), "raw email lookup");
    await button(main, m.lookup.clear).click();
    await lookup.fill("نورة");
    await page.waitForTimeout(400);
    await lookup.press("ArrowDown");
    await lookup.press("Enter");
    await button(main, m.lookup.clear).waitFor();
    await capture("person");
    assert.ok(requests.some((r) => new URL(r.url()).searchParams.has("member_id")), "member lookup");
    await button(main, m.lookup.clear).click();

    await main.locator("li button").first().click();
    await sheet().getByRole("progressbar").waitFor();
    await capture("sending");
    await close();

    await filter(m.filters.certificate);
    // Finished certificate jobs retain all attendees in total, including skipped ones.
    const certificates = mail[0].body({ query: { kind: "certificate", limit: "100" } }).items;
    while (await button(main, m.feed.showMore).count()) {
      await button(main, m.feed.showMore).click();
      await page.waitForTimeout(100);
    }
    for (const succeeded of [1, 0]) {
      const sample = certificates.find((s) => s.status === "succeeded" && s.succeeded === succeeded);
      const title = main.locator("li button").filter({ hasText: sample.event.name }).first();
      const certificateRow = title.locator("xpath=ancestor::li");
      assert.ok(!(await certificateRow.innerText()).includes(String(sample.total)), "finished count excludes skipped attendees");
      if (!succeeded) assert.ok((await certificateRow.innerText()).includes(locale === "ar" ? "ما فيه مستلمين" : "No recipients"));
      await title.click();
      const summaryCount = sheet().locator("dt").filter({ hasText: m.details.recipientsCount }).locator("xpath=following-sibling::dd[1]");
      assert.equal(await summaryCount.innerText(), succeeded ? "1" : locale === "ar" ? "ما فيه مستلمين" : "No recipients");
      assert.equal(await sheet().getByRole("progressbar").count(), 0, "finished sends have no unfinished progress");
      await close();
    }
    await main.locator("li").filter({ hasText: messages[locale].manageEmails.status.failedFor.replace("{count}", "2") }).locator("button").first().click();
    await sheet().getByText(m.details.certificateNoBody, { exact: true }).waitFor();
    await button(sheet(), m.details.retry).waitFor();
    await drawer("partial", "#send-failures");
    await button(sheet(), m.details.retry).click();
    const retry = page.getByRole("alertdialog");
    await retry.waitFor();
    await capture("retry");
    await button(retry, m.details.retry).click();
    await page.waitForTimeout(200);
    assert.ok(requests.some((r) => r.method() === "POST" && /\/emails\/\d+$/.test(new URL(r.url()).pathname)), "retry posts to the event");
    await close();

    await filter(m.filters.eventMessage);
    const eventTitle = row("Upgrade Your GPA");
    assert.ok(!(await eventTitle.innerText()).includes("["), "feed personalizes the display subject");
    await eventTitle.click();
    assert.ok(!(await sheet().innerText()).includes("[Name]"), "drawer removes recipient template token");
    assert.ok(!(await sheet().innerText()).includes("[Event Name]"), "drawer resolves event template token");
    await close();
    await row("micro:bit").click();
    await button(sheet(), m.details.copyAddresses).waitFor();
    assert.equal(await button(sheet(), m.details.retry).count(), 0, "only event certificates can be retried");
    await sheet().getByText(m.details.incompleteFailures.match(/other \{([^}]*)\}/)[1].replace("#", "140"), { exact: true }).waitFor();
    await capture("copy");
    await close();

    await filter(m.filters.teamNotification);
    await main.locator("li button").first().waitFor();
    await capture("team");

    await filter(m.filters.teamNotification);
    assert.ok((await main.innerText()).includes("طلب فعالية رجع لك"), "team filter includes notifications");
    await filter(m.filters.campaign);
    if (viewport === "phone-small" && locale === "ar" && theme === "light") {
      const beforeIdle = requests.filter((r) => new URL(r.url()).pathname === "/emails/sends").length;
      await page.waitForTimeout(4200);
      assert.equal(requests.filter((r) => new URL(r.url()).pathname === "/emails/sends").length, beforeIdle, "terminal sends do not poll");
    }
    await main.locator("li button").first().click();
    await sheet().getByText(m.details.noContent, { exact: true }).waitFor();
    await sheet().getByText(m.details.noFailures, { exact: true }).waitFor();
    assert.equal(await sheet().locator("iframe").count(), 0, "historical null content has no empty iframe");
    await capture("historical");
    await close();
    await main.locator("li button").last().click();
    await button(sheet(), m.details.showAll.replace("{count}", "140")).waitFor();
    await button(sheet(), m.details.showAll.replace("{count}", "140")).click();
    assert.equal(await sheet().locator("#send-recipients").count(), 1);
    assert.equal(await sheet().locator('section[aria-labelledby="send-recipients"] ul li').count(), 140, "show all expands the recipient list");
    await sheet().getByRole("searchbox").fill("not-a-recipient");
    await sheet().getByText(m.details.noMatch, { exact: true }).waitFor();
    await capture("campaign");
    const loggedHtml = await sheet().locator("iframe").getAttribute("srcdoc");
    assert.ok(!/<script|\son\w+=|javascript:|<iframe|http-equiv|<form/i.test(loggedHtml), "logged HTML is sanitized");
    assert.equal(await sheet().locator("iframe").getAttribute("sandbox"), "", "logged HTML has an opaque sandbox");
    await button(sheet(), m.details.useAsStart).click();
    assert.ok((await sheet().locator("#composer-subject").inputValue()).includes("[Name]"), "reuse keeps raw recipient token");
    assert.ok((await sheet().locator("#composer-subject").inputValue()).includes("[Event Name]"), "reuse keeps raw event token");
    assert.ok(await sheet().locator("#composer-html").inputValue(), "reuse prefilled HTML");
    assert.equal(await sheet().getByText("خريطة-المعرض.pdf", { exact: true }).count(), 1, "reuse includes attachments");
    await close();

    await filter(m.filters.direct);
    await main.locator("li button").first().click();
    await sheet().getByText(m.details.noContent, { exact: true }).waitFor();
    assert.equal(await sheet().locator("iframe").count(), 0, "null html with known subject has no frame");
    await close();
    await filter(m.filters.all);
    await page.route("**/emails/sends?*", (route) => route.fulfill({ status: 500, contentType: "application/json", body: "{}" }));
    await lookup.fill("broken@example.com");
    await lookup.press("Enter");
    await main.getByRole("alert").waitFor({ timeout: 15_000 });
    await capture("error");
    await page.unroute("**/emails/sends?*");
    await button(main, m.lookup.clear).click();

    await button(main, m.issueCertificate).click();
    await sheet().getByRole("tab").first().waitFor();
    await capture("certificate");
    await close();

    await button(main, m.newEmail).click();
    await sheet().locator("#composer-count").waitFor();
    await capture("composer-top");
    await button(sheet(), m.composer.designFiles).click();
    await page.getByRole("menuitem", { name: m.composer.files.officialAr, exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await page.waitForTimeout(150); // Let the menu restore focus before filling fields.
    assert.equal(await sheet().locator("#composer-count").inputValue(), "2184", "defaults to remaining capacity");
    await sheet().locator("#composer-count").fill("9999");
    await sheet().locator("#composer-always").fill("always@example.com");
    await sheet().locator("#composer-always").press("Enter");
    await sheet().locator("#composer-subject").fill("Mail regression check");
    await sheet().locator("#composer-html").fill('<h1 onclick="alert(1)">Mail regression check</h1>');
    await button(sheet(), m.composer.test).click();
    await page.waitForTimeout(200);
    const test = requests.find((r) => r.url().endsWith("/emails/blast/test"));
    assert.deepEqual(test?.postDataJSON().test_emails, ["ibrahim@gdg-q.com"], "test uses the signed-in admin");
    assert.ok(!test.postDataJSON().html_content.includes("onclick"), "send strips event handlers");
    await capture("composer");
    if (viewport !== "desktop") {
      await sheet().getByRole("radio", { name: m.composer.preview, exact: true }).click();
      await sheet().locator("iframe").waitFor();
      await capture("composer-preview");
      await sheet().getByRole("radio", { name: m.composer.write, exact: true }).click();
    }
    await button(sheet(), actions.close).click();
    await page.getByRole("alertdialog").waitFor();
    await button(page.getByRole("alertdialog"), m.composer.keepWriting).click();
    const green = sheet().locator('button[data-variant="green"]');
    await green.click();
    const confirm = page.getByRole("alertdialog");
    await confirm.waitFor();
    assert.ok((await confirm.innerText()).includes("2,185") || (await confirm.innerText()).includes("2185"), "confirmation adds guaranteed recipients to the capped member count");
    await capture("confirm");
    await button(confirm, m.composer.confirmSend).click();
    await sheet().waitFor({ state: "hidden" });
    const blast = requests.find((r) => r.url().endsWith("/emails/blast"));
    assert.equal(blast?.postDataJSON().count, 2184, "caps the member pool independently of guaranteed addresses");
    assert.equal(blast.postDataJSON().guaranteed_recipients.length, 1);
    await main.getByText("Mail regression check", { exact: true }).waitFor();

    await button(main, m.newEmail).click();
    await sheet().getByRole("radio", { name: m.composer.audience.people, exact: true }).click();
    assert.equal(await sheet().getByText(m.composer.capacity.split("{remaining}")[0], { exact: false }).count(), 0, "direct sends show no capacity cap");
    await sheet().locator("#composer-people").fill("one@example.com, ONE@example.com; two@example.com");
    await sheet().locator("#composer-people").press("Enter");
    await sheet().locator("#composer-subject").fill("Direct regression check");
    await sheet().locator("#composer-html").fill("<p>Direct check</p>");
    await sheet().locator('button[data-variant="green"]').click();
    await button(page.getByRole("alertdialog"), m.composer.confirmSend).click();
    await sheet().waitFor({ state: "hidden" });
    const direct = requests.find((r) => r.url().endsWith("/emails/direct"));
    assert.equal(direct?.postDataJSON().recipients.length, 2, "direct paste deduplicates addresses");
    await button(main, m.newEmail).click();
    await sheet().locator("#composer-subject").fill("Discard me");
    await button(sheet(), actions.close).click();
    await button(page.getByRole("alertdialog"), m.composer.discard).click();
    await sheet().waitFor({ state: "hidden" });
    if (viewport === "phone-small" && locale === "ar" && theme === "light") {
      // Every visible job finishing must stop the timer, including older-page jobs.
      let history = mail[0].body({ query: {} });
      for (const item of history.items) if (["running", "queued"].includes(item.status)) finish(item.id);
      while (history.next_before) {
        history = mail[0].body({ query: { before: String(history.next_before) } });
        for (const item of history.items) if (["running", "queued"].includes(item.status)) finish(item.id);
      }
      await page.waitForTimeout(4500);
      const finishedRequests = requests.filter((r) => new URL(r.url()).pathname === "/emails/sends").length;
      await page.waitForTimeout(4200);
      assert.equal(requests.filter((r) => new URL(r.url()).pathname === "/emails/sends").length, finishedRequests, "polling stops once all loaded jobs finish");

      const accessUrl = "**/access/me";
      const access = (permissions) => page.route(accessUrl, (route) => route.fulfill({
        json: { member_id: 1, is_staff: true, is_super_admin: false, semester: null, departments: [], permissions: ["admin.access", ...permissions] },
      }));
      await access(["emails.logs"]);
      await page.reload({ waitUntil: "networkidle" });
      await main.getByRole("combobox").waitFor();
      assert.equal(await button(main, m.newEmail).count(), 0, "log-only admin cannot compose");
      assert.equal(await button(main, m.issueCertificate).count(), 0, "manual certificates require permission");
      const memberRequests = requests.filter((r) => new URL(r.url()).pathname.startsWith("/members")).length;
      await main.getByRole("combobox").fill("نورة");
      await page.waitForTimeout(350);
      assert.equal(requests.filter((r) => new URL(r.url()).pathname.startsWith("/members")).length, memberRequests, "lookup does not call protected member search");
      await main.getByRole("combobox").fill("outside@example.com");
      await main.getByRole("combobox").press("Enter");
      await button(main, m.lookup.clear).waitFor();
      await page.unroute(accessUrl);

      await access(["emails.direct"]);
      await page.reload({ waitUntil: "networkidle" });
      await button(main, m.newEmail).click();
      assert.equal(await sheet().locator("#composer-count").count(), 0, "direct-only admin gets the people audience");
      assert.equal(await button(sheet(), m.composer.test).count(), 0, "blast test requires blast permission");
      assert.equal(await button(sheet(), m.recipients.pickMembers).count(), 0, "member picker requires members.view");
      assert.equal(await sheet().locator('input[type="file"]').count(), 0, "attachment upload requires uploads permission");
      await close();
      await page.unroute(accessUrl);

      await access(["emails.blast", "uploads"]);
      await page.route("**/emails/blast/eligible-count*", (route) => route.fulfill({ json: { eligible_count: 3951, remaining_capacity: 0 } }));
      await page.reload({ waitUntil: "networkidle" });
      await button(main, m.newEmail).click();
      await sheet().locator("#composer-count").waitFor();
      await sheet().locator("#composer-always").fill("first@example.com; second@example.com");
      await sheet().locator("#composer-always").press("Enter");
      await sheet().locator("#composer-subject").fill("Guaranteed overflow");
      await sheet().locator("#composer-html").fill("<p>Guaranteed overflow</p>");
      const sendButton = sheet().locator('button[data-variant="green"]');
      assert.ok(await sendButton.isEnabled(), "guaranteed recipients can exceed remaining capacity");
      await page.route("**/email-attachment", (route) => route.fulfill({ status: 400, json: { detail: "Upload failed" } }));
      const upload = sheet().locator('input[type="file"]');
      await upload.setInputFiles({ name: "failed.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
      await sheet().getByText(m.composer.attachmentFailed, { exact: true }).waitFor();
      assert.ok(await sendButton.isDisabled(), "failed attachments block sending");
      await button(sheet().locator('[data-slot="file-upload-item"]'), actions.remove).click();
      await page.unroute("**/email-attachment");
      await page.route("**/email-attachment", (route) => route.fulfill({ json: { filename: "guide.pdf", url: "https://example.com/guide.pdf", content_type: "application/pdf", size: 8 } }));
      await upload.setInputFiles({ name: "guide.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
      await page.waitForTimeout(200);
      const blastCount = requests.filter((r) => r.url().endsWith("/emails/blast")).length;
      await sendButton.click();
      assert.equal(requests.filter((r) => r.url().endsWith("/emails/blast")).length, blastCount, "confirmation opens before posting");
      await button(page.getByRole("alertdialog"), m.composer.confirmSend).click();
      await sheet().waitFor({ state: "hidden" });
      const overflow = requests.filter((r) => r.url().endsWith("/emails/blast")).at(-1).postDataJSON();
      assert.equal(overflow.count, 0, "zero-capacity blast selects no pool members");
      assert.equal(overflow.guaranteed_recipients.length, 2, "zero-capacity blast retains guaranteed recipients");
      assert.equal(overflow.attachments[0].filename, "guide.pdf", "uploaded attachment is included");
      await page.unroute("**/email-attachment");
      await page.unroute("**/emails/blast/eligible-count*");
      await page.unroute(accessUrl);
      await page.reload({ waitUntil: "networkidle" });
    }
    console.log(`  Mail flow assertions passed (${viewport}, ${locale}, ${theme})`);
  } finally {
    page.off("request", record);
  }
}
