import React from 'react';
import { SectionHeader } from './PlayerStatCell';
import { fdrBand, summariseFixtures } from '../lib/fdr';
import { toNumber, formatDecimal } from '../lib/playerStats';

/** The only tab that looks forward. */
const PlayerFixturesTab = ({ fixtures = [], teams }) => {
    const next = fixtures.slice(0, 5);
    const summary = summariseFixtures(next);

    if (!summary) {
        return (
            <div className="px-4 pb-10 md:px-7">
                <SectionHeader label="Fixtures" />
                <div className="bg-panel p-[14px] text-[9px] tracking-[0.08em] text-muted-foreground">
                    NO UPCOMING FIXTURES PUBLISHED
                </div>
            </div>
        );
    }

    const opponent = (f) => {
        const id = f.is_home ? f.team_a : f.team_h;
        return teams?.[id]?.name || teams?.[id]?.short_name || 'TBC';
    };
    const opponentShort = (f) => {
        const id = f.is_home ? f.team_a : f.team_h;
        return teams?.[id]?.short_name || '—';
    };

    return (
        <div className="px-4 pb-10 md:px-7">
            <SectionHeader label="Difficulty run" />
            <div className="bg-panel p-[14px]">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <span className="text-[34px] font-bold leading-none tracking-[-0.04em] text-foreground">
                            {formatDecimal(summary.average, 1, '0.0')}
                        </span>
                        <div className="mt-1.5 text-[8px] tracking-[0.12em] text-muted-foreground">
                            AVERAGE FDR OVER {summary.total}
                        </div>
                    </div>
                    <div className="text-right text-[8.5px] leading-[1.4] tracking-[0.08em] text-muted-foreground">
                        <span className="text-foreground">{summary.good}</span> OF {summary.total}
                        <br />AT FDR 3 OR BETTER
                    </div>
                </div>

                <div className="mt-3 flex h-[74px] items-end gap-1">
                    {next.map((f, i) => {
                        const band = fdrBand(f.difficulty);
                        return (
                            <div
                                key={i}
                                className={`flex-1 ${band.bg}`}
                                style={{ height: `${(toNumber(f.difficulty) / 5) * 100}%` }}
                            />
                        );
                    })}
                </div>
                <div className="mt-1.5 flex gap-1 border-t border-border pt-1.5">
                    {next.map((f, i) => (
                        <span key={i} className="flex-1 text-center text-[7.5px] tracking-[0.08em] text-muted-foreground">
                            GW{f.event}
                        </span>
                    ))}
                </div>
            </div>

            <SectionHeader label={`Next ${next.length}`} />
            <div className="flex flex-col gap-px bg-border">
                {next.map((f, i) => {
                    const band = fdrBand(f.difficulty);
                    return (
                        <div key={i} className="bg-panel px-[14px] py-3">
                            <div className="flex items-center gap-3">
                                <span className="flex h-[34px] w-[30px] shrink-0 items-center justify-center border border-border text-[8px] tracking-[0.06em] text-muted-foreground">
                                    {opponentShort(f)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-[12px] font-medium tracking-[-0.01em] text-foreground">
                                        {opponent(f)}
                                    </div>
                                    <div className="mt-0.5 text-[8px] tracking-[0.12em] text-muted-foreground">
                                        GW{f.event} · {f.is_home ? 'HOME' : 'AWAY'}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="text-[7.5px] tracking-[0.12em] text-muted-foreground">
                                        {band.word}
                                    </span>
                                    {/* The numeral is the value inversion, not
                                        the band colour: --background text on a
                                        saturated fill is 2.7–3.8:1 in the three
                                        light themes for every band, and it was
                                        invisible outright on the easy band. The
                                        band is on the track below it. */}
                                    <span className="flex h-6 w-6 items-center justify-center bg-inverted text-[13px] font-bold text-background">
                                        {toNumber(f.difficulty)}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2.5 h-[3px] w-full bg-border">
                                <div className={`h-full ${band.bg}`} style={{ width: `${(toNumber(f.difficulty) / 5) * 100}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <SectionHeader label="Reading it" />
            <div className="flex flex-col gap-px bg-border">
                {summary.window && (
                    <ReadingRow
                        label={
                            summary.window.length > 1
                                ? `GW${summary.window.from.event}–${summary.window.to.event}`
                                : `GW${summary.window.from.event}`
                        }
                        text={`${summary.window.length} straight at FDR 3 or better — the best window in this run.`}
                    />
                )}
                <ReadingRow
                    label={`GW${summary.hardest.event}`}
                    text={`${opponent(summary.hardest)} ${summary.hardest.is_home ? 'at home' : 'away'} is the hardest of the five at FDR ${toNumber(summary.hardest.difficulty)}.`}
                />
            </div>

            <div className="mt-4 border border-dashed border-border p-3 text-[8.5px] leading-[1.6] tracking-[0.06em] text-muted-foreground">
                THE FPL API PUBLISHES FIVE UPCOMING FIXTURES AND A 1–5 DIFFICULTY RATING.
                THIS TAB STOPS THERE RATHER THAN PADDING WITH A LONGER RUN IT CANNOT FILL.
            </div>
        </div>
    );
};

const ReadingRow = ({ label, text }) => (
    <div className="flex gap-3 bg-panel px-[14px] py-3">
        <span className="w-[52px] shrink-0 text-[9px] font-medium tracking-[0.08em] text-foreground">
            {label}
        </span>
        <span className="text-[9.5px] leading-[1.6] text-muted-foreground">{text}</span>
    </div>
);

export default PlayerFixturesTab;
