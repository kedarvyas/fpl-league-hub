import React, { useEffect } from 'react';
import PlayerPhoto from './PlayerPhoto';
import {
    getDefensiveContribution,
    getPositionShort,
    getPriceOutlook,
    getSetPieces,
    formatCount,
    formatDecimal,
    formatPrice,
    formatSignedPercent,
    priceMoveWord,
    ordinal,
} from '../lib/playerStats';

/**
 * Head-to-head player comparison, on the Scoreboard system.
 *
 * Two things beyond the restyle. The panel used an absolutely positioned header
 * with `pt-[160px]` on the scroll body to clear it, which broke the moment a
 * long name wrapped; it is a flex column now, so the header takes the height it
 * needs and the body gets the rest. And the winning value was `text-green-600`,
 * a hardcoded colour that did not exist in any theme — the better side now
 * takes --foreground with a --live rule under it, the worse side goes muted, so
 * a column can be scanned without reading a single number.
 */

const Row = ({ label, value1, value2, higherIsBetter = true, neutral = false }) => {
    const n = (v) => {
        const parsed = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    };
    const a = n(value1);
    const b = n(value2);

    let better = 0;
    if (!neutral && a !== null && b !== null && a !== b) {
        better = (higherIsBetter ? a > b : a < b) ? 1 : 2;
    }

    const cell = (value, isBetter) => (
        <span className="flex flex-col items-center gap-1.5">
            <span
                className={`text-[12px] leading-none tracking-[-0.01em] ${
                    isBetter ? 'font-bold text-foreground' : 'text-muted-foreground'
                }`}
            >
                {value}
            </span>
            {/* --live as a 2px rule, never as text: it stays legible in all six
                themes and gives the eye a column to run down. */}
            <span className={`h-[2px] w-6 ${isBetter ? 'bg-live' : 'bg-transparent'}`} />
        </span>
    );

    return (
        <div className="grid grid-cols-[1fr_72px_72px] items-center gap-2 bg-panel px-3 py-2.5 md:grid-cols-[1fr_84px_84px] md:px-4">
            <span className="min-w-0 truncate text-[8.5px] font-medium uppercase tracking-[0.13em] text-muted-foreground">
                {label}
            </span>
            {cell(value1, better === 1)}
            {cell(value2, better === 2)}
        </div>
    );
};

const Group = ({ label }) => (
    <div className="flex items-center gap-2 bg-panel px-3 pb-2 pt-3.5 md:px-4">
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {label}
        </span>
        <span className="h-px flex-1 bg-border" />
    </div>
);

