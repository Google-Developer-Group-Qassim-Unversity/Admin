// This standalone harness uses real browser navigation in place of Next's router.
// Preserve only test identity/display parameters when following application links.
export function testHref(href) {
  const url = new URL(href, window.location.origin);
  const current = new URLSearchParams(window.location.search);
  for (const key of ["locale", "theme", "role"]) {
    if (current.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, current.get(key));
  }
  return url.pathname + url.search;
}

export function useRouter() {
  return {
    push: (href) => window.location.assign(testHref(href)),
    replace: (href) => window.location.replace(testHref(href)),
  };
}

export function usePathname() {
  return window.location.pathname;
}

export function useSearchParams() {
  return new URLSearchParams(window.location.search);
}

export default function Link({ href, ...props }) {
  return <a href={testHref(href)} {...props} />;
}
