import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://fpl-league-hub-api.onrender.com';

const PlayerSearchModal = ({ onSelect, onClose, excludePlayerId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/bootstrap-static`, {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
        }
      });
      const data = await response.json();
      
      const filteredPlayers = data.elements
        .filter(player => 
          player.id !== excludePlayerId &&
          (player.web_name.toLowerCase().includes(term.toLowerCase()) ||
           player.first_name.toLowerCase().includes(term.toLowerCase()) ||
           player.second_name.toLowerCase().includes(term.toLowerCase()))
        )
        .slice(0, 5); // Limit to 5 results
        
      setSearchResults(filteredPlayers);
    } catch (error) {
      console.error('Error searching players:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Select Player to Compare</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {searchResults.map((player) => (
            <button
              key={player.id}
              onClick={() => onSelect(player)}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center space-x-4 border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                <img
                  src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`}
                  alt={player.web_name}
                  className="w-full h-full object-cover object-top transform translate-y-1"
                />
              </div>
              <div>
                <div className="font-medium">{player.web_name}</div>
                <div className="text-sm text-gray-500">£{(player.now_cost / 10).toFixed(1)}m</div>
              </div>
            </button>
          ))}
          
          {searchTerm.length >= 2 && searchResults.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No players found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerSearchModal;