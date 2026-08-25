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
    const leagueId = pathParts[pathParts.length - 1] // Get league ID from path
    const event = url.searchParams.get('event')

    if (!leagueId) {
      return jsonResponse({ error: 'League ID is required' }, 400)
    }

    if (!event) {
      return jsonResponse({ error: 'Event parameter is required' }, 400)
    }

    return jsonResponse(await fetchFPLJson(
      `/leagues-h2h-matches/league/${leagueId}/?event=${event}`,
      'weekly matchups',
    ))
  } catch (error) {
    return errorResponse(error, 'weekly-matchups function')
  }
})
