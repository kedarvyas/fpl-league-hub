import React from 'react';
import { BarChart3, Star } from 'lucide-react';
import {
    getSeasonStats,
    getPositionName,
    formatCount,
    toNumber
} from '../lib/playerStats';

/**
 * Core season stats that the app never showed before — starts, BPS, clean
 * sheets, saves, cards, defensive contribution — laid out per position.
 */
const PlayerSeasonStats = ({ playerData }) => {
    if (!playerData) return null;

    const rows = getSeasonStats(playerData);
    const dreamteamCount = toNumber(playerData.dreamteam_count);
    const inDreamteam = playerData.in_dreamteam === true;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">Season Stats</h2>
                        <p className="text-xs sm:text-sm text-gray-500">
                            {getPositionName(playerData.element_type)} scoring lines
                        </p>
                    </div>
                </div>
                {(inDreamteam || dreamteamCount > 0) && (
                    <span className="flex items-center space-x-1 flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        <Star className="w-3.5 h-3.5" />
                        <span>
                            {inDreamteam ? 'In dreamteam' : `${formatCount(dreamteamCount)}× dreamteam`}
                        </span>
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {rows.map((row) => (
                    <div key={row.key} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 leading-tight">{row.label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-purple-600">{row.value}</p>
                        {row.sub && <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{row.sub}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerSeasonStats;
