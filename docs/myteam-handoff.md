# Handoff — redesign `MyTeam.js`

**Task:** give `/my-team` a new layout on the Scoreboard design system. It is one of the last two pages still on the old design.

**Start here:** `docs/scoreboard-design-system.md` is the system of record — tokens, type scale, spacing, components, rollout status, and two known token gaps. Don't restate it; follow it. The reference implementation is the player page, `/player/:playerId` (live: https://tacticosfplhub.netlify.app/player/165).

**Recently converted pages worth reading for idiom** before writing anything:
- `components/WeeklyMatchups.js` + `components/MatchupLedger.js` — masthead, summary strip, hairline rows, expandable detail
- `components/PlayerStatisticsHub.js` — tabs, search, filters, sortable list, `md:` desktop steps
- `components/Dashboard.js` — masthead + rail layout, `fetchWithRetry`, effect cancellation
- `components/PlayerScoringTab.js` — **the only on-system Recharts example.** It themes with `fill='hsl(var(--live))'` / `'hsl(var(--border))'` and `isAnimationActive={false}`

---

## 1. What the page is today

588 lines, route `/my-team`. Reached three ways: the nav, the Home page team-ID box, and — importantly — by clicking any manager's name on the H2H or Dashboard pages, which navigates here with `location.state.teamId`.

**Structure:**

- Team-ID input (hidden once a team loads)
- Two tabs, `Live` and `Pick`
- **Live tab:** a team-info card (id / name / manager) → four stat cards (Gameweek, GW Points, Total Points, Rank Change) → a Recharts area chart of overall rank across the season → a previous-seasons table
- **Pick tab:** a literal placeholder. `"Team lineup and picks will be displayed here (coming soon)"`

**Data it fetches** (three sequential calls, all hitting `SUPABASE_URL/functions/v1/...` directly rather than the shared `API_URL`):

| Endpoint | Returns |
|---|---|
| `team-data?teamId=` | The full FPL entry object |
| `team-history?teamId=` | `ranks[]` of `{gameweek, rank, points, total_points}`, plus `highest_rank`/`lowest_rank` and their gameweeks |
| `team-previous-seasons?teamId=` | `seasons[]` of `{season, total_points, rank, percentage, tier, tier_color, tier_icon}` |

---

## 2. Things that need attention

Ordered by how much they matter. The first one is the headline.

### The `Pick` tab is a stub, and the page is called My Team

It renders a "coming soon" sentence. A page named *My Team* that cannot show your team is the biggest problem here, well ahead of styling.

**It is buildable today.** The `entry-picks` Edge Function already exists and works — it proxies `/entry/{id}/event/{event}/picks/` and is called as `/entry/{entryId}/event/{eventId}/picks`. It returns the full 15-man squad plus an `entry_history` object with `points`, `total_points`, `overall_rank`, `event_transfers`, `event_transfers_cost` (the hit), `points_on_bench`, `value`, `bank` and `active_chip`, and an `automatic_subs` array.

Note the picks come back **raw** here — unlike the `matchup` endpoint, they are not enriched with player names, positions or clubs. You will need to join against `bootstrap-static` `elements` yourself. `lib/h2h.js` shows the shape that enrichment takes.

Decide deliberately: build the tab, or drop it. Shipping the placeholder again is the one outcome to avoid.

### `wildcards_played` is dead code

`MyTeam.js` renders a "Wildcard chip in play" badge gated on `teamData.wildcards_played`. The `team-data` Edge Function **never sets that field** — I checked the function source and the live response. The badge can never appear. Either populate it server-side or delete the branch.

### `rank_change` is absent at GW1 only

The Rank Change card currently renders an empty space where its badge should be. This one is *correct* behaviour, not a bug: `team-data` computes `rank_change` only when a previous gameweek exists, so it is absent in GW1 and will populate from GW2. Worth knowing before you "fix" it — but the card should still have a designed empty state rather than a blank.

### Colour that will break in five of six themes

- `formatRankChange` uses `bg-green-600` / `bg-red-600` with `text-white`
- The two rank-stat cards use `text-green-600` / `text-red-600` icons
- The previous-seasons table renders `tier_color` — **a hex string supplied by the backend** — inline as `backgroundColor`, `color`, and a `1px solid` border, at lines 199–201 and 220–222
- The chart's dots use `stroke: '#fff'`

The `tier_color` one needs a decision, not just a find-and-replace: the palette arrives from the API, so either map tiers to tokens client-side or stop using the API's colour.

### You cannot change team once one is loaded

`setShowInput(false)` runs after a successful load and nothing sets it back except the error path's "Try Again". So there is no deliberate way to switch teams — you have to fail a request first.

### `fpl_team_id` drift — worth thinking about properly

`MyTeam` writes `fpl_team_id` from `location.state.teamId`. Clicking **any** manager on the H2H or Dashboard pages navigates here and overwrites it. So the stored "my team" is really "the last manager I looked at".

This matters beyond this page: the H2H page's `YOUR FIXTURE` section and the standings `YOU` marker both key off `fpl_team_id`, so they silently follow whoever you last clicked. The clean fix is a separate, explicitly-set "this is me" key that browsing never touches, with `fpl_team_id` staying as the transient "team being viewed". That is a cross-page change — worth doing here since this page is the one that writes it.

