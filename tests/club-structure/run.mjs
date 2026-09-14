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
  alias: { "@": frontend, "@clerk/nextjs": path.join(frontend, "tests/club-structure/clerk.jsx") },
  define: {
    "process.env": JSON.stringify({
      NODE_ENV: "development",
      NEXT_PUBLIC_BACKEND_API_URL: apiURL,
      NEXT_PUBLIC_AUTH_FRONTEND_URL: "http://auth.example.test",
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
  const putSeat = (url, member, expected) =>
    api.put(url, { data: { member_id: member, expected_assignment_id: expected } });
  const click = (name) => page.getByRole("button", { name, exact: true }).click();
  const tab = (name) => page.getByRole("tab", { name, exact: true }).click();
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
      page.getByRole("button", { name: query.includes("locale=ar") ? "تحديث" : "Refresh", exact: true }),
    ).toBeEnabled();
  };
  await open();
  await expect(page.locator("dl dd")).toHaveCount(4);
  await expect(page.getByRole("region", { name: /^President · Seat/ })).toHaveCount(2);
  await click("Manage " + refs.prefix + " Board");
  await expect(page.getByRole("tab", { name: "Leadership", exact: true })).toHaveCount(0);
  await click("Close");
  await click("New Department");
  await page.getByLabel("English name", { exact: true }).fill(departmentName);
  await page.getByLabel("Arabic name", { exact: true }).fill("مختبر النادي");
  await click("Specialized");
  await click("Create Department");
  await expect(page.getByRole("heading", { name: departmentName, exact: true })).toBeVisible();
  await expect(page.getByText("This department has no members yet.", { exact: true })).toBeVisible();
  const overview = await read("/club-structure");
  const department = overview.departments.find((d) => d.name === departmentName);
  assert.equal(department.type, "practical");
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
    ["Deputy", bob],
  ]) {
    await page
      .getByRole("region", { name: role, exact: true })
      .getByRole("button", { name: "Assign", exact: true })
      .click();
    await choose(person.name);
    await confirm();
  }
  await page
    .getByRole("region", { name: "Leader", exact: true })
    .getByRole("button", { name: "Replace", exact: true })
    .click();
  await choose(carol.name);
  await confirm();
  let roster = await read(deptPath + "/roster");
  assert.deepEqual(
    roster.map((a) => [a.member_id, a.role]).sort(),
    [
      [alice.id, "member"],
      [bob.id, "deputy"],
      [carol.id, "leader"],
    ].sort(),
  );
  await page
    .getByRole("region", { name: "Deputy", exact: true })
    .getByRole("button", { name: "Clear", exact: true })
    .click();
  await confirm();
  await tab("Roster");
  await click("Remove " + bob.name);
  await confirm();
  assert.equal((await read(deptPath + "/roster")).length, 2);
  await click("Close");
  await click("Manage " + refs.prefix + " Board");
  await click("Add member");
  await choose(carol.name);
  await expect(page.getByRole("button", { name: "Remove " + carol.name, exact: true })).toBeEnabled();
  await click("Close");
  for (const [slot, person] of [
    [1, carol],
    [2, dana],
  ]) {
    await page
      .getByRole("region", { name: `President · Seat ${slot}`, exact: true })
      .getByRole("button", { name: "Assign", exact: true })
      .click();
    await choose(person.name);
    await confirm();
  }
  assert.equal((await read("/club-structure")).total_members, 3);
  console.log(
    "PASS: real API creation, member/leadership changes, equal Presidents, distinct counts, independent Board roster",
  );

  // Keep an open picker based on one tenure while a different HTTP caller replaces it.
  await click("Manage " + departmentName);
  await tab("Leadership");
  const previous = (await read(deptPath + "/roster")).find((a) => a.role === "leader");
  await page
    .getByRole("region", { name: "Leader", exact: true })
    .getByRole("button", { name: "Replace", exact: true })
    .click();
  const winning = await putSeat(deptPath + "/leadership/leader", bob.id, previous.id);
  assert.equal(winning.status(), 200, await winning.text());
  await choose(alice.name);
  await click("Confirm");
  await expect(page.getByRole("alertdialog").getByRole("alert")).toContainText("The data changed");
  await expect(page.getByRole("alertdialog").getByRole("button", { name: "Confirm", exact: true })).toBeDisabled();
  await click("Cancel");
  await expect(page.getByRole("region", { name: "Leader", exact: true })).toContainText(bob.name);
  const presidents = (await read("/club-structure")).presidents;
  const original = presidents[1].assignment;
  const races = await Promise.all(
    [alice, bob].map((person) => putSeat("/club-structure/presidents/2", person.id, original.id)),
  );
  assert.deepEqual(races.map((r) => r.status()).sort(), [200, 409]);
  const history = (await read(`/club-structure/history?role=president&limit=100`)).items;
  assert.equal(history.filter((a) => a.president_slot === 2 && a.ends_at === null).length, 1);
  assert.equal(history.filter((a) => a.president_slot === 2).length, 2);
  assert.equal((await read(`/club-structure/departments/${refs.board}/roster`))[0].member_id, carol.id);
  console.log(
    "PASS: stale browser confirmation gets real 409; competing HTTP replacements keep one winner and intact history",
  );

  await tab("Settings");
  await page.getByLabel("English name", { exact: true }).fill(departmentName + " Updated");
  await click("Save Changes");
  await expect(page.getByRole("heading", { name: departmentName + " Updated", exact: true })).toBeVisible();
  roster = await read(deptPath + "/roster");
  for (let cycle = 0; cycle < 2; cycle++) {
    await click("Archive Department");
    await confirm();
    assert.deepEqual(await read(deptPath + "/roster"), roster);
    assert.ok(!(await read("/club-structure")).departments.some((d) => d.id === department.id));
    assert.ok((await read("/club-structure?include_archived=true")).departments.some((d) => d.id === department.id));
    assert.equal((await api.post(deptPath + "/members", { data: { member_id: dana.id } })).status(), 409);
    await tab("Roster");
    await expect(page.getByRole("button", { name: "Add member", exact: true })).toHaveCount(0);
    await tab("Settings");
    await click("Restore Department");
    await confirm();
    assert.deepEqual(await read(deptPath + "/roster"), roster);
  }
  await click("Close");
  await page.screenshot({ path: path.join(artifacts, "desktop.png"), fullPage: true });
  console.log(
    "PASS: repeated archive/restore preserves exact assignments and blocks both browser and direct API roster edits",
  );

  for (const role of ["admin", "admin_points"]) {
    await open("?role=" + role);
    await expect(page.getByRole("button", { name: "New Department", exact: true })).toHaveCount(0);
    await click("View " + departmentName + " Updated");
    await tab("Settings");
    await expect(page.getByLabel("English name", { exact: true })).toBeDisabled();
    const forbidden = await api.post(deptPath + "/archive", { headers: { Authorization: `Bearer browser-${role}` } });
    assert.equal(forbidden.status(), 403);
  }
  for (const role of ["member", "invalid"]) {
    const denied = await api.get("/club-structure", { headers: { Authorization: `Bearer browser-${role}` } });
    assert.equal(denied.status(), role === "member" ? 403 : 401);
  }
  console.log("PASS: real guards enforce read-only admin/points roles and deny member/invalid identities");

  for (const locale of ["en", "ar"])
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width: 320, height: 640 });
      await open(`?locale=${locale}&theme=${theme}`);
      const ar = locale === "ar";
      await click(ar ? "إدارة مختبر النادي" : "Manage " + departmentName + " Updated");
      await expect(page.locator('[data-slot="sheet-content"]')).toHaveAttribute("data-side", ar ? "left" : "right");
      await click(ar ? "إضافة عضو" : "Add member");
      await expect(page.getByRole("dialog").last().getByText(dana.name, { exact: true })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const dialog = page.getByRole("dialog").last();
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 321 && bounds.y >= 0 && bounds.y + bounds.height <= 641);
      await page.screenshot({ path: path.join(artifacts, `picker-${locale}-${theme}.png`) });
    }
  console.log(
    "PASS: Figma-derived page/drawer flows, 480px desktop drawer, English/Arabic mobile and light/dark themes",
  );
  assert.deepEqual(errors, [], "Browser console/runtime errors");
} catch (error) {
  if (page) await page.screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await api?.dispose();
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
