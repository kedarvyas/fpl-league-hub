import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography, CircularProgress, Select, MenuItem, Collapse } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import FootballPitchMatchup from './FootballPitchMatchup';
import VerticalFootballPitchMatchup from './VerticalFootballPitchMatchup';
import LeagueTable from './LeagueTable';
import GameweekStats from './GameweekStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useLocalStorage } from '../hooks/useLocalStorage';
import { API_URL, SUPABASE_ANON_KEY } from '../config/supabase';


const MatchupRow = ({ matchup, isExpanded, onToggle, eventId, leagueId, onManagerClick }) => {
  const [matchDetails, setMatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isExpanded && !matchDetails && leagueId) {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      };
      fetch(`${API_URL}/matchup/${matchup.id}?event=${eventId}&leagueId=${leagueId}`, { headers })
      .then(response => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(data => {
          setMatchDetails(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching matchup details:', error);
          setError(error.message);
          setLoading(false);
        });
    }
  }, [isExpanded, matchup.id, eventId, leagueId, matchDetails]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-card text-card-foreground rounded-lg shadow-md mb-4 overflow-hidden"
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        className="flex justify-between items-center gap-2 p-3 md:p-4 min-h-[64px] cursor-pointer hover:bg-muted/50 transition-colors duration-150"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-sm md:text-base truncate leading-tight">{matchup.entry_1_name}</p>
          <button
            type="button"
            className="text-xs text-muted-foreground truncate max-w-full block text-left py-2.5 -my-1 hover:text-primary hover:underline transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onManagerClick(matchup.entry_1_entry);
            }}
          >
            {matchup.entry_1_player_name}
          </button>
        </div>
        <div className="flex-shrink-0">
          <p className="text-lg md:text-xl font-bold whitespace-nowrap">
            <span className="text-purple-700">{matchup.entry_1_points}</span>
            {' - '}
            <span className="text-purple-700">{matchup.entry_2_points}</span>
          </p>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-semibold text-sm md:text-base truncate leading-tight">{matchup.entry_2_name}</p>
          <button
            type="button"
            className="text-xs text-muted-foreground truncate max-w-full block text-right w-full py-2.5 -my-1 hover:text-primary hover:underline transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onManagerClick(matchup.entry_2_entry);
            }}
          >
            {matchup.entry_2_player_name}
          </button>
        </div>
      </div>
      <Collapse in={isExpanded} unmountOnExit>
        <div className="p-2 md:p-4 bg-muted">
          {loading && <CircularProgress />}
          {error && <div className="text-red-500">{error}</div>}
          {!loading && !error && matchDetails && (
            <>
              {/* Stacked list on phones/tablets, pitch graphic from xl up, where it has room - CSS, not JS */}
              <div className="xl:hidden">
                <VerticalFootballPitchMatchup matchData={matchDetails} />
              </div>
              <div className="hidden xl:block">
                <FootballPitchMatchup matchData={matchDetails} />
              </div>
            </>
          )}
        </div>
      </Collapse>
    </motion.div>
  );
};

