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

### It should be its own route, not a fifth MyTeam tab

Tempting, since MyTeam already renders the squad. Don't, for one specific
reason: **MyTeam is a viewer for any manager.** Clicking a name on the H2H page
or the Dashboard navigates there with someone else's entry, which is exactly why
`fpl_my_entry` was split out from `fpl_team_id`. Planning transfers for a team
you don't own is meaningless, and a tab would inherit that context.

So: `/plan`, keyed to `fpl_my_entry` from `hooks/useMyEntry.js`, with no team
switcher. If no identity is set, the page's empty state is "set your team" and
links to `/my-team`. Add it to `navigation` in `Header.js` (the array at the
top) and cross-link from the MyTeam squad tab.

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
anything that is text. No photos — you said so, and it saves fifteen image
loads on a page that will re-render constantly.

**Masthead.** `PLANNING` chip, `GW N`, and the deadline as a countdown —
`events[].deadline_time`, verified present. Team name as the h1.

**Summary strip**, the three numbers that constrain every decision, updating
live as the plan changes:

```
FREE TRANSFERS        IN THE BANK        POINTS HIT
2  (editable)         £1.4M              −4
derived · tap to fix  after 2 in         1 transfer over
```

Reserve a fourth cell for the team rating; leave it out of v1.

**The squad**, position-grouped, one row per player. A row carries: position,
name, club, price, the next three fixtures as small FDR chips (`lib/fdr.js` has
the banding — use `bg` for fills only), an availability flag when `status !== 'a'`,
and an OUT control. A row marked OUT inverts and opens an IN slot beneath it;
the slot opens the picker, filtered to that position, to what the budget affords,
and to what the club limit allows.

**The ledger**, at the bottom, the same object as `MatchupLedger`: an OUT column
and an IN column whose money and count reconcile to the summary strip. This is
the bit that makes the page trustworthy — the reader can see the arithmetic.

**A sticky footer on mobile** carrying the same three numbers, because the
squad list is longer than a phone screen and the constraint has to stay visible.

### Validation: show, never block

Every illegal state should be reachable and named, not prevented. Over budget,
four from one club, wrong position counts, a player who is `can_select: false`,
a duplicate. The design system's rule 4 applies by analogy — don't hide the
problem, draw it.

---

## 5. Questions worth deciding rather than assuming

- **One gameweek or a chain?** You said "upcoming game weeks", and the honest
  answer is that these are very different features. Planning GW+1 is bounded.
  Planning GW+1..+5 means each gameweek's squad depends on the previous
  gameweek's plan, prices drift, and free transfers accumulate along the chain —
  it is a different data model, not a bigger version of the same one. **My
  recommendation: build GW+1 properly, and shape the stored plan so a chain is
  additive** (see below). Fixture strips for the next five gameweeks give most
  of the forward view without the combinatorics.
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
- **The team rating.** `ep_next` is the only forward number FPL publishes, so a
  rating is the sum of `ep_next` across the XI with the captain doubled — no
  invented model. Two caveats. It is flat early in the season: the highest
  `ep_next` in the whole game today is **4.0**, so in August the rating will
  rank nobody usefully and will look broken. And **beyond the next gameweek
  there is no `ep` at all**, so a multi-gameweek rating means building a
  projection, which is a separate project. The app already has a precedent for
  refusing to pad: the fixtures tab says it stops at five because that is what
  the API publishes.

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

1. `entry-history` and `fixtures-future` Edge Functions.
2. `lib/transferPlan.js`: selling price, free-transfer derivation, budget maths,
   squad legality. Pure functions, unit-tested, no React.
3. `/plan` route on the Scoreboard system: squad list, OUT/IN, picker, ledger,
   live summary strip, validation states.
4. `localStorage` persistence keyed by entry and target gameweek.
5. Wildcard / Free Hit toggle.

**Later, in rough order of value**

- Team rating on `ep_next`, with the early-season caveat handled honestly.
- Multi-gameweek chaining.
- Price-change warnings on the players in your plan — the data and the component
  both already exist.
- Plans in Supabase behind the existing auth, so they sync and can be shared.
