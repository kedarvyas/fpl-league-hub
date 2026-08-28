// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import {
  corsHeaders,
  errorResponse,
  fetchFPLJson,
  jsonResponse,
  mapWithConcurrency,
} from "../_shared/fpl.ts"

/**
 * H2H fixtures for one gameweek, with live scores filled in.
 *
 * **FPL's H2H endpoint does not score a gameweek until it is over.** While
 * matches are being played `leagues-h2h-matches` reports every entry on 0 —
 * verified mid-GW2, where all 22 entries read 0 while their own entry
 * summaries read 8, 7 and so on. Passed through unaltered that produced a
 * league page of 0–0 fixtures and a HIGHEST / AVERAGE / LOWEST strip of
 * zeroes, next to a differential ledger that was correctly showing points.
 *
 * The gap is closed by scoring each squad here, from its picks and the live
 * `event_points` in bootstrap-static — one request per manager, the same
 * fan-out `league-gameweek-stats` already makes for this league size, bounded
 * so the burst does not draw the upstream WAF's 403.
 *
 * **Not from `entry/{id}/summary_event_points`, which was the obvious choice
 * and is not reliable here.** FPL's CDN serves Supabase's egress a stale copy
 * of that endpoint: mid-GW2 one entry read 0 through the proxy while reading 8
 * when fetched directly, repeatably, while other entries in the same league
 * were fine. Every entry-level total has that exposure. `bootstrap-static` is
 * fetched constantly and stays fresh, and picks do not change mid-gameweek, so
 * scoring from those two is both fresher and cheaper to trust.
 *
 * The fan-out is gated on **every** entry reading 0, which is what an unscored
 * gameweek looks like and nothing else does. So a settled gameweek costs
 * exactly one request as before, and a genuinely goalless early kickoff scores
 * zeroes and substitutes zeroes, which changes nothing.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const leagueId = pathParts[pathParts.length - 1] // Get league ID from path
    const event = url.searchParams.get('event')

    if (!leagueId) {
      return jsonResponse({ error: 'League ID is required' }, 400)
    }

    if (!event) {
      return jsonResponse({ error: 'Event parameter is required' }, 400)
    }

    const data = await fetchFPLJson(
      `/leagues-h2h-matches/league/${leagueId}/?event=${event}`,
      'weekly matchups',
    )

    const results = data?.results ?? []
    const unscored =
      results.length > 0 &&
      results.every((m: any) => !m.entry_1_points && !m.entry_2_points)

    if (!unscored) return jsonResponse(data)

    const entries = [
      ...new Set(
        results
          .flatMap((m: any) => [m.entry_1_entry, m.entry_2_entry])
          .filter((id: number | null) => typeof id === 'number'),
      ),
    ] as number[]

    const bootstrap = await fetchFPLJson('/bootstrap-static/', 'bootstrap-static')
    const playerPoints = new Map<number, number>()
    for (const player of bootstrap.elements ?? []) {
      playerPoints.set(player.id, player.event_points ?? 0)
    }

    const summaries = await mapWithConcurrency(entries, 5, async (id) => {
      const picks = await fetchFPLJson(`/entry/${id}/event/${event}/picks/`, `picks for entry ${id}`)
      // Multiplier rather than squad slot, so a captain doubles and a Bench
      // Boost bench counts, less the hit — exactly how FPL totals it.
      const scored = (picks?.picks ?? []).reduce(
        (total: number, pick: any) =>
          total + (playerPoints.get(pick.element) ?? 0) * (pick.multiplier ?? 0),
        0,
      )
      return { id, points: scored - (picks?.entry_history?.event_transfers_cost ?? 0) }
    })

    const live = new Map<number, number>()
    for (const s of summaries) if (s) live.set(s.id, s.points)

    // One manager failing leaves that side on FPL's own figure rather than
    // sinking the page.
    for (const m of results) {
      if (live.has(m.entry_1_entry)) m.entry_1_points = live.get(m.entry_1_entry)
      if (live.has(m.entry_2_entry)) m.entry_2_points = live.get(m.entry_2_entry)
    }

    // Said in the payload so the page can label the scores as in-play rather
    // than presenting a moving number as final.
    return jsonResponse({ ...data, results, live: true })
  } catch (error) {
    return errorResponse(error, 'weekly-matchups function')
  }
})
