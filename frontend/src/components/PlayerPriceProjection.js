import React from 'react';
import { toNumber, formatDecimal, formatCount } from '../lib/playerStats';

/**
 * Dynamic pricing, new for 2026/27.
 *
 * `price_change_percent` is progress toward the next change, where 100% is the
 * threshold — not a price and not a probability, so it is labelled as progress
 * and never rendered as an amount.
 */
const PlayerPriceProjection = ({ playerData }) => {
    if (!playerData) return null;

    const cost = toNumber(playerData.now_cost) / 10;
    const percent = toNumber(playerData.price_change_percent);
    const rising = percent >= 0;
    const nextPrice = cost + (rising ? 0.1 : -0.1);

    const projections = Array.isArray(playerData.price_change_projections)
        ? playerData.price_change_projections.slice(0, 3)
        : [];

    return (
        <div className="bg-panel p-[14px]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <span className={`text-[26px] font-bold leading-none tracking-[-0.04em] ${
                        rising ? 'text-live' : 'text-destructive'
                    }`}>
                        {formatDecimal(Math.abs(percent), 1, '0.0')}%
                    </span>
                    <div className="mt-1.5 text-[8px] tracking-[0.12em] text-muted-foreground">
                        TO {rising ? 'RISE' : 'FALL'} · £{cost.toFixed(1)}M → £{nextPrice.toFixed(1)}M
                    </div>
                </div>
                <div className="text-right text-[8.5px] leading-[1.6] tracking-[0.06em]">
                    <span className="text-live">+{formatCount(playerData.transfers_in_event)}</span>
                    <br />
                    <span className="text-destructive">−{formatCount(playerData.transfers_out_event)}</span>
                </div>
            </div>

            <div className="mt-3 h-1 w-full bg-border">
                <div
                    className={`h-full transition-[width] duration-500 ease-out ${rising ? 'bg-live' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(100, Math.abs(percent))}%` }}
                />
            </div>

            {projections.length > 0 && (
                <div className="mt-3 flex gap-px bg-border">
                    {projections.map((p, i) => (
                        <div key={i} className="flex-1 bg-panel px-2 py-2 text-center">
                            <div className="text-[7px] tracking-[0.1em] text-muted-foreground">
                                {i === 0 ? 'TONIGHT' : `+${i} DAY${i > 1 ? 'S' : ''}`}
                            </div>
                            <div className="mt-1 text-[10px] font-medium text-foreground">
                                {formatDecimal(Math.abs(toNumber(p.projected_percent)), 0, '0')}%
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlayerPriceProjection;
