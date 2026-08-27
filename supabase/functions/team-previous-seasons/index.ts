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

    // Fetch team history from FPL API
    const historyResponse = await fetchFPL(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`)
    if (!historyResponse.ok) {
      throw new Error('Failed to fetch team history')
    }
    const historyData = await historyResponse.json()

    // Process previous seasons data
    const previousSeasons = historyData.past || []

    if (previousSeasons.length === 0) {
      return new Response(
        JSON.stringify({ seasons: [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Format the seasons data
    const seasons = previousSeasons.map((season: any) => {
      const seasonName = season.season_name

      // The FPL API supplies the finishing percentile per past season as
      // `rank_percentage`, a string with adaptive precision — "43", "2",
      // "0.7", "0.0". Use it rather than dividing the rank by a field size
      // of our own, which has to be maintained by hand every August and
      // silently goes wrong the season it is not.
      const parsed = parseFloat(season.rank_percentage)
      const percentage = Number.isFinite(parsed) ? parsed : null

      return {
        season: seasonName,
        total_points: season.total_points,
        rank: season.rank,
        percentage
      }
    })

    // Sort by season (most recent first)
    seasons.sort((a: any, b: any) => b.season.localeCompare(a.season))

    return new Response(
      JSON.stringify({ seasons }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in team-previous-seasons function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
