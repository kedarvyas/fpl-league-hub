// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, errorResponse, fetchFPLJson, jsonResponse } from "../_shared/fpl.ts"

/**
 * BPS for the fixtures that have not been awarded bonus yet.
 *
 * FPL reports `stats.bonus` as 0 until a fixture is settled, so every points
 * total in the app reads low mid-match and jumps an hour after the whistle.
 * The client closes that gap with `lib/liveBonus.js`; this function's job is
 * to hand it the raw BPS to rank, and — more importantly — to decide *which*
 * fixtures still need it.
 *
 * **The whole risk here is double counting.** Adding a provisional bonus on
 * top of one FPL has already awarded would overstate a score, which is worse
 * than understating it: a number that is too low corrects upward and looks
 * like a delay, while one that is too high looks like the app cannot add up.
 *
 * So the test is read from the data rather than from fixture flags: a fixture
 * needs provisional bonus exactly when **nobody in it has been awarded any**.
 * A settled fixture always has a three-point recipient, so the moment FPL
 * awards, this function stops emitting for that fixture and the client's
 * addition falls to zero on its own. No flag semantics to get wrong, no window
 * where both are applied.
 *
 * `event/{gw}/live` is 436KB. Only players with BPS on the board in a pending
 * fixture come back, which is a couple of kilobytes mid-gameweek and an empty
 * array the rest of the time.
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const event = url.searchParams.get('event')

    if (!event) {
      return jsonResponse({ error: 'event parameter is required' }, 400)
    }

    const live = await fetchFPLJson(`/event/${event}/live/`, 'gameweek live data')

    // Every player's BPS, grouped by the fixture it was earned in, plus the
    // set of fixtures FPL has already settled.
    const byFixture = new Map<number, { id: number; bps: number }[]>()
    const settled = new Set<number>()

    for (const element of live.elements ?? []) {
      const bps = element.stats?.bps ?? 0
      const bonus = element.stats?.bonus ?? 0

      for (const block of element.explain ?? []) {
        const fixture = block.fixture
        if (bonus > 0) settled.add(fixture)
        if (bps <= 0) continue
        if (!byFixture.has(fixture)) byFixture.set(fixture, [])
        byFixture.get(fixture)!.push({ id: element.id, bps })
      }
    }

    const rows: { id: number; fixture: number; bps: number }[] = []
    const pending: number[] = []

    for (const [fixture, players] of byFixture) {
      if (settled.has(fixture)) continue
      pending.push(fixture)
      for (const player of players) rows.push({ id: player.id, fixture, bps: player.bps })
    }

    return jsonResponse({
      event: Number(event),
      // The fixtures these rows cover, so a caller can say how much of a
      // score is still provisional rather than only that some of it is.
      pending: pending.sort((a, b) => a - b),
      settled: [...settled].sort((a, b) => a - b),
      rows,
    })
  } catch (error) {
    return errorResponse(error, 'event-bonus function')
  }
})
