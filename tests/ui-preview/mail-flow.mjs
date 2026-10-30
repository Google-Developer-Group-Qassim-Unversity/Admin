// Browser regression checks against the real Mail components and preview API fixtures.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import mail from "./fixtures/mail.mjs";

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
      const olderCount = requests.filter((r) => new URL(r.url()).searchParams.has("before")).length;
      const heads = requests.filter((r) => new URL(r.url()).pathname === "/emails/sends" && !new URL(r.url()).searchParams.has("before")).length;
      await page.waitForTimeout(4200);
      assert.equal(requests.filter((r) => new URL(r.url()).searchParams.has("before")).length, olderCount, "polling leaves older pages alone");
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
    await button(sheet(), m.details.useAsStart).click();
    assert.ok(await sheet().locator("#composer-subject").inputValue(), "reuse prefilled subject");
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
    assert.ok((await confirm.innerText()).includes("2,184") || (await confirm.innerText()).includes("2184"), "confirmation shows the capped total");
    await capture("confirm");
    await button(confirm, m.composer.confirmSend).click();
    await sheet().waitFor({ state: "hidden" });
    const blast = requests.find((r) => r.url().endsWith("/emails/blast"));
    assert.equal(blast?.postDataJSON().count, 2183, "reserves capacity for the guaranteed address");
    assert.equal(blast.postDataJSON().guaranteed_recipients.length, 1);
    await main.getByText("Mail regression check", { exact: true }).waitFor();

    await button(main, m.newEmail).click();
    await sheet().getByRole("radio", { name: m.composer.audience.people, exact: true }).click();
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
    console.log(`  Mail flow assertions passed (${viewport}, ${locale}, ${theme})`);
  } finally {
    page.off("request", record);
  }
}
