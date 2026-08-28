import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransferPlanner from './TransferPlanner';

/**
 * The planner, driven the way a reader drives it.
 *
 * **Everything here renders inside `<React.StrictMode>`, deliberately.** The
 * one bug this page shipped with was a `swapSheet` called from inside a
 * `setSelected` updater: React treats updaters as pure and double-invokes them
 * under StrictMode, so the swap ran twice and silently undid itself. Nothing
 * threw, nothing logged, and the only symptom was that tapping two players did
 * nothing at all. A test rendered without StrictMode would have passed.
 *
 * The second bug was a non-essential fetch inside the page-critical `try`, so
 * a missing fixture list took down the whole page. Both have regression tests
 * below, marked where they are.
 *
 * Queries go through the accessible name rather than class names, so the cards
 * are found the way a screen reader finds them.
 */

/* ------------------------------------------------------------------ */
/* A legal fifteen                                                     */
/* ------------------------------------------------------------------ */

// Slot order is FPL's own: 1-11 start, 12-15 are the bench in sub order.
// This lays out a legal 3-4-3 with a keeper, two defenders and a midfielder
// on the bench.
const TYPES = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 2, 3];
const NAMES = [
    'Keeper', 'Backline', 'Centreback', 'Fullback', 'Playmaker', 'Winger', 'Anchor',
    'Roamer', 'Poacher', 'Target', 'Striker', 'Reserve', 'Spare', 'Cover', 'Understudy',
];
const CLUBS = [
    { id: 1, short_name: 'ARS' }, { id: 2, short_name: 'LIV' }, { id: 3, short_name: 'MCI' },
    { id: 4, short_name: 'EVE' }, { id: 5, short_name: 'BOU' },
];

const element = (id, name, type, team, cost, extra = {}) => ({
    id,
    code: id,
    web_name: name,
    first_name: name,
    second_name: name,
    element_type: type,
    team,
    now_cost: cost,
    cost_change_start: 0,
    status: 'a',
    chance_of_playing_next_round: null,
    news: '',
    can_select: true,
    can_transact: true,
    ep_next: '2.0',
    form: '2.0',
    total_points: 10,
    selected_by_percent: '5.0',
    price_change_projections: [],
    ...extra,
});

const bootstrap = {
    teams: CLUBS,
    // Five clubs across fifteen players puts the squad exactly on the
    // three-per-club limit, so the club rule does not fire over the top of
    // whatever a test is actually asserting.
    elements: [
        ...TYPES.map((t, i) => element(i + 1, NAMES[i], t, (i % 5) + 1, 50)),
        // Affordable replacements, one per position, at a club the squad is
        // not already full of.
        element(101, 'Newkeeper', 1, 1, 45),
        element(102, 'Newback', 2, 1, 45),
        element(106, 'Sparepart', 2, 1, 45),
        element(103, 'Newmid', 3, 1, 45),
        element(104, 'Newforward', 4, 1, 45),
        // Out of reach on any budget this squad can raise.
        element(105, 'Expensive', 2, 2, 140),
    ],
    events: [
        { id: 1, deadline_time: '2026-08-21T17:30:00Z', is_current: true, is_next: false, finished: true },
        { id: 2, deadline_time: '2099-08-28T17:30:00Z', is_current: false, is_next: true, finished: false },
        { id: 3, deadline_time: '2099-09-04T17:30:00Z', is_current: false, is_next: false, finished: false },
        { id: 4, deadline_time: '2099-09-12T12:30:00Z', is_current: false, is_next: false, finished: false },
    ],
    chips: [
        { name: 'wildcard', chip_type: 'transfer', start_event: 2, stop_event: 19 },
        { name: 'freehit', chip_type: 'transfer', start_event: 2, stop_event: 19 },
    ],
};

const picks = {
    entry_history: { bank: 0, value: 750 },
    picks: TYPES.map((t, i) => ({
        element: i + 1,
        position: i + 1,
        element_type: t,
        multiplier: i < 11 ? 1 : 0,
        // Poacher (slot 9) captains, Playmaker (slot 5) is vice.
        is_captain: i === 8,
        is_vice_captain: i === 4,
    })),
};

const teamData = {
    id: 99, name: 'Test XI', current_event: 1, started_event: 1, last_deadline_bank: 0,
};

const history = {
    current: [{ event: 1, event_transfers: 0, event_transfers_cost: 0, bank: 0, value: 750 }],
    chips: [],
};

