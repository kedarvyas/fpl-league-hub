import React from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import {
    getDefensiveContribution,
    getPriceOutlook,
    getSetPieces,
    formatCount,
    formatDecimal,
    formatPrice,
    formatSignedPercent,
    priceMoveWord,
    ordinal
} from '../lib/playerStats';

const ComparisonMetric = ({ label, value1, value2, higherIsBetter = true, neutral = false }) => {
    const getValue = (val) => parseFloat(val) || 0;
    const diff = getValue(value1) - getValue(value2);
    const better = neutral || diff === 0
        ? 0
        : (higherIsBetter ? diff > 0 : diff < 0) ? 1 : 2;

    return (
        <div className="grid grid-cols-3 items-center py-2 border-b border-gray-100 last:border-b-0 gap-2">
            <div className="text-sm text-gray-600">{label}</div>
            <div className={`text-center text-sm font-medium ${better === 1 ? 'text-green-600' : ''}`}>
                {value1}
            </div>
            <div className={`text-center text-sm font-medium ${better === 2 ? 'text-green-600' : ''}`}>
                {value2}
            </div>
        </div>
    );
};

/** Defensive contribution reads N/A for goalkeepers — they cannot score it. */
const defconValue = (player, pick) => {
    const dc = getDefensiveContribution(player);
    if (!dc.eligible) return 'N/A';
    return pick(dc);
};

const priceProjectionValue = (player) => {
    const outlook = getPriceOutlook(player);
    if (!outlook || !outlook.next) return '—';
    return `${priceMoveWord(outlook.next.direction)} ${formatSignedPercent(outlook.next.percent, 0)}`;
};

const setPieceValue = (player, key) => {
    const duty = getSetPieces(player).find((entry) => entry.key === key);
    if (!duty || duty.order === null) return '—';
    return ordinal(duty.order);
};


