import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  Trophy,
  Star,
  BarChart,
  Users,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

const API_URL = process.env.REACT_APP_API_URL || 'https://hvgotlfiwwirfpezvxhp.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Z290bGZpd3dpcmZwZXp2eGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDMwNDAsImV4cCI6MjA3NDUxOTA0MH0.DKs4wMlerIHnXfS3DxRkQugktFEZo-rgsSpRFsmKXJE';

const Dashboard = ({ leagueId: propLeagueId }) => {
  const { leagueId: urlLeagueId } = useParams();
  const leagueId = urlLeagueId || propLeagueId || process.env.REACT_APP_LEAGUE_ID || '1176282';
  const [bootstrapData, setBootstrapData] = useState(null);
  const [leagueData, setLeagueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentGameweek, setCurrentGameweek] = useState(null);
  const [weeklyMatchups, setWeeklyMatchups] = useState(null);
  const [transferView, setTransferView] = useState('in'); // 'in' or 'out'
  const [gameweekResults, setGameweekResults] = useState([]);
  const [selectedGameweek, setSelectedGameweek] = useState(6); // Default to gameweek 6


  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        const headers = {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        };

        // Fetch bootstrap data - Updated URL
        const bootstrapResponse = await fetch(`${API_URL}/bootstrap-static`, { headers });
        if (!bootstrapResponse.ok) {
          throw new Error('Failed to fetch bootstrap data');
        }
        const bootstrapResult = await bootstrapResponse.json();
        console.log('Bootstrap Data:', bootstrapResult); // Add logging
        setBootstrapData(bootstrapResult);

        // Find current gameweek
        const current = bootstrapResult.events?.find(gw => gw.is_current);
        if (!current) {
          console.warn('No current gameweek found');
        }
        console.log('Current Gameweek:', current); // Add logging
        setCurrentGameweek(current || null);

        // Fetch league standings - Updated URL
        const leagueResponse = await fetch(`${API_URL}/league-standings/${leagueId}/standings`, { headers });
        const leagueResult = await leagueResponse.json();

        // Initialize leagueData as an empty array if the response is null/undefined
        setLeagueData(Array.isArray(leagueResult) ? leagueResult : []);

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
        setLeagueData([]);
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      fetchAllData();
    }
  }, [leagueId]);

  useEffect(() => {
    const fetchWeeklyMatchups = async () => {
      if (!currentGameweek?.id) return;

      try {
        const headers = {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        };
        // Updated URL
        const matchupsResponse = await fetch(
          `${API_URL}/weekly-matchups/${leagueId}?event=${currentGameweek.id}`,
          { headers }
        );
        const matchupsResult = await matchupsResponse.json();
        setWeeklyMatchups(matchupsResult);
      } catch (err) {
        console.error('Error fetching weekly matchups:', err);
      }
    };

    fetchWeeklyMatchups();
  }, [leagueId, currentGameweek?.id]);

  // Fetch real match results for selected gameweek
  useEffect(() => {
    const fetchGameweekResults = async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        };
        const response = await fetch(`${API_URL}/fixtures/${selectedGameweek}`, { headers });
        if (!response.ok) {
          throw new Error('Failed to fetch fixtures');
        }
        const results = await response.json();
        setGameweekResults(results);
      } catch (err) {
        console.error('Error fetching gameweek results:', err);
        setGameweekResults([]);
      }
    };

    fetchGameweekResults();
  }, [selectedGameweek]);


  // Data processing functions
  const getGameweekTopPerformers = () => {
    if (!bootstrapData?.elements) return [];
    return bootstrapData.elements
      .sort((a, b) => b.event_points - a.event_points)
      .slice(0, 5)
      .map(player => ({
        id: player.id,
        name: player.second_name,
        points: player.event_points,
        team: bootstrapData.teams.find(t => t.id === player.team)?.short_name || ''
      }));
  };

  const getTransferTrends = () => {
    if (!bootstrapData?.elements) return { in: [], out: [] };

    const transfersIn = bootstrapData.elements
      .sort((a, b) => b.transfers_in_event - a.transfers_in_event)
      .slice(0, 5)
      .map(player => ({
        id: player.id,
        name: player.second_name,
        transfers: player.transfers_in_event,
        team: bootstrapData.teams.find(t => t.id === player.team)?.short_name || ''
      }));

    const transfersOut = bootstrapData.elements
      .sort((a, b) => b.transfers_out_event - a.transfers_out_event)
      .slice(0, 5)
      .map(player => ({
        id: player.id,
        name: player.second_name,
        transfers: player.transfers_out_event,
        team: bootstrapData.teams.find(t => t.id === player.team)?.short_name || ''
      }));

    return { in: transfersIn, out: transfersOut };
  };


  const getGameweekSummary = () => {
    if (!currentGameweek) return null;

    // Add logging to debug the data
    console.log('Current Gameweek Data:', currentGameweek);

    // Add null checks and default values
    const chipPlays = currentGameweek.chip_plays || [];
    const summary = {
      averagePoints: currentGameweek.average_entry_score || 0,
      highestPoints: currentGameweek.highest_score || 0,
      mostCaptained: bootstrapData?.elements?.find(p =>
        p.id === currentGameweek.most_captained
      ),
      mostViceCaptained: bootstrapData?.elements?.find(p =>
        p.id === currentGameweek.most_vice_captained
      ),
      chipUsage: {
        wildcard: chipPlays.find(c => c.chip_name === 'wildcard')?.num_plays || 0,
        benchBoost: chipPlays.find(c => c.chip_name === 'bboost')?.num_plays || 0,
        tripleCaptain: chipPlays.find(c => c.chip_name === '3xc')?.num_plays || 0,
        freeHit: chipPlays.find(c => c.chip_name === 'freehit')?.num_plays || 0,
      }
    };

    console.log('Processed Summary:', summary);
    console.log('Chip Plays:', currentGameweek.chip_plays);
    return summary;
  };




  const getLeagueAverageScore = () => {
    // Updated to handle direct array
    const matchupsData = weeklyMatchups || [];
    if (!Array.isArray(matchupsData) || matchupsData.length === 0) return 0;

    const allScores = matchupsData.flatMap(match => [
      match.entry_1_points,
      match.entry_2_points
    ]);

    const sum = allScores.reduce((acc, score) => acc + score, 0);
    return Math.round(sum / allScores.length);
  };

  const HeaderCard = ({ children }) => (
    <Card className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
      <CardHeader>
        {children}
      </CardHeader>
    </Card>
  );

  const SectionHeader = ({ icon, title }) => (
    <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
      <CardTitle className="card-header-text flex items-center">
        {React.cloneElement(icon, { className: 'h-6 w-6 mr-2 card-header-text' })}
        <span>{title}</span>
      </CardTitle>
    </CardHeader>
  );

  const StatBox = ({ value, label }) => (
    <div className="text-center p-4 bg-muted rounded-lg">
      <div className="text-2xl font-bold text-primary">
        {value}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );

  const ListItem = ({ leadingText, mainText, trailingText, color = "primary", variant = "default" }) => (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <div className="flex items-center">
        <span className={`text-${color} font-bold mr-2`}>{leadingText}</span>
        <span className="text-foreground">{mainText}</span>
      </div>
      <span className={`font-bold ${variant === "negative" ? "text-destructive" : `text-${color}`}`}>
        {trailingText}
      </span>
    </div>
  );

  // Update the player link component
  const PlayerLink = ({ index, player, showPoints = true }) => (
    <Link
      to={`/player/${player.id}`}
      className="flex items-center justify-between border-b border-border pb-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors"
    >
      <div className="flex items-center">
        <span className="text-primary font-bold mr-2">{index + 1}.</span>
        <span className="text-foreground">{player.name}</span>
        <span className="text-muted-foreground text-sm ml-2">({player.team})</span>
      </div>
      {showPoints && (
        <div className="flex items-center space-x-2">
          <span className="font-bold text-primary">{player.points} pts</span>
          <ChevronRight className="w-4 h-4 text-primary/60" />
        </div>
      )}
    </Link>
  );

  // Team colors mapping for Premier League teams
  const getTeamColors = (teamCode) => {
    const teamColors = {
      'ARS': { primary: '#EF0107', secondary: '#FFFFFF' }, // Arsenal - Red/White
      'AVL': { primary: '#95BFE5', secondary: '#670E36' }, // Aston Villa - Claret/Blue
      'BOU': { primary: '#DA020E', secondary: '#000000' }, // Bournemouth - Red/Black
      'BRE': { primary: '#E30613', secondary: '#FFFFFF' }, // Brentford - Red/White
      'BHA': { primary: '#0057B8', secondary: '#FFCD00' }, // Brighton - Blue/White
      'BUR': { primary: '#6C1D45', secondary: '#99D6EA' }, // Burnley - Claret/Blue
      'CHE': { primary: '#034694', secondary: '#FFFFFF' }, // Chelsea - Blue/White
      'CRY': { primary: '#1B458F', secondary: '#A7A5A6' }, // Crystal Palace - Blue/Red
      'EVE': { primary: '#003399', secondary: '#FFFFFF' }, // Everton - Blue/White
      'FUL': { primary: '#FFFFFF', secondary: '#000000' }, // Fulham - White/Black
      'LEE': { primary: '#FFFFFF', secondary: '#1D428A' }, // Leeds - White/Blue
      'LIV': { primary: '#C8102E', secondary: '#FFFFFF' }, // Liverpool - Red/White
      'MCI': { primary: '#6CABDD', secondary: '#FFFFFF' }, // Man City - Sky Blue/White
      'MUN': { primary: '#DA020E', secondary: '#FBE122' }, // Man United - Red/Yellow
      'NEW': { primary: '#241F20', secondary: '#FFFFFF' }, // Newcastle - Black/White
      'NFO': { primary: '#DD0000', secondary: '#FFFFFF' }, // Nottingham Forest - Red/White
      'SUN': { primary: '#EB172B', secondary: '#FFFFFF' }, // Sunderland - Red/White
      'TOT': { primary: '#132257', secondary: '#FFFFFF' }, // Tottenham - Navy/White
      'WHU': { primary: '#7A263A', secondary: '#1BB1E7' }, // West Ham - Claret/Blue
      'WOL': { primary: '#FDB913', secondary: '#231F20' }, // Wolves - Gold/Black
    };

    return teamColors[teamCode] || { primary: '#6B7280', secondary: '#FFFFFF' }; // Default gray
  };

  const getGameweekResults = () => {
    // Return real data from state instead of mock data
    return gameweekResults;
  };

  // Rest of your JSX remains the same, but now let's use the processed data:
  return (
    <div className="space-y-6">
      <HeaderCard>
        <CardTitle className="card-header-text text-3xl">
          FPL League Hub Dashboard
        </CardTitle>
        <CardDescription className="card-header-text-secondary">
          <div className="flex items-center space-x-4">
            <span>League ID: {leagueId}</span>
            {currentGameweek && (
              <Badge variant="secondary" className="bg-primary-darker/50 card-header-text">
                Gameweek {currentGameweek.id}
              </Badge>
            )}
          </div>
        </CardDescription>
      </HeaderCard>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <SectionHeader
              icon={<Star />}
              title={`Gameweek ${currentGameweek?.id} Top Performers`}
            />
            <CardContent className="pt-6">
              <div className="space-y-4">
                {getGameweekTopPerformers().map((player, index) => (
                  <PlayerLink
                    key={player.id}
                    index={index}
                    player={player}
                  />
                ))}
              </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center justify-between">
                <div className="flex items-center">
                  <ArrowUp className="h-6 w-6 mr-2 card-header-text" />
                  Transfer Trends
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="card-header-text flex items-center space-x-1 hover:bg-white/10 px-2 py-1 rounded">
                    <span className="text-sm">
                      {transferView === 'in' ? 'Transferred In' : 'Transferred Out'}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setTransferView('in')}>
                      Most Transferred In
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTransferView('out')}>
                      Most Transferred Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {transferView === 'in'
                  ? getTransferTrends().in.map((player, index) => (
                      <Link
                        key={player.id}
                        to={`/player/${player.id}`}
                        className="flex items-center justify-between border-b pb-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="ranking-number">{index + 1}.</span>
                          <span>{player.name}</span>
                          <span className="text-muted-foreground text-sm ml-2">({player.team})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-success-color">+{player.transfers}</span>
                          <ChevronRight className="w-4 h-4 text-primary/60" />
                        </div>
                      </Link>
                    ))
                  : getTransferTrends().out.map((player, index) => (
                      <Link
                        key={player.id}
                        to={`/player/${player.id}`}
                        className="flex items-center justify-between border-b pb-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors"
                      >
                        <div className="flex items-center">
                          <span className="ranking-number">{index + 1}.</span>
                          <span>{player.name}</span>
                          <span className="text-muted-foreground text-sm ml-2">({player.team})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-destructive">-{player.transfers}</span>
                          <ChevronRight className="w-4 h-4 text-primary/60" />
                        </div>
                      </Link>
                    ))
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <BarChart className="h-6 w-6 mr-2 card-header-text" />
                Gameweek Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <StatBox
                  value={getGameweekSummary()?.averagePoints || 0}
                  label="Avg. Points"
                />
                <StatBox
                  value={getGameweekSummary()?.highestPoints || 0}
                  label="Highest Score"
                />
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">Chip Usage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="block text-muted-foreground">Wildcard:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.wildcard || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-muted-foreground">Bench Boost:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.benchBoost || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-muted-foreground">Triple Captain:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.tripleCaptain || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-muted-foreground">Free Hit:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.freeHit || 0}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Form & Captaincy - Moved from right column */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <Users className="h-6 w-6 mr-2 card-header-text" />
                Team Form & Captaincy
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Most Captained</h3>
                  {getGameweekSummary()?.mostCaptained && (
                    <div className="flex items-center justify-between border-b pb-2">
                      <span>
                        {getGameweekSummary().mostCaptained.second_name}
                      </span>
                      <Badge variant="secondary">Captain</Badge>
                    </div>
                  )}
                  {getGameweekSummary()?.mostViceCaptained && (
                    <div className="flex items-center justify-between border-b pb-2">
                      <span>
                        {getGameweekSummary().mostViceCaptained.first_name}{' '}
                        {getGameweekSummary().mostViceCaptained.second_name}
                      </span>
                      <Badge variant="outline">Vice</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">League Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Teams:</span>
                      <span className="font-semibold">{leagueData?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Score:</span>
                      <span className="font-semibold">
                        {getLeagueAverageScore()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <Trophy className="h-6 w-6 mr-2 card-header-text" />
                Results
              </CardTitle>
              <CardDescription className="card-header-text">
                Gameweek {selectedGameweek} Match Results
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                    {[1, 2, 3, 4, 5, 6].map((gw) => (
                      <button
                        key={gw}
                        onClick={() => setSelectedGameweek(gw)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          gw === selectedGameweek
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {gw}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {getGameweekResults().map((match, index) => {
                    const homeColors = getTeamColors(match.homeTeam.abbreviation);
                    const awayColors = getTeamColors(match.awayTeam.abbreviation);

                    return (
                      <div key={index} className="grid grid-cols-3 items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        {/* Home Team */}
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                            style={{
                              backgroundColor: homeColors.primary,
                              color: homeColors.secondary
                            }}
                          >
                            <span className="text-xs font-bold">
                              {match.homeTeam.abbreviation}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{match.homeTeam.abbreviation}</span>
                        </div>

                        {/* Score - Perfectly Centered */}
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm">
                            {match.homeScore}
                          </div>
                          <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm">
                            {match.awayScore}
                          </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center justify-end space-x-3">
                          <span className="text-sm font-medium">{match.awayTeam.abbreviation}</span>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                            style={{
                              backgroundColor: awayColors.primary,
                              color: awayColors.secondary
                            }}
                          >
                            <span className="text-xs font-bold">
                              {match.awayTeam.abbreviation}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {getGameweekResults().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No match results available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;