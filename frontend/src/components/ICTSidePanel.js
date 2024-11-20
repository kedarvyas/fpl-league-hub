import React, { useState } from 'react';
import { Sparkles, Zap, Flame, Info } from 'lucide-react';

const ICTCard = ({ title, value, positionRank, icon: Icon, description, metrics }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const getBgColor = () => {
    switch (title) {
      case 'Influence': return 'bg-purple-50 hover:bg-purple-100';
      case 'Creativity': return 'bg-blue-50 hover:bg-blue-100';
      case 'Threat': return 'bg-red-50 hover:bg-red-100';
      default: return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  const getIconColor = () => {
    switch (title) {
      case 'Influence': return 'text-purple-500';
      case 'Creativity': return 'text-blue-500';
      case 'Threat': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="relative w-full">
      <div className={`p-4 rounded-lg transition-colors duration-200 ${getBgColor()}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon className={`w-4 h-4 ${getIconColor()}`} />
            <span className="font-medium text-sm text-gray-900">{title}</span>
          </div>
          <button
            className="p-1 hover:bg-white rounded-full transition-colors duration-200"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={`More information about ${title}`}
          >
            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        
        <div className="space-y-1">
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-600">{positionRank} in position</div>
        </div>

        {showTooltip && (
          <div className="absolute z-50 w-72 p-4 bg-white rounded-lg shadow-xl border border-gray-200 mt-2 left-0 lg:left-full lg:ml-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-gray-900">Key Metrics:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {metrics.map((metric, index) => (
                    <li key={index}>{metric}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ICTSidePanel = ({ playerData }) => {
  const ictDescription = {
    influence: {
      description: "Measures a player's impact on a single match. It takes into account game-winning goals, defensive actions, and creating big chances.",
      metrics: [
        "Goals scored",
        "Assists",
        "Key defensive actions",
        "Big chances created"
      ]
    },
    creativity: {
      description: "Assesses a player's ability to create scoring chances for others. It considers key passes, successful crosses, and potential assists.",
      metrics: [
        "Key passes",
        "Successful crosses",
        "Pass completion in final third",
        "Big chances created"
      ]
    },
    threat: {
      description: "Evaluates a player's threat on goal. It analyzes shots, touches in the box, and the quality of scoring opportunities.",
      metrics: [
        "Shots on target",
        "Touches in opposition box",
        "Expected goals (xG)",
        "Big chances"
      ]
    }
  };

  return (
    <div className="space-y-3">
      <ICTCard
        title="Influence"
        value={playerData.influence_rank}
        positionRank={`${playerData.influence_rank_type}`}
        icon={Sparkles}
        description={ictDescription.influence.description}
        metrics={ictDescription.influence.metrics}
      />
      <ICTCard
        title="Creativity"
        value={playerData.creativity_rank}
        positionRank={`${playerData.creativity_rank_type}`}
        icon={Zap}
        description={ictDescription.creativity.description}
        metrics={ictDescription.creativity.metrics}
      />
      <ICTCard
        title="Threat"
        value={playerData.threat_rank}
        positionRank={`${playerData.threat_rank_type}`}
        icon={Flame}
        description={ictDescription.threat.description}
        metrics={ictDescription.threat.metrics}
      />
    </div>
  );
};

export default ICTSidePanel;