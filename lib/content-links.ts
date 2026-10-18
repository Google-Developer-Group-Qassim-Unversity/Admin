/**
 * The "is this a link at all" check for pasted content links - the client
 * half of the rule the backend validator owns (Backend app/routers/models.py
 * `_normalize_content_url`): a full http(s) URL in any casing, or a bare
 * domain a human would paste, which the backend prepends `https://` to.
 *
 * It can only agree with the server, never be stricter: a value this accepts
 * is exactly a value the backend stores.
 */
export function looksLikeUrl(text: string): boolean {
  const value = text.trim();
  if (value === "") return false;

  const scheme = /^https?:\/\//i.exec(value);
  if (scheme) {
    const rest = value.slice(scheme[0].length);
    return rest !== "" && !/\s/.test(rest);
  }
  // A leading "something:" is a scheme server-side ("example.com:8080" and
  // "javascript:…" are indistinguishable cheaply and both rejected there).
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  return /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)+([/?#]\S*)?$/i.test(value);
}
