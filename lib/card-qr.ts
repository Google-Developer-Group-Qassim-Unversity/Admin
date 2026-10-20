/**
 * Reading a member card QR (Backend/docs/CARD_QR.md).
 *
 * Cards encode `https://gdg-q.com/p/{uuid}?s={sig}`: the member's public
 * profile link plus a signature the backend checks on a scan. Older cards and
 * passes carry the link without `s`, and anything else that contains a 32-hex
 * uuid is read the way the scanner always did, so no card stops scanning here:
 * the backend decides whether an unsigned card is still accepted.
 */

export interface ScannedCard {
  uuid: string;
  /** The card's signature, when the QR carried one. */
  sig?: string;
}

/** The backend refuses a longer `sig` with a 422; nothing a card prints is that long. */
const MAX_SIG_LENGTH = 64;

const PROFILE_PATH = /^\/p\/([0-9a-f]{32})\/?$/i;
const ANY_UUID = /[0-9a-f]{32}/i;

/** The uuid and signature in whatever the camera decoded, or `null` when it is not a card. */
export function parseCardQr(raw: string): ScannedCard | null {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const match = url.pathname.match(PROFILE_PATH);
    if (match) {
      const sig = url.searchParams.get("s");
      return sig ? { uuid: match[1].toLowerCase(), sig } : { uuid: match[1].toLowerCase() };
    }
  } catch {
    // Not a URL: fall through to the old first-uuid match.
  }
  const match = text.match(ANY_UUID);
  return match ? { uuid: match[0].toLowerCase() } : null;
}

/** A signature no card could carry: refused here rather than sent. */
export function isOversizedSig(card: ScannedCard): boolean {
  return card.sig !== undefined && card.sig.length > MAX_SIG_LENGTH;
}
