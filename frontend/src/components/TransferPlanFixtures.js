import React from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './PlayerStatCell';
import { fdrBand } from '../lib/fdr';
import { formatCount, toNumber } from '../lib/playerStats';
import { fixturesFor, summariseColumn, summariseRun } from '../lib/transferPlan';

/**
 * NEXT 3 — the readout.
 *
 * This renders the squad **as planned**, not as it stands. A player brought in
 * on the first view appears here immediately and the one they replaced does
 * not. That shared state is the whole point of pairing the two views: without
 * it this is a fixture list you could already get from the players page, and
 * the two halves of the feature never talk to each other.
 *
 * Two things it has to get right:
 *
 * - **A cell can hold none or two fixtures.** A blank keeps the grid's
 *   geometry and reads as a blank (rule 4); a double shows both legs. Every
 *   lookup goes through `fixturesFor`, which always returns an array — a
 *   `.find()` here would silently drop a double's second leg and render a
 *   blank as a fixture against nobody.
 * - **Expected points is not in this grid.** `ep_next` is the only forward
 *   number FPL publishes and its name is literal: it covers the next gameweek
 *   and nothing beyond. Two of these three columns have no honest number to
 *   carry, so rather than pad them the grid stops at difficulty — the same
 *   refusal the player page's fixtures tab makes when it stops at five.
 */

/** The column widths that hold at 375px: name, three gameweeks, the run. */
const GRID = 'grid grid-cols-[1.55fr_repeat(3,1fr)_0.62fr] gap-px bg-border';

/**
 * One gameweek for one player. Never a single fixture — see above.
 *
 * `unfilled` separates the two ways a cell can be empty: a player with no
 * fixture that week has a **blank**, which is information worth naming, while
 * a squad slot with nobody in it has no fixtures because there is no player,
 * and calling that a blank would state something false about a club.
 */
const FixtureCell = ({ fixtures, unfilled }) => {
    if (fixtures.length === 0) {
        return (
            <div className="flex min-h-[44px] flex-col justify-center bg-panel px-1.5 py-2">
                <span className="block text-center text-[9px] leading-none text-muted-foreground md:text-[11px]">
                    —
                </span>
                <span className="mt-1 block text-center text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                    {unfilled ? '\u00A0' : 'BLANK'}
                </span>
                {/* Drawn unfilled rather than omitted, so a blank week and a
                    hard week occupy identical geometry and the grid is read by
                    how much ink is in it. */}
                <span className="mt-1.5 block h-[3px] w-full bg-border" />
            </div>
        );
    }

    return (
        <div className="flex min-h-[44px] flex-col justify-center gap-1.5 bg-panel px-1.5 py-2">
            {fixtures.map((f, i) => {
                const band = fdrBand(f.difficulty);
                return (
                    <span key={i} className="block">
                        <span className="block truncate text-center text-[9px] font-medium leading-none text-foreground md:text-[11px]">
                            {f.opponent}
                        </span>
                        <span className="mt-1 block text-center text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                            {f.isHome ? 'H' : 'A'} · {f.difficulty ?? '—'}
                        </span>
                        {/* `bg` is a fill token and carries no text — the
                            difficulty numeral is above it, on --panel. */}
                        <span className="mt-1.5 block h-[3px] w-full bg-border">
                            <span
                                className={`block h-full ${band.bg}`}
                                style={{ width: `${(toNumber(f.difficulty) / 5) * 100}%` }}
                            />
                        </span>
                    </span>
                );
            })}
        </div>
    );
};

