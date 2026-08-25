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
    for (const player of bootstrapData.elements) {
      playerNames.set(player.id, player.web_name)
    }

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
        points: picksData?.entry_history?.points ?? 0,
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
