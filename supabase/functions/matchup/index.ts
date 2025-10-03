// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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

    // For now, we'll use the league ID from the original weekly-matchups call
    // The frontend should pass the league ID, but as a temporary fix, we'll use a hardcoded league ID
    const leagueId = '1176282' // TODO: This should be passed as a parameter

    // Fetch matchup details from FPL API
    const matchupResponse = await fetch(`https://fantasy.premierleague.com/api/leagues-h2h-matches/league/${leagueId}/?event=${event}`)

    if (!matchupResponse.ok) {
      throw new Error(`Failed to fetch matchup details: ${matchupResponse.status}`)
    }

    const matchupData = await matchupResponse.json()

    // Find the specific matchup and get team details
    if (matchupData.results && matchupData.results.length > 0) {
      const matchup = matchupData.results.find((match: any) => match.id.toString() === matchupId)

      if (matchup) {
        // Fetch bootstrap data for player information
        const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')
        const bootstrapData = await bootstrapResponse.json()

        // Create player lookup map
        const playerMap = new Map()
        bootstrapData.elements.forEach((player: any) => {
          playerMap.set(player.id, {
            name: player.web_name,
            position: bootstrapData.element_types.find((t: any) => t.id === player.element_type)?.singular_name_short || '',
            team: bootstrapData.teams.find((t: any) => t.id === player.team)?.short_name || ''
          })
        })

        // Fetch detailed team data for both entries
        const [team1Response, team2Response] = await Promise.all([
          fetch(`https://fantasy.premierleague.com/api/entry/${matchup.entry_1_entry}/event/${event}/picks/`),
          fetch(`https://fantasy.premierleague.com/api/entry/${matchup.entry_2_entry}/event/${event}/picks/`)
        ])

        const [team1Data, team2Data] = await Promise.all([
          team1Response.ok ? team1Response.json() : null,
          team2Response.ok ? team2Response.json() : null
        ])

        // Enrich picks with player information
        if (team1Data?.picks) {
          team1Data.picks = team1Data.picks.map((pick: any) => {
            const playerInfo = playerMap.get(pick.element)
            return {
              ...pick,
              id: pick.element,
              name: playerInfo?.name || 'Unknown',
              position: playerInfo?.position || '',
              club: playerInfo?.team || '',
              points: pick.points || 0,
              isCaptain: pick.is_captain,
              isViceCaptain: pick.is_vice_captain,
              isStarting: pick.multiplier > 0,
              multiplier: pick.multiplier
            }
          })
        }

        if (team2Data?.picks) {
          team2Data.picks = team2Data.picks.map((pick: any) => {
            const playerInfo = playerMap.get(pick.element)
            return {
              ...pick,
              id: pick.element,
              name: playerInfo?.name || 'Unknown',
              position: playerInfo?.position || '',
              club: playerInfo?.team || '',
              points: pick.points || 0,
              isCaptain: pick.is_captain,
              isViceCaptain: pick.is_vice_captain,
              isStarting: pick.multiplier > 0,
              multiplier: pick.multiplier
            }
          })
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