import React from 'react';
import { fdrBand } from '../lib/fdr';
import { formatDecimal, toNumber } from '../lib/playerStats';
import { fixturesFor, formatMoney, statusFlag } from '../lib/transferPlan';

/**
 * The pitch.
 *
 * The H2H page deleted its pitch and this one brings it back, which is worth
 * justifying rather than treating as a reversal. That pitch was a *readout* of
 * a finished gameweek, where the only question is how many points each player
 * scored — and it spent its whole width on eleven pieces of decoration with
 * nowhere left to put the numbers. This is a *workspace*, and the thing being
 * edited genuinely is a formation: which eleven start, who is on the bench and
 * in what order, who wears the armband. A list cannot show that; a pitch is
 * the shape of the answer.
 *
 * Two things keep it on the system:
 *
 * 1. **The field is `--muted`, not green.** A fixed green cannot survive six
 *    themes with panels on both sides of the lightness scale — it is the same
 *    trap `tier_color` fell into. The markings are `--border` hairlines, so
 *    this is a *diagram* of a pitch rather than a picture of one, which is
 *    also why it needs no images.
 * 2. **No shirt graphics.** Fifteen image loads on a surface that re-renders
 *    on every edit, to say something the club abbreviation already says.
 *
 * The cards carry one of three display modes, chosen above the pitch. That
 * toggle is what makes the density work at 375px: a five-man defence has about
 * 66px per card, which is room for one fixture in comfort or three compressed,
 * but not for everything at once.
 */

/** How wide one card may grow. A lone keeper must not stretch to full width. */
const cardBasis = (count) => `${100 / Math.max(3, count)}%`;

/**
 * One fixture, or two in a double, or the drawn absence of one.
 *
 * `ready` separates two things that look identical and are not: a club with no
 * fixture that week has a blank, and a fixture list that failed to load tells
 * us nothing at all. Only the first earns a word.
 */
const FixtureCells = ({ runs, compact, ready }) => (
    <div className={`grid gap-px ${compact ? 'grid-cols-3' : 'grid-cols-1'}`}>
        {runs.map((fixtures, i) => {
            if (!ready) {
                return <span key={i} className="mt-1 block h-[3px] w-full bg-border" />;
            }
            if (fixtures.length === 0) {
                return (
                    <span key={i} className="block">
                        <span className="block truncate text-center text-[7px] leading-none tracking-[0.06em] text-muted-foreground">
                            {compact ? '—' : 'NO FIXTURE'}
                        </span>
                        {/* Drawn unfilled, never omitted: a blank week and a
                            hard week take identical space so the row is read
                            by how much ink is in it. */}
                        <span className="mt-1 block h-[3px] w-full bg-border" />
                    </span>
                );
            }
            return (
                <span key={i} className="block">
                    {fixtures.map((f, j) => (
                        <span key={j} className={j > 0 ? 'mt-0.5 block' : 'block'}>
                            <span className="block truncate text-center text-[7px] leading-none tracking-[0.06em] text-foreground">
                                {f.opponent}
                            </span>
                            <span className="block truncate text-center text-[7px] leading-none tracking-[0.06em] text-muted-foreground">
                                {f.isHome ? 'H' : 'A'}
                            </span>
                            {/* `bg` is a fill token and carries no text — the
                                letter sits above it, on --panel. */}
                            <span className="mt-1 block h-[3px] w-full bg-border">
                                <span
                                    className={`block h-full ${fdrBand(f.difficulty).bg}`}
                                    style={{ width: `${(toNumber(f.difficulty) / 5) * 100}%` }}
                                />
                            </span>
                        </span>
                    ))}
                </span>
            );
        })}
    </div>
);

