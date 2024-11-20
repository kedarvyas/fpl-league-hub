import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PlayerRow = ({ player }) => (
  <Link to={`/player/${player.id}`}>
    <motion.div
      className="flex items-center justify-between bg-white rounded-md shadow-sm p-2 mb-2 hover:bg-purple-50 transition-colors duration-150"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex-1">
        <p className="text-xs font-semibold truncate text-purple-700">{player.name}</p>
        <div className="flex items-center">
          <p className="text-xs text-gray-500">{player.position}</p>
          <p className="text-xs text-gray-400 ml-2">{player.club}</p>
        </div>
      </div>
      <div className="flex items-center">
        {player.isCaptain && (
          <span className="text-xs font-bold text-blue-600 mr-2">
            {player.multiplier}x
          </span>
        )}
        <span className="text-sm font-bold">{player.points}</span>
      </div>
    </motion.div>
  </Link>
);

const TeamList = ({ players, isStarters }) => {
  const filteredPlayers = players.filter(player => player.isStarting === isStarters);
  return (
    <div className="w-full">
      {filteredPlayers.map((player, index) => (
        <PlayerRow key={`${player.name}-${index}`} player={player} />
      ))}
    </div>
  );
};


const TeamInfo = ({ teamName, managerName, score }) => (
  <div className="text-center mb-2">
    <h3 className="text-sm font-bold truncate">{teamName}</h3>
    {managerName && (
      <p className="text-xs text-gray-500 truncate">{managerName}</p>
    )}
    <p className="text-lg font-bold mt-1">{score}</p>
  </div>
);

const VerticalFootballPitchMatchup = ({ matchData }) => {
  if (!matchData) return null;

  const homeTeam = {
    name: matchData.team_h_name,
    managerName: matchData.team_h_manager,
    players: matchData.team_h_picks,
    score: matchData.team_h_score
  };

  const awayTeam = {
    name: matchData.team_a_name,
    managerName: matchData.team_a_manager,
    players: matchData.team_a_picks,
    score: matchData.team_a_score
  };

  return (
    <div className="w-full bg-gray-100 rounded-lg overflow-hidden shadow-lg">
      <div className="bg-gray-800 p-2 text-white">
        <div className="flex justify-between items-center mb-2">
          <TeamInfo {...homeTeam} />
          <div className="text-center text-xl font-bold">
            {homeTeam.score} - {awayTeam.score}
          </div>
          <TeamInfo {...awayTeam} />
        </div>
      </div>
      <div className="p-2">
        <div className="flex mb-4">
          <div className="w-1/2 pr-1">
            <h4 className="text-sm font-semibold mb-2">{homeTeam.name}</h4>
            <TeamList players={homeTeam.players} isStarters={true} />
          </div>
          <div className="w-1/2 pl-1">
            <h4 className="text-sm font-semibold mb-2">{awayTeam.name}</h4>
            <TeamList players={awayTeam.players} isStarters={true} />
          </div>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Bench Players</h4>
          <div className="flex">
            <div className="w-1/2 pr-1">
              <TeamList players={homeTeam.players} isStarters={false} />
            </div>
            <div className="w-1/2 pl-1">
              <TeamList players={awayTeam.players} isStarters={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerticalFootballPitchMatchup;