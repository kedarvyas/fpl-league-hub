import React from 'react';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import {
    getDefensiveContribution,
    getDefconGameweeks,
    formatCount,
    formatDecimal
} from '../lib/playerStats';

const ComponentTile = ({ label, value, counted, note }) => (
    <div className={`rounded-lg p-3 ${counted ? 'bg-purple-50' : 'bg-gray-50'}`}>
        <p className={`text-xl sm:text-2xl font-bold ${counted ? 'text-purple-700' : 'text-gray-400'}`}>
            {formatCount(value)}
        </p>
        <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
        {note && <p className="text-[11px] leading-tight text-gray-500 mt-1">{note}</p>}
    </div>
);

/**
 * The marquee new 2026/27 category. Shows the raw metric, how it is built
 * from tackles / CBI / recoveries, and how close the player runs to the
 * per-match threshold that pays 2 points.
 */
const PlayerDefensiveContribution = ({ playerData, history }) => {
    if (!playerData) return null;

    const dc = getDefensiveContribution(playerData);
    const returns = getDefconGameweeks(history, dc.elementType);
    const hitsThreshold = dc.eligible && dc.threshold > 0 && dc.per90 >= dc.threshold;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        {dc.eligible
                            ? <Shield className="w-5 h-5 text-purple-600" />
                            : <ShieldOff className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">
                            Defensive Contribution
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500">New scoring category for 2026/27</p>
                    </div>
                </div>
                <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                    {dc.eligible ? '+2 pts' : 'N/A'}
                </span>
            </div>

            {dc.eligible ? (
                <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs text-gray-500">Season total</p>
                            <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                                {formatCount(dc.total)}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">Defensive actions counted</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                            <p className="text-xs text-gray-500">Per 90 minutes</p>
                            <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                                {formatDecimal(dc.per90, 1, '0.0')}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Needs {dc.threshold} in a match
                            </p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                            <span>Rate vs threshold</span>
                            <span className={hitsThreshold ? 'font-semibold text-green-600' : ''}>
                                {formatDecimal(dc.per90, 1, '0.0')} / {dc.threshold}
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${hitsThreshold ? 'bg-green-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.round(dc.progress * 100)}%` }}
                            />
                        </div>
                        {hitsThreshold && (
                            <p className="flex items-center space-x-1 text-xs text-green-600 mt-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Averaging above the threshold</span>
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <ComponentTile label="Tackles" value={dc.tackles} counted />
                        <ComponentTile label="CBI" value={dc.cbi} counted note="Clearances, blocks, interceptions" />
                        <ComponentTile
                            label="Recoveries"
                            value={dc.recoveries}
                            counted={dc.countsRecoveries}
                            note={dc.countsRecoveries ? 'Counts for this position' : 'Not counted for defenders'}
                        />
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                        <p className="text-xs text-gray-500">
                            {dc.countsRecoveries
                                ? 'Midfielders and forwards earn 2 points for 12+ tackles, clearances, blocks, interceptions and recoveries in a match.'
                                : 'Defenders earn 2 points for 10+ tackles, clearances, blocks and interceptions in a match. Recoveries do not count.'}
                        </p>
                        {returns.played > 0 && (
                            <p className="text-xs font-medium text-gray-700">
                                Hit the threshold in {returns.hits} of {returns.played}{' '}
                                {returns.played === 1 ? 'match' : 'matches'} — {returns.points} pts earned
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 sm:p-4 mb-4">
                        <p className="text-sm font-medium text-amber-800">
                            Goalkeepers do not earn Defensive Contribution points.
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            The category pays 2 points to defenders, midfielders and forwards only. The
                            underlying actions are still tracked below.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        <ComponentTile label="Tackles" value={dc.tackles} counted={false} />
                        <ComponentTile label="CBI" value={dc.cbi} counted={false} note="Clearances, blocks, interceptions" />
                        <ComponentTile label="Recoveries" value={dc.recoveries} counted={false} />
                    </div>
                </>
            )}
        </div>
    );
};

/** Narrow variant used in the ICT side panel / mobile stack. */
export const PlayerDefconCompact = ({ playerData }) => {
    if (!playerData) return null;

    const dc = getDefensiveContribution(playerData);
    const hitsThreshold = dc.eligible && dc.threshold > 0 && dc.per90 >= dc.threshold;

    return (
        <div className="w-full p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors duration-200">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 min-w-0">
                    <Shield className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="font-medium text-sm text-gray-900 truncate">Def. Contribution</span>
                </div>
                <span className="text-[11px] font-semibold text-purple-700 flex-shrink-0">
                    {dc.eligible ? '+2 pts' : 'GKP: N/A'}
                </span>
            </div>

            <div className="space-y-1">
                <div className="text-2xl font-bold text-gray-900">{formatCount(dc.total)}</div>
                <div className="text-xs text-gray-600">
                    {dc.eligible
                        ? `${formatDecimal(dc.per90, 1, '0.0')} per 90 · needs ${dc.threshold}`
                        : 'Not a scoring category for goalkeepers'}
                </div>
            </div>

            {dc.eligible && (
                <div className="h-1.5 w-full bg-white/70 rounded-full overflow-hidden mt-3">
                    <div
                        className={`h-full rounded-full ${hitsThreshold ? 'bg-green-500' : 'bg-purple-500'}`}
                        style={{ width: `${Math.round(dc.progress * 100)}%` }}
                    />
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                    <div className="text-sm font-semibold text-gray-900">{formatCount(dc.tackles)}</div>
                    <div className="text-[10px] text-gray-600">Tackles</div>
                </div>
                <div>
                    <div className="text-sm font-semibold text-gray-900">{formatCount(dc.cbi)}</div>
                    <div className="text-[10px] text-gray-600">CBI</div>
                </div>
                <div>
                    <div className={`text-sm font-semibold ${dc.countsRecoveries ? 'text-gray-900' : 'text-gray-400'}`}>
                        {formatCount(dc.recoveries)}
                    </div>
                    <div className="text-[10px] text-gray-600">Recov.</div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDefensiveContribution;
