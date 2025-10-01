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
    const leagueId = pathParts[pathParts.length - 1] // Get league ID from path
    const event = url.searchParams.get('event')

    if (!leagueId) {
      return new Response(
        JSON.stringify({ error: 'League ID is required' }),
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

    // Fetch weekly matchups from FPL API
    const matchupsResponse = await fetch(`https://fantasy.premierleague.com/api/leagues-h2h-matches/league/${leagueId}/?event=${event}`)

    if (!matchupsResponse.ok) {
      throw new Error(`Failed to fetch weekly matchups: ${matchupsResponse.status}`)
    }

    const matchupsData = await matchupsResponse.json()

    return new Response(
      JSON.stringify(matchupsData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in weekly-matchups function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})