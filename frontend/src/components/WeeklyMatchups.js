import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LeagueTable from './LeagueTable';
import GameweekStats from './GameweekStats';
import MatchupLedger from './MatchupLedger';
import { SectionHeader } from './PlayerStatCell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useMyEntry } from '../hooks/useMyEntry';
import { API_URL, apiHeaders } from '../config/supabase';
import { formatCount, toNumber } from '../lib/playerStats';
import { homeShare, summariseGameweek } from '../lib/h2h';

/**
 * The H2H league page, on the Scoreboard system.
 *
 * The old page was three columns of equally-weighted rounded cards — nine card
 * headers, four superlative lists ranking the same 22 managers by one of two
 * numbers, and the reader's own fixture sitting anonymously among eleven
 * identical rows. Nothing was primary.
 *
 * The order here follows the order the questions actually get asked in: am I
 * winning, why, and where does that leave me. So the reader's own fixture is
 * lifted out and named, the expanded fixture explains the scoreline instead of
 * drawing a pitch, and the standings carry the W-D-L record that a H2H table is
 * actually made of.
 */

/** Collapsed fixture. The split bar is the "who's ahead" read at a glance. */
const FixtureRow = ({ matchup, isExpanded, onToggle, eventId, leagueId, myEntry }) => {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isExpanded || detail || !leagueId) return;

        setLoading(true);
        setError(null);
        fetch(`${API_URL}/matchup/${matchup.id}?event=${eventId}&leagueId=${leagueId}`, {
            headers: apiHeaders(),
        })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => setDetail(data))
            .catch((err) => {
                console.error('Error fetching matchup details:', err);
                setError('Could not load this fixture');
            })
            .finally(() => setLoading(false));
    }, [isExpanded, matchup.id, eventId, leagueId, detail]);

    const home = toNumber(matchup.entry_1_points);
    const away = toNumber(matchup.entry_2_points);
    const share = homeShare(matchup);
    const played = home > 0 || away > 0;

    const isMine =
        !!myEntry &&
        (String(matchup.entry_1_entry) === String(myEntry) ||
            String(matchup.entry_2_entry) === String(myEntry));

    const scoreTone = (mine, other) =>
        !played || mine === other
            ? 'text-muted-foreground'
            : mine > other
                ? 'text-foreground'
                : 'text-muted-foreground';

    return (
        <div className={`bg-panel ${isMine ? 'border-l-2 border-primary' : ''}`}>
            <button
                type="button"
                aria-expanded={isExpanded}
                onClick={onToggle}
                className="w-full px-3 pb-3 pt-[11px] text-left transition-colors hover:bg-muted"
            >
                <div className="flex items-center gap-2.5">
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium leading-none text-foreground">
                            {matchup.entry_1_name}
                        </span>
                        <span className="mt-1.5 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                            {matchup.entry_1_player_name}
                        </span>
                    </span>

                    <span className="flex shrink-0 items-baseline gap-1.5 text-[20px] font-bold leading-none tracking-[-0.04em]">
                        <span className={scoreTone(home, away)}>{formatCount(home)}</span>
                        <span className="text-[9px] font-normal text-muted-foreground">–</span>
                        <span className={scoreTone(away, home)}>{formatCount(away)}</span>
                    </span>

                    <span className="min-w-0 flex-1 text-right">
                        <span className="block truncate text-[11px] font-medium leading-none text-foreground">
                            {matchup.entry_2_name}
                        </span>
                        <span className="mt-1.5 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                            {matchup.entry_2_player_name}
                        </span>
                    </span>
                </div>

                {/* Always drawn, even at 0-0, so a row of unplayed fixtures still
                    reads as a row of fixtures rather than collapsing. */}
                <span className="mt-2.5 flex h-[3px] w-full overflow-hidden bg-border" aria-hidden="true">
                    <span
                        className={played ? 'bg-foreground' : 'bg-border'}
                        style={{ width: `${share}%` }}
                    />
                    <span className={`flex-1 ${played ? 'bg-muted-foreground/40' : 'bg-border'}`} />
                </span>
            </button>

            {isExpanded && (
                <div className="border-t border-border px-3">
                    {loading && (
                        <div className="animate-pulse py-4">
                            <div className="h-[86px] bg-muted" />
                            <div className="mt-4 h-[200px] bg-muted" />
                        </div>
                    )}
                    {error && (
                        <div className="my-3 border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
                            <p className="text-[9px] leading-[1.5] text-destructive-ink">{error}</p>
                        </div>
                    )}
                    {!loading && !error && detail && <MatchupLedger matchData={detail} />}
                </div>
            )}
        </div>
    );
};

