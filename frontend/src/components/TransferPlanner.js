import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PlanPitch from './PlanPitch';
import PlanPlayerPanel from './PlanPlayerPanel';
import PlanLedger from './PlanLedger';
import TransferPlanFixtures from './TransferPlanFixtures';
import { useMyEntry } from '../hooks/useMyEntry';
import { useTransferPlan } from '../hooks/useTransferPlan';
import { API_URL, fetchWithRetry } from '../config/supabase';
import { formatCount, toNumber } from '../lib/playerStats';
import {
    applyPlan,
    availableTransferChips,
    baselineSheet,
    buildFixtureIndex,
    buildPlanBase,
    clubMap,
    deriveFreeTransfers,
    formatCountdown,
    formatMoney,
    planEvents,
    planFinances,
    setArmband,
    swapSheet,
    untilDeadline,
    validatePlan,
} from '../lib/transferPlan';

/**
 * The transfer planner.
 *
 * Every other page in this app is a readout. This is the first **workspace**:
 * it carries state the reader creates, and it is about a gameweek that has not
 * happened. The job is narrow — *decide what to do before the deadline*: show
 * me my fifteen, let me move them around and swap them out, and never let me
 * get the money, the transfer count or the squad rules wrong.
 *
 * ## Why it is not a fourth tab on MyTeam
 *
 * `MyTeam` is a viewer for *any* manager — clicking a name on the H2H page or
 * the Dashboard navigates there with someone else's entry, which is exactly
 * why `fpl_my_entry` was split out from `fpl_team_id`. Planning transfers for
 * a team you do not own is meaningless, so this page is keyed to
 * `fpl_my_entry` and has no team switcher at all.
 *
 * ## One selection drives everything
 *
 * Tapping a player selects them, and that single piece of state answers three
 * questions at once: tapping a second player swaps the two (a substitution, a
 * positional shuffle or a change of bench order — all the same operation, see
 * `swapSheet`), the action strip offers the armbands and the transfer, and the
 * player list locks to that slot's position and prices itself against that
 * slot's budget. An open slot with nobody in it selects itself, so a departure
 * always leads somewhere.
 *
 * ## The three numbers, and how far to trust them
 *
 * The summary strip is the reason the page is trustworthy, and the cells are
 * not equally certain:
 *
 * - **In the bank** is exact, once selling price is computed properly.
 * - **The hit** follows from the free-transfer count.
 * - **Free transfers are derived and cannot be verified.** There is no public
 *   endpoint for them. So the cell says it is derived and the reader can
 *   overrule it: a number the app asserts and gets wrong is worse than a
 *   number it offers.
 */

const TABS = [
    { id: 'pitch', label: 'PITCH' },
    { id: 'fixtures', label: 'FIXTURES' },
];

/** What each card's bottom line shows. The toggle is what makes 375px work. */
const MODES = [
    { id: 'next', label: 'NEXT GW' },
    { id: 'three', label: 'NEXT 3 GWS' },
    { id: 'price', label: 'PRICE CHANGES' },
];

/**
 * One of the three constraints. The same object as MyTeam's summary strip, on
 * `--live-ink` — the lightness of `--live` that carries `--background` text at
 * 4.5:1 in every theme.
 */
const SummaryCell = ({ label, value, note, tone, children }) => (
    <div className="min-w-0 flex-1 bg-panel px-2.5 py-[9px]">
        <div className="truncate text-[7.5px] tracking-[0.16em] text-muted-foreground">{label}</div>
        <div
            className={`mt-1.5 text-[22px] font-bold leading-[0.9] tracking-[-0.04em] md:text-[26px] ${
                tone === 'negative'
                    ? 'text-destructive-ink'
                    : tone === 'zero'
                        ? 'text-muted-foreground'
                        : 'text-foreground'
            }`}
        >
            {children || value}
        </div>
        {/* Always rendered, so the cells stay on one baseline. */}
        <div className="mt-1.5 truncate text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
            {note || ' '}
        </div>
    </div>
);

