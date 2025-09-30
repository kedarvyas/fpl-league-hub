import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import WeeklyMatchups from './components/WeeklyMatchups';
import PlayerStatisticsHub from './components/PlayerStatisticsHub';
import PlayerStats from './components/PlayerStats';
import LeagueStandings from './components/LeagueStandings';
import MyTeam from './components/MyTeam';

const App = () => {
  // Get league ID from environment variables
  const leagueId = process.env.REACT_APP_LEAGUE_ID || 1176282;

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard leagueId={leagueId} />} />
          <Route path="/dashboard/:leagueId" element={<Dashboard />} />
          <Route path="/weekly-matchups" element={<WeeklyMatchups />} />
          <Route path="/player-statistics" element={<PlayerStatisticsHub />} />
          <Route path="/player/:playerId" element={<PlayerStats />} />
          <Route path="/standings" element={<LeagueStandings />} />
          <Route path="/my-team" element={<MyTeam />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;