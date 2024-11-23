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
    // Format transfer numbers with commas
    const formatNumber = (num) => num?.toLocaleString() || "0";

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-2xl">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-3">
                <div className="flex justify-between items-center text-white mb-3">
                    <h2 className="text-base font-bold">Player Comparison</h2>
                    <button onClick={onClose} className="text-white hover:text-gray-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-white">
                    {/* First Player */}
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto bg-white rounded-full overflow-hidden flex items-center justify-center">
                            <img
                                src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player1?.code}.png`}
                                alt={player1?.web_name}
                                className="w-[150%] h-[150%] object-cover object-top transform -translate-y-[-14px]"
                            />
                        </div>
                        <div className="mt-1 font-medium text-sm">{player1?.web_name}</div>
                        <div className="text-xs opacity-80">{player1?.teamShortName}</div>
                    </div>

                    {/* Arrow Icon */}
                    <div className="flex items-center justify-center">
                        <ArrowLeftRight className="w-5 h-5" />
                    </div>

                    {/* Second Player */}
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto bg-white rounded-full overflow-hidden flex items-center justify-center">
                            <img
                                src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player2?.code}.png`}
                                alt={player2?.web_name}
                                className="w-[150%] h-[150%] object-cover object-top transform -translate-y-[-14px]"
                            />
                        </div>
                        <div className="mt-1 font-medium text-sm">{player2?.web_name}</div>
                        <div className="text-xs opacity-80">{player2?.teamShortName}</div>
                    </div>
                </div>
            </div>

            {/* Comparison Content */}
            <div className="p-3">
                <div className="space-y-1">
                    {/* Headers */}
                    <div className="grid grid-cols-3 items-center text-xs font-medium text-gray-500 pb-2">
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
    );
};

export default PlayerComparison;