const PlayerComparison = ({ player1, player2, onClose }) => {
    const formatNumber = (num) => formatCount(num);

    return (
        <div className="fixed inset-x-0 inset-y-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-2xl bg-white h-[calc(100%-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)] mt-[calc(env(safe-area-inset-top)+1rem)] mb-[calc(env(safe-area-inset-bottom)+1rem)] overflow-hidden sm:rounded-2xl shadow-lg mx-4">
                {/* Header - Fixed position */}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-purple-800 px-4 py-3 z-10">
                    <div className="flex justify-between items-center text-white">
                        <h2 className="text-base font-bold">Player Comparison</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-white mt-3">
                        {/* Player sections */}
                        <div className="text-center">
                            <div className="w-10 h-10 mx-auto bg-white rounded-full overflow-hidden flex items-center justify-center">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player1?.code}.png`}
                                    alt={player1?.web_name}
                                    className="w-[150%] h-[150%] object-cover object-top transform -translate-y-[-14px]"
                                />
                            </div>
                            <div className="mt-1 font-medium text-sm truncate px-1">{player1?.web_name}</div>
                            <div className="text-xs opacity-80">{player1?.teamShortName}</div>
                        </div>

                        <div className="flex items-center justify-center">
                            <ArrowLeftRight className="w-5 h-5" />
                        </div>

                        <div className="text-center">
                            <div className="w-10 h-10 mx-auto bg-white rounded-full overflow-hidden flex items-center justify-center">
                                <img
                                    src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player2?.code}.png`}
                                    alt={player2?.web_name}
                                    className="w-[150%] h-[150%] object-cover object-top transform -translate-y-[-14px]"
                                />
                            </div>
                            <div className="mt-1 font-medium text-sm truncate px-1">{player2?.web_name}</div>
                            <div className="text-xs opacity-80">{player2?.teamShortName}</div>
                        </div>
                    </div>
                </div>

                {/* Comparison Content */}
                <div className="h-full overflow-y-auto pt-[160px] pb-4">
                    <div className="px-4 space-y-4">
                        {/* Headers */}
                        <div className="grid grid-cols-3 items-center text-xs font-medium text-gray-500">
                            <div>Metric</div>
                            <div className="text-center">{player1?.web_name}</div>
                            <div className="text-center">{player2?.web_name}</div>
                        </div>

                        {/* Form & Price */}
                        <ComparisonMetric
                            label="Price"
                            value1={formatPrice(player1?.now_cost)}
                            value2={formatPrice(player2?.now_cost)}
                            higherIsBetter={false}
                        />
                        <ComparisonMetric
                            label="Form"
                            value1={formatDecimal(player1?.form, 1, '0.0')}
                            value2={formatDecimal(player2?.form, 1, '0.0')}
                        />
                        <ComparisonMetric
                            label="Points Per Game"
                            value1={formatDecimal(player1?.points_per_game, 1, '0.0')}
                            value2={formatDecimal(player2?.points_per_game, 1, '0.0')}
                        />
                        <ComparisonMetric
                            label="Total Points"
                            value1={formatCount(player1?.total_points)}
                            value2={formatCount(player2?.total_points)}
                        />
                        <ComparisonMetric
                            label="Expected Points (next)"
                            value1={formatDecimal(player1?.ep_next, 1, '0.0')}
                            value2={formatDecimal(player2?.ep_next, 1, '0.0')}
                        />
                        <ComparisonMetric
                            label="BPS"
                            value1={formatCount(player1?.bps)}
                            value2={formatCount(player2?.bps)}
                        />
                        <ComparisonMetric
                            label="Starts"
                            value1={formatCount(player1?.starts)}
                            value2={formatCount(player2?.starts)}
                        />

                        {/* Defensive Contribution */}
                        <div className="text-xs font-semibold text-gray-700 pt-2">Defensive Contribution</div>
                        <ComparisonMetric
                            label="DefCon total"
                            value1={defconValue(player1, (dc) => formatCount(dc.total))}
                            value2={defconValue(player2, (dc) => formatCount(dc.total))}
                        />
                        <ComparisonMetric
                            label="DefCon per 90"
                            value1={defconValue(player1, (dc) => formatDecimal(dc.per90, 1, '0.0'))}
                            value2={defconValue(player2, (dc) => formatDecimal(dc.per90, 1, '0.0'))}
                        />
                        <ComparisonMetric
                            label="Tackles"
                            value1={formatCount(player1?.tackles)}
                            value2={formatCount(player2?.tackles)}
                        />
                        <ComparisonMetric
                            label="CBI"
                            value1={formatCount(player1?.clearances_blocks_interceptions)}
                            value2={formatCount(player2?.clearances_blocks_interceptions)}
                        />
                        <ComparisonMetric
                            label="Recoveries"
                            value1={formatCount(player1?.recoveries)}
                            value2={formatCount(player2?.recoveries)}
                        />

                        {/* ICT Index */}
                        <div className="text-xs font-semibold text-gray-700 pt-2">ICT Index</div>
                        <ComparisonMetric
                            label="Influence"
                            value1={player1?.influence_rank}
                            value2={player2?.influence_rank}
                            higherIsBetter={false}
                        />
                        <ComparisonMetric
                            label="Creativity"
                            value1={player1?.creativity_rank}
                            value2={player2?.creativity_rank}
                            higherIsBetter={false}
                        />
                        <ComparisonMetric
                            label="Threat"
                            value1={player1?.threat_rank}
                            value2={player2?.threat_rank}
                            higherIsBetter={false}
                        />

                        {/* Expected Stats */}
                        <div className="text-xs font-semibold text-gray-700 pt-2">Expected Stats</div>
                        <ComparisonMetric
                            label="Expected Goals"
                            value1={formatDecimal(player1?.expected_goals, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_goals, 2, '0.00')}
                        />
                        <ComparisonMetric
                            label="Expected Assists"
                            value1={formatDecimal(player1?.expected_assists, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_assists, 2, '0.00')}
                        />
                        <ComparisonMetric
                            label="xG Involvements"
                            value1={formatDecimal(player1?.expected_goal_involvements, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_goal_involvements, 2, '0.00')}
                        />
                        <ComparisonMetric
                            label="xG Conceded"
                            value1={formatDecimal(player1?.expected_goals_conceded, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_goals_conceded, 2, '0.00')}
                            higherIsBetter={false}
                        />

                        {/* Set pieces & price outlook */}
                        <div className="text-xs font-semibold text-gray-700 pt-2">Set Pieces & Price</div>
                        <ComparisonMetric
                            label="Penalties"
                            value1={setPieceValue(player1, 'penalties')}
                            value2={setPieceValue(player2, 'penalties')}
                            neutral
                        />
                        <ComparisonMetric
                            label="Corners / indirect"
                            value1={setPieceValue(player1, 'corners')}
                            value2={setPieceValue(player2, 'corners')}
                            neutral
                        />
                        <ComparisonMetric
                            label="Price outlook"
                            value1={priceProjectionValue(player1)}
                            value2={priceProjectionValue(player2)}
                            neutral
                        />

                        {/* Ownership & Transfers */}
                        <div className="text-xs font-semibold text-gray-700 pt-2">Ownership & Transfers</div>
                        <ComparisonMetric
                            label="Selected By"
                            value1={`${formatDecimal(player1?.selected_by_percent, 1, '0.0')}%`}
                            value2={`${formatDecimal(player2?.selected_by_percent, 1, '0.0')}%`}
                        />
                        <ComparisonMetric
                            label="GW Transfers In"
                            value1={formatNumber(player1?.transfers_in_event)}
                            value2={formatNumber(player2?.transfers_in_event)}
                        />
                        <ComparisonMetric
                            label="GW Transfers Out"
                            value1={formatNumber(player1?.transfers_out_event)}
                            value2={formatNumber(player2?.transfers_out_event)}
                        />
                        <ComparisonMetric
                            label="Net Transfers"
                            value1={formatNumber(player1?.transfers_in_event - player1?.transfers_out_event)}
                            value2={formatNumber(player2?.transfers_in_event - player2?.transfers_out_event)}
                        />
                    </div>

                    {/* Transfer Note */}
                    <div className="mt-3 text-xs text-gray-500 italic">
                        * Transfer stats are for the current gameweek only
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerComparison;