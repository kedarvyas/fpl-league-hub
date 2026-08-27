// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { fetchFPL } from "../_shared/fpl.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const matchupId = pathParts[pathParts.length - 1] // Get matchup ID from path
    const event = url.searchParams.get('event')
    const leagueId = url.searchParams.get('leagueId')

    if (!matchupId) {
      return new Response(
        JSON.stringify({ error: 'Matchup ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Event parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!leagueId) {
      return new Response(
        JSON.stringify({ error: 'leagueId parameter is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch matchup details from FPL API
    const matchupResponse = await fetchFPL(`https://fantasy.premierleague.com/api/leagues-h2h-matches/league/${leagueId}/?event=${event}`)

    if (!matchupResponse.ok) {
      throw new Error(`Failed to fetch matchup details: ${matchupResponse.status}`)
    }

    const matchupData = await matchupResponse.json()

    // Find the specific matchup and get team details
    if (matchupData.results && matchupData.results.length > 0) {
      const matchup = matchupData.results.find((match: any) => match.id.toString() === matchupId)

      if (matchup) {
        // Fetch bootstrap data for player information
        const bootstrapResponse = await fetchFPL('https://fantasy.premierleague.com/api/bootstrap-static/')
        const bootstrapData = await bootstrapResponse.json()

        // Create player lookup map
        const playerMap = new Map()
        bootstrapData.elements.forEach((player: any) => {
          playerMap.set(player.id, {
            name: player.web_name,
            position: bootstrapData.element_types.find((t: any) => t.id === player.element_type)?.singular_name_short || '',
            team: bootstrapData.teams.find((t: any) => t.id === player.team)?.short_name || '',
            eventPoints: player.event_points || 0
          })
        })

        // Enrich picks with player information and calculate actual points.
        //
        // Note `position` below is deliberately the player's GKP/DEF/MID/FWD
        // label, not the pick's slot — the slot is preserved as
        // `squadPosition` because it is the only reliable starter test.
        const enrichPicks = (picks: any[]) => picks.map((pick: any) => {
          const playerInfo = playerMap.get(pick.element)

          // Calculate actual points: player's event points * multiplier
          const actualPoints = (playerInfo?.eventPoints || 0) * (pick.multiplier || 0)

          return {
            ...pick,
            id: pick.element,
            name: playerInfo?.name || 'Unknown',
            position: playerInfo?.position || '',
            club: playerInfo?.team || '',
            points: actualPoints,
            isCaptain: pick.is_captain,
            isViceCaptain: pick.is_vice_captain,
            // Slots 1-11 are the XI, 12-15 the bench. NOT `multiplier > 0`:
            // under Bench Boost the bench genuinely scores, so all fifteen
            // picks come back with a multiplier of 1 and every bench player
            // would be counted as a starter.
            squadPosition: pick.position,
            isStarting: pick.position <= 11,
            multiplier: pick.multiplier
          }
        })

        // Fetch detailed team data for both entries
        const [team1Response, team2Response] = await Promise.all([
          fetchFPL(`https://fantasy.premierleague.com/api/entry/${matchup.entry_1_entry}/event/${event}/picks/`),
          fetchFPL(`https://fantasy.premierleague.com/api/entry/${matchup.entry_2_entry}/event/${event}/picks/`)
        ])

        const [team1Data, team2Data] = await Promise.all([
          team1Response.ok ? team1Response.json() : null,
          team2Response.ok ? team2Response.json() : null
        ])

        if (team1Data?.picks) {
          team1Data.picks = enrichPicks(team1Data.picks)
        }

        if (team2Data?.picks) {
          team2Data.picks = enrichPicks(team2Data.picks)
        }

        return new Response(
          JSON.stringify({
            matchup,
            team1: team1Data,
            team2: team2Data
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Matchup not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in matchup function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
