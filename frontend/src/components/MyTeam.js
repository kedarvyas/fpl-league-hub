import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import MyTeamSquad from './MyTeamSquad';
import MyTeamSeason from './MyTeamSeason';
import MyTeamLeagues from './MyTeamLeagues';
import { useMyEntry } from '../hooks/useMyEntry';
import { API_URL, fetchWithRetry } from '../config/supabase';
import { buildSquad, groupLeagues } from '../lib/myTeam';
import { formatCount, toNumber } from '../lib/playerStats';

/**
 * The manager page, on the Scoreboard system.
 *
 * The old page was half a season-stats dashboard and half an empty tab reading
 * "coming soon". Given a job — *this manager's season* — it falls into three
 * questions, which are the three tabs: what did I pick, how has the season
 * gone, and where does that leave me. SQUAD leads, because a page called My
 * Team should open on the team.
 *
 * Three things changed underneath the restyle:
 *
 * 1. **The squad exists.** See MyTeamSquad — the `entry-picks` function has
 *    always been there.
 * 2. **Identity is its own key.** This page used to write `fpl_team_id` from
 *    `location.state.teamId`, and every manager name on the H2H and Dashboard
 *    pages navigates here with exactly that. See hooks/useMyEntry.
 * 3. **The team can be changed.** `setShowInput(false)` ran on a successful
 *    load and nothing set it back except the error path, so switching teams
 *    meant failing a request first.
 *
 * `wildcards_played` also went. The page rendered a "Wildcard chip in play"
 * badge gated on it and the `team-data` function has never set the field, so
 * the badge could not appear. The chip actually played comes from the picks
 * and is shown on the squad.
 */

const TABS = [
    { id: 'squad', label: 'SQUAD' },
    { id: 'season', label: 'SEASON' },
    { id: 'leagues', label: 'LEAGUES' },
];

/**
 * One of the three headline numbers under the masthead. Same object as the
 * Dashboard and H2H summary strips, on `--live-ink` — the lightness of `--live`
 * that carries `--background` text at 4.5:1 in every theme. Plain `--live` is
 * 3.23:1 in Light, which is fine for the 22px value and not for the labels.
 */
const SummaryCell = ({ label, value, note, solid }) => (
    <div className={`min-w-0 flex-1 px-2.5 py-[9px] ${solid ? 'bg-live-ink text-background' : 'bg-panel'}`}>
        <div
            className={`truncate text-[7.5px] tracking-[0.16em] ${
                solid ? '' : 'text-muted-foreground'
            }`}
        >
            {label}
        </div>
        <div
            className={`mt-1.5 text-[22px] font-bold leading-[0.9] tracking-[-0.04em] md:text-[26px] ${
                solid ? '' : value === null ? 'text-muted-foreground' : 'text-foreground'
            }`}
        >
            {value === null ? '—' : formatCount(value)}
        </div>
        {/* Always rendered. The rank cell had no badge at all in GW1, because
            `rank_change` is only computed once a previous gameweek exists — so
            the cell was a correct value above an empty space. */}
        <div
            className={`mt-1.5 truncate text-[7px] leading-none tracking-[0.1em] ${
                solid ? '' : 'text-muted-foreground'
            }`}
        >
            {note || ' '}
        </div>
    </div>
);

const controlClass =
    'flex min-h-[44px] items-center bg-panel px-3 text-[8.5px] font-medium tracking-[0.14em] transition-colors';

