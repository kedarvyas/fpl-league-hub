import React, { useState } from 'react';
import { BarChart3, Star } from 'lucide-react';
import {
    getStatGroups,
    getPositionName,
    formatCount,
    formatDecimal,
    toNumber
} from '../lib/playerStats';

/**
 * Season stats grouped by what they actually measure — Attacking, Defending,
 * Discipline, then FPL scoring — with a Total / Per 90 toggle across the whole
 * block. Real match output leads; FPL's own scoring artefacts come last.
 */
const PlayerSeasonStats = ({ playerData }) => {
    const [per90, setPer90] = useState(false);

    if (!playerData) return null;

    const groups = getStatGroups(playerData);
    const minutes = toNumber(playerData.minutes);
    const dreamteamCount = toNumber(playerData.dreamteam_count);
    const inDreamteam = playerData.in_dreamteam === true;

    // Per 90 is meaningless with no minutes on the board, so don't offer it.
    const canPer90 = minutes > 0;

    const renderValue = (s) => {
        if (per90 && s.per90able) return formatDecimal(s.per90, 2, '—');
        return Number.isInteger(s.total) ? formatCount(s.total) : formatDecimal(s.total, 2, '—');
    };

    return (
        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">Season Stats</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {getPositionName(playerData.element_type)} · {formatCount(minutes)} mins played
                        </p>
                    </div>
                </div>
                {(inDreamteam || dreamteamCount > 0) && (
                    <span className="flex items-center space-x-1 flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        <Star className="w-3.5 h-3.5" />
                        <span>{inDreamteam ? 'In dreamteam' : `${formatCount(dreamteamCount)}× dreamteam`}</span>
                    </span>
                )}
            </div>

            {canPer90 && (
                <div className="inline-flex rounded-lg bg-muted p-0.5 mb-4" role="group" aria-label="Stat basis">
                    {[
                        { id: 'total', label: 'Total', active: !per90 },
                        { id: 'per90', label: 'Per 90', active: per90 },
                    ].map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPer90(opt.id === 'per90')}
                            aria-pressed={opt.active}
                            className={`min-h-[36px] px-4 rounded-md text-sm font-medium transition-colors ${
                                opt.active
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="space-y-5">
                {groups.map((group) => (
                    <section key={group.key}>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {group.label}
                        </h3>
                        <dl className="divide-y divide-border">
                            {group.stats.map((s) => (
                                <div key={s.key} className="flex items-baseline justify-between gap-3 py-2">
                                    <dt className="text-sm text-foreground min-w-0">
                                        {s.label}
                                        {s.sub && (
                                            <span className="block text-[11px] text-muted-foreground leading-tight">
                                                {s.sub}
                                            </span>
                                        )}
                                    </dt>
                                    <dd
                                        className={`text-base font-semibold tabular-nums flex-shrink-0 ${
                                            s.neutral ? 'text-foreground' : 'text-purple-600'
                                        }`}
                                    >
                                        {renderValue(s)}
                                        {per90 && !s.per90able && (
                                            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                                total
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default PlayerSeasonStats;
