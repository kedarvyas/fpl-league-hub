// config/league.js
//
// FPL H2H league IDs are NOT stable across seasons — a league gets a new ID
// every August, and the previous season's ID starts returning 404 from the
// FPL API. Keep this in one place so the annual rollover is a one-line change.
//
// Deliberately not read from REACT_APP_LEAGUE_ID: the env var lives in the
// Netlify dashboard, so a stale value there silently overrides the code and
// breaks every league-scoped page with no local reproduction.
export const DEFAULT_LEAGUE_ID = '1164871'; // Tacticos Super League, 2026/27
