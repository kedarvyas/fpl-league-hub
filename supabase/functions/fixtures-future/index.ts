// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders, errorResponse, fetchFPLJson, jsonResponse } from "../_shared/fpl.ts"

// Every remaining fixture, in one call.
//
// The `fixtures` function forces `?event=`, so a three-gameweek strip costs
// three requests and a five-gameweek one costs five — a burst from a single
// Supabase egress IP, which is exactly what the upstream WAF answers with a
// flat 403. `?future=1` returns the whole remainder of the season instead:
// 370 fixtures in ~115KB at GW2, each carrying `team_h_difficulty` and
// `team_a_difficulty`. One call is better than retrying five.
//
// Note that a gameweek is not guaranteed ten fixtures. Once cup postponements
// land a club can have none in a gameweek (a blank) or two (a double), so
// consumers must group by team *and* event rather than looking one up.
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    return jsonResponse(await fetchFPLJson('/fixtures/?future=1', 'future fixtures'))
  } catch (error) {
    return errorResponse(error, 'fixtures-future function')
  }
})
