import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import WeeklyMatchups from './components/WeeklyMatchups';
import PlayerStatisticsHub from './components/PlayerStatisticsHub';
import PlayerStats from './components/PlayerStats';
import MyTeam from './components/MyTeam';
import TransferPlanner from './components/TransferPlanner';

const App = () => (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:leagueId" element={<Dashboard />} />
            <Route path="/weekly-matchups" element={<WeeklyMatchups />} />
            <Route path="/weekly-matchups/:leagueId" element={<WeeklyMatchups />} />
            <Route path="/player-statistics" element={<PlayerStatisticsHub />} />
            <Route path="/player/:playerId" element={<PlayerStats />} />
            <Route path="/my-team" element={<MyTeam />} />
            {/* Under My Team conceptually and in the URL, but keyed to
                `fpl_my_entry` rather than the entry being viewed — planning
                transfers for a team you don't own is meaningless. */}
            <Route path="/my-team/plan" element={<TransferPlanner />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
);

export default App;
