import React from 'react';

const DashboardHeader = ({ leagueId, gameweek }) => {
  return (
    <div className="bg-primary mb-6 rounded-lg shadow-lg overflow-hidden">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-white">FPL League Hub Dashboard</h1>
        <div className="flex gap-4 mt-2">
          <span className="text-white/90 text-sm">League ID: {leagueId}</span>
          <span className="text-white/90 text-sm">Gameweek {gameweek}</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;