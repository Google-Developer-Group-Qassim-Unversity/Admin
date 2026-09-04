export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dns = await import('dns');
    // The VPS has no outbound IPv6 route. Google's APIs resolve with an AAAA
    // record part of the time, and Node doesn't fall back to IPv4 fast enough,
    // so calls like refreshing an OAuth token (used by the "copy template"
    // flow) hang until ETIMEDOUT. Prefer IPv4 results so it never picks a
    // dead route.
    dns.setDefaultResultOrder('ipv4first');
  }
}
