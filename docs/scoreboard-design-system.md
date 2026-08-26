# Scoreboard — FPL League Hub design system

The player page (`/player/:playerId`) is built on this and is the reference implementation. **Everything else in the app still looks like the old design.** Roll this out next, starting with the header.

Live example: https://tacticosfplhub.netlify.app/player/165

---

## The five rules

Everything below follows from these. If a decision isn't covered, work it out from these rather than inventing a new pattern.

1. **Radius 0, no shadows.** The shadow-on-white-rounded-card look is exactly what this replaces.
2. **Hairlines are gaps, not borders.** Grids and stacks use `gap-px` on a `bg-border` container. Cells carry no border of their own. This is why the geometry reads as one dense board rather than a pile of cards.
3. **Real output and FPL scoring are separated by a value inversion, not a hue.** Real sits on `bg-panel` with `text-foreground`; FPL inverts to `bg-inverted` with `text-background`. Because it's a lightness flip, it survives all six themes and colour-blind reading, and it replaces every colour-coded legend in the app.
4. **Never hide a zero.** Tracks are drawn unfilled, values drop to `text-muted-foreground` at the same size. A fringe player and a starter have identical geometry — you compare them by how much ink is in the bars.
5. **Colour is earned.** `--live` is for real returns only. A player with nothing on the board gets muted, not a bright zero.

---

## Tokens

All colours are HSL triples in `frontend/src/index.css`, consumed through Tailwind. **Never hardcode a hex or an `hsl()` literal in a component.**

### Added for Scoreboard

| Token | Purpose |
|---|---|
| `--panel` | Tile and panel fill. Required because Dark and Midnight set `--card` equal to `--background`, leaving a tile grid with nothing to sit on. |
| `--live` | Positive / returns / live. **Only ever a fill behind `--background`-coloured text**, never text on a background — that is what keeps it legible in Sage and Ocean. |
| `--warn` | `COOLING` verdict, FDR 3. |
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

Apply `font-mono` at the page root, not per component.

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
- **The gradient tokens are gone.** `--header-bg-from` / `--header-bg-to` and the
  `.card-header-gradient` utility were deleted: the two colours were never
  Tailwind colours, so `from-header-bg-from` in `Home.js` and `Dashboard.js` has
  never rendered. Those dead class names are still in those two files and go when
  they convert. `--header-text` / `--header-text-secondary` stay — the
  `.card-header-text*` utilities do apply, and those two pages still use them.
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

1. `Layout` no longer wraps the header in a purple gradient with `shadow-lg`, and
   it no longer wraps Scoreboard routes in the legacy `max-w-7xl … sm:px-6
   lg:px-8` container. That container was double-padding the player page, so its
   content did not line up with the header. `SCOREBOARD_ROUTES` in `Layout.js`
   lists the converted routes; add to it as pages convert, and delete the branch
   and the container together when it covers everything.
2. `ui/dropdown-menu` is radius 0, `--popover` with a hairline border, no shadow
   or ring, anchored `top-full`, and now closes on outside click and Escape.
   `Dashboard.js` uses it too and picks all of that up.
3. `LoginModal`'s `dark:` variants never applied — Tailwind's `darkMode` here is
   class-based and themes switch on `data-theme`, so the error and success blocks
   and the Google button were light-only in all six themes. All on tokens now.

Still on sans: `font-mono` is applied per page root (`PlayerStats`) and per chrome
surface (the header and the two modals) rather than at the app root, because the
unconverted pages are designed in sans. Move it to `Layout`'s root div when the
last page converts.

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
gzipped. The packages are still in `package.json` and can be uninstalled.

---

## Next up

`Dashboard.js`, `MyTeam.js`, `Home.js`, `PlayerStatisticsHub.js`,
`PlayerComparison.js`.

`Home.js` and `Dashboard.js` still carry dead `from-header-bg-from` /
`to-header-bg-to` class names whose tokens were deleted with the header work.

---

## Constraints

- React 18, Tailwind, shadcn/Radix. **MUI is being removed** — don't add to it. Remaining users: `GameweekStats.js`, `LeagueTable.js`, `PlayerComparison.js`.
- Recharts for charts.
- Everything must work in all six themes and at 375px with no horizontal scroll.
- Player photos are ~90% available and fall back to tinted initials — any photo-led layout needs that fallback to look deliberate. Use the existing `PlayerPhoto` component.

---

## Two open items on the player page

Not blocking, but worth knowing before treating it as finished:

1. **The desktop panel column wasn't built.** The original handoff specified a 326px right column at 1280 holding Defcon / ICT / Next 5 / Set pieces beside the main column. Everything is present but stacks in one ordered column at all widths. Mobile order was prioritised.
2. **Rank-chip tooltips aren't wired.** `@radix-ui/react-tooltip` is installed for it. Intended content: unabbreviated stat name plus "4th of 210 forwards".