/** Progress toward the next price change. Never rendered as an amount. */
const PriceCell = ({ player }) => {
    const momentum = player.priceMomentum;
    if (momentum === null || momentum === undefined) {
        return (
            <span className="block">
                <span className="block text-center text-[7px] leading-none tracking-[0.06em] text-muted-foreground">
                    NO DATA
                </span>
                <span className="mt-1 block h-[3px] w-full bg-border" />
            </span>
        );
    }

    const rising = momentum >= 0;
    return (
        <span className="block">
            <span
                className={`block text-center text-[7px] leading-none tracking-[0.06em] ${
                    momentum === 0
                        ? 'text-muted-foreground'
                        : rising
                            ? 'text-live-ink'
                            : 'text-destructive-ink'
                }`}
            >
                {/* Steady is neither direction. An arrow beside 0% claims a
                    move that is not happening. */}
                {momentum === 0 ? '·' : rising ? '▲' : '▼'}{' '}
                {formatDecimal(Math.abs(momentum), 0, '0')}%
            </span>
            <span className="mt-1 block h-[3px] w-full bg-border">
                <span
                    className={`block h-full ${rising ? 'bg-live' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(100, Math.abs(momentum))}%` }}
                />
            </span>
        </span>
    );
};

/**
 * One player on the pitch.
 *
 * The whole card is the control. Tapping it selects; tapping a second card
 * swaps the two, which is one operation covering substitution, positional
 * shuffle and bench reordering — see `swapSheet`.
 */
const PitchCard = ({
    entry,
    mode,
    events,
    fixtureIndex,
    fixturesReady,
    selected,
    isCaptain,
    isVice,
    onSelect,
    onFill,
}) => {
    const { original, incoming, removed, player } = entry;

    // A slot with nobody in it is a real state, not an error: it is how you
    // hold a departure open while you decide.
    if (!player) {
        return (
            <button
                type="button"
                onClick={() => onFill(original.slot)}
                aria-label={`Choose a ${original.position} to replace ${original.name}`}
                className="flex min-h-[56px] w-full flex-col justify-center border border-dashed border-live bg-panel px-1.5 py-1.5 text-center transition-colors hover:bg-muted"
            >
                <span className="block truncate text-[8px] font-medium leading-none tracking-[0.1em] text-live-ink">
                    + {original.position}
                </span>
                <span className="mt-1 block truncate text-[7px] leading-none tracking-[0.06em] text-muted-foreground">
                    {original.name}
                </span>
            </button>
        );
    }

    const flag = statusFlag(player);
    const runs =
        mode === 'three'
            ? events.map((event) => fixturesFor(fixtureIndex, player.clubId, event))
            : [fixturesFor(fixtureIndex, player.clubId, events[0])];

    return (
        <button
            type="button"
            onClick={() => onSelect(original.slot)}
            aria-pressed={selected}
            className={`w-full px-1.5 py-1.5 text-left transition-colors ${
                selected
                    ? 'bg-inverted'
                    : incoming
                        ? 'border-l-2 border-live bg-panel'
                        : 'bg-panel hover:bg-muted'
            }`}
        >
            <span className="flex items-baseline justify-between gap-1">
                <span
                    className={`min-w-0 flex-1 truncate text-[9px] font-medium leading-none md:text-[11px] ${
                        selected ? 'text-background' : 'text-foreground'
                    }`}
                >
                    {player.name}
                </span>
                <span
                    className={`shrink-0 text-[7.5px] leading-none ${
                        selected ? 'text-background/70' : 'text-muted-foreground'
                    }`}
                >
                    {formatMoney(removed ? player.price : original.selling).replace('M', '')}
                </span>
            </span>

            <span className="mt-1 flex items-center gap-1">
                <span
                    className={`min-w-0 flex-1 truncate text-[7px] leading-none tracking-[0.1em] ${
                        selected ? 'text-background/70' : 'text-muted-foreground'
                    }`}
                >
                    {player.club}
                </span>
                {(isCaptain || isVice) && (
                    <span
                        className={`shrink-0 px-1 py-px text-[7px] font-medium leading-none tracking-[0.1em] ${
                            selected ? 'bg-background/20 text-background' : 'bg-accent/15 text-accent-chip'
                        }`}
                    >
                        {isCaptain ? 'C' : 'V'}
                    </span>
                )}
                {flag && !selected && (
                    <span
                        className={`shrink-0 text-[7px] font-medium leading-none tracking-[0.06em] ${
                            flag.severe ? 'text-destructive-ink' : 'text-warn-ink'
                        }`}
                        title={flag.news || undefined}
                    >
                        {flag.chance === null ? flag.word.slice(0, 3) : `${flag.chance}%`}
                    </span>
                )}
            </span>

            {/* Hidden while selected: the card inverts, and the fill tokens on
                the difficulty bars are tuned against --panel, not --inverted. */}
            {!selected && (
                <span className="mt-1 block">
                    {mode === 'price' ? (
                        <PriceCell player={player} />
                    ) : (
                        <FixtureCells runs={runs} compact={mode === 'three'} ready={fixturesReady} />
                    )}
                </span>
            )}
        </button>
    );
};

