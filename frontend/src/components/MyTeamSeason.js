import React from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { SectionHeader } from './PlayerStatCell';
import { formatTopPercent, seasonStanding, topPercent } from '../lib/myTeam';
import { formatCount, formatDecimal, toNumber } from '../lib/playerStats';

/**
 * The season so far.
 *
 * The old version led with an area chart of overall rank carrying a 📈 in its
 * heading and a sentence underneath restating the two numbers printed directly
 * above it. Rank is also the harder of the two series to read: it is inverted,
 * it spans eight million, and a single gameweek's rank movement is mostly a
 * function of what everyone else did.
 *
 * So points per gameweek leads — it is the number the manager earned, all 38
 * slots are drawn from GW1 so the chart has its final shape immediately (rule
 * 4), and it is the same object the player page uses for the same job. Rank
 * follows, as a trajectory that needs at least two gameweeks to be a line.
 */

const AXIS = { fontSize: 9, fill: 'hsl(var(--muted-foreground))' };

const RankTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
        <div className="border border-border bg-popover px-2.5 py-2">
            <p className="text-[8px] tracking-[0.12em] text-muted-foreground">GW{label}</p>
            <p className="mt-1 text-[13px] font-bold leading-none tracking-[-0.03em] text-foreground">
                {formatCount(payload[0]?.value)}
            </p>
        </div>
    );
};

/** Best / worst overall rank, with the gameweek it happened in. */
const RankExtreme = ({ label, rank, gameweek, totalPlayers }) => {
    const percent = topPercent(rank, totalPlayers);
    return (
        <div className="bg-panel px-3 pb-3 pt-[11px]">
            <p className="h-[22px] text-[8.5px] font-medium uppercase leading-[1.3] tracking-[0.13em] text-muted-foreground">
                {label}
            </p>
            <span className="mt-1.5 block text-[26px] font-bold leading-[0.9] tracking-[-0.04em] text-foreground md:text-[28px]">
                {rank ? formatCount(rank) : '—'}
            </span>
            <p className="mt-2 text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                {gameweek ? `GW${gameweek}` : 'NO GAMEWEEKS YET'}
                {percent !== null ? ` · ${formatTopPercent(percent)}` : ''}
            </p>
        </div>
    );
};

