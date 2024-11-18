import React from 'react';
import { Typography, Box } from '@mui/material';

const Statistics = ({ leagueId }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Statistics
      </Typography>
      <Typography variant="body1">
        League statistics for League ID: {leagueId} will be displayed here.
      </Typography>
    </Box>
  );
};

export default Statistics;