// Shared list used by League Performance / League Insights. Rows are real
// buttons with a finger-sized hit area on touch, compact again from lg up.
const ManagerRankList = ({ title, managers, valueKey, tone, onManagerClick }) => {
  const toneClass = tone === 'negative' ? 'text-red-600' : 'text-primary';
  return (
    <div>
      <h3 className="font-semibold mb-1 text-xs">{title}</h3>
      <ul className="divide-y divide-border">
        {managers.map((manager, index) => (
          <li key={manager.entry}>
            <button
              type="button"
              onClick={() => onManagerClick(manager.entry)}
              className="w-full flex items-center justify-between gap-2 text-xs text-left min-h-[44px] py-2 lg:min-h-0 lg:py-1.5 hover:text-primary transition-colors"
            >
              <span className="flex items-center min-w-0">
                <span className={`font-bold mr-2 flex-shrink-0 ${toneClass}`}>{index + 1}.</span>
                <span className="truncate">{manager.display_name}</span>
              </span>
              <span className={`font-bold flex-shrink-0 ${toneClass}`}>
                {manager[valueKey]} pts
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const WeeklyMatchups = () => {
  const navigate = useNavigate();
  const { leagueId: urlLeagueId } = useParams();

  // Use localStorage to persist league ID
  const [savedLeagueId, setSavedLeagueId] = useLocalStorage('fpl_league_id', '');

  // Determine which league ID to use: URL > saved > nothing (no env fallback)
  const LEAGUE_ID = urlLeagueId || savedLeagueId || null;

  // State for showing input form
  const [showInput, setShowInput] = useState(!LEAGUE_ID);
  const [inputLeagueId, setInputLeagueId] = useState('');

  const [matchups, setMatchups] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(!!LEAGUE_ID);
  const [error, setError] = useState(null);
  const [expandedMatchup, setExpandedMatchup] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [leaguePerformance, setLeaguePerformance] = useState({ topManagers: [], bottomManagers: [] });
  const [leagueInsights, setLeagueInsights] = useState({ topFour: [], bottomThree: [] });

  // Save league ID to localStorage when URL param changes
  useEffect(() => {
    if (urlLeagueId && urlLeagueId !== savedLeagueId) {
      setSavedLeagueId(urlLeagueId);
      setShowInput(false);
    }
  }, [urlLeagueId, savedLeagueId, setSavedLeagueId]);

  // Navigate to manager's team page
  const handleManagerClick = (teamId) => {
    navigate('/my-team', { state: { teamId: teamId.toString() } });
  };

  // Handle league ID form submission
  const handleLeagueIdSubmit = (e) => {
    e.preventDefault();
    if (inputLeagueId.trim()) {
      setSavedLeagueId(inputLeagueId.trim());
      setShowInput(false);
      // Navigate with the new league ID
      navigate(`/weekly-matchups/${inputLeagueId.trim()}`);
    }
  };


  useEffect(() => {
    if (!LEAGUE_ID) return;

    const fetchEvents = async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        };
        const response = await fetch(`${API_URL}/bootstrap-static`, { headers });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const eventsList = data.events.map(event => ({
          id: event.id,
          name: `Gameweek ${event.id}`,
          isCurrent: event.is_current,
          isNext: event.is_next,
        }));
        setEvents(eventsList);
        const current = eventsList.find(event => event.isCurrent);
        if (current) {
          setSelectedEvent(current.id);
        } else {
          const next = eventsList.find(event => event.isNext);
          if (next) {
            setSelectedEvent(next.id);
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to fetch events: ' + error.message);
      }
    };

    fetchEvents();
  }, [LEAGUE_ID]);

  useEffect(() => {
    if (selectedEvent) {
      const fetchMatchups = async () => {
        setLoading(true);
        setError(null);
        try {
          const headers = {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          };
          const url = `${API_URL}/weekly-matchups/${LEAGUE_ID}?event=${selectedEvent}`;
          console.log('Fetching matchups from:', url); // Debug log
          const response = await fetch(url, { headers });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText); // Debug log
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          if (!data.results && !Array.isArray(data)) {
            throw new Error('Invalid data format received');
          }
          
          // Handle both data formats (with .results and direct array)
          const matchupsData = data.results || data;
          setMatchups(matchupsData);
        } catch (error) {
          console.error('Error fetching matchups:', error);
          setError('Failed to load matchups: ' + error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchMatchups();
    }
  }, [selectedEvent]);

  useEffect(() => {
    if (!LEAGUE_ID) return;

    const fetchStandings = async () => {
      try {
        const headers = {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        };
        const response = await fetch(`${API_URL}/league-standings/${LEAGUE_ID}/standings`, { headers });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStandings(data);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setError('Failed to fetch standings: ' + error.message);
      }
    };

    fetchStandings();
  }, [LEAGUE_ID]);

  // Fetch league performance data
  useEffect(() => {
    const fetchLeaguePerformanceData = async () => {
      if (!selectedEvent || !matchups.length || !standings.length) return;

      try {
        // Get league performance (top/bottom managers this week)
        const matchScores = matchups.flatMap(match => [
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

        const sortedByPoints = matchScores.sort((a, b) => b.points - a.points);
        const topManagers = sortedByPoints.slice(0, 3);
        const bottomManagers = sortedByPoints.slice(-3).reverse();

        setLeaguePerformance({ topManagers, bottomManagers });

        // Get league insights (top/bottom overall standings)
        const sortedByTotal = [...standings].sort((a, b) => b.total - a.total);
        const topFour = sortedByTotal.slice(0, 4).map(manager => ({
          ...manager,
          display_name: manager.player_name,
          points: manager.total
        }));
        const bottomThree = sortedByTotal.slice(-3).map(manager => ({
          ...manager,
          display_name: manager.player_name,
          points: manager.total
        }));

        setLeagueInsights({ topFour, bottomThree });
      } catch (error) {
        console.error('Error processing league performance data:', error);
      }
    };

    fetchLeaguePerformanceData();
  }, [selectedEvent, matchups, standings]);

  const handleToggleExpand = (matchupId) => {
    setExpandedMatchup(expandedMatchup === matchupId ? null : matchupId);
  };

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value);
  };

  // Show empty state if no league ID is set
  if (showInput || !LEAGUE_ID) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">H2H League Info</h1>
            <p className="text-muted-foreground">
              Enter your FPL H2H League ID to view matchups and league standings
            </p>
          </div>

          {/* League ID Input */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Enter H2H League ID</span>
              </CardTitle>
              <CardDescription>
                Find your League ID in the FPL website URL when viewing your H2H league
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLeagueIdSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={inputLeagueId}
                  onChange={(e) => setInputLeagueId(e.target.value)}
                  placeholder="e.g., 1164871"
                  className="flex-1 min-w-0 px-4 py-3 min-h-[48px] text-base bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
                <button
                  type="submit"
                  className="px-6 py-3 min-h-[48px] bg-primary hover:bg-primary-darker text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!inputLeagueId.trim()}
                >
                  View League
                </button>
              </form>
              <p className="text-sm text-muted-foreground mt-4 break-words">
                Find your League ID in the URL: fantasy.premierleague.com/leagues/<strong>1164871</strong>/standings/h
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen p-2 md:p-4"> {/* Changed from bg-gray-100 */}
      <div className="w-full mx-auto">
        {/*
          Mobile is a single column ordered by importance: matchups first, then
          the standings block, then gameweek stats. From md up this becomes the
          familiar 3 / 6 / 3 desktop layout via `order-*`.
        */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:items-start gap-4">
          {/* League Table + standings context - left column on desktop, second on mobile */}
          <div className="order-2 lg:order-1 lg:col-span-3 min-w-0 space-y-4">
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-4">
              <Typography variant="h6" className="mb-2 font-semibold text-card-foreground text-sm">
                League Table
              </Typography>
              <LeagueTable standings={standings} />
            </div>

            {/* League Performance */}
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-4">
              <Typography variant="h6" className="mb-3 font-semibold text-card-foreground text-sm">
                League Performance
              </Typography>
              <div className="space-y-4">
                <ManagerRankList
                  title="Top Managers This Week"
                  managers={leaguePerformance.topManagers}
                  valueKey="points"
                  onManagerClick={handleManagerClick}
                />
                <ManagerRankList
                  title="Bottom Managers This Week"
                  managers={leaguePerformance.bottomManagers}
                  valueKey="points"
                  tone="negative"
                  onManagerClick={handleManagerClick}
                />
              </div>
            </div>

            {/* League Insights */}
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-4">
              <Typography variant="h6" className="mb-3 font-semibold text-card-foreground text-sm">
                League Insights
              </Typography>
              <div className="space-y-4">
                <ManagerRankList
                  title="Top Four 🏆"
                  managers={leagueInsights.topFour}
                  valueKey="total"
                  onManagerClick={handleManagerClick}
                />
                <ManagerRankList
                  title="Bottom Three 💩"
                  managers={leagueInsights.bottomThree}
                  valueKey="total"
                  tone="negative"
                  onManagerClick={handleManagerClick}
                />
              </div>
            </div>
          </div>
          {/* Weekly Matchups - the primary content, so it comes first on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-6 xl:col-span-7 min-w-0">
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-3 md:p-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                <Typography variant="h6" className="text-card-foreground font-bold">
                  Weekly Matchups
                </Typography>
                <Select
                  value={selectedEvent || ''}
                  onChange={handleEventChange}
                  size="small"
                  className="w-full sm:w-auto sm:min-w-[170px] bg-card text-sm"
                  sx={{
                    color: 'inherit',
                    '& .MuiSelect-select': { minHeight: '44px', display: 'flex', alignItems: 'center', boxSizing: 'border-box' },
                    '& .MuiSvgIcon-root': { color: 'inherit' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'hsl(var(--border))' },
                  }}
                >
                  {events.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name} {event.isCurrent ? '(Current)' : ''}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <CircularProgress />
                </div>
              ) : error ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                  {error}
                </div>
              ) : matchups.length === 0 ? (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded">
                  No matchups found for this gameweek.
                </div>
              ) : (
                <AnimatePresence>
                  {matchups.map((matchup) => (
                    <MatchupRow
                      key={matchup.id}
                      matchup={matchup}
                      isExpanded={expandedMatchup === matchup.id}
                      onToggle={() => handleToggleExpand(matchup.id)}
                      eventId={selectedEvent}
                      leagueId={LEAGUE_ID}
                      onManagerClick={handleManagerClick}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
          {/* Gameweek Stats - Right */}
          <div className="order-3 lg:col-span-3 xl:col-span-2 min-w-0">
            <GameweekStats eventId={selectedEvent} leagueId={LEAGUE_ID} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyMatchups;