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
    const playerId = pathParts[pathParts.length - 1] // Get player ID from path

    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Player ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch element summary from FPL API
    const elementResponse = await fetch(`https://fantasy.premierleague.com/api/element-summary/${playerId}/`)

    if (!elementResponse.ok) {
      throw new Error(`Failed to fetch element summary: ${elementResponse.status}`)
    }

    const elementData = await elementResponse.json()

    return new Response(
      JSON.stringify(elementData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in element-summary function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})