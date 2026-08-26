import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PlayerStatsLayout from './PlayerStatsLayout';
import PlayerComparison from './PlayerComparison';
import PlayerSearchModal from './PlayerSearchModal';
import ICTSidePanel from './ICTSidePanel';
import TransferStats from './TransferStats';
import PlayerDefensiveContribution from './PlayerDefensiveContribution';
import PlayerPriceProjection from './PlayerPriceProjection';
import PlayerSetPieces from './PlayerSetPieces';
import PlayerExpectedStats from './PlayerExpectedStats';
import PlayerSeasonStats from './PlayerSeasonStats';
import PlayerMatchLog from './PlayerMatchLog';
import { formatCount, formatDecimal, ordinal, toNumber } from '../lib/playerStats';
import {
    UserCircle,
    ArrowUp,
    ArrowDown,
    Users,
    Sparkles,
    Zap,
    Flame,
    Info
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Legend
} from 'recharts';
import { API_URL } from '../config/supabase';
import PlayerPhoto from './PlayerPhoto';
import PlayerSeasonSummary from './PlayerSeasonSummary';



const getPositionName = (elementType) => {
    const positions = {
        1: 'Goalkeeper',
        2: 'Defender',
        3: 'Midfielder',
        4: 'Forward'
    };
    return positions[elementType] || 'Unknown';
};

/** "3rd in position" for the rank_type fields, or nothing when unranked. */
const rankSubtitle = (rank) => {
    const value = toNumber(rank, null);
    return value !== null && value > 0 ? `${ordinal(value)} in position` : null;
};

const ICTDescription = {
    influence: {
        title: "Influence",
        description: "Measures a player's impact on a single match. It takes into account game-winning goals, defensive actions, and creating big chances.",
        metrics: [
            "Goals scored",
            "Assists",
            "Key defensive actions",
            "Big chances created"
        ]
    },
    creativity: {
        title: "Creativity",
        description: "Assesses a player's ability to create scoring chances for others. It considers key passes, successful crosses, and potential assists.",
        metrics: [
            "Key passes",
            "Successful crosses",
            "Pass completion in final third",
            "Big chances created"
        ]
    },
    threat: {
        title: "Threat",
        description: "Evaluates a player's threat on goal. It analyzes shots, touches in the box, and the quality of scoring opportunities.",
        metrics: [
            "Shots on target",
            "Touches in opposition box",
            "Expected goals (xG)",
            "Big chances"
        ]
    }
};

const getICTContext = (metric, value) => {
    const contexts = {
        'Influence': {
            low: 'Limited match impact',
            medium: 'Moderate influence',
            high: 'High match impact'
        },
        'Creativity': {
            low: 'Few chances created',
            medium: 'Regular creator',
            high: 'Key playmaker'
        },
        'Threat': {
            low: 'Low attacking threat',
            medium: 'Consistent threat',
            high: 'Major goal threat'
        }
    };

    let impact = 'low';
    if (value > 60) impact = 'high';
    else if (value > 30) impact = 'medium';

    return contexts[metric][impact];
};

const CustomTooltip = ({ active, payload, label, type }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
            <p className="font-semibold text-gray-900 mb-2">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2 mb-1">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600">{entry.name}:</span>
                    <span className="font-medium">
                        {type === 'performance' && entry.name === 'points'
                            ? `${entry.value} pts`
                            : type === 'ict'
                                ? `${parseFloat(entry.value).toFixed(1)} (${getICTContext(entry.name, entry.value)})`
                                : parseFloat(entry.value).toFixed(2)}
                    </span>
                </div>
            ))}
        </div>
    );
};

