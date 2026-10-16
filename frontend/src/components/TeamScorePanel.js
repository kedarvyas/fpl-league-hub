import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PlayerStatCell, { SectionHeader } from './PlayerStatCell';
import { formatCount } from '../lib/playerStats';

/**
 * The team score.
 *
 * `lib/teamScore.js` carries the model and the reasoning behind it. This file
 * is only concerned with the thing that makes a rating worth showing at all:
 * **the number is never alone**. A squad rating that cannot be taken apart is
 * a rating the reader can only accept or ignore, and on a page that lists the
 * eleven players it is rating, directly underneath, being unarguable is a
 * defect rather than a feature.
 *
 * So the headline sits above its own five components, each on the same 0–100
 * scale so they can be read against it, and then the three players dragging it
 * down — which is the half anyone actually acts on, and the reason the planner
 * link sits directly above this.
 *
 * Two horizons, because they answer different questions. THIS WEEK is the
 * armband-and-bench question. The run is the transfer question — form
 * regresses over five gameweeks and the fixture list stops being noise.
 */

/** Fills carry no text, so these are the plain tokens (rule 6). */
const TONE_FILL = {
    live: 'bg-live',
    warn: 'bg-warn',
    destructive: 'bg-destructive',
    neutral: 'bg-foreground',
};

/** A fill with text on it takes the -ink variant and --background text. */
const TONE_CHIP = {
    live: 'bg-live-ink text-background',
    warn: 'bg-warn-ink text-background',
    destructive: 'bg-destructive-ink text-background',
    neutral: 'bg-inverted text-background',
};

/**
 * The breakdown is one row per horizon, so the column count follows the number
 * of components rather than being fixed. Written out in full because Tailwind
 * scans the source for literal class names and never sees a built string.
 */
const GRID_COLS = {
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
};

const HorizonTab = ({ label, active, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`min-h-[44px] px-3 text-[8.5px] font-medium tracking-[0.14em] transition-colors ${
            active ? 'bg-inverted text-background' : 'bg-panel text-muted-foreground hover:text-foreground'
        }`}
    >
        {label}
    </button>
);

/**
 * A line of context under the headline. These are the facts that change what a
 * manager does this week and that the score itself cannot express — a blank
 * and a hard fixture both lower the fixture component, but only one of them
 * means the player will not kick a ball.
 */
const Note = ({ tone = 'muted', children }) => (
    <div className="flex items-start gap-2 bg-panel px-3 py-2.5">
        <span className={`mt-[3px] h-[6px] w-[6px] shrink-0 ${TONE_FILL[tone] || 'bg-border'}`} />
        <span className="text-[8.5px] leading-[1.5] tracking-[0.1em] text-muted-foreground">
            {children}
        </span>
    </div>
);

/**
 * One of the three weakest starters.
 *
 * The right-hand number is on the same scale as the headline, and the word
 * beside it is *why* — an unavailable player says so in his club's own words,
 * and everyone else names the component holding him back. A list of three low
 * numbers with no reasons would only restate the score.
 */
const WeakRow = ({ player }) => {
    const out = player.available === 0;
    const doubt = player.available > 0 && player.available < 1;
    const reason = out || doubt
        ? player.news || (out ? 'NOT AVAILABLE' : 'A DOUBT')
        : `WEAKEST ON ${(player.limiting?.label || 'form').toUpperCase()}`;

    return (
        <Link
            to={`/player/${player.id}`}
            className="flex min-h-[44px] items-center gap-2.5 bg-panel px-3 py-2.5 transition-colors hover:bg-muted md:px-4"
        >
            <span className="w-[26px] shrink-0 text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:w-[30px] md:text-[9px]">
                {player.position}
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-medium leading-none text-foreground md:text-[13px]">
                    {player.name}
                </span>
                <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground md:mt-1.5 md:text-[9px]">
                    {player.club} · {reason}
                </span>
            </span>

            {player.mark && (
                <span className="shrink-0 bg-accent/15 px-1 py-[3px] text-[8px] font-medium leading-none tracking-[0.1em] text-accent-chip">
                    {player.mark}
                </span>
            )}

            {/* Rule 4 — a nought keeps the geometry and drops to muted rather
                than being hidden or dressed in red. */}
            <span
                className={`w-[30px] shrink-0 text-right text-[15px] font-bold leading-none tracking-[-0.03em] md:w-[40px] md:text-[19px] ${
                    player.score === 0 ? 'text-muted-foreground' : 'text-foreground'
                }`}
            >
                {Math.round(player.score)}
            </span>
        </Link>
    );
};

