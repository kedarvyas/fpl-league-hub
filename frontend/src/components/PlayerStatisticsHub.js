import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Shield,
  Goal,
  Star,
  ChevronRight,
  Search,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  getPositionName,
  getPriceOutlook,
  formatCount,
  formatDecimal,
  formatSignedPercent,
  priceConfidence,
  priceMoveWord,
  toNumber
} from '../lib/playerStats';
import { API_URL } from '../config/supabase';
import PlayerPhoto from './PlayerPhoto';



/**
 * Sign-aware strength of a player's dynamic price move, plus its display
 * strings. Computed once per player when the bootstrap payload lands.
 */
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
        label: `${priceMoveWord(steps)} · ${priceConfidence(steps)}/5`
      }
      : { value: '—', label: 'no projection' }
  };
};

const PlayerStatisticsHub = () => {
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePosition, setActivePosition] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${API_URL}/bootstrap-static`);
        const data = await response.json();

        // Process and sort players by total points
        const processedPlayers = (data.elements || []).map(player => {
          const team = (data.teams || []).find(t => t.id === player.team);
          return {
            ...player,
            teamName: team?.name || 'Unknown Team',
            teamShortName: team?.short_name || 'UNK',
            position: getPositionName(player.element_type),
            ...derivePriceMove(player)
          };
        }).sort((a, b) => toNumber(b.total_points) - toNumber(a.total_points));

        setPlayers(processedPlayers);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching player data:', err);
        setError('Failed to load player data');
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(player => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = player.web_name.toLowerCase().includes(term) ||
      player.teamName.toLowerCase().includes(term);
    const matchesPosition = activePosition === 'all' || player.position === activePosition;
    return matchesSearch && matchesPosition;
  });

  /** Rank the whole filtered pool by any metric, not just the top points scorers. */
  const topBy = (valueFn, { filter, limit = 5, ascending = false } = {}) => {
    const pool = filter ? filteredPlayers.filter(filter) : filteredPlayers;
    return [...pool]
      .sort((a, b) => ascending ? valueFn(a) - valueFn(b) : valueFn(b) - valueFn(a))
      .slice(0, limit);
  };

  const StatCard = ({ title, icon: Icon, subtitle, children }) => (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
        <CardTitle className="text-white flex items-center space-x-2 text-lg sm:text-xl">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span>{title}</span>
        </CardTitle>
        {subtitle && <p className="text-xs text-purple-100 mt-1">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }) => (
    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">{message}</div>
  );

  const PlayerRow = ({ player, rank, metricValue, metricLabel }) => (
    <Link
      to={`/player/${player.id}`}
      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors relative"
    >
      <span className="text-lg font-bold text-gray-400 w-5 flex-shrink-0">{rank}</span>
      <PlayerPhoto
        code={player.code}
        name={player.web_name}
        size="md"
        className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 text-sm"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{player.web_name}</div>
        <div className="text-sm text-gray-500 flex items-center space-x-1">
          {/* `truncate` on a flex container clips its children mid-glyph
              instead of ellipsising, so the club name truncates and the
              price keeps its intrinsic width. */}
          <span className="truncate">{player.teamShortName}</span>
          <span className="flex-shrink-0">•</span>
          <span className="flex-shrink-0 whitespace-nowrap">£{(toNumber(player.now_cost) / 10).toFixed(1)}m</span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-purple-600">
          {metricValue !== undefined ? metricValue : formatCount(player.total_points)}
        </div>
        <div className="text-xs text-gray-500">
          {metricLabel || 'points'}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
    </Link>
  );

  const positions = ['all', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Player data unavailable</h2>
          <p className="text-sm text-gray-500">{error}. Please try again shortly.</p>
        </div>
      </div>
    );
  }

  const topScorers = topBy(p => toNumber(p.total_points));
  const bestValue = topBy(p => toNumber(p.now_cost) > 0
    ? toNumber(p.total_points) / (toNumber(p.now_cost) / 10)
    : 0);
  const inForm = topBy(p => toNumber(p.form));
  const defconLeaders = topBy(p => toNumber(p.defensive_contribution), {
    filter: p => p.element_type !== 1
  });
  const risers = topBy(p => toNumber(p.priceScore), { filter: p => toNumber(p.priceScore) > 0 });
  const fallers = topBy(p => toNumber(p.priceScore), {
    filter: p => toNumber(p.priceScore) < 0,
    ascending: true
  });

  const keepersOnly = activePosition === 'Goalkeeper';

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-center mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search players or teams..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-2 w-full sm:w-auto">
          {positions.map(position => (
            <Badge
              key={position}
              variant={activePosition === position ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap"
              onClick={() => setActivePosition(position)}
            >
              {position.charAt(0).toUpperCase() + position.slice(1)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Top Scorers" icon={Award} subtitle="Total points this season">
          {topScorers.length === 0
            ? <EmptyState message="No players match this filter." />
            : topScorers.map((player, index) => (
              <PlayerRow key={player.id} player={player} rank={index + 1} />
            ))}
        </StatCard>

        <StatCard title="Best Value" icon={Star} subtitle="Points per £1.0m of price">
          {bestValue.length === 0
            ? <EmptyState message="No players match this filter." />
            : bestValue.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                metricValue={formatDecimal(
                  toNumber(player.now_cost) > 0
                    ? toNumber(player.total_points) / (toNumber(player.now_cost) / 10)
                    : 0,
                  1,
                  '0.0'
                )}
                metricLabel="pts / £m"
              />
            ))}
        </StatCard>

        <StatCard title="Form Players" icon={Goal} subtitle="Average points over recent matches">
          {inForm.length === 0
            ? <EmptyState message="No players match this filter." />
            : inForm.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                metricValue={formatDecimal(player.form, 1, '0.0')}
                metricLabel="form"
              />
            ))}
        </StatCard>

        <StatCard
          title="Defensive Contribution"
          icon={Shield}
          subtitle="New for 2026/27 — 2 pts per qualifying match"
        >
          {keepersOnly ? (
            <EmptyState message="Goalkeepers do not earn Defensive Contribution points. Pick another position to see the leaders." />
          ) : defconLeaders.length === 0 ? (
            <EmptyState message="No defensive contribution recorded yet." />
          ) : (
            defconLeaders.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                metricValue={formatCount(player.defensive_contribution)}
                metricLabel={`${formatDecimal(player.defensive_contribution_per_90, 1, '0.0')} per 90`}
              />
            ))
          )}
        </StatCard>

        <StatCard title="Price Risers" icon={TrendingUp} subtitle="Progress toward a price rise">
          {risers.length === 0
            ? <EmptyState message="No projected risers right now." />
            : risers.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                metricValue={player.priceMove.value}
                metricLabel={player.priceMove.label}
              />
            ))}
        </StatCard>

        <StatCard title="Price Fallers" icon={TrendingDown} subtitle="Progress toward a price fall">
          {fallers.length === 0
            ? <EmptyState message="No projected fallers right now." />
            : fallers.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={index + 1}
                metricValue={player.priceMove.value}
                metricLabel={player.priceMove.label}
              />
            ))}
        </StatCard>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Defensive Contribution counts tackles, clearances, blocks and interceptions (plus recoveries
        for midfielders and forwards). Price percentages show how far a player has moved toward a
        change under FPL's dynamic pricing, with FPL's own likelihood rating out of five.
      </p>
    </div>
  );
};

export default PlayerStatisticsHub;
