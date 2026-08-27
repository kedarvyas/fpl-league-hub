# Handoff — the transfer planner

**Task:** build a page where a manager can see their squad and plan transfers for
the upcoming gameweek, with the budget, free transfers and hit cost worked out
for them as they go.

**Start here:** `docs/scoreboard-design-system.md` is the system of record —
tokens, type scale, spacing, components, and the six rules. Every page in the
app is now on it, so there is no "old design" left to match; follow the system
and it will look right. The reference implementation is the player page,
`/player/:playerId`.

**Read these three for idiom before writing anything:**

- `components/MyTeamSquad.js` — the squad list this page starts from. Position
  rail, hairline rows, the chip band, the gameweek context grid.
- `components/MatchupLedger.js` — a two-column ledger whose subtotals reconcile
  to a headline number. The transfer ledger is the same object.
- `components/PlayerSearchModal.js` — the picker. Loads `bootstrap-static` once
  and filters in memory; it takes `onSelect` and `excludePlayerId` already.

Everything below marked **verified** was checked against the live API on
2026-08-27 (GW1 complete, GW2 next). Everything marked **unverified** could not
be checked yet because the season is one gameweek old, and is flagged where it
matters.

---

## 1. What this needs to be

The app's other pages each got one job, and this one needs the same treatment
before any layout happens. The other four are readouts — H2H is "my league this
week", Dashboard is "the gameweek at large", MyTeam is "this manager's season",
Players is "find and rank". **This page is the first workspace: it has state the
reader creates, and it is about a gameweek that has not happened.**

The job: *decide what to do before the deadline.* Concretely — show me my
fifteen, let me take players out and put players in, and never let me get the
money, the transfer count or the squad rules wrong.

### Two views, under My Team, but not a tab

The job splits in two, and they are different kinds of object:

- **NEXT GW** — the workspace. Your fifteen, take players out, put players in,
  with the budget, free transfers and hit cost worked out live.
- **NEXT 3** — a readout. Your fifteen as rows, the next three gameweeks as
  columns, each cell an opponent with home/away and fixture difficulty. Expected
  points goes under each cell later (with a limit — see §5).

**The two views must share one squad.** NEXT 3 shows the squad *as planned*, not
as it stands, so bringing someone in on the first view immediately changes their
row on the second. Otherwise the second view is just a fixture list you could
already get from the players page, and the two halves of the feature don't talk
to each other.

### Where it lives

It belongs under My Team conceptually, and the URL should say so:
**`/my-team/plan`**, reached from a control on MyTeam's SQUAD tab.

Not a literal fourth tab on `MyTeam`, for two reasons:

1. **MyTeam is a viewer for any manager.** Clicking a name on the H2H page or
   the Dashboard navigates there with someone else's entry — that is exactly
   why `fpl_my_entry` was split out from `fpl_team_id` in the first place.
   Planning transfers for a team you don't own is meaningless, so the entry
   point should only appear when the team being viewed *is* yours (`isMine` in
   `MyTeam.js` already computes this).
2. **The plan has its own two views**, so a tab would nest a tab bar inside a
   tab bar.

So: `/my-team/plan` keyed to `fpl_my_entry` from `hooks/useMyEntry.js`, with its
own `NEXT GW` / `NEXT 3` tab bar and no team switcher. If no identity is set,
the empty state is "set your team" linking to `/my-team`. Add the route in
`App.js`; whether it also earns a slot in `Header.js`'s `navigation` array is a
judgement call once it exists.

The cost of a separate page is re-fetching `bootstrap-static` and the baseline
picks that MyTeam already had in memory. That is two requests, both of which
this page needs anyway, and it buys a workspace whose state does not die when
someone taps SEASON. Worth it.

---

## 2. Four things that will silently be wrong

These are the whole difficulty of this feature. Each produces a plausible number
that is quietly incorrect, and none of them will throw.

