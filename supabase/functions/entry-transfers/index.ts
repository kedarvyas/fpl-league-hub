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
    const entryId = pathParts[pathParts.length - 2] // Get entry ID from path (before /transfers)

    if (!entryId) {
      return jsonResponse({ error: 'Entry ID is required' }, 400)
    }

    return jsonResponse(await fetchFPLJson(`/entry/${entryId}/transfers/`, 'entry transfers'))
  } catch (error) {
    return errorResponse(error, 'entry-transfers function')
  }
})
