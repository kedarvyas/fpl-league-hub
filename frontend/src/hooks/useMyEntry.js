import { useLocalStorage } from './useLocalStorage';

/**
 * "This is me" — the entry the reader owns, as opposed to the entry they
 * happen to be looking at.
 *
 * These used to be the same key. `MyTeam` wrote `fpl_team_id` from
 * `location.state.teamId`, and clicking any manager on the H2H or Dashboard
 * pages navigates to `/my-team` with exactly that state — so the stored "my
 * team" was really "the last manager I clicked on". The H2H page's YOUR
 * FIXTURE section and the standings YOU marker both key off it, so both
 * silently followed whoever you last looked at, and nothing on the page told
 * you it had happened.
 *
 * So identity is its own key now and is only ever written by a deliberate act:
 * submitting your own id, or pressing THIS IS ME on a team you are viewing.
 * Browsing writes nothing.
 */
export const MY_ENTRY_KEY = 'fpl_my_entry';

const LEGACY_KEY = 'fpl_team_id';

// One-time migration, at import rather than in an effect: useLocalStorage
// reads its initial value during the first render of whichever component
// mounts first, so seeding has to have already happened by then. The legacy
// value may well be the wrong manager — that was the bug — but it is a better
// starting guess than nothing, and it is now correctable from the page.
try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(MY_ENTRY_KEY) === null) {
        const legacy = window.localStorage.getItem(LEGACY_KEY);
        if (legacy) window.localStorage.setItem(MY_ENTRY_KEY, legacy);
    }
} catch (err) {
    // Private mode and blocked storage both throw here. Identity is a
    // convenience; the app works without it.
}

export const useMyEntry = () => useLocalStorage(MY_ENTRY_KEY, '');