### a. Selling price is not the current price — **verified**

When you sell a player who has risen, you get **the purchase price plus half the
profit, rounded down to 0.1**. The API confirms this rather than requiring you
to trust folklore: `game_settings.transfers_sell_on_fee` is `0.5` and
`game_config.rules.element_sell_at_purchase_price` is `false`.

Purchase price has two sources and you need both:

- **Never transferred in** (still there from the season's opening squad):
  `now_cost - cost_change_start`.
- **Transferred in at some point**: `element_in_cost` from the most recent
  matching entry in `entry/{id}/transfers/`. The `entry-transfers` Edge Function
  already exists and already proxies this.

```js
// tenths of a million throughout — never convert to £ before the arithmetic
const sellingPrice = (purchase, nowCost) =>
  nowCost <= purchase ? nowCost : purchase + Math.floor((nowCost - purchase) / 2);
```

Worked against live data: Calafiori was bought at 55, is now 56, and sells for
**55** — `floor(1/2)` is 0, so a single 0.1 rise is worth nothing on the way
out. Martinelli was bought at 65, is now 64, and sells for **64**. Ten players
had moved at the time of writing, so this is testable today.

**The trap inside the trap:** Free Hit transfers appear in
`entry/{id}/transfers/` like any other, but the Free Hit squad is discarded at
the end of that gameweek. Including them gives the wrong purchase price for
anyone "bought" on a Free Hit. Filter out every transfer whose `event` matches a
Free Hit in `history.chips`. **Unverified** — nobody has played a Free Hit yet
this season.

### b. Free transfers are not published anywhere — **derivation unverified**

There is no public endpoint for "how many free transfers do I have". The
authenticated `my-team/{id}/` has it; we have no auth against FPL and are not
going to. It must be derived from `entry/{id}/history/`, which carries
`current[]` with `event_transfers` and `event_transfers_cost`, plus a `chips[]`
array of `{name, event}`. **Verified that the data is there.**

The rules, from the API rather than assumed: `max_extra_free_transfers` is `4`,
so the cap is **5** (one per week plus four banked). `transfers_cap` is `20` —
the most transfers allowed in a single gameweek.

```
ft = 1                                  // going into GW2; GW1 changes are unlimited and free
for each gameweek g from 2 to the last finished one:
    made = current[g].event_transfers
    paid = current[g].event_transfers_cost / 4      // FPL tells us how many were hits
    if chips has wildcard or freehit at g:
        freeUsed = 0                    // the chip covered them; banked FTs survive
    else:
        freeUsed = made - paid
    ft = min(5, max(0, ft - freeUsed) + 1)
```

Deriving `freeUsed` from the *cost* rather than from the count is what makes
this self-correcting: FPL has already told us how many transfers were paid for,
so we never have to guess where the free ones ran out.

**Because it cannot be checked against FPL's own figure, show it as derived and
let the reader override it.** A number the app asserts and gets wrong is worse
than a number it offers. One editable field in the summary strip.

Also worth knowing: a manager who joined after GW1 has `started_event > 1` on
the entry object, and the accumulation starts there, not at GW2.

### c. Next gameweek's squad is a 404 — **verified**

`entry/{id}/event/2/picks` returns **404** before GW2's deadline. Picks only
become public once the gameweek has started. So the baseline is **the last
gameweek that has started**, which is `current_event` from `team-data`.

This is the correct baseline anyway — you plan transfers *from* the squad you
own — but it has to be stated in the UI, or the page will look stale to anyone
who has already made a transfer on the FPL site. Something like `FROM YOUR GW1
SQUAD · CHANGES YOU'VE ALREADY MADE ON FPL.COM WON'T SHOW`.

### d. A starter is `position <= 11`

Not `multiplier > 0`. Under Bench Boost every one of the fifteen picks carries a
multiplier, so a multiplier test builds a fifteen-man starting eleven. This bit
`lib/h2h.js` and was fixed in `18a0ca6`; `lib/myTeam.js`'s `buildSquad` already
has it right and returns `starters` / `bench` correctly. Reuse it rather than
re-deriving.

---

## 3. The data, and what it costs

Everything needed exists. Two new Edge Functions, one of them a two-line proxy.

| What | Where | Status |
|---|---|---|
| Squad, bank, squad value, chip | `entry-picks/entry/{id}/event/{gw}/picks` | exists |
| Every player: price, position, club, form, `ep_next`, status | `bootstrap-static` | exists |
| Purchase prices | `entry-transfers/entry/{id}/transfers` | exists |
| Free transfers, chips used | `entry/{id}/history/` — **`team-history` throws all of it away**, returning only ranks | **needs work** |
| Fixture difficulty for every remaining gameweek | `/fixtures/?future=1` — **`fixtures` forces `?event=`**, so five gameweeks is five calls | **needs work** |

**`entry-history` (new, or extend `team-history` additively).** `team-history`
maps the payload down to `{gameweek, rank, points, total_points}` and discards
`event_transfers`, `event_transfers_cost`, `bank`, `value` and the whole `chips`
array. Extending it additively is the smaller change and MyTeam's SEASON tab
keeps working untouched.

**`fixtures-future` (new).** `/fixtures/?future=1` returned **370 fixtures in
115KB in a single call** — every remaining gameweek, with `team_h_difficulty`
and `team_a_difficulty`. Five separate `?event=` calls to build a five-gameweek
strip is a burst the FPL WAF answers with a flat 403, which is the failure
`fetchWithRetry` exists for. One call is better than retrying five.

### Fields worth knowing about

- **`ep_next`** — FPL's own expected points for the coming gameweek, present on
  every player. This is the only forward-looking number the API publishes, and
  it is the honest basis for a team rating (see §5).
- **`status`** — `a` available, `d` doubtful, `i` injured, `s` suspended, `u`
  unavailable. Verified counts today: 493 / 16 / 61 / 1 / 45. With
  `chance_of_playing_next_round` and `news`, this is the flag on a card that
  makes the page worth opening.
- **`can_select`** — `false` for 45 players who have left the league. They are
  still `can_transact: true`, because you can sell them but not buy them.
  **The "bring in" list must filter on `can_select`, not on `status`.**
- **`price_change_projections`** — dynamic pricing is live this season, and
  `game_config.settings.price_change_deadlines` lists the change times.
  `lib/playerStats.js` already has `getPriceOutlook` and
  `components/PlayerPriceProjection.js` already renders it. "This player is
  projected to rise before the deadline" is real transfer-planning information
  and it is already built.

### Squad rules, from `game_settings` — verified

| Rule | Value |
|---|---|
| Squad size / starting XI | 15 / 11 |
| Budget | 1000 (£100.0m) |
| Max per club | 3 |
| Squad composition | 2 GKP, 5 DEF, 5 MID, 3 FWD |
| Legal formations | GKP exactly 1; DEF 3–5; MID 2–5; FWD 1–3 |
| Transfers per gameweek | 20 max |
| Hit cost | **4 points. Not in the API — hardcode it with a comment.** |

Chips are two per half-season: wildcard and free hit are `chip_type: 'transfer'`
(GW2–19 and GW20–38), bench boost and triple captain are `chip_type: 'team'`
(GW1–19 and GW20–38). Which ones a manager has left is `bootstrap.chips` minus
`history.chips`.

---

## 4. Proposed shape

On the system, so: radius 0, hairline gaps, `bg-panel` tiles, `-ink` tokens for
anything that is text. No photos — you said so, and it saves fifteen image loads
on a page that re-renders on every edit.

**Masthead**, shared by both views. `PLANNING` chip, `GW N`, and the deadline as
a countdown (`events[].deadline_time`, verified present).

**Summary strip**, also shared, and the reason the page is trustworthy — the
three numbers that constrain every decision, updating live as the plan changes:

```
FREE TRANSFERS        IN THE BANK        POINTS HIT
2  (editable)         £1.4M              −4
derived · tap to fix  after 2 in         1 transfer over
```

Reserve a fourth cell for a squad rating; leave it out of v1.

**Tab bar** below it: `NEXT GW` / `NEXT 3`. Same object as every other tab bar
in the app — `border-live` underline, `text-live-ink` label.

### View 1 — NEXT GW, the workspace

Position-grouped rows, one per player: position rail, name, club, price, the
next fixture, an availability flag when `status !== 'a'`, and an OUT control.

A row marked OUT inverts and opens an IN slot beneath it. The slot opens the
picker (`PlayerSearchModal` already takes `onSelect` and `excludePlayerId`),
filtered to that position, to what the budget affords, and to what the club
limit allows.

Below the squad, **the ledger** — the same object as `MatchupLedger`: an OUT
column and an IN column whose money and count reconcile to the summary strip.
This is what lets the reader check the arithmetic instead of trusting it.

### View 2 — NEXT 3, the readout

Fifteen rows, three columns. Each cell is one gameweek: opponent short name,
`H` or `A`, and the fixture-difficulty band as the fill. `lib/fdr.js` has the
banding — use `band.bg` for fills only, never behind text.

Three things this view has to get right:

- **It renders the planned squad, not the current one.** A player brought in on
  view 1 appears here immediately, and the player they replaced does not. That
  shared state is the point of the feature.
- **Blank and double gameweeks.** A cell can hold **zero** fixtures or **two**.
  A blank should read as a blank — an empty cell on the same geometry, per rule
  4 — and a double should show both. A `.find()` on the fixture list is the bug
  waiting to happen here.
- **Expected points is one column, not three.** See §5.

A per-row summary (how many of the three are at FDR 3 or better) and a
per-column summary (how much of your squad has a good fixture that week) are
both cheap and are the reason to look at a grid rather than a list.

### Validation: show, never block

Every illegal state should be reachable and named, not prevented. Over budget,
four from one club, wrong position counts, a player who is `can_select: false`,
a duplicate. Rule 4 applies by analogy — don't hide the problem, draw it.

---

## 5. Decisions, and the two still open

- **Settled: one set of transfers, three gameweeks of fixtures.** Not a chain.
  Chained planning — a different squad and a different budget in each of GW+1,
  +2 and +3 — is a different data model, not a bigger version of this one, and
  it is explicitly out of scope. NEXT 3 shows what the *one* planned squad faces
  over three weeks. Keep the stored plan shaped as
  `{entry, targetEvent, moves: [{out, in}]}` so that a chain stays possible
  later as a list of these, but do not build toward it now.
- **Where does a plan live?** `localStorage` keyed by entry and target gameweek
  is enough for v1 and matches how the app already stores identity. Supabase
  auth exists (`contexts/AuthContext.js`, Google and email) but is barely used —
  moving plans server-side is a real feature (sync, sharing) and deserves its own
  decision. Shape the stored object as `{entry, targetEvent, moves: [{out, in}]}`
  so that a chain is a list of these, not a rewrite.
- **How does a chip fit?** Playing a wildcard makes transfers unlimited and free,
  which changes the whole summary strip. A toggle is cheap and the chip data is
  already available. Worth having in v1; it is the state people most want to
  plan in.
- **Does the plan set the XI too?** Choosing who starts, and the captain, is
  adjacent but separate. It doubles the surface. I would leave it out and let
  the page be about the fifteen.
- **Expected points under the NEXT 3 grid — read this before promising it.**
  `ep_next` is the only forward number FPL publishes, and the name is literal:
  **it covers the next gameweek and nothing beyond it.** There is no `ep` for
  GW+2 or GW+3. So the grid can carry expected points in its *first* column
  honestly, and the other two would need a projection we build ourselves —
  minutes model, fixture adjustment, form decay. That is a separate project with
  its own accuracy problem, not a later increment of this one.

  Three ways out, in ascending order of work: leave EP off the grid entirely and
  let fixture difficulty carry the forward view; show EP on column one only and
  leave the other two visibly blank (rule 4 — an absent number is drawn, not
  hidden); or build the projection as its own piece of work. **My
  recommendation is the second** — it is honest, it costs nothing, and the empty
  cells are an accurate statement about what is knowable.

  A second caveat on EP generally: it is flat early in the season. The highest
  `ep_next` in the entire game on 2026-08-27 was **4.0**, so in August a rating
  built on it separates nobody and will look broken. It becomes useful once
  there is form to work from. The app has a precedent for refusing to pad — the
  fixtures tab says it stops at five because five is what the API publishes.

---

## 6. Constraints

- React 18, Tailwind, shadcn/Radix. MUI is gone from `src/` — don't reintroduce.
- All six themes, 375px with no horizontal scroll, 44px touch targets.
- **Money is integer tenths everywhere.** Convert to `£x.xm` at the point of
  display only. `formatMoney` in `lib/myTeam.js` already does it. Floating-point
  pounds will produce £0.30000000000000004 and a budget that is wrong by 0.1.
- Use `fetchWithRetry` and `API_URL` / `apiHeaders` from `config/supabase.js`.
  The Edge Functions proxy FPL, whose WAF answers a burst from one origin with a
  flat 403 that looks exactly like an app bug.
- **Blank and double gameweeks.** None exist yet this season — verified, all 38
  gameweeks currently have exactly 10 fixtures — but they appear once cup
  postponements land. A team can have **zero** fixtures in a gameweek or
  **two**. The fixture strip and any rating must handle both; a `.find()` on the
  fixture list is the bug waiting to happen.
- There are tests now (`lib/h2h.test.js`, `lib/pointsLedger.test.js`,
  `components/MatchupLedger.test.js`). **The selling-price and free-transfer
  functions should be pure and unit-tested** — they are the two places where a
  wrong answer is invisible, and they are trivially testable in isolation.
- Verify in the browser before claiming it works, and prefer measuring computed
  styles to eyeballing screenshots. `frontend/scripts/contrast-audit.js` checks
  contrast across all six themes; paste it into the console and call
  `await contrastAudit()`.

---

## 7. Suggested scope

**v1 — the thing itself**

1. `entry-history` and `fixtures-future` Edge Functions (§3).
2. `lib/transferPlan.js`: selling price, free-transfer derivation, budget maths,
   squad legality. Pure functions, unit-tested, no React. These are the two
   places where a wrong answer is invisible.
3. `/my-team/plan`, keyed to `fpl_my_entry`, with the shared masthead and
   summary strip and a `NEXT GW` / `NEXT 3` tab bar.
4. **NEXT GW** — squad rows, OUT/IN, picker, ledger, live summary strip,
   validation states.
5. **NEXT 3** — the fixture grid over the *planned* squad, handling blanks and
   doubles.
6. `localStorage` persistence keyed by entry and target gameweek.
7. Wildcard / Free Hit toggle — it makes transfers unlimited and free, which is
   the state people most want to plan in, and the chip data is already there.
8. Entry point on MyTeam's SQUAD tab, shown only when `isMine`.

**Later, in rough order of value**

- Expected points in the grid's first column, blank in the other two (§5).
- Price-change warnings on the players in your plan — `getPriceOutlook` in
  `lib/playerStats.js` and `components/PlayerPriceProjection.js` both exist.
- A squad rating in the fourth summary cell, once EP is worth showing.
- Setting the XI and the captain, if the fifteen turns out not to be enough.
- Plans in Supabase behind the existing auth, so they sync across devices.
- Chained multi-gameweek planning, if it is still wanted after using this.
