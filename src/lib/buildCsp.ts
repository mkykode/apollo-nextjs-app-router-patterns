// lib/security/csp.ts
const isDev = process.env.NODE_ENV === "development";

const shared = {
  "default-src": ["'self'"],
  "img-src": ["'self'", "blob:", "data:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
};

function serialize(directives: Record<string, string[]>) {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .concat("upgrade-insecure-requests")
    .join("; ");
}

/** For proxy-matched routes. Fresh nonce per response. */
export function buildNonceCsp(nonce: string) {
  return serialize({
    ...shared,
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", `'nonce-${nonce}'`],
  });
}

/** For statically served routes. No nonce possible. */
export const staticCsp = serialize({
  ...shared,
  "script-src": ["'self'", ...(isDev ? ["'unsafe-eval'"] : [])],
  "style-src": ["'self'", "'unsafe-inline'"],
});
