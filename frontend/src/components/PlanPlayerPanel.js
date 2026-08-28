import React, { useMemo, useState } from 'react';
import { fdrBand } from '../lib/fdr';
import { getPositionShort, toNumber } from '../lib/playerStats';
import { CLUB_LIMIT, fixturesFor, formatMoney } from '../lib/transferPlan';

/**
 * The player list.
 *
 * One component at both widths: a column beside the pitch from `lg` up, and
 * the same thing stacked underneath it on a phone. That is the arrangement the
 * reference app uses and it is the right one — a persistent list and a pitch
 * cannot share 375px, but they stack without losing anything.
 *
 * It replaces the modal picker for this page. A modal is right when you need
 * one answer and then to get out of the way; planning transfers is comparison
 * work, and a list you have to reopen for every candidate cannot be compared
 * against the squad you are looking at.
 *
 * **Budget and the club limit are annotated, not enforced.** Position is a
 * hard filter, because a slot *is* a position; a player who has left the
 * league is filtered out because they cannot be bought at all. Everything else
 * is drawn — "£0.4M more than you have" is information, and a row you cannot
 * click is not. See the validation note in lib/transferPlan.js.
 */

const POSITIONS = [
    { id: 0, label: 'ALL' },
    { id: 1, label: 'GKP' },
    { id: 2, label: 'DEF' },
    { id: 3, label: 'MID' },
    { id: 4, label: 'FWD' },
];

const SORTS = [
    { id: 'price', label: 'PRICE', get: (p) => toNumber(p.now_cost) },
    { id: 'points', label: 'TOTAL POINTS', get: (p) => toNumber(p.total_points) },
    { id: 'form', label: 'FORM', get: (p) => toNumber(p.form) },
    { id: 'ep', label: 'EXPECTED POINTS', get: (p) => toNumber(p.ep_next) },
    { id: 'owned', label: 'OWNERSHIP', get: (p) => toNumber(p.selected_by_percent) },
];

const chip =
    'flex min-h-[34px] flex-1 items-center justify-center px-1 text-[8px] font-medium tracking-[0.12em] transition-colors';

