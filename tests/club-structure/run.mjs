// Invoked by Backend/tests/test_club_structure_browser.py against its isolated API.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium, request } from "playwright";
import { expect } from "playwright/test";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apiURL = process.env.CLUB_TEST_API;
assert.ok(apiURL && new URL(apiURL).hostname === "127.0.0.1", "Run through the isolated pytest fixture");
const refs = JSON.parse(process.env.CLUB_TEST_REFS);
const artifacts = process.env.CLUB_TEST_ARTIFACTS;
await mkdir(artifacts, { recursive: true });
const [alice, bob, carol, dana] = refs.members;
const departmentName = refs.prefix + " Lab";
const require = createRequire(import.meta.url);
const tailwind = require("@tailwindcss/postcss");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const css = await postcss([tailwind({ base: frontend })]).process(
  await readFile(path.join(frontend, "app/globals.css"), "utf8"),
  { from: path.join(frontend, "app/globals.css") },
);
const bundle = await build({
  entryPoints: [path.join(frontend, "tests/club-structure/entry.jsx")],
  bundle: true,
  write: false,
  format: "esm",
  jsx: "automatic",
  alias: {
    "@": frontend,
    "@clerk/nextjs": path.join(frontend, "tests/club-structure/clerk.jsx"),
    "next/link": path.join(frontend, "tests/club-structure/navigation.jsx"),
    "next/navigation": path.join(frontend, "tests/club-structure/navigation.jsx"),
  },
  define: {
    "process.env": JSON.stringify({
      NODE_ENV: "development",
      NEXT_PUBLIC_BACKEND_API_URL: apiURL,
      NEXT_PUBLIC_THIS_APP_URL: "http://app.example.test",
      NEXT_PUBLIC_MEMBER_APP_URL: "http://members.example.test",
      NEXT_PUBLIC_UPLOAD_SOURCE: "test",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test",
      NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL: "http://sheets.example.test",
    }),
  },
});
const server = createServer((req, res) => {
  if (req.url === "/app.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].contents);
  } else if (req.url === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css.css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
    );
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseURL = `http://127.0.0.1:${server.address().port}`;
let browser;
let api;
let page;
const errors = [];
try {
  browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
  });
  api = await request.newContext({
    baseURL: apiURL,
    extraHTTPHeaders: { Authorization: "Bearer browser-super_admin" },
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text());
  });
  const read = async (url) => {
    const response = await api.get(url);
    assert.equal(response.status(), 200, await response.text());
    return response.json();
  };
  const semester = refs.semester;
  const scope = (departmentId, semesterId = semester.id) =>
    `/club-structure/semesters/${semesterId}/departments/${departmentId}`;
  const roleUrl = (departmentId, member, role) => `${scope(departmentId)}/members/${member.id}/roles/${role}`;
  const rosterOf = async (departmentId, semesterId = semester.id) =>
    Object.fromEntries(
      (await read(`/club-structure/departments/${departmentId}/roster?semester_id=${semesterId}`)).map((entry) => [
        entry.member.id,
        [...entry.roles].sort(),
      ]),
    );
  const region = (name) => page.getByRole("region", { name, exact: true });
  const click = (name) => page.getByRole("button", { name, exact: true }).click();
  const openCreate = async (ar = false) => {
    await page.getByRole("link", { name: ar ? "قسم جديد" : "New Department", exact: true }).click();
    await expect(page).toHaveURL(/\/club-structure\/create(?:\?|$)/);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  };
  const backToOverview = async (ar = false) => {
    await page.getByRole("link", { name: ar ? "رجوع" : "Back", exact: true }).click();
    await expect(page.getByRole("button", { name: ar ? "تحديث" : "Refresh", exact: true })).toBeEnabled();
  };
  const tab = (name) => page.getByRole("tab", { name, exact: true }).click();
  const settledTabs = async () => {
    const triggers = page.getByRole("dialog").getByRole("tab");
    for (const trigger of await triggers.all()) {
      if ((await trigger.getAttribute("aria-selected")) === "false") {
        await expect(trigger).toHaveCSS("border-bottom-color", "rgba(0, 0, 0, 0)");
      }
    }
  };
  const checkDrawerTabAlignment = async () => {
    const list = page.getByRole("dialog").getByRole("tablist");
    const bounds = await list.boundingBox();
    const tabs = await list.getByRole("tab").all();
    for (const item of tabs) {
      const tabBounds = await item.boundingBox();
      assert.ok(
        Math.abs(tabBounds.y + tabBounds.height - bounds.y - bounds.height) <= 1,
        "Underline aligns with the divider",
      );
      assert.ok(
        Math.abs(tabBounds.width - bounds.width / tabs.length) <= 1,
        "Each tab spans an equal share of the divider",
      );
    }
  };
  const choose = async (name) => {
    const picker = page.getByRole("dialog").last();
    await picker
      .getByRole("button")
      .filter({ has: page.getByText(name, { exact: true }) })
      .click();
    await picker.getByRole("button", { name: "Select member", exact: true }).click();
  };
  const confirm = async () => {
    await click("Confirm");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  };
  const open = async (query = "") => {
    await page.goto(baseURL + "/" + query);
    await expect(
      page.getByRole("button", {
        name: query.includes("locale=ar") ? "تحديث" : "Refresh",
        exact: true,
      }),
    ).toBeEnabled();
  };
  await open();
  await expect(page.locator("dl dd")).toHaveCount(3);
  await expect(page.getByRole("combobox", { name: "Semester", exact: true })).toContainText(semester.name);
  // The Board is an ordinary department that is left out of the ranking.
  const boardCard = page.locator("article").filter({ hasText: refs.prefix + " Board" });
  await expect(boardCard.getByText("Not ranked", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage Leadership", exact: true })).toBeVisible();
  await click("Manage " + refs.prefix + " Board");
  await checkDrawerTabAlignment();
  await click("Close");

  await openCreate();
  await page.getByLabel("English name", { exact: true }).fill(departmentName);
  await page.getByLabel("Arabic name", { exact: true }).fill("مختبر النادي");
  const departmentType = page.getByRole("radiogroup", { name: "Type", exact: true });
  await expect(departmentType.getByRole("radio", { name: "Administrative", exact: true })).toBeChecked();
  const specializedType = departmentType.getByRole("radio", { name: "Specialized", exact: true });
  await specializedType.click();
  await specializedType.click();
  await expect(specializedType).toBeChecked();
  await departmentType.getByRole("radio", { name: "Administrative", exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(specializedType).toBeFocused();
  await page.keyboard.press("Space");
  await expect(specializedType).toBeChecked();
  await expect(page.getByRole("switch", { name: "Show in the department leaderboard" })).toBeChecked();
  const iconOptions = page.getByRole("button", { name: /^Select icon / });
  await expect(iconOptions).toHaveCount(21);
  for (const option of await iconOptions.all()) {
    await expect(option.locator("svg")).toHaveCount(1);
    await expect(option).toHaveText("");
  }
  await click("Select icon Development");
  await expect(page.getByRole("button", { name: "Select icon Development", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.screenshot({ path: path.join(artifacts, "create-department-en-dark.png") });
  await click("Create Department");
  await expect(page.getByRole("heading", { name: departmentName, exact: true })).toBeVisible();
  await expect(page.getByText("This department has no members yet.", { exact: true })).toBeVisible();
  const overview = await read("/club-structure");
  const department = overview.departments.find((d) => d.name === departmentName);
  assert.equal(department.type, "practical");
  assert.equal(department.icon, "code2");
  assert.equal(department.show_in_leaderboard, true);
  const deptPath = `/club-structure/departments/${department.id}`;
  assert.equal(Math.round((await page.locator('[data-slot="sheet-content"]').boundingBox()).width), 480);
  for (const person of [alice, bob]) {
    await click("Add member");
    await choose(person.name);
    await expect(page.getByRole("button", { name: "Remove " + person.name, exact: true })).toBeEnabled();
  }
  await tab("Leadership");
  for (const [role, person] of [
    ["Leader", alice],
    ["VP", bob],
  ]) {
    await region(role).getByRole("button", { name: "Assign", exact: true }).click();
    await choose(person.name);
    await confirm();
  }
  await region("Leader").getByRole("button", { name: "Replace", exact: true }).click();
  await choose(carol.name);
  await confirm();
  // Leaders and VPs are members too, in their own rows; the replaced leader stays a member.
  assert.deepEqual(await rosterOf(department.id), {
    [alice.id]: ["member"],
    [bob.id]: ["member", "vp"],
    [carol.id]: ["leader", "member"],
  });
  await region("VP").getByRole("button", { name: "Clear", exact: true }).click();
  await confirm();
  assert.deepEqual((await rosterOf(department.id))[bob.id], ["member"]);
  await tab("Roster");
  await click("Remove " + bob.name);
  await confirm();
  assert.equal(Object.keys(await rosterOf(department.id)).length, 2);
  await click("Close");

  // The presidents are the two leaders of the Leadership department.
  const leadership = overview.departments.find((d) => d.is_club_leadership);
  await click("Manage Leadership");
  await tab("Leadership");
  for (const person of [carol, dana]) {
    await region("Leader").getByRole("button", { name: "Assign", exact: true }).click();
    await choose(person.name);
    await confirm();
  }
  await expect(region("Leader").getByRole("button", { name: "Assign", exact: true })).toHaveCount(0);
  assert.deepEqual(await rosterOf(leadership.id), { [carol.id]: ["leader", "member"], [dana.id]: ["leader", "member"] });
  await click("Close");
  await click("Manage " + refs.prefix + " Board");
  await click("Add member");
  await choose(carol.name);
  await expect(page.getByRole("button", { name: "Remove " + carol.name, exact: true })).toBeEnabled();
  await click("Close");
  assert.equal((await read("/club-structure")).total_members, 3);
  const publicView = await read("/club-structure/public");
  assert.deepEqual([...publicView.presidents].sort(), [carol.name, dana.name].sort());
  assert.ok(!publicView.departments.some((d) => d.id === leadership.id), "Leadership is shown as the presidents");
  console.log("PASS: creation, roster and roles, leaders as explicit members, two Leadership leaders, Board roster");

  // Keep an open picker based on one holder while a different HTTP caller replaces them.
  await click("Manage " + departmentName);
  await tab("Leadership");
  await region("Leader").getByRole("button", { name: "Replace", exact: true }).click();
  const winning = await api.put(roleUrl(department.id, alice, "leader"), { data: { replaces_member_id: carol.id } });
  assert.equal(winning.status(), 200, await winning.text());
  await choose(dana.name);
  await click("Confirm");
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText("The data changed");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Confirm", exact: true })).toBeDisabled();
  await click("Cancel");
  await expect(region("Leader")).toContainText(alice.name);
  const races = await Promise.all(
    [bob, dana].map((person) => api.put(roleUrl(department.id, person, "vp"), { data: {} })),
  );
  assert.deepEqual(races.map((r) => r.status()).sort(), [200, 409]);
  const afterRace = await rosterOf(department.id);
  assert.equal(Object.values(afterRace).filter((roles) => roles.includes("vp")).length, 1);
  // Whoever lost the race is not on this roster, so the picker still offers them.
  const outsider = [bob, dana].find((person) => !(person.id in afterRace));
  const history = (await read(`/club-structure/history?semester_id=${semester.id}&department_id=${department.id}&limit=100`)).items;
  assert.ok(history.some((change) => change.action === "removed" && change.role.key === "leader"));
  console.log("PASS: stale browser confirmation gets a real 409; competing grants keep one winner; changes are logged");

  await tab("Settings");
  await page.getByLabel("English name", { exact: true }).fill(departmentName + " Updated");
  await click("Select icon Partnerships");
  await click("Save Changes");
  await expect(page.getByRole("heading", { name: departmentName + " Updated", exact: true })).toBeVisible();
  assert.equal((await read(deptPath)).icon, "handshake");
  const roster = await rosterOf(department.id);
  for (let cycle = 0; cycle < 2; cycle++) {
    await click("Archive Department");
    await confirm();
    assert.deepEqual(await rosterOf(department.id), roster);
    // Archiving changes nothing in the semester; it only stops the department joining new ones.
    const archived = (await read("/club-structure")).departments.find((d) => d.id === department.id);
    assert.equal(archived.active, false);
    assert.equal((await api.post(scope(department.id, refs.future.id))).status(), 409);
    await click("Restore Department");
    await confirm();
    assert.deepEqual(await rosterOf(department.id), roster);
  }
  await click("Close");
  await page.screenshot({ path: path.join(artifacts, "desktop.png"), fullPage: true });
  console.log("PASS: archive/restore keeps the roster and blocks joining new semesters");

  // Start the empty future semester from this one.
  await page.getByRole("combobox", { name: "Semester", exact: true }).click();
  await page.getByRole("option", { name: new RegExp("^" + refs.future.name) }).click();
  await expect(page.getByRole("heading", { name: `${refs.future.name} has no roster yet`, exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Copy from…", exact: true }).click();
  await page.getByRole("option", { name: new RegExp("^" + semester.name) }).click();
  await click("Copy structure");
  await confirm();
  await expect(page.getByRole("button", { name: "Manage " + departmentName + " Updated", exact: true })).toBeVisible();
  assert.deepEqual(await rosterOf(department.id, refs.future.id), await rosterOf(department.id));
  assert.equal((await api.post(`/club-structure/semesters/${refs.future.id}/copy-from/${semester.id}`)).status(), 409);
  console.log("PASS: copying a semester's structure into an empty one, refused once it has a roster");

  for (const role of ["admin", "admin_points"]) {
    await open("?role=" + role);
    await expect(page.getByRole("link", { name: "New Department", exact: true })).toHaveCount(0);
    await click("View " + departmentName + " Updated");
    await tab("Settings");
    await expect(page.getByLabel("English name", { exact: true })).toBeDisabled();
    for (const option of await page.getByRole("radiogroup", { name: "Type", exact: true }).getByRole("radio").all()) {
      await expect(option).toBeDisabled();
    }
    const forbidden = await api.post(deptPath + "/archive", { headers: { Authorization: `Bearer browser-${role}` } });
    assert.equal(forbidden.status(), 403);
    await page.goto(baseURL + "/club-structure/create?role=" + role);
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Create Department", exact: true })).toHaveCount(0);
  }
  for (const role of ["member", "invalid"]) {
    const denied = await api.get("/club-structure", { headers: { Authorization: `Bearer browser-${role}` } });
    assert.equal(denied.status(), role === "member" ? 403 : 401);
  }
  console.log("PASS: real guards enforce read-only admin/points roles and deny member/invalid identities");

  await open("?locale=ar&theme=dark");
  await page.screenshot({ path: path.join(artifacts, "overview-ar-desktop.png"), fullPage: true });
  await openCreate(true);
  const createCard = page.locator('[data-slot="card"]');
  await expect(createCard).toHaveCSS("max-width", "672px");
  await expect(createCard).toHaveCSS("position", "static");
  // Resolve --card through a probe so the comparison does not depend on how
  // the token is written (hex, rgb, oklch) versus how computed colours print.
  assert.equal(
    await createCard.evaluate((el) => getComputedStyle(el).backgroundColor),
    await createCard.evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = "var(--card)";
      el.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    }),
    "Create page uses the same Card background as Create Event",
  );
  await page.screenshot({ path: path.join(artifacts, "create-ar-desktop.png"), fullPage: true });
  await backToOverview(true);

  for (const locale of ["en", "ar"])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(`?locale=${locale}&theme=${theme}`);
      const ar = locale === "ar";
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(artifacts, `overview-${locale}-${theme}.png`), fullPage: true });
      await openCreate(ar);
      const createForm = page.locator("form");
      const createIcons = createForm.getByRole("button", { name: ar ? /^اختيار الأيقونة / : /^Select icon / });
      await expect(createIcons).toHaveCount(21);
      for (const option of await createIcons.all()) await expect(option).toHaveText("");
      const typeToggle = createForm.getByRole("radiogroup", { name: ar ? "النوع" : "Type", exact: true });
      await expect(typeToggle.getByRole("radio")).toHaveCount(2);
      const administrative = typeToggle.getByRole("radio", { name: ar ? "إداري" : "Administrative", exact: true });
      const practical = typeToggle.getByRole("radio", { name: ar ? "تخصصي" : "Specialized", exact: true });
      await administrative.click();
      await page.keyboard.press(ar ? "ArrowLeft" : "ArrowRight");
      await expect(practical).toBeFocused();
      await page.keyboard.press("Space");
      await expect(practical).toBeChecked();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const createBounds = await page.locator('[data-slot="card"]').boundingBox();
      assert.ok(createBounds.x >= 0 && createBounds.x + createBounds.width <= 321);
      await page.screenshot({ path: path.join(artifacts, `create-${locale}-${theme}.png`), fullPage: true });
      const submitCreate = createForm.getByRole("button", { name: ar ? "أنشئ القسم" : "Create Department", exact: true });
      await submitCreate.scrollIntoViewIfNeeded();
      await expect(submitCreate).toBeInViewport();
      await backToOverview(ar);
      await click(ar ? "إدارة مختبر النادي" : "Manage " + departmentName + " Updated");
      const drawerTabs = page.getByRole("dialog").getByRole("tab");
      await expect(drawerTabs).toHaveCount(3);
      await checkDrawerTabAlignment();
      for (const item of await drawerTabs.all()) await expect(item.locator("svg")).toHaveCount(1);
      await tab(ar ? "الإعدادات" : "Settings");
      await settledTabs();
      await expect(
        page.getByRole("dialog").getByRole("button", {
          name: ar ? "اختيار الأيقونة الشراكات" : "Select icon Partnerships",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.screenshot({ path: path.join(artifacts, `settings-${locale}-${theme}.png`) });
      await tab(ar ? "الأعضاء" : "Roster");
      await expect(page.locator('[data-slot="sheet-content"]')).toHaveAttribute("data-side", ar ? "left" : "right");
      await click(ar ? "إضافة عضو" : "Add member");
      await expect(page.getByRole("dialog").last().getByText(outsider.name, { exact: true })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const dialog = page.getByRole("dialog").last();
      // On a phone the picker is a bottom sheet that slides up; measure where
      // it comes to rest, not a frame of the slide.
      await dialog.evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 321 && bounds.y >= 0 && bounds.y + bounds.height <= 641);
      await page.screenshot({ path: path.join(artifacts, `picker-${locale}-${theme}.png`) });
    }
  console.log("PASS: page/drawer flows, 480px desktop drawer, English/Arabic mobile and light/dark themes");
  assert.deepEqual(errors, [], "Browser console/runtime errors");
} catch (error) {
  if (page) await page.screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await api?.dispose();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