const actionClass =
    'flex min-h-[38px] items-center px-2.5 text-[8px] font-medium tracking-[0.12em] transition-colors';

const TransferPlanner = () => {
    const [myEntry] = useMyEntry();

    const [teamData, setTeamData] = useState(null);
    const [bootstrap, setBootstrap] = useState(null);
    const [picks, setPicks] = useState(null);
    const [transfers, setTransfers] = useState(null);
    const [history, setHistory] = useState(null);
    const [fixtures, setFixtures] = useState(null);

    const [loading, setLoading] = useState(!!myEntry);
    // Three-way, not a boolean. A failed fixture load must not be drawn as a
    // blank gameweek: "we could not fetch this" and "this club does not play
    // that week" are different claims, and only one of them is ever true.
    const [fixturesState, setFixturesState] = useState(myEntry ? 'loading' : 'idle');
    const [error, setError] = useState(null);

    const [tab, setTab] = useState('pitch');
    const [mode, setMode] = useState('three');
    const [selected, setSelected] = useState(null);
    const [editingFree, setEditingFree] = useState(false);
    // Re-rendered on a timer purely so the countdown moves.
    const [now, setNow] = useState(() => Date.now());

    const panelRef = useRef(null);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (!myEntry) return undefined;
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setFixturesState('loading');
            setError(null);

            try {
                // Waves rather than six parallel calls: the Edge Functions
                // proxy the FPL API, whose WAF answers a burst from one origin
                // with a flat 403 that looks exactly like an app bug.
                const [entryRes, bootstrapRes] = await Promise.all([
                    fetchWithRetry(`${API_URL}/team-data?teamId=${myEntry}`),
                    fetchWithRetry(`${API_URL}/bootstrap-static`),
                ]);
                if (!entryRes.ok) throw new Error(`HTTP ${entryRes.status}`);
                if (!bootstrapRes.ok) throw new Error(`HTTP ${bootstrapRes.status}`);

                const entry = await entryRes.json();
                const bootstrapData = await bootstrapRes.json();
                if (cancelled) return;

                setTeamData(entry);
                setBootstrap(bootstrapData);
                setLoading(false);

                // The baseline is the last gameweek that *started*. Next
                // gameweek's picks are a 404 until its deadline passes.
                const baseline =
                    toNumber(entry.current_event, null) ??
                    bootstrapData?.events?.find((e) => e.is_current)?.id ??
                    null;

                const [picksRes, transfersRes, historyRes] = await Promise.all([
                    baseline
                        ? fetchWithRetry(`${API_URL}/entry-picks/entry/${myEntry}/event/${baseline}/picks`)
                        : Promise.resolve(null),
                    fetchWithRetry(`${API_URL}/entry-transfers/entry/${myEntry}/transfers`),
                    fetchWithRetry(`${API_URL}/team-history?teamId=${myEntry}`),
                ]);
                if (cancelled) return;

                if (picksRes?.ok) setPicks(await picksRes.json());
                // Both of these degrade to a stated assumption rather than
                // failing the page: no transfers means every purchase price
                // falls back to `now_cost - cost_change_start`, and no history
                // means the free-transfer count starts from one.
                if (transfersRes.ok) setTransfers(await transfersRes.json());
                if (historyRes.ok) setHistory(await historyRes.json());
            } catch (err) {
                if (cancelled) return;
                console.error('Error loading transfer plan:', err);
                setError(`Could not load team ${myEntry}`);
                setLoading(false);
                setFixturesState('failed');
                return;
            }

            // Fixtures are their own wave *and their own failure*. 115KB that
            // only the grid strictly needs, fetched last, and caught here
            // rather than above — the workspace's entire job (the squad, the
            // money, the transfer count, the hit, the ledger, the legality)
            // is answerable with no fixtures at all, so a fixture outage must
            // cost the fixture cells and nothing else.
            //
            // This is not hypothetical. Before `fixtures-future` was deployed,
            // Supabase's gateway 404 came back without `content-type` in
            // `access-control-allow-headers`; `apiHeaders` sends that header,
            // so the CORS preflight failed and the browser rejected with a
            // TypeError instead of a 404. fetchWithRetry retried it three
            // times and threw — and a missing fixture list took down the whole
            // page under the message "Could not load team {id}".
            try {
                const fixturesRes = await fetchWithRetry(`${API_URL}/fixtures-future`);
                if (cancelled) return;
                if (!fixturesRes.ok) throw new Error(`HTTP ${fixturesRes.status}`);
                setFixtures(await fixturesRes.json());
                setFixturesState('ready');
            } catch (err) {
                if (cancelled) return;
                console.error('Error loading fixtures:', err);
                setFixturesState('failed');
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [myEntry]);

    const baselineEvent = toNumber(teamData?.current_event, null);
    // The gameweek being planned is the one after the last that started.
    const targetEventData = useMemo(
        () =>
            baselineEvent === null
                ? null
                : (bootstrap?.events || []).find((e) => toNumber(e.id) === baselineEvent + 1) || null,
        [bootstrap, baselineEvent],
    );
    const targetEvent = targetEventData ? toNumber(targetEventData.id) : null;

    const [plan, updatePlan, resetPlan] = useTransferPlan(myEntry, targetEvent);

    const base = useMemo(
        () => buildPlanBase({ picks, bootstrap, transfers, chips: history?.chips }),
        [picks, bootstrap, transfers, history],
    );
    const applied = useMemo(
        () => (base ? applyPlan(base, plan, bootstrap) : null),
        [base, plan, bootstrap],
    );

    const derived = useMemo(
        () =>
            deriveFreeTransfers({
                current: history?.current,
                chips: history?.chips,
                startedEvent: toNumber(teamData?.started_event, 1),
                targetEvent,
            }),
        [history, teamData, targetEvent],
    );

    const overridden = plan.freeOverride !== null && plan.freeOverride !== undefined;
    const freeTransfers = overridden ? toNumber(plan.freeOverride) : derived.free;
    const bank = toNumber(picks?.entry_history?.bank ?? teamData?.last_deadline_bank);

    const finances = useMemo(
        () => (applied ? planFinances({ applied, bank, freeTransfers, chip: plan.chip }) : null),
        [applied, bank, freeTransfers, plan.chip],
    );
    const issues = useMemo(
        () => (applied && finances ? validatePlan({ applied, finances }) : []),
        [applied, finances],
    );

    const clubs = useMemo(() => clubMap(bootstrap), [bootstrap]);
    const fixtureIndex = useMemo(() => buildFixtureIndex(fixtures, clubs), [fixtures, clubs]);
    const gridEvents = useMemo(() => planEvents(bootstrap, targetEvent, 3), [bootstrap, targetEvent]);
    const chips = useMemo(
        () => availableTransferChips(bootstrap, history?.chips, targetEvent),
        [bootstrap, history, targetEvent],
    );
    const cardEvents = mode === 'three' ? gridEvents : gridEvents.slice(0, 1);

    /* -------------------------------------------------------------- */
    /* Editing the plan                                                */
    /* -------------------------------------------------------------- */

    const setMove = useCallback(
        (out, incoming) =>
            updatePlan((current) => {
                const moves = current.moves || [];
                const existing = moves.some((m) => m.out === out);
                return {
                    ...current,
                    moves: existing
                        ? moves.map((m) => (m.out === out ? { ...m, in: incoming } : m))
                        : [...moves, { out, in: incoming }],
                };
            }),
        [updatePlan],
    );

    const dropMove = useCallback(
        (out) =>
            updatePlan((current) => ({
                ...current,
                moves: (current.moves || []).filter((m) => m.out !== out),
            })),
        [updatePlan],
    );

    const setChip = useCallback(
        (chip) => updatePlan((current) => ({ ...current, chip: current.chip === chip ? null : chip })),
        [updatePlan],
    );

    /**
     * The one number on this page the reader can overrule.
     *
     * Free transfers are derived and there is nothing to check the derivation
     * against, so an empty field means "go back to the derived figure" rather
     * than "zero" — clearing an override must not silently assert something
     * stronger than the number it replaced.
     */
    const commitFree = useCallback(
        (raw) => {
            const value = String(raw ?? '').trim();
            updatePlan((current) => ({
                ...current,
                freeOverride: value === '' ? null : Math.max(0, toNumber(value, 0)),
            }));
            setEditingFree(false);
        },
        [updatePlan],
    );

    /* -------------------------------------------------------------- */
    /* Selection                                                       */
    /* -------------------------------------------------------------- */

    const selectedEntry = applied?.slots.find((s) => s.slot === selected) || null;
    // An open slot selects itself: a departure should always lead somewhere.
    const target = selectedEntry || applied?.pending[0] || null;

    const updateSheet = useCallback(
        (fn) =>
            updatePlan((current) => ({
                ...current,
                sheet: fn(current.sheet || baselineSheet(base)),
            })),
        [updatePlan, base],
    );

    /**
     * Two taps is a swap — a substitution, a positional shuffle or a change of
     * bench order, depending only on where the two players happen to sit.
     *
     * The decision is made here rather than inside a `setSelected` updater.
     * React treats updaters as pure and double-invokes them under StrictMode,
     * so a `swapSheet` called from inside one runs twice and silently undoes
     * itself — the swap appears to do nothing at all.
     */
    const onSelect = useCallback(
        (slot) => {
            if (selected === null || selected === slot) {
                setSelected(selected === slot ? null : slot);
                return;
            }
            updateSheet((sheet) => swapSheet(sheet, selected, slot));
            setSelected(null);
        },
        [selected, updateSheet],
    );

    const onArmband = useCallback(
        (role) => {
            if (selected === null) return;
            updateSheet((sheet) => setArmband(sheet, selected, role));
            setSelected(null);
        },
        [selected, updateSheet],
    );

    // On a phone the list sits below the pitch, so a selection that changes
    // what the list is for has to bring it into view.
    useEffect(() => {
        if (!target || typeof window === 'undefined') return;
        if (window.innerWidth >= 1024) return;
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [target]);

    const budgetFor = useCallback(
        (entry) => {
            if (!finances) return 0;
            if (!entry) return finances.bankAfter;
            // What is left once everything else in the plan is paid for, plus
            // whatever this slot currently ties up.
            if (!entry.removed) return finances.bankAfter + toNumber(entry.original.selling);
            return finances.bankAfter + toNumber(entry.incoming?.price);
        },
        [finances],
    );

    const ownedIds = useMemo(() => {
        if (!applied) return new Set();
        const ids = applied.squad.map((p) => p.id);
        // The player whose slot this is counts as owned: bringing them back is
        // the UNDO beside their name, not a transfer.
        if (target) ids.push(target.original.id);
        return new Set(ids);
    }, [applied, target]);

    const clubCounts = useMemo(() => {
        const counts = new Map();
        if (!applied) return counts;
        const leaving = target ? (target.incoming?.id ?? target.original.id) : null;
        applied.squad.forEach((p) => {
            if (p.id === leaving) return;
            counts.set(p.club, (counts.get(p.club) || 0) + 1);
        });
        return counts;
    }, [applied, target]);

    const onPick = useCallback(
        (element) => {
            if (!target) return;
            setMove(target.original.id, element.id);
            setSelected(null);
        },
        [target, setMove],
    );

    /* -------------------------------------------------------------- */
    /* States before the page                                          */
    /* -------------------------------------------------------------- */

    if (!myEntry) {
        return (
            <div className="mx-auto max-w-[1280px] px-4 pt-4 md:px-7">
                <span className="bg-inverted px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
                    PLANNING
                </span>
                <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
                    Set your team
                </h1>
                <p className="mt-2.5 max-w-[520px] text-[9px] leading-[1.7] tracking-[0.06em] text-muted-foreground">
                    A TRANSFER PLAN IS FOR A SQUAD YOU OWN, SO THIS PAGE NEEDS TO KNOW WHICH ENTRY IS
                    YOURS. IT IS NOT THE SAME AS THE TEAM YOU HAPPEN TO BE LOOKING AT.
                </p>
                <Link
                    to="/my-team"
                    className="mt-4 inline-flex min-h-[44px] items-center bg-inverted px-4 text-[9px] font-medium tracking-[0.14em] text-background"
                >
                    GO TO MY TEAM →
                </Link>
            </div>
        );
    }

    if (loading) return <PlannerSkeleton />;

    if (error || !teamData) {
        return (
            <div className="mx-auto max-w-[1280px] px-4 pt-4 md:px-7">
                <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
                    <p className="text-[9px] leading-[1.5] text-destructive-ink">
                        {error || 'Could not load your team'}. Try again in a moment.
                    </p>
                </div>
            </div>
        );
    }

    const left = untilDeadline(targetEventData?.deadline_time, now);
    const ready = applied && finances;

    return (
        <div className="mx-auto max-w-[1280px]">
            <div className="px-4 pt-4 md:px-7">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-inverted px-1.5 py-1 text-[9px] font-medium leading-none tracking-[0.16em] text-background">
                        PLANNING
                    </span>
                    <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
                        GW{targetEvent ?? '—'}
                    </span>
                    <span
                        className={`text-[9px] tracking-[0.16em] ${
                            left && left.total < 720 ? 'text-destructive-ink' : 'text-muted-foreground'
                        }`}
                    >
                        {formatCountdown(left)}
                    </span>
                    {ready && (
                        <span className="text-[9px] tracking-[0.16em] text-muted-foreground">
                            {applied.formation}
                        </span>
                    )}
                </div>

                <h1 className="mt-2.5 text-[25px] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-foreground md:text-[46px] md:tracking-[-0.045em]">
                    {teamData.name || `Team ${teamData.id}`}
                </h1>

                {/* Said out loud, because the page will look stale to anyone
                    who has already moved on fpl.com. Next gameweek's picks are
                    a 404 until its deadline passes, so this is the only squad
                    there is — and it is the right one to plan from. */}
                <p className="mt-2.5 text-[8px] leading-[1.6] tracking-[0.1em] text-muted-foreground">
                    FROM YOUR GW{baselineEvent ?? '—'} SQUAD · CHANGES YOU HAVE ALREADY MADE ON
                    FPL.COM WON'T SHOW HERE
                </p>

                {targetEvent === null ? (
                    <div className="mt-4 bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                        NO GAMEWEEK LEFT TO PLAN — THE SEASON IS OVER
                    </div>
                ) : !ready ? (
                    <div className="mt-4 bg-panel px-3 py-4 text-[8.5px] tracking-[0.12em] text-muted-foreground">
                        NO SQUAD FOR GW{baselineEvent ?? '—'} YET — PICKS BECOME PUBLIC AFTER THE
                        DEADLINE
                    </div>
                ) : (
                    <>
                        {/* A chip changes every number in the strip below, and
                            it is the state people most want to plan in. */}
                        {chips.length > 0 && (
                            <div className="mt-3 inline-flex flex-wrap gap-px bg-border">
                                {chips.map((chip) => (
                                    <button
                                        key={chip.name}
                                        type="button"
                                        onClick={() => setChip(chip.name)}
                                        aria-pressed={plan.chip === chip.name}
                                        className={`flex min-h-[44px] items-center px-3 text-[8.5px] font-medium tracking-[0.14em] transition-colors ${
                                            plan.chip === chip.name
                                                ? 'bg-inverted text-background'
                                                : 'bg-panel text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        {plan.chip === chip.name ? `${chip.label} ON` : `PLAY ${chip.label}`}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 flex gap-px bg-border">
                            <SummaryCell
                                label="FREE TRANSFERS"
                                note={
                                    finances.chip
                                        ? 'CHIP · UNLIMITED'
                                        : overridden
                                            // Measured: at 7px in a 94px cell
                                            // these are the longest that do
                                            // not truncate at 375px, and a
                                            // truncated affordance is not one.
                                            ? 'SET BY YOU · RESET'
                                            : 'DERIVED · EDIT'
                                }
                            >
                                {finances.chip ? (
                                    <span className="text-foreground">∞</span>
                                ) : editingFree ? (
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        autoFocus
                                        defaultValue={String(freeTransfers)}
                                        aria-label="Free transfers"
                                        // Committed on Enter as well as on
                                        // blur, rather than by having Enter
                                        // call blur(): a field that only ever
                                        // saves on the way out loses the edit
                                        // whenever the blur does not arrive.
                                        onBlur={(e) => commitFree(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') commitFree(e.target.value);
                                            if (e.key === 'Escape') setEditingFree(false);
                                        }}
                                        className="w-full bg-transparent text-[22px] font-bold leading-[0.9] tracking-[-0.04em] text-foreground focus:outline-none md:text-[26px]"
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            overridden
                                                ? updatePlan((current) => ({ ...current, freeOverride: null }))
                                                : setEditingFree(true)
                                        }
                                        aria-label={
                                            overridden
                                                ? 'Reset free transfers to the derived figure'
                                                : 'Edit free transfers'
                                        }
                                        className="block w-full text-left text-foreground"
                                    >
                                        {formatCount(freeTransfers)}
                                    </button>
                                )}
                            </SummaryCell>

                            <SummaryCell
                                label="IN THE BANK"
                                value={formatMoney(finances.bankAfter)}
                                tone={finances.bankAfter < 0 ? 'negative' : undefined}
                                note={
                                    finances.transfers === 0 && applied.pending.length === 0
                                        ? 'NO MOVES YET'
                                        : applied.pending.length > 0
                                            ? `${formatCount(applied.pending.length)} SLOT${
                                                  applied.pending.length === 1 ? '' : 'S'
                                              } STILL OPEN`
                                            : `AFTER ${formatCount(finances.transfers)} IN`
                                }
                            />

                            <SummaryCell
                                label="POINTS HIT"
                                value={finances.hit > 0 ? `−${formatCount(finances.hit)}` : '0'}
                                tone={finances.hit > 0 ? 'negative' : 'zero'}
                                note={
                                    finances.chip
                                        ? 'CHIP COVERS THEM'
                                        : finances.paid > 0
                                            ? `${formatCount(finances.paid)} OVER`
                                            : 'NOTHING TO PAY'
                                }
                            />
                        </div>

                        {/* Shown on both views, because an illegal squad is
                            illegal on both. Named, never blocked. */}
                        {issues.length > 0 && (
                            <div className="mt-px flex flex-col gap-px bg-border">
                                {issues.map((issue) => (
                                    <div
                                        key={issue.key}
                                        className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-l-2 border-destructive bg-panel px-3 py-2.5"
                                    >
                                        <span className="text-[8px] font-medium leading-none tracking-[0.14em] text-destructive-ink">
                                            {issue.label}
                                        </span>
                                        <span className="text-[8px] leading-none tracking-[0.1em] text-muted-foreground">
                                            {issue.detail}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {ready && (
                <>
                    <div className="mt-4 flex border-t border-border px-4 md:px-7">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                aria-pressed={tab === t.id}
                                className={`min-h-[44px] flex-1 border-b-2 py-[14px] text-center text-[9.5px] font-medium leading-none tracking-[0.14em] transition-colors md:text-[11.5px] ${
                                    tab === t.id
                                        ? 'border-live text-live-ink'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {tab === 'pitch' ? (
                        <div className="px-4 pb-10 pt-4 md:px-7 lg:flex lg:items-start lg:gap-4">
                            <div className="min-w-0 lg:flex-1">
                                <div className="flex gap-px bg-border">
                                    {MODES.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setMode(m.id)}
                                            aria-pressed={mode === m.id}
                                            className={`flex min-h-[38px] flex-1 items-center justify-center px-1 text-[8px] font-medium tracking-[0.12em] transition-colors ${
                                                mode === m.id
                                                    ? 'bg-inverted text-background'
                                                    : 'bg-panel text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Always rendered, so the pitch never jumps
                                    when something is picked up. */}
                                <div className="mt-px flex min-h-[44px] flex-wrap items-center gap-x-2 gap-y-1 bg-panel px-3 py-1.5">
                                    {selectedEntry ? (
                                        <>
                                            <span className="mr-1 truncate text-[8px] font-medium leading-none tracking-[0.14em] text-live-ink">
                                                {(selectedEntry.player || selectedEntry.original).name.toUpperCase()}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => onArmband('captain')}
                                                className={`${actionClass} text-muted-foreground hover:text-foreground`}
                                            >
                                                CAPTAIN
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onArmband('vice')}
                                                className={`${actionClass} text-muted-foreground hover:text-foreground`}
                                            >
                                                VICE
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (selectedEntry.removed) {
                                                        dropMove(selectedEntry.original.id);
                                                        setSelected(null);
                                                    } else {
                                                        setMove(selectedEntry.original.id, null);
                                                    }
                                                }}
                                                className={`${actionClass} text-destructive-ink hover:opacity-70`}
                                            >
                                                {selectedEntry.removed ? 'UNDO TRANSFER' : 'TRANSFER OUT'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelected(null)}
                                                className={`${actionClass} text-muted-foreground hover:text-foreground`}
                                            >
                                                CANCEL
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-[7.5px] leading-[1.5] tracking-[0.12em] text-muted-foreground">
                                            TAP A PLAYER TO CAPTAIN OR TRANSFER THEM · TAP TWO TO SWAP THEM
                                        </span>
                                    )}
                                </div>

                                <div className="mt-px">
                                    <PlanPitch
                                        applied={applied}
                                        mode={mode}
                                        events={cardEvents}
                                        fixtureIndex={fixtureIndex}
                                        fixturesReady={fixturesState === 'ready'}
                                        selected={selected}
                                        onSelect={onSelect}
                                        onFill={setSelected}
                                    />
                                </div>

                                <PlanLedger applied={applied} finances={finances} onReset={resetPlan} />
                            </div>

                            <div ref={panelRef} className="mt-4 lg:mt-0 lg:w-[336px] lg:shrink-0">
                                <PlanPlayerPanel
                                    bootstrap={bootstrap}
                                    fixtureIndex={fixtureIndex}
                                    events={gridEvents}
                                    owned={ownedIds}
                                    budgetFor={budgetFor}
                                    clubCounts={clubCounts}
                                    target={target}
                                    onPick={onPick}
                                    onCancelTarget={() => {
                                        if (target?.removed && !target.incoming) dropMove(target.original.id);
                                        setSelected(null);
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <TransferPlanFixtures
                            applied={applied}
                            fixtureIndex={fixtureIndex}
                            events={gridEvents}
                            state={fixturesState}
                        />
                    )}
                </>
            )}
        </div>
    );
};

/** Mirrors the geometry, so nothing reflows when the data lands. */
const PlannerSkeleton = () => (
    <div className="mx-auto max-w-[1280px] animate-pulse">
        <div className="px-4 pt-4 md:px-7">
            <div className="h-[25px] w-2/3 bg-panel md:h-[46px]" />
            <div className="mt-4 flex gap-px bg-border">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-[72px] flex-1 bg-panel" />
                ))}
            </div>
        </div>
        <div className="mt-4 h-[44px] border-y border-border" />
        <div className="px-4 pt-4 md:px-7">
            <div className="h-[360px] bg-panel" />
        </div>
    </div>
);

export default TransferPlanner;
