import React from 'react';
import { Target } from 'lucide-react';
import { getSetPieces, ordinal } from '../lib/playerStats';

const orderTone = (order) => {
    if (order === 1) return 'bg-green-100 text-green-800';
    if (order === 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
};

/**
 * Set-piece duties (penalties / direct free kicks / corners).
 * Renders nothing when the player has no listed duties.
 */
const PlayerSetPieces = ({ playerData }) => {
    const duties = getSetPieces(playerData);
    if (duties.length === 0) return null;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">Set-Piece Duties</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Team order as listed by FPL</p>
                </div>
            </div>

            <div className="space-y-2">
                {duties.map((duty) => (
                    <div key={duty.key} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{duty.label}</p>
                            {duty.text && (
                                <p className="text-xs text-gray-500 mt-0.5">{duty.text}</p>
                            )}
                        </div>
                        {duty.order !== null && (
                            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${orderTone(duty.order)}`}>
                                {ordinal(duty.order)} choice
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlayerSetPieces;
