# Scoreboard — FPL League Hub design system

The player page (`/player/:playerId`) is built on this and is the reference implementation. The full app now uses the system — see **Rollout status** below.

Live example: https://tacticosfplhub.netlify.app/player/165

---

## The six rules

Everything below follows from these. If a decision isn't covered, work it out from these rather than inventing a new pattern.

1. **Radius 0, no shadows.** The shadow-on-white-rounded-card look is exactly what this replaces.
2. **Hairlines are gaps, not borders.** Grids and stacks use `gap-px` on a `bg-border` container. Cells carry no border of their own. This is why the geometry reads as one dense board rather than a pile of cards.
3. **Real output and FPL scoring are separated by a value inversion, not a hue.** Real sits on `bg-panel` with `text-foreground`; FPL inverts to `bg-inverted` with `text-background`. Because it's a lightness flip, it survives all six themes and colour-blind reading, and it replaces every colour-coded legend in the app.
4. **Never hide a zero.** Tracks are drawn unfilled, values drop to `text-muted-foreground` at the same size. A fringe player and a starter have identical geometry — you compare them by how much ink is in the bars.
5. **Colour is earned.** `--live` is for real returns only. A player with nothing on the board gets muted, not a bright zero.
6. **Fill colours are not text colours.** Every saturated token here is tuned as a fill. Text — and any fill with text on it — takes the `-ink` variant. Getting this wrong is invisible on a screenshot and shows up immediately in `scripts/contrast-audit.js`.

---

## Tokens

All colours are HSL triples in `frontend/src/index.css`, consumed through Tailwind. **Never hardcode a hex or an `hsl()` literal in a component.**

### Added for Scoreboard

| Token | Purpose |
|---|---|
| `--panel` | Tile and panel fill. Required because Dark and Midnight set `--card` equal to `--background`, leaving a tile grid with nothing to sit on. |
| `--live` | Positive / returns / live. **A fill only.** Anything that is text, or a fill with text on it, takes `--live-ink`. |
| `--warn` | `COOLING` verdict, FDR 3. The fixture bands are `--live` / `--warn` / `--destructive` — fills only. |
| `--live-ink`, `--warn-ink`, `--destructive-ink`, `--primary-chip` | The same colours at a lightness that carries text. See **The -ink family** below — this is the single distinction most likely to be got wrong. |
| `--inverted` | The FPL-cell surface. `var(--foreground)` everywhere except Turf, which needs a warm off-white or the two greens fight. |
| `--accent` | Secondary accent. Tracks `--primary` except in Turf, where `--primary` and `--live` are the same lime and the expected/actual bars would be indistinguishable. |
| `--accent-chip` | `--accent` at a per-theme lightness that clears 4.5:1 on an `accent/15` field. Dark themes lighten, light themes darken. |

### Changed

`--primary` moved off the old violet (`271 81% 56%`) to `265 85% 54%` light / `265 85% 62%` dark. It now carries **structure only** — percentile fills, rank chips, the club watermark — never stat values. This is the single change that stopped the purple doing everything.

`--muted-foreground` was nudged in Dark (`215 22% 73%`) and Ocean (`200 55% 32%`). At 8.5px this token now carries real small text rather than incidental captions, and both were under 4.5:1.

### Themes

Six: Light, Dark, Sage, Ocean, Midnight, **Turf** (new — grass and floodlight; lime is `--primary` outright and amber takes the accent).

**Any new surface must be checked in all six.** The trap is that Sage/Ocean have white panels while Dark/Midnight/Turf have dark ones, so a colour that reads in one inverts badly in another.

---

## Type

**JetBrains Mono**, weights 400/500/700, imported at the top of `index.css`. Every number aligns by digit without `tabular-nums` hacks, and the wide-tracked small caps are the design's texture.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Hero name | 25px / 46px desktop | 700 | −.03em / −.045em |
| Hero event points | 52px | 700 | −.06em |
| Panel headline value | 34–40px | 700 | −.04 / −.05em |
| Stat value | 26px (28 desktop) | 700 | −.04em |
| Section header | 9px | 500 | .18em, uppercase |
| Stat label | 8.5px | 500 | .13em, uppercase |
| Rank chip | 8px | 500 | .1em |
| Micro / legend | 7–7.5px | 400 | .1–.12em |

7px is the floor, and only for uppercase micro-labels beside a large number — never for anything read as a sentence.

`Layout` applies `font-mono` at the app root; do not repeat it per component.

---

## Components to reuse

In `frontend/src/components/PlayerStatCell.js`:

- **`<PlayerStatCell>`** — label / value / rank chip / percentile track. Props: `label`, `value`, `decimals`, `rank`, `percentile`, `variant="real"|"fpl"`. The label sits in a **fixed 22px band** — that is what keeps a grid on one baseline regardless of label length. Don't remove it.
- **`<StatGrid>`** — `grid-cols-2` mobile, `md:grid-cols-4`, `gap-px` on `bg-border`.
- **`<SectionHeader>`** — label, hairline rule, optional right chip. `tone="live"` for FPL sections.

Helpers:

| Module | What |
|---|---|
| `lib/playerStats.js` | `percentileFor`, `rankFor`, `positionCount`, formatters (all null-safe, never return `NaN`) |
| `lib/playerVerdict.js` | The four-state call + `rankToPercentile` |
| `lib/pointsLedger.js` | Gameweek score → itemised rows |
| `lib/fdr.js` | Fixture difficulty banding + summary |

