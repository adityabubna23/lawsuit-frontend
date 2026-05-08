/**
 * URL helpers for VITE_API_URL.
 *
 * The env value can be one of:
 *   - "http://localhost:4000/api/v1"      (local dev, full URL with protocol + path)
 *   - "https://api.nyayax.com/api/v1"     (production, full URL)
 *   - "https://api.nyayax.com"            (production, no path — we append /api/v1)
 *   - "api.nyayax.com"                    (production, naked host — protocol must be added)
 *   - "" / undefined                      (use a relative /api/v1 path on the same origin)
 *
 * Without protocol normalisation, axios + URL constructors treat naked hosts
 * as relative paths, which produces nonsense like
 * `http://localhost:5173/admin/api.nyayax.com/api/v1/...`. Always run env
 * values through `normalizeApiBase` before handing them to axios or sockets.
 */

const PROTOCOL_RE = /^https?:\/\//i
const HAS_API_PATH_RE = /\/api(\/v\d+)?$/

/**
 * Normalize VITE_API_URL into an absolute base URL ending with `/api/v1`.
 * Returns `''` for an empty / whitespace env value so callers can fall back
 * to a relative `/api/v1` path served from the same origin.
 */
export function normalizeApiBase(envUrl: string | undefined | null): string {
  const raw = (envUrl ?? '').trim()
  if (!raw) return ''

  // Strip trailing slashes
  let normalized = raw.replace(/\/+$/g, '')

  // Add a protocol if none present. We default to https for production safety —
  // local dev URLs always include the protocol explicitly.
  if (!PROTOCOL_RE.test(normalized)) {
    normalized = `https://${normalized}`
  }

  // Append /api/v1 unless the URL already ends with /api or /api/vN
  if (!HAS_API_PATH_RE.test(normalized)) {
    normalized = `${normalized}/api/v1`
  }

  return normalized
}

/**
 * Extract the origin (protocol + host + port) from VITE_API_URL for socket.io
 * connections. Falls back to the current window origin when the env value is
 * empty / unparseable.
 */
export function resolveSocketOrigin(envUrl: string | undefined | null): string {
  const fallback = typeof window !== 'undefined' ? window.location.origin : ''
  const raw = (envUrl ?? '').trim()
  if (!raw) return fallback

  // Apply the same protocol normalisation so `api.nyayax.com` parses cleanly.
  const withProtocol = PROTOCOL_RE.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(withProtocol).origin
  } catch {
    return fallback
  }
}
