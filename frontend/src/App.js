import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import WeeklyMatchups from './components/WeeklyMatchups';
import PlayerStatisticsHub from './components/PlayerStatisticsHub';
import PlayerStats from './components/PlayerStats';
import LeagueStandings from './components/LeagueStandings';

const App = () => {
  // You can also manage this with environment variables or state management
  const leagueId = 738279;  // Your league ID

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard leagueId={leagueId} />} />
          <Route path="/weekly-matchups" element={<WeeklyMatchups />} />
          <Route path="/player-statistics" element={<PlayerStatisticsHub />} />
          <Route path="/player/:playerId" element={<PlayerStats />} />
          <Route path="/standings" element={<LeagueStandings />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;