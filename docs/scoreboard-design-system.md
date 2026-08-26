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

## Next up: the header

The current `Header.js` is still the old design — white bar, 2xl bold sans logo, purple `Log In` pill, lucide icons in every nav item. It sits directly above a Scoreboard page and the seam is obvious.

Things worth deciding rather than assuming:

- **The nav has five items plus theme, info and auth.** That's a lot of chrome above a page whose whole point is density. Consider whether nav belongs in the same band as the wordmark at all.
- **The logo lockup.** `FPL League Hub` at `text-xl sm:text-2xl` bold sans is the loudest non-data element on every screen. Scoreboard's hero name is 25px mono uppercase — the header currently competes with it.
- **The header is `bg-background`**, so it merges with the hero band below it. There's a `--header-bg-from`/`--header-bg-to` gradient in the tokens that **never renders** because `Header` paints `bg-background` over it, and the two colours aren't defined as Tailwind colours. Either wire it up or delete the tokens.
- **Icons.** Scoreboard uses almost none by design. The nav's `Home`/`User`/`ChartBar`/`Users` icons may be the wrong texture now.
- **Mobile menu** is a full-width dropdown panel with tap-outside-to-dismiss; the hamburger and controls are already 44px. That behaviour is fine — it's the styling that needs to change.

Files: `components/Header.js`, `components/Layout.js`, `components/ThemeSwitcher.js` (dropdown styling), `components/LoginModal.js` (still light-mode-only colours).

After the header, the same treatment wants applying to: `Dashboard.js`, `WeeklyMatchups.js`, `LeagueTable.js`, `MyTeam.js`, `Home.js`, `PlayerStatisticsHub.js`, `PlayerComparison.js`.

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
