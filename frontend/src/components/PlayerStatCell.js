import React from 'react';
import { formatCount, formatDecimal, toNumber } from '../lib/playerStats';

/**
 * The stat cell. This pattern repeats across the whole app, so the geometry
 * lives here once.
 *
 * Two things carry most of the design:
 *
 * 1. The label sits in a fixed 22px band. That is what keeps a grid of tiles on
 *    one baseline no matter how long the labels are — the old page let a
 *    two-line label push its own value below its neighbours'.
 *
 * 2. Real output and FPL scoring are separated by a value inversion, not a
 *    hue. Real cells sit on --panel; FPL cells invert to --inverted with
 *    --background text. Because it's a lightness flip rather than a colour
 *    code, it survives all six themes and reads for colour-blind users.
 *
 * The percentile track is always drawn, never hidden. A fringe player and a
 * starter get identical geometry and you compare them by how much ink is in
 * the bars, so zero tiles must not be collapsed.
 */
const PlayerStatCell = ({
    label,
    value,
    decimals = 0,
    rank = null,
    percentile = 0,
    variant = 'real',
    title,
}) => {
    const numeric = toNumber(value, null);
    const isZero = numeric === null || numeric === 0;
    const display = decimals > 0
        ? formatDecimal(numeric, decimals, '0.' + '0'.repeat(decimals))
        : formatCount(numeric);

    const fpl = variant === 'fpl';

    return (
        <div
            className={`px-3 pt-[11px] pb-3 md:px-[13px] md:pt-3 md:pb-[14px] ${
                fpl ? 'bg-inverted' : 'bg-panel'
            }`}
            title={title || undefined}
        >
            <p
                className={`h-[22px] text-[8.5px] font-medium uppercase leading-[1.3] tracking-[0.13em] ${
                    fpl ? 'text-background/70' : 'text-muted-foreground'
                }`}
            >
                {label}
            </p>

            <div className="mt-1.5 flex items-end justify-between gap-1.5">
                <span
                    className={`text-[26px] md:text-[28px] font-bold leading-[0.9] tracking-[-0.04em] ${
                        fpl
                            ? 'text-background'
                            : isZero
                                ? 'text-muted-foreground'
                                : 'text-foreground'
                    }`}
                >
                    {display}
                </span>
                {rank != null && (
                    <span
                        className={`mb-0.5 shrink-0 px-1 py-[3px] text-[8px] font-medium tracking-[0.1em] ${
                            fpl ? 'bg-background/15 text-background' : 'bg-accent/15 text-accent-chip'
                        }`}
                    >
                        R{rank}
                    </span>
                )}
            </div>

            <div className={`mt-2.5 h-[3px] w-full ${fpl ? 'bg-background/25' : 'bg-border'}`}>
                <div
                    className={`h-full transition-[width] duration-500 ease-out ${
                        fpl ? 'bg-background' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, percentile))}%` }}
                />
            </div>
        </div>
    );
};

/**
 * Grid wrapper. The 1px gaps sit on a --border background so the hairlines are
 * the gaps themselves — no cell borders, no radius, no shadow.
 */
export const StatGrid = ({ children, columns = 4 }) => (
    <div
        className={`grid grid-cols-2 gap-px bg-border ${
            columns === 4 ? 'md:grid-cols-4' : columns === 3 ? 'md:grid-cols-3' : ''
        }`}
    >
        {children}
    </div>
);

/** Section header: label, hairline rule, optional right-hand chip. */
export const SectionHeader = ({ label, tone = 'muted', children }) => (
    <div className="flex items-center gap-2 pt-[22px] pb-2.5">
        <span
            className={`text-[9px] font-medium uppercase tracking-[0.18em] ${
                tone === 'live' ? 'text-live' : 'text-muted-foreground'
            }`}
        >
            {label}
        </span>
        <span className="h-px flex-1 bg-border" />
        {children}
    </div>
);

export default PlayerStatCell;
