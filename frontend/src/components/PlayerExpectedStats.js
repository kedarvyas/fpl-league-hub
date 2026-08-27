import React from 'react';
import { toNumber, formatDecimal } from '../lib/playerStats';

/**
 * Expected vs actual.
 *
 * Two bars on a shared scale, actual above expected: the gap between them is
 * the over-performance, so luck versus quality reads without arithmetic. Both
 * bars are drawn even at 0.00 so a player with no expected data keeps the same
 * block height as one with a season behind him.
 */

const ROWS = {
    outfield: [
        { key: 'expected_goals', actual: 'goals_scored', label: 'GOAL', metric: 'xG' },
        { key: 'expected_assists', actual: 'assists', label: 'ASSIST', metric: 'xA' },
        { key: 'expected_goal_involvements', actual: 'goalInvolvements', label: 'INVOLVEMENT', metric: 'xGI' },
    ],
    defensive: [
        { key: 'expected_goals_conceded', actual: 'goals_conceded', label: 'CONCEDED', metric: 'xGC', lowerIsBetter: true },
    ],
};

const PlayerExpectedStats = ({ playerData }) => {
    if (!playerData) return null;

    const isBack = playerData.element_type === 1 || playerData.element_type === 2;
    const rows = isBack
        ? [...ROWS.defensive, ...ROWS.outfield.slice(0, 2)]
        : ROWS.outfield;

    const derived = {
        ...playerData,
        goalInvolvements: toNumber(playerData.goals_scored) + toNumber(playerData.assists),
    };

    // One scale across every row, so the bars are comparable down the block.
    const scale = Math.max(
        1,
        ...rows.flatMap((r) => [toNumber(derived[r.actual]), toNumber(playerData[r.key])]),
    );

    return (
        <div className="flex flex-col gap-px bg-border">
            {rows.map((row) => {
                const expected = toNumber(playerData[row.key]);
                const actual = toNumber(derived[row.actual]);
                const delta = row.lowerIsBetter ? expected - actual : actual - expected;
                const over = delta >= 0;

                return (
                    <div key={row.key} className="bg-panel px-[14px] py-3">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[8.5px] tracking-[0.14em] text-muted-foreground">
                                    {formatDecimal(expected, 2, '0.00')} EXPECTED
                                </div>
                                <div className="mt-1 flex items-baseline gap-1.5">
                                    <span className="text-[24px] font-bold leading-none tracking-[-0.04em] text-foreground">
                                        {formatDecimal(actual, actual % 1 === 0 ? 0 : 2, '0')}
                                    </span>
                                    <span className="text-[8.5px] tracking-[0.1em] text-muted-foreground">
                                        {row.label} ACTUAL
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-[13px] font-bold ${over ? 'text-live-ink' : 'text-destructive-ink'}`}>
                                    {over ? '+' : '−'}{formatDecimal(Math.abs(delta), 2, '0.00')}
                                </div>
                                <div className="text-[7.5px] tracking-[0.12em] text-muted-foreground">
                                    {over ? 'OVER' : 'UNDER'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-2.5 space-y-0.5">
                            <div className="h-1.5 w-full bg-border">
                                <div className="h-full bg-live transition-[width] duration-500 ease-out"
                                     style={{ width: `${Math.min(100, (actual / scale) * 100)}%` }} />
                            </div>
                            <div className="h-1.5 w-full bg-border">
                                <div className="h-full bg-accent transition-[width] duration-500 ease-out"
                                     style={{ width: `${Math.min(100, (expected / scale) * 100)}%` }} />
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="flex items-center gap-4 bg-panel px-[14px] py-2">
                <span className="flex items-center gap-1.5 text-[7.5px] tracking-[0.12em] text-muted-foreground">
                    <span className="h-1.5 w-2 bg-live" /> ACTUAL
                </span>
                <span className="flex items-center gap-1.5 text-[7.5px] tracking-[0.12em] text-muted-foreground">
                    <span className="h-1.5 w-2 bg-accent" /> EXPECTED
                </span>
            </div>
        </div>
    );
};

export default PlayerExpectedStats;