const TeamScorePanel = ({ week, run, gameweek, runLength = 0 }) => {
    const [horizon, setHorizon] = useState('week');
    const active = horizon === 'run' ? run : week;

    // Fixtures are a separate request from the squad and fail on their own, so
    // the score can be absent on a page that is otherwise complete. Saying so
    // beats an empty space where a headline was.
    if (!active) {
        return (
            <>
                <SectionHeader label="Team score" />
                <div className="bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                    NOT ENOUGH DATA TO RATE THIS SQUAD YET
                </div>
            </>
        );
    }

    const { band } = active;
    const score = Math.round(active.score);

    return (
        <>
            <SectionHeader label="Team score">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">OUT OF 100</span>
            </SectionHeader>

            <div className="flex gap-px bg-border">
                <HorizonTab
                    label={gameweek ? `GW${gameweek}` : 'THIS WEEK'}
                    active={horizon === 'week'}
                    onClick={() => setHorizon('week')}
                />
                <HorizonTab
                    label={runLength > 1 ? `NEXT ${runLength} GWS` : 'THE RUN'}
                    active={horizon === 'run'}
                    onClick={() => setHorizon('run')}
                />
                <span className="flex-1 bg-panel" />
            </div>

            <div className="mt-px bg-panel p-[14px]">
                <div className="flex items-end gap-2.5">
                    <span className="text-[52px] font-bold leading-[0.85] tracking-[-0.06em] text-foreground">
                        {score}
                    </span>
                    <span
                        className={`mb-2 px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] ${
                            TONE_CHIP[band.tone]
                        }`}
                    >
                        {band.word}
                    </span>
                    {/* The eleven's plain mean beside what its worst three
                        average, because the gap between them is exactly what
                        the score is docking — and without it a reader cannot
                        tell a flat squad from a top-heavy one. */}
                    <span className="mb-2 ml-auto text-right text-[7.5px] leading-[1.5] tracking-[0.1em] text-muted-foreground">
                        XI {Math.round(active.xi)} · WORST 3 {Math.round(active.floor)} · BENCH{' '}
                        {Math.round(active.bench)}
                    </span>
                </div>

                <div className="mt-3 h-[6px] w-full bg-border">
                    <div
                        className={`h-full transition-[width] duration-500 ease-out ${TONE_FILL[band.tone]}`}
                        style={{ width: `${score}%` }}
                    />
                </div>
            </div>

            {/* Each component on the same scale as the headline, so the reader
                can see which one is carrying it and which one is costing it. */}
            <div
                className={`mt-px grid grid-cols-2 gap-px bg-border ${
                    GRID_COLS[active.components.length] || 'md:grid-cols-4'
                }`}
            >
                {active.components.map((c) => (
                    <PlayerStatCell
                        key={c.key}
                        label={c.label}
                        value={Math.round(c.value)}
                        percentile={c.value}
                        title={`${c.label} — ${Math.round(c.weight * 100)}% of the score`}
                    />
                ))}
            </div>

            {(active.betterCaptain || active.unavailable.length > 0 || active.blanks.length > 0 ||
                active.doubles.length > 0) && (
                <div className="mt-px flex flex-col gap-px bg-border">
                    {active.unavailable.length > 0 && (
                        <Note tone="destructive">
                            {formatCount(active.unavailable.length)} STARTER
                            {active.unavailable.length === 1 ? '' : 'S'} FLAGGED —{' '}
                            <span className="text-foreground">
                                {active.unavailable.map((p) => p.name.toUpperCase()).join(', ')}
                            </span>
                        </Note>
                    )}
                    {active.blanks.length > 0 && (
                        <Note tone="warn">
                            {formatCount(active.blanks.length)} STARTER
                            {active.blanks.length === 1 ? '' : 'S'} BLANK IN THIS WINDOW —{' '}
                            <span className="text-foreground">
                                {active.blanks.map((p) => p.name.toUpperCase()).join(', ')}
                            </span>
                        </Note>
                    )}
                    {active.doubles.length > 0 && (
                        <Note tone="live">
                            {formatCount(active.doubles.length)} STARTER
                            {active.doubles.length === 1 ? '' : 'S'} PLAY TWICE —{' '}
                            <span className="text-foreground">
                                {active.doubles.map((p) => p.name.toUpperCase()).join(', ')}
                            </span>
                        </Note>
                    )}
                    {active.betterCaptain && (
                        <Note>
                            THE ARMBAND IS ON{' '}
                            <span className="text-foreground">
                                {active.captain.name.toUpperCase()}
                            </span>{' '}
                            AT {Math.round(active.captain.score)} ·{' '}
                            <span className="text-foreground">
                                {active.betterCaptain.name.toUpperCase()}
                            </span>{' '}
                            RATES {Math.round(active.betterCaptain.score)}
                        </Note>
                    )}
                </div>
            )}

            <SectionHeader label="Weakest links">
                <span className="text-[8px] tracking-[0.1em] text-muted-foreground">
                    OF THE STARTING XI
                </span>
            </SectionHeader>

            <div className="flex flex-col gap-px bg-border">
                {active.weakest.map((p) => (
                    <WeakRow key={p.id} player={p} />
                ))}
            </div>

            <p className="pt-2 text-[8px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                OUR OWN MODEL, NOT FPL'S — EACH PLAYER IS RATED AGAINST OTHERS IN HIS POSITION ON
                FORM, FIXTURES, UNDERLYING NUMBERS AND MINUTES, THEN SCALED BY HIS CHANCE OF
                PLAYING. THE CAPTAIN COUNTS TWICE, AND THE WEAKEST THREE CARRY 40% OF THE ELEVEN —
                A SQUAD IS JUDGED ON ITS WEAK LINKS, NOT JUST ITS AVERAGE.
            </p>
        </>
    );
};

export default TeamScorePanel;