const TransferPlanFixtures = ({ applied, fixtureIndex, events, state }) => {
    // Drawn as a stated failure, not as fifteen rows of blanks. Every cell
    // would otherwise read "BLANK", which is a specific and false claim about
    // every club in the league.
    if (state === 'failed') {
        return (
            <div className="px-4 pb-10 md:px-7">
                <SectionHeader label="Next three" />
                <div className="border-l-2 border-destructive bg-panel px-3 py-3">
                    <p className="text-[9px] leading-[1.5] tracking-[0.08em] text-destructive-ink">
                        COULD NOT LOAD FIXTURES
                    </p>
                    <p className="mt-1.5 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                        THE REST OF THE PLAN IS UNAFFECTED — YOUR SQUAD, THE BUDGET AND THE HIT ARE
                        ALL ON THE NEXT GW TAB.
                    </p>
                </div>
            </div>
        );
    }

    if (state === 'loading') {
        return (
            <div className="animate-pulse px-4 pb-10 md:px-7">
                <SectionHeader label="Next three" />
                <div className="flex flex-col gap-px bg-border">
                    {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="h-[44px] bg-panel" />
                    ))}
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="px-4 pb-10 md:px-7">
                <SectionHeader label="Next three" />
                <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                    NO UPCOMING FIXTURES PUBLISHED
                </div>
            </div>
        );
    }

    // Position-grouped, in the same order as NEXT GW. FPL numbers the picks by
    // starting XI then bench, so slot order would put the second keeper and
    // three bench players at the bottom of one view and beside their position
    // in the other — and the whole point of the pair is reading across them.
    const rows = applied.slots
        .slice()
        .sort(
            (a, b) =>
                a.original.elementType - b.original.elementType || a.slot - b.slot,
        )
        .map((slot) => {
            const player = slot.player;
            const runs = events.map((event) =>
                player ? fixturesFor(fixtureIndex, player.clubId, event) : [],
            );
            return { slot, player, runs, summary: summariseRun(runs) };
        });

    const columns = events.map((event, index) => ({
        event,
        good: summariseColumn(rows.filter((r) => r.player).map((r) => r.runs[index])),
        of: rows.filter((r) => r.player).length,
    }));

    return (
        <div className="px-4 pb-10 md:px-7">
            <SectionHeader label={`GW${events[0]}–${events[events.length - 1]} · as planned`}>
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    {formatCount(applied.completed.length)} MOVE
                    {applied.completed.length === 1 ? '' : 'S'} APPLIED
                </span>
            </SectionHeader>

            <div className={GRID}>
                <div className="bg-panel px-2 py-2 text-[7.5px] leading-none tracking-[0.14em] text-muted-foreground">
                    SQUAD
                </div>
                {events.map((event) => (
                    <div
                        key={event}
                        className="bg-panel px-1.5 py-2 text-center text-[7.5px] leading-none tracking-[0.14em] text-muted-foreground"
                    >
                        GW{event}
                    </div>
                ))}
                <div className="bg-panel px-1.5 py-2 text-center text-[7.5px] leading-none tracking-[0.14em] text-muted-foreground">
                    RUN
                </div>

                {rows.map(({ slot, player, runs, summary }) => (
                    <React.Fragment key={slot.slot}>
                        <div className="flex min-h-[44px] flex-col justify-center bg-panel px-2 py-2">
                            {player ? (
                                <>
                                    <Link
                                        to={`/player/${player.id}`}
                                        className="block truncate text-[9.5px] font-medium leading-none text-foreground hover:underline md:text-[12px]"
                                    >
                                        {player.name}
                                    </Link>
                                    <span className="mt-1 block truncate text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                                        {player.position} · {player.club}
                                        {slot.incoming ? ' · IN' : ''}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span className="block truncate text-[9.5px] font-medium leading-none text-muted-foreground md:text-[12px]">
                                        EMPTY SLOT
                                    </span>
                                    <span className="mt-1 block truncate text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                                        {slot.original.position} · NOBODY IN YET
                                    </span>
                                </>
                            )}
                        </div>

                        {runs.map((fixtures, i) => (
                            <FixtureCell key={events[i]} fixtures={fixtures} unfilled={!player} />
                        ))}

                        <div className="flex min-h-[44px] flex-col justify-center bg-panel px-1.5 py-2">
                            <span
                                className={`block text-center text-[13px] font-bold leading-none tracking-[-0.03em] md:text-[15px] ${
                                    summary.good === 0 ? 'text-muted-foreground' : 'text-foreground'
                                }`}
                            >
                                {summary.good}
                            </span>
                            <span className="mt-1 block text-center text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                                OF {summary.total}
                            </span>
                        </div>
                    </React.Fragment>
                ))}

                {/* Per-column: how much of the squad has a kind week. This and
                    the per-row count are the reason to draw a grid rather than
                    fifteen fixture lists. */}
                <div className="bg-panel px-2 py-2.5 text-[7.5px] leading-none tracking-[0.14em] text-muted-foreground">
                    GOOD FIXTURES
                </div>
                {columns.map((column) => (
                    <div key={column.event} className="bg-panel px-1.5 py-2.5">
                        <span
                            className={`block text-center text-[13px] font-bold leading-none tracking-[-0.03em] md:text-[15px] ${
                                column.good === 0 ? 'text-muted-foreground' : 'text-foreground'
                            }`}
                        >
                            {column.good}
                        </span>
                        <span className="mt-1 block text-center text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                            OF {column.of}
                        </span>
                    </div>
                ))}
                <div className="bg-panel px-1.5 py-2.5" aria-hidden="true" />
            </div>

            <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                A FIXTURE COUNTS AS GOOD AT FDR 3 OR BETTER. RUN COUNTS FIXTURES, NOT WEEKS, SO A
                DOUBLE GAMEWEEK IS WORTH TWO AND A BLANK IS WORTH NONE.
            </p>

            <div className="mt-4 border border-dashed border-border p-3 text-[8.5px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                EXPECTED POINTS IS NOT IN THIS GRID. FPL PUBLISHES ONE FORWARD NUMBER — EP_NEXT —
                AND IT COVERS THE NEXT GAMEWEEK ONLY. TWO OF THESE THREE COLUMNS HAVE NOTHING
                HONEST TO PUT THERE.
            </div>
        </div>
    );
};

export default TransferPlanFixtures;
