import React from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './PlayerStatCell';
import { formatTopPercent, rankFill } from '../lib/myTeam';
import { formatCount } from '../lib/playerStats';

/**
 * Where this manager stands, in every league they are in.
 *
 * `team-data` has always carried `leagues.classic` and `leagues.h2h` — name,
 * rank, last week's rank, field size and percentile for each — and the page
 * has never rendered any of it. It is the best "so how am I doing" material on
 * the entry endpoint and it costs no extra request.
 *
 * The three groups are not cosmetic. FPL enrols everyone into Overall, the
 * current gameweek, their club and their country automatically; those are the
 * millions-wide leagues. The ones a manager joined on purpose are
 * `league_type: 'x'` and are the ones with bragging rights in them. Mixing
 * "1st of 9" into a list with "99,942nd of 8.9 million" makes both unreadable.
 */

/**
 * Rank movement since last gameweek. Muted by default — colour is earned.
 *
 * The fixed width matters: `entry_last_rank` is 0 until a second gameweek
 * exists, so in GW1 every row shows the no-movement dot, and inline it reads
 * as a stray bullet rather than as a column.
 */
const Move = ({ move }) => (
    <span className="inline-flex w-[7px] shrink-0 justify-center">
        {!move ? (
            <span aria-hidden="true" className="text-[7px] leading-none text-muted-foreground/50">
                ·
            </span>
        ) : (
            <span
                className={`text-[7px] leading-none ${
                    move > 0 ? 'text-live-ink' : 'text-muted-foreground'
                }`}
                title={`${move > 0 ? 'Up' : 'Down'} ${Math.abs(move)}`}
            >
                {move > 0 ? '▲' : '▼'}
            </span>
        )}
    </span>
);

const LeagueRow = ({ league, to }) => {
    const body = (
        <>
            <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-medium leading-none text-foreground md:text-[13px]">
                        {league.name}
                    </span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:text-[9px]">
                        <Move move={league.move} />
                        {league.count ? `OF ${formatCount(league.count)}` : 'HEAD-TO-HEAD'}
                        {league.percent !== null ? ` · ${formatTopPercent(league.percent)}` : ''}
                    </span>
                </span>

                <span
                    className={`shrink-0 text-[15px] font-bold leading-none tracking-[-0.03em] md:text-[19px] ${
                        league.rank ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                >
                    {league.rank ? formatCount(league.rank) : '—'}
                </span>
            </div>

            {/* Always drawn, even where there is no denominator, so the rows
                stay one object rather than two different-height ones. */}
            <span className="mt-2.5 block h-[3px] w-full bg-border">
                <span
                    className="block h-full bg-primary"
                    style={{ width: `${rankFill(league.percent)}%` }}
                />
            </span>
        </>
    );

    const className =
        'block min-h-[44px] bg-panel px-3 py-2.5 md:px-4 md:py-3 transition-colors hover:bg-muted';

    return to ? (
        <Link to={to} className={className}>
            {body}
        </Link>
    ) : (
        <div className={className}>{body}</div>
    );
};

const LeagueGroup = ({ label, note, leagues, linkTo, empty }) => (
    <>
        <SectionHeader label={label}>
            <span className="text-[7px] tracking-[0.1em] text-muted-foreground">{note}</span>
        </SectionHeader>
        {leagues.length === 0 ? (
            <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                {empty}
            </div>
        ) : (
            <div className="flex flex-col gap-px bg-border">
                {leagues.map((league) => (
                    <LeagueRow
                        key={league.id}
                        league={league}
                        to={linkTo ? linkTo(league) : null}
                    />
                ))}
            </div>
        )}
    </>
);

const MyTeamLeagues = ({ leagues }) => (
    <div className="px-4 pb-10 md:px-7">
        <LeagueGroup
            label="Head-to-head"
            note="THIS APP"
            leagues={leagues.h2h}
            linkTo={(league) => `/weekly-matchups/${league.id}`}
            empty="NOT IN ANY HEAD-TO-HEAD LEAGUES"
        />

        <LeagueGroup
            label="Mini-leagues"
            note="JOINED"
            leagues={leagues.invitational}
            empty="NOT IN ANY MINI-LEAGUES"
        />

        <LeagueGroup
            label="Global"
            note="AUTOMATIC"
            leagues={leagues.global}
            empty="NO GLOBAL LEAGUES"
        />
    </div>
);

export default MyTeamLeagues;
