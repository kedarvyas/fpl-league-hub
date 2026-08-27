# Handoff — redesign `Home.js`

**Task:** convert `/` to the Scoreboard design system. It is the final route
still on the old design.

**Start here:** read `docs/scoreboard-design-system.md` completely. It is the
system of record for tokens, typography, spacing, components, contrast rules,
verification, and rollout status. Do not restate or fork it. The reference
implementation remains `/player/:playerId` (live:
https://tacticosfplhub.netlify.app/player/165).

Before writing, read these current implementations for idiom:

- `components/MyTeam.js` — manager/team identity, masthead, summary strip,
  tabs, explicit empty states, team switching
- `components/Dashboard.js` — global-first page, optional league context,
  `fetchWithRetry`, effect cancellation, rail layout
- `components/WeeklyMatchups.js` — league-ID onboarding and persistence,
  masthead, compact input, hairline stacks
- `components/PlayerStatisticsHub.js` — search/filter controls and desktop
  scale steps
- `components/Header.js` + `components/Layout.js` — page shell and the last
  legacy-layout branch that disappears when Home converts

---

## 1. What Home is today

`frontend/src/components/Home.js`, roughly 185 lines. It is a generic landing
page made from two rounded shadcn cards and a three-column feature preview.

Structure:

- centred “Welcome to FPL League Hub” heading and product-description paragraph
- **My Team Info** card: team-ID input → `/my-team`
- **Import Your League** card: H2H league-ID input → `/weekly-matchups/:id`
- **What You Can Explore**: three icon/marketing blurbs

There is no API request on the page. Its meaningful job is onboarding two
pieces of local identity/context:

- `fpl_my_entry` through `useMyEntry()` — “this manager is me”
- `fpl_league_id` through `useLocalStorage()` / the H2H route — “this is my
  league”

Everything else is marketing copy.

---

## 2. Decide the page's job before laying it out

The converted pages now have precise jobs:

- H2H: **my league this week**
- Dashboard: **the gameweek at large**, with league context only after the
  reader explicitly supplies a league
- My Team: **this manager's season**
- Players: **find and evaluate a player**

Home should be **start or resume your FPL hub**. The strongest structure is a
state-aware front door, not a brochure:

1. If no IDs are saved, lead with two compact setup actions: identify your
   team and add your H2H league.
2. If one or both are saved, lead with resume actions carrying the saved IDs
   and offer a deliberate CHANGE action. Do not make people re-enter data the
   app already knows.
3. Keep discovery links to Dashboard and Players, but do not repeat feature
   marketing already obvious from the navigation.

The current three-icon “What You Can Explore” section is low-information. It
can be replaced or removed. Do not preserve it merely because it exists.

---

## 3. Identity and privacy rules — do not regress these

This is the important behavioural constraint.

### Team identity

`useMyEntry()` owns `fpl_my_entry`. Submitting a team ID on Home is an explicit
“this is me” action, so Home should continue writing it before navigating to
`/my-team`.

Browsing another manager from Dashboard/H2H must never overwrite this key.
That bug was fixed during the MyTeam conversion.

### League context

`fpl_league_id` is the reader's league. A fresh browser must have no league
context.

The old Dashboard used `DEFAULT_LEAGUE_ID` and exposed the app owner's Tacticos
league to every new visitor. That fallback has been deleted. Current rules:

- `/dashboard` reads `fpl_league_id`; without one it renders global FPL data
  only — no league ID, league average, standings, or manager links.
- `/dashboard/:leagueId` may show the explicitly supplied league but does not
  silently claim it as the reader's saved league.
- `/weekly-matchups/:leagueId` is an explicit league visit and persists the ID.
- `GameweekStats` has no default league fallback.

Home currently navigates league submissions to `/weekly-matchups/:id`, whose
effect persists the URL ID. It would be cleaner for the redesign to write
`fpl_league_id` directly in `handleLeagueSubmit` as well, making the ownership
of the action obvious and synchronous. Keep the H2H persistence for direct
links.

Do **not** gate these local preferences on Supabase login. Authentication today
only controls the header account state; IDs are browser-local conveniences and
the app works signed out.

---

## 4. Old-design debt to remove with the conversion

- `min-h-screen ... max-w-4xl` legacy shell; converted pages are
  `mx-auto max-w-[1280px] font-mono`
- rounded `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`
- rounded inputs and buttons
- `Search`, `Users`, `ArrowRight` decorative Lucide icons
- the three circular icon blobs in the feature preview
- `from-header-bg-from` / `to-header-bg-to`: dead Tailwind classes whose tokens
  were deleted during the header conversion; they render no gradient
- `card-header-text` / `card-header-text-secondary`, retained only for this
  old page
- title-case, paragraph-heavy marketing typography

Once Home is converted:

1. add `/` to the Scoreboard shell by simplifying `Layout.js` rather than adding
   another special case — every route will then use the same shell, so delete
   `SCOREBOARD_ROUTES` and the legacy container branch
2. move `font-mono` to the `Layout` root and remove redundant page-root copies
   only if a quick scan confirms no modal/portal depends on the local class
3. remove the now-unused card-header CSS utilities/tokens from `index.css`
4. check whether `components/ui/card` and `components/ui/button` still have any
   imports; delete dead UI wrappers only if the import scan is clean

Keep housekeeping separable from the visual conversion in git if it materially
changes the bundle.

---

## 5. Scoreboard constraints that matter specifically here

- radius 0, no shadows
- hairlines are `gap-px` on `bg-border`, not bordered floating cards
- 44px minimum touch targets
- mobile first at 375px with no horizontal scroll
- all six themes: Light, Dark, Sage, Ocean, Midnight, Turf
- `--primary` is structural and never a text-bearing chip; use
  `bg-primary-chip text-background`
- fill colours are not text colours: use the `-ink` token for text or for a
  fill carrying text
- active text can use `text-live-ink`; pure bars/tracks use `bg-live`
- `text-primary-lighter` is still a dead class and must not be copied. It
  inherits `--foreground` today. Use an explicit on-system treatment.

Run `frontend/scripts/contrast-audit.js` in the browser after the page is built.
It checks every text node against its composited background across all themes.
Also inspect non-text contrast separately; that script does not cover
hairlines, controls, or graph fills.

---

## 6. Suggested information architecture

This is a direction, not a wireframe to copy blindly:

- small masthead: `FPL LEAGUE HUB` / current gameweek or season context from
  bootstrap only if that data earns the request; otherwise keep the page
  request-free
- one decisive headline about starting/resuming
- a two-cell or two-row setup/resume board:
  - **MY TEAM** — saved manager ID or compact ID input
  - **MY H2H LEAGUE** — saved league ID or compact ID input
- a short route strip for the two context-free destinations:
  - **GAMEWEEK DASHBOARD** — always available, global FPL
  - **PLAYER HUB** — always available
- terse help text showing where each numeric ID appears in the official FPL
  URL; no placeholder IDs that look like preloaded user data

State changes deserve designed modes:

- no IDs: setup
- only team: resume team + add league
- only league: resume league + identify team
- both: resume board + change controls
- invalid/failed ID: preserve the input and show a local error; never save an
  ID that has not been validated if validation is added

The current Home page does not validate IDs before saving/navigating. Decide
whether Home should stay request-free and let destination pages validate, or
validate before persistence. If validating, use `fetchWithRetry` and effect/
request cancellation where applicable. Avoid five calls on mount; the FPL WAF
still returns bursty 403s.

---

## 7. Verification and completion checklist

- fresh browser, no storage: no personal team or league is implied
- saved team only, league only, and both: correct resume state
- changing a team writes `fpl_my_entry`; browsing another manager does not
- changing/adding a league writes `fpl_league_id`
- `/dashboard` with no saved league remains global-only
- `/dashboard` with a saved league shows the optional league comparison/rail
- `/dashboard/:leagueId` shows that explicit league
- `/weekly-matchups/:leagueId` persists the explicit league
- 375px: no horizontal scroll; all controls at least 44px
- all six themes: visual pass plus `contrastAudit()` clean
- keyboard submit, focus visibility, labels, disabled states
- production build
- unit tests; `App.test.js` is now a route smoke test rather than CRA's stale
  “learn react” placeholder
- update the rollout table in `scoreboard-design-system.md`: Home becomes Done,
  and remove text claiming a final old-design route remains

---

## 8. Current rollout status

Every route except `/` is on Scoreboard. The Dashboard fresh-browser leak is
fixed locally and should be live before this handoff is used. The remaining
visual work is Home and the cleanup that only becomes safe once no legacy page
depends on the old shell.

