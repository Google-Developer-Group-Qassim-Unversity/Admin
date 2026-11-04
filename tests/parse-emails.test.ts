import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-expect-error Node's strip-types runner requires the source extension.
import { parseEmailText } from "../lib/parse-emails.ts";

const cases: [string, string, { email: string; name?: string }[], string[], number][] = [
  ["empty", "", [], [], 0],
  ["headers and prose", "Name Email مرحبا بالجميع", [], [], 0],
  ["newlines", "a@example.com\r\nb@example.org", [{ email: "a@example.com" }, { email: "b@example.org" }], [], 0],
  ["all separators", "a@example.com,b@example.com،c@example.com;d@example.com e@example.com", ["a", "b", "c", "d", "e"].map((s) => ({ email: `${s}@example.com` })), [], 0],
  ["display name", "Noura Ali <NOURA@example.com>", [{ email: "noura@example.com", name: "Noura Ali" }], [], 0],
  ["quoted name", '"Ali, Ahmed" <ali@example.com>', [{ email: "ali@example.com", name: "Ali, Ahmed" }], [], 0],
  ["Arabic display name", "نورة العلي <noura@example.com>", [{ email: "noura@example.com", name: "نورة العلي" }], [], 0],
  ["mailto", "mailto:INFO@example.com?subject=Hello", [{ email: "info@example.com" }], [], 0],
  ["wrappers", "('a@example.com'), [b@example.com]; {c@example.com}.", ["a", "b", "c"].map((s) => ({ email: `${s}@example.com` })), [], 0],
  ["full width at", "Noura＠example.com", [{ email: "noura@example.com" }], [], 0],
  ["direction marks", "\u200fnou\u200bra@example.com\u202c", [{ email: "noura@example.com" }], [], 0],
  ["case insensitive duplicates", "A@example.com a@EXAMPLE.com a@example.com", [{ email: "a@example.com" }], [], 2],
  ["Google Sheets", "Name\tEmail\tID\nنورة العلي\tNOURA@example.com\t123\nAli Ahmad\tali@example.org\t456", [{ email: "noura@example.com", name: "نورة العلي" }, { email: "ali@example.org", name: "Ali Ahmad" }], [], 0],
  ["reverse spreadsheet cells", "a@example.com\tNoura", [{ email: "a@example.com", name: "Noura" }], [], 0],
  ["WhatsApp", "السلام عليكم، هذي القائمة:\nنورة: noura@example.com، وعلي (ali@example.com).\nوالبريد هذا ناقص bad@\nشكرا", [{ email: "noura@example.com" }, { email: "ali@example.com" }], ["bad@"], 0],
  ["invalid attempts", "bad@ @example.com a@@example.com a@example a@-example.com a..b@example.com", [], ["bad@", "@example.com", "a@@example.com", "a@example", "a@-example.com", "a..b@example.com"], 0],
  ["smart quotes and brackets", "‘a@example.com’ （b@example.com）", [{ email: "a@example.com" }, { email: "b@example.com" }], [], 0],
  ["invalid embedded query", "a@example.com?other@thing.com", [], ["a@example.com?other@thing.com"], 0],
  ["extra at signs", "a@example.com@ a@example.com@bad", [], ["a@example.com@", "a@example.com@bad"], 0],
  ["plus and subdomain", "first.last+club@news.example.co.uk!", [{ email: "first.last+club@news.example.co.uk" }], [], 0],
  ["mixed valid and invalid", "a@example.com; broken@; b@example.org", [{ email: "a@example.com" }, { email: "b@example.org" }], ["broken@"], 0],
  ["punctuation and Arabic surroundings", "البريد:a@example.com،", [{ email: "a@example.com" }], [], 0],
  ["duplicate gains name", 'a@example.com; "Noura" <A@example.com>', [{ email: "a@example.com", name: "Noura" }], [], 1],
];
for (const [name, text, emails, invalid, duplicates] of cases) {
  test(name, () => assert.deepEqual(parseEmailText(text), { emails, invalid, duplicates }));
}
test("does not mutate or retain state between calls", () => {
  assert.deepEqual(parseEmailText("a@example.com"), parseEmailText("a@example.com"));
});
