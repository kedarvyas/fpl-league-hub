import React from 'react';
import { Link } from 'react-router-dom';
import PlayerPhoto from './PlayerPhoto';
import { SectionHeader } from './PlayerStatCell';
import { chipName } from '../lib/h2h';
import { describeSubs, formatMoney } from '../lib/myTeam';
import { formatCount, formatDecimal, toNumber } from '../lib/playerStats';

/**
 * The squad, for the gameweek in play.
 *
 * This is what the page was missing. `MyTeam` has always had a second tab
 * reading "Team lineup and picks will be displayed here (coming soon)", which
 * is a strange thing for a page called My Team to say, and the endpoint it
 * needed has existed the whole time.
 *
 * It is a list rather than a pitch, for the reason the H2H page stopped
 * drawing one: a pitch spends its whole width on eleven pieces of decoration
 * and then has nowhere left to put the numbers. A hairline list puts every
 * player's return on the same right edge, where they can be compared by
 * running an eye down the column.
 *
 * Only the current gameweek is shown. Per-player points come from
 * `bootstrap-static`'s `event_points`, which is the live gameweek only — a
 * gameweek stepper here would silently paint this week's scores onto last
 * week's squad.
 */

/** Left rail on every row, so positions group visually without headers. */
const PositionMark = ({ position }) => (
    <span className="w-[26px] shrink-0 text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:w-[30px] md:text-[9px]">
        {position}
    </span>
);