const PlayerHeader = ({ playerData, onCompareClick, getPositionName }) => (
    <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-4 sm:p-6 text-white rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Player Info Section */}
                <div className="flex items-center space-x-4">
                    <PlayerPhoto
                        code={playerData.code}
                        name={playerData.web_name}
                        size="lg"
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden flex-shrink-0 text-lg"
                    />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">{playerData.web_name}</h1>
                        <div className="flex items-center space-x-2 text-sm sm:text-base opacity-90">
                            <span>{getPositionName(playerData.element_type)}</span>
                            <span>•</span>
                            <span>{playerData.teamName}</span>
                        </div>
                    </div>
                </div>

                {/* Stats & Actions Section */}
                <div className="flex items-center justify-between sm:justify-end sm:space-x-6">
                    {/* Selection & Price Info */}
                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                            <Users className="w-4 h-4" />
                            <span className="font-medium">{playerData.selected_by_percent}%</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                            <span>Price</span>
                            <span className="font-bold">£{(playerData.now_cost / 10).toFixed(1)}m</span>
                            {playerData.cost_change_event > 0 ? (
                                <ArrowUp className="w-4 h-4 text-green-400" />
                            ) : playerData.cost_change_event < 0 ? (
                                <ArrowDown className="w-4 h-4 text-red-400" />
                            ) : null}
                        </div>
                    </div>

                    {/* Compare Button */}
                    <button
                        onClick={onCompareClick}
                        className="px-4 py-2 bg-white bg-opacity-20 rounded-lg text-sm font-medium hover:bg-opacity-30 transition-colors"
                    >
                        Compare
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const StatCard = ({ title, value, icon, subtitle, description, metrics }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="relative">
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between mb-2">
                    {icon}
                    <button
                        className="w-4 h-4 text-gray-400 hover:text-gray-600"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <Info className="w-full h-full" />
                    </button>
                    <span className="text-sm text-gray-500">{title}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>

            {showTooltip && (
                <div className="absolute z-50 w-80 p-4 bg-white rounded-lg shadow-lg border border-gray-200 mt-2 right-0">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{title}</h3>
                        <p className="text-sm text-gray-600">{description}</p>
                        <div className="mt-2">
                            <h4 className="font-medium text-sm mb-1">Key Metrics:</h4>
                            <ul className="list-disc list-inside text-sm text-gray-600">
                                {metrics.map((metric, index) => (
                                    <li key={index}>{metric}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const formatDate = (gameweek) => {
    try {
        const gwNumber = parseInt(gameweek.replace('GW', ''));
        const startDate = new Date('2023-08-11');
        const weekInMilliseconds = 7 * 24 * 60 * 60 * 1000;
        const gameweekDate = new Date(startDate.getTime() + (gwNumber - 1) * weekInMilliseconds);

        return gameweekDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return gameweek; // fallback to just showing the gameweek
    }
};

const PlayerStats = () => {
    const { playerId } = useParams();
    const [playerData, setPlayerData] = useState(null);
    const [playerHistory, setPlayerHistory] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [teams, setTeams] = useState({});
    const [showComparison, setShowComparison] = useState(false);
    const [showPlayerSearch, setShowPlayerSearch] = useState(false);
    const [comparePlayer, setComparePlayer] = useState(null);


    useEffect(() => {
        const fetchPlayerData = async () => {
            try {
                setLoading(true);

                const [bootstrapResponse, historyResponse] = await Promise.all([
                    fetch(`${API_URL}/bootstrap-static`),
                    fetch(`${API_URL}/element-summary/${playerId}`)
                ]);

                const bootstrapData = await bootstrapResponse.json();
                const historyData = await historyResponse.json();

                // Create teams lookup object
                const teamsLookup = {};
                bootstrapData.teams.forEach(team => {
                    teamsLookup[team.id] = {
                        name: team.name,
                        short_name: team.short_name
                    };
                });
                setTeams(teamsLookup);

                const player = bootstrapData.elements.find(p => p.id === parseInt(playerId));
                if (!player) {
                    throw new Error('Player not found');
                }

                const playerTeam = bootstrapData.teams.find(team => team.id === player.team);
                player.teamName = playerTeam ? playerTeam.name : 'Unknown Team';
                player.teamShortName = playerTeam ? playerTeam.short_name : 'UNK';

                setPlayerData(player);
                setPlayerHistory(historyData);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching player data:', err);
                setError(err.message || 'Failed to load player data');
                setLoading(false);
            }
        };

        if (playerId) {
            fetchPlayerData();
        }
    }, [playerId]);

    const calculateForm = (history) => {
        if (!history?.history || !Array.isArray(history.history)) {
            console.log('No valid history data');
            return [];
        }

        try {
            return history.history
                .filter(game => game && typeof game.round === 'number')
                .slice(-5)
                .map(game => ({
                    gameweek: `GW${game.round}`,
                    points: game.total_points || 0,
                    xG: parseFloat(game.expected_goals || 0),
                    xA: parseFloat(game.expected_assists || 0),
                    influence: parseFloat(game.influence || 0),      // Parse as float
                    creativity: parseFloat(game.creativity || 0),    // Parse as float
                    threat: parseFloat(game.threat || 0)            // Parse as float
                }));
        } catch (error) {
            console.error('Error calculating form:', error);
            return [];
        }
    };

    const calculateUpcomingFixtures = (fixtures) => {
        if (!fixtures) return [];
        return fixtures.slice(0, 5).map(fixture => ({
            gameweek: `GW${fixture.event}`,
            difficulty: fixture.difficulty,
            isHome: fixture.is_home,
            opponent: fixture.is_home ? teams[fixture.team_a]?.short_name : teams[fixture.team_h]?.short_name
        }));
    };

    // Render loading and error states...
    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-4 space-y-4">
                <div className="h-48 w-full bg-gray-200 animate-pulse rounded-lg"></div>
                <div className="h-32 w-full bg-gray-200 animate-pulse rounded-lg"></div>
            </div>
        );
    }

    if (error || !playerData) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Player unavailable</h2>
                    <p className="text-sm text-gray-500">
                        {error || 'We could not load this player right now. Please try again.'}
                    </p>
                </div>
            </div>
        );
    }

    const matchHistory = Array.isArray(playerHistory?.history) ? playerHistory.history : [];
    const formData = calculateForm(playerHistory);
    const upcomingFixtures = calculateUpcomingFixtures(playerHistory?.fixtures);

    const renderPerformanceChart = () => (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="gameweek"
                        tickFormatter={(gameweek) => gameweek}
                        height={30}
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fontSize: 11 }}
                        width={30}
                    />
                    <Tooltip content={<CustomTooltip type="performance" />} />
                    <Legend
                        wrapperStyle={{ fontSize: '12px' }}
                        iconSize={8}
                        margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                    <Area
                        type="monotone"
                        dataKey="points"
                        name="Points"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.2}
                    />
                    <Line
                        type="monotone"
                        dataKey="xG"
                        name="Expected Goals"
                        stroke="#10b981"
                        strokeDasharray="3 3"
                    />
                    <Line
                        type="monotone"
                        dataKey="xA"
                        name="Expected Assists"
                        stroke="#3b82f6"
                        strokeDasharray="3 3"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );

    const renderICTChart = () => {
        const data = formData;

        if (!data || data.length === 0) {
            return (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No ICT data available</p>
                </div>
            );
        }

        return (
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="gameweek"
                            tickFormatter={(gameweek) => gameweek}
                            height={30}
                            tick={{ fontSize: 11 }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={[0, 'dataMax + 20']}
                            tick={{ fontSize: 11 }}
                            width={30}
                        />
                        <Tooltip content={<CustomTooltip type="ict" />} />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconSize={8}
                            margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="influence"
                            name="Influence"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.2}
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="creativity"
                            name="Creativity"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.2}
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="threat"
                            name="Threat"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.2}
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    };

    const renderICTSection = () => (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
                title="Influence"
                value={playerData.influence_rank}
                icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                subtitle={`${playerData.influence_rank_type} in position`}
                description={ICTDescription.influence.description}
                metrics={ICTDescription.influence.metrics}
            />
            <StatCard
                title="Creativity"
                value={playerData.creativity_rank}
                icon={<Zap className="w-5 h-5 text-blue-500" />}
                subtitle={`${playerData.creativity_rank_type} in position`}
                description={ICTDescription.creativity.description}
                metrics={ICTDescription.creativity.metrics}
            />
            <StatCard
                title="Threat"
                value={playerData.threat_rank}
                icon={<Flame className="w-5 h-5 text-red-500" />}
                subtitle={`${playerData.threat_rank_type} in position`}
                description={ICTDescription.threat.description}
                metrics={ICTDescription.threat.metrics}
            />
        </div>
    );

    return (
        <PlayerStatsLayout
            leftPanel={<TransferStats playerData={playerData} />}
            rightPanel={<ICTSidePanel playerData={playerData} />}

        >
            <div className="space-y-6">
                <PlayerHeader
                    playerData={playerData}
                    onCompareClick={() => setShowPlayerSearch(true)}
                    getPositionName={getPositionName}
                />
                {/* Enhanced Navigation Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-4 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm ${activeTab === 'overview'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('performance')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm ${activeTab === 'performance'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Performance
                        </button>
                        <button
                            onClick={() => setActiveTab('fixtures')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm ${activeTab === 'fixtures'
                                ? 'border-purple-600 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Fixtures
                        </button>
                    </nav>
                </div>

                {/* Content based on active tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <PlayerSeasonSummary playerData={playerData} />
                        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">Key Statistics</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                <StatsBox
                                    title="Total Points"
                                    value={formatCount(playerData.total_points)}
                                    subtitle={`${formatCount(playerData.event_points)} last GW`}
                                />
                                <StatsBox
                                    title="Points Per Game"
                                    value={formatDecimal(playerData.points_per_game, 1, '0.0')}
                                    subtitle={rankSubtitle(playerData.points_per_game_rank_type)}
                                />
                                <StatsBox
                                    title="Form"
                                    value={formatDecimal(playerData.form, 1, '0.0')}
                                    subtitle={rankSubtitle(playerData.form_rank_type)}
                                />
                                <StatsBox
                                    title="Expected Points"
                                    value={formatDecimal(playerData.ep_next, 1, '0.0')}
                                    subtitle="Next gameweek"
                                />
                                <StatsBox
                                    title="BPS"
                                    value={formatCount(playerData.bps)}
                                    subtitle="Bonus points system"
                                />
                                <StatsBox
                                    title="Starts"
                                    value={formatCount(playerData.starts)}
                                    subtitle={`${formatCount(playerData.minutes)} mins`}
                                />
                            </div>
                        </div>

                        <PlayerDefensiveContribution
                            playerData={playerData}
                            history={matchHistory}
                        />

                        <PlayerPriceProjection playerData={playerData} />

                        <PlayerSetPieces playerData={playerData} />

                        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">Recent Form</h2>
                            {renderPerformanceChart()}
                        </div>
                    </div>
                )}

                {activeTab === 'performance' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                            <h2 className="text-lg sm:text-xl font-semibold mb-4">ICT Index Trend</h2>
                            {renderICTChart()}
                            <div className="mt-4 text-sm text-gray-500">
                                <p>* ICT Index values are shown stacked to represent total player impact</p>
                            </div>
                        </div>

                        <PlayerSeasonStats playerData={playerData} />

                        <PlayerExpectedStats playerData={playerData} />

                        <PlayerMatchLog
                            history={matchHistory}
                            elementType={playerData.element_type}
                            teams={teams}
                        />
                    </div>
                )}

                {activeTab === 'fixtures' && (
                    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-semibold mb-4">Upcoming Fixtures</h2>
                        {upcomingFixtures.length === 0 && (
                            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                                No upcoming fixtures listed for this player.
                            </div>
                        )}
                        <div className="space-y-4">
                            {upcomingFixtures.map((fixture, index) => (
                                <FixtureRow
                                    key={index}
                                    gameweek={fixture.gameweek}
                                    opponent={fixture.opponent}
                                    difficulty={fixture.difficulty}
                                    isHome={fixture.isHome}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            {
                showPlayerSearch && (
                    <PlayerSearchModal
                        onSelect={(player) => {
                            setComparePlayer(player);
                            setShowPlayerSearch(false);
                            setShowComparison(true);
                        }}
                        onClose={() => setShowPlayerSearch(false)}
                        excludePlayerId={parseInt(playerId)}
                    />
                )
            }

            {
                showComparison && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="w-full max-w-3xl">
                            <PlayerComparison
                                player1={playerData}
                                player2={comparePlayer}
                                onClose={() => {
                                    setShowComparison(false);
                                    setComparePlayer(null);
                                }}
                            />
                        </div>
                    </div>
                )
            }
        </PlayerStatsLayout>
    );

};

const FixtureRow = ({ gameweek, opponent, difficulty, isHome }) => {
    const getDifficultyColor = (diff) => {
        const colors = {
            1: 'bg-green-100 text-green-800',
            2: 'bg-green-50 text-green-600',
            3: 'bg-gray-100 text-gray-800',
            4: 'bg-red-50 text-red-600',
            5: 'bg-red-100 text-red-800'
        };
        return colors[diff] || colors[3];
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">{gameweek}</span>
                <span className="text-sm">{isHome ? 'H' : 'A'}</span>
                <span className="text-sm font-medium">{opponent}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}>
                FDR {difficulty}
            </span>
        </div>
    );
};

const StatItem = ({ icon, label, value }) => (
    <div className="flex items-center space-x-2">
        {icon}
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-semibold">{value}</p>
        </div>
    </div>
);

const StatsBox = ({ title, value, subtitle, className = '' }) => (
    // Value first, then label: a long label like "Points Per Game" used to
    // wrap to three lines and push its number down, so no two tiles in a row
    // lined up. `mt-auto` pins the subtitle to the bottom of an equal-height
    // grid cell instead of letting it float directly under a wrapped label.
    <div className={`flex flex-col p-3 sm:p-4 rounded-lg ${className || 'bg-muted/60'}`}>
        <p className="text-2xl font-bold text-purple-600 tabular-nums leading-none">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-tight">{title}</p>
        {subtitle && (
            <p className="text-[11px] text-muted-foreground/80 mt-auto pt-1.5 leading-tight">{subtitle}</p>
        )}
    </div>
);

export default PlayerStats;