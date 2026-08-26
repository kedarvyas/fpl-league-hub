import React from 'react';
import { toNumber, formatCount } from '../lib/playerStats';

/**
 * Per-gameweek log. The season is one gameweek old, so the block says how many
 * remain rather than looking like a table that failed to load.
 */
const PlayerMatchLog = ({ history, teams }) => {
    const games = history?.history || [];

    if (games.length === 0) {
        return (
            <div className="bg-panel p-[14px] text-center text-[9px] tracking-[0.08em] text-muted-foreground">
                NO GAMEWEEKS PLAYED YET
            </div>
        );
    }

    const opponentName = (id) => teams?.[id]?.short_name || `T${id}`;

    return (
        <div>
            <div className="flex gap-2 px-2 pb-1.5 text-[7.5px] tracking-[0.1em] text-muted-foreground">
                <span className="flex-[2.4]">OPP</span>
                <span className="flex-1 text-right">MIN</span>
                <span className="flex-1 text-right">G</span>
                <span className="flex-1 text-right">A</span>
                <span className="hidden flex-1 text-right min-[360px]:block">BPS</span>
                <span className="flex-1 text-right">PTS</span>
            </div>

            <div className="flex flex-col gap-px bg-border">
                {games.map((g) => {
                    const scored = toNumber(g.team_h_score);
                    const conceded = toNumber(g.team_a_score);
                    const home = g.was_home;
                    const mine = home ? scored : conceded;
                    const theirs = home ? conceded : scored;
                    const result = mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';

                    return (
                        <div key={g.round} className="flex items-center gap-2 bg-panel px-2 py-2.5 text-[11px] font-medium">
                            <span className="flex-[2.4] whitespace-nowrap text-foreground">
                                {opponentName(g.opponent_team)} {home ? '(H)' : '(A)'}{' '}
                                <span className={result === 'W' ? 'text-live' : 'text-muted-foreground'}>
                                    {mine}–{theirs} {result}
                                </span>
                            </span>
                            <span className="flex-1 text-right text-muted-foreground">{formatCount(g.minutes)}</span>
                            <span className="flex-1 text-right text-foreground">{formatCount(g.goals_scored)}</span>
                            <span className="flex-1 text-right text-foreground">{formatCount(g.assists)}</span>
                            <span className="hidden flex-1 text-right text-muted-foreground min-[360px]:block">
                                {formatCount(g.bps)}
                            </span>
                            <span className="flex-1 text-right font-bold text-live">{formatCount(g.total_points)}</span>
                        </div>
                    );
                })}
            </div>

            <p className="pt-2.5 text-center text-[9px] tracking-[0.08em] text-muted-foreground">
                {38 - games.length} GAMEWEEKS REMAIN
            </p>
        </div>
    );
};

export default PlayerMatchLog;
