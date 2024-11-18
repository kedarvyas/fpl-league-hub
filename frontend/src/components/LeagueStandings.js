import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography, 
  CircularProgress,
  Box,
  Alert
} from '@mui/material';

const FormBox = ({ result }) => {
  const color = result === 'W' ? 'success.main' : result === 'L' ? 'error.main' : 'warning.main';
  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        bgcolor: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '0.75rem',
        borderRadius: 1,
        marginRight: 0.5,
      }}
    >
      {result}
    </Box>
  );
};

const LeagueStandings = ({ leagueId }) => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/leagues/${leagueId}/standings`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to fetch standings');
        }
        const data = await response.json();
        setStandings(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, [leagueId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{`Error: ${error}`}</Alert>;
  }

  if (!standings || standings.length === 0) {
    return <Alert severity="info">No standings data available for this league.</Alert>;
  }

  return (
    <TableContainer component={Paper}>
      <Typography variant="h6" sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        League Standings
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Rank</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>Manager</TableCell>
            <TableCell align="right">Points</TableCell>
            <TableCell align="right">PF</TableCell>
            <TableCell align="right">MP</TableCell>
            <TableCell align="right">W</TableCell>
            <TableCell align="right">D</TableCell>
            <TableCell align="right">L</TableCell>
            <TableCell>Form</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {standings.map((team) => (
            <TableRow key={team.entry} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell>{team.rank}</TableCell>
              <TableCell component="th" scope="row">{team.entry_name}</TableCell>
              <TableCell>{team.player_name}</TableCell>
              <TableCell align="right">{team.total}</TableCell>
              <TableCell align="right">{team.points_for}</TableCell>
              <TableCell align="right">{team.matches_played}</TableCell>
              <TableCell align="right">{team.matches_won}</TableCell>
              <TableCell align="right">{team.matches_drawn}</TableCell>
              <TableCell align="right">{team.matches_lost}</TableCell>
              <TableCell>
                {team.form && team.form.split('').map((result, index) => (
                  <FormBox key={index} result={result} />
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default LeagueStandings;