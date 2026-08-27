import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './PlayerStatCell';
import { buildLedger, captainMark, captaincySplit } from '../lib/h2h';
import { formatCount, toNumber } from '../lib/playerStats';

/**
 * The expanded fixture.
 *
 * This replaces two components that disagreed with each other: a green cartoon
 * pitch shown from xl up, and a plain two-column list below it. The pitch used
 * fixed 80x112 cards inside a 56.25% aspect box, so a five-man midfield needed
 * 560px of a 388px column and the parent clipped the overflow — which is what
 * "the players get cut off" was. It also doubled captain points a second time
 * on top of the multiplier the API already applies, and coloured cards from a
 * hardcoded hex map that had been stale for two seasons.
 *
 * What is here instead answers the question the pitch never did. A H2H fixture
 * is decided by differentials: shared players cancel out exactly, so the two
 * differential columns *are* the scoreline. See lib/h2h.js.
 */

const signed = (n) => `${n > 0 ? '+' : ''}${formatCount(n)}`;

/** A player in one of the two differential columns. */
const LedgerRow = ({ player }) => {
    const points = toNumber(player.points);
    const mark = captainMark(player.multiplier);

    return (
        <Link
            to={`/player/${player.id}`}
            className="flex items-center justify-between gap-2 bg-panel px-3 py-2.5 transition-colors hover:bg-muted"
        >
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-medium leading-none text-foreground">
                    {player.name}
                </span>
                <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.12em] text-muted-foreground">
                    {player.position} · {player.club}
                </span>
            </span>
            {mark && (
                <span className="shrink-0 bg-accent/15 px-1 py-[3px] text-[8px] font-medium leading-none tracking-[0.1em] text-accent-chip">
                    {mark}
                </span>
            )}
            <span
                className={`shrink-0 text-[15px] font-bold leading-none tracking-[-0.03em] ${
                    points === 0 ? 'text-muted-foreground' : 'text-foreground'
                }`}
            >
                {formatCount(points)}
            </span>
        </Link>
    );
};

/** One differential column, with the subtotal that column is worth. */
const DifferentialColumn = ({ label, players, subtotal, align = 'left' }) => (
    <div className="flex flex-col gap-px bg-border">
        <div className={`bg-panel px-3 py-2 ${align === 'right' ? 'text-right' : ''}`}>
            <span className="block truncate text-[7.5px] leading-none tracking-[0.14em] text-muted-foreground">
                {label}
            </span>
            <span className="mt-1.5 block text-[20px] font-bold leading-none tracking-[-0.04em] text-foreground">
                {formatCount(subtotal)}
            </span>
        </div>
        {players.length === 0 ? (
            <div className="bg-panel px-3 py-3 text-[8px] tracking-[0.12em] text-muted-foreground">
                NO DIFFERENTIALS
            </div>
        ) : (
            players.map((p) => <LedgerRow key={p.id} player={p} />)
        )}
    </div>
);

/** A player both managers started. Nets zero unless captaincy differs. */
const SharedRow = ({ player }) => {
    const split = captaincySplit(player);

    return (
        <Link
            to={`/player/${player.id}`}
            className="flex items-center gap-2 bg-panel px-3 py-2.5 transition-colors hover:bg-muted"
        >
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-medium leading-none text-foreground">
                    {player.name}
                </span>
                <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.12em] text-muted-foreground">
                    {player.position} · {player.club}
                </span>
            </span>

            <span className="flex shrink-0 items-center gap-2 text-[13px] font-bold leading-none tracking-[-0.03em]">
                <span className={split ? 'text-foreground' : 'text-muted-foreground'}>
                    {formatCount(player.homePoints)}
                </span>
                <span className="text-[8px] font-normal text-muted-foreground">/</span>
                <span className={split ? 'text-foreground' : 'text-muted-foreground'}>
                    {formatCount(player.awayPoints)}
                </span>
            </span>

            {/* Only a captaincy split earns a mark — everything else cancels. */}
            <span className="w-[42px] shrink-0 text-right">
                {split ? (
                    <span className="bg-accent/15 px-1 py-[3px] text-[8px] font-medium leading-none tracking-[0.1em] text-accent-chip">
                        {signed(player.net)}
                    </span>
                ) : (
                    <span className="text-[8px] text-muted-foreground">—</span>
                )}
            </span>
        </Link>
    );
};

