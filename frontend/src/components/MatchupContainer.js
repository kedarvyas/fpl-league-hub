import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import FootballPitchMatchup from './FootballPitchMatchup';

const MatchupContainer = () => {
  const { matchId } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        setLoading(true);
        // First, fetch the current gameweek
        const bootstrapResponse = await axios.get('http://localhost:8000/api/bootstrap-static');
        const currentEvent = bootstrapResponse.data.events.find(e => e.is_current).id;

        // Then, fetch the league data for the current gameweek
        const leagueResponse = await axios.get(`http://localhost:8000/api/weekly-matchups/738279?event=${currentEvent}`);
        const leagueData = leagueResponse.data;
        
        // Find the correct match in the league data
        const match = leagueData.results.find(m => m.id.toString() === matchId);
        
        if (!match) {
          throw new Error('Match not found in league data');
        }

        // Now fetch the specific match data
        const matchResponse = await axios.get(`http://localhost:8000/api/matchup/${match.id}?event=${currentEvent}`);
        console.log('Matchup data:', matchResponse.data);
        setMatchData(matchResponse.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching matchup data:', error);
        setError('Failed to load matchup data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [matchId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!matchData) return null;

  return <FootballPitchMatchup matchData={matchData} />;
};

export default MatchupContainer;