import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users,
  Award,
  Shield,
  Goal,
  Save,
  Star,
  ChevronRight,
  Search
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";


const PlayerStatisticsHub = () => {
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePosition, setActivePosition] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/bootstrap-static`);
        const data = await response.json();
        
        // Process and sort players by total points
        const processedPlayers = data.elements.map(player => {
          const team = data.teams.find(t => t.id === player.team);
          return {
            ...player,
            teamName: team?.name || 'Unknown Team',
            teamShortName: team?.short_name || 'UNK',
            position: getPositionName(player.element_type)
          };
        }).sort((a, b) => b.total_points - a.total_points);

        setPlayers(processedPlayers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching player data:', error);
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const getPositionName = (elementType) => {
    const positions = {
      1: 'Goalkeeper',
      2: 'Defender',
      3: 'Midfielder',
      4: 'Forward'
    };
    return positions[elementType] || 'Unknown';
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.web_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = activePosition === 'all' || player.position === activePosition;
    return matchesSearch && matchesPosition;
  });

  const getTopPerformers = (position) => {
    return filteredPlayers
      .filter(player => position === 'all' || player.position === position)
      .slice(0, 5);
  };

  const StatCard = ({ title, icon: Icon, children }) => (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
        <CardTitle className="text-white flex items-center space-x-2">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );

  const PlayerRow = ({ player, rank }) => (
    <Link 
      to={`/player/${player.id}`}
      className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <span className="text-lg font-bold text-gray-400 w-6">{rank}</span>
      <div className="flex-1 flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
          <img
            src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`}
            alt={player.web_name}
            className="w-full h-full object-cover object-top transform translate-y-1"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "";
              e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Users className="w-6 h-6 text-gray-400" /></div>';
            }}
          />
        </div>
        <div>
          <div className="font-medium">{player.web_name}</div>
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            <span>{player.teamShortName}</span>
            <span>•</span>
            <span>{player.position}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-bold text-purple-600">{player.total_points}</div>
        <div className="text-sm text-gray-500">points</div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
  );

  const positions = ['all', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="h-12 w-full bg-gray-200 animate-pulse rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Search and Filter Section */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-center mb-6">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search players or teams..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-2 w-full sm:w-auto">
          {positions.map(position => (
            <Badge
              key={position}
              variant={activePosition === position ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setActivePosition(position)}
            >
              {position.charAt(0).toUpperCase() + position.slice(1)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Top Scorers" icon={Award}>
          {getTopPerformers(activePosition).map((player, index) => (
            <PlayerRow key={player.id} player={player} rank={index + 1} />
          ))}
        </StatCard>

        <StatCard title="Best Value" icon={Star}>
          {getTopPerformers(activePosition)
            .sort((a, b) => (b.total_points / b.now_cost) - (a.total_points / a.now_cost))
            .map((player, index) => (
              <PlayerRow key={player.id} player={player} rank={index + 1} />
          ))}
        </StatCard>

        <StatCard title="Form Players" icon={Goal}>
          {getTopPerformers(activePosition)
            .sort((a, b) => parseFloat(b.form) - parseFloat(a.form))
            .map((player, index) => (
              <PlayerRow key={player.id} player={player} rank={index + 1} />
          ))}
        </StatCard>
      </div>
    </div>
  );
};

export default PlayerStatisticsHub;