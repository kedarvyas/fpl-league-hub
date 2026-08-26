// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, FPL_BASE, fetchFPLJson, jsonResponse, errorResponse } from '../_shared/fpl.ts'

/**
 * Per-gameweek live detail for one player.
 *
 * `event/{gw}/live` carries two things element-summary does not: an `explain`
 * array giving the official points breakdown per scoring event, and every
 * element's BPS, which is what makes a bonus ladder for the player's fixture
 * possible. It is also 436KB, so the filtering happens here — the browser gets
 * back roughly a kilobyte instead of the whole gameweek.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const event = url.searchParams.get('event')
    const playerId = url.searchParams.get('playerId')

    if (!event || !playerId) {
      return jsonResponse({ error: 'event and playerId parameters are required' }, 400)
    }

    const [live, bootstrap] = await Promise.all([
      fetchFPLJson(`${FPL_BASE}/event/${event}/live/`, 'gameweek live data'),
      fetchFPLJson(`${FPL_BASE}/bootstrap-static/`, 'bootstrap-static'),
    ])

    const id = Number(playerId)
    const element = (live.elements || []).find((e: any) => e.id === id)

    if (!element) {
      return jsonResponse({ error: 'Player not found in this gameweek' }, 404)
    }

    // A player appears in one fixture per gameweek normally, two in a double.
    const fixtures: number[] = (element.explain || []).map((b: any) => b.fixture)

    const names = new Map<number, string>()
    for (const p of bootstrap.elements || []) names.set(p.id, p.web_name)

    // The bonus ladder is the top three by BPS among everyone in the same
    // fixture. Bonus itself is taken from the API rather than inferred from
    // placing, because ties award duplicate bonus and the API already resolves
    // them.
    const bonusRace = fixtures.length === 0 ? [] : (live.elements || [])
      .filter((e: any) => (e.explain || []).some((b: any) => fixtures.includes(b.fixture)))
      .filter((e: any) => (e.stats?.bps ?? 0) > 0)
      .sort((a: any, b: any) => (b.stats?.bps ?? 0) - (a.stats?.bps ?? 0))
      .slice(0, 3)
      .map((e: any) => ({
        id: e.id,
        name: names.get(e.id) || 'Unknown',
        bps: e.stats?.bps ?? 0,
        bonus: e.stats?.bonus ?? 0,
        isPlayer: e.id === id,
      }))

    // Where the player sits on BPS across everyone who played this gameweek.
    const played = (live.elements || []).filter((e: any) => (e.stats?.minutes ?? 0) > 0)
    const better = played.filter((e: any) => (e.stats?.bps ?? 0) > (element.stats?.bps ?? 0)).length

    return jsonResponse({
      event: Number(event),
      playerId: id,
      fixtures,
      stats: element.stats ?? null,
      explain: element.explain ?? [],
      bonusRace,
      bpsRank: better + 1,
      bpsPlayerCount: played.length,
    })
  } catch (error) {
    return errorResponse(error, 'event-live')
  }
})
