export interface ParsedEmail {
  email: string;
  name?: string;
}

/** Extract addresses from prose, mail clients and spreadsheet rows. No network lookups. */
export function parseEmailText(text: string): { emails: ParsedEmail[]; invalid: string[]; duplicates: number } {
  const normalized = text.replace(/＠/g, "@").replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "");
  const emails = new Map<string, ParsedEmail>();
  const invalid: string[] = [];
  let duplicates = 0;
  const cleanName = (name: string) => name.trim().replace(/^["'“”\s]+|["'“”\s]+$/g, "").trim();

  for (const line of normalized.split(/\r?\n/)) {
    const names = new Map<string, string>();
    // Quoted display names can contain commas. Keep them before splitting tokens.
    const addresses = line.replace(/(?:"([^"\n]+)"|([^,،;<>\t]+))\s*<\s*(?:mailto:)?([^<>\s]+)\s*>/gi, (match, quoted: string, plain: string, address: string) => {
      if (!quoted && plain.includes("@")) return match;
      names.set(address.toLowerCase(), cleanName(quoted ?? plain));
      // A display name may itself contain @. It is never another recipient.
      return `<${address}>`;
    });
    const cells = line.split("\t");
    const nameCell = cells.find((cell) => cell.trim() && !cell.includes("@") && !/^(name|email|e-mail|الاسم|البريد)$/i.test(cell.trim()) && !/^\d+$/.test(cell.trim()));
    for (const raw of addresses.match(/[^\s,،;<>"“”]+/g) ?? []) {
      if (!raw.includes("@")) continue;
      // Remove paired prose wrappers, never punctuation inside a local part.
      let address = raw.replace(/[.!?:،؟]+$/g, "");
      const wrappers = [["(", ")"], ["[", "]"], ["{", "}"], ["（", "）"], ["‘", "’"], ["'", "'"]];
      let pair;
      while (address.length > 1 && (pair = wrappers.find(([start, end]) => address.startsWith(start) && address.endsWith(end)))) {
        address = address.slice(pair[0].length, -pair[1].length);
      }
      address = address.replace(/^[\p{Script=Arabic}]+:/u, "");
      address = /^mailto:/i.test(address) ? address.slice(7).split("?")[0] : address;
      const token = address
        .replace(/[.!?:'،؟]+$/g, "");
      const email = token.toLowerCase();
      const parts = email.split("@");
      const [local, domain] = parts;
      const valid = parts.length === 2 && email.length <= 254 && local?.length <= 64 &&
        /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i.test(local ?? "") && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..") &&
        domain?.includes(".") && domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) &&
        /^[a-z]{2,63}$/i.test(domain.split(".").at(-1) ?? "");
      if (!valid) {
        invalid.push(token || raw);
        continue;
      }
      const name = names.get(email) || (cells.length > 1 && nameCell ? cleanName(nameCell) : undefined);
      if (emails.has(email)) {
        duplicates++;
        if (name && !emails.get(email)!.name) emails.get(email)!.name = name;
      } else {
        emails.set(email, name ? { email, name } : { email });
      }
    }
  }
  return { emails: [...emails.values()], invalid, duplicates };
}