### No retry on the FPL WAF

All three fetches are bare `fetch`. The Edge Functions proxy the FPL API, whose WAF answers a burst from one origin with a flat `403` that looks exactly like an app bug. Use `fetchWithRetry` from `config/supabase.js` (added for the Dashboard, which had the same failure). Also switch to `API_URL` and `apiHeaders()` rather than rebuilding headers inline.

### Page shell

The page has its own `min-h-screen ... max-w-7xl mx-auto` container and is **not** in `SCOREBOARD_ROUTES` in `Layout.js`. Converted pages are `mx-auto max-w-[1280px] font-mono` with their route added to that list, so the legacy container stops double-padding them. Add `/my-team` when you convert.

---

## 3. Data you already have and aren't using

This is the most promising material on the page, and none of it costs a new request.

**From `team-data`, entirely unused:**

- **`leagues.classic`** — an array (7 for the team I tested) of every mini-league the manager is in, each with `name`, `entry_rank`, `entry_last_rank`, `rank_count` and `entry_percentile_rank`. Real "where do I stand" material, including the global *Overall* and *Gameweek N* leagues.
- **`leagues.h2h`** — the same for head-to-head leagues, which ties this page to the H2H page.
- **`last_deadline_value`** and **`last_deadline_bank`** — squad value and money in the bank, in tenths.
- **`last_deadline_total_transfers`**, `entered_events`, `years_active`, `favourite_team`, `club_badge_src`, `kit`.

**From `team-history`:** `ranks[]` carries `points` and `total_points` per gameweek, but only `rank` is plotted. A gameweek-by-gameweek points history is sitting there unused — and the Scoreboard system has an established way to draw it (see `PlayerScoringTab.js`).

**From `entry-picks`:** everything in §2 above — the squad, the hit taken, points left on the bench, the chip played.

---

## 4. Questions worth deciding rather than assuming

- **What is this page for?** Right now it is half "my season stats" and half an empty lineup tab. The other pages each got a single clear job — H2H is "my league this week", Dashboard is "the gameweek at large". This one needs the same treatment before layout.
- **Does the `Pick` tab survive as a tab,** or does the squad become the main content with season history secondary? A page called *My Team* arguably leads with the team.
- **The rank chart.** Keep an area chart, or express rank on-system? Rank is inverted (lower is better), spans millions, and the current chart carries a `📈` emoji in its heading and a sentence restating the two numbers shown directly above it.
- **Mini-leagues.** Seven leagues with rank and percentile is a lot of unused signal — a panel, or too much?
- **How does someone switch teams,** and how do we stop "my team" drifting to whoever you last clicked?

---

## 5. Constraints

- React 18, Tailwind, shadcn/Radix. **MUI is gone from `src/`** — do not reintroduce it.
- Recharts is fine; `PlayerScoringTab.js` is the on-system precedent.
- **All six themes** (Light, Dark, Sage, Ocean, Midnight, Turf) and **375px with no horizontal scroll**. Sage and Ocean have white panels on tinted grounds while Dark, Midnight and Turf have dark panels on darker grounds, so anything relying on a hue rather than a lightness step inverts badly somewhere.
- 44px minimum touch targets.
- Verify in the browser before claiming it works. Measuring computed styles and contrast beats eyeballing screenshots — that is how the last three pages' real bugs were caught.

---

## 6. Where the wider rollout stands

**On Scoreboard:** player page + tabs, header/`Layout`/`ThemeSwitcher`/`LoginModal`/`ui/dropdown-menu`, `WeeklyMatchups`/`LeagueTable`/`GameweekStats`/`MatchupLedger`, `PlayerStatisticsHub`, `PlayerSearchModal`/`PlayerComparison`, `Dashboard`.

**Still old design:** `MyTeam.js` (this task) and `Home.js`.

`Home.js` also still carries dead `from-header-bg-from` / `to-header-bg-to` class names whose tokens were deleted during the header work. They render nothing.

### Two known token gaps

Both affect already-shipped surfaces. Each is one added token, following the existing `--accent-chip` pattern. **Not yet fixed — a deliberate decision, not an oversight:**

- **`bg-primary` with `text-background`** (the player-page hero position chip) measures **2.75:1 in Ocean**, 2.81:1 in Midnight, 3.66:1 in Sage. `--primary` is not guaranteed to contrast with `--background`. Where it mattered most — the player hub's position filter — it was replaced with the value inversion, which is `--foreground` on `--background` by construction and clears 9.6:1 everywhere. A `--primary-chip` token would fix the rest.
- **`text-live` as a label** (the active tab bar) measures **3.2–3.8:1** in Light, Sage and Ocean — below AA for 9.5px text. `--live` as a *fill* behind `--background`-coloured text is always fine; as text it is not. A `--live-text` token would fix it.

If you touch tab bars or hero chips on this page, prefer the inversion over `bg-primary`, and don't add new `text-live` labels.

### Housekeeping available

`package.json` still lists `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `react-table` and `@headlessui/react`. **None are imported anywhere in `src/` any more.** Uninstalling is safe and untested — worth doing as its own commit so a bundle regression is easy to bisect.

### Also outstanding

Three layout directions for the H2H page were produced by a Claude Design session and have not been reviewed. If H2H gets revisited, look at those first. They do not affect this task.
