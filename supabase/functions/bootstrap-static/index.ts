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
    // Fetch bootstrap-static data from FPL API
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/')

    if (!bootstrapResponse.ok) {
      throw new Error(`Failed to fetch bootstrap-static data: ${bootstrapResponse.status}`)
    }

    const bootstrapData = await bootstrapResponse.json()

    return new Response(
      JSON.stringify(bootstrapData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in bootstrap-static function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})