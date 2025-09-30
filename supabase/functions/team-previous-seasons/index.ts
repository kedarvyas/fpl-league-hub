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

    // Fetch team history from FPL API
    const historyResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`)
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

    // Total players map for calculating percentages
    const totalPlayersMap = {
      "2023/24": 11200000,
      "2022/23": 10900000,
      "2021/22": 9000000,
      "2020/21": 8500000,
      "2019/20": 7600000,
      "2018/19": 6900000,
      "2017/18": 5700000,
      "2016/17": 4600000,
      "2015/16": 4200000,
      "2014/15": 3500000,
      "2013/14": 3200000,
    }

    // Format the seasons data
    const seasons = previousSeasons.map((season: any) => {
      const seasonName = season.season_name
      const totalPlayers = totalPlayersMap[seasonName as keyof typeof totalPlayersMap] || 10000000
      const percentage = (season.rank / totalPlayers) * 100

      // Determine rank tier for styling
      let tier, tier_color, tier_icon
      if (percentage <= 1) {
        tier = "top1"
        tier_color = "#10b981"
        tier_icon = "🏆"
      } else if (percentage <= 5) {
        tier = "top5"
        tier_color = "#f59e0b"
        tier_icon = "🥇"
      } else if (percentage <= 10) {
        tier = "top10"
        tier_color = "#8b5cf6"
        tier_icon = "🥈"
      } else if (percentage <= 25) {
        tier = "top25"
        tier_color = "#3b82f6"
        tier_icon = "🥉"
      } else {
        tier = "other"
        tier_color = "#6b7280"
        tier_icon = "🔵"
      }

      return {
        season: seasonName,
        total_points: season.total_points,
        rank: season.rank,
        percentage: Math.round(percentage * 100) / 100,
        tier,
        tier_color,
        tier_icon
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
