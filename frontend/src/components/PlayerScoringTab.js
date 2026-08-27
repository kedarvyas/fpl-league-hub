import React from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import PlayerStatCell, { StatGrid, SectionHeader } from './PlayerStatCell';
import PlayerPriceProjection from './PlayerPriceProjection';
import ICTSidePanel from './ICTSidePanel';
import { buildPointsLedger } from '../lib/pointsLedger';
import { toNumber, formatCount, formatDecimal, percentileFor, rankFor } from '../lib/playerStats';

/** What the game invented, as opposed to what happened on a pitch. */

const TONE_BG = {
    live: 'bg-live',
    liveDark: 'bg-live/70',
    primary: 'bg-primary',
    neutral: 'bg-muted-foreground',
    neutralDark: 'bg-muted-foreground/50',
    negative: 'bg-destructive',
};

const SEASON_CELLS = [
    { key: 'total_points', label: 'Total pts' },
    { key: 'bonus', label: 'Bonus' },
    { key: 'bps', label: 'BPS' },
    { key: 'form', label: 'Form', decimals: 1 },
];

const PlayerScoringTab = ({ playerData, elements, history, live, currentEvent }) => {
    const ledger = live ? buildPointsLedger(live.explain, live.stats, playerData) : null;
    const games = history?.history || [];

    return (
        <div className="px-4 pb-10 md:px-7">
            <SectionHeader label={`How the ${live ? formatCount(live.stats?.total_points) : ''} were earned`.trim()}>
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">GW{currentEvent}</span>
            </SectionHeader>

            {ledger ? (
                <div className="bg-panel p-[14px]">
                    <div className="flex items-start justify-between gap-3">
                        <span className="text-[40px] font-bold leading-none tracking-[-0.05em] text-foreground">
                            {formatCount(ledger.total)}
                        </span>
                        {!ledger.reconciled && (
                            <span className="text-[7.5px] leading-[1.4] tracking-[0.08em] text-warn-ink">
                                PARTIALLY ITEMISED
                            </span>
                        )}
                    </div>

                    {/* Stacked proportion bar: one segment per scoring event,
                        width = its share of the positive total. */}
                    <div className="mt-3 flex h-2.5 gap-px">
                        {ledger.rows.filter((r) => r.points > 0).map((r) => (
                            <span
                                key={r.key}
                                className={TONE_BG[r.tone] || TONE_BG.neutral}
                                style={{ flex: r.points }}
                            />
                        ))}
                    </div>

                    <dl className="mt-3">
                        {ledger.rows.map((r) => (
                            <div key={r.key} className="flex items-center gap-2.5 border-b border-border py-2.5">
                                <span className={`h-2 w-2 shrink-0 ${TONE_BG[r.tone] || TONE_BG.neutral}`} />
                                <dt className="min-w-0 flex-1">
                                    <span className="block text-[9px] uppercase tracking-[0.1em] text-foreground">
                                        {r.label}
                                    </span>
                                    {r.sub && (
                                        <span className="block text-[7.5px] tracking-[0.06em] text-muted-foreground">
                                            {r.sub}
                                        </span>
                                    )}
                                </dt>
                                <dd className={`text-[17px] font-bold tabular-nums ${
                                    r.points === 0 ? 'text-muted-foreground' : 'text-foreground'
                                }`}>
                                    {r.points > 0 ? r.points : r.points === 0 ? '0' : r.points}
                                </dd>
                            </div>
                        ))}
                        <div className="flex items-center justify-between py-2.5">
                            <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Total</span>
                            <span className="text-[17px] font-bold text-live-ink">{formatCount(ledger.total)}</span>
                        </div>
                    </dl>
                </div>
            ) : (
                <div className="bg-panel p-[14px] text-[9px] tracking-[0.08em] text-muted-foreground">
                    NO SCORING DETAIL FOR THIS GAMEWEEK
                </div>
            )}

            <SectionHeader label="Season scoring" tone="live" />
            <StatGrid>
                {SEASON_CELLS.map((c) => (
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

            <SectionHeader label="Bonus race">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    {live?.bpsRank ? `${live.bpsRank} OF ${live.bpsPlayerCount} ON BPS` : ''}
                </span>
            </SectionHeader>
            {live?.bonusRace?.length ? (
                <div>
                    <div className="flex items-end gap-5 bg-panel px-[14px] py-3">
                        <div>
                            <div className="text-[30px] font-bold leading-none tracking-[-0.04em] text-foreground">
                                {formatCount(live.stats?.bps)}
                            </div>
                            <div className="mt-1 text-[7.5px] tracking-[0.12em] text-muted-foreground">BPS</div>
                        </div>
                        <div>
                            <div className="text-[30px] font-bold leading-none tracking-[-0.04em] text-primary">
                                {formatCount(live.stats?.bonus)}
                            </div>
                            <div className="mt-1 text-[7.5px] tracking-[0.12em] text-muted-foreground">BONUS WON</div>
                        </div>
                    </div>
                    <div className="mt-px flex gap-px bg-border">
                        {live.bonusRace.map((r, i) => (
                            <div
                                key={r.id}
                                className={`flex-1 px-2 py-2.5 ${
                                    r.isPlayer ? 'border border-primary bg-primary/[0.18]' : 'bg-panel'
                                }`}
                            >
                                <div className="text-[7.5px] tracking-[0.12em] text-muted-foreground">
                                    {i + 1}
                                    {['ST', 'ND', 'RD'][i] || 'TH'} · {r.bonus} PTS
                                </div>
                                <div className="mt-1.5 truncate text-[11px] font-medium text-foreground">{r.name}</div>
                                <div className="mt-0.5 text-[13px] font-bold text-foreground">{r.bps}</div>
                            </div>
                        ))}
                    </div>
                    <p className="pt-2 text-[8px] tracking-[0.06em] text-muted-foreground">
                        BONUS POINTS GO TO THE TOP THREE BPS IN EACH FIXTURE
                    </p>
                </div>
            ) : (
                <div className="bg-panel p-[14px] text-[9px] tracking-[0.08em] text-muted-foreground">
                    NO BONUS DATA FOR THIS FIXTURE
                </div>
            )}

            <SectionHeader label="ICT index" />
            <ICTSidePanel playerData={playerData} elements={elements} />

            <SectionHeader label="Price & transfers" />
            <PlayerPriceProjection playerData={playerData} />

            <SectionHeader label="Points by gameweek" />
            <PointsByGameweek games={games} />
        </div>
    );
};

/** All 38 slots are drawn from GW1, so the chart has its final shape from the
 *  first week rather than growing a new axis every gameweek. */
const PointsByGameweek = ({ games }) => {
    const played = new Map(games.map((g) => [g.round, toNumber(g.total_points)]));
    const data = Array.from({ length: 38 }, (_, i) => ({
        gw: i + 1,
        points: played.get(i + 1) ?? 0,
        played: played.has(i + 1),
    }));

    return (
        <div className="bg-panel p-3">
            <div className="h-[112px] w-full">
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
            <p className="mt-1.5 text-[9.5px] leading-[1.5] tracking-[0.06em] text-muted-foreground">
                {games.length > 0
                    ? `${formatDecimal(
                          games.reduce((a, g) => a + toNumber(g.total_points), 0) / games.length, 1, '0.0',
                      )} PTS PER GAMEWEEK SO FAR`
                    : 'NO GAMEWEEKS PLAYED'}
            </p>
        </div>
    );
};

export default PlayerScoringTab;
