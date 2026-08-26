import React from 'react';
import { toNumber } from '../lib/playerStats';

const DUTIES = [
    { order: 'penalties_order', text: 'penalties_text', label: 'Penalties' },
    { order: 'direct_freekicks_order', text: 'direct_freekicks_text', label: 'Direct free kicks' },
    { order: 'corners_and_indirect_freekicks_order', text: 'corners_and_indirect_freekicks_text', label: 'Corners & indirect' },
];

/**
 * Set-piece duties. Only about 15% of players have any recorded order, so when
 * there is nothing the panel is absent rather than an empty box.
 */
const PlayerSetPieces = ({ playerData }) => {
    if (!playerData) return null;

    const duties = DUTIES
        .map((d) => ({ ...d, value: toNumber(playerData[d.order], null) }))
        .filter((d) => d.value !== null && d.value > 0);

    if (duties.length === 0) return null;

    return (
        <div className="flex flex-col gap-px bg-border">
            {duties.map((d) => (
                <div key={d.order} className="flex items-center justify-between gap-3 bg-panel px-[14px] py-3">
                    <div className="min-w-0">
                        <div className="text-[9.5px] uppercase tracking-[0.12em] text-foreground">{d.label}</div>
                        {playerData[d.text] && (
                            <div className="mt-0.5 truncate text-[7.5px] tracking-[0.06em] text-muted-foreground">
                                {playerData[d.text]}
                            </div>
                        )}
                    </div>
                    <span className="shrink-0 bg-primary/15 px-1.5 py-1 text-[11px] font-bold text-primary">
                        #{d.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default PlayerSetPieces;
