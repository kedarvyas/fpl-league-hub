import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PlayerRow = ({ player }) => (
  <Link to={`/player/${player.id}`} className="block">
    <motion.div
      className="flex items-center justify-between gap-1 bg-card text-card-foreground rounded-md shadow-sm px-2 py-2 mb-2 min-h-[44px] hover:bg-primary/5 transition-colors duration-150"
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate text-purple-700">{player.name}</p>
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] text-muted-foreground flex-shrink-0">{player.position}</p>
          <p className="text-[11px] text-muted-foreground/70 truncate">{player.club}</p>
        </div>
      </div>
      <div className="flex items-center flex-shrink-0">
        {player.isCaptain && (
          <span className="text-xs font-bold text-blue-600 mr-1.5">
            {player.multiplier}x
          </span>
        )}
        <span className="text-sm font-bold">{player.points}</span>
      </div>
    </motion.div>
  </Link>
);

const TeamList = ({ players, isStarters }) => {
  if (!players || !Array.isArray(players)) return null;
  const filteredPlayers = players.filter(player => player.isStarting === isStarters);
  return (
    <div className="min-w-0">
      {filteredPlayers.map((player, index) => (
        <PlayerRow key={`${player.name}-${index}`} player={player} />
      ))}
    </div>
  );
};

const TeamHeader = ({ name, managerName, score, align }) => (
  <div className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
    <h4 className="text-sm font-bold text-foreground truncate">{name}</h4>
    {managerName && (
      <p className="text-xs text-muted-foreground truncate">{managerName}</p>
    )}
    <p className="text-xl font-bold text-purple-700 mt-0.5">{score}</p>
  </div>
);

const VerticalFootballPitchMatchup = ({ matchData }) => {
  if (!matchData) return null;

  // Handle new API response format
  const homeTeam = {
    name: matchData.matchup?.entry_1_name || matchData.team_h_name,
    managerName: matchData.matchup?.entry_1_player_name || matchData.team_h_manager,
    players: matchData.team1?.picks || matchData.team_h_picks || [],
    score: matchData.matchup?.entry_1_points || matchData.team_h_score
  };

  const awayTeam = {
    name: matchData.matchup?.entry_2_name || matchData.team_a_name,
    managerName: matchData.matchup?.entry_2_player_name || matchData.team_a_manager,
    players: matchData.team2?.picks || matchData.team_a_picks || [],
    score: matchData.matchup?.entry_2_points || matchData.team_a_score
  };

  return (
    <div className="w-full">
      {/* Team headers. The collapsed row above already shows the score line, so
          this only needs to label the two columns of players below it. */}
      <div className="grid grid-cols-2 gap-2 pb-3 mb-3 border-b border-border">
        <TeamHeader {...homeTeam} align="left" />
        <TeamHeader {...awayTeam} align="right" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TeamList players={homeTeam.players} isStarters={true} />
        <TeamList players={awayTeam.players} isStarters={true} />
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Bench
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <TeamList players={homeTeam.players} isStarters={false} />
          <TeamList players={awayTeam.players} isStarters={false} />
        </div>
      </div>
    </div>
  );
};

export default VerticalFootballPitchMatchup;
