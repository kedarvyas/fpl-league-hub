import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const SUPABASE_URL = 'https://hvgotlfiwwirfpezvxhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z290bGZpd3dpcmZwZXp2eGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDMwNDAsImV4cCI6MjA3NDUxOTA0MH0.DKs4wMlerIHnXfS3DxRkQugktFEZo-rgsSpRFsmKXJE';
const API_URL = process.env.REACT_APP_API_URL || 'https://hvgotlfiwwirfpezvxhp.supabase.co/functions/v1';

const MyTeam = () => {
  const location = useLocation();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [activeTab, setActiveTab] = useState('Live');
  const [showInput, setShowInput] = useState(true);
  const [seasonHistory, setSeasonHistory] = useState(null);
  const [previousSeasons, setPreviousSeasons] = useState(null);

  // Check if team ID was passed from Home page
  useEffect(() => {
    if (location.state?.teamId) {
      setTeamId(location.state.teamId);
      setShowInput(false); // Hide input when coming from Home page
      fetchTeamData(location.state.teamId);
      // Clear the location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchTeamData = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };

      // Fetch team data from Supabase Edge Function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/team-data?teamId=${id}`, { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch team data');
      }
      const data = await response.json();
      setTeamData(data);

      // Fetch season history data from Supabase Edge Function
      const historyResponse = await fetch(`${SUPABASE_URL}/functions/v1/team-history?teamId=${id}`, { headers });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setSeasonHistory(historyData);
      }

      // Fetch previous seasons data from Supabase Edge Function
      const previousSeasonsResponse = await fetch(`${SUPABASE_URL}/functions/v1/team-previous-seasons?teamId=${id}`, { headers });
      if (previousSeasonsResponse.ok) {
        const previousSeasonsData = await previousSeasonsResponse.json();
        setPreviousSeasons(previousSeasonsData);
      }

      setShowInput(false); // Hide input after successful load
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (teamId.trim()) {
      fetchTeamData(teamId.trim());
    }
  };

  const formatRankChange = (change) => {
    if (change === undefined || change === null) return null;
    const isPositive = change > 0; // Positive means rank improved (rank number decreased)
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-white font-medium ${
        isPositive ? 'bg-green-600' : 'bg-red-600'
      }`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>
          {isPositive ? '+' : ''}{change.toLocaleString()}
        </span>
      </div>
    );
  };

  const renderPreviousSeasons = () => {
    if (!previousSeasons || !previousSeasons.seasons || previousSeasons.seasons.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No previous season data available
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h4 className="text-xl font-semibold text-foreground">Previous Season History</h4>

        <div className="bg-muted/20 rounded-lg overflow-hidden">
          {/* Desktop Table Header */}
          <div className="hidden md:grid grid-cols-4 gap-4 p-4 bg-muted/40 border-b border-border">
            <div className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <span>Season</span>
            </div>
            <div className="text-sm font-semibold text-foreground text-center">Total Points</div>
            <div className="text-sm font-semibold text-foreground text-center">Rank</div>
            <div className="text-sm font-semibold text-foreground text-center flex items-center justify-center space-x-2">
              <span>Percentage</span>
              <div className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs text-muted-foreground">
                i
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden p-4 bg-muted/40 border-b border-border">
            <div className="text-sm font-semibold text-foreground">Season Performance</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border">
            {previousSeasons.seasons.map((season, index) => (
              <div key={season.season} className="p-4 hover:bg-muted/30 transition-colors">
                {/* Desktop Layout */}
                <div className="hidden md:grid grid-cols-4 gap-4">
                  {/* Season */}
                  <div className="text-foreground font-medium">
                    {season.season}
                  </div>

                  {/* Total Points */}
                  <div className="text-center text-foreground font-medium">
                    {season.total_points?.toLocaleString() || 'N/A'}
                  </div>

                  {/* Rank */}
                  <div className="text-center text-foreground font-medium">
                    {season.rank?.toLocaleString() || 'N/A'}
                  </div>

                  {/* Percentage with tier styling */}
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <span
                        className="text-sm font-bold px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: `${season.tier_color}20`,
                          color: season.tier_color,
                          border: `1px solid ${season.tier_color}40`
                        }}
                      >
                        {season.tier_icon} {season.percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden space-y-3">
                  {/* Season and Percentage Badge */}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold text-foreground">
                      {season.season}
                    </div>
                    <span
                      className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: `${season.tier_color}20`,
                        color: season.tier_color,
                        border: `1px solid ${season.tier_color}40`
                      }}
                    >
                      {season.tier_icon} {season.percentage}%
                    </span>
                  </div>

                  {/* Points and Rank */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Points: </span>
                      <span className="font-medium text-foreground">
                        {season.total_points?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rank: </span>
                      <span className="font-medium text-foreground">
                        {season.rank?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderRankGraph = () => {
    if (!seasonHistory || !seasonHistory.ranks || seasonHistory.ranks.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No season history available
        </div>
      );
    }

    const ranks = seasonHistory.ranks;
    const maxRank = Math.max(...ranks.map(r => r.rank));
    const minRank = Math.min(...ranks.map(r => r.rank));
    const rankRange = maxRank - minRank || 1;

    return (
      <div className="space-y-6">
        {/* Rank Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-foreground">Highest Rank</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {seasonHistory.highest_rank?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">
              Gameweek {seasonHistory.highest_rank_gw}
            </div>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-foreground">Lowest Rank</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {seasonHistory.lowest_rank?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">
              Gameweek {seasonHistory.lowest_rank_gw}
            </div>
          </div>
        </div>

        {/* Clean Minimal Line Chart */}
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-foreground mb-1">📈 Your rank across the season</h4>
            <p className="text-sm text-muted-foreground">
              Your highest overall rank so far this season was{' '}
              <span className="font-medium text-foreground">
                {seasonHistory.highest_rank?.toLocaleString() || 'N/A'}
              </span>
              {' '}in GW{seasonHistory.highest_rank_gw}, and your worst was{' '}
              <span className="font-medium text-foreground">
                {seasonHistory.lowest_rank?.toLocaleString() || 'N/A'}
              </span>
              {' '}in GW{seasonHistory.lowest_rank_gw}.
            </p>
          </div>

          <div className="relative h-80">
            <svg width="100%" height="100%" viewBox="0 0 800 320" className="bg-background">
              {/* Calculate clean Y-axis range - INVERTED */}
              {(() => {
                // Round max rank up to nearest million for clean scaling
                const maxRankRounded = Math.ceil(maxRank / 1000000) * 1000000;
                const yAxisSteps = Math.ceil(maxRankRounded / 1000000);

                // Chart dimensions with more padding
                const chartLeft = 60;
                const chartRight = 740;
                const chartTop = 20;
                const chartBottom = 260;
                const chartWidth = chartRight - chartLeft;
                const chartHeight = chartBottom - chartTop;

                return (
                  <g>
                    {/* Horizontal grid lines - very subtle */}
                    {Array.from({length: yAxisSteps + 1}, (_, i) => {
                      const y = chartTop + (i / yAxisSteps) * chartHeight;
                      return (
                        <line
                          key={i}
                          x1={chartLeft}
                          y1={y}
                          x2={chartRight}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Vertical grid lines - very subtle */}
                    {ranks.map((rank, index) => {
                      const x = chartLeft + (index / (ranks.length - 1)) * chartWidth;
                      return (
                        <line
                          key={index}
                          x1={x}
                          y1={chartTop}
                          x2={x}
                          y2={chartBottom}
                          stroke="#f8fafc"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Y-axis labels */}
                    {Array.from({length: yAxisSteps + 1}, (_, i) => {
                      const rankValue = (i / yAxisSteps) * maxRankRounded;
                      const y = chartTop + (i / yAxisSteps) * chartHeight;

                      return (
                        <text
                          key={i}
                          x={chartLeft - 15}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="12"
                          fill="#64748b"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          {rankValue === 0 ? '1' : `${Math.round(rankValue / 1000000)}m`}
                        </text>
                      );
                    })}

                    {/* X-axis labels */}
                    {ranks.map((rank, index) => {
                      const x = chartLeft + (index / (ranks.length - 1)) * chartWidth;
                      return (
                        <text
                          key={rank.gameweek}
                          x={x}
                          y={chartBottom + 20}
                          textAnchor="middle"
                          fontSize="12"
                          fill="#64748b"
                          fontFamily="system-ui, -apple-system, sans-serif"
                        >
                          GW{rank.gameweek}
                        </text>
                      );
                    })}

                    {/* Main line path - clean blue line */}
                    <path
                      d={ranks.map((rank, index) => {
                        const x = chartLeft + (index / (ranks.length - 1)) * chartWidth;
                        const y = chartTop + (rank.rank / maxRankRounded) * chartHeight;
                        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data points with hover */}
                    {ranks.map((rank, index) => {
                      const x = chartLeft + (index / (ranks.length - 1)) * chartWidth;
                      const y = chartTop + (rank.rank / maxRankRounded) * chartHeight;
                      const isHighest = rank.rank === seasonHistory.highest_rank;
                      const isLowest = rank.rank === seasonHistory.lowest_rank;

                      return (
                        <g key={rank.gameweek}>
                          {/* Data point circle */}
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#3b82f6"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-6 transition-all"
                          />

                          {/* Larger invisible hover area */}
                          <circle
                            cx={x}
                            cy={y}
                            r="15"
                            fill="transparent"
                            className="cursor-pointer"
                          >
                            <title>GW{rank.gameweek}: Overall rank #{rank.rank.toLocaleString()}</title>
                          </circle>

                          {/* Special highlighting for best/worst */}
                          {isHighest && (
                            <text
                              x={x}
                              y={y - 15}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#10b981"
                              fontWeight="600"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              Best
                            </text>
                          )}

                          {isLowest && (
                            <text
                              x={x}
                              y={y - 15}
                              textAnchor="middle"
                              fontSize="10"
                              fill="#ef4444"
                              fontWeight="600"
                              fontFamily="system-ui, -apple-system, sans-serif"
                            >
                              Worst
                            </text>
                          )}
                        </g>
                      );
                    })}

                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Team</h1>
          <p className="text-muted-foreground">
            Enter your FPL Team ID to view your team statistics and performance
          </p>
        </div>

        {/* Team ID Input */}
        {showInput && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Enter Team ID</span>
              </CardTitle>
              <CardDescription>
                Find your Team ID in the FPL website URL when viewing your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex space-x-4">
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="e.g., 4656161"
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={loading || !teamId.trim()}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load Team'}
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Team Data Display */}
        {teamData && (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
              {['Live', 'Pick'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Live Tab Content */}
            {activeTab === 'Live' && (
              <div className="space-y-8">
                {/* Team Info Section */}
                <Card className="bg-gradient-to-r from-muted/20 to-muted/10 border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Team ID</p>
                        <p className="text-lg font-bold text-foreground">{teamData.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Team Name</p>
                        <p className="text-lg font-bold text-foreground">{teamData.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Manager</p>
                        <p className="text-lg font-bold text-foreground">
                          {teamData.player_first_name && teamData.player_last_name
                            ? `${teamData.player_first_name} ${teamData.player_last_name}`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Live Rank Section */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Live Rank</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Gameweek */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          <Target className="w-5 h-5" />
                          <span>Gameweek</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {teamData.current_event || 'N/A'}
                        </div>
                        {teamData.wildcards_played && teamData.wildcards_played.length > 0 && (
                          <Badge variant="secondary" className="mt-2">
                            Wildcard chip in play
                          </Badge>
                        )}
                      </CardContent>
                    </Card>

                    {/* GW Points */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">GW Points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {teamData.summary_event_points || 0}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Total Points */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Total Points</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          {teamData.summary_overall_points || 0}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Rank Change */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Rank Change</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col items-start space-y-2">
                          {formatRankChange(teamData.rank_change)}
                          <div className="text-sm text-muted-foreground">
                            Current: {teamData.summary_overall_rank?.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Season History Section */}
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Season History</h3>
                  <p className="text-sm text-muted-foreground mb-6">Your rank throughout the season</p>

                  <Card>
                    <CardContent className="pt-6">
                      {renderRankGraph()}
                    </CardContent>
                  </Card>

                  {/* Previous Seasons Table */}
                  <Card>
                    <CardContent className="pt-6">
                      {renderPreviousSeasons()}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Pick Tab Content - Placeholder for now */}
            {activeTab === 'Pick' && (
              <Card>
                <CardHeader>
                  <CardTitle>Team Lineup</CardTitle>
                  <CardDescription>
                    Team lineup and picks will be displayed here (coming soon)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    This section will show your team's lineup for the current gameweek.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTeam;