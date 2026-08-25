// Shared helpers for the FPL API proxy functions.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const FPL_BASE = 'https://fantasy.premierleague.com/api'

/** Error carrying the upstream status, so callers can pass it through instead
 *  of flattening every upstream failure into a 500. */
export class FplError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'FplError'
    this.status = status
  }
}

// 403 is included deliberately. The FPL API is public and unauthenticated, so
// a 403 is never a real authorization decision — it is the upstream WAF
// getting suspicious of a burst from Supabase's shared egress IP, and it
// clears on retry.
const RETRYABLE = new Set([403, 408, 425, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 4

// Identify the app rather than sending the Deno default, which draws more
// scrutiny from the upstream WAF.
const DEFAULT_HEADERS = {
  'User-Agent': 'fpl-league-hub/1.0 (+https://tacticosfplhub.netlify.app)',
  'Accept': 'application/json',
}

/** Fetch from the FPL API, retrying transient failures with exponential
 *  backoff and jitter.
 *
 *  Pages like the league stats panel fan out to one request per manager — 44+
 *  for a 22-team league — all from the same Supabase egress IP, and FPL
 *  throttles the burst. Without a retry a single throttled request turned into
 *  a user-visible error on an otherwise healthy page. 4xx responses other than
 *  429 are permanent (a deleted league, an unknown entry) and are returned
 *  immediately rather than retried. */
export async function fetchFPL(path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith('http') ? path : `${FPL_BASE}${path}`
  let response: Response | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(url, {
        ...init,
        headers: { ...DEFAULT_HEADERS, ...(init?.headers ?? {}) },
      })
    } catch (err) {
      // Network-level failure: retry unless this was the last attempt.
      if (attempt === MAX_ATTEMPTS - 1) throw err
      await backoff(attempt)
      continue
    }

    if (response.ok || !RETRYABLE.has(response.status)) return response

    // Release the discarded body before trying again.
    await response.body?.cancel()
    if (attempt < MAX_ATTEMPTS - 1) await backoff(attempt)
  }

  return response!
}

/** fetchFPL + JSON decode, throwing an FplError that carries the upstream
 *  status so the handler can reflect it (404 for a league that no longer
 *  exists, rather than a misleading 500). */
export async function fetchFPLJson(path: string, label: string): Promise<any> {
  const response = await fetchFPL(path)
  if (!response.ok) {
    await response.body?.cancel()
    throw new FplError(`Failed to fetch ${label}: ${response.status}`, response.status)
  }
  return await response.json()
}

function backoff(attempt: number): Promise<void> {
  const delay = 250 * Math.pow(2, attempt) + Math.random() * 250
  return new Promise((resolve) => setTimeout(resolve, delay))
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Map a thrown error onto a response, preserving the upstream status when we
 *  have one. Anything unexpected stays a 500. */
export function errorResponse(error: unknown, context: string): Response {
  console.error(`Error in ${context}:`, error)
  const status = error instanceof FplError ? error.status : 500
  const message = error instanceof Error ? error.message : String(error)
  return jsonResponse({ error: message }, status)
}

/** Map over items with a bounded number of requests in flight, preserving
 *  input order. Keeps fan-out gentle enough that the upstream WAF does not
 *  treat it as a burst. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      try {
        results[index] = await fn(items[index])
      } catch (err) {
        // One manager failing should not sink the whole panel.
        console.error(`mapWithConcurrency: item ${index} failed:`, err)
        results[index] = null
      }
    }
  })

  await Promise.all(workers)
  return results
}
