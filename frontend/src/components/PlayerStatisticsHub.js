import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './PlayerStatCell';
import PlayerPhoto from './PlayerPhoto';
import {
  getPositionShort,
  getPriceOutlook,
  formatCount,
  formatDecimal,
  formatSignedPercent,
  priceConfidence,
  priceMoveWord,
  toNumber,
} from '../lib/playerStats';
import { API_URL, apiHeaders } from '../config/supabase';

/**
 * The player hub, on the Scoreboard system.
 *
 * Beyond the restyle — the old page painted `from-purple-700` card headers and
 * `text-gray-500` body copy, neither of which is a token, so five of the six
 * themes rendered grey-on-grey — the page had a structural problem: the search
 * box filtered the six leaderboards rather than finding players. Typing "Salah"
 * returned six cards each containing Salah, which is not what anyone means.
 *
 * So there are two modes now, on the app's usual tab bar: LEADERBOARDS for
 * "who's leading", ALL PLAYERS for "find and rank". Search and the position
 * filter apply to both, and typing switches you to the list, because at that
 * point you have stopped browsing and started looking for someone.
 */

const POSITIONS = [
  { id: 'all', label: 'ALL', type: null },
  { id: 'gkp', label: 'GKP', type: 1 },
  { id: 'def', label: 'DEF', type: 2 },
  { id: 'mid', label: 'MID', type: 3 },
  { id: 'fwd', label: 'FWD', type: 4 },
];

// Each sort carries how to render itself, because the list's last column shows
// whichever metric is currently sorting it. Sorting by VALUE while the column
// showed PTS made a correctly-ordered list look unsorted — every row read 0.
const SORTS = [
  {
    id: 'points',
    label: 'PTS',
    value: (p) => toNumber(p.total_points),
    display: (p) => formatCount(p.total_points),
  },
  {
    id: 'form',
    label: 'FORM',
    value: (p) => toNumber(p.form),
    display: (p) => formatDecimal(p.form, 1, '0.0'),
  },
  {
    id: 'price',
    label: '£M',
    value: (p) => toNumber(p.now_cost),
    display: (p) => formatDecimal(toNumber(p.now_cost) / 10, 1, '0.0'),
  },
  {
    id: 'value',
    label: 'PTS/£M',
    value: (p) => p.pointsPerMillion,
    display: (p) => formatDecimal(p.pointsPerMillion, 1, '0.0'),
  },
  {
    id: 'selected',
    label: 'OWNED',
    value: (p) => toNumber(p.selected_by_percent),
    display: (p) => formatDecimal(p.selected_by_percent, 1, '0.0'),
  },
];

const PAGE_SIZE = 60;

/** Sign-aware strength of a player's dynamic price move, plus display strings. */
const derivePriceMove = (player) => {
  const outlook = getPriceOutlook(player);
  const hasProjection = Boolean(outlook && outlook.next);
  const steps = hasProjection ? outlook.next.steps : 0;
  const momentum = outlook ? outlook.momentum : 0;

  return {
    priceScore: steps * 1000 + momentum,
    priceMove: hasProjection
      ? {
          value: formatSignedPercent(momentum),
          label: `${priceMoveWord(steps)} · ${priceConfidence(steps)}/5`,
        }
      : { value: '—', label: 'NO PROJECTION' },
  };
};

const price = (nowCost) => `£${(toNumber(nowCost) / 10).toFixed(1)}M`;

