import React from 'react';
import { ListChecks } from 'lucide-react';
import {
    DEFCON_THRESHOLDS,
    formatCount,
    toNumber
} from '../lib/playerStats';

/**
 * Per-gameweek log from element-summary history. Surfaces the raw match
 * stats the app never showed: BPS, defensive contribution and its
 * components, saves, starts.
 */
const PlayerMatchLog = ({ history, elementType, teams = {} }) => {
    const games = Array.isArray(history)
        ? [...history].sort((a, b) => toNumber(b?.round) - toNumber(a?.round))
        : [];

    const isKeeper = elementType === 1;
    const threshold = DEFCON_THRESHOLDS[elementType] ?? null;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <ListChecks className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">Match Log</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Gameweek by gameweek breakdown</p>
                </div>
            </div>

            {games.length === 0 ? (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    No match data for this season yet.
                </div>
            ) : (
                <>
                    <div className="-mx-4 sm:mx-0 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-sm">
                            <thead>
                                <tr className="text-xs text-gray-500 border-b border-gray-100">
                                    <th className="text-left font-medium py-2 pl-4 sm:pl-0">GW</th>
                                    <th className="text-left font-medium py-2 px-2">Opp</th>
                                    <th className="text-right font-medium py-2 px-2">Pts</th>
                                    <th className="text-right font-medium py-2 px-2">Min</th>
                                    <th className="text-right font-medium py-2 px-2">
                                        {isKeeper ? 'Sv' : 'DC'}
                                    </th>
                                    <th className="text-right font-medium py-2 px-2">Tkl</th>
                                    <th className="text-right font-medium py-2 px-2">CBI</th>
                                    <th className="text-right font-medium py-2 px-2">Rec</th>
                                    <th className="text-right font-medium py-2 px-2">BPS</th>
                                    <th className="text-right font-medium py-2 pr-4 sm:pr-0">Bon</th>
                                </tr>
                            </thead>
                            <tbody>
                                {games.map((game, index) => {
                                    const opponent = teams?.[game?.opponent_team]?.short_name || '—';
                                    const dc = toNumber(game?.defensive_contribution);
                                    const hit = threshold !== null && dc >= threshold;
                                    return (
                                        <tr
                                            key={`${game?.fixture ?? 'fx'}-${game?.round ?? index}`}
                                            className="border-b border-gray-50 last:border-b-0"
                                        >
                                            <td className="py-2.5 pl-4 sm:pl-0 font-medium text-gray-900 whitespace-nowrap">
                                                GW{formatCount(game?.round)}
                                            </td>
                                            <td className="py-2.5 px-2 text-gray-700 whitespace-nowrap">
                                                {opponent}
                                                <span className="text-gray-400 ml-1">
                                                    {game?.was_home ? '(H)' : '(A)'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-2 text-right font-bold text-purple-600">
                                                {formatCount(game?.total_points)}
                                            </td>
                                            <td className="py-2.5 px-2 text-right text-gray-700">
                                                {formatCount(game?.minutes)}
                                            </td>
                                            <td className="py-2.5 px-2 text-right">
                                                {isKeeper ? (
                                                    <span className="text-gray-700">{formatCount(game?.saves)}</span>
                                                ) : (
                                                    <span className={hit ? 'font-semibold text-green-600' : 'text-gray-700'}>
                                                        {formatCount(dc)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-2 text-right text-gray-700">
                                                {formatCount(game?.tackles)}
                                            </td>
                                            <td className="py-2.5 px-2 text-right text-gray-700">
                                                {formatCount(game?.clearances_blocks_interceptions)}
                                            </td>
                                            <td className="py-2.5 px-2 text-right text-gray-700">
                                                {formatCount(game?.recoveries)}
                                            </td>
                                            <td className="py-2.5 px-2 text-right text-gray-700">
                                                {formatCount(game?.bps)}
                                            </td>
                                            <td className="py-2.5 pr-4 sm:pr-0 text-right text-gray-700">
                                                {formatCount(game?.bonus)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                        {isKeeper
                            ? 'Sv = saves. Goalkeepers do not score Defensive Contribution, but tackles, CBI and recoveries are still tracked.'
                            : `DC = defensive contribution; ${threshold ?? '—'}+ in a match is worth 2 points. Swipe the table sideways for more columns.`}
                    </p>
                </>
            )}
        </div>
    );
};

export default PlayerMatchLog;