const PointsByGameweek = ({ ranks }) => {
    const played = new Map(ranks.map((r) => [r.gameweek, toNumber(r.points)]));
    const data = Array.from({ length: 38 }, (_, i) => ({
        gw: i + 1,
        points: played.get(i + 1) ?? 0,
        played: played.has(i + 1),
    }));
    const total = ranks.reduce((sum, r) => sum + toNumber(r.points), 0);

    return (
        <div className="bg-panel p-3">
            <div className="h-[112px] w-full md:h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                        <XAxis dataKey="gw" hide />
                        <Bar dataKey="points" isAnimationActive={false}>
                            {data.map((d) => (
                                <Cell
                                    key={d.gw}
                                    fill={d.played ? 'hsl(var(--live))' : 'hsl(var(--border))'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="mt-1.5 text-[9px] leading-[1.5] tracking-[0.06em] text-muted-foreground md:text-[10px]">
                {ranks.length > 0
                    ? `${formatDecimal(total / ranks.length, 1, '0.0')} PTS PER GAMEWEEK ACROSS ${
                          ranks.length
                      } GAMEWEEK${ranks.length === 1 ? '' : 'S'}`
                    : 'NO GAMEWEEKS PLAYED'}
            </p>
        </div>
    );
};

/** Overall rank across the season. Y is reversed — first place is the top. */
const RankTrajectory = ({ ranks }) => {
    if (ranks.length < 2) {
        return (
            <div className="bg-panel px-3 py-4">
                <p className="text-[8.5px] tracking-[0.12em] text-muted-foreground">
                    A TRAJECTORY NEEDS TWO GAMEWEEKS
                </p>
                <p className="mt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                    {ranks.length === 1
                        ? `ONE GAMEWEEK PLAYED · RANK ${formatCount(ranks[0].rank)}`
                        : 'NO GAMEWEEKS PLAYED'}
                </p>
            </div>
        );
    }

    return (
        <div className="bg-panel p-3">
            <div className="h-[180px] w-full md:h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={ranks.map((r) => ({ gameweek: r.gameweek, rank: r.rank }))}
                        margin={{ top: 6, right: 6, bottom: 0, left: 0 }}
                    >
                        <defs>
                            <linearGradient id="myTeamRank" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="gameweek"
                            tickFormatter={(gw) => `GW${gw}`}
                            tick={AXIS}
                            tickLine={false}
                            stroke="hsl(var(--border))"
                        />
                        <YAxis
                            reversed
                            width={46}
                            tick={AXIS}
                            tickLine={false}
                            stroke="hsl(var(--border))"
                            tickFormatter={(v) =>
                                v >= 1000000
                                    ? `${(v / 1000000).toFixed(1)}M`
                                    : v >= 1000
                                        ? `${Math.round(v / 1000)}K`
                                        : v
                            }
                        />
                        <Tooltip content={<RankTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
                        <Area
                            type="monotone"
                            dataKey="rank"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#myTeamRank)"
                            isAnimationActive={false}
                            dot={{ r: 2.5, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                            activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="mt-1.5 text-[9px] leading-[1.5] tracking-[0.06em] text-muted-foreground md:text-[10px]">
                LOWER IS BETTER · FIRST PLACE IS THE TOP OF THE AXIS
            </p>
        </div>
    );
};

/** One finished season. The API's tier hex and medal emoji are not used. */
const SeasonRow = ({ season }) => {
    const standing = seasonStanding(season);

    return (
        <div className="bg-panel px-3 py-3 md:px-4">
            <div className="flex items-center gap-2.5">
                <span className="w-[52px] shrink-0 text-[10px] font-medium leading-none text-foreground md:w-[64px] md:text-[12px]">
                    {season.season}
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block text-[7.5px] leading-none tracking-[0.12em] text-muted-foreground md:text-[9px]">
                        RANK
                    </span>
                    <span className="mt-1.5 block truncate text-[12px] font-bold leading-none tracking-[-0.03em] text-foreground md:text-[15px]">
                        {formatCount(season.rank)}
                    </span>
                </span>

                {standing.label && (
                    <span
                        className={`shrink-0 px-1 py-[3px] text-[8px] font-medium leading-none tracking-[0.1em] ${
                            standing.strong
                                ? 'bg-accent/15 text-accent-chip'
                                : 'text-muted-foreground'
                        }`}
                    >
                        {standing.label}
                    </span>
                )}

                <span className="w-[42px] shrink-0 text-right text-[15px] font-bold leading-none tracking-[-0.03em] text-foreground md:w-[54px] md:text-[19px]">
                    {formatCount(season.total_points)}
                </span>
            </div>

            {/* The track carries what the tier colour used to: how far up the
                field the season finished, on tokens that survive six themes. */}
            <div className="mt-2.5 h-[3px] w-full bg-border">
                <div className="h-full bg-primary" style={{ width: `${standing.fill}%` }} />
            </div>
        </div>
    );
};

const MyTeamSeason = ({ history, previousSeasons, totalPlayers, overallRank }) => {
    const ranks = history?.ranks || [];
    const seasons = previousSeasons?.seasons || [];
    const percent = topPercent(overallRank, totalPlayers);

    return (
        <div className="px-4 pb-10 md:px-7">
            <SectionHeader label="Points by gameweek" tone="live">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    38 GAMEWEEKS
                </span>
            </SectionHeader>
            <PointsByGameweek ranks={ranks} />

            <SectionHeader label="Overall rank">
                {percent !== null && (
                    <span className="bg-accent/15 px-1.5 py-[3px] text-[8px] font-medium tracking-[0.1em] text-accent-chip">
                        {formatTopPercent(percent)}
                    </span>
                )}
            </SectionHeader>

            <div className="grid grid-cols-2 gap-px bg-border">
                <RankExtreme
                    label="Best rank"
                    rank={history?.highest_rank}
                    gameweek={history?.highest_rank_gw}
                    totalPlayers={totalPlayers}
                />
                <RankExtreme
                    label="Worst rank"
                    rank={history?.lowest_rank}
                    gameweek={history?.lowest_rank_gw}
                    totalPlayers={totalPlayers}
                />
            </div>

            <div className="mt-px">
                <RankTrajectory ranks={ranks} />
            </div>

            <SectionHeader label="Previous seasons">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    {seasons.length || 'NONE'}
                </span>
            </SectionHeader>

            {seasons.length === 0 ? (
                <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                    NO COMPLETED SEASONS ON RECORD
                </div>
            ) : (
                <div className="flex flex-col gap-px bg-border">
                    {seasons.map((season) => (
                        <SeasonRow key={season.season} season={season} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyTeamSeason;
