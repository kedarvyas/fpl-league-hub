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
  
        // Fetch bootstrap data
        const bootstrapResponse = await fetch('http://localhost:8000/api/bootstrap-static');
        const bootstrapResult = await bootstrapResponse.json();
        setBootstrapData(bootstrapResult);
  
        // Find current gameweek
        const current = bootstrapResult.events?.find(gw => gw.is_current);
        setCurrentGameweek(current);
  
        // Fetch league standings - Use the correct endpoint
        const leagueResponse = await fetch(`http://localhost:8000/api/leagues/${leagueId}/standings`);
        const leagueResult = await leagueResponse.json();
        
        // Initialize leagueData as an empty array if the response is null/undefined
        setLeagueData(Array.isArray(leagueResult) ? leagueResult : []);
  
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
        // Initialize leagueData as an empty array on error
        setLeagueData([]);
      } finally {
        setLoading(false);
      }
    };
  
    if (leagueId) {  // Only fetch if leagueId exists
      fetchAllData();
    }
  }, [leagueId]);

  useEffect(() => {
    const fetchWeeklyMatchups = async () => {
      if (!currentGameweek?.id) return;

      try {
        const matchupsResponse = await fetch(`http://localhost:8000/api/weekly-matchups/${leagueId}?event=${currentGameweek.id}`);
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
    if (!weeklyMatchups?.results) return { topManagers: [], bottomManagers: [] };

    // Get scores from actual matches
    const matchScores = weeklyMatchups.results.map(match => ([
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
    ])).flat();

    // Sort by points
    const sortedByPoints = matchScores.sort((a, b) => b.points - a.points);

    return {
      topManagers: sortedByPoints.slice(0, 3),
      bottomManagers: sortedByPoints.slice(-3).reverse()
    };
  };

  const getGameweekSummary = () => {
    if (!currentGameweek) return null;

    return {
      averagePoints: currentGameweek.average_entry_score,
      highestPoints: currentGameweek.highest_score,
      mostCaptained: bootstrapData?.elements?.find(p =>
        p.id === currentGameweek.most_captained
      ),
      mostViceCaptained: bootstrapData?.elements?.find(p =>
        p.id === currentGameweek.most_vice_captained
      ),
      chipUsage: {
        wildcard: currentGameweek.chip_plays.find(c => c.chip_name === 'wildcard')?.num_plays || 0,
        benchBoost: currentGameweek.chip_plays.find(c => c.chip_name === 'bboost')?.num_plays || 0,
        tripleCaptain: currentGameweek.chip_plays.find(c => c.chip_name === '3xc')?.num_plays || 0,
        freeHit: currentGameweek.chip_plays.find(c => c.chip_name === 'freehit')?.num_plays || 0,
      }
    };
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
    if (!weeklyMatchups?.results) return 0;

    // Get all scores from the matchups
    const allScores = weeklyMatchups.results.flatMap(match => [
      match.entry_1_points,
      match.entry_2_points
    ]);

    // Calculate average
    const sum = allScores.reduce((acc, score) => acc + score, 0);
    return Math.round(sum / allScores.length);
  };

  // Rest of your JSX remains the same, but now let's use the processed data:
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-purple-800 to-purple-600">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-white">FPL League Hub Dashboard</CardTitle>
          <CardDescription className="text-purple-100">
            <div className="flex items-center space-x-4">
              <span>League ID: {leagueId}</span>
              {currentGameweek && (
                <Badge variant="secondary" className="bg-purple-700 text-white">
                  Gameweek {currentGameweek.id}
                </Badge>
              )}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
              <CardTitle className="text-white flex items-center">
                <Star className="h-6 w-6 mr-2" />
                Gameweek {currentGameweek?.id} Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {getGameweekTopPerformers().map((player, index) => (
                  <Link
                    key={player.id}
                    to={`/player/${player.id}`}
                    className="flex items-center justify-between border-b pb-2 hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="text-purple-700 font-bold mr-2">{index + 1}.</span>
                      <span>{player.name}</span>
                      <span className="text-gray-500 text-sm ml-2">({player.team})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-purple-600">{player.points} pts</span>
                      <ChevronRight className="w-4 h-4 text-purple-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
              <CardTitle className="text-white flex items-center">
                <ArrowUp className="h-6 w-6 mr-2" />
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
                      className="flex items-center justify-between border-b pb-2 hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-purple-700 font-bold mr-2">{index + 1}.</span>
                        <span>{player.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({player.team})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-green-600">+{player.transfers}</span>
                        <ChevronRight className="w-4 h-4 text-purple-400" />
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
                      className="flex items-center justify-between border-b pb-2 hover:bg-purple-50 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex items-center">
                        <span className="text-purple-700 font-bold mr-2">{index + 1}.</span>
                        <span>{player.name}</span>
                        <span className="text-gray-500 text-sm ml-2">({player.team})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-red-600">-{player.transfers}</span>
                        <ChevronRight className="w-4 h-4 text-purple-400" />
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
            <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
              <CardTitle className="text-white flex items-center">
                <Trophy className="h-6 w-6 mr-2" />
                League Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Top Managers This Week</h3>
                  {getLeaguePerformance().topManagers.map((manager, index) => (
                    <div key={manager.entry} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <span className="text-purple-700 font-bold mr-2">{index + 1}.</span>
                        <span>{manager.display_name}</span>
                      </div>
                      <span className="font-bold text-purple-600">{manager.points} pts</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Bottom Managers This Week</h3>
                  {getLeaguePerformance().bottomManagers.map((manager, index) => (
                    <div key={manager.entry} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <span className="text-red-700 font-bold mr-2">{index + 1}.</span>
                        <span>{manager.display_name}</span>
                      </div>
                      <span className="font-bold text-red-600">{manager.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
              <CardTitle className="text-white flex items-center">
                <BarChart className="h-6 w-6 mr-2" />
                Gameweek Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {getGameweekSummary()?.averagePoints || 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg. Points</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {getGameweekSummary()?.highestPoints || 0}
                  </div>
                  <div className="text-sm text-gray-600">Highest Score</div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="font-semibold">Chip Usage</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-sm">
                    <span className="block text-gray-600">Wildcard:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.wildcard || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-gray-600">Bench Boost:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.benchBoost || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-gray-600">Triple Captain:</span>
                    <span className="font-semibold">{getGameweekSummary()?.chipUsage.tripleCaptain || 0}</span>
                  </div>
                  <div className="text-sm">
                    <span className="block text-gray-600">Free Hit:</span>
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
            <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
              <CardTitle className="text-white flex items-center">
                <Users className="h-6 w-6 mr-2" />
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
                      <span className="text-gray-600">Total Teams:</span>
                      <span className="font-semibold">{leagueData?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Score:</span>
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
            <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
              <CardTitle className="text-white flex items-center">
                <BarChart className="h-6 w-6 mr-2" />
                League Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Top Four</h3>
                  {getLeagueInsights().topFour.map((manager, index) => (
                    <div key={manager.entry} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <span className="text-purple-700 font-bold mr-2">{index + 1}.</span>
                        <span>{manager.display_name}</span>
                      </div>
                      <span className="font-bold text-purple-600">{manager.total} pts</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Bottom Three</h3>
                  {getLeagueInsights().bottomThree.map((manager, index) => (
                    <div key={manager.entry} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center">
                        <span className="text-red-700 font-bold mr-2">{index + 1}.</span>
                        <span>{manager.display_name}</span>
                      </div>
                      <span className="font-bold text-red-600">{manager.total} pts</span>
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