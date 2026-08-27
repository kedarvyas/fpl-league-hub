import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PlayerPhoto from './PlayerPhoto';
import LeagueTable from './LeagueTable';
import { SectionHeader } from './PlayerStatCell';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_LEAGUE_ID } from '../config/league';
import { API_URL, fetchWithRetry } from '../config/supabase';
import { formatCount, getPositionShort, toNumber } from '../lib/playerStats';

/**
 * The gameweek dashboard, on the Scoreboard system.
 *
 * The old page overlapped heavily with the H2H page — both showed a league
 * average, both showed transfers, neither said which numbers were about your
 * league and which were about all of FPL. The two pages have distinct jobs now:
 * H2H is "my league this week", this is "the gameweek at large" — what all ten
 * million managers did, and what actually happened on the pitch. The one place
 * they meet is the summary strip, which puts your league's average next to
 * FPL's so the comparison is the point rather than a coincidence.
 *
 * Every global figure is labelled ACROSS FPL. That was the single most
 * misleading thing about the old page: "Most Captained" and the chip counts are
 * FPL-wide numbers in the millions, sitting in a card headed by your league id.
 */

const CHIPS = [
  { key: 'wildcard', label: 'WILDCARD' },
  { key: 'bboost', label: 'BENCH BOOST' },
  { key: '3xc', label: 'TRIPLE CAPT' },
  { key: 'freehit', label: 'FREE HIT' },
];

const kickoff = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const shortDay = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString([], { weekday: 'short' }).toUpperCase();
  } catch {
    return '';
  }
};

/** A player row — photo, name, club, one number. Used by both lists. */
const PlayerRow = ({ player, rank, value, label }) => (
  <Link
    to={`/player/${player.id}`}
    className="flex items-center gap-2.5 bg-panel px-3 py-2.5 transition-colors hover:bg-muted md:gap-3 md:px-4 md:py-3"
  >
    <span className="w-[12px] shrink-0 text-[9px] leading-none text-muted-foreground md:w-[16px] md:text-[11px]">
      {rank}
    </span>
    <PlayerPhoto
      code={player.code}
      name={player.name}
      size="sm"
      className="h-[30px] w-[24px] shrink-0 border border-border bg-background text-[10px] md:h-[40px] md:w-[31px] md:text-[13px]"
    />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[10px] font-medium leading-none text-foreground md:text-[13px]">
        {player.name}
      </span>
      <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:mt-1.5 md:text-[9px]">
        {player.position} · {player.team}
      </span>
    </span>
    <span className="shrink-0 text-right">
      <span className="block text-[14px] font-bold leading-none tracking-[-0.03em] text-foreground md:text-[20px]">
        {value}
      </span>
      <span className="mt-1 block text-[7px] leading-none tracking-[0.1em] text-muted-foreground md:text-[8px]">
        {label}
      </span>
    </span>
  </Link>
);