// GW2-4 for every club, so no test accidentally depends on a blank.
const fixtures = [2, 3, 4].flatMap((event) =>
    [[1, 2], [3, 4], [5, 1]].map(([h, a], i) => ({
        id: event * 10 + i,
        event,
        team_h: h,
        team_a: a,
        team_h_difficulty: 2,
        team_a_difficulty: 4,
        kickoff_time: `2099-0${event}-01T12:00:00Z`,
    })),
);

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

const ROUTES = [
    { match: 'bootstrap-static', body: () => bootstrap },
    { match: 'team-data', body: () => teamData },
    { match: 'entry-picks', body: () => picks },
    { match: 'entry-transfers', body: () => [] },
    { match: 'team-history', body: () => history },
    { match: 'fixtures-future', body: () => fixtures },
];

const mockFetch = ({ fail = [] } = {}) => {
    global.fetch = jest.fn((url) => {
        const target = String(url);
        const route = ROUTES.find((r) => target.includes(r.match));
        if (!route) return Promise.reject(new Error(`unmocked: ${target}`));
        if (fail.includes(route.match)) {
            // How Supabase's gateway answers a function that is not deployed.
            return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(route.body()) });
    });
};

const renderPlanner = () =>
    render(
        <React.StrictMode>
            <MemoryRouter>
                <TransferPlanner />
            </MemoryRouter>
        </React.StrictMode>,
    );

/** The squad is on screen once the first player's card is. */
const ready = () => waitFor(() => expect(card('Keeper')).toBeInTheDocument(), { timeout: 4000 });

/**
 * A player on the pitch or bench.
 *
 * Scoped by `aria-pressed`, which only the squad cards carry — a plain name
 * match would also hit the player list, where a transferred-out player
 * correctly reappears as someone you can buy back.
 */
const card = (name) =>
    [...document.querySelectorAll('button[aria-pressed]')].find((b) =>
        b.textContent.startsWith(name),
    ) || null;

/** A row in the player list, which is the only place a name is not a card. */
const listRow = (name) =>
    [...document.querySelectorAll('button:not([aria-pressed])')].find((b) =>
        b.textContent.startsWith(name),
    );

/** One cell of the summary strip, label and value together. */
const summary = (label) => screen.getByText(label).parentElement.textContent;

const action = (label) => screen.getByRole('button', { name: label });

beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('fpl_my_entry', JSON.stringify('99'));
    Element.prototype.scrollIntoView = jest.fn();
    mockFetch();
});

afterEach(() => {
    jest.restoreAllMocks();
});

/* ------------------------------------------------------------------ */
/* The squad                                                           */
/* ------------------------------------------------------------------ */

