import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  Trophy,
  Star,
  BarChart,
  Users,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

const API_URL = process.env.REACT_APP_API_URL || 'https://fpl-league-hub-api.onrender.com';


const Dashboard = ({ leagueId }) => {
  const [bootstrapData, setBootstrapData] = useState(null);
  const [leagueData, setLeagueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentGameweek, setCurrentGameweek] = useState(null);
  const [weeklyMatchups, setWeeklyMatchups] = useState(null);


  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch bootstrap data - Updated URL
        const bootstrapResponse = await fetch(`${API_URL}/api/bootstrap-static`);
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
        const leagueResponse = await fetch(`${API_URL}/api/leagues/${leagueId}/standings`);
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
        // Updated URL
        const matchupsResponse = await fetch(
          `${API_URL}/api/weekly-matchups/${leagueId}?event=${currentGameweek.id}`
        );
        const matchupsResult = await matchupsResponse.json();
        setWeeklyMatchups(matchupsResult);
      } catch (err) {
        console.error('Error fetching weekly matchups:', err);
      }
    };

    fetchWeeklyMatchups();
  }, [leagueId, currentGameweek?.id]);


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

  const getLeaguePerformance = () => {
    // Handle both array and object with results property
    const matchupsData = weeklyMatchups?.results || weeklyMatchups || [];
    if (!Array.isArray(matchupsData) || matchupsData.length === 0) {
      return { topManagers: [], bottomManagers: [] };
    }

    // Get scores from actual matches
    const matchScores = matchupsData.flatMap(match => [
      {
        entry: match.entry_1_entry,
        display_name: match.entry_1_player_name,
        points: match.entry_1_points
      },
      {
        entry: match.entry_2_entry,
        display_name: match.entry_2_player_name,
        points: match.entry_2_points
      }
    ]);

    // Sort by points
    const sortedByPoints = matchScores.sort((a, b) => b.points - a.points);

    return {
      topManagers: sortedByPoints.slice(0, 3),
      bottomManagers: sortedByPoints.slice(-3).reverse()
    };
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



  const getLeagueInsights = () => {
    // Return early if leagueData is not an array
    if (!leagueData || !Array.isArray(leagueData)) {
      return { topFour: [], bottomThree: [] };
    }

    try {
      const sortedByTotal = [...leagueData].sort((a, b) => b.total - a.total);

      return {
        topFour: sortedByTotal.slice(0, 4).map(manager => ({
          ...manager,
          display_name: `${manager.player_name}`,
          points: manager.total
        })),
        bottomThree: sortedByTotal.slice(-3).map(manager => ({
          ...manager,
          display_name: `${manager.player_name}`,
          points: manager.total
        }))
      };
    } catch (error) {
      console.error('Error in getLeagueInsights:', error);
      return { topFour: [], bottomThree: [] };
    }
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
              <CardTitle className="card-header-text flex items-center">
                <ArrowUp className="h-6 w-6 mr-2 card-header-text" />
                Transfer Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Most Transferred In</h3>
                  {getTransferTrends().in.map((player, index) => (
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
                  ))}
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Most Transferred Out</h3>
                  {getTransferTrends().out.map((player, index) => (
                    <Link
                      key={player.id}
                      to={`/player/${player.id}`}
                      className="flex items-center justify-between border-b pb-2 hover:hover:bg-muted/50

 px-2 py-1 rounded transition-colors"
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
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <Trophy className="h-6 w-6 mr-2 card-header-text" />
                League Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Top Managers This Week</h3>
                  {getLeaguePerformance().topManagers.map((manager, index) => (
                    <ListItem
                      key={manager.entry}
                      leadingText={`${index + 1}.`}
                      mainText={manager.display_name}
                      trailingText={`${manager.points} pts`}
                    />
                  ))}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Bottom Managers This Week</h3>
                  {getLeaguePerformance().bottomManagers.map((manager, index) => (
                    <ListItem
                      key={manager.entry}
                      leadingText={`${index + 1}.`}
                      mainText={manager.display_name}
                      trailingText={`${manager.points} pts`}
                      variant="negative"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>

        {/* Right Column - Additional Stats */}
        <div className="space-y-6">
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

          <Card>
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <BarChart className="h-6 w-6 mr-2 card-header-text" />
                League Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Top Four 🏆</h3>
                  {getLeagueInsights().topFour.map((manager, index) => (
                    <div key={manager.entry} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <span className="text-primary font-bold mr-2">{index + 1}.</span>
                        <span>{manager.display_name}</span>
                      </div>
                      <span className="font-bold text-primary">{manager.total} pts</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Bottom Three 💩</h3>
                  {getLeagueInsights().bottomThree.map((manager, index) => (
                    <div key={manager.entry} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <span className="text-destructive font-bold mr-2">{index + 1}.</span>
                        <span>{manager.display_name}</span>
                      </div>
                      <span className="font-bold text-destructive">{manager.total} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;