#!/usr/bin/env node
// Downloads Thmanyah Sans from Thmanyah's own site into public/fonts/thmanyah/.
//
// Why a script and not committed files: the font is free to use in websites
// and apps, but its licence (https://font.thmanyah.com/licenses) only allows
// downloading it from Thmanyah's site and forbids re-hosting it anywhere else,
// and this repository is public. So the files are fetched at install/build
// time and git-ignored. Without them the app falls back to Tajawal (see
// app/layout.tsx and the @font-face rules in app/globals.css).
//
// Usage: pnpm fonts            (run once locally; the Docker build runs it too)

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://font.thmanyah.com/";
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/fonts/thmanyah");
/** The weights app/globals.css declares, by the name the site gives each file. */
const WANTED = { Light: 300, Regular: 400, Medium: 500, Bold: 700 };

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const targets = Object.values(WANTED).map((w) => path.join(OUT, `thmanyah-sans-${w}.woff2`));
  if (!process.argv.includes("--force") && (await Promise.all(targets.map(exists))).every(Boolean)) {
    console.log("Thmanyah Sans already present.");
    return;
  }

  const html = await (await fetch(SITE)).text();
  // The site declares its own webfonts as @font-face rules; take the
  // "Thmanyah sans 1.2" family, which carries Arabic, Latin and both digit sets.
  const faces = [...html.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const found = {};
  for (const face of faces) {
    const family = /font-family:\s*"?([^";]+)/.exec(face)?.[1]?.trim() ?? "";
    const url = /url\("?([^")]+\.woff2)"?\)/.exec(face)?.[1];
    const match = /^thmanyah sans 1\.2 (\w+)$/i.exec(family);
    if (!match || !url) continue;
    const weight = WANTED[match[1]];
    if (weight && !found[weight]) found[weight] = url;
  }

  const missing = Object.values(WANTED).filter((w) => !found[w]);
  if (missing.length) throw new Error(`Could not find Thmanyah Sans weights ${missing.join(", ")} on ${SITE}`);

  await mkdir(OUT, { recursive: true });
  for (const [weight, url] of Object.entries(found)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await writeFile(path.join(OUT, `thmanyah-sans-${weight}.woff2`), Buffer.from(await res.arrayBuffer()));
    console.log(`thmanyah-sans-${weight}.woff2`);
  }
}

main().catch((err) => {
  console.warn(`Thmanyah Sans not downloaded (${err.message}); the app will use Tajawal instead.`);
});
