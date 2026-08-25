import React from 'react';
import { ArrowUp, ArrowDown, Minus, Lock, LineChart } from 'lucide-react';
import {
    getPriceOutlook,
    formatPrice,
    formatPriceDelta,
    formatLockedUntil,
    formatSignedPercent,
    priceConfidence,
    priceMoveWord,
    toNumber
} from '../lib/playerStats';

const DirectionIcon = ({ direction, className = 'w-4 h-4' }) => {
    if (direction > 0) return <ArrowUp className={`${className} text-green-600`} />;
    if (direction < 0) return <ArrowDown className={`${className} text-red-600`} />;
    return <Minus className={`${className} text-gray-400`} />;
};

const directionText = (direction) => {
    if (direction > 0) return 'text-green-600';
    if (direction < 0) return 'text-red-600';
    return 'text-gray-500';
};

const PriceDeltaChip = ({ label, tenths }) => {
    const value = toNumber(tenths);
    const tone = value > 0
        ? 'bg-green-50 text-green-700'
        : value < 0
            ? 'bg-red-50 text-red-700'
            : 'bg-gray-100 text-gray-600';
    return (
        <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{label}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-sm font-semibold ${tone}`}>
                {formatPriceDelta(value)}
            </span>
        </div>
    );
};

/**
 * 2026/27 dynamic pricing: current momentum plus FPL's own three-day
 * projection. Renders an explicit empty state when no projection exists.
 */
const PlayerPriceProjection = ({ playerData }) => {
    if (!playerData) return null;

    const outlook = getPriceOutlook(playerData);
    const momentum = outlook ? outlook.momentum : 0;
    const magnitude = Math.min(Math.abs(momentum), 100);
    const lockedUntil = outlook ? formatLockedUntil(outlook.lockedUntil) : null;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <LineChart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight">Price Watch</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Dynamic pricing projection</p>
                    </div>
                </div>
                <span className="flex-shrink-0 text-xl sm:text-2xl font-bold text-purple-600">
                    {formatPrice(playerData.now_cost)}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <PriceDeltaChip label="This gameweek" tenths={playerData.cost_change_event} />
                <PriceDeltaChip label="Since season start" tenths={playerData.cost_change_start} />
            </div>

            {outlook ? (
                <>
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                            <span>Price momentum</span>
                            <span className={`font-semibold ${directionText(outlook.direction)}`}>
                                {formatSignedPercent(momentum)}
                            </span>
                        </div>
                        <div className="flex items-center h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="w-1/2 h-full flex justify-end">
                                {momentum < 0 && (
                                    <div
                                        className="h-full bg-red-500 rounded-l-full transition-all duration-500"
                                        style={{ width: `${magnitude}%` }}
                                    />
                                )}
                            </div>
                            <div className="w-1/2 h-full flex justify-start">
                                {momentum > 0 && (
                                    <div
                                        className="h-full bg-green-500 rounded-r-full transition-all duration-500"
                                        style={{ width: `${magnitude}%` }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                            <span>Falling</span>
                            <span>Rising</span>
                        </div>
                    </div>

                    {outlook.projections.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {outlook.projections.map((projection) => (
                                <div
                                    key={projection.offset}
                                    className={`rounded-lg p-3 text-center ${projection.direction === 0 ? 'bg-gray-50' : projection.direction > 0 ? 'bg-green-50' : 'bg-red-50'}`}
                                >
                                    <p className="text-[11px] text-gray-500 truncate">{projection.label}</p>
                                    <div className="flex items-center justify-center space-x-1 mt-1">
                                        <DirectionIcon direction={projection.direction} className="w-3.5 h-3.5" />
                                        <span className={`text-sm font-bold ${directionText(projection.direction)}`}>
                                            {priceMoveWord(projection.direction)}
                                        </span>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 mt-0.5">
                                        {formatSignedPercent(projection.percent)}
                                    </p>
                                    <div
                                        className="flex items-center justify-center space-x-0.5 mt-1.5"
                                        title={`Likelihood ${priceConfidence(projection.steps)} of 5`}
                                    >
                                        {[1, 2, 3, 4, 5].map((dot) => (
                                            <span
                                                key={dot}
                                                className={`w-1.5 h-1.5 rounded-full ${dot <= priceConfidence(projection.steps)
                                                    ? projection.direction > 0 ? 'bg-green-500' : projection.direction < 0 ? 'bg-red-500' : 'bg-gray-400'
                                                    : 'bg-gray-200'}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                            No day-by-day projection published for this player yet.
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                        <p className="text-xs text-gray-500">
                            Projections come from FPL's dynamic pricing model. The percentage tracks how
                            far the player has moved toward a price change; the dots are FPL's own
                            likelihood rating out of five.
                        </p>
                        {outlook.calibrating && (
                            <p className="text-xs font-medium text-amber-700">
                                FPL is still calibrating this player's price — treat the projection as provisional.
                            </p>
                        )}
                        {lockedUntil && (
                            <p className="flex items-center space-x-1 text-xs font-medium text-gray-700">
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                                <span>Price locked until {lockedUntil}</span>
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
                    FPL has not published a price projection for this player.
                </div>
            )}
        </div>
    );
};

export default PlayerPriceProjection;