/** Prev / jump / next. Stepping is the common move; the dropdown is the escape. */
const GameweekStepper = ({ events, selected, onSelect }) => {
    const index = events.findIndex((e) => e.id === selected);
    const prev = index > 0 ? events[index - 1] : null;
    const next = index >= 0 && index < events.length - 1 ? events[index + 1] : null;

    const arrow =
        'flex h-[38px] w-[34px] items-center justify-center bg-panel text-[11px] text-foreground ' +
        'transition-colors hover:bg-muted disabled:text-muted-foreground/40 disabled:hover:bg-panel';

    return (
        <div className="flex gap-px bg-border">
            <button
                type="button"
                onClick={() => prev && onSelect(prev.id)}
                disabled={!prev}
                aria-label="Previous gameweek"
                className={arrow}
            >
                ◀
            </button>

            <DropdownMenu className="flex">
                <DropdownMenuTrigger
                    aria-label="Choose gameweek"
                    className="h-[38px] gap-1.5 bg-panel px-3 text-[9px] font-medium tracking-[0.16em] text-foreground transition-colors hover:bg-muted"
                >
                    GW {selected ?? '—'}
                    <span aria-hidden="true" className="text-muted-foreground">▾</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="right" className="max-h-[280px] w-[132px] overflow-y-auto">
                    {events.map((event) => (
                        <DropdownMenuItem
                            key={event.id}
                            onClick={() => onSelect(event.id)}
                            className={`min-h-[38px] px-3 text-[9px] tracking-[0.12em] ${
                                event.id === selected ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                        >
                            GW {event.id}
                            {event.isCurrent ? ' ·' : ''}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <button
                type="button"
                onClick={() => next && onSelect(next.id)}
                disabled={!next}
                aria-label="Next gameweek"
                className={arrow}
            >
                ▶
            </button>
        </div>
    );
};

/** One of the three league-wide numbers under the masthead. */
const SummaryCell = ({ label, value, solid }) => (
    <div className={`flex-1 px-2.5 py-[9px] ${solid ? 'bg-live-ink text-background' : 'bg-panel'}`}>
        <div className={`text-[7.5px] tracking-[0.16em] ${solid ? '' : 'text-muted-foreground'}`}>
            {label}
        </div>
        <div
            className={`mt-1.5 text-[22px] font-bold leading-[0.9] tracking-[-0.04em] ${
                solid ? '' : value === null ? 'text-muted-foreground' : 'text-foreground'
            }`}
        >
            {value === null ? '0' : formatCount(value)}
        </div>
    </div>
);

const WeeklyMatchups = () => {
    const navigate = useNavigate();
    const { leagueId: urlLeagueId } = useParams();

    const [savedLeagueId, setSavedLeagueId] = useLocalStorage('fpl_league_id', '');
    // Read-only: whoever the reader last identified as themselves. Enough to
    // lift their own fixture out of the pile without adding another control.
    const [myEntry] = useMyEntry();

    const LEAGUE_ID = urlLeagueId || savedLeagueId || null;

    const [showInput, setShowInput] = useState(!LEAGUE_ID);
    const [inputLeagueId, setInputLeagueId] = useState('');

    const [matchups, setMatchups] = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(!!LEAGUE_ID);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        if (urlLeagueId && urlLeagueId !== savedLeagueId) {
            setSavedLeagueId(urlLeagueId);
            setShowInput(false);
        }
    }, [urlLeagueId, savedLeagueId, setSavedLeagueId]);

    const handleManagerClick = (teamId) => {
        navigate('/my-team', { state: { teamId: teamId.toString() } });
    };

    const handleLeagueIdSubmit = (e) => {
        e.preventDefault();
        if (!inputLeagueId.trim()) return;
        setSavedLeagueId(inputLeagueId.trim());
        setShowInput(false);
        navigate(`/weekly-matchups/${inputLeagueId.trim()}`);
    };

    useEffect(() => {
        if (!LEAGUE_ID) return;

        const fetchEvents = async () => {
            try {
                const response = await fetch(`${API_URL}/bootstrap-static`, { headers: apiHeaders() });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                const list = data.events.map((event) => ({
                    id: event.id,
                    isCurrent: event.is_current,
                    isNext: event.is_next,
                }));
                setEvents(list);
                const current = list.find((e) => e.isCurrent) || list.find((e) => e.isNext);
                if (current) setSelectedEvent(current.id);
            } catch (err) {
                console.error('Error fetching events:', err);
                setError('Could not load gameweeks');
            }
        };

        fetchEvents();
    }, [LEAGUE_ID]);

    useEffect(() => {
        if (!selectedEvent || !LEAGUE_ID) return;

        const fetchMatchups = async () => {
            setLoading(true);
            setError(null);
            setExpanded(null);
            try {
                const response = await fetch(
                    `${API_URL}/weekly-matchups/${LEAGUE_ID}?event=${selectedEvent}`,
                    { headers: apiHeaders() },
                );
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                setMatchups(data.results || (Array.isArray(data) ? data : []));
            } catch (err) {
                console.error('Error fetching matchups:', err);
                setError('Could not load fixtures for this gameweek');
            } finally {
                setLoading(false);
            }
        };

        fetchMatchups();
    }, [selectedEvent, LEAGUE_ID]);

    useEffect(() => {
        if (!LEAGUE_ID) return;

        const fetchStandings = async () => {
            try {
                const response = await fetch(`${API_URL}/league-standings/${LEAGUE_ID}/standings`, {
                    headers: apiHeaders(),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                setStandings(await response.json());
            } catch (err) {
                console.error('Error fetching standings:', err);
            }
        };

        fetchStandings();
    }, [LEAGUE_ID]);

    const summary = useMemo(() => summariseGameweek(matchups), [matchups]);
    const isLive = !!events.find((e) => e.id === selectedEvent)?.isCurrent;

    const { mine, others } = useMemo(() => {
        if (!myEntry) return { mine: null, others: matchups };
        const own = matchups.find(
            (m) =>
                String(m.entry_1_entry) === String(myEntry) ||
                String(m.entry_2_entry) === String(myEntry),
        );
        return own
            ? { mine: own, others: matchups.filter((m) => m.id !== own.id) }
            : { mine: null, others: matchups };
    }, [matchups, myEntry]);

    if (showInput || !LEAGUE_ID) {
        return (
            <div className="mx-auto max-w-[1280px] font-mono">
                <div className="px-4 pt-6 md:px-7">
                    <span className="text-[9px] tracking-[0.16em] text-muted-foreground">H2H LEAGUE</span>
                    <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
                        Find your league
                    </h1>

                    <form onSubmit={handleLeagueIdSubmit} className="mt-6 max-w-[420px]">
                        <label
                            htmlFor="league-id"
                            className="mb-1.5 block text-[8.5px] font-medium uppercase tracking-[0.13em] text-muted-foreground"
                        >
                            H2H League ID
                        </label>
                        <div className="flex gap-px bg-border">
                            <input
                                id="league-id"
                                type="text"
                                inputMode="numeric"
                                value={inputLeagueId}
                                onChange={(e) => setInputLeagueId(e.target.value)}
                                placeholder="1164871"
                                className="min-h-[44px] min-w-0 flex-1 bg-panel px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!inputLeagueId.trim()}
                                className="min-h-[44px] shrink-0 bg-primary px-4 text-[9.5px] font-medium tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                            >
                                VIEW →
                            </button>
                        </div>
                        <p className="mt-3 text-[9px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                            It's the number in your league's FPL URL:
                            fantasy.premierleague.com/leagues/<span className="text-foreground">1164871</span>/standings/h
                        </p>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1280px] font-mono">
            {/* Masthead. Same shape as the player page hero: eyebrow, big title,
                meta line, and the numbers that frame everything below. */}
            <div className="px-4 pt-4 md:px-7">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="bg-primary-chip px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
                                H2H
                            </span>
                            <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
                                LEAGUE {LEAGUE_ID}
                                {isLive ? ' · LIVE' : ''}
                            </span>
                        </div>
                        <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
                            Gameweek {selectedEvent ?? '—'}
                        </h1>
                        <div className="mt-2.5 flex flex-wrap gap-2.5 text-[10px] leading-none tracking-[0.06em]">
                            <span className="text-foreground">{summary.fixtures} FIXTURES</span>
                            <span className="text-muted-foreground">{standings.length || summary.teams} TEAMS</span>
                        </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                        <GameweekStepper
                            events={events}
                            selected={selectedEvent}
                            onSelect={setSelectedEvent}
                        />
                    </div>
                </div>

                <div className="mt-4 flex gap-px bg-border">
                    <SummaryCell label="HIGHEST" value={summary.highest} solid={toNumber(summary.highest) > 0} />
                    <SummaryCell label="AVERAGE" value={summary.average} />
                    <SummaryCell label="LOWEST" value={summary.lowest} />
                </div>
            </div>

            <div className="px-4 md:px-7 lg:grid lg:grid-cols-[1fr_326px] lg:gap-7 lg:items-start">
                <div className="min-w-0">
                    {error ? (
                        <>
                            <SectionHeader label="Fixtures" />
                            <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
                                <p className="text-[9px] leading-[1.5] text-destructive-ink">{error}</p>
                            </div>
                        </>
                    ) : loading ? (
                        <>
                            <SectionHeader label="Fixtures" />
                            <div className="flex animate-pulse flex-col gap-px bg-border">
                                {[0, 1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-[74px] bg-panel" />
                                ))}
                            </div>
                        </>
                    ) : matchups.length === 0 ? (
                        <>
                            <SectionHeader label="Fixtures" />
                            <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                                NO FIXTURES FOR THIS GAMEWEEK
                            </div>
                        </>
                    ) : (
                        <>
                            {/* The reader's own fixture is the reason they opened
                                the page, so it gets its own heading rather than
                                sitting anonymously among the other ten. */}
                            {mine && (
                                <>
                                    <SectionHeader label="Your fixture" tone="live" />
                                    <FixtureRow
                                        matchup={mine}
                                        isExpanded={expanded === mine.id}
                                        onToggle={() => setExpanded(expanded === mine.id ? null : mine.id)}
                                        eventId={selectedEvent}
                                        leagueId={LEAGUE_ID}
                                        myEntry={myEntry}
                                    />
                                </>
                            )}

                            <SectionHeader label={mine ? 'Other fixtures' : 'Fixtures'} />
                            <div className="flex flex-col gap-px bg-border">
                                {others.map((matchup) => (
                                    <FixtureRow
                                        key={matchup.id}
                                        matchup={matchup}
                                        isExpanded={expanded === matchup.id}
                                        onToggle={() =>
                                            setExpanded(expanded === matchup.id ? null : matchup.id)
                                        }
                                        eventId={selectedEvent}
                                        leagueId={LEAGUE_ID}
                                        myEntry={myEntry}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="min-w-0 pb-8 lg:border-l lg:border-border lg:pl-7">
                    <SectionHeader label="Standings" />
                    <LeagueTable
                        standings={standings}
                        myEntry={myEntry}
                        onManagerClick={handleManagerClick}
                    />
                    <GameweekStats eventId={selectedEvent} leagueId={LEAGUE_ID} />
                </div>
            </div>
        </div>
    );
};

export default WeeklyMatchups;
