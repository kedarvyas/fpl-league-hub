import React from 'react';
import { ArrowLeftRight, X } from 'lucide-react';

const ComparisonMetric = ({ label, value1, value2, higherIsBetter = true }) => {
    const getValue = (val) => parseFloat(val) || 0;
    const diff = getValue(value1) - getValue(value2);
    const isBetter = higherIsBetter ? diff > 0 : diff < 0;

    return (
        <div className="grid grid-cols-3 items-center py-2 border-b border-gray-100 last:border-b-0">
            <div className="text-sm text-gray-600">{label}</div>
            <div className={`text-center text-sm font-medium ${isBetter ? 'text-green-600' : ''}`}>
                {value1}
            </div>
            <div className={`text-center text-sm font-medium ${!isBetter ? 'text-green-600' : ''}`}>
                {value2}
            </div>
        </div>
    );
};


const PlayerComparison = ({ player1, player2, onClose }) => {
    const formatNumber = (num) => num?.toLocaleString() || "0";

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
                            value1={`£${(player1?.now_cost / 10).toFixed(1)}m`}
                            value2={`£${(player2?.now_cost / 10).toFixed(1)}m`}
                            higherIsBetter={false}
                        />
                        <ComparisonMetric
                            label="Form"
                            value1={player1?.form}
                            value2={player2?.form}
                        />
                        <ComparisonMetric
                            label="Points Per Game"
                            value1={player1?.points_per_game}
                            value2={player2?.points_per_game}
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
                            value1={player1?.expected_goals || "0"}
                            value2={player2?.expected_goals || "0"}
                        />
                        <ComparisonMetric
                            label="Expected Assists"
                            value1={player1?.expected_assists || "0"}
                            value2={player2?.expected_assists || "0"}
                        />

                        {/* Ownership & Transfers */}
                        <div className="text-xs font-semibold text-gray-700 pt-2">Ownership & Transfers</div>
                        <ComparisonMetric
                            label="Selected By"
                            value1={`${player1?.selected_by_percent}%`}
                            value2={`${player2?.selected_by_percent}%`}
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