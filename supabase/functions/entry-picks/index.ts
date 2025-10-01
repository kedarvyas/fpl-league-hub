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
    // Extract entry ID and event ID from path like /entry/123/event/4/picks
    const entryIndex = pathParts.indexOf('entry')
    const eventIndex = pathParts.indexOf('event')

    if (entryIndex === -1 || eventIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Invalid path format. Expected /entry/{id}/event/{event}/picks' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const entryId = pathParts[entryIndex + 1]
    const eventId = pathParts[eventIndex + 1]

    if (!entryId || !eventId) {
      return new Response(
        JSON.stringify({ error: 'Entry ID and Event ID are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch entry picks from FPL API
    const picksResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${eventId}/picks/`)

    if (!picksResponse.ok) {
      throw new Error(`Failed to fetch entry picks: ${picksResponse.status}`)
    }

    const picksData = await picksResponse.json()

    return new Response(
      JSON.stringify(picksData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in entry-picks function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})