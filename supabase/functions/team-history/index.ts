// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { fetchFPL } from "../_shared/fpl.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * `entry/{id}/history/`, mapped for the SEASON tab and passed through for the
 * transfer planner.
 *
 * The mapped `ranks` array is what MyTeamSeason has always read and is
 * unchanged. What is added is `current` and `chips` verbatim, because the
 * fields this function used to throw away are the only public source for two
 * numbers the planner cannot otherwise get:
 *
 * - **Free transfers.** There is no public endpoint for them — the
 *   authenticated `my-team/{id}/` has the figure and we have no auth against
 *   FPL. They have to be accumulated from `event_transfers` and
 *   `event_transfers_cost` across every played gameweek, with the weeks a
 *   Wildcard or Free Hit covered skipped, which needs `chips` too.
 * - **Purchase prices.** A Free Hit squad is discarded at the end of its
 *   gameweek, so transfers made on one must not count as purchases. `chips`
 *   is what identifies those gameweeks.
 *
 * Both are additive: nothing that was in the response has moved or changed
 * shape.
 */
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

    // Process current season data
    const currentSeason = historyData.current || []

    if (currentSeason.length === 0) {
      return new Response(
        JSON.stringify({
          ranks: [],
          highest_rank: null,
          lowest_rank: null,
          highest_rank_gw: null,
          lowest_rank_gw: null,
          current: [],
          chips: historyData.chips ?? []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract rank data for each gameweek
    const ranks = currentSeason.map((gw: any) => ({
      gameweek: gw.event,
      rank: gw.overall_rank,
      points: gw.points,
      total_points: gw.total_points
    }))

    // Find highest and lowest ranks
    // `current` and `chips` go through untouched — the planner needs the
    // per-gameweek transfer counts and costs this function used to drop.
    const passthrough = {
      current: currentSeason,
      chips: historyData.chips ?? []
    }

    let result = {
      ranks,
      highest_rank: null,
      lowest_rank: null,
      highest_rank_gw: null,
      lowest_rank_gw: null,
      ...passthrough
    }

    if (ranks.length > 0) {
      const highestRankData = ranks.reduce((min: any, current: any) =>
        current.rank < min.rank ? current : min
      )
      const lowestRankData = ranks.reduce((max: any, current: any) =>
        current.rank > max.rank ? current : max
      )

      result = {
        ranks,
        highest_rank: highestRankData.rank,
        lowest_rank: lowestRankData.rank,
        highest_rank_gw: highestRankData.gameweek,
        lowest_rank_gw: lowestRankData.gameweek,
        ...passthrough
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in team-history function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