describe('the squad it opens on', () => {
    it('puts eleven on the pitch and four on the bench, in a legal shape', async () => {
        renderPlanner();
        await ready();

        expect(screen.getByText('3-4-3')).toBeInTheDocument();
        // All fifteen are present and selectable.
        NAMES.forEach((name) => expect(card(name)).toBeInTheDocument());
        // Nothing is wrong with an untouched squad.
        expect(screen.queryByText('FORMATION')).not.toBeInTheDocument();
        expect(screen.queryByText('CLUB LIMIT')).not.toBeInTheDocument();
    });

    it('carries last gameweek’s armbands over', async () => {
        renderPlanner();
        await ready();

        expect(within(card('Poacher')).getByText('C')).toBeInTheDocument();
        expect(within(card('Playmaker')).getByText('V')).toBeInTheDocument();
    });

    it('states the baseline, because next gameweek’s picks do not exist yet', async () => {
        renderPlanner();
        await ready();
        expect(screen.getByText(/FROM YOUR GW1 SQUAD/)).toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/* Selection — the StrictMode regression                               */
/* ------------------------------------------------------------------ */

describe('selection and swapping', () => {
    it('substitutes a bench player for a starter on two taps', async () => {
        // REGRESSION: swapSheet used to run inside a setSelected updater, which
        // StrictMode double-invokes, so the swap applied twice and cancelled
        // itself. The formation is the tell — nothing else changes visibly.
        renderPlanner();
        await ready();
        expect(screen.getByText('3-4-3')).toBeInTheDocument();

        // Reserve is the bench keeper; benching an outfielder for them leaves
        // two keepers starting and one fewer defender.
        fireEvent.click(card('Backline'));
        fireEvent.click(card('Reserve'));

        await waitFor(() => expect(screen.getByText('2-4-3')).toBeInTheDocument());
    });

    it('swaps two starters without changing the shape', async () => {
        renderPlanner();
        await ready();

        fireEvent.click(card('Playmaker'));
        fireEvent.click(card('Winger'));

        await waitFor(() => expect(screen.getByText('3-4-3')).toBeInTheDocument());
        expect(screen.queryByText('FORMATION')).not.toBeInTheDocument();
    });

    it('deselects when the same player is tapped twice', async () => {
        renderPlanner();
        await ready();

        fireEvent.click(card('Winger'));
        expect(action('CANCEL')).toBeInTheDocument();

        fireEvent.click(card('Winger'));
        await waitFor(() =>
            expect(screen.queryByRole('button', { name: 'CANCEL' })).not.toBeInTheDocument(),
        );
    });
});

/* ------------------------------------------------------------------ */
/* The armbands                                                        */
/* ------------------------------------------------------------------ */

describe('the armbands', () => {
    it('moves the captaincy to the selected player', async () => {
        renderPlanner();
        await ready();

        fireEvent.click(card('Winger'));
        fireEvent.click(action('CAPTAIN'));

        await waitFor(() => expect(within(card('Winger')).getByText('C')).toBeInTheDocument());
        expect(within(card('Poacher')).queryByText('C')).not.toBeInTheDocument();
    });

    it('swaps the two when the vice is promoted, rather than doubling up', async () => {
        renderPlanner();
        await ready();

        // Playmaker is vice, Poacher is captain.
        fireEvent.click(card('Playmaker'));
        fireEvent.click(action('CAPTAIN'));

        await waitFor(() => expect(within(card('Playmaker')).getByText('C')).toBeInTheDocument());
        expect(within(card('Poacher')).getByText('V')).toBeInTheDocument();
    });

    it('names a benched captain instead of quietly reassigning it', async () => {
        renderPlanner();
        await ready();

        // Bench the captain by swapping them with a substitute.
        fireEvent.click(card('Poacher'));
        fireEvent.click(card('Understudy'));

        await waitFor(() => expect(screen.getByText('CAPTAIN BENCHED')).toBeInTheDocument());
    });
});

/* ------------------------------------------------------------------ */
/* Transfers                                                           */
/* ------------------------------------------------------------------ */

describe('transfers', () => {
    const transferOut = async (name) => {
        fireEvent.click(card(name));
        fireEvent.click(action('TRANSFER OUT'));
        await waitFor(() => expect(screen.getByText(/REPLACING/)).toBeInTheDocument());
    };

    it('opens a slot, releases the money, and does not charge for it yet', async () => {
        renderPlanner();
        await ready();
        await transferOut('Centreback');

        // The sale is banked immediately so the list can price itself, but an
        // empty slot is not a transfer.
        expect(summary('IN THE BANK')).toContain('£5.0M');
        expect(summary('IN THE BANK')).toContain('1 SLOT STILL OPEN');
        expect(summary('POINTS HIT')).toContain('NOTHING TO PAY');
        expect(screen.getByText(/1 SLOT.*STILL EMPTY/)).toBeInTheDocument();
    });

    it('completes the transfer and reconciles the ledger', async () => {
        renderPlanner();
        await ready();
        await transferOut('Centreback');

        fireEvent.click(listRow('Newback'));

        await waitFor(() => expect(card('Newback')).toBeInTheDocument());
        // Off the pitch, and back in the list as someone you could buy again.
        expect(card('Centreback')).toBeNull();
        expect(listRow('Centreback')).toBeDefined();
        // Sold at 5.0, bought at 4.5, so 0.5 is left over and it was free.
        expect(summary('IN THE BANK')).toContain('AFTER 1 IN');
        expect(screen.getByText('1 TRANSFER · 1 FREE')).toBeInTheDocument();
    });

    it('charges four points for the second transfer', async () => {
        renderPlanner();
        await ready();

        await transferOut('Centreback');
        fireEvent.click(listRow('Newback'));
        await waitFor(() => expect(card('Newback')).toBeInTheDocument());

        await transferOut('Fullback');
        fireEvent.click(listRow('Sparepart'));

        await waitFor(() => expect(summary('POINTS HIT')).toContain('1 OVER'));
        expect(summary('POINTS HIT')).toContain('−4');
    });

    it('makes transfers free and unlimited under a wildcard', async () => {
        renderPlanner();
        await ready();

        await transferOut('Centreback');
        fireEvent.click(listRow('Newback'));
        await waitFor(() => expect(card('Newback')).toBeInTheDocument());
        await transferOut('Fullback');
        fireEvent.click(listRow('Sparepart'));
        await waitFor(() => expect(summary('POINTS HIT')).toContain('−4'));

        fireEvent.click(action('PLAY WILDCARD'));

        await waitFor(() => expect(summary('POINTS HIT')).toContain('CHIP COVERS THEM'));
        expect(summary('FREE TRANSFERS')).toContain('∞');
    });

    it('names an overspend rather than preventing it', async () => {
        renderPlanner();
        await ready();
        await transferOut('Centreback');

        // Reachable on purpose: the list shows what it costs and lets you.
        fireEvent.click(listRow('Expensive'));

        await waitFor(() => expect(screen.getByText('OVER BUDGET')).toBeInTheDocument());
        expect(screen.getByText('£9.0M MORE THAN YOU HAVE')).toBeInTheDocument();
    });
});

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

describe('the stored plan', () => {
    it('writes the moves and the team sheet as they are made', async () => {
        renderPlanner();
        await ready();

        fireEvent.click(card('Winger'));
        fireEvent.click(action('CAPTAIN'));

        await waitFor(() => {
            const stored = JSON.parse(window.localStorage.getItem('fpl_plan_99_2'));
            // Keyed by slot, not by player id: a slot's position cannot change,
            // but a player id stops existing the moment they are sold.
            expect(stored.sheet.captain).toBe(6);
            expect(stored.sheet.vice).toBe(5);
        });
    });

    it('opens on a plan saved earlier rather than on the baseline', async () => {
        // Saving and restoring are asserted separately on purpose. Doing both
        // in one test means unmounting and remounting inside a single act()
        // scope, where the restore lands a tick after the squad and jsdom will
        // not flush it — a property of the harness, not of the page.
        window.localStorage.setItem('fpl_plan_99_2', JSON.stringify({
            entry: '99',
            targetEvent: 2,
            moves: [{ out: 3, in: 102 }],
            sheet: {
                xi: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                bench: [12, 13, 14, 15],
                captain: 6,
                vice: 5,
            },
        }));

        renderPlanner();
        await ready();

        await waitFor(() => expect(within(card('Winger')).getByText('C')).toBeInTheDocument());
        // The stored move is applied too, in the outgoing player's own slot.
        expect(card('Newback')).toBeTruthy();
        expect(card('Centreback')).toBeNull();
    });

    it('ignores a stored sheet that no longer describes the squad', async () => {
        // Trusting a sheet that has lost a player would drop someone off the
        // pitch entirely, so an unreconcilable one falls back to the baseline.
        window.localStorage.setItem('fpl_plan_99_2', JSON.stringify({
            entry: '99',
            targetEvent: 2,
            moves: [],
            sheet: { xi: [1, 2, 3], bench: [4], captain: 6, vice: 5 },
        }));

        renderPlanner();
        await ready();

        expect(screen.getByText('3-4-3')).toBeInTheDocument();
        expect(within(card('Poacher')).getByText('C')).toBeInTheDocument();
    });

    it('is keyed to the gameweek, so it does not leak across a deadline', async () => {
        renderPlanner();
        await ready();
        fireEvent.click(card('Winger'));
        fireEvent.click(action('CAPTAIN'));

        await waitFor(() =>
            expect(window.localStorage.getItem('fpl_plan_99_2')).not.toBeNull(),
        );
        expect(window.localStorage.getItem('fpl_plan_99_3')).toBeNull();
    });
});

/* ------------------------------------------------------------------ */
/* Degrading — the fixtures regression                                 */
/* ------------------------------------------------------------------ */

describe('when fixtures cannot be loaded', () => {
    it('still renders the whole workspace', async () => {
        // REGRESSION: this call used to sit inside the page-critical try, so a
        // missing fixtures function produced "Could not load team 99" and no
        // page at all — even though the squad, the money and the hit are all
        // answerable without a single fixture.
        mockFetch({ fail: ['fixtures-future'] });
        renderPlanner();
        await ready();

        expect(screen.queryByText(/Could not load team/)).not.toBeInTheDocument();
        expect(screen.getByText('3-4-3')).toBeInTheDocument();
        expect(screen.getByText('IN THE BANK')).toBeInTheDocument();
    });

    it('says so on the fixtures tab rather than drawing fifteen false blanks', async () => {
        mockFetch({ fail: ['fixtures-future'] });
        renderPlanner();
        await ready();

        fireEvent.click(action('FIXTURES'));

        await waitFor(() => expect(screen.getByText('COULD NOT LOAD FIXTURES')).toBeInTheDocument());
        expect(screen.queryByText('BLANK')).not.toBeInTheDocument();
    });

    it('still fails the page when the squad itself cannot be loaded', async () => {
        mockFetch({ fail: ['team-data'] });
        renderPlanner();

        await waitFor(() => expect(screen.getByText(/Could not load team 99/)).toBeInTheDocument());
    });
});

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

describe('identity', () => {
    it('asks for a team rather than guessing when none is set', async () => {
        window.localStorage.clear();
        renderPlanner();

        expect(screen.getByRole('heading', { name: 'Set your team' })).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });
});
