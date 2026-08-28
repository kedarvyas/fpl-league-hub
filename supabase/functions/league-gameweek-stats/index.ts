// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, errorResponse, fetchFPLJson, jsonResponse, mapWithConcurrency } from "../_shared/fpl.ts"

// Aggregates the per-manager data the league gameweek stats panel needs.
//
// The client used to do this fan-out itself: one league-standings call, then a
// transfers call and a picks call per manager. For a 22-team league that is 45
// round trips from a phone, and any single failure silently dropped that
// manager from the results. Doing it here collapses it to one request and lets
// the fan-out be paced — the FPL WAF rejects bursts from Supabase's shared
// egress IP, so requests go out a few at a time rather than all at once.
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const leagueId = url.searchParams.get('leagueId')
    const event = url.searchParams.get('event')

    if (!leagueId) {
      return jsonResponse({ error: 'leagueId parameter is required' }, 400)
    }

    if (!event) {
      return jsonResponse({ error: 'event parameter is required' }, 400)
    }

    const eventId = parseInt(event, 10)

    const [standingsPayload, bootstrapData] = await Promise.all([
      fetchFPLJson(`/leagues-h2h/${leagueId}/standings/`, 'league standings'),
      fetchFPLJson('/bootstrap-static/', 'bootstrap-static data'),
    ])

    const standings = standingsPayload.standings?.results ?? []

    const playerNames = new Map<number, string>()
    // `event_points` is live throughout a gameweek, unlike the entry-level
    // totals below. See the live-points note on `points` further down.
    const playerPoints = new Map<number, number>()
    for (const player of bootstrapData.elements) {
      playerNames.set(player.id, player.web_name)
      playerPoints.set(player.id, player.event_points ?? 0)
    }

    /** What a squad is worth right now, from the per-player scores.
     *
     *  `entry_history.points` is 0 until FPL scores the gameweek, which left
     *  Manager of the Week reading 0 PTS beside a HIGHEST of 22. The picks are
     *  already here and `event_points` is live, so the total is summed from
     *  them instead: multiplier rather than squad slot, so a captain doubles
     *  and a Bench Boost bench counts, less the hit, exactly as FPL totals it.
     */
    const livePoints = (picksData: any) =>
      (picksData?.picks ?? []).reduce(
        (total: number, pick: any) =>
          total + (playerPoints.get(pick.element) ?? 0) * (pick.multiplier ?? 0),
        0,
      ) - (picksData?.entry_history?.event_transfers_cost ?? 0)

    const perManager = await mapWithConcurrency(standings, 4, async (team: any) => {
      const entry = team.entry
      if (!entry) return null

      const [transfersData, picksData] = await Promise.all([
        fetchFPLJson(`/entry/${entry}/transfers/`, `transfers for entry ${entry}`),
        fetchFPLJson(`/entry/${entry}/event/${eventId}/picks/`, `picks for entry ${entry}`),
      ])

      const transfers = (Array.isArray(transfersData) ? transfersData : [])
        .filter((t: any) => t.event === eventId)
        .map((t: any) => ({
          ...t,
          element_in_name: playerNames.get(t.element_in) || 'Unknown',
          element_out_name: playerNames.get(t.element_out) || 'Unknown',
          manager_name: team.player_name,
          team_name: team.entry_name,
          cost: t.cost || 0,
        }))

      return {
        entry,
        manager_name: team.player_name,
        team_name: team.entry_name,
        // FPL's own figure once it exists, the live sum while it does not.
        points: picksData?.entry_history?.points || livePoints(picksData),
        transfers,
      }
    })

    const managers = perManager.filter((m: any) => m !== null)

    const transfers = managers
      .flatMap((m: any) => m.transfers)
      .sort((a: any, b: any) => a.manager_name.localeCompare(b.manager_name))

    const managerOfWeek = managers.reduce(
      (best: any, m: any) => (best === null || m.points > best.points ? m : best),
      null,
    )

    return jsonResponse({
      event: eventId,
      transfers,
      managerOfWeek: managerOfWeek
        ? {
            manager_name: managerOfWeek.manager_name,
            team_name: managerOfWeek.team_name,
            points: managerOfWeek.points,
          }
        : null,
      managers: managers.map((m: any) => ({
        entry: m.entry,
        manager_name: m.manager_name,
        team_name: m.team_name,
        points: m.points,
      })),
    })
  } catch (error) {
    return errorResponse(error, 'league-gameweek-stats function')
  }
})
