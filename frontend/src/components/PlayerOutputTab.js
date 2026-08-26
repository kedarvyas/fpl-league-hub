import React from 'react';
import PlayerStatCell, { StatGrid, SectionHeader } from './PlayerStatCell';
import PlayerDefensiveContribution from './PlayerDefensiveContribution';
import PlayerExpectedStats from './PlayerExpectedStats';
import PlayerMatchLog from './PlayerMatchLog';
import PlayerSetPieces from './PlayerSetPieces';
import { percentileFor, rankFor, toNumber, DEFCON_THRESHOLDS } from '../lib/playerStats';

/**
 * What happened on a pitch. Real output leads; the FPL grid below it is
 * inverted so the two kinds of number never have to be told apart by a legend.
 */

/** Which four real-output cells a position gets. */
const REAL_CELLS = {
    1: [
        { key: 'clean_sheets', label: 'Clean sheets' },
        { key: 'saves', label: 'Saves' },
        { key: 'goals_conceded', label: 'Goals conceded', lowerIsBetter: true },
        { key: 'minutes', label: 'Minutes' },
    ],
    2: [
        { key: 'goals_scored', label: 'Goals' },
        { key: 'assists', label: 'Assists' },
        { key: 'clean_sheets', label: 'Clean sheets' },
        { key: 'minutes', label: 'Minutes' },
    ],
    3: [
        { key: 'goals_scored', label: 'Goals' },
        { key: 'assists', label: 'Assists' },
        { key: 'clean_sheets', label: 'Clean sheets' },
        { key: 'expected_goal_involvements_per_90', label: 'xGI / 90', decimals: 2 },
    ],
    4: [
        { key: 'goals_scored', label: 'Goals' },
        { key: 'assists', label: 'Assists' },
        { key: 'minutes', label: 'Minutes' },
        { key: 'expected_goal_involvements_per_90', label: 'xGI / 90', decimals: 2 },
    ],
};

const FPL_CELLS = [
    { key: 'total_points', label: 'Total pts' },
    { key: 'points_per_game', label: 'Pts / game', decimals: 1 },
    { key: 'bps', label: 'BPS' },
    { key: 'ep_next', label: 'EP next', decimals: 1 },
];

const PlayerOutputTab = ({ playerData, elements, history, teams }) => {
    const real = REAL_CELLS[playerData.element_type] || REAL_CELLS[4];
    const isKeeper = playerData.element_type === 1;
    // Only ~15% of players have a recorded order; the section is absent, not
    // empty, for everyone else.
    const hasSetPieces = [
        'penalties_order',
        'direct_freekicks_order',
        'corners_and_indirect_freekicks_order',
    ].some((k) => toNumber(playerData[k], 0) > 0);

    return (
        <div className="px-4 pb-10 md:px-7">
            <SectionHeader label="Real output" />
            <StatGrid>
                {real.map((c) => (
                    <PlayerStatCell
                        key={c.key}
                        label={c.label}
                        value={playerData[c.key]}
                        decimals={c.decimals || 0}
                        percentile={percentileFor(playerData, elements, c.key, {
                            lowerIsBetter: c.lowerIsBetter,
                        })}
                        rank={rankFor(playerData, elements, c.key, { lowerIsBetter: c.lowerIsBetter })}
                        variant="real"
                    />
                ))}
            </StatGrid>

            <SectionHeader label="FPL scoring" tone="live" />
            <StatGrid>
                {FPL_CELLS.map((c) => (
                    <PlayerStatCell
                        key={c.key}
                        label={c.label}
                        value={playerData[c.key]}
                        decimals={c.decimals || 0}
                        percentile={percentileFor(playerData, elements, c.key)}
                        rank={rankFor(playerData, elements, c.key)}
                        variant="fpl"
                    />
                ))}
            </StatGrid>

            <SectionHeader label="Defensive contribution">
                {!isKeeper && (
                    <span className="bg-primary/15 px-1 py-[3px] text-[8px] tracking-[0.1em] text-primary">
                        +2 PTS AT {DEFCON_THRESHOLDS[playerData.element_type]}
                    </span>
                )}
            </SectionHeader>
            <PlayerDefensiveContribution playerData={playerData} history={history} />

            <SectionHeader label="Expected" />
            <PlayerExpectedStats playerData={playerData} />

            {hasSetPieces && (
                <>
                    <SectionHeader label="Set pieces" />
                    <PlayerSetPieces playerData={playerData} />
                </>
            )}

            <SectionHeader label="Match log">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    {toNumber(history?.history?.length)} OF 38
                </span>
            </SectionHeader>
            <PlayerMatchLog history={history} teams={teams} />
        </div>
    );
};

export default PlayerOutputTab;