const SquadRow = ({ player, dimmed }) => {
    const points = dimmed ? player.rawPoints : player.points;

    return (
        <Link
            to={`/player/${player.id}`}
            className="flex min-h-[44px] items-center gap-2.5 bg-panel px-3 py-2.5 transition-colors hover:bg-muted md:gap-3 md:px-4 md:py-3"
        >
            <PositionMark position={player.position} />

            <PlayerPhoto
                code={player.code}
                name={player.name}
                size="sm"
                className="h-[30px] w-[24px] shrink-0 border border-border bg-background text-[10px] md:h-[38px] md:w-[30px] md:text-[12px]"
            />

            <span className="min-w-0 flex-1">
                <span
                    className={`block truncate text-[10px] font-medium leading-none md:text-[13px] ${
                        dimmed ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                >
                    {player.name}
                </span>
                <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:mt-1.5 md:text-[9px]">
                    {player.club} · £{formatDecimal(player.price / 10, 1, '0.0')}M
                </span>
            </span>

            {player.mark && (
                <span className="shrink-0 bg-accent/15 px-1 py-[3px] text-[8px] font-medium leading-none tracking-[0.1em] text-accent-chip">
                    {player.mark}
                </span>
            )}

            {/* Rule 4 — a blank gameweek keeps the same geometry as a haul and
                drops to muted, so the column is read by ink, not by presence. */}
            <span
                className={`w-[30px] shrink-0 text-right text-[15px] font-bold leading-none tracking-[-0.03em] md:w-[40px] md:text-[19px] ${
                    points === 0 || dimmed ? 'text-muted-foreground' : 'text-foreground'
                }`}
            >
                {formatCount(points)}
            </span>
        </Link>
    );
};

/** One figure of gameweek context. Same 22px label band as the stat grid. */
const ContextCell = ({ label, value, tone = 'default' }) => (
    <div className="bg-panel px-3 pb-3 pt-[11px]">
        <p className="h-[22px] text-[8.5px] font-medium uppercase leading-[1.3] tracking-[0.13em] text-muted-foreground">
            {label}
        </p>
        <span
            className={`mt-1.5 block text-[20px] font-bold leading-[0.9] tracking-[-0.04em] md:text-[22px] ${
                tone === 'negative'
                    ? 'text-destructive-ink'
                    : tone === 'zero'
                        ? 'text-muted-foreground'
                        : 'text-foreground'
            }`}
        >
            {value}
        </span>
    </div>
);

/**
 * The way into the transfer planner.
 *
 * Only when the team on screen is the reader's own. This page is a viewer for
 * *any* manager — clicking a name on the H2H or Dashboard pages lands here
 * with someone else's entry — and planning transfers for a squad you do not
 * own is meaningless, so the control follows `isMine` rather than appearing
 * for everyone. `--inverted` because it is the one action on a tab of
 * readouts, and rule 3's value inversion says that without spending a colour.
 */
const PlanLink = ({ gameweek }) => (
    <Link
        to="/my-team/plan"
        className="mt-4 flex min-h-[44px] items-center justify-between gap-3 bg-inverted px-3 transition-opacity hover:opacity-90 md:px-4"
    >
        <span className="min-w-0">
            <span className="block text-[9px] font-medium leading-none tracking-[0.16em] text-background">
                PLAN TRANSFERS{gameweek ? ` FOR GW${gameweek + 1}` : ''}
            </span>
            <span className="mt-1.5 block truncate text-[7.5px] leading-none tracking-[0.1em] text-background/70">
                BUDGET, FREE TRANSFERS AND THE HIT, WORKED OUT AS YOU GO
            </span>
        </span>
        <span className="shrink-0 text-[11px] leading-none text-background">→</span>
    </Link>
);

const MyTeamSquad = ({ squad, bootstrap, gameweek, isMine = false }) => {
    if (!squad) {
        return (
            <div className="px-4 pb-10 md:px-7">
                <SectionHeader label="Squad" />
                <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                    NO SQUAD FOR GW{gameweek ?? '—'} YET
                </div>
                <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                    PICKS BECOME PUBLIC AFTER THE GAMEWEEK DEADLINE.
                </p>
                {isMine && <PlanLink gameweek={gameweek} />}
            </div>
        );
    }

    const chip = chipName(squad.chip);
    const subs = describeSubs(squad.subs, bootstrap);
    // Bench Boost gives every bench pick a multiplier, so the bench genuinely
    // counted that week and must not be greyed out like a normal bench.
    const benchDimmed = !squad.benchCounted;

    return (
        <div className="px-4 pb-10 md:px-7">
            {isMine && <PlanLink gameweek={gameweek} />}

            <SectionHeader label={`Starting XI · ${squad.formation}`} >
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    {formatCount(squad.xiPoints)} PTS
                </span>
            </SectionHeader>

            {chip && (
                <div className="mb-px bg-inverted px-3 py-2.5">
                    <span className="text-[8px] font-medium leading-none tracking-[0.16em] text-background">
                        {chip} PLAYED
                    </span>
                </div>
            )}

            <div className="flex flex-col gap-px bg-border">
                {squad.starters.map((p) => (
                    <SquadRow key={p.id} player={p} />
                ))}
            </div>

            <SectionHeader label="Bench">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    {benchDimmed
                        ? `${formatCount(squad.officialBench)} PTS LEFT`
                        : `${formatCount(squad.benchPoints)} PTS COUNTED`}
                </span>
            </SectionHeader>

            <div className="flex flex-col gap-px bg-border">
                {squad.bench.map((p) => (
                    <SquadRow key={p.id} player={p} dimmed={benchDimmed} />
                ))}
            </div>

            <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                BENCH IS IN SUBSTITUTION ORDER
            </p>

            {subs.length > 0 && (
                <>
                    <SectionHeader label="Automatic substitutions" />
                    <div className="flex flex-col gap-px bg-border">
                        {subs.map((sub) => (
                            <div
                                key={sub.key}
                                className="flex items-center gap-2 bg-panel px-3 py-2.5 text-[9px] leading-none md:text-[11px]"
                            >
                                <span className="font-medium text-foreground">{sub.in}</span>
                                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                                    CAME ON FOR
                                </span>
                                <span className="truncate text-muted-foreground">{sub.out}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <SectionHeader label={`Gameweek ${gameweek ?? ''}`.trim()} />
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3 lg:grid-cols-6">
                <ContextCell
                    label="XI points"
                    value={formatCount(squad.xiPoints)}
                    tone={squad.xiPoints === 0 ? 'zero' : 'default'}
                />
                <ContextCell
                    label={benchDimmed ? 'On bench' : 'Bench boosted'}
                    value={formatCount(benchDimmed ? squad.officialBench : squad.benchPoints)}
                    tone={
                        (benchDimmed ? squad.officialBench : squad.benchPoints) === 0
                            ? 'zero'
                            : 'default'
                    }
                />
                <ContextCell
                    label="Transfers"
                    value={formatCount(squad.transfers)}
                    tone={squad.transfers === 0 ? 'zero' : 'default'}
                />
                <ContextCell
                    label="Points hit"
                    value={squad.hit > 0 ? `−${formatCount(squad.hit)}` : '0'}
                    tone={squad.hit > 0 ? 'negative' : 'zero'}
                />
                <ContextCell label="Squad value" value={formatMoney(squad.value)} />
                <ContextCell
                    label="In the bank"
                    value={formatMoney(squad.bank)}
                    tone={toNumber(squad.bank) === 0 ? 'zero' : 'default'}
                />
            </div>
        </div>
    );
};

export default MyTeamSquad;
