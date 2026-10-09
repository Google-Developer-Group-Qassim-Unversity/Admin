#!/usr/bin/env node
// Screenshots real admin pages without a Clerk session or a backend.
//
// It bundles tests/ui-preview/entry.jsx (the real pages inside the real
// AppShell) with esbuild, compiles app/globals.css with Tailwind, stubs Clerk
// and Next's router, and answers every API call from tests/ui-preview/fixtures.
// Unknown API paths get `[]`, and are listed at the end so fixtures can be added.
//
//   node tests/ui-preview/shoot.mjs [--routes /,/pipeline] [--out dir]
//        [--viewports phone,desktop] [--locales ar,en] [--themes light,dark]
//        [--full] [--scroll 600]
//
// Writes <out>/<route>-<viewport>-<locale>-<theme>.png and prints page errors.
// Uses CHROMIUM_PATH, or /usr/bin/chromium when present.

import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, "../..");
const API = "http://api.test";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, i, all) => {
    if (arg.startsWith("--")) acc.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "1"]);
    return acc;
  }, []),
);
const list = (v, d) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : d);
const routes = list(args.routes, ["/"]);
const viewports = list(args.viewports, ["phone", "desktop"]);
const locales = list(args.locales, ["ar"]);
const themes = list(args.themes, ["light"]);
const out = path.resolve(args.out || path.join(frontend, ".preview-shots"));
const full = args.full === "1";
const scroll = Number(args.scroll || 0);
const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 } };

await mkdir(out, { recursive: true });

// --- fixtures: every fixtures/*.mjs default-exports [{ method?, path: RegExp, status?, body | (ctx) => body }]
const fixtures = [];
for (const file of (await readdir(path.join(here, "fixtures"))).filter((f) => f.endsWith(".mjs")).sort()) {
  const mod = await import(pathToFileURL(path.join(here, "fixtures", file)).href);
  fixtures.push(...(mod.default || []));
}

// --- CSS and bundle
const require = createRequire(import.meta.url);
const tailwind = require("@tailwindcss/postcss");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const css = await postcss([tailwind({ base: frontend })]).process(await readFile(path.join(frontend, "app/globals.css"), "utf8"), {
  from: path.join(frontend, "app/globals.css"),
});
const bundle = await build({
  entryPoints: [path.join(here, "entry.jsx")],
  bundle: true,
  write: false,
  format: "esm",
  jsx: "automatic",
  loader: { ".js": "jsx" },
  logLevel: "error",
  alias: {
    "@": frontend,
    "@clerk/nextjs": path.join(here, "stubs/clerk.jsx"),
    "next/link": path.join(here, "stubs/navigation.jsx"),
    "next/navigation": path.join(here, "stubs/navigation.jsx"),
    "next/image": path.join(here, "stubs/image.jsx"),
  },
  define: {
    "process.env": JSON.stringify({
      NODE_ENV: "development",
      NEXT_PUBLIC_BACKEND_API_URL: API,
      NEXT_PUBLIC_THIS_APP_URL: "http://app.test",
      NEXT_PUBLIC_MEMBER_APP_URL: "http://members.test",
      NEXT_PUBLIC_UPLOAD_SOURCE: "test",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "test",
      NEXT_PUBLIC_SHEET_PROCESSOR_FRONTEND_URL: "http://sheets.test",
    }),
  },
});

// next/font is not available here: load the same Google faces and name them
// the way app/layout.tsx does.
const HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@500;600;700&family=Tajawal:wght@300;400;500;700;800&display=swap">
<style>:root{--font-reem-kufi:"Reem Kufi";--font-tajawal:"Tajawal";--font-geist-mono:ui-monospace}</style>
<link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/app.js") {
    res.setHeader("Content-Type", "text/javascript");
    return res.end(bundle.outputFiles[0].contents);
  }
  if (url.pathname === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    return res.end(css.css);
  }
  const file = path.join(frontend, "public", decodeURIComponent(url.pathname));
  if (file.startsWith(path.join(frontend, "public")) && existsSync(file) && (await stat(file)).isFile()) {
    const ext = path.extname(file);
    res.setHeader("Content-Type", { ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".ico": "image/x-icon" }[ext] || "application/octet-stream");
    return res.end(await readFile(file));
  }
  res.setHeader("Content-Type", "text/html");
  res.end(HTML);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const executablePath = process.env.CHROMIUM_PATH || (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
const unknown = new Set();
let failures = 0;

async function answer(route) {
  const request = route.request();
  const url = new URL(request.url());
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const method = request.method();
  const hit = fixtures.find((f) => (f.method || "GET") === method && f.path.test(pathname));
  if (!hit) {
    if (method === "GET") unknown.add(`${method} ${pathname}`);
    return route.fulfill({ status: 200, contentType: "application/json", body: method === "GET" ? "[]" : "{}" });
  }
  let body = hit.body;
  if (typeof body === "function") {
    let json;
    try {
      json = request.postDataJSON();
    } catch {
      json = undefined;
    }
    body = body({ url, pathname, query: Object.fromEntries(url.searchParams), match: pathname.match(hit.path), body: json });
  }
  return route.fulfill({ status: hit.status || 200, contentType: "application/json", body: JSON.stringify(body ?? null) });
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: SIZES[viewport] || SIZES.desktop,
      deviceScaleFactor: viewport === "phone" ? 2 : 1,
      hasTouch: viewport === "phone",
      isMobile: viewport === "phone",
      reducedMotion: "reduce",
    });
    await context.route(`${API}/**`, answer);
    await context.route(`${base}/api/**`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    for (const locale of locales) {
      for (const theme of themes) {
        for (const route of routes) {
          const page = await context.newPage();
          const errors = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("console", (m) => {
            if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text());
          });
          const [pathname, search = ""] = route.split("?");
          const query = new URLSearchParams(search);
          query.set("locale", locale);
          query.set("theme", theme);
          await page.goto(`${base}${pathname}?${query}`, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(400);
          if (scroll) {
            await page.evaluate((y) => window.scrollTo(0, y), scroll);
            await page.waitForTimeout(200);
          }
          const name = `${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}-${viewport}-${locale}-${theme}${scroll ? `-s${scroll}` : ""}.png`;
          await page.screenshot({ path: path.join(out, name), fullPage: full });
          console.log(`${errors.length ? "✗" : "✓"} ${path.join(out, name)}`);
          for (const e of errors) console.log(`    ${e.split("\n")[0]}`);
          failures += errors.length ? 1 : 0;
          await page.close();
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
if (unknown.size) console.log(`\nNo fixture (answered []):\n  ${[...unknown].sort().join("\n  ")}`);
process.exitCode = failures ? 1 : 0;
