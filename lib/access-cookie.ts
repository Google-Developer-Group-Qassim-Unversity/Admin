/**
 * The middleware's memory of "is this person staff", so it does not ask the
 * backend on every navigation.
 *
 * A signed, httpOnly cookie holding the Clerk user id, the answer and an
 * expiry. It is only a cache: losing it costs one `GET /access/me`, and the
 * backend refuses a non-staff caller whatever the cookie says. Signed with
 * `ACCESS_COOKIE_SECRET` (HMAC-SHA256, Web Crypto) so a person cannot write
 * "staff" into it themselves. Used by the middleware only; no `server-only`
 * import, which the middleware bundle cannot take.
 */

export const ACCESS_COOKIE = "gdg_access";
/** How long an answer is trusted. Someone removed from the roster loses the admin app within this. */
export const ACCESS_COOKIE_MAX_AGE_S = 5 * 60;

function secret(): string {
  const value = process.env.ACCESS_COOKIE_SECRET;
  if (!value) throw new Error("Missing required environment variable: ACCESS_COOKIE_SECRET");
  return value;
}

const encoder = new TextEncoder();

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signAccessCookie(userId: string, isStaff: boolean, nowMs = Date.now()): Promise<string> {
  const payload = `${userId}.${isStaff ? 1 : 0}.${Math.floor(nowMs / 1000) + ACCESS_COOKIE_MAX_AGE_S}`;
  return `${payload}.${await hmac(payload)}`;
}

/** The cached answer for `userId`, or null when there is none worth trusting. */
export async function readAccessCookie(
  value: string | undefined,
  userId: string,
  nowMs = Date.now(),
): Promise<boolean | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [cookieUser, staff, exp, signature] = parts;
  const payload = `${cookieUser}.${staff}.${exp}`;
  if (!sameString(signature, await hmac(payload))) return null;
  if (cookieUser !== userId || Number(exp) * 1000 <= nowMs) return null;
  return staff === "1";
}
