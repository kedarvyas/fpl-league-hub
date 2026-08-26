# Design brief — H2H League page

**Ask:** three distinct layout directions for the H2H League page (`/weekly-matchups`), mobile and desktop, on the Scoreboard design system described below. The page is the app's most-used screen and currently its messiest.

This brief is self-contained — you don't need the repo. Everything about the design system, the data actually available, and the current failures is below.

### Scope — please read this first

**The design system in §2 is finished, shipped and fixed. Do not redesign it.** The colours, the type scale, the spacing rhythm, the radius-0/no-shadow rule and the hairline-gap geometry are already live on two other screens; a third screen that looks different is a regression, not an improvement.

| Fixed — use as given | Open — this is what I'm asking for |
|---|---|
| Palette and tokens (§2, values in the table below) | What information is on the page, and in what order |
| Type scale, JetBrains Mono, tracking | Hierarchy — what's big, what's quiet, what's cut |
| Radius 0, no shadows, no gradients | Density and grouping |
| Hairlines-as-gaps geometry | How the expanded matchup is drawn |
| Spacing rhythm and gutters | Desktop column structure and mobile stacking order |
| 1280px max width, 375px floor, six themes | Navigation between gameweeks |

So: **new layouts, existing look.** If a direction seems to need a colour, a radius or a shadow that isn't in §2, that's a signal the direction is fighting the system — say so explicitly instead of quietly introducing one.

---

## 1. What the app is

An analytics dashboard for **Fantasy Premier League Head-to-Head leagues**. In a H2H league, every gameweek each manager is drawn against one other manager; whoever's FPL squad scores more points that week takes 3 league points, a draw takes 1. Over a season this produces a league table that is *not* the same ordering as raw FPL points.

The audience is a private league of ~22 friends. They open this page on a phone, on Saturday afternoon and Sunday evening, while games are live. The three questions they are actually asking, in order:

1. **Am I winning my fixture this week?**
2. **Why?** — which players are separating me from my opponent right now.
3. **Where does that leave me in the table?**

Everything else on the page is gossip about other people's fixtures, which is real value but secondary.

## 2. The design system: Scoreboard

The player page (`/player/:id`) and the app header are already built on this. The H2H page is the next conversion. **Live reference: https://tacticosfplhub.netlify.app/player/165** — open it, it is the single best description of the target.

### The five rules

Everything follows from these. If a decision isn't covered, derive it from these rather than inventing a new pattern.

1. **Radius 0, no shadows.** The shadow-on-white-rounded-card look is exactly what this replaces.
2. **Hairlines are gaps, not borders.** Grids and stacks are `gap-px` on a `bg-border` container; cells carry no border of their own. This is why the geometry reads as one dense board rather than a pile of cards.
3. **Real output and FPL scoring are separated by a value inversion, not a hue.** "Real" sits on `--panel` with `--foreground` text; "FPL" inverts to `--inverted` with `--background` text. Because it's a lightness flip it survives all six themes and colour-blind reading, and it replaces every colour-coded legend in the app.
4. **Never hide a zero.** Tracks are drawn unfilled; values drop to `--muted-foreground` at the same size. A fringe player and a starter have identical geometry — you compare them by how much ink is in the bars.
5. **Colour is earned.** `--live` is for real returns only. Something with nothing on the board gets muted, not a bright zero.

### Tokens

All colours are CSS custom properties, so in code nothing hardcodes a literal. **For mockups, use the actual values below** — they are the real shipped palette, and a comp drawn in anything else won't tell me what I need to know.

Design the comps in **Light and Dark**. Four more themes ship alongside them and must not break, but you don't need to draw them.

**Light**

| Token | HSL | Hex |
|---|---|---|
| `--background` | `0 0% 100%` | `#ffffff` |
| `--panel` | `210 40% 96%` | `#f1f5f9` |
| `--foreground` | `222 47% 11%` | `#0f172a` |
| `--muted-foreground` | `215 16% 47%` | `#64748b` |
| `--border` | `214 32% 91%` | `#e2e8f0` |
| `--primary` | `265 85% 54%` | `#7926ed` |
| `--live` | `84 62% 38%` | `#6d9d25` |
| `--warn` | `38 92% 42%` | `#ce8509` |
| `--destructive` | `0 84% 60%` | `#ef4343` |
| `--inverted` | = `--foreground` | `#0f172a` |

