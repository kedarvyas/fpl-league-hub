# FPL League Hub

A dashboard for Fantasy Premier League head-to-head leagues: weekly matchups,
league standings, per-manager team pages, and player statistics.

Live at **https://tacticosfplhub.netlify.app**

## Architecture

```
Netlify (React SPA)  ->  Supabase Edge Functions  ->  fantasy.premierleague.com/api
                     ->  Supabase Auth (Google, email)
```

The Edge Functions exist because the FPL API sends no CORS headers, so the
browser cannot call it directly. They are thin proxies plus a little
aggregation. There is no database — every page is derived from live FPL data.

| Piece | Where |
|---|---|
| Frontend | `frontend/` — React 18, CRA + craco, Tailwind, Recharts |
| API | `supabase/functions/` — Deno |
| Auth | Supabase Auth, project ref `hvgotlfiwwirfpezvxhp` |

### `backend/` is legacy

The FastAPI service in `backend/` was replaced by the Edge Functions in
September 2025 and is no longer deployed or referenced by the frontend. It is
kept only for reference. `render.yaml` describes that dead deployment.

## Local development

```bash
cd frontend
npm install
npm start
```

Runs at http://localhost:3000 against the deployed Edge Functions — no local
backend needed. `frontend/.env` holds `REACT_APP_SUPABASE_URL`,
`REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_API_URL`, and `REACT_APP_SITE_URL`.

### Edge Functions

```bash
supabase functions deploy <name> --project-ref hvgotlfiwwirfpezvxhp
```

Shared helpers live in `supabase/functions/_shared/fpl.ts`. Use `fetchFPL` /
`fetchFPLJson` for every upstream call rather than bare `fetch` — they retry
transient failures (including the 403s the FPL WAF returns when it sees a
burst from Supabase's shared egress IP) and preserve the upstream status code
instead of collapsing everything into a 500.

## Seasonal rollover — read this every August

**H2H league IDs do not survive the season.** The league gets a new ID each
year and the old one starts returning 404 from the FPL API, which surfaces as
league-scoped pages showing zeros or errors.

To roll over, edit one line in `frontend/src/config/league.js`:

```js
export const DEFAULT_LEAGUE_ID = '1164871'; // Tacticos Super League, 2026/27
```

Find the new ID in the FPL URL: `fantasy.premierleague.com/leagues/<ID>/standings/h`.

This is deliberately *not* read from an environment variable. The Netlify
dashboard holds its own copy of env vars, so a value left over from last
season silently overrides the code with no local reproduction.

### Other things that change between seasons

Gameweek selection is already dynamic (`events.find(e => e.is_current)`), so it
needs no attention. But early in a season only one or two gameweeks exist —
aggregates are near zero and per-90 figures are noisy, so UI must tolerate 0,
`null`, and absent fields.

## Deployment

Netlify builds from `main` on push (`netlify.toml`). Edge Functions deploy
separately via the Supabase CLI — pushing does not deploy them.

> The Supabase free tier **pauses a project after inactivity**. A paused
> project stops resolving in DNS, which makes the whole site look broken while
> the code is fine. Check the Supabase dashboard before debugging anything else.
