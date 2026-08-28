// config/supabase.js
//
// Single source of truth for the Supabase endpoints the app talks to.
//
// The Edge Functions are the app's entire API — they proxy the FPL API, which
// sends no CORS headers and so cannot be called from the browser directly.
//
// The fallbacks matter: components used to fall back to a FastAPI service on
// Render that was decommissioned in 2025, using Edge Function paths that never
// existed there, so a missing env var produced confusing 404s instead of an
// obvious failure. Falling back to the real project is always the better guess.
const SUPABASE_PROJECT_URL = process.env.REACT_APP_SUPABASE_URL
  || 'https://hvgotlfiwwirfpezvxhp.supabase.co';

export const SUPABASE_URL = SUPABASE_PROJECT_URL;

export const API_URL = process.env.REACT_APP_API_URL
  || `${SUPABASE_PROJECT_URL}/functions/v1`;

// The anon key is a publishable client credential — it is compiled into the
// bundle either way. Row-level security, not secrecy, is what protects data.
export const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z290bGZpd3dpcmZwZXp2eGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDMwNDAsImV4cCI6MjA3NDUxOTA0MH0.DKs4wMlerIHnXfS3DxRkQugktFEZo-rgsSpRFsmKXJE';

/**
 * Headers every Edge Function call needs.
 *
 * **No `Content-Type`.** Every call the app makes is a GET with no body, so
 * there is no content to describe, and sending it is not free: the header is
 * only CORS-safelisted for form and plain-text values, so `application/json`
 * is one of the two things forcing a preflight on each request.
 *
 * It cannot remove the preflight on its own — `Authorization` is not
 * safelisted either, and the anon key has to travel somewhere. What it does is
 * narrow what the preflight has to agree on, which matters more than it
 * sounds: when `fixtures-future` was missing, Supabase's gateway 404 came back
 * allowing `authorization` but *not* `content-type`, so the preflight was
 * refused and the browser raised a `TypeError` instead of handing back the
 * 404. Sending one fewer header would have turned that failure into an
 * ordinary "not found" the caller already handled.
 *
 * The repeat-preflight cost is handled at the other end, by
 * `Access-Control-Max-Age` in `supabase/functions/_shared/fpl.ts`.
 */
export const apiHeaders = () => ({
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
});

/**
 * Fetch with backoff for the FPL WAF.
 *
 * The Edge Functions proxy fantasy.premierleague.com, and FPL's WAF answers a
 * burst of requests from one origin with a 403 — not a rate-limit status, a
 * flat refusal that looks exactly like a bug in this app. A page that fires
 * four calls on mount reliably loses one of them. Retrying the refused call a
 * moment later almost always succeeds.
 */
export const fetchWithRetry = async (url, { attempts = 3, baseDelay = 700, ...init } = {}) => {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: apiHeaders(), ...init });
      // 403 is the WAF; 429 and 5xx are worth another go too.
      if (response.ok || (response.status !== 403 && response.status !== 429 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** attempt));
    }
  }

  throw lastError || new Error('Request failed');
};
