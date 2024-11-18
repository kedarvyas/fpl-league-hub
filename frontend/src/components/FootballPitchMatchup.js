import React from 'react';
import PlayerCard from './PlayerCard';

const TeamFormation = ({ players, isHomeTeam }) => {
    const formation = isHomeTeam
        ? ['GKP', 'DEF', 'MID', 'FWD']
        : ['FWD', 'MID', 'DEF', 'GKP'];

    const getPlayersForPosition = (position) => {
        return players.filter(player => player.position === position && player.multiplier > 0);
    };

    return (
        <div className="flex justify-around items-center h-full">
            {formation.map((position) => (
                <div key={position} className="flex flex-col justify-around h-full">
                    {getPlayersForPosition(position).map(player => (
                        <PlayerCard 
                            key={player.name} 
                            {...player}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

const TeamInfo = ({ teamName, managerName, score, isHome }) => (
    <div className={`flex flex-col ${isHome ? 'items-start' : 'items-end'} flex-shrink-0 w-full max-w-[45%]`}>
        <div className={`flex flex-col ${isHome ? 'items-start' : 'items-end'}`}>
            <h3 className="text-base sm:text-lg md:text-xl font-bold truncate">{teamName}</h3>
            {managerName && (
                <p className="text-xs sm:text-sm text-gray-300 truncate">{managerName}</p>
            )}
        </div>
        <p className="text-xl sm:text-2xl font-bold mt-1">{score}</p>
    </div>
);

const ScoreDisplay = ({ homeScore, awayScore }) => (
    <div className="flex items-center justify-center flex-shrink-0 w-[10%]">
        <span className="text-2xl sm:text-3xl font-bold">{homeScore}</span>
        <span className="mx-2 text-xl sm:text-2xl">-</span>
        <span className="text-2xl sm:text-3xl font-bold">{awayScore}</span>
    </div>
);

const MatchupHeader = ({ homeTeam, awayTeam }) => (
    <div className="bg-gray-800 p-4 rounded-t-lg">
        <div className="flex items-center justify-between text-white">
            <TeamInfo
                teamName={homeTeam.name}
                managerName={homeTeam.managerName}
                score={homeTeam.score}
                isHome={true}
            />
            <ScoreDisplay
                homeScore={homeTeam.score}
                awayScore={awayTeam.score}
            />
            <TeamInfo
                teamName={awayTeam.name}
                managerName={awayTeam.managerName}
                score={awayTeam.score}
                isHome={false}
            />
        </div>
    </div>
);

const FootballPitchMatchup = ({ matchData }) => {
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
            <MatchupHeader homeTeam={homeTeam} awayTeam={awayTeam} />
            <div className="bg-green-500 p-4">
                <div className="relative" style={{ paddingTop: '56.25%' }}> {/* 16:9 aspect ratio */}
                    <div className="absolute inset-0 flex">
                        <div className="w-1/2 border-r border-white">
                            <TeamFormation players={homeTeam.players} isHomeTeam={true} />
                        </div>
                        <div className="w-1/2">
                            <TeamFormation players={awayTeam.players} isHomeTeam={false} />
                        </div>
                    </div>
                    {/* Field markings */}
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Center line */}
                        <div className="absolute inset-y-0 left-1/2 border-l-2 border-white opacity-60" />
                        {/* Center circle */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full border-2 border-white opacity-60" />
                        </div>
                        {/* Goal areas */}
                        <div className="absolute top-1/3 bottom-1/3 left-0 w-1/12 border-2 border-white opacity-60" />
                        <div className="absolute top-1/3 bottom-1/3 right-0 w-1/12 border-2 border-white opacity-60" />
                        {/* Penalty areas */}
                        <div className="absolute top-1/4 bottom-1/4 left-0 w-1/6 border-2 border-white opacity-60" />
                        <div className="absolute top-1/4 bottom-1/4 right-0 w-1/6 border-2 border-white opacity-60" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FootballPitchMatchup;