Spacing: section rhythm `pt-[22px] pb-2.5`; page gutter `px-4` mobile, `md:px-7`; cell padding `px-3 pt-[11px] pb-3`, panels `p-[14px]`. Tracks: 3px percentile, 4px price, 6px expected, 8px threshold segments.

---

## The header — done

`Header.js`, `Layout.js`, `ThemeSwitcher.js`, `LoginModal.js` and the shared
`ui/dropdown-menu` are on the system. How the open questions were answered:

- **Nav left the wordmark's band.** The top band holds the wordmark and the
  account controls; navigation is a strip below it. That strip is the same
  object as the player page's tab bar — hairline rule, 9.5px tracked caps, a 2px
  underline on the active item. The one difference is the underline colour:
  `--primary` marks structure (where you are in the app), `--live` stays with
  real returns. In Turf those are the same lime, which Turf already accepts.
- **The lockup is type only**, split by weight rather than size: `FPL` at 700 in
  `--foreground`, `LEAGUE HUB` at 400 in `--muted-foreground`, both 13px with
  `.2em` tracking. Wide and quiet, so it names the app without competing with a
  25px hero name directly below it.
- **The header is `bg-panel` with a `border-b` hairline.** That is the value
  separation from rule 3 applied to chrome — it reads as a distinct surface in
  all six themes without a gradient, and it fixes the merge into the hero band.
- **The gradient tokens are gone.** `--header-bg-from` / `--header-bg-to`, the
  `.card-header-gradient` utility, and the old header-text utilities were
  deleted with the final Home conversion.
- **No icons.** Controls are wide-tracked words in a `gap-px` strip, the
  hamburger is `MENU` / `CLOSE`, and the six theme icons became two-tone swatches
  of each theme's own background and primary. Those swatch colours cannot come
  from the active theme's tokens, so they live in `index.css` as
  `.theme-swatch-*` — plain CSS, not `@layer`, because the class is looked up by
  key and the content scan would drop layered rules it cannot see spelled out.
- **Mobile menu behaviour is unchanged** — full-width panel, tap outside to
  dismiss, 44px targets — restyled as a hairline-gapped stack whose labels sit on
  the page gutter, in line with the wordmark.

Three things changed underneath while doing it:

1. `Layout` no longer wraps the header in a purple gradient with `shadow-lg`, or
   page content in the legacy `max-w-7xl … sm:px-6 lg:px-8` container. With the
   final Home conversion complete, the route branch was deleted and every page
   now lines up with the header through its own Scoreboard gutters.
2. `ui/dropdown-menu` is radius 0, `--popover` with a hairline border, no shadow
   or ring, anchored `top-full`, and now closes on outside click and Escape.
   `Dashboard.js` uses it too and picks all of that up.
3. `LoginModal`'s `dark:` variants never applied — Tailwind's `darkMode` here is
   class-based and themes switch on `data-theme`, so the error and success blocks
   and the Google button were light-only in all six themes. All on tokens now.

`font-mono` now lives on the `Layout` root, so pages and chrome inherit the same
typographic system.

---

## The H2H league page — done

`WeeklyMatchups.js`, `LeagueTable.js` and `GameweekStats.js` are on the system,
plus a new `MatchupLedger.js` and `lib/h2h.js`. `FootballPitchMatchup.js`,
`VerticalFootballPitchMatchup.js` and `PlayerCard.js` were deleted.

The organising idea is that the page follows the order the questions actually
get asked in — am I winning, why, and where does that leave me:

- **The reader's own fixture is lifted out** under its own `YOUR FIXTURE`
  heading, and their standings row is marked. Identity comes from the existing
  `fpl_team_id` in localStorage, read-only.
- **The expanded fixture is a differential ledger, not a pitch.** A H2H fixture
  is decided by differentials: shared players cancel exactly. The two columns
  are the starting elevens minus their intersection, and their subtotals
  reconcile to the scoreline. Shared players collapse to a one-line summary,
  because by definition they carry no information about the result.
- **Per-side context is shown at last** — the points hit, the points left on the
  bench, the chip played. All three come from the `entry_history` object that
  every expand has always fetched and never rendered.
- **The standings carry the W-D-L record**, points-for and rank movement. The
  endpoint has always returned them; the old table showed rank, name and total.
- **Gameweeks step** with prev/next, and the GW label is a dropdown for jumping.

The three left-column cards (League Table / League Performance / League
Insights) collapsed into one standings board. They were four superlative lists
ranking the same 22 managers by one of two numbers.

### What the pitch actually was

Worth recording, because it looked like a styling problem and wasn't. Each
`PlayerCard` was a fixed 80x112 that could not shrink, so a half-pitch needed
≥320px and the pitch ≥640px inside a ~690px column; the pitch box was
`padding-top: 56.25%`, so at that width it was ~388px tall while a five-man
midfield column needed 560px. The matchup wrapper was `overflow-hidden`, so all
of that was clipped rather than scrolled. Two further defects went with it:
captain points were multiplied a second time on top of the multiplier the API
already applies (4x on the pitch, correct in the mobile list), and club colours
came from a hardcoded hex map that still had Luton, Sheffield United and Burnley
and no Leeds, Sunderland or Ipswich.

### MUI is gone

`WeeklyMatchups.js` and `GameweekStats.js` were the last two importers of
`@mui/material`. With them converted, `@mui/material`, `@mui/icons-material`,
`react-table`, `framer-motion`, `@heroicons/react` and `@headlessui/react` have
zero import sites left. The production bundle fell from 353.03 kB to 246.52 kB
gzipped, and to 245.83 kB once `MyTeam` dropped `lucide-react` and `ui/card`. The packages are still in `package.json` and can be uninstalled.

