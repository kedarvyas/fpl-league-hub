import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

const Home = () => {
  const [teamId, setTeamId] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const navigate = useNavigate();

  const handleTeamSubmit = (e) => {
    e.preventDefault();
    if (teamId.trim()) {
      // Navigate to My Team page with team ID as state
      navigate('/my-team', { state: { teamId: teamId.trim() } });
    }
  };

  const handleLeagueSubmit = (e) => {
    e.preventDefault();
    if (leagueId.trim()) {
      // Navigate to weekly matchups page with the new league ID
      navigate(`/weekly-matchups/${leagueId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Welcome to FPL League Hub
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your comprehensive dashboard for Fantasy Premier League Head-to-Head leagues,
            player statistics, and league performance tracking.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* My Team Info Card */}
          <Card className="bg-card">
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <Search className="h-6 w-6 mr-2 card-header-text" />
                My Team Info
              </CardTitle>
              <CardDescription className="card-header-text-secondary">
                Enter your team ID to view your team details and statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleTeamSubmit} className="space-y-4">
                <div>
                  <label htmlFor="teamId" className="block text-sm font-medium text-foreground mb-2">
                    Team ID
                  </label>
                  <input
                    type="text"
                    id="teamId"
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    placeholder="e.g., 4656161"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Find your team ID in your FPL URL: fantasy.premierleague.com/entry/<strong>4656161</strong>/event/6
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-darker text-primary-foreground flex items-center justify-center"
                  disabled={!teamId.trim()}
                >
                  View My Team
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Import League ID Card */}
          <Card className="bg-card">
            <CardHeader className="bg-gradient-to-r from-header-bg-from to-header-bg-to">
              <CardTitle className="card-header-text flex items-center">
                <Users className="h-6 w-6 mr-2 card-header-text" />
                Import Your League
              </CardTitle>
              <CardDescription className="card-header-text-secondary">
                Enter a league ID to view league standings, matchups, and statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleLeagueSubmit} className="space-y-4">
                <div>
                  <label htmlFor="leagueId" className="block text-sm font-medium text-foreground mb-2">
                    League ID
                  </label>
                  <input
                    type="text"
                    id="leagueId"
                    value={leagueId}
                    onChange={(e) => setLeagueId(e.target.value)}
                    placeholder="e.g., 1176282"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Perfect for H2H leagues - view detailed matchups and standings
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-darker text-primary-foreground flex items-center justify-center"
                  disabled={!leagueId.trim()}
                >
                  View League Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Features Preview */}
        <div className="bg-muted rounded-lg p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            What You Can Explore
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">League Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Detailed H2H matchups, standings, and performance tracking
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Player Statistics</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive player data, form analysis, and comparison tools
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Real-time Updates</h3>
              <p className="text-sm text-muted-foreground">
                Live gameweek data, transfer trends, and weekly insights
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;