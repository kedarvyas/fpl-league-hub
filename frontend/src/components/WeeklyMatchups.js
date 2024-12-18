import React, { useState, useEffect } from 'react';
import { Typography, CircularProgress, Select, MenuItem, Collapse } from '@mui/material';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import FootballPitchMatchup from './FootballPitchMatchup';
import VerticalFootballPitchMatchup from './VerticalFootballPitchMatchup';
import LeagueTable from './LeagueTable';
import GameweekStats from './GameweekStats';

const LEAGUE_ID = 738279;
const API_URL = process.env.REACT_APP_API_URL || 'https://fpl-league-hub-api.onrender.com';

const MatchupRow = ({ matchup, isExpanded, onToggle, eventId }) => {
  const [matchDetails, setMatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isExpanded && !matchDetails) {
      setLoading(true);
      fetch(`${API_URL}/api/matchup/${matchup.id}?event=${eventId}`)
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
  }, [isExpanded, matchup.id, eventId, matchDetails]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-card text-card-foreground rounded-lg shadow-md mb-4 overflow-hidden"
    >
      <div
        className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50 transition-colors duration-150"
        onClick={onToggle}
      >
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm md:text-base truncate">{matchup.entry_1_name}</p>
          <p className="text-xs text-gray-500 truncate">{matchup.entry_1_player_name}</p>
        </div>
        <div className="flex-shrink-0 mx-2 md:mx-4">
          <p className="text-lg md:text-xl font-bold">
            <span className="text-purple-700">{matchup.entry_1_points}</span>
            {' - '}
            <span className="text-purple-700">{matchup.entry_2_points}</span>
          </p>
        </div>
        <div className="flex-1 text-right">
          <p className="font-semibold text-sm md:text-base truncate">{matchup.entry_2_name}</p>
          <p className="text-xs text-gray-500 truncate">{matchup.entry_2_player_name}</p>
        </div>
      </div>
      <Collapse in={isExpanded}>
        <div className="p-4 bg-muted">
          {loading && <CircularProgress />}
          {error && <div className="text-red-500">{error}</div>}
          {!loading && !error && matchDetails && (
            isMobile ? (
              <VerticalFootballPitchMatchup matchData={matchDetails} />
            ) : (
              <FootballPitchMatchup matchData={matchDetails} />
            )
          )}
        </div>
      </Collapse>
    </motion.div>
  );
};

const WeeklyMatchups = () => {
  const [matchups, setMatchups] = useState([]);
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMatchup, setExpandedMatchup] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);


  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/bootstrap-static`);
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
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      const fetchMatchups = async () => {
        setLoading(true);
        setError(null);
        try {
          const url = `${API_URL}/api/weekly-matchups/${LEAGUE_ID}?event=${selectedEvent}`;
          console.log('Fetching matchups from:', url); // Debug log
          const response = await fetch(url);
          
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
    const fetchStandings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/leagues/${LEAGUE_ID}/standings`);
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
  }, []);

  const handleToggleExpand = (matchupId) => {
    setExpandedMatchup(expandedMatchup === matchupId ? null : matchupId);
  };

  const handleEventChange = (event) => {
    setSelectedEvent(event.target.value);
  };

  return (
    <div className="bg-background min-h-screen p-2 md:p-4"> {/* Changed from bg-gray-100 */}
      <div className="max-w-[100rem] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* League Table - Left */}
          <div className="md:col-span-3 md:pl-4">
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-4 mb-4 md:-ml-24 md:w-[90%]">
              <Typography variant="h6" className="mb-2 font-semibold text-card-foreground text-sm">
                League Table
              </Typography>
              <LeagueTable standings={standings} />
            </div>
          </div>
          <div className="md:col-span-7 md:-ml-28 md:mr-[-4rem]">
            <div className="bg-card text-card-foreground rounded-lg shadow-md p-2 md:p-4 mb-4">
              <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <Typography variant="h6" className="text-card-foreground font-bold mb-2 md:mb-0">
                  Weekly Matchups
                </Typography>
                <Select
                  value={selectedEvent || ''}
                  onChange={handleEventChange}
                  className="min-w-[150px] bg-card text-sm"
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
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
          {/* Gameweek Stats - Right */}
          <div className="md:col-span-2 md:mr-[-8rem]">
            <div className="md:ml-20 md:w-[80%]">
              <GameweekStats eventId={selectedEvent} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyMatchups;