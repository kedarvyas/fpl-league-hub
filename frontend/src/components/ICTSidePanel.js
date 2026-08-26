import React from 'react';
import { toNumber, formatDecimal, percentileFor } from '../lib/playerStats';
import { rankToPercentile } from '../lib/playerVerdict';

/**
 * ICT. No longer a right rail — it is a panel in the Scoring tab, because ICT
 * is FPL's own invented index rather than anything that happened on a pitch.
 */
const METRICS = [
    { key: 'influence', rank: 'influence_rank_type', label: 'Influence' },
    { key: 'creativity', rank: 'creativity_rank_type', label: 'Creativity' },
    { key: 'threat', rank: 'threat_rank_type', label: 'Threat' },
];

const ICTSidePanel = ({ playerData, elements = [] }) => {
    if (!playerData) return null;

    const positionTotal = elements.filter(
        (e) => e.element_type === playerData.element_type,
    ).length;

    const rows = METRICS.map((m) => {
        const rank = toNumber(playerData[m.rank], null);
        return {
            ...m,
            value: toNumber(playerData[m.key]),
            rank,
            percentile: rank
                ? rankToPercentile(rank, positionTotal)
                : percentileFor(playerData, elements, m.key),
        };
    });

    // The reading is the highest-ranked of the three — derived, and kept
    // factual rather than editorial.
    const leader = rows.reduce(
        (best, r) => (r.percentile > best.percentile ? r : best),
        rows[0],
    );
    const hasAny = rows.some((r) => r.value > 0);

    return (
        <div className="bg-panel p-[14px]">
            <div className="flex flex-col gap-3">
                {rows.map((r) => (
                    <div key={r.key}>
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[9.5px] uppercase tracking-[0.12em] text-foreground">
                                {r.label}
                            </span>
                            <span className="text-[8px] tracking-[0.08em] text-muted-foreground">
                                {r.rank ? `${r.rank} OF ${positionTotal}` : '—'}
                            </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                            <span className="w-12 shrink-0 text-[19px] font-bold leading-none tracking-[-0.03em] text-foreground">
                                {formatDecimal(r.value, r.value >= 100 ? 0 : 1, '0.0')}
                            </span>
                            <span className="h-1 flex-1 bg-border">
                                <span
                                    className="block h-full bg-primary transition-[width] duration-500 ease-out"
                                    style={{ width: `${r.percentile}%` }}
                                />
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-3.5 text-[8px] tracking-[0.06em] text-muted-foreground">
                {hasAny
                    ? `${leader.label.toUpperCase()} IS CARRYING THE INDEX`
                    : 'NO ICT RECORDED YET THIS SEASON'}
            </p>
        </div>
    );
};

export default ICTSidePanel;
