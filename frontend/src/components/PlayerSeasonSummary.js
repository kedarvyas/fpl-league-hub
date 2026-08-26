import React from 'react';
import { formatCount, toNumber, getPositionShort } from '../lib/playerStats';

/**
 * Headline real-world output for the season, in the strip that stats sites put
 * directly under the player header — goals and assists before any FPL-specific
 * number, because that's what people check first.
 *
 * Which stats appear depends on position: a goalkeeper's season is saves and
 * clean sheets, a forward's is goals, and showing a striker's clean sheets
 * would be noise.
 */
const PlayerSeasonSummary = ({ playerData }) => {
    if (!playerData) return null;

    const type = playerData.element_type;
    const tiles = [];

    if (type === 1) {
        tiles.push(
            { label: 'Clean sheets', value: playerData.clean_sheets },
            { label: 'Saves', value: playerData.saves },
            { label: 'Goals conceded', value: playerData.goals_conceded },
        );
    } else {
        tiles.push(
            { label: 'Goals', value: playerData.goals_scored },
            { label: 'Assists', value: playerData.assists },
        );
        // Only positions that can actually earn clean sheet points show them.
        if (type === 2 || type === 3) {
            tiles.push({ label: 'Clean sheets', value: playerData.clean_sheets });
        }
    }

    tiles.push(
        { label: 'Starts', value: playerData.starts },
        { label: 'Minutes', value: playerData.minutes },
    );

    return (
        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-baseline justify-between gap-3 mb-3">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">Season</h2>
                <span className="text-xs text-muted-foreground">
                    Premier League 2026/27 · {getPositionShort(type)}
                </span>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
                {tiles.map((tile, i) => (
                    <div
                        key={tile.label}
                        className={`bg-muted/60 rounded-lg p-3 text-center ${
                            // An odd tile count leaves a hole in a 2-up grid; let the
                            // last one run full width instead of sitting next to a gap.
                            tiles.length % 2 === 1 && i === tiles.length - 1
                                ? 'col-span-2 sm:col-span-1'
                                : ''
                        }`}
                    >
                        <dd className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums leading-none">
                            {formatCount(toNumber(tile.value))}
                        </dd>
                        <dt className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 leading-tight">
                            {tile.label}
                        </dt>
                    </div>
                ))}
            </dl>
        </div>
    );
};

export default PlayerSeasonSummary;
