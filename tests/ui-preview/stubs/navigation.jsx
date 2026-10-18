// Preview-only stand-in for next/link and next/navigation: real browser
// navigation, keeping the preview's locale/theme parameters on every link.
const KEEP = ["locale", "theme"];
export function previewHref(href) {
  const url = new URL(typeof href === "string" ? href : href?.pathname ?? "/", window.location.origin);
  const current = new URLSearchParams(window.location.search);
  for (const key of KEEP) if (current.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, current.get(key));
  return url.pathname + url.search + url.hash;
}
export function useRouter() {
  return {
    push: (href) => window.location.assign(previewHref(href)),
    replace: (href) => window.location.replace(previewHref(href)),
    back: () => window.history.back(),
    refresh: () => {},
    prefetch: () => {},
  };
}
export function usePathname() {
  return window.location.pathname;
}
export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}
export function useParams() {
  return window.__PREVIEW_PARAMS__ ?? {};
}
export function redirect(href) {
  window.location.assign(previewHref(href));
}
export function notFound() {
  throw new Error("notFound()");
}
export default function Link({ href, prefetch: _prefetch, replace: _replace, scroll: _scroll, ...props }) {
  return <a href={previewHref(href)} {...props} />;
}
