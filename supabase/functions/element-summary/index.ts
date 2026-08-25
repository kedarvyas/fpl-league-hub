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
    const playerId = pathParts[pathParts.length - 1] // Get player ID from path

    if (!playerId) {
      return jsonResponse({ error: 'Player ID is required' }, 400)
    }

    return jsonResponse(await fetchFPLJson(`/element-summary/${playerId}/`, 'element summary'))
  } catch (error) {
    return errorResponse(error, 'element-summary function')
  }
})
