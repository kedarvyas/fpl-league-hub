import React, { useState } from 'react';
import { toNumber } from '../lib/playerStats';
import { rankMove } from '../lib/h2h';

/**
 * The standings board.
 *
 * The old table showed Rank / Team / Pts and nothing else, while the endpoint
 * has always returned matches won, drawn and lost, points-for, and last week's
 * rank. In a H2H league the W-D-L record *is* the table — league points are
 * just three times it — so showing only the total was showing the shadow of the
 * data instead of the data.
 *
 * Sorting came out. react-table was carrying a three-column sort in which rank
 * and points produce the same ordering and team name produces a useless one.
 */

const MOBILE_PREVIEW_ROWS = 8;

/** Rank movement since last gameweek. Muted by default — colour is earned. */
const Move = ({ move }) => {
    if (move === 0) {
        return <span className="text-[7px] leading-none text-muted-foreground/50">·</span>;
    }
    return (
        <span
            className={`text-[7px] leading-none ${move > 0 ? 'text-live' : 'text-muted-foreground'}`}
            title={`${move > 0 ? 'Up' : 'Down'} ${Math.abs(move)}`}
        >
            {move > 0 ? '▲' : '▼'}
        </span>
    );
};

const StandingsRow = ({ row, index, isMe, onManagerClick }) => (
    <button
        type="button"
        onClick={() => onManagerClick(row.entry)}
        className={`flex w-full min-h-[38px] items-center gap-2 border-l-2 px-2.5 py-2 text-left transition-colors hover:bg-muted ${
            isMe ? 'border-primary bg-muted' : 'border-transparent bg-panel'
        }`}
    >
        <span className="w-[18px] shrink-0 text-right text-[9px] leading-none text-muted-foreground">
            {toNumber(row.rank, index + 1)}
        </span>
        <span className="w-[8px] shrink-0">
            <Move move={rankMove(row)} />
        </span>

        <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-medium leading-none text-foreground">
                {row.entry_name}
            </span>
            <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                {row.player_name}
            </span>
        </span>

        <span
            className="shrink-0 text-[8px] leading-none tracking-[0.08em] text-muted-foreground"
            title={`${toNumber(row.matches_won)}W ${toNumber(row.matches_drawn)}D ${toNumber(row.matches_lost)}L · ${toNumber(row.points_for)} points for`}
        >
            {toNumber(row.matches_won)}-{toNumber(row.matches_drawn)}-{toNumber(row.matches_lost)}
        </span>

        <span className="w-[22px] shrink-0 text-right text-[13px] font-bold leading-none tracking-[-0.03em] text-foreground">
            {toNumber(row.total)}
        </span>
    </button>
);

const LeagueTable = ({ standings, myEntry, onManagerClick }) => {
    const [showAll, setShowAll] = useState(false);
    const rows = standings || [];

    if (!rows.length) {
        return (
            <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                NO STANDINGS YET
            </div>
        );
    }

    const hidden = Math.max(0, rows.length - MOBILE_PREVIEW_ROWS);
    const visible = showAll ? rows : rows.slice(0, MOBILE_PREVIEW_ROWS);

    return (
        <div>
            <div className="flex items-center gap-2 bg-panel px-2.5 py-2">
                <span className="w-[18px] shrink-0 text-right text-[7px] tracking-[0.12em] text-muted-foreground">
                    #
                </span>
                <span className="w-[8px] shrink-0" />
                <span className="min-w-0 flex-1 text-[7px] tracking-[0.12em] text-muted-foreground">
                    TEAM
                </span>
                <span className="shrink-0 text-[7px] tracking-[0.12em] text-muted-foreground">
                    W-D-L
                </span>
                <span className="w-[22px] shrink-0 text-right text-[7px] tracking-[0.12em] text-muted-foreground">
                    PTS
                </span>
            </div>

            <div className="flex flex-col gap-px bg-border">
                {visible.map((row, index) => (
                    <StandingsRow
                        key={row.entry ?? index}
                        row={row}
                        index={index}
                        isMe={!!myEntry && String(row.entry) === String(myEntry)}
                        onManagerClick={onManagerClick}
                    />
                ))}
            </div>

            {hidden > 0 && (
                <button
                    type="button"
                    onClick={() => setShowAll((v) => !v)}
                    className="mt-px min-h-[38px] w-full bg-panel text-[8px] font-medium tracking-[0.14em] text-primary-lighter transition-colors hover:bg-muted"
                >
                    {showAll ? 'SHOW FEWER' : `SHOW ALL ${rows.length} TEAMS`}
                </button>
            )}
        </div>
    );
};

export default LeagueTable;
