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
    // Extract entry ID and event ID from path like /entry/123/event/4/picks
    const entryIndex = pathParts.indexOf('entry')
    const eventIndex = pathParts.indexOf('event')

    if (entryIndex === -1 || eventIndex === -1) {
      return jsonResponse({ error: 'Invalid path format. Expected /entry/{id}/event/{event}/picks' }, 400)
    }

    const entryId = pathParts[entryIndex + 1]
    const eventId = pathParts[eventIndex + 1]

    if (!entryId || !eventId) {
      return jsonResponse({ error: 'Entry ID and Event ID are required' }, 400)
    }

    return jsonResponse(await fetchFPLJson(`/entry/${entryId}/event/${eventId}/picks/`, 'entry picks'))
  } catch (error) {
    return errorResponse(error, 'entry-picks function')
  }
})
