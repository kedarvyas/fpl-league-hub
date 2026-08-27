import React from 'react';
import PlayerPhoto from './PlayerPhoto';
import { getPositionShort, formatDecimal, formatCount, toNumber } from '../lib/playerStats';
import { getVerdict } from '../lib/playerVerdict';

const TONE_TEXT = {
    live: 'text-live-ink',
    warn: 'text-warn-ink',
    destructive: 'text-destructive-ink',
    muted: 'text-muted-foreground',
};

const TONE_BORDER = {
    live: 'border-live',
    warn: 'border-warn',
    destructive: 'border-destructive',
    muted: 'border-muted-foreground border-dashed',
};

/**
 * Hero and call strip. Persistent across tabs — they sit above the tab bar and
 * never unmount, so the verdict never scrolls away behind a tab change.
 */
const PlayerHero = ({ playerData, positionCount, currentEvent, isLive }) => {
    const verdict = getVerdict(playerData, positionCount);
    const eventPoints = toNumber(playerData.event_points);
    const minutes = toNumber(playerData.minutes);

    // The lime is reserved for real returns: a player with nothing on the board
    // gets the muted treatment rather than a bright zero.
    const hasReturns = minutes > 0;

    return (
        <div className="relative overflow-hidden bg-background px-4 pt-4 md:px-7">
            {/* Club code, decorative only. */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-6 -right-8 select-none font-bold leading-none tracking-[-0.04em] text-primary/[0.13] text-[150px] md:text-[190px]"
            >
                {playerData.teamShortName}
            </span>

            <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="bg-primary-chip px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
                            {getPositionShort(playerData.element_type)}
                        </span>
                        <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
                            GW{currentEvent}{isLive ? ' · LIVE' : ''}
                        </span>
                    </div>

                    {/* Two-line wrap, never truncated — long and accented names
                        must stay readable. */}
                    <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
                        {playerData.web_name}
                    </h1>

                    <div className="mt-2.5 flex flex-wrap gap-2.5 text-[10px] leading-none tracking-[0.06em]">
                        <span className="text-foreground">
                            £{(toNumber(playerData.now_cost) / 10).toFixed(1)}M
                        </span>
                        <span className="text-muted-foreground">
                            {formatDecimal(playerData.selected_by_percent, 1, '0.0')}% OWNED
                        </span>
                        <span className="text-muted-foreground">{playerData.teamName}</span>
                    </div>
                </div>

                <div className="flex shrink-0 items-start gap-4">
                    <div className="text-right">
                        <div
                            className={`text-[52px] font-bold leading-[0.85] tracking-[-0.06em] ${
                                hasReturns ? 'text-live-ink' : 'text-muted-foreground'
                            }`}
                        >
                            {formatCount(eventPoints)}
                        </div>
                        <div className="mt-[7px] text-[8px] tracking-[0.16em] text-muted-foreground">
                            PTS · GW{currentEvent}
                        </div>
                    </div>
                    <PlayerPhoto
                        code={playerData.code}
                        name={playerData.web_name}
                        size="lg"
                        className="h-[78px] w-[62px] shrink-0 border border-border bg-panel text-[26px] md:h-[132px] md:w-[104px]"
                    />
                </div>
            </div>

            {/* Call strip. The 1px gaps on a --border background are the
                dividers; the cells carry no borders of their own. */}
            <div className="mt-4 flex gap-px bg-border">
                <div
                    className={`flex-[1.1] border bg-background px-2.5 py-[9px] ${TONE_BORDER[verdict.tone]}`}
                >
                    <div className={`text-[7.5px] tracking-[0.16em] ${TONE_TEXT[verdict.tone]}`}>
                        CALL
                    </div>
                    <div
                        className={`mt-1 text-[16px] font-bold uppercase leading-[1.05] ${TONE_TEXT[verdict.tone]}`}
                    >
                        {verdict.label.map((line, i) => (
                            <React.Fragment key={line}>
                                {i > 0 && <br />}
                                {line}
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="mt-1 text-[7px] leading-[1.3] tracking-[0.08em] text-muted-foreground">
                        {verdict.reason}
                    </div>
                </div>

                {/* The two numeric cells hold the only solid colour, so the call
                    never visually outranks its own evidence. */}
                <HeroNumber
                    label="FORM"
                    value={formatDecimal(playerData.form, 1, '0.0')}
                    rank={playerData.form_rank_type}
                    total={positionCount}
                    solid={hasReturns}
                />
                <HeroNumber
                    label="PTS / GAME"
                    value={formatDecimal(playerData.points_per_game, 1, '0.0')}
                    rank={playerData.points_per_game_rank_type}
                    total={positionCount}
                    solid={hasReturns}
                />
            </div>
        </div>
    );
};

const HeroNumber = ({ label, value, rank, total, solid }) => (
    <div className={`flex-1 px-2.5 py-[9px] ${solid ? 'bg-live-ink text-background' : 'bg-panel text-muted-foreground'}`}>
        <div className="text-[7.5px] tracking-[0.16em]">{label}</div>
        <div className={`mt-[7px] text-[27px] font-bold leading-none tracking-[-0.04em] ${solid ? '' : 'text-foreground'}`}>
            {value}
        </div>
        <div className="mt-[9px] text-[7px] tracking-[0.12em]">
            {rank ? `R${rank} OF ${total || '—'}` : '—'}
        </div>
    </div>
);

export default PlayerHero;
