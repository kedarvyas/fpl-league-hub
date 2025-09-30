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
    const teamId = url.searchParams.get('teamId')

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: 'Team ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch team data from FPL API
    const teamResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/`)
    if (!teamResponse.ok) {
      throw new Error('Failed to fetch team data')
    }
    const teamData = await teamResponse.json()

    // Get current gameweek from bootstrap
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')
    if (!bootstrapResponse.ok) {
      throw new Error('Failed to fetch bootstrap data')
    }
    const bootstrapData = await bootstrapResponse.json()

    // Find current gameweek
    const currentGw = bootstrapData.events.find((gw: any) => gw.is_current) ||
                     bootstrapData.events.find((gw: any) => gw.is_next)

    if (currentGw) {
      teamData.current_event = currentGw.id
      const currentGwId = currentGw.id

      // Get previous gameweek data if available
      if (currentGwId > 1) {
        try {
          // Fetch team history to get previous gameweek rank
          const historyResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`)
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()

            // Get current gameweek data from history
            const currentGwHistory = historyData.current.find((gw: any) => gw.event === currentGwId)
            if (currentGwHistory) {
              teamData.current_event_rank = currentGwHistory.overall_rank
            }

            // Get previous gameweek data
            const prevGwHistory = historyData.current.find((gw: any) => gw.event === currentGwId - 1)
            if (prevGwHistory && currentGwHistory) {
              // Calculate rank change (positive means improvement/rank went down)
              const rankChange = prevGwHistory.overall_rank - currentGwHistory.overall_rank
              teamData.rank_change = rankChange
              teamData.previous_event_rank = prevGwHistory.overall_rank
            }
          }
        } catch (error) {
          console.warn('Could not fetch history data:', error)
        }
      }
    }

    return new Response(
      JSON.stringify(teamData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in team-data function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
