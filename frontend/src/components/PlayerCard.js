import React from 'react';
import { motion } from 'framer-motion';

const clubColors = {
  'ARS': { primary: '#EF0107', secondary: '#FFFFFF' },
  'AVL': { primary: '#670E36', secondary: '#95BFE5' },
  'BOU': { primary: '#DA291C', secondary: '#000000' },
  'BRE': { primary: '#E30613', secondary: '#FBB800' },
  'BHA': { primary: '#0057B8', secondary: '#FFFFFF' },
  'BUR': { primary: '#6C1D45', secondary: '#99D6EA' },
  'CHE': { primary: '#034694', secondary: '#FFFFFF' },
  'CRY': { primary: '#1B458F', secondary: '#C4122E' },
  'EVE': { primary: '#003399', secondary: '#FFFFFF' },
  'FUL': { primary: '#FFFFFF', secondary: '#000000' },
  'LIV': { primary: '#C8102E', secondary: '#F6EB61' },
  'LUT': { primary: '#F78F1E', secondary: '#1A1A1A' },
  'MCI': { primary: '#6CABDD', secondary: '#FFFFFF' },
  'MUN': { primary: '#DA291C', secondary: '#FBE122' },
  'NEW': { primary: '#241F20', secondary: '#FFFFFF' },
  'NFO': { primary: '#DD0000', secondary: '#FFFFFF' },
  'SHU': { primary: '#EE2737', secondary: '#000000' },
  'TOT': { primary: '#FFFFFF', secondary: '#132257' },
  'WHU': { primary: '#7A263A', secondary: '#1BB1E7' },
  'WOL': { primary: '#FDB913', secondary: '#231F20' }
};

const PlayerCard = ({ name, position, points, isCaptain, club, className = '' }) => {
  const clubColor = clubColors[club] || { primary: '#1F2937', secondary: '#FFFFFF' };
  
  // Calculate displayed points - double if captain
  const displayPoints = isCaptain ? points * 2 : points;

  return (
    <motion.div
      className={`rounded-lg shadow-md p-2 text-center w-20 h-28 flex flex-col justify-between ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={{
        backgroundColor: clubColor.primary,
        color: clubColor.secondary,
        boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1)`,
        position: 'relative',
        zIndex: 10
      }}
    >
      <div className="flex justify-between items-start">
        <span className="text-xs font-semibold">{position}</span>
        {isCaptain && <span className="text-xs bg-yellow-400 text-black font-bold px-1 rounded">C</span>}
      </div>
      <p className="font-bold text-xs truncate">{name}</p>
      <p className="text-xs">{club}</p>
      <p className="text-sm font-bold">{displayPoints}</p>
    </motion.div>
  );
};

export default PlayerCard;