**Dark**

| Token | HSL | Hex |
|---|---|---|
| `--background` | `222 47% 11%` | `#0f1729` |
| `--panel` | `217 32% 15%` | `#1a2332` |
| `--foreground` | `210 40% 98%` | `#f8fafc` |
| `--muted-foreground` | `215 22% 73%` | `#abb8c9` |
| `--border` | `217 32% 17%` | `#1d2839` |
| `--primary` | `265 85% 62%` | `#904cf0` |
| `--live` | `84 70% 50%` | `#91d926` |
| `--warn` | `38 92% 55%` | `#f6a823` |
| `--destructive` | `0 84% 60%` | `#ef4343` |
| `--inverted` | = `--foreground` | `#f8fafc` |

Note what that means in practice: an "inverted" FPL cell is **near-black on light, near-white on dark** — the flip is the point (rule 3). `--live` is a *fill* with background-coloured text on top, never coloured text on a plain background.

**Typeface for the comps: JetBrains Mono** (Google Fonts, weights 400/500/700). It's not decoration — the whole design depends on digits aligning by column, and a proportional stand-in will make every number grid look wrong.

The other four themes, for range only — Sage `bg 150 20% 96%` / `panel 0 0% 100%`, Ocean `bg 200 20% 98%` / `panel 0 0% 100%`, Midnight `bg 230 35% 7%` / `panel 230 25% 13%`, Turf `bg 155 32% 8%` / `panel 155 24% 13%`. The trap: Sage and Ocean have **white panels on tinted grounds** while the dark three have **dark panels on darker grounds**, so any surface that relies on a specific hue rather than a lightness step will invert badly somewhere.

| Token | Purpose |
|---|---|
| `--background` | Page ground. |
| `--panel` | Tile and panel fill. Exists because two themes set `--card` equal to `--background`. |
| `--foreground` / `--muted-foreground` | Primary and secondary text. Both clear 4.5:1 in all six themes. |
| `--border` | Hairlines — i.e. the 1px gaps. |
| `--primary` | **Structure only**: percentile fills, active-nav markers, rank chips, watermarks. Never a stat value. |
| `--live` | Positive / returns / live. **Only ever a fill behind `--background`-coloured text**, never text on a background. |
| `--warn` | Cooling / mid-difficulty states. |
| `--destructive` | Negative. May be used as text. |
| `--inverted` | The FPL-cell surface (rule 3). |
| `--accent` / `--accent-chip` | Secondary accent, and its per-theme legible chip variant. |

### Themes

Six: **Light, Dark, Sage, Ocean, Midnight, Turf.** Any new surface must work in all six. The trap: Sage and Ocean have *white* panels on off-white grounds, while Dark, Midnight and Turf have dark panels on darker grounds. A colour that reads in one inverts badly in another. This is why separation is done by lightness, not hue.

### Type

**JetBrains Mono**, weights 400/500/700, applied at the page root. Every number aligns by digit without `tabular-nums`, and the wide-tracked small caps are the design's texture.

| Role | Size | Weight | Tracking |
|---|---|---|---|
| Hero name | 25px mobile / 46px desktop | 700 | −.03em / −.045em |
| Hero headline number | 52px | 700 | −.06em |
| Panel headline value | 34–40px | 700 | −.04 / −.05em |
| Stat value | 26px (28 desktop) | 700 | −.04em |
| Section header | 9px | 500 | .18em, uppercase |
| Stat label | 8.5px | 500 | .13em, uppercase |
| Rank chip | 8px | 500 | .1em |
| Micro / legend | 7–7.5px | 400 | .1–.12em |

7px is the floor, and only for uppercase micro-labels beside a large number — never for anything read as a sentence.

### Spacing

Section rhythm `pt-[22px] pb-2.5`. Page gutter `px-4` mobile, `md:px-7`. Cell padding `px-3 pt-[11px] pb-3`; panels `p-[14px]`. Bar tracks: 3px percentile, 4px price, 6px expected, 8px threshold segments. Page container `max-w-[1280px]`.

### Existing components to reuse

