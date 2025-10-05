import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const SUPABASE_URL = 'https://hvgotlfiwwirfpezvxhp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z290bGZpd3dpcmZwZXp2eGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDMwNDAsImV4cCI6MjA3NDUxOTA0MH0.DKs4wMlerIHnXfS3DxRkQugktFEZo-rgsSpRFsmKXJE';
const API_URL = process.env.REACT_APP_API_URL || 'https://hvgotlfiwwirfpezvxhp.supabase.co/functions/v1';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg border border-border">
      <p className="font-semibold text-foreground mb-2">GW{label}</p>
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span className="text-muted-foreground">Rank:</span>
        <span className="font-medium text-foreground">
          #{payload[0]?.value?.toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const MyTeam = () => {
  const location = useLocation();

  // Use localStorage to persist team ID
  const [savedTeamId, setSavedTeamId] = useLocalStorage('fpl_team_id', '');

  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [activeTab, setActiveTab] = useState('Live');
  const [showInput, setShowInput] = useState(!savedTeamId);
  const [seasonHistory, setSeasonHistory] = useState(null);
  const [previousSeasons, setPreviousSeasons] = useState(null);

  // Load saved team ID on mount
  useEffect(() => {
    if (savedTeamId && !location.state?.teamId) {
      setTeamId(savedTeamId);
      setShowInput(false);
      fetchTeamData(savedTeamId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if team ID was passed from Home page or another component
  useEffect(() => {
    if (location.state?.teamId) {
      const newTeamId = location.state.teamId;
      setTeamId(newTeamId);
      setSavedTeamId(newTeamId); // Save to localStorage
      setShowInput(false);
      fetchTeamData(newTeamId);
      // Clear the location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.teamId]);

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
      setSavedTeamId(teamId.trim()); // Save to localStorage
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

        {/* Recharts Line Chart */}
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

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={ranks.map(r => ({ gameweek: r.gameweek, rank: r.rank }))}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="gameweek"
                  tickFormatter={(gw) => `GW${gw}`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  reversed
                  tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}m` : value.toLocaleString()}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rank"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  fill="url(#rankGradient)"
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
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

        {/* Loading Display */}
        {loading && !teamData && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Loading team data...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Error: {error}</p>
              <button
                onClick={() => setShowInput(true)}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Try Again
              </button>
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