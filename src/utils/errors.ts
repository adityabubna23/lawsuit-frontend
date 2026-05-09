/**
 * Friendly error messages.
 *
 * Axios + the lawsuit-server combine to produce a few common error shapes:
 *   { error: "Email already in use" }                     ← service-level
 *   { error: { code, message } }                          ← legacy wrapper
 *   { message: "..." }                                    ← legacy wrapper
 *   { issues: [{ message: "..." }, ...] }                 ← Zod validation
 * `friendlyError` peels the wrapper, replaces developer-shaped strings with
 * clean copy, and falls back to a status-aware default so the user always
 * sees something readable instead of "[object Object]" or "Network Error".
 */

interface AxiosLikeError {
  response?: {
    status?: number
    data?: any
  }
  request?: any
  message?: string
  code?: string
}

const STATUS_DEFAULTS: Record<number, string> = {
  400: "We couldn't process that request. Please check the details and try again.",
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  408: 'The request took too long. Please try again.',
  409: 'That conflicts with something that already exists.',
  410: 'This is no longer available.',
  413: 'The file or message is too large.',
  415: 'That file type is not supported.',
  422: 'Some of the details you entered are not valid.',
  429: 'Too many attempts — please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again.',
  502: "We're having trouble reaching our servers. Please try again shortly.",
  503: "We're temporarily unavailable. Please try again in a moment.",
  504: 'The server took too long to respond. Please try again.',
}

/**
 * Tidy server messages that are technically correct but feel like dev output
 * (e.g. lowercase verbs, raw Prisma errors, JWT jargon). Anything not matched
 * is returned as-is — server messages are usually already user-friendly.
 */
function humanizeServerMessage(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Identifiable jargon → clean
  if (/jwt\s*expired|tokenexpired/i.test(trimmed)) return 'Your session has expired. Please sign in again.'
  if (/invalid\s*token|invalid\s*signature/i.test(trimmed)) return 'Your session is invalid. Please sign in again.'
  if (/jwt malformed|jsonwebtokenerror/i.test(trimmed)) return 'Your session is invalid. Please sign in again.'
  if (/^prisma|p20\d{2}|unique constraint failed/i.test(trimmed)) return 'That information is already in use.'
  if (/socket hang up|econnrefused|enotfound|network error|fetch failed/i.test(trimmed)) {
    return "We can't reach our servers right now. Check your connection and try again."
  }
  if (/cors|cross[- ]origin/i.test(trimmed)) return "We can't reach our servers right now. Please refresh and try again."
  if (/cannot get|cannot post|cannot put|cannot delete|cannot patch/i.test(trimmed)) {
    return "That action isn't available right now."
  }

  // Sentence-case the first letter so server's lowercase verbs (`"failed to ..."`) read as polished UI copy.
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Convert any caught error into a single human-readable sentence, suitable for
 * displaying directly to a user.
 *
 * @param err   The thrown value from a try/catch around an axios call.
 * @param fallback Override the generic default. Pass a context-specific string,
 *                 e.g. `'Failed to load consultations'`.
 */
export function friendlyError(err: unknown, fallback?: string): string {
  if (err == null) return fallback || 'Something went wrong. Please try again.'

  const e = err as AxiosLikeError

  // Axios errors expose .response on HTTP responses
  const status = e?.response?.status
  const data = e?.response?.data

  // Try server-provided messages in order of specificity
  let candidate: string | undefined

  if (data) {
    if (typeof data === 'string') candidate = data
    else if (typeof data.error === 'string') candidate = data.error
    else if (data.error && typeof data.error.message === 'string') candidate = data.error.message
    else if (typeof data.message === 'string') candidate = data.message
    else if (Array.isArray(data.issues) && data.issues[0]?.message) candidate = String(data.issues[0].message)
  }

  if (candidate) return humanizeServerMessage(candidate)

  // No server message — use status-aware default
  if (status && STATUS_DEFAULTS[status]) return STATUS_DEFAULTS[status]

  // No HTTP response — likely a network error
  if (e?.request && !status) {
    return "We can't reach our servers right now. Check your connection and try again."
  }

  if (typeof e?.message === 'string' && e.message) return humanizeServerMessage(e.message)

  return fallback || 'Something went wrong. Please try again.'
}

/**
 * Shorthand for catch blocks where you only want to throw a tidy message.
 *
 *   try { await api.do() }
 *   catch (e) { throw new Error(friendlyError(e)) }
 */
export function asFriendlyError(err: unknown, fallback?: string): Error {
  return new Error(friendlyError(err, fallback))
}