const Side = ({ player }) => (
    <div className="flex flex-col items-center text-center">
        <PlayerPhoto
            code={player?.code}
            name={player?.web_name}
            size="sm"
            className="h-[46px] w-[36px] shrink-0 border border-border bg-background text-[14px]"
        />
        <span className="mt-2 block w-full break-words text-[10px] font-bold uppercase leading-[1.15] tracking-[-0.01em] text-foreground md:text-[11px]">
            {player?.web_name}
        </span>
        <span className="mt-1.5 block w-full truncate text-[7.5px] leading-none tracking-[0.12em] text-muted-foreground">
            {getPositionShort(player?.element_type)} · {player?.teamShortName}
        </span>
    </div>
);

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
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full max-w-2xl flex-col border border-border bg-panel"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header takes the height it needs; the body gets the rest. */}
                <div className="shrink-0 border-b border-border">
                    <div className="flex items-center justify-between px-3 py-3 md:px-4">
                        <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
                            Comparison
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            className="-mr-2 flex h-11 w-11 items-center justify-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="grid grid-cols-[1fr_72px_72px] items-end gap-2 px-3 pb-3 md:grid-cols-[1fr_84px_84px] md:px-4">
                        <span className="text-[7.5px] tracking-[0.14em] text-muted-foreground">
                            METRIC
                        </span>
                        <Side player={player1} />
                        <Side player={player2} />
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-px bg-border">
                        <Group label="Returns" />
                        <Row
                            label="Price"
                            value1={formatPrice(player1?.now_cost)}
                            value2={formatPrice(player2?.now_cost)}
                            higherIsBetter={false}
                        />
                        <Row
                            label="Form"
                            value1={formatDecimal(player1?.form, 1, '0.0')}
                            value2={formatDecimal(player2?.form, 1, '0.0')}
                        />
                        <Row
                            label="Points / game"
                            value1={formatDecimal(player1?.points_per_game, 1, '0.0')}
                            value2={formatDecimal(player2?.points_per_game, 1, '0.0')}
                        />
                        <Row
                            label="Total points"
                            value1={formatCount(player1?.total_points)}
                            value2={formatCount(player2?.total_points)}
                        />
                        <Row
                            label="Expected pts (next)"
                            value1={formatDecimal(player1?.ep_next, 1, '0.0')}
                            value2={formatDecimal(player2?.ep_next, 1, '0.0')}
                        />
                        <Row
                            label="BPS"
                            value1={formatCount(player1?.bps)}
                            value2={formatCount(player2?.bps)}
                        />
                        <Row
                            label="Starts"
                            value1={formatCount(player1?.starts)}
                            value2={formatCount(player2?.starts)}
                        />

                        <Group label="Defensive contribution" />
                        <Row
                            label="DefCon total"
                            value1={defconValue(player1, (dc) => formatCount(dc.total))}
                            value2={defconValue(player2, (dc) => formatCount(dc.total))}
                        />
                        <Row
                            label="DefCon / 90"
                            value1={defconValue(player1, (dc) => formatDecimal(dc.per90, 1, '0.0'))}
                            value2={defconValue(player2, (dc) => formatDecimal(dc.per90, 1, '0.0'))}
                        />
                        <Row
                            label="Tackles"
                            value1={formatCount(player1?.tackles)}
                            value2={formatCount(player2?.tackles)}
                        />
                        <Row
                            label="CBI"
                            value1={formatCount(player1?.clearances_blocks_interceptions)}
                            value2={formatCount(player2?.clearances_blocks_interceptions)}
                        />
                        <Row
                            label="Recoveries"
                            value1={formatCount(player1?.recoveries)}
                            value2={formatCount(player2?.recoveries)}
                        />

                        <Group label="ICT rank" />
                        <Row
                            label="Influence"
                            value1={formatCount(player1?.influence_rank)}
                            value2={formatCount(player2?.influence_rank)}
                            higherIsBetter={false}
                        />
                        <Row
                            label="Creativity"
                            value1={formatCount(player1?.creativity_rank)}
                            value2={formatCount(player2?.creativity_rank)}
                            higherIsBetter={false}
                        />
                        <Row
                            label="Threat"
                            value1={formatCount(player1?.threat_rank)}
                            value2={formatCount(player2?.threat_rank)}
                            higherIsBetter={false}
                        />

                        <Group label="Expected" />
                        <Row
                            label="xG"
                            value1={formatDecimal(player1?.expected_goals, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_goals, 2, '0.00')}
                        />
                        <Row
                            label="xA"
                            value1={formatDecimal(player1?.expected_assists, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_assists, 2, '0.00')}
                        />
                        <Row
                            label="xGI"
                            value1={formatDecimal(player1?.expected_goal_involvements, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_goal_involvements, 2, '0.00')}
                        />
                        <Row
                            label="xGC"
                            value1={formatDecimal(player1?.expected_goals_conceded, 2, '0.00')}
                            value2={formatDecimal(player2?.expected_goals_conceded, 2, '0.00')}
                            higherIsBetter={false}
                        />

                        <Group label="Set pieces & price" />
                        <Row
                            label="Penalties"
                            value1={setPieceValue(player1, 'penalties')}
                            value2={setPieceValue(player2, 'penalties')}
                            neutral
                        />
                        <Row
                            label="Corners / indirect"
                            value1={setPieceValue(player1, 'corners')}
                            value2={setPieceValue(player2, 'corners')}
                            neutral
                        />
                        <Row
                            label="Price outlook"
                            value1={priceProjectionValue(player1)}
                            value2={priceProjectionValue(player2)}
                            neutral
                        />

                        <Group label="Ownership & transfers" />
                        {/* Ownership is not a quality metric — being more owned
                            is not "winning", and in FPL a differential is often
                            the entire point. Reported, not judged. */}
                        <Row
                            label="Owned by"
                            value1={`${formatDecimal(player1?.selected_by_percent, 1, '0.0')}%`}
                            value2={`${formatDecimal(player2?.selected_by_percent, 1, '0.0')}%`}
                            neutral
                        />
                        <Row
                            label="GW transfers in"
                            value1={formatCount(player1?.transfers_in_event)}
                            value2={formatCount(player2?.transfers_in_event)}
                        />
                        <Row
                            label="GW transfers out"
                            value1={formatCount(player1?.transfers_out_event)}
                            value2={formatCount(player2?.transfers_out_event)}
                            higherIsBetter={false}
                        />
                        <Row
                            label="Net transfers"
                            value1={formatCount(
                                (player1?.transfers_in_event || 0) - (player1?.transfers_out_event || 0),
                            )}
                            value2={formatCount(
                                (player2?.transfers_in_event || 0) - (player2?.transfers_out_event || 0),
                            )}
                        />
                    </div>

                    <p className="px-3 py-3 text-[7.5px] leading-[1.6] tracking-[0.1em] text-muted-foreground md:px-4">
                        Transfer figures are for the current gameweek only. ICT values are ranks, so
                        lower is better.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlayerComparison;