/** Per-side context: the hit, the bench, the chip. All previously unused. */
const SideContext = ({ side, align = 'left' }) => {
    const right = align === 'right';
    return (
        <div className={`bg-panel px-3 py-3 ${right ? 'text-right' : ''}`}>
            <span className="block truncate text-[8px] leading-none tracking-[0.14em] text-muted-foreground">
                {side.managerName || side.teamName}
            </span>
            <span className="mt-2 block text-[26px] font-bold leading-none tracking-[-0.04em] text-foreground">
                {formatCount(side.points)}
            </span>

            <div className={`mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1 ${right ? 'justify-end' : ''}`}>
                <span className="text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                    {formatCount(side.transfers)} TR
                </span>
                {side.hit > 0 && (
                    <span className="text-[7.5px] leading-none tracking-[0.1em] text-destructive-ink">
                        −{formatCount(side.hit)} HIT
                    </span>
                )}
                <span className="text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                    {formatCount(side.benched)} BENCH
                </span>
            </div>

            {side.chip && (
                <span
                    className={`mt-2 inline-block bg-inverted px-1.5 py-1 text-[7.5px] font-medium leading-none tracking-[0.12em] text-background`}
                >
                    {side.chip}
                </span>
            )}
        </div>
    );
};

const MatchupLedger = ({ matchData }) => {
    const [showShared, setShowShared] = useState(false);
    const ledger = buildLedger(matchData);

    if (!ledger) return null;

    const { home, away, homeOnly, awayOnly, shared, totals } = ledger;

    return (
        <div className="pb-4">
            {/* Both sides' context, side by side, so the hit and the bench sit
                next to the score they explain. */}
            <div className="grid grid-cols-2 gap-px bg-border">
                <SideContext side={home} />
                <SideContext side={away} align="right" />
            </div>

            <SectionHeader label="Differentials">
                <span className="bg-accent/15 px-1.5 py-[3px] text-[8px] font-medium tracking-[0.1em] text-accent-chip">
                    {signed(totals.edge)} SWING
                </span>
            </SectionHeader>

            <div className="grid grid-cols-2 gap-px bg-border">
                <DifferentialColumn
                    label={home.teamName}
                    players={homeOnly}
                    subtotal={totals.homeOnlyPoints}
                />
                <DifferentialColumn
                    label={away.teamName}
                    players={awayOnly}
                    subtotal={totals.awayOnlyPoints}
                    align="right"
                />
            </div>

            <SectionHeader label={`Shared · ${shared.length}`}>
                <button
                    type="button"
                    onClick={() => setShowShared((v) => !v)}
                    className="min-h-[24px] px-1 text-[8px] font-medium tracking-[0.12em] text-primary-lighter"
                >
                    {showShared ? 'HIDE' : 'SHOW'}
                </button>
            </SectionHeader>

            {/* Shared players are noise by definition — they cancel — so the
                list is collapsed and the summary carries the meaning. */}
            {showShared ? (
                <div className="flex flex-col gap-px bg-border">
                    {shared.length === 0 ? (
                        <div className="bg-panel px-3 py-3 text-[8px] tracking-[0.12em] text-muted-foreground">
                            NO SHARED PLAYERS
                        </div>
                    ) : (
                        shared.map((p) => <SharedRow key={p.id} player={p} />)
                    )}
                </div>
            ) : (
                <div className="bg-panel px-3 py-3">
                    <p className="text-[9px] leading-[1.5] tracking-[0.08em] text-muted-foreground">
                        {shared.length} PLAYER{shared.length === 1 ? '' : 'S'} IN BOTH SIDES ·{' '}
                        {formatCount(totals.sharedCancelled)} PTS CANCELLED
                        {totals.sharedNet !== 0
                            ? ` · ${signed(totals.sharedNet)} FROM CAPTAINCY`
                            : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

export default MatchupLedger;
