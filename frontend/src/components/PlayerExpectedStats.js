import React from 'react';
import { Activity } from 'lucide-react';
import { getExpectedStats, formatDecimal, toNumber } from '../lib/playerStats';

const diffTone = (diff, higherIsBetter) => {
    if (Math.abs(diff) < 0.05) return 'text-gray-500';
    const good = higherIsBetter ? diff > 0 : diff < 0;
    return good ? 'text-green-600' : 'text-red-600';
};

/**
 * The full expected-stats family (xG, xA, xGI, xGC) with per-90 rates and
 * over/under-performance against the real numbers.
 */
const PlayerExpectedStats = ({ playerData }) => {
    if (!playerData) return null;

    const rows = getExpectedStats(playerData);
    const minutes = toNumber(playerData.minutes);

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">Expected Stats</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Season totals, per 90 and actual output</p>
                </div>
            </div>

            <div className="-mx-4 sm:mx-0 overflow-x-auto">
                <table className="w-full min-w-[460px] text-sm">
                    <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                            <th className="text-left font-medium py-2 pl-4 sm:pl-0">Metric</th>
                            <th className="text-right font-medium py-2 px-2">Season</th>
                            <th className="text-right font-medium py-2 px-2">Per 90</th>
                            <th className="text-right font-medium py-2 px-2">Actual</th>
                            <th className="text-right font-medium py-2 pr-4 sm:pr-0">Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const diff = row.actual - row.total;
                            return (
                                <tr key={row.key} className="border-b border-gray-50 last:border-b-0">
                                    <td className="py-2.5 pl-4 sm:pl-0">
                                        <div className="font-medium text-gray-900">{row.short}</div>
                                        <div className="text-xs text-gray-500">{row.label}</div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right font-semibold text-purple-600 whitespace-nowrap">
                                        {formatDecimal(row.total, 2, '0.00')}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-gray-700 whitespace-nowrap">
                                        {formatDecimal(row.per90, 2, '0.00')}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-gray-700 whitespace-nowrap">
                                        {formatDecimal(row.actual, 0, '0')}
                                        <span className="block text-[11px] text-gray-400">{row.actualLabel}</span>
                                    </td>
                                    <td className={`py-2.5 pr-4 sm:pr-0 text-right font-medium whitespace-nowrap ${diffTone(diff, row.higherIsBetter)}`}>
                                        {diff > 0 ? '+' : ''}{formatDecimal(diff, 2, '0.00')}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-gray-500 mt-3">
                {minutes > 0
                    ? 'Diff compares real output against the expected figure — positive means overperforming (for xGC, negative is better).'
                    : 'No minutes played yet this season, so per 90 rates are not meaningful.'}
            </p>
        </div>
    );
};

export default PlayerExpectedStats;