const MyTeam = () => {
    const location = useLocation();
    const [myEntry, setMyEntry] = useMyEntry();

    // The team being *viewed*. Browsing never writes this to storage.
    const [teamId, setTeamId] = useState(() => {
        const incoming = location.state?.teamId;
        return incoming ? String(incoming) : String(myEntry || '');
    });
    const [draftId, setDraftId] = useState('');
    const [showInput, setShowInput] = useState(() => !(location.state?.teamId || myEntry));
    const [tab, setTab] = useState('squad');

    const [teamData, setTeamData] = useState(null);
    const [bootstrap, setBootstrap] = useState(null);
    const [picks, setPicks] = useState(null);
    const [history, setHistory] = useState(null);
    const [previousSeasons, setPreviousSeasons] = useState(null);

    const [loading, setLoading] = useState(!!teamId);
    const [detailLoading, setDetailLoading] = useState(!!teamId);
    const [error, setError] = useState(null);

    // Set by the form, consumed by the loader once the id proves real.
    const claimOnLoad = useRef(false);

    // Arriving from a manager name on the H2H or Dashboard pages.
    const incomingId = location.state?.teamId;
    useEffect(() => {
        if (!incomingId) return;
        setTeamId((current) => (String(incomingId) === current ? current : String(incomingId)));
        setShowInput(false);
    }, [incomingId]);

    useEffect(() => {
        if (!teamId) return undefined;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setDetailLoading(true);
            setError(null);
            setPicks(null);
            setHistory(null);
            setPreviousSeasons(null);

            try {
                // Two waves rather than five parallel calls: the Edge Functions
                // proxy the FPL API, whose WAF answers a burst from one origin
                // with a flat 403 that looks exactly like an app bug.
                const [entryRes, bootstrapRes] = await Promise.all([
                    fetchWithRetry(`${API_URL}/team-data?teamId=${teamId}`),
                    fetchWithRetry(`${API_URL}/bootstrap-static`),
                ]);
                if (!entryRes.ok) throw new Error(`HTTP ${entryRes.status}`);

                const entry = await entryRes.json();
                const bootstrapData = bootstrapRes.ok ? await bootstrapRes.json() : null;
                if (cancelled) return;

                setTeamData(entry);
                setBootstrap(bootstrapData);
                setShowInput(false);
                setLoading(false);

                // Identity is claimed only once the id turns out to be real,
                // so a typo does not become "my team".
                if (claimOnLoad.current) {
                    claimOnLoad.current = false;
                    setMyEntry(String(teamId));
                }

                const event =
                    toNumber(entry.current_event, null) ??
                    bootstrapData?.events?.find((e) => e.is_current)?.id ??
                    null;

                const [picksRes, historyRes, seasonsRes] = await Promise.all([
                    event
                        ? fetchWithRetry(`${API_URL}/entry-picks/entry/${teamId}/event/${event}/picks`)
                        : Promise.resolve(null),
                    fetchWithRetry(`${API_URL}/team-history?teamId=${teamId}`),
                    fetchWithRetry(`${API_URL}/team-previous-seasons?teamId=${teamId}`),
                ]);
                if (cancelled) return;

                // Each of these degrades to an empty state on its own tab
                // rather than failing the page.
                if (picksRes?.ok) setPicks(await picksRes.json());
                if (historyRes.ok) setHistory(await historyRes.json());
                if (seasonsRes.ok) setPreviousSeasons(await seasonsRes.json());
            } catch (err) {
                if (cancelled) return;
                console.error('Error loading manager entry:', err);
                // A wrong id and a refused request are indistinguishable here:
                // the `team-data` function turns an upstream 404 into a 500.
                // Either way the answer is the same, so the message says what
                // the reader can do rather than quoting a status code.
                setError(`Could not load team ${teamId}`);
                claimOnLoad.current = false;
                // Clear rather than strand the reader on the previous team's
                // masthead with an error floating above it.
                setTeamData(null);
                setBootstrap(null);
                setLoading(false);
                setShowInput(true);
            } finally {
                if (!cancelled) setDetailLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
        // setMyEntry is a fresh closure each render and would restart the load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teamId]);

    const squad = useMemo(() => buildSquad(picks, bootstrap), [picks, bootstrap]);
    const leagues = useMemo(() => groupLeagues(teamData?.leagues), [teamData]);

    const submit = useCallback(
        (e) => {
            e.preventDefault();
            const next = draftId.trim();
            if (!next) return;
            // Typing an id is a deliberate act, so it claims identity — but
            // only if it loads. See the effect.
            claimOnLoad.current = true;
            setTeamId(next);
            setDraftId('');
        },
        [draftId],
    );

    // FPL's own Overall league is the denominator it ranks against, and it is
    // a little smaller than bootstrap's registered-player count. Using
    // bootstrap here made the SEASON tab quote a different percentage from the
    // Overall row on the LEAGUES tab, for the same rank.
    const rankedPlayers =
        toNumber(
            (teamData?.leagues?.classic || []).find((l) => l?.short_name === 'overall')?.rank_count,
            null,
        ) ?? toNumber(bootstrap?.total_players, null);

    const isMine = !!myEntry && String(myEntry) === String(teamId);
    const currentEvent = toNumber(teamData?.current_event, null);
    const eventFinished = bootstrap?.events?.find((e) => e.id === currentEvent)?.finished;
    const gwPoints = toNumber(teamData?.summary_event_points, null);
    const rankChange = toNumber(teamData?.rank_change, null);

    if (loading) return <MyTeamSkeleton />;

    return (
        <div className="mx-auto max-w-[1280px] font-mono">
            <div className="px-4 pt-4 md:px-7">
                {(showInput || !teamData) && (
                    <TeamIdForm
                        value={draftId}
                        onChange={setDraftId}
                        onSubmit={submit}
                        onCancel={teamData ? () => setShowInput(false) : null}
                    />
                )}

                {error && (
                    <div className="mb-4 border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
                        <p className="text-[9px] leading-[1.5] text-destructive-ink">
                            {error}. Check the ID and try again in a moment.
                        </p>
                    </div>
                )}

                {teamData && (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-inverted px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
                                TEAM {teamData.id}
                            </span>
                            <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
                                GW{currentEvent ?? '—'}
                                {eventFinished === false ? ' · LIVE' : ''}
                            </span>
                        </div>

                        <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
                            {teamData.name || `Team ${teamData.id}`}
                        </h1>

                        <div className="mt-2.5 flex flex-wrap gap-2.5 text-[10px] leading-none tracking-[0.06em]">
                            <span className="text-foreground">
                                {[teamData.player_first_name, teamData.player_last_name]
                                    .filter(Boolean)
                                    .join(' ')
                                    .toUpperCase() || 'UNKNOWN MANAGER'}
                            </span>
                            {toNumber(teamData.years_active) > 0 && (
                                <span className="text-muted-foreground">
                                    {formatCount(teamData.years_active)} SEASON
                                    {toNumber(teamData.years_active) === 1 ? '' : 'S'}
                                </span>
                            )}
                            {teamData.player_region_name && (
                                <span className="text-muted-foreground">
                                    {String(teamData.player_region_name).toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Switching teams used to require failing a request
                            first — nothing reopened the input on success. */}
                        <div className="mt-3 inline-flex gap-px bg-border">
                            {isMine ? (
                                <span className={`${controlClass} text-muted-foreground`}>
                                    YOUR TEAM
                                </span>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setMyEntry(String(teamId))}
                                    className={`${controlClass} text-primary-lighter hover:bg-muted`}
                                >
                                    THIS IS ME
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowInput((v) => !v)}
                                className={`${controlClass} text-muted-foreground hover:bg-muted hover:text-foreground`}
                            >
                                {showInput ? 'CLOSE' : 'CHANGE TEAM'}
                            </button>
                        </div>

                        <div className="mt-4 flex gap-px bg-border">
                            <SummaryCell
                                label={`GW${currentEvent ?? ''} POINTS`.trim()}
                                value={gwPoints}
                                solid={gwPoints !== null && gwPoints > 0}
                                note={
                                    !squad
                                        ? ''
                                        : squad.hit > 0
                                            ? `AFTER A −${formatCount(squad.hit)} HIT`
                                            : 'NO HIT TAKEN'
                                }
                            />
                            <SummaryCell
                                label="TOTAL POINTS"
                                value={toNumber(teamData.summary_overall_points, null)}
                                note={`${formatCount(
                                    (teamData.entered_events || []).length,
                                )} GAMEWEEK${
                                    (teamData.entered_events || []).length === 1 ? '' : 'S'
                                } PLAYED`}
                            />
                            <SummaryCell
                                label="OVERALL RANK"
                                value={toNumber(teamData.summary_overall_rank, null)}
                                note={
                                    rankChange === null
                                        ? 'FIRST GAMEWEEK'
                                        : rankChange === 0
                                            ? 'NO CHANGE'
                                            : `${rankChange > 0 ? '▲' : '▼'} ${formatCount(
                                                  Math.abs(rankChange),
                                              )} THIS WEEK`
                                }
                            />
                        </div>
                    </>
                )}
            </div>

            {teamData && (
                <>
                    <div className="mt-4 flex border-t border-border px-4 md:px-7">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                aria-pressed={tab === t.id}
                                className={`min-h-[44px] flex-1 border-b-2 py-[14px] text-center text-[9.5px] font-medium leading-none tracking-[0.14em] transition-colors md:text-[11.5px] ${
                                    tab === t.id
                                        ? 'border-live text-live-ink'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {detailLoading ? (
                        <TabSkeleton />
                    ) : tab === 'squad' ? (
                        <MyTeamSquad squad={squad} bootstrap={bootstrap} gameweek={currentEvent} />
                    ) : tab === 'season' ? (
                        <MyTeamSeason
                            history={history}
                            previousSeasons={previousSeasons}
                            totalPlayers={rankedPlayers}
                            overallRank={toNumber(teamData.summary_overall_rank, null)}
                        />
                    ) : (
                        <MyTeamLeagues leagues={leagues} />
                    )}
                </>
            )}
        </div>
    );
};

/** The only place a team id is entered. Always reachable from the masthead. */
const TeamIdForm = ({ value, onChange, onSubmit, onCancel }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2 pb-2.5">
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Team ID
            </span>
            <span className="h-px flex-1 bg-border" />
            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="min-h-[24px] px-1 text-[8px] font-medium tracking-[0.12em] text-muted-foreground hover:text-foreground"
                >
                    CANCEL
                </button>
            )}
        </div>

        <form onSubmit={onSubmit} className="flex gap-px bg-border md:max-w-[440px]">
            <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="e.g. 4656161"
                aria-label="FPL team ID"
                className="min-w-0 flex-1 bg-panel px-3 py-[14px] text-[13px] leading-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary"
            />
            <button
                type="submit"
                disabled={!value.trim()}
                className="min-h-[44px] shrink-0 bg-inverted px-4 text-[9px] font-medium tracking-[0.14em] text-background transition-opacity disabled:opacity-40"
            >
                LOAD
            </button>
        </form>

        <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
            YOUR ID IS IN THE FPL URL WHEN YOU VIEW YOUR OWN POINTS —
            FANTASY.PREMIERLEAGUE.COM/ENTRY/<span className="text-foreground">4656161</span>/EVENT/1
        </p>
    </div>
);

/** Skeletons mirror the geometry so nothing reflows when data lands. */
const MyTeamSkeleton = () => (
    <div className="mx-auto max-w-[1280px] animate-pulse font-mono">
        <div className="px-4 pt-4 md:px-7">
            <div className="h-[25px] w-2/3 bg-panel md:h-[46px]" />
            <div className="mt-3 h-[44px] w-[220px] bg-panel" />
            <div className="mt-4 flex gap-px bg-border">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[72px] flex-1 bg-panel" />
                ))}
            </div>
        </div>
        <div className="mt-4 h-[44px] border-y border-border" />
        <TabSkeleton />
    </div>
);

const TabSkeleton = () => (
    <div className="animate-pulse px-4 pt-6 md:px-7">
        <div className="flex flex-col gap-px bg-border">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[44px] bg-panel" />
            ))}
        </div>
    </div>
);

export default MyTeam;
