import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useParams, useLocation } from 'react-router-dom';
import FootballPitchMatchup from './FootballPitchMatchup';

const MatchupDetail = () => {
    const { matchId } = useParams();
    const location = useLocation();
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMatchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const searchParams = new URLSearchParams(location.search);
                const event = searchParams.get('event');
                if (!event) {
                    throw new Error('Event parameter is missing');
                }

                const matchResponse = await fetch(`http://localhost:8000/api/matchup/${matchId}?event=${event}`);
                if (!matchResponse.ok) {
                    const errorData = await matchResponse.json();
                    throw new Error(errorData.detail || 'Failed to fetch match data');
                }
                const matchDetails = await matchResponse.json();

                setMatchData({
                    homeTeam: {
                        name: matchDetails.team_h_name,
                        managerName: matchDetails.team_h_manager,
                        players: matchDetails.team_h_picks,
                        score: matchDetails.team_h_score
                    },
                    awayTeam: {
                        name: matchDetails.team_a_name,
                        managerName: matchDetails.team_a_manager,
                        players: matchDetails.team_a_picks,
                        score: matchDetails.team_a_score
                    }
                });
            } catch (error) {
                console.error('Error fetching match data:', error);
                setError(error.message || 'Failed to load match details. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchMatchData();
    }, [matchId, location.search]);

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
        </Box>
    );

    if (error) return (
        <Alert severity="error" sx={{ mt: 2 }}>
            {error}
        </Alert>
    );

    return <FootballPitchMatchup matchData={matchData} />;
};

export default MatchupDetail;