---

## The manager page — done

`MyTeam.js` is on the system, split into `MyTeamSquad.js`, `MyTeamSeason.js`
and `MyTeamLeagues.js`, with `lib/myTeam.js` and `hooks/useMyEntry.js` new
underneath it.

The page's job is **this manager's season**, and it falls into the three
questions a manager actually asks: what did I pick, how has the season gone,
where does that leave me. Those are the three tabs — SQUAD, SEASON, LEAGUES —
and SQUAD leads, because a page called My Team should open on the team.

- **The squad is built.** The `Pick` tab was a literal placeholder reading
  "coming soon", on a page named My Team. `entry-picks` had existed the whole
  time; it returns picks raw, so names, clubs, positions and points come from
  joining against `bootstrap-static` in `lib/myTeam.js`. It is a hairline list
  rather than a pitch, for the reason the H2H page stopped drawing one.
- **Only the current gameweek.** Per-player points come from bootstrap's
  `event_points`, which is the live gameweek only. A gameweek stepper here
  would paint this week's scores onto last week's squad, so there isn't one.
  A stepper needs `event/{gw}/live`, one call per gameweek.
- **A starter is `position <= 11`, not `multiplier > 0`.** Under Bench Boost
  every one of the fifteen picks carries a multiplier of 1. Splitting on the
  multiplier gives a fifteen-man starting eleven every time the chip is played
  — which `lib/h2h.js`'s `startersOf` still does, and is worth fixing there.
- **Three previously unused blocks of `team-data` now render.** `leagues.h2h`
  and `leagues.classic` became the LEAGUES tab, split three ways: head-to-head,
  mini-leagues you joined (`league_type: 'x'`) and the global ones FPL enrols
  everyone into (`'s'`). Ranking 1st of 9 and 691,183rd of 8.9 million are both
  interesting, but not in the same list. `last_deadline_value` / `_bank` /
  `_total_transfers` are gameweek context on the squad.
- **The rank chart stopped leading.** It carried a 📈 in its heading and a
  sentence restating the two numbers printed above it. Points per gameweek
  leads now — the same 38-slot bar chart the player page uses — and rank
  follows as a trajectory with a designed empty state below two gameweeks.
- **`tier_color` is gone.** `team-previous-seasons` returns a hex per season
  and a medal emoji. A fixed hex cannot survive six themes with panels on both
  sides of the lightness scale, and the design carries no icons. The ordinal
  information survives as a percentile track plus a `TOP n%` label, and only a
  top-5% finish earns the accent chip.
- **`wildcards_played` is deleted.** The page rendered a "Wildcard chip in
  play" badge gated on a field `team-data` has never set, so it could not
  appear. The chip actually played comes from the picks and is on the squad.
- **`rank_change` has an empty state.** It is only computed once a previous
  gameweek exists, so in GW1 the Rank Change card was a correct number above a
  blank space. The rank cell now always carries a line: the movement, `NO
  CHANGE`, or `FIRST GAMEWEEK`.
- **The team can be changed.** `setShowInput(false)` ran on a successful load
  and nothing set it back except the error path, so switching teams meant
  failing a request first. CHANGE TEAM is always in the masthead.

### Identity is its own key now

This is the part that reaches beyond the page. `MyTeam` wrote `fpl_team_id`
from `location.state.teamId`, and **every manager name on the H2H and Dashboard
pages navigates here with exactly that state**. So the stored "my team" was
really "the last manager I clicked on" — and the H2H page's `YOUR FIXTURE`
section and the standings `YOU` marker both key off it, so both silently
followed whoever you last looked at.

`hooks/useMyEntry.js` splits the two. `fpl_my_entry` is identity and is written
only by a deliberate act: submitting an id on Home or on this page, or pressing
THIS IS ME on a team you are viewing. The id being *viewed* is component state
and is never persisted. `WeeklyMatchups`, `Dashboard` and `Home` read the new
key; a one-time migration at module load seeds it from `fpl_team_id` so
existing users keep an identity, and the page now lets them correct it.

Identity is also claimed only *after* the id loads, so a typo does not become
"my team" — and a failed load clears the page rather than leaving the previous
team's masthead under an error.

---

## The transfer planner — done

`/my-team/plan`, with `PlanPitch`, `PlanPlayerPanel`, `PlanLedger` and
`TransferPlanFixtures` over a new `lib/transferPlan.js`. Two Edge Functions
went with it: `fixtures-future` (new) and an additive extension to
`team-history`.

**This is the first page in the app that is not a readout.** The other five
answer a question about something that already happened; this one carries
state the reader creates, about a gameweek that has not. That difference is
what drove every decision below.

- **It is not a fourth tab on MyTeam.** MyTeam is a viewer for *any* manager —
  every manager name on the H2H and Dashboard pages navigates there with
  someone else's entry, which is why `fpl_my_entry` exists at all. Planning
  transfers for a team you do not own is meaningless, so this page keys to
  `fpl_my_entry`, has no team switcher, and is reached from PLAN TRANSFERS on
  MyTeam, which only appears when `isMine`. That control sits above MyTeam's
  tab bar, not inside the SQUAD tab: it was a page-level action buried below
  the fold on every phone, and it takes `is_next` as the gameweek it plans for
  rather than deriving `current_event + 1`.
- **The pitch came back, and that is not a reversal of the H2H decision.**
  That pitch was a readout of a finished gameweek, and it spent its whole width
  on eleven pieces of decoration with nowhere left for the numbers. Here the
  thing being edited *is* a formation — who starts, who is on the bench and in
  what order, who wears the armband — and a list cannot show that. The field is
  `--muted` with `--border` hairline markings, so it is a *diagram* of a pitch
  rather than a picture of one; a fixed green cannot survive six themes, which
  is the same trap `tier_color` fell into. No shirt graphics: fifteen image
  loads on a surface that re-renders on every edit, to say what the club
  abbreviation already says.
- **A display toggle is what makes 375px work.** Next GW / Next 3 GWs / Price
  changes changes what every card's bottom line carries. A five-man defence has
  about 66px per card — room for one fixture in comfort or three compressed,
  and not for both plus a price projection. Density became a choice rather than
  a compromise.
- **One selection drives everything.** Tapping a player selects them, and that
  single piece of state answers three questions: tapping a second player swaps
  the two, the action strip offers the armbands and the transfer, and the
  player list locks to that slot's position and prices itself against that
  slot's budget. Substitution, positional shuffle and bench reordering are one
  operation seen from different places — see `swapSheet`.
- **The player list replaced the modal picker.** A modal is right when you need
  one answer and then to get out of the way; planning transfers is comparison
  work, and a list you must reopen per candidate cannot be compared against the
  squad you are looking at. One component at both widths: a column beside the
  pitch from `lg` up, the same thing stacked underneath on a phone.
- **The team sheet is keyed by baseline slot, never by player id.** A slot's
  position cannot change, because the list is filtered to it; a player id stops
  existing the moment they are transferred out. It also gives the expected
  behaviour for free — transfer out your captain and their replacement inherits
  the armband, because the armband was on the shirt.
- **The search says what it hides.** The list leaves out everyone in the
  planned squad and, while a slot is being filled, the player who started in
  it, because bringing him back is the undo and not a purchase. Both rules are
  right, but a search for either used to return an empty list: transfer Hall
  out, type "Hall", and nothing came back, which reads exactly like a broken
  search. Now a match on the sold player shows him at the top as THE PLAYER YOU
  TRANSFERRED OUT, and tapping him *is* the undo. A match on someone still in
  the squad says ALREADY IN YOUR SQUAD.
- **Saved, said out loud, and only when true.** The plan writes to
  `localStorage` on every change, and the page never said so, which made "where
  is the save button" a fair question. The ledger now reads SAVED ON THIS
  DEVICE beside CLEAR PLAN, with a line that nothing is sent to FPL. To keep
  that honest, `useTransferPlan` returns a fourth element saying whether the
  last write landed. A blocked or full `localStorage` used to be swallowed,
  leaving the plan in memory and gone on reload; it now reads NOT SAVED ·
  STORAGE BLOCKED.

### Four numbers that are wrong without ever throwing

This is the whole difficulty of the feature, and why `lib/transferPlan.js` is
pure and unit-tested (83 tests across the suite). Each of these produces a
plausible figure that is quietly incorrect.

1. **Selling price is not the current price.** `transfers_sell_on_fee` is 0.5
   and `element_sell_at_purchase_price` is false: you keep the purchase price
   plus half of any profit, **rounded down to 0.1**. A single 0.1 rise is
   therefore worth nothing on the way out, which is exactly what a plausible
   `(now + purchase) / 2` gets wrong. This is why money is integer tenths
   everywhere and `formatMoney` is display-only.
2. **Purchase price has two sources and a Free Hit poisons one.** Never
   transferred in: `now_cost - cost_change_start`. Otherwise `element_in_cost`
   from `entry/{id}/transfers/` — minus every transfer made on a Free Hit,
   because that squad is discarded and the player was never really bought.
3. **Free transfers are published nowhere.** The authenticated `my-team/{id}/`
   has the figure; we have no auth against FPL. They are accumulated from
   `entry/{id}/history/`, deriving how many were *free* from what they *cost*
   rather than from how many were made — `event_transfers_cost` is FPL's own
   statement of how many were paid for, which makes the accumulation
   self-correcting. **Because nothing can check it, the cell says it is derived
   and the reader can overrule it.** A number the app asserts and gets wrong is
   worse than a number it offers.
4. **Next gameweek's picks are a 404** until its deadline passes, so the
   baseline is the last gameweek that *started*. That is the correct baseline
   anyway, but the masthead has to say so or the page looks stale to anyone who
   has already moved on fpl.com.

### Show, never block

Rule 4 by analogy. Every illegal state is reachable and named rather than
prevented: over budget, four from one club, wrong squad shape, an illegal
formation, a benched captain, a player who has left the league, a duplicate.
Only three filters are hard, and each is structural rather than a judgement —
the list is locked to the slot's position, a player who has left the league
cannot be bought at all, and you cannot own the same player twice. Budget and
the club limit are annotated instead: "£0.4M more than you have" is
information, and a row you cannot click is not.

The squad rules and the formation rules are separate checks, because a squad of
2/5/5/3 always contains *some* legal eleven — the eleven only goes wrong once
someone moves it.

### Two failures worth recording

- **A missing Edge Function took down the whole page.** `fixtures-future` was
  not deployed, and Supabase's gateway 404 omits `content-type` from
  `access-control-allow-headers`. `apiHeaders` sends that header, so every call
  is preflighted; the preflight failed, the browser rejected with a `TypeError`
  rather than returning a 404, and `fetchWithRetry` retried three times and
  threw. Because the fixtures call sat inside the page-critical `try`, a
  missing *fixture list* produced "Could not load team {id}". Fixtures are now
  their own wave and their own failure — the workspace's entire job is
  answerable without them. **Any non-essential call on any page wants the same
  treatment.**
- **A state setter inside another setter's updater silently does nothing.**
  React treats updaters as pure and double-invokes them under `StrictMode`, so
  a `swapSheet` called from inside `setSelected` ran twice and undid itself.
  The decision belongs outside the updater; side effects — including the
  `localStorage` write in `useTransferPlan` — belong in an effect.

### Not built, deliberately

Expected points is absent from the fixture grid. `ep_next` is the only forward
number FPL publishes and the name is literal — it covers the next gameweek and
nothing beyond, so two of the three columns have nothing honest to carry. It is
also flat this early: the highest `ep_next` in the entire game on 2026-08-27
was 4.0. The grid stops at difficulty, the same refusal the player page's
fixtures tab makes when it stops at five.

Chained multi-gameweek planning is out of scope — a different squad and budget
per gameweek is a different data model, not a bigger version of this one. The
stored plan is shaped `{ entry, targetEvent, moves, sheet, chip, freeOverride }`
so that a chain stays possible later as a *list* of these.

---

## The team score — done

`lib/teamScore.js` and `components/TeamScorePanel.js`. It appears in two
places: at the top of MyTeam's SQUAD tab, and on the transfer planner as a
band under the summary strip plus a SCORE tab.

**The job is one number for a squad that can be taken apart.** It rates the
squad for the upcoming gameweek, with a five-gameweek view beside it.
**FPL publishes no such figure, so the model is ours**, and every component
behind the headline is on screen. A rating the reader cannot take apart is one
they can only accept or ignore, and on a page that lists the eleven players
being rated, directly underneath, being unarguable is a defect.

- **Every component is a percentile within position.** "Is 0.42 xGI per 90
  good" has no answer; "better than 86% of midfielders who have played" has
  one. It is also what lets a keeper and a forward sit in the same column, and
  so what lets a squad carry a single number at all. The peer set is
  `percentileFor`'s, so the player page and the score agree on what a
  percentile is.
- **Availability is a gate, not a component.** A 95th-percentile forward with
  a broken foot is a zero, and no weighting of form against fixtures says so.
  `chance_of_playing_next_round` multiplies the player's rating instead of
  being averaged into it; a silent `null` means fit for an `a` player and out
  for an `i` one.
- **Four components over one gameweek, five over five.**

  | | Form | Fixtures | Underlying | Minutes | Season (`points_per_game`) |
  |---|---|---|---|---|---|
  | Gameweek | 26% | 26% | 32% | 16% | — |
  | Five gameweeks | 13% | 25% | 29% | 18% | 15% |

  Underlying is position-aware: keepers on xGC and saves, defenders on xGC,
  xGI and the defensive-contribution threshold, midfielders on xGI and the
  threshold, forwards on xGI. Fixtures map FDR 1–5 to 100/82/58/32/12, plus 4
  at home. A blank scores 0 rather than being skipped, which would rate a
  blank week as an average one. A double adds 18, because two fixtures at FDR
  3 beat one at FDR 2.
- **`ep_next` is not a component, and should not come back without
  re-measuring.** It was one, until it measured **r = 0.998 against `form`**
  across 77 starters. It is a restatement of form, not an independent
  projection, so carrying both put 40% of the score on one signal and
  presented it as two. Its weight went to Underlying, the only measure that
  is genuinely independent of form (r = 0.08).
- **The squad is judged on its weak links, not just its average.** The XI's
  rating is 60% its mean and 40% the mean of its worst three; the bench takes
  10% of the total for a gameweek and 20% for five. A flat mean of eleven
  percentiles regresses so hard to the middle that, on a plain mean, seven real
  squads spanning a 158-point season gap landed between 56 and 69, and no
  reweighting widened that. With the weak links weighted in, 27 squads spanning
  232 points spread across 40–69. The captain counts twice, and the armband is
  read from the pick rather than the multiplier for the same reason a starter
  is `position <= 11`: Bench Boost and Triple Captain change multipliers
  without changing the squad. Any gap between the captain and the model's
  top-rated starter costs 0.3 per point, capped at 6, and a note names the
  better option once the gap reaches 4.
- **It rates the gameweek still to be played.** `is_next` is FPL's own answer
  to "which gameweek is upcoming", and it stays right in the gap between one
  gameweek finishing and the next becoming current, where `current_event + 1`
  does not. The squad is the last one FPL published, the same baseline and
  caveat as the planner.
- **It shows for any manager**, not only your own team. Rating the squad you
  are drawn against this week is the same question asked about someone else.
- **No fixture list means no rating, not a low one.** `fixtures-future` loads
  in its own request with its own error handling. Without it every club would
  read as a blank, so `scoreSquad` returns `null` and the panel says there is
  not enough data, rather than showing a confidently wrong score with a quarter
  of it at zero.

### The displayed number

The raw rating only spans about 40–74 on real squads, so an elite squad read
**73**, which sounds like a C grade. `rescale` maps the raw rating linearly
onto 0–100 using the population-weighted median and spread of real squads, so
that **50 is a typical squad and about 90 is the top 2%**. That works out to
3.6 displayed points per raw point for a gameweek and 3.2 for five.

- **Linear, deliberately not a percentile.** A "share of squads you beat"
  curve was fitted first and matched the sample well, but it flattens at the
  top. At 99, a whole raw point moved the display by 0.4, so nearly every
  transfer an elite manager planned read NO CHANGE, on exactly the squads a
  planner most needs to be sensitive for. The cost is that 91 is a rating,
  not a literal percentage, and both ends clamp.
- **Calibrated per horizon on one gameweek.** `CALIBRATION` holds GW7's
  numbers: median 60.9 and spread 4.47 for one gameweek, 62.08 and 4.97 for
  five. A week of unusually kind fixtures lifts the whole field; **if the
  tiers start to look generous, re-measure rather than nudge the numbers by
  eye.**
- **The tiers sit on the displayed scale:** ELITE 85+, STRONG 65+, SOLID 35+,
  THIN 15+, WEAK below. For the gameweek view that is roughly 6% / 13% / 72% /
  9% of FPL squads, with WEAK the squad with several starters out. Two earlier
  sets of cutoffs failed in opposite directions: one left ELITE and WEAK
  unreachable, the next, fitted on 26 squads, let a quarter of 132 into
  ELITE.
- **Every label beside a number is derived from that number as displayed.**
  Scores are carried unrounded and shown rounded. A plan that moved 72.4 →
  72.6 read NO CHANGE between a displayed 72 and 73, and a 66.6 would have
  shown "67 STRONG" with 67 the ELITE cutoff of the time. `shownDelta` and the
  band both work from the rounded score.
- **XI / WORST 3 / BENCH are player averages, labelled PLAYER AVG.** They are
  on the player scale, not the squad scale, and unlabelled a 91 above a 72
  reads as arithmetic that does not add up.

Tones follow the existing rules. Band chips are `bg-{tone}-ink
text-background`, and SOLID is `bg-inverted` with no hue at all (rule 5: most
squads land there). Tracks are plain fills. Deltas are `text-live-ink` /
`text-destructive-ink`, or muted for no change. Measured: every chip clears
4.5:1 in all six themes, the worst being 4.58:1 for the live chip in Sage, and
`contrast-audit` is clean on the planner with both deltas on screen.

### On the planner

**The planner's question is never "what is this squad worth"; it is "is this
better than what I have".** So it shows a comparison: the plan's score, its
tier, and the movement against the fifteen you own, recomputed on every tap.

- **One model, two shapes.** `buildSquad` and `applyPlan` describe the same
  fifteen players differently. `squadFromPlan` translates the plan into the
  shape `scoreSquad` reads rather than teaching the model both. A test holds
  an untouched plan to exactly the squad tab's rating, and it compares the
  *raw* rating, because test squads sit below the real range and clamp to 0
  on the display, where any two would agree.
- **The armband comes from the sheet, not the pick.** Captaincy is keyed by
  slot, so selling your captain moves the armband onto his replacement.
- **An open slot is rated on the players present** and labelled `RATED ON 10
  OF 11`, not scored as a zero. A slot you have just opened is a decision in
  progress, and a rating that collapses while you choose is noise.
- **A band, not a fourth summary cell.** The strip's notes were measured to fit
  94px cells at 375px; a fourth cell takes them to ~85px and truncates `SET BY
  YOU · RESET`. The band sits above the tab bar because "did that move help"
  is asked on the pitch, while the move is being made.
- **The comparison leads with what moved.** Bringing in a 25%-doubt striker
  (Isak for Wissa) lifted form and underlying by 4 each, held fixtures, cost 2
  on minutes, and dropped the raw rating by six (about 21 on today's displayed
  scale). Components are averaged *before*
  the chance-of-playing discount, and a new weak link hits the worst-three
  average far harder than it moves a mean: worst 3 fell from 54 to 42. Rising
  rows over a falling number reads as a bug. So WHAT THE PLAN CHANGED shows XI mean,
  worst 3 and bench first, then says out loud that the components below can
  rise while the score falls.
- **The baseline is its own memo.** The squad you own does not change when you
  plan, so it is not re-rated on every tap.

### How it was validated, and what is still open

132 real squads were scored: the H2H league plus a sample spread across the
Overall league from rank 1 to ~10M. Against overall rank, the score's Spearman
correlation is **0.38**, which is real (the noise band is ±0.17) but **behind
three naive baselines**: the XI's summed form at 0.65, its summed `ep_next` at
0.64, and squad value at 0.50.

That test is biased toward backward-looking measures: form and squad value are
partly made of the same past points that rank is, while a quarter of the score
is next week's fixtures. So it was not treated as a verdict, and the score
was not tuned toward rank, which would only teach it to look backwards. **The
fair test is still open:** predictions for all 132 squads were snapshotted
before GW7 kicked off, to be compared with the points each XI actually scores.
If summed form wins that too, the model should lean much harder on form, or be
simplified.

The snapshot, the fetch script and the analysis live in a local
`.score-validation/` folder, excluded through `.git/info/exclude` and **not in
the repository**. Sampling fetches go to FPL directly at about one request a
second, never through the Edge Functions: the live site shares their egress
IP, and a burst there is what the WAF answers with a 403 for everyone.

### Known limits

- **Minutes is unfair to a player back from injury.** Bootstrap carries season
  totals only; per-gameweek history means `element-summary` per player, which
  is exactly the burst the WAF punishes. The availability gate carries the
  "is he fit now" half.
- **It will not match Fantasy Football Hub point for point.** Their rating sits
  on bookmaker odds and minutes modelling the FPL API does not expose. Both
  should put an elite squad around 90.
- **Scoring cost is unmeasured on slow phones.** Each rating walks the element
  list once per player per component, and the planner re-rates on every tap.

---

## Rollout status

