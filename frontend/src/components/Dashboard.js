import React from 'react';
import { Typography, Box } from '@mui/material';

const Dashboard = ({ leagueId }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1">
        Welcome to the FPL League Hub Dashboard for League ID: {leagueId}
      </Typography>
    </Box>
  );
};

export default Dashboard;