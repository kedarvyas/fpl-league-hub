// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, errorResponse, fetchFPLJson, jsonResponse } from "../_shared/fpl.ts"

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
      return jsonResponse({ error: 'League ID is required' }, 400)
    }

    const standingsData = await fetchFPLJson(`/leagues-h2h/${leagueId}/standings/`, 'league standings')

    return jsonResponse(standingsData.standings ? standingsData.standings.results : standingsData)
  } catch (error) {
    return errorResponse(error, 'league-standings function')
  }
})
