import { useCallback, useEffect, useState } from 'react';
import { emptyPlan } from '../lib/transferPlan';

/**
 * A transfer plan, kept in `localStorage`.
 *
 * The key carries both the entry and the gameweek being planned, so a plan
 * does not leak across a deadline: once GW3 is next, GW2's plan is history and
 * the page opens on an empty one rather than on moves that have already been
 * made or missed.
 *
 * `localStorage` is enough for v1 and matches how the app already stores
 * identity. Supabase auth exists but is barely used, and moving plans
 * server-side is a real feature — sync, sharing, a schema — that deserves its
 * own decision rather than being smuggled in under this one.
 *
 * The stored shape is `{ entry, targetEvent, moves: [{ out, in }], chip,
 * freeOverride }`. `moves` is deliberately a flat list of pairs so that a
 * chained multi-gameweek plan stays possible later as a *list* of these
 * objects, rather than needing this one rewritten.
 */
export const planStorageKey = (entry, targetEvent) => `fpl_plan_${entry}_${targetEvent}`;

const read = (key, entry, targetEvent) => {
    if (!key || typeof window === 'undefined') return emptyPlan(entry, targetEvent);
    try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        // A stored plan whose entry or gameweek disagrees with the key is not
        // this plan. Trust the key.
        if (!parsed || !Array.isArray(parsed.moves)) return emptyPlan(entry, targetEvent);
        return { ...emptyPlan(entry, targetEvent), ...parsed, entry: String(entry), targetEvent };
    } catch (err) {
        // Private mode and blocked storage both throw. A plan is a
        // convenience; the page works without one.
        return emptyPlan(entry, targetEvent);
    }
};

export const useTransferPlan = (entry, targetEvent) => {
    const ready = !!entry && targetEvent !== null && targetEvent !== undefined;
    const key = ready ? planStorageKey(entry, targetEvent) : null;

    const [plan, setPlan] = useState(() => read(key, entry, targetEvent));

    // The key is not known until the entry and the target gameweek have
    // loaded, so the first read happens here rather than only in useState.
    useEffect(() => {
        setPlan(read(key, entry, targetEvent));
    }, [key, entry, targetEvent]);

    // Writing to storage happens here, not inside the state updater. React
    // treats updaters as pure and double-invokes them under StrictMode, so any
    // side effect placed in one runs twice.
    useEffect(() => {
        if (!key || typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(key, JSON.stringify(plan));
        } catch (err) {
            // Storage is full or blocked. Keep the plan in memory.
        }
    }, [key, plan]);

    const update = useCallback((next) => setPlan(next), []);

    const reset = useCallback(() => update(emptyPlan(entry, targetEvent)), [update, entry, targetEvent]);

    return [plan, update, reset];
};
