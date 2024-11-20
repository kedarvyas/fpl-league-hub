import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import LeagueStandings from './components/LeagueStandings';
import WeeklyMatchups from './components/WeeklyMatchups';
import MatchupDetail from './components/MatchupDetail';
import Statistics from './components/Statistics';
import './index.css';
import PlayerStats from './components/PlayerStats';


const App = () => {
  const leagueId = 738279; // Your Head-to-Head League ID

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard leagueId={leagueId} />} />
          <Route path="/standings" element={<LeagueStandings leagueId={leagueId} />} />
          <Route path="/weekly-matchups" element={<WeeklyMatchups leagueId={leagueId} />} />
          <Route path="/player/:playerId" element={<PlayerStats />} />
          <Route path="/matchup/:matchId" element={<MatchupDetail />} />
          <Route path="/statistics" element={<Statistics leagueId={leagueId} />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;