/** A row in one of the six leaderboards. */
const LeaderRow = ({ player, rank, value, label }) => (
  <Link
    to={`/player/${player.id}`}
    className="flex items-center gap-2.5 bg-panel px-3 py-2.5 transition-colors hover:bg-muted md:gap-3 md:px-4 md:py-3"
  >
    <span className="w-[12px] shrink-0 text-[9px] leading-none text-muted-foreground md:w-[16px] md:text-[11px]">{rank}</span>
    <PlayerPhoto
      code={player.code}
      name={player.web_name}
      size="sm"
      className="h-[30px] w-[24px] shrink-0 border border-border bg-background text-[10px] md:h-[40px] md:w-[31px] md:text-[13px]"
    />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[10px] font-medium leading-none text-foreground md:text-[13px]">
        {player.web_name}
      </span>
      <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:mt-1.5 md:text-[9px]">
        {player.teamShortName} · {price(player.now_cost)}
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

const Leaderboard = ({ label, note, players, render, empty }) => (
  <section className="min-w-0">
    <SectionHeader label={label}>
      {note && (
        <span className="text-[7px] tracking-[0.1em] text-muted-foreground md:text-[8px]">{note}</span>
      )}
    </SectionHeader>
    {players.length === 0 ? (
      <div className="bg-panel px-3 py-3 text-[8px] leading-[1.5] tracking-[0.1em] text-muted-foreground">
        {empty || 'NO PLAYERS MATCH THIS FILTER'}
      </div>
    ) : (
      <div className="flex flex-col gap-px bg-border">
        {players.map((player, index) => render(player, index))}
      </div>
    )}
  </section>
);

/** A row in the ALL PLAYERS list. */
const ListRow = ({ player, rank, sort }) => (
  <Link
    to={`/player/${player.id}`}
    className="flex items-center gap-2.5 bg-panel px-3 py-2.5 transition-colors hover:bg-muted md:gap-3 md:px-4 md:py-3"
  >
    <span className="w-[22px] shrink-0 text-right text-[9px] leading-none text-muted-foreground md:w-[28px] md:text-[11px]">
      {rank}
    </span>
    <PlayerPhoto
      code={player.code}
      name={player.web_name}
      size="sm"
      className="h-[30px] w-[24px] shrink-0 border border-border bg-background text-[10px] md:h-[40px] md:w-[31px] md:text-[13px]"
    />
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[10px] font-medium leading-none text-foreground md:text-[13px]">
        {player.web_name}
      </span>
      <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:mt-1.5 md:text-[9px]">
        {player.teamShortName} · {price(player.now_cost)}
      </span>
    </span>

    <span className="hidden w-[30px] shrink-0 text-center text-[8px] leading-none tracking-[0.1em] text-muted-foreground sm:block md:w-[36px] md:text-[9.5px]">
      {getPositionShort(player.element_type)}
    </span>
    <span className="hidden w-[34px] shrink-0 text-right text-[11px] font-medium leading-none text-muted-foreground sm:block md:w-[44px] md:text-[14px]">
      {formatDecimal(player.form, 1, '0.0')}
    </span>
    <span className="hidden w-[40px] shrink-0 text-right text-[11px] font-medium leading-none text-muted-foreground md:block md:w-[50px] md:text-[14px]">
      {formatDecimal(player.selected_by_percent, 1, '0.0')}
    </span>

    <span className="w-[46px] shrink-0 text-right md:w-[58px]">
      <span className="block text-[14px] font-bold leading-none tracking-[-0.03em] text-foreground md:text-[20px]">
        {sort.display(player)}
      </span>
      <span className="mt-1 block text-[7px] leading-none tracking-[0.1em] text-muted-foreground md:text-[8px]">
        {sort.label}
      </span>
    </span>
  </Link>
);

const PlayerStatisticsHub = () => {
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePosition, setActivePosition] = useState('all');
  const [tab, setTab] = useState('leaders');
  const [sortId, setSortId] = useState('points');
  const [ascending, setAscending] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${API_URL}/bootstrap-static`, { headers: apiHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const processed = (data.elements || [])
          .map((player) => {
            const team = (data.teams || []).find((t) => t.id === player.team);
            const cost = toNumber(player.now_cost);
            return {
              ...player,
              teamName: team?.name || 'Unknown Team',
              teamShortName: team?.short_name || 'UNK',
              pointsPerMillion: cost > 0 ? toNumber(player.total_points) / (cost / 10) : 0,
              ...derivePriceMove(player),
            };
          })
          .sort((a, b) => toNumber(b.total_points) - toNumber(a.total_points));

        setPlayers(processed);
      } catch (err) {
        console.error('Error fetching player data:', err);
        setError('Could not load player data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const positionType = POSITIONS.find((p) => p.id === activePosition)?.type ?? null;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return players.filter((player) => {
      const matchesSearch =
        !term ||
        player.web_name.toLowerCase().includes(term) ||
        player.teamName.toLowerCase().includes(term) ||
        player.teamShortName.toLowerCase().includes(term);
      const matchesPosition = positionType === null || player.element_type === positionType;
      return matchesSearch && matchesPosition;
    });
  }, [players, searchTerm, positionType]);

  const sorted = useMemo(() => {
    const sort = SORTS.find((s) => s.id === sortId) || SORTS[0];
    return [...filtered].sort((a, b) =>
      ascending ? sort.value(a) - sort.value(b) : sort.value(b) - sort.value(a),
    );
  }, [filtered, sortId, ascending]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [searchTerm, activePosition, sortId, ascending, tab]);

  const topBy = (valueFn, { filter, limit = 5, asc = false } = {}) => {
    const pool = filter ? filtered.filter(filter) : filtered;
    return [...pool].sort((a, b) => (asc ? valueFn(a) - valueFn(b) : valueFn(b) - valueFn(a))).slice(0, limit);
  };

  const onSearch = (value) => {
    setSearchTerm(value);
    // Typing means you have stopped browsing and started looking for someone.
    if (value.trim() && tab !== 'list') setTab('list');
  };

  const toggleSort = (id) => {
    if (sortId === id) {
      setAscending((v) => !v);
    } else {
      setSortId(id);
      setAscending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] animate-pulse font-mono">
        <div className="px-4 pt-4 md:px-7">
          <div className="h-[25px] w-1/2 bg-panel md:h-[46px]" />
          <div className="mt-4 h-[40px] w-full bg-panel" />
          <div className="mt-4 grid gap-x-7 gap-y-2 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[240px] bg-panel" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] font-mono">
        <div className="px-4 pt-6 md:px-7">
          <SectionHeader label="Players" />
          <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
            <p className="text-[9px] leading-[1.5] text-destructive">{error}. Try again shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  const keepersOnly = activePosition === 'gkp';
  const activeSort = SORTS.find((s) => s.id === sortId) || SORTS[0];

  return (
    <div className="mx-auto max-w-[1280px] font-mono">
      {/* Masthead, same shape as the player and H2H pages. */}
      <div className="px-4 pt-4 md:px-7">
        <div className="flex items-center gap-2">
          <span className="bg-primary px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
            FPL
          </span>
          <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
            {formatCount(players.length)} PLAYERS
          </span>
        </div>
        <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
          Players
        </h1>

        {/* Search. Clearing it does not send you back to the leaderboards —
            that would yank the page out from under someone deleting a typo. */}
        <div className="mt-4 flex gap-px bg-border">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="SEARCH PLAYER OR CLUB"
            aria-label="Search players or clubs"
            className="min-h-[40px] min-w-0 flex-1 bg-panel px-3 text-[11px] tracking-[0.06em] text-foreground placeholder:text-muted-foreground placeholder:tracking-[0.12em] focus:outline-none md:min-h-[48px] md:px-4 md:text-[13px]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
              className="min-h-[40px] shrink-0 bg-panel px-3 text-[10px] text-muted-foreground transition-colors hover:text-foreground md:min-h-[48px] md:px-4 md:text-[12px]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Position filter. The active cell uses the value inversion rather
            than a --primary fill: --primary is not guaranteed to contrast with
            --background, and background-on-primary measures 2.75:1 in Ocean and
            2.81:1 in Midnight. The inversion is --foreground against
            --background by construction, so it clears 10:1 in all six themes. */}
        <div className="mt-px flex gap-px bg-border">
          {POSITIONS.map((position) => (
            <button
              key={position.id}
              type="button"
              onClick={() => setActivePosition(position.id)}
              aria-pressed={activePosition === position.id}
              className={`min-h-[34px] flex-1 text-[8.5px] font-medium tracking-[0.14em] transition-colors md:min-h-[42px] md:text-[10.5px] ${
                activePosition === position.id
                  ? 'bg-inverted text-background'
                  : 'bg-panel text-muted-foreground hover:text-foreground'
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode tabs, the same object as the player page's tab bar. */}
      <div className="mt-4 flex border-t border-border px-4 md:px-7">
        {[
          { id: 'leaders', label: 'LEADERBOARDS' },
          { id: 'list', label: `ALL PLAYERS · ${filtered.length}` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 py-[11px] text-center text-[9.5px] font-medium leading-none tracking-[0.14em] transition-colors md:py-[14px] md:text-[11.5px] ${
              tab === t.id
                ? 'border-live text-live'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 md:px-7">
        {tab === 'leaders' ? (
          <div className="grid gap-x-7 md:grid-cols-2 xl:grid-cols-3">
            <Leaderboard
              label="Top scorers"
              note="SEASON"
              players={topBy((p) => toNumber(p.total_points))}
              render={(p, i) => (
                <LeaderRow
                  key={p.id}
                  player={p}
                  rank={i + 1}
                  value={formatCount(p.total_points)}
                  label="PTS"
                />
              )}
            />

            <Leaderboard
              label="Best value"
              note="PTS PER £M"
              players={topBy((p) => p.pointsPerMillion)}
              render={(p, i) => (
                <LeaderRow
                  key={p.id}
                  player={p}
                  rank={i + 1}
                  value={formatDecimal(p.pointsPerMillion, 1, '0.0')}
                  label="PTS/£M"
                />
              )}
            />

            <Leaderboard
              label="In form"
              note="RECENT AVG"
              players={topBy((p) => toNumber(p.form))}
              render={(p, i) => (
                <LeaderRow
                  key={p.id}
                  player={p}
                  rank={i + 1}
                  value={formatDecimal(p.form, 1, '0.0')}
                  label="FORM"
                />
              )}
            />

            <Leaderboard
              label="Defensive contribution"
              note="2 PTS PER MATCH"
              players={keepersOnly ? [] : topBy((p) => toNumber(p.defensive_contribution), {
                filter: (p) => p.element_type !== 1,
              })}
              empty={
                keepersOnly
                  ? 'GOALKEEPERS DO NOT EARN DEFENSIVE CONTRIBUTION POINTS'
                  : 'NONE RECORDED YET'
              }
              render={(p, i) => (
                <LeaderRow
                  key={p.id}
                  player={p}
                  rank={i + 1}
                  value={formatCount(p.defensive_contribution)}
                  label={`${formatDecimal(p.defensive_contribution_per_90, 1, '0.0')}/90`}
                />
              )}
            />

            <Leaderboard
              label="Price risers"
              note="TOWARD A RISE"
              players={topBy((p) => toNumber(p.priceScore), {
                filter: (p) => toNumber(p.priceScore) > 0,
              })}
              empty="NO PROJECTED RISERS RIGHT NOW"
              render={(p, i) => (
                <LeaderRow
                  key={p.id}
                  player={p}
                  rank={i + 1}
                  value={p.priceMove.value}
                  label={p.priceMove.label}
                />
              )}
            />

            <Leaderboard
              label="Price fallers"
              note="TOWARD A FALL"
              players={topBy((p) => toNumber(p.priceScore), {
                filter: (p) => toNumber(p.priceScore) < 0,
                asc: true,
              })}
              empty="NO PROJECTED FALLERS RIGHT NOW"
              render={(p, i) => (
                <LeaderRow
                  key={p.id}
                  player={p}
                  rank={i + 1}
                  value={p.priceMove.value}
                  label={p.priceMove.label}
                />
              )}
            />
          </div>
        ) : (
          <>
            {/* Sort header. Doubles as the column key for the row below it. */}
            <div className="flex items-center gap-2.5 px-3 pt-[22px] md:gap-3 md:px-4">
              <span className="w-[22px] shrink-0 md:w-[28px]" />
              <span className="w-[24px] shrink-0 md:w-[31px]" />
              <span className="min-w-0 flex-1 text-[7px] tracking-[0.12em] text-muted-foreground md:text-[8px]">
                PLAYER
              </span>
              <span className="hidden w-[30px] shrink-0 text-center text-[7px] tracking-[0.12em] text-muted-foreground sm:block md:w-[36px] md:text-[8px]">
                POS
              </span>
              {/* Labels, not controls. Sorting lives in the one chip row
                  below: duplicating three of the five sorts up here gave the
                  page two buttons with the same name for the same action, and
                  the columns that carry them are hidden on a phone anyway. */}
              {[
                { id: 'form', width: 'w-[34px] md:w-[44px]', show: 'hidden sm:block' },
                { id: 'selected', width: 'w-[40px] md:w-[50px]', show: 'hidden md:block' },
              ].map((col) => {
                const sort = SORTS.find((s) => s.id === col.id);
                return (
                  <span
                    key={col.id}
                    className={`${col.width} ${col.show} shrink-0 text-right text-[7px] tracking-[0.12em] md:text-[8px] ${
                      sortId === col.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {sort.label}
                  </span>
                );
              })}
              <span className="w-[46px] shrink-0 text-right text-[7px] tracking-[0.12em] text-foreground md:w-[58px] md:text-[8px]">
                {activeSort.label} {ascending ? '▲' : '▼'}
              </span>
            </div>

            {/* Price and value have no column of their own, so they sort from
                here rather than being unreachable. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 pb-2.5">
              <span className="text-[7px] tracking-[0.12em] text-muted-foreground md:text-[8px]">SORT</span>
              {SORTS.map((sort) => (
                <button
                  key={sort.id}
                  type="button"
                  onClick={() => toggleSort(sort.id)}
                  aria-pressed={sortId === sort.id}
                  aria-label={`Sort by ${sort.label}${
                    sortId === sort.id ? (ascending ? ', ascending' : ', descending') : ''
                  }`}
                  className={`min-h-[24px] px-1.5 py-[3px] text-[7.5px] font-medium tracking-[0.1em] transition-colors md:min-h-[28px] md:px-2 md:text-[9px] ${
                    sortId === sort.id
                      ? 'bg-accent/15 text-accent-chip'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sort.label}
                  {sortId === sort.id ? (ascending ? ' ▲' : ' ▼') : ''}
                </button>
              ))}
            </div>

            {sorted.length === 0 ? (
              <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                NO PLAYERS MATCH {searchTerm ? `"${searchTerm.toUpperCase()}"` : 'THIS FILTER'}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-px bg-border">
                  {sorted.slice(0, visible).map((player, index) => (
                    <ListRow key={player.id} player={player} rank={index + 1} sort={activeSort} />
                  ))}
                </div>

                {visible < sorted.length && (
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="mt-px min-h-[40px] w-full bg-panel text-[8.5px] font-medium tracking-[0.14em] text-primary-lighter transition-colors hover:bg-muted md:min-h-[48px] md:text-[10px]"
                  >
                    SHOW {Math.min(PAGE_SIZE, sorted.length - visible)} MORE ·{' '}
                    {sorted.length - visible} LEFT
                  </button>
                )}
              </>
            )}

            <p className="mt-3 text-[7px] leading-[1.6] tracking-[0.1em] text-muted-foreground md:text-[8px]">
              SORTED BY {activeSort.label} {ascending ? 'ASCENDING' : 'DESCENDING'}
            </p>
          </>
        )}

        <p className="mt-6 text-[7.5px] leading-[1.7] tracking-[0.08em] text-muted-foreground md:text-[9px]">
          Defensive contribution counts tackles, clearances, blocks and interceptions, plus
          recoveries for midfielders and forwards. Price percentages show how far a player has moved
          toward a change under FPL's dynamic pricing, with FPL's own likelihood rating out of five.
        </p>
      </div>
    </div>
  );
};

export default PlayerStatisticsHub;