| Surface | State |
|---|---|
| `PlayerStats` + player tabs | Reference implementation |
| `Header`, `Layout`, `ThemeSwitcher`, `LoginModal`, `ui/dropdown-menu` | Done |
| `WeeklyMatchups`, `LeagueTable`, `GameweekStats`, `MatchupLedger` | Done |
| `PlayerStatisticsHub` | Done |
| `PlayerSearchModal`, `PlayerComparison` | Done |
| `Dashboard` | Done |
| `MyTeam` + `MyTeamSquad` / `MyTeamSeason` / `MyTeamLeagues` | Done |
| `Home.js` | Done |
| `TransferPlanner` + `PlanPitch` / `PlanPlayerPanel` / `PlanLedger` / `TransferPlanFixtures` | Done |
| `TeamScorePanel` / `PlanScoreBand` (on MyTeam's SQUAD tab and the planner) | Done — see **The team score** |

Home is a state-aware front door: fresh browsers get two compact setup actions,
while saved manager and league IDs become resume actions with deliberate change
controls. Dashboard and Player Hub remain available without setup.

MUI is gone from `src/` entirely. The dependency is still in `package.json` and
can be uninstalled along with `@mui/icons-material`, `@emotion/*`, `react-table`
and `@headlessui/react`, none of which are imported any more.

### What the rollout added

- **`lib/h2h.js`** — the differential ledger. A H2H fixture is decided by the
  players only one manager owns; shared players cancel out exactly. Splitting
  the two starting elevens into home-only / away-only / shared makes the two
  differential columns *be* the scoreline.
- **`config/supabase.js` → `fetchWithRetry`** — the Edge Functions proxy the FPL
  API, whose WAF answers a burst of requests from one origin with a flat `403`.
  It is not a rate-limit status and it looks exactly like an app bug. Any page
  firing several calls on mount needs this.
- **Page shell** — every page uses `mx-auto max-w-[1280px]`; `Layout.js` owns
  `font-mono` and no longer has a route list or legacy container branch.
- **Desktop steps.** List content needs a `md:` step up. The player hub shipped
  at one size for every width, so player names — the actual content — sat at
  10px on a 1280px desktop. The 7–10px range is for labels beside a large
  number, not for content.
- **Page identity.** Dashboard and H2H overlapped until each was given a job:
  H2H is "my league this week", Dashboard is "the gameweek at large", MyTeam is
  "this manager's season". Every FPL-wide figure on the dashboard is labelled
  `ACROSS FPL`, because the chip counts and most-captained are global numbers
  in the millions and used to sit under a heading carrying your league id.
- **`lib/myTeam.js`** — the picks join, the three-way league split, and rank as
  a share of the field. `entry_percentile_rank` is bucketed to 1/5/10/15/25/50,
  too coarse to separate the top of a mini-league from the middle, so
  `topPercent` divides `rank / rank_count` instead. Use FPL's own *Overall*
  league `rank_count` as the denominator for overall rank, not bootstrap's
  `total_players` — they differ by ~900k and quoting both contradicts itself.
- **`hooks/useMyEntry.js`** — "this is me" as its own key. See the manager page
  section; browsing must never write identity.
- **`lib/teamScore.js`** — the squad rating, its calibration and the adapter
  that lets the planner use it. See **The team score**: the model is ours, its
  components are always on screen, and its calibration comes from one
  gameweek.

### Dead class names — a CSS variable is not a Tailwind colour

A token in `index.css` does nothing until it is also registered under
`theme.extend.colors` in `tailwind.config.js`. Where it isn't, the class name
is silently dropped at build time: no rule is emitted, no warning is printed,
and the element just inherits. It looks like a styling opinion rather than a
bug, which is why these survive.

Audit by diffing the class names used in `src` against the rules that actually
exist in the built CSS:

```bash
CSS=$(ls build/static/css/main.*.css | head -1)
grep -rhoE '\b(bg|text|border|from|via|to|ring|fill|stroke|divide|outline|accent|caret)-[a-z][a-zA-Z0-9-]*' --include='*.js' src \
  | sort -u | while read -r c; do grep -qF ".$c" "$CSS" || echo "$c"; done
```

Discount hits that only ever appear behind a variant (`focus:outline-none`
compiles to `.focus\:outline-none`, so the bare name is absent by design).
What that leaves today:

| Dead class | Sites | Effect |
|---|---|---|
| `bg-success` / `text-success` | `lib/fdr.js` | **Gone.** Every FDR 1–2 drew a bar with a height and no fill, a track with no fill, and a `text-background` numeral on a transparent square — white on white in the light themes. `--success` only ever duplicated `--live`; the bands are `--live` / `--warn` / `--destructive` now. |
| `bg-primary-darker` | Legacy Home and `ui/button` | **Gone.** The final Home conversion removed both call sites and the dead wrapper. |
| `text-primary-lighter` | 10 — `Header`, `PlayerStats` ×2, `Dashboard`, `LeagueTable`, `PlayerStatisticsHub`, `MatchupLedger`, `GameweekStats`, `LoginModal`, `MyTeam` | **Still dead, deliberately.** Every action link — COMPARE →, FULL TABLE →, SHOW ALL 22 TEAMS, SHOW / HIDE — falls back to `--foreground`, so the app has no link affordance colour. This is *not* a contrast gap: `--foreground` passes everywhere, which is why the audit is clean. Reviving it is a design decision, and registering `--primary-lighter` as-is would be a regression — on `--panel` it is 2.41:1 in Ocean, 2.93:1 in Sage. It needs a `--primary-ink` at an `-ink` lightness first. |

`--success`, `--success-lighter`, `--destructive-lighter` and the
`.text-success-color` utility were removed after their final call sites went.

### The -ink family — closed

All four known gaps, plus two more found while closing them, were the same
defect: **every saturated semantic token is tuned to be a fill, and a fill's
lightness is the wrong lightness for text.** At 7–9px on `--panel` in Light,
`--live` measured 2.94:1, `--warn` 2.74:1 and `--destructive` 3.32:1. `--live`
failed in the other direction too — as a fill under `--background`-coloured
text it was 3.23:1, fine for the 22px value in the cell and not for the 7px
labels beside it.

The fix is one token per colour, same hue and saturation at the lightness that
clears 4.5:1, defined as `var(--base)` in the themes where the base already
passes. **Use the base token for fills, the `-ink` token for text or for a fill
that carries text.**

| Token | Themes that differ from the base | Worst measured |
|---|---|---|
| `--live-ink` | Light `84 62% 29%`, Sage `150 45% 34%`, Ocean `160 60% 31%` | 4.59:1 |
| `--warn-ink` | Light `38 92% 31%`, Sage `38 80% 32%`, Ocean `38 88% 32%` | 4.70:1 |
| `--destructive-ink` | all six — `--destructive` failed everywhere, 3.08–4.49:1 | 4.72:1 |
| `--primary-chip` | Dark `265 85% 67%`, Sage `150 40% 34%`, Ocean `200 80% 37%`, Midnight `230 60% 62%` | 4.71:1 |

Two existing tokens moved with them:

- **`--muted-foreground`** was 4.34:1 in Light and 3.65:1 in Sage — the most
  widespread miss in the app, since it carries every hairline row's second
  line. Light is now `45%`, Sage `32%`. Sage needed the second nudge because
  `--muted` is darker than `--panel` there, and the highlighted YOU row in the
  standings sits on `--muted`; solving against `--panel` alone left it at 4.03.
- **`--accent-chip`** was tuned against `accent/15` over `--panel` only. Over
  the *page background* — which is tinted, not white, in Sage and Ocean — it
  measured 4.48 and 4.45. Now 31% and 34%.

Call-site rules that came out of it:

- **The tab bar** is `border-live` with a `text-live-ink` label. The underline
  is a graphic and can stay bright; the label could not.
- **`bg-primary` is never a chip.** The four mastheads use `bg-primary-chip`
  with `text-background`. `--primary` stays for structure — percentile fills,
  the club watermark — where nothing sits on top of it.
- **`text-primary` on `bg-primary/15` is the accent-chip pattern written the
  long way round** and measured 2.24–3.32:1 in five themes. The rank chip and
  the DEFCON label use `bg-accent/15` + `text-accent-chip` like every other
  chip. `--accent` exists precisely so Turf's chips aren't a second green.
- **Opacity cannot be layered on an `-ink` fill.** `--live-ink` is tuned so
  full-strength `--background` text clears 4.5:1; the `opacity-75` those labels
  used to carry took them back to 2.49:1. The solid summary cells render their
  labels at full strength now.
- **`ui/button`'s default variant** was `bg-primary text-primary-foreground`,
  which is white on `--primary`: 2.86:1 in Ocean. It is `bg-primary-chip
  text-background` now. Only `Home.js` uses it.

### Verifying it

`frontend/scripts/contrast-audit.js` is the harness. Paste it into the DevTools
console on any page and call `await contrastAudit()`. It walks every element in
`<main>` that owns a text node, composites the real background stack including
alpha and inherited opacity, and checks AA — 4.5:1, or 3:1 for text ≥24px or
≥18.66px bold — across all six themes.

Two things it gets right that eyeballing does not: it disables the app's 300ms
colour transition first (a measurement taken straight after a theme switch
reads a blend of two themes, which is the easiest way to get wrong numbers out
of it), and it skips `aria-hidden` and disabled controls, which WCAG 1.4.3
exempts.

As of this pass, every route is clean in all six themes: `/`, `/dashboard`,
`/weekly-matchups/:id` including an expanded ledger, `/player-statistics` in
both modes, `/player/:id` on all three tabs, and `/my-team` on all three.

**What it does not cover**, so the "clean" is honest:

1. **Non-text contrast** (WCAG 1.4.11, 3:1 for meaningful graphics and UI
   boundaries) — the 3px percentile tracks, hairline borders, chart fills, the
   active-tab underline. Not swept, and some hairlines are deliberately under
   3:1.
2. **Dead class names.** A missing Tailwind colour renders as *inherited*,
   which usually passes AA while being the wrong colour entirely. Contrast
   maths cannot see it; the grep above can.

## Constraints

- React 18, Tailwind, shadcn/Radix. **MUI is gone from `src/`** — don't reintroduce it.
- Recharts for charts.
- Everything must work in all six themes and at 375px with no horizontal scroll.
- Player photos are ~90% available and fall back to tinted initials — any photo-led layout needs that fallback to look deliberate. Use the existing `PlayerPhoto` component.

---

## Two open items on the player page

Not blocking, but worth knowing before treating it as finished:

1. **The desktop panel column wasn't built.** The original handoff specified a 326px right column at 1280 holding Defcon / ICT / Next 5 / Set pieces beside the main column. Everything is present but stacks in one ordered column at all widths. Mobile order was prioritised.
2. **Rank-chip tooltips aren't wired.** `@radix-ui/react-tooltip` is installed for it. Intended content: unabbreviated stat name plus "4th of 210 forwards".
