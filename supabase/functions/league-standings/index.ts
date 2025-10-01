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
    const leagueId = pathParts[pathParts.length - 2] // Get league ID from path (before /standings)

    if (!leagueId) {
      return new Response(
        JSON.stringify({ error: 'League ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch league standings from FPL API
    const standingsResponse = await fetch(`https://fantasy.premierleague.com/api/leagues-h2h/${leagueId}/standings/`)

    if (!standingsResponse.ok) {
      throw new Error(`Failed to fetch league standings: ${standingsResponse.status}`)
    }

    const standingsData = await standingsResponse.json()

    return new Response(
      JSON.stringify(standingsData.standings ? standingsData.standings.results : standingsData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in league-standings function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})