- **`<PlayerStatCell>`** — label / value / rank chip / percentile track. The label sits in a **fixed 22px band**, which is what keeps a grid on one baseline regardless of label length.
- **`<StatGrid>`** — `grid-cols-2` mobile, `md:grid-cols-4`, `gap-px` on `bg-border`.
- **`<SectionHeader>`** — label, hairline rule, optional right-hand chip.
- **`<PlayerPhoto>`** — headshot with a tinted-initials fallback. Photos are ~90% available, so any photo-led layout needs the fallback to look deliberate, not broken.
- The header's nav strip and the player page's tab bar are the same object: hairline rule, 9.5px tracked caps, 2px underline on the active item.

---

## 3. What's on the page today

A 3 / 6 / 3 desktop grid of rounded, shadowed cards; on mobile it stacks matchups → standings → gameweek stats.

**Left column** — three separate cards:
- *League Table*: a Rank / Team / Pts table, truncated to 8 rows on mobile with a "show all" button.
- *League Performance*: top 3 and bottom 3 managers **this week**.
- *League Insights*: top 4 and bottom 3 **overall**, headed "Top Four 🏆" and "Bottom Three 💩".

**Centre column** — *Weekly Matchups*: a gameweek `<select>`, then one collapsed row per fixture (`Team A / manager` — `53 - 40` — `Team B / manager`). Clicking a row expands it to a squad comparison.

**Right column** — *Manager of the Week* (a purple gradient card) and *Gameweek Transfers* (a manager picker plus in/out transfer cards).

### The expanded matchup, which is the broken part

Two entirely separate implementations swap at the `xl` breakpoint:

- **Below `xl`:** a plain two-column list of player rows — name, position, club, points. It works and is legible; it's just styled to the old system and doesn't say anything a table couldn't.
- **At `xl` and up:** a green cartoon football pitch with white markings and 22 club-coloured player cards.

The pitch is what the user sees as "broken", and here is the actual mechanism:

- Each `PlayerCard` is a hard `w-20 h-28` (80×112px) and cannot shrink.
- Each half-pitch lays out four position columns (GKP/DEF/MID/FWD) with `flex justify-around`, so a half needs **≥320px** and the full pitch **≥640px** — inside a centre column that is only about 690px wide at a 1280px viewport.
- The pitch box is `padding-top: 56.25%`, so at that width it is only ~388px tall. A five-man midfield column needs 5 × 112 = **560px**. The cards overflow the pitch vertically by a wide margin.
- The matchup row's wrapper is `overflow-hidden`, so all of that overflow is **clipped rather than scrolled**. That is why players are cut off.

Three more defects in the same component, worth fixing rather than porting:

1. **Captain points are doubled twice.** The API already returns `points = eventPoints × multiplier`, and `PlayerCard` then renders `isCaptain ? points * 2 : points`. Captains show 4× their real score on the pitch. (The mobile list is correct.)
2. **Club colours are a hardcoded hex map and it's two seasons stale.** It still lists Luton, Sheffield United and Burnley, and has no entry for Leeds, Sunderland or Ipswich — those players fall back to dark grey, which is why some cards in the current pitch look dead. Hardcoded hex also violates the token rule outright.
3. The two implementations mean **every change has to be made twice**, and they already disagree about the score.

### What else is wrong, at the layout level

This is the part worth solving properly:

- **Nothing is primary.** Three columns of equally-weighted cards, nine card headers, and the user's own fixture is one indistinguishable row among eleven. There is no "you" on this page at all.
- **The left column says the same thing three times.** "League Table", "League Performance" and "League Insights" are three cards, six sub-headings, and four superlative lists that all rank the same ~22 managers by one of two numbers.
- **The table is thinner than the data.** It shows Rank / Team / Pts while the API returns W-D-L, points-for and last week's rank (see §4). In a H2H league, W-D-L *is* the table.
- **Chrome outweighs content.** Nine rounded shadowed cards, each with a padded title bar, wrapping content that is mostly 12px rows.
- **The gameweek picker is an MUI `<Select>`** with inline `sx` overrides fighting the theme, and it's the only way to move between weeks.

---

## 4. The data you can design against

This matters more than usual: a lot of the best material on this page is **already being fetched and thrown away**. Anything below can be put on screen with no new backend work.

### Per fixture — from the H2H matches endpoint

`entry_1_entry`, `entry_1_name` (team name), `entry_1_player_name` (manager), `entry_1_points`, **`entry_1_win` / `entry_1_draw` / `entry_1_loss`**, **`entry_1_total`** (season H2H points), and the same for `entry_2`. Plus `is_knockout`, `winner`, `tiebreak`, `is_bye`.

> Currently only the two names and the two scores are rendered. The win/draw/loss flags — i.e. *the result* — are on the wire and unused.

### Per manager, in the standings

`rank`, **`last_rank`**, `entry_name`, `player_name`, **`matches_played`, `matches_won`, `matches_drawn`, `matches_lost`**, **`points_for`**, `total` (H2H points).

> Only `rank`, `entry_name` and `total` are rendered. Rank movement, form, and points-for are all available.

### Inside an expanded matchup

For each side, a squad of 15 enriched picks:

`id`, `name` (web name), `position` (`GKP`/`DEF`/`MID`/`FWD`), `club` (3-letter code), `points` (**already multiplied** by captaincy), `isCaptain`, `isViceCaptain`, `isStarting`, `multiplier`.

Plus a per-side `entry_history` object that is currently **completely unused**:

`points`, `total_points`, `overall_rank`, **`event_transfers`**, **`event_transfers_cost`** (the points hit), **`points_on_bench`**, `value` (squad value), `bank`, and **`active_chip`** (Wildcard / Bench Boost / Triple Captain / Free Hit).

> "He took a −8 hit and left 14 on the bench" is the story of a lot of H2H fixtures, and every number needed to tell it is already in the response.

**One caveat:** the picks array arrives in squad-slot order (1–15, so bench order is implicit in the array), but the numeric slot field itself is overwritten by the position string during enrichment. Rely on array order, not on a slot number.

### The idea I'd most like you to take seriously

A H2H fixture is not decided by who has the better team — it's decided by **differentials**. Players both managers own cancel out completely. If we both own Haaland's 16 points, those 16 points are noise. The fixture is settled entirely by the players only *one* of us has.

Every squad comparison in every FPL product shows two full teams side by side and leaves the reader to do that subtraction in their head. All the data needed to do it for them is in the payload above: intersect the two `picks` arrays on `id`, split into **shared** and **differential**, and the differential column sums exactly to the scoreline gap. Nobody builds this. It is the single most useful thing this page could do, it is native to a board-of-numbers design language, and it would work identically on a phone and a desktop.

Treat that as a strong suggestion, not a requirement — if a direction you like more falls out of the rules, propose that instead.

---

## 5. Constraints

- **React 18, Tailwind, shadcn/Radix.** Available Radix primitives: tabs, tooltip, popover, separator. There is a small in-house dropdown component (radius 0, hairline border, closes on outside-click and Escape).
- **MUI is being removed from the codebase, and this page is the last place it lives.** `WeeklyMatchups.js` and `GameweekStats.js` are the only two remaining importers of `@mui/material` in the entire app — converting this page deletes the dependency. Do not design anything that needs it back.
- **Recharts** for charts, if a direction calls for one.
- **Six themes, no exceptions.** Check every surface in all six.
- **375px with no horizontal scroll**, and 44px minimum touch targets. Mobile is the primary case — assume most reads happen on a phone during a live gameweek.
- Squads are 15 players each, so a full comparison is 30 rows of data. Leagues run 10–24 managers, so 5–12 fixtures per gameweek.
- Scores update live during matches. Something on this page should feel like it's moving.

---

## 6. What I'd like back

**Three distinct directions**, far enough apart to be a real choice rather than three versions of one idea. For each:

1. **Mobile at 375px** — the primary case. Full page, top to bottom, including one expanded matchup.
2. **Desktop at 1280px** — same page.
3. **A sentence on the organising idea**, and what it deliberately gives up.

Please make each direction take a clear position on these four, since they're where the page actually lives or dies:

- **Does the user's own fixture get special treatment, and how?** (Note: there is a "my team ID" concept elsewhere in the app, so identifying the reader is possible.)
- **What replaces the pitch?** A fixed-geometry list, a differential ledger, a compressed 15v15, something else. Bear in mind the green pitch with club-coloured cards is off-system on its face — but if you think a pitch *can* be drawn in this language, show me.
- **What happens to the left column's three cards?** Merge, cut, demote, or fold into the table.
- **How do you move between gameweeks?** It's currently a dropdown, which is the least interesting possible answer for something people step through one at a time.

Type-level detail isn't needed on every element — the scale in §2 is fixed and I can apply it. What I want from you is **structure, hierarchy and density**: what's on screen, how big, in what order, and what earns colour.