/** One line of the formation. */
const PitchRow = ({ entries, decorate, ...card }) => (
    <div className="flex justify-center gap-1.5 md:gap-2">
        {entries.map((entry) => (
            <div
                key={entry.slot}
                className="min-w-0 flex-1"
                style={{ maxWidth: cardBasis(entries.length) }}
            >
                <PitchCard entry={entry} {...card} {...decorate(entry)} />
            </div>
        ))}
    </div>
);

const ROWS = [1, 2, 3, 4];

const PlanPitch = ({ applied, mode, events, fixtureIndex, fixturesReady, selected, onSelect, onFill }) => {
    const cardProps = { mode, events, fixtureIndex, fixturesReady, onSelect, onFill };

    const rows = ROWS.map((type) =>
        applied.xi.filter((entry) => (entry.player || entry.original).elementType === type),
    ).filter((row) => row.length > 0);

    const decorate = (entry) => ({
        selected: selected === entry.slot,
        isCaptain: applied.captain?.slot === entry.slot,
        isVice: applied.vice?.slot === entry.slot,
    });

    return (
        <>
            <div className="relative bg-muted p-2 md:p-3">
                {/* Markings, not decoration: they are what makes a stack of
                    rows read as a formation. Hairlines only. */}
                <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <div className="absolute inset-2 border border-border md:inset-3" />
                    <div className="absolute inset-x-2 bottom-1/2 h-px bg-border md:inset-x-3" />
                    <div className="absolute left-1/2 top-2 h-[46px] w-[46%] -translate-x-1/2 border-x border-b border-border md:top-3 md:h-[58px]" />
                    <div className="absolute left-1/2 top-2 h-[18px] w-[22%] -translate-x-1/2 border-x border-b border-border md:top-3 md:h-[24px]" />
                    {/* A circle, not a rounded rectangle — rule 1 is about the
                        card look, and a centre circle is a line drawing. */}
                    <div className="absolute left-1/2 top-1/2 h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-border md:h-[110px] md:w-[110px]" />
                </div>

                <div className="relative flex flex-col gap-2 pt-[54px] md:gap-3 md:pt-[66px]">
                    {rows.map((entries, i) => (
                        <PitchRow key={i} entries={entries} decorate={decorate} {...cardProps} />
                    ))}
                </div>
            </div>

            <div className="mt-px bg-muted p-2 md:p-3">
                <div className="pb-1.5 text-[7px] leading-none tracking-[0.16em] text-muted-foreground">
                    BENCH · IN SUBSTITUTION ORDER
                </div>

                <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                    {applied.bench.map((entry) => (
                        <div key={entry.slot} className="min-w-0">
                            <div className="pb-1 text-center text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                                {(entry.player || entry.original).position}
                            </div>
                            <PitchCard
                                entry={entry}
                                {...cardProps}
                                {...decorate(entry)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Worth stating, because it is the one number on this page that
                disagrees with the FPL site on purpose. A player who has risen
                sells for their purchase price plus half the profit, so what a
                shirt is worth to *you* is not what it costs to buy. The
                ledger and the budget both use this figure, so the pitch has
                to as well. */}
            <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                PRICES ON THE PITCH ARE WHAT EACH PLAYER SELLS FOR, WHICH IS NOT ALWAYS WHAT THEY
                COST TO BUY.
            </p>
        </>
    );
};

export default PlanPitch;