/** One of the three headline numbers under the masthead. */
const SummaryCell = ({ label, value, solid }) => (
  <div className={`flex-1 px-2.5 py-[9px] ${solid ? 'bg-live text-background' : 'bg-panel'}`}>
    <div className={`text-[7.5px] tracking-[0.16em] ${solid ? 'opacity-75' : 'text-muted-foreground'}`}>
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

/** A real Premier League fixture. Score once it starts, kickoff before. */
const FixtureRow = ({ fixture }) => (
  <div className="flex items-center gap-2 bg-panel px-3 py-2.5 md:px-4">
    <span className="min-w-0 flex-1 truncate text-right text-[10px] font-medium leading-none text-foreground md:text-[12px]">
      {fixture.home}
    </span>

    {fixture.started ? (
      <span className="flex shrink-0 items-baseline gap-1.5 text-[14px] font-bold leading-none tracking-[-0.03em] text-foreground md:text-[16px]">
        <span>{fixture.homeScore}</span>
        <span className="text-[8px] font-normal text-muted-foreground">–</span>
        <span>{fixture.awayScore}</span>
      </span>
    ) : (
      <span className="shrink-0 text-[9px] leading-none tracking-[0.06em] text-muted-foreground md:text-[10px]">
        {kickoff(fixture.kickoffTime)}
      </span>
    )}

    <span className="min-w-0 flex-1 truncate text-[10px] font-medium leading-none text-foreground md:text-[12px]">
      {fixture.away}
    </span>

    <span className="w-[26px] shrink-0 text-right text-[7px] leading-none tracking-[0.1em] text-muted-foreground md:w-[30px] md:text-[8px]">
      {fixture.finished ? 'FT' : fixture.started ? 'LIVE' : shortDay(fixture.kickoffTime)}
    </span>
  </div>
);

const Dashboard = ({ leagueId: propLeagueId }) => {
  const navigate = useNavigate();
  const { leagueId: urlLeagueId } = useParams();
  const leagueId = urlLeagueId || propLeagueId || DEFAULT_LEAGUE_ID;
  const [myEntry] = useLocalStorage('fpl_team_id', '');

  const [bootstrap, setBootstrap] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [fixtureEvent, setFixtureEvent] = useState(null);
  const [transferView, setTransferView] = useState('in');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bootstrapRes, standingsRes] = await Promise.all([
          fetchWithRetry(`${API_URL}/bootstrap-static`),
          fetchWithRetry(`${API_URL}/league-standings/${leagueId}/standings`),
        ]);
        if (!bootstrapRes.ok) throw new Error(`HTTP ${bootstrapRes.status}`);

        const bootstrapData = await bootstrapRes.json();
        if (cancelled) return;
        setBootstrap(bootstrapData);

        const standingsData = standingsRes.ok ? await standingsRes.json() : [];
        if (cancelled) return;
        setStandings(Array.isArray(standingsData) ? standingsData : []);

        const current =
          bootstrapData.events?.find((e) => e.is_current) ||
          bootstrapData.events?.find((e) => e.is_next);
        if (current) setFixtureEvent((prev) => prev ?? current.id);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading dashboard:', err);
          setError('Could not load gameweek data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (leagueId) load();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const currentEvent = useMemo(
    () => bootstrap?.events?.find((e) => e.is_current) || bootstrap?.events?.find((e) => e.is_next),
    [bootstrap],
  );

  useEffect(() => {
    if (!currentEvent?.id || !leagueId) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetchWithRetry(
          `${API_URL}/weekly-matchups/${leagueId}?event=${currentEvent.id}`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setMatchups(data?.results ?? (Array.isArray(data) ? data : []));
      } catch (err) {
        if (!cancelled) console.error('Error loading league matchups:', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [leagueId, currentEvent?.id]);

  // The cancel flag matters twice over: StrictMode double-invokes this in
  // development, and stepping gameweeks quickly can otherwise let a slow
  // earlier response land on top of a newer one.
  useEffect(() => {
    if (!fixtureEvent || !bootstrap?.teams) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetchWithRetry(`${API_URL}/fixtures/${fixtureEvent}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const nameOf = (id) => bootstrap.teams.find((t) => t.id === id)?.short_name || 'TBD';
        setFixtures(
          (Array.isArray(data) ? data : []).map((f) => ({
            id: f.id,
            home: nameOf(f.team_h),
            away: nameOf(f.team_a),
            homeScore: f.team_h_score ?? 0,
            awayScore: f.team_a_score ?? 0,
            started: !!f.started,
            finished: !!f.finished,
            kickoffTime: f.kickoff_time,
          })),
        );
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading fixtures:', err);
          setFixtures([]);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fixtureEvent, bootstrap]);

  // Derived data. All of these copy before sorting — the old page called
  // .sort() straight on bootstrap.elements three times per render, mutating
  // React state in place.
  const teamName = useMemo(() => {
    const map = new Map((bootstrap?.teams || []).map((t) => [t.id, t.short_name]));
    return (id) => map.get(id) || '';
  }, [bootstrap]);

  const shape = (p) => ({
    id: p.id,
    code: p.code,
    name: p.web_name,
    team: teamName(p.team),
    position: getPositionShort(p.element_type),
  });

  const topPerformers = useMemo(() => {
    if (!bootstrap?.elements) return [];
    return [...bootstrap.elements]
      .sort((a, b) => toNumber(b.event_points) - toNumber(a.event_points))
      .slice(0, 5)
      .map((p) => ({ ...shape(p), value: toNumber(p.event_points) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap]);

  const transfers = useMemo(() => {
    if (!bootstrap?.elements) return { in: [], out: [] };
    const top = (key) =>
      [...bootstrap.elements]
        .sort((a, b) => toNumber(b[key]) - toNumber(a[key]))
        .slice(0, 5)
        .map((p) => ({ ...shape(p), value: toNumber(p[key]) }));
    return { in: top('transfers_in_event'), out: top('transfers_out_event') };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap]);

  const leagueAverage = useMemo(() => {
    const scores = matchups.flatMap((m) => [m.entry_1_points, m.entry_2_points]).map((v) => toNumber(v));
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [matchups]);

  const captains = useMemo(() => {
    if (!bootstrap?.elements || !currentEvent) return { captain: null, vice: null };
    const find = (id) => bootstrap.elements.find((p) => p.id === id);
    return {
      captain: find(currentEvent.most_captained),
      vice: find(currentEvent.most_vice_captained),
    };
  }, [bootstrap, currentEvent]);

  const chipCounts = useMemo(() => {
    const plays = currentEvent?.chip_plays || [];
    return CHIPS.map((chip) => ({
      ...chip,
      count: toNumber(plays.find((c) => c.chip_name === chip.key)?.num_played),
    }));
  }, [currentEvent]);

  const events = bootstrap?.events || [];
  const fixtureIndex = events.findIndex((e) => e.id === fixtureEvent);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] animate-pulse font-mono">
        <div className="px-4 pt-4 md:px-7">
          <div className="h-[25px] w-1/2 bg-panel md:h-[46px]" />
          <div className="mt-4 flex gap-px bg-border">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[56px] flex-1 bg-panel" />
            ))}
          </div>
          <div className="mt-6 h-[260px] bg-panel" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] font-mono">
        <div className="px-4 pt-6 md:px-7">
          <SectionHeader label="Gameweek" />
          <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
            <p className="text-[9px] leading-[1.5] text-destructive">{error}. Try again shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  const isLive = !!currentEvent?.is_current && !currentEvent?.finished;
  const arrow =
    'flex h-[30px] w-[28px] items-center justify-center bg-panel text-[10px] text-foreground ' +
    'transition-colors hover:bg-muted disabled:text-muted-foreground/40 disabled:hover:bg-panel';

  return (
    <div className="mx-auto max-w-[1280px] font-mono">
      <div className="px-4 pt-4 md:px-7">
        <div className="flex items-center gap-2">
          <span className="bg-primary px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
            FPL
          </span>
          <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
            LEAGUE {leagueId}
            {isLive ? ' · LIVE' : ''}
          </span>
        </div>
        <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
          Gameweek {currentEvent?.id ?? '—'}
        </h1>
        <div className="mt-2.5 flex flex-wrap gap-2.5 text-[10px] leading-none tracking-[0.06em]">
          <span className="text-foreground">{isLive ? 'IN PROGRESS' : 'FINISHED'}</span>
          <span className="text-muted-foreground">{standings.length} TEAMS IN LEAGUE</span>
        </div>

        {/* The one place league and global numbers meet, so the comparison is
            the point rather than an accident of layout. */}
        <div className="mt-4 flex gap-px bg-border">
          <SummaryCell label="FPL AVERAGE" value={toNumber(currentEvent?.average_entry_score, null)} />
          <SummaryCell
            label="FPL HIGHEST"
            value={toNumber(currentEvent?.highest_score, null)}
            solid={toNumber(currentEvent?.highest_score, null) !== null}
          />
          <SummaryCell label="YOUR LEAGUE AVG" value={leagueAverage} />
        </div>
      </div>

      <div className="px-4 pb-8 md:px-7 lg:grid lg:grid-cols-[1fr_326px] lg:items-start lg:gap-7">
        <div className="min-w-0">
          <SectionHeader label="Top performers" tone="live">
            <span className="text-[7px] tracking-[0.1em] text-muted-foreground">ACROSS FPL</span>
          </SectionHeader>
          {topPerformers.length === 0 ? (
            <div className="bg-panel px-3 py-3 text-[8.5px] tracking-[0.12em] text-muted-foreground">
              NO SCORES YET
            </div>
          ) : (
            <div className="flex flex-col gap-px bg-border">
              {topPerformers.map((p, i) => (
                <PlayerRow key={p.id} player={p} rank={i + 1} value={formatCount(p.value)} label="PTS" />
              ))}
            </div>
          )}

          <SectionHeader label="Premier League">
            <div className="flex items-center gap-px bg-border">
              <button
                type="button"
                onClick={() => setFixtureEvent(events[fixtureIndex - 1].id)}
                disabled={fixtureIndex <= 0}
                aria-label="Previous gameweek fixtures"
                className={arrow}
              >
                ◀
              </button>
              <span className="bg-panel px-2 text-[8px] leading-[30px] tracking-[0.12em] text-foreground">
                GW {fixtureEvent ?? '—'}
              </span>
              <button
                type="button"
                onClick={() => setFixtureEvent(events[fixtureIndex + 1].id)}
                disabled={fixtureIndex < 0 || fixtureIndex >= events.length - 1}
                aria-label="Next gameweek fixtures"
                className={arrow}
              >
                ▶
              </button>
            </div>
          </SectionHeader>
          {fixtures.length === 0 ? (
            <div className="bg-panel px-3 py-3 text-[8.5px] tracking-[0.12em] text-muted-foreground">
              NO FIXTURES FOR THIS GAMEWEEK
            </div>
          ) : (
            <div className="flex flex-col gap-px bg-border">
              {fixtures.map((f) => (
                <FixtureRow key={f.id} fixture={f} />
              ))}
            </div>
          )}

          <SectionHeader label="Transfers">
            <div className="flex gap-px bg-border">
              {[
                { id: 'in', label: 'IN' },
                { id: 'out', label: 'OUT' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setTransferView(v.id)}
                  aria-pressed={transferView === v.id}
                  className={`min-h-[24px] px-2.5 text-[8px] font-medium tracking-[0.12em] transition-colors ${
                    transferView === v.id
                      ? 'bg-inverted text-background'
                      : 'bg-panel text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </SectionHeader>
          <div className="flex flex-col gap-px bg-border">
            {(transferView === 'in' ? transfers.in : transfers.out).map((p, i) => (
              <PlayerRow
                key={p.id}
                player={p}
                rank={i + 1}
                value={formatCount(p.value)}
                label={transferView === 'in' ? 'IN' : 'OUT'}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <SectionHeader label="Captaincy">
            <span className="text-[7px] tracking-[0.1em] text-muted-foreground">ACROSS FPL</span>
          </SectionHeader>
          <div className="flex flex-col gap-px bg-border">
            {[
              { label: 'MOST CAPTAINED', player: captains.captain },
              { label: 'MOST VICE', player: captains.vice },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2.5 bg-panel px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[7.5px] leading-none tracking-[0.12em] text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="mt-1.5 block truncate text-[13px] font-bold uppercase leading-none tracking-[-0.02em] text-foreground">
                    {row.player?.web_name || '—'}
                  </span>
                </span>
                {row.player && (
                  <span className="shrink-0 text-right text-[9px] leading-none tracking-[0.1em] text-muted-foreground">
                    {teamName(row.player.team)}
                  </span>
                )}
              </div>
            ))}
          </div>

          <SectionHeader label="Chips played">
            <span className="text-[7px] tracking-[0.1em] text-muted-foreground">ACROSS FPL</span>
          </SectionHeader>
          <div className="grid grid-cols-2 gap-px bg-border">
            {chipCounts.map((chip) => (
              <div key={chip.key} className="bg-panel px-3 pb-3 pt-[11px]">
                <p className="h-[22px] text-[8.5px] font-medium uppercase leading-[1.3] tracking-[0.13em] text-muted-foreground">
                  {chip.label}
                </p>
                <span
                  className={`mt-1.5 block text-[20px] font-bold leading-[0.9] tracking-[-0.04em] ${
                    chip.count === 0 ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {formatCount(chip.count)}
                </span>
              </div>
            ))}
          </div>

          <SectionHeader label="Your league">
            <Link
              to={`/weekly-matchups/${leagueId}`}
              className="text-[8px] font-medium tracking-[0.12em] text-primary-lighter"
            >
              FULL TABLE →
            </Link>
          </SectionHeader>
          <LeagueTable
            standings={standings.slice(0, 5)}
            myEntry={myEntry}
            onManagerClick={(teamId) => navigate('/my-team', { state: { teamId: String(teamId) } })}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
