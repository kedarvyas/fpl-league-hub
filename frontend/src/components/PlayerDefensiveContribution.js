import React from 'react';
import { toNumber, formatCount, DEFCON_THRESHOLDS, DEFCON_POINTS } from '../lib/playerStats';

/**
 * Defensive contribution — new for 2026/27.
 *
 * The threshold bar has one segment per action needed (DEF 10, MID/FWD 12), so
 * the distance to +2 points is a count of empty segments rather than a
 * percentage anyone has to interpret.
 *
 * Goalkeepers cannot earn the category at all, so they get a sentence instead
 * of an empty twelve-segment bar implying they are simply bad at it.
 */
const PlayerDefensiveContribution = ({ playerData, history }) => {
    if (!playerData) return null;

    const threshold = DEFCON_THRESHOLDS[playerData.element_type];

    if (!threshold) {
        return (
            <div className="bg-panel p-[14px]">
                <p className="text-[9.5px] leading-[1.5] tracking-[0.06em] text-muted-foreground">
                    GOALKEEPERS DO NOT EARN DEFENSIVE CONTRIBUTION POINTS.
                </p>
            </div>
        );
    }

    const total = toNumber(playerData.defensive_contribution);
    const filled = Math.min(total, threshold);

    // How many matches actually cleared the bar — the only figure that maps to
    // points earned, since the category scores per match and not per season.
    const games = history?.history || [];
    const cleared = games.filter((g) => toNumber(g.defensive_contribution) >= threshold).length;

    return (
        <div className="bg-panel p-[14px]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-baseline">
                    <span className="text-[34px] font-bold leading-none tracking-[-0.04em] text-foreground">
                        {String(total).padStart(2, '0')}
                    </span>
                    <span className="text-[20px] font-bold leading-none tracking-[-0.04em] text-muted-foreground">
                        /{threshold}
                    </span>
                </div>
                <div className="text-right text-[8.5px] leading-[1.4] tracking-[0.08em] text-muted-foreground">
                    {formatCount(playerData.tackles)} TCK · {formatCount(playerData.clearances_blocks_interceptions)} CBI
                    <br />
                    {formatCount(playerData.recoveries)} RECOV
                    {playerData.element_type === 2 && ' · NOT COUNTED'}
                </div>
            </div>

            <div className="mt-3 flex gap-0.5" aria-hidden="true">
                {Array.from({ length: threshold }, (_, i) => (
                    <span
                        key={i}
                        className={`h-2 flex-1 ${i < filled ? 'bg-live' : 'bg-border'}`}
                    />
                ))}
            </div>

            <p className="mt-2.5 text-[8px] tracking-[0.08em] text-muted-foreground">
                {cleared > 0
                    ? `CLEARED IN ${cleared} OF ${games.length} · ${cleared * DEFCON_POINTS} PTS EARNED`
                    : `THRESHOLD NOT YET MET · ${threshold - filled} MORE IN A MATCH`}
            </p>
        </div>
    );
};

export default PlayerDefensiveContribution;
