import React from 'react';
import { Box, Typography, Paper, Grid, Avatar, Tooltip } from '@mui/material';
import { Star, AlertTriangle } from 'lucide-react';

const PlayerCard = ({ name, position, points, isCaptain, yellowCards, redCards }) => (
  <Paper elevation={2} sx={{ p: 1, m: 1, bgcolor: 'background.paper', display: 'flex', alignItems: 'center' }}>
    <Avatar sx={{ mr: 2 }}>{name[0]}</Avatar>
    <Box flexGrow={1}>
      <Typography variant="subtitle2">{name}</Typography>
      <Typography variant="caption" color="text.secondary">{position}</Typography>
    </Box>
    <Box display="flex" alignItems="center">
      {isCaptain && (
        <Tooltip title="Captain">
          <Star size={16} color="gold" style={{ marginRight: '4px' }} />
        </Tooltip>
      )}
      {yellowCards > 0 && (
        <Tooltip title="Yellow Card">
          <AlertTriangle size={16} color="yellow" style={{ marginRight: '4px' }} />
        </Tooltip>
      )}
      {redCards > 0 && (
        <Tooltip title="Red Card">
          <AlertTriangle size={16} color="red" style={{ marginRight: '4px' }} />
        </Tooltip>
      )}
      <Typography variant="body2" fontWeight="bold" color="primary.main">
        {points}
      </Typography>
    </Box>
  </Paper>
);

const TeamLineup = ({ teamName, players, score }) => (
  <Paper elevation={3} sx={{ p: 2, bgcolor: 'background.paper' }}>
    <Typography variant="h6" gutterBottom>
      {teamName} - Score: {score}
    </Typography>
    <Grid container spacing={1}>
      {players.map((player, index) => (
        <Grid item xs={12} key={index}>
          <PlayerCard {...player} />
        </Grid>
      ))}
    </Grid>
  </Paper>
);

const MatchupDetail = ({ matchData }) => {
  if (!matchData) return null;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="primary.main">
        Matchup Details
      </Typography>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <TeamLineup 
            teamName={matchData.homeTeam.name} 
            players={matchData.homeTeam.players} 
            score={matchData.homeTeam.score}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TeamLineup 
            teamName={matchData.awayTeam.name} 
            players={matchData.awayTeam.players} 
            score={matchData.awayTeam.score}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MatchupDetail;