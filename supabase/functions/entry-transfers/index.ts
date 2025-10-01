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
    const entryId = pathParts[pathParts.length - 2] // Get entry ID from path (before /transfers)

    if (!entryId) {
      return new Response(
        JSON.stringify({ error: 'Entry ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch entry transfers from FPL API
    const transfersResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/transfers/`)

    if (!transfersResponse.ok) {
      throw new Error(`Failed to fetch entry transfers: ${transfersResponse.status}`)
    }

    const transfersData = await transfersResponse.json()

    return new Response(
      JSON.stringify(transfersData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in entry-transfers function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})