const PlanPlayerPanel = ({
    bootstrap,
    fixtureIndex,
    events,
    owned,
    budgetFor,
    clubCounts,
    target,
    onPick,
    onCancelTarget,
}) => {
    const [position, setPosition] = useState(0);
    const [sort, setSort] = useState('price');
    const [maxPrice, setMaxPrice] = useState(null);
    const [search, setSearch] = useState('');
    const [affordableOnly, setAffordableOnly] = useState(false);

    const clubs = useMemo(
        () => new Map((bootstrap?.teams || []).map((t) => [t.id, t.short_name])),
        [bootstrap],
    );

    const players = useMemo(
        () =>
            (bootstrap?.elements || [])
                // 45 players have left the league. They are still sellable —
                // which is why this filters on `can_select`, not on `status`.
                .filter((p) => p.can_select !== false)
                .map((p) => ({ ...p, club: clubs.get(p.team) || '—' })),
        [bootstrap, clubs],
    );

    const priceBounds = useMemo(() => {
        const costs = players.map((p) => toNumber(p.now_cost));
        return costs.length ? [Math.min(...costs), Math.max(...costs)] : [40, 155];
    }, [players]);

    // A target locks the list to that slot's position: you are replacing a
    // specific shirt, and a list of forwards is no help filling it.
    const lockedPosition = target ? target.original.elementType : null;
    const activePosition = lockedPosition ?? position;
    const ceiling = maxPrice === null ? priceBounds[1] : maxPrice;
    const budget = budgetFor(target);

    const results = useMemo(() => {
        const term = search.trim().toLowerCase();
        const sorter = SORTS.find((s) => s.id === sort) || SORTS[0];

        return players
            .filter((p) => !owned.has(p.id))
            .filter((p) => !activePosition || p.element_type === activePosition)
            .filter((p) => toNumber(p.now_cost) <= ceiling)
            .filter((p) => !affordableOnly || toNumber(p.now_cost) <= budget)
            .filter(
                (p) =>
                    !term ||
                    p.web_name.toLowerCase().includes(term) ||
                    `${p.first_name} ${p.second_name}`.toLowerCase().includes(term) ||
                    p.club.toLowerCase() === term,
            )
            .sort((a, b) => sorter.get(b) - sorter.get(a))
            .slice(0, 60);
    }, [players, owned, activePosition, ceiling, affordableOnly, budget, search, sort]);

    return (
        <div className="flex flex-col gap-px bg-border">
            <div className="bg-panel px-3 py-2.5">
                <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Players
                </span>
            </div>

            {/* The target is stated, because it changes what every row does. */}
            {target && (
                <div className="flex items-center gap-2 border-l-2 border-live bg-panel px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[8px] leading-none tracking-[0.14em] text-live-ink">
                            REPLACING {target.original.name.toUpperCase()}
                        </span>
                        <span className="mt-1 block truncate text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                            {target.original.position} · UP TO {formatMoney(budget)}
                        </span>
                    </span>
                    {/* The action strip above the pitch also has a CANCEL,
                        so this one is named for what it cancels — otherwise a
                        screen reader hears two identical buttons doing
                        different things on the same screen. */}
                    <button
                        type="button"
                        onClick={onCancelTarget}
                        aria-label={`Cancel replacing ${target.original.name}`}
                        className="min-h-[32px] shrink-0 px-1 text-[8px] font-medium tracking-[0.12em] text-muted-foreground hover:text-foreground"
                    >
                        CANCEL
                    </button>
                </div>
            )}

            <div className="bg-panel px-3 py-3">
                <div className="flex gap-px bg-border">
                    {POSITIONS.map((p) => {
                        const locked = lockedPosition !== null && p.id !== lockedPosition;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                disabled={lockedPosition !== null}
                                onClick={() => setPosition(p.id)}
                                aria-pressed={activePosition === p.id}
                                className={`${chip} ${
                                    activePosition === p.id
                                        ? 'bg-inverted text-background'
                                        : `bg-panel text-muted-foreground ${
                                              locked ? 'opacity-40' : 'hover:bg-muted hover:text-foreground'
                                          }`
                                }`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>

                <label className="mt-3 block text-[7.5px] tracking-[0.16em] text-muted-foreground">
                    SORT BY
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="mt-1.5 block min-h-[38px] w-full bg-muted px-2 text-[9px] tracking-[0.1em] text-foreground focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary"
                    >
                        {SORTS.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="mt-3 block text-[7.5px] tracking-[0.16em] text-muted-foreground">
                    MAX PRICE · {formatMoney(ceiling)}
                    <input
                        type="range"
                        min={priceBounds[0]}
                        max={priceBounds[1]}
                        step={1}
                        value={ceiling}
                        onChange={(e) => setMaxPrice(toNumber(e.target.value))}
                        className="mt-2 block h-[3px] w-full appearance-none bg-border accent-primary"
                    />
                </label>

                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="SEARCH PLAYER OR CLUB"
                    aria-label="Search players"
                    className="mt-3 min-h-[38px] w-full bg-muted px-2 text-[9px] tracking-[0.06em] text-foreground placeholder:text-muted-foreground placeholder:tracking-[0.12em] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary"
                />

                <label className="mt-3 flex min-h-[32px] items-center gap-2 text-[8px] tracking-[0.14em] text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={affordableOnly}
                        onChange={(e) => setAffordableOnly(e.target.checked)}
                        className="h-3.5 w-3.5 accent-primary"
                    />
                    AFFORDABLE ONLY
                </label>
            </div>

            <div className="flex items-center gap-2 bg-panel px-3 py-1.5">
                <span className="flex-1 text-[7px] leading-none tracking-[0.14em] text-muted-foreground">
                    PLAYER
                </span>
                <span className="w-[42px] text-right text-[7px] leading-none tracking-[0.14em] text-muted-foreground">
                    PRICE
                </span>
                <span className="w-[74px] text-center text-[7px] leading-none tracking-[0.14em] text-muted-foreground">
                    {events.length > 1 ? `GW${events[0]}–${events[events.length - 1]}` : `GW${events[0] ?? ''}`}
                </span>
            </div>

            <div className="max-h-[420px] overflow-y-auto lg:max-h-[560px]">
                <div className="flex flex-col gap-px bg-border">
                    {results.length === 0 ? (
                        <div className="bg-panel px-3 py-4 text-[8.5px] leading-[1.6] tracking-[0.12em] text-muted-foreground">
                            NO PLAYERS MATCH THESE FILTERS
                        </div>
                    ) : (
                        results.map((p) => {
                            const short = toNumber(p.now_cost) - budget;
                            const atLimit = (clubCounts.get(p.club) || 0) >= CLUB_LIMIT;

                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => onPick(p)}
                                    className="flex items-center gap-2 bg-panel px-3 py-2 text-left transition-colors hover:bg-muted"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[10px] font-medium leading-none text-foreground">
                                            {p.web_name}
                                        </span>
                                        <span className="mt-1 block truncate text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                                            {p.club} · {getPositionShort(p.element_type)}
                                        </span>
                                        {target && (short > 0 || atLimit) && (
                                            <span className="mt-1 block truncate text-[7px] leading-none tracking-[0.1em] text-destructive-ink">
                                                {short > 0
                                                    ? `${formatMoney(short)} MORE THAN YOU HAVE`
                                                    : `ALREADY ${CLUB_LIMIT} FROM ${p.club}`}
                                            </span>
                                        )}
                                    </span>

                                    <span className="w-[42px] shrink-0 text-right text-[10px] font-medium leading-none text-foreground">
                                        {formatMoney(p.now_cost)}
                                    </span>

                                    <span className="flex w-[74px] shrink-0 gap-px">
                                        {events.map((event) => {
                                            const fixtures = fixturesFor(fixtureIndex, p.team, event);
                                            return (
                                                <span key={event} className="min-w-0 flex-1">
                                                    <span className="block truncate text-center text-[6.5px] leading-none tracking-[0.04em] text-muted-foreground">
                                                        {fixtures.length === 0
                                                            ? '—'
                                                            : fixtures.map((f) => f.opponent).join('+')}
                                                    </span>
                                                    <span className="mt-1 block h-[3px] w-full bg-border">
                                                        {fixtures[0] && (
                                                            <span
                                                                className={`block h-full ${fdrBand(fixtures[0].difficulty).bg}`}
                                                                style={{
                                                                    width: `${(toNumber(fixtures[0].difficulty) / 5) * 100}%`,
                                                                }}
                                                            />
                                                        )}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlanPlayerPanel;
