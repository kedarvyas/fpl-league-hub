import {
    HIT_COST,
    applyPlan,
    baselineSheet,
    buildPlanBase,
    reconcileSheet,
    setArmband,
    swapSheet,
    MAX_FREE_TRANSFERS,
    buildFixtureIndex,
    buildPurchasePrices,
    deriveFreeTransfers,
    fixturesFor,
    planEvents,
    planFinances,
    purchasePriceOf,
    sellingPrice,
    summariseColumn,
    summariseRun,
    untilDeadline,
    validatePlan,
} from './transferPlan';

/* ------------------------------------------------------------------ */
/* Selling price                                                       */
/* ------------------------------------------------------------------ */

describe('sellingPrice', () => {
    it('returns the current price when nothing has moved', () => {
        expect(sellingPrice(55, 55)).toBe(55);
    });

    it('takes a fall in full', () => {
        // Martinelli: bought at 65, now 64, sells for 64.
        expect(sellingPrice(65, 64)).toBe(64);
        expect(sellingPrice(65, 60)).toBe(60);
    });

    it('gives back half a rise, rounded down to 0.1', () => {
        // Calafiori: bought at 55, now 56. floor(1/2) is 0, so a single 0.1
        // rise is worth nothing on the way out — the case a naive average gets
        // wrong by rounding it up to 55.5.
        expect(sellingPrice(55, 56)).toBe(55);
        expect(sellingPrice(55, 57)).toBe(56);
        expect(sellingPrice(55, 58)).toBe(56);
        expect(sellingPrice(55, 59)).toBe(57);
    });

    it('never returns a fraction of a tenth', () => {
        for (let now = 40; now <= 60; now += 1) {
            expect(Number.isInteger(sellingPrice(50, now))).toBe(true);
        }
    });

    it('falls back to the current price when the purchase is unknown', () => {
        // Understating the budget produces a plan that is legal; overstating
        // it produces one that is not.
        expect(sellingPrice(null, 56)).toBe(56);
        expect(sellingPrice(undefined, 56)).toBe(56);
    });
});

describe('purchase prices', () => {
    const element = { id: 7, now_cost: 56, cost_change_start: 1 };

    it('derives an untransferred player from cost_change_start', () => {
        expect(purchasePriceOf(element, new Map())).toBe(55);
    });

    it('prefers element_in_cost for a player who was bought', () => {
        const prices = buildPurchasePrices(
            [{ event: 3, time: '2026-09-01T10:00:00Z', element_in: 7, element_in_cost: 54 }],
            [],
        );
        expect(purchasePriceOf(element, prices)).toBe(54);
    });

    it('keeps the most recent purchase when a player was bought twice', () => {
        const prices = buildPurchasePrices(
            [
                { event: 8, time: '2026-10-01T10:00:00Z', element_in: 7, element_in_cost: 58 },
                { event: 3, time: '2026-09-01T10:00:00Z', element_in: 7, element_in_cost: 54 },
            ],
            [],
        );
        expect(prices.get(7)).toBe(58);
    });

    it('ignores transfers made on a Free Hit', () => {
        // The Free Hit squad is discarded at the end of its gameweek, so a
        // player "bought" on one was never bought. Counting it would price the
        // real owner's asset at the Free Hit price.
        const transfers = [
            { event: 3, time: '2026-09-01T10:00:00Z', element_in: 7, element_in_cost: 54 },
            { event: 9, time: '2026-10-20T10:00:00Z', element_in: 7, element_in_cost: 61 },
        ];
        const prices = buildPurchasePrices(transfers, [{ name: 'freehit', event: 9 }]);
        expect(prices.get(7)).toBe(54);
    });

    it('does not ignore transfers made on a Wildcard', () => {
        // A Wildcard squad is kept, so its purchases are real purchases.
        const transfers = [{ event: 9, time: '2026-10-20T10:00:00Z', element_in: 7, element_in_cost: 61 }];
        const prices = buildPurchasePrices(transfers, [{ name: 'wildcard', event: 9 }]);
        expect(prices.get(7)).toBe(61);
    });
});

/* ------------------------------------------------------------------ */
/* Free transfers                                                      */
/* ------------------------------------------------------------------ */

const week = (event, made = 0, hits = 0) => ({
    event,
    event_transfers: made,
    event_transfers_cost: hits * HIT_COST,
});

describe('deriveFreeTransfers', () => {
    it('gives one going into the second gameweek', () => {
        // GW1's squad is unlimited and free, so nothing has accumulated yet.
        expect(deriveFreeTransfers({ current: [week(1)], targetEvent: 2 }).free).toBe(1);
    });

    it('banks one for each unused week', () => {
        const current = [week(1), week(2), week(3)];
        expect(deriveFreeTransfers({ current, targetEvent: 4 }).free).toBe(3);
    });

    it('spends one on a free transfer', () => {
        const current = [week(1), week(2, 1, 0)];
        expect(deriveFreeTransfers({ current, targetEvent: 3 }).free).toBe(1);
    });

    it('derives the free ones from the cost, not the count', () => {
        // Three transfers costing 8 means two were paid for, so exactly one
        // free transfer was consumed however many were made.
        const current = [week(1), week(2), week(3, 3, 2)];
        expect(deriveFreeTransfers({ current, targetEvent: 4 }).free).toBe(2);
    });

    it('caps at five', () => {
        const current = Array.from({ length: 12 }, (_, i) => week(i + 1));
        expect(deriveFreeTransfers({ current, targetEvent: 13 }).free).toBe(MAX_FREE_TRANSFERS);
    });

    it('never goes below the one earned that week', () => {
        const current = [week(1), week(2, 5, 4)];
        expect(deriveFreeTransfers({ current, targetEvent: 3 }).free).toBe(1);
    });

    it('spends nothing in a Wildcard week and keeps what was banked', () => {
        const current = [week(1), week(2), week(3), week(4, 9, 0)];
        const chips = [{ name: 'wildcard', event: 4 }];
        // Three banked going into GW4, the chip covers all nine, plus one for
        // GW5 — the banked ones survive.
        expect(deriveFreeTransfers({ current, chips, targetEvent: 5 }).free).toBe(4);
    });

    it('spends nothing in a Free Hit week either', () => {
        const current = [week(1), week(2), week(3, 6, 0)];
        const chips = [{ name: 'freehit', event: 3 }];
        expect(deriveFreeTransfers({ current, chips, targetEvent: 4 }).free).toBe(3);
    });

    it('accumulates from started_event for a manager who joined late', () => {
        // Joined at GW5: the opening squad is GW5's, so GW6 is their first
        // week with a free transfer and GW8 is their third.
        const current = [week(5), week(6), week(7)];
        expect(deriveFreeTransfers({ current, startedEvent: 5, targetEvent: 8 }).free).toBe(3);
        expect(deriveFreeTransfers({ current, startedEvent: 5, targetEvent: 6 }).free).toBe(1);
    });

    it('shows its working', () => {
        const current = [week(1), week(2, 1, 0), week(3)];
        const { steps } = deriveFreeTransfers({ current, targetEvent: 4 });
        expect(steps.map((s) => s.event)).toEqual([2, 3]);
        expect(steps[0]).toMatchObject({ before: 1, made: 1, paid: 0, used: 1, after: 1 });
        expect(steps[1]).toMatchObject({ before: 1, used: 0, after: 2 });
    });

    it('does not throw on a missing target or an empty history', () => {
        expect(deriveFreeTransfers({}).free).toBe(1);
        expect(deriveFreeTransfers({ current: [], targetEvent: 6 }).free).toBe(MAX_FREE_TRANSFERS);
    });
});

/* ------------------------------------------------------------------ */
/* Budget and legality                                                 */
/* ------------------------------------------------------------------ */

const owned = (id, over = {}) => ({
    id,
    name: `P${id}`,
    club: 'ARS',
    clubId: 1,
    elementType: 2,
    position: 'DEF',
    price: 50,
    selling: 50,
    purchase: 50,
    status: 'a',
    canSelect: true,
    slot: id,
    ...over,
});

/** A plan applied by hand, so planFinances is tested in isolation. */
const applied = (slots) => ({
    slots,
    completed: slots.filter((s) => s.removed && s.incoming),
    pending: slots.filter((s) => s.removed && !s.incoming),
    squad: slots.map((s) => s.player).filter(Boolean),
});

const slot = (original, incoming = null, removed = false) => ({
    slot: original.slot,
    original,
    incoming,
    removed,
    player: incoming || (removed ? null : original),
});

describe('planFinances', () => {
    it('spends the selling price, not the current price', () => {
        // Owned at 56 but only sells for 55: the 0.1 rise is half-taxed away.
        const out = owned(1, { price: 56, purchase: 55, selling: 55 });
        const inc = { id: 99, price: 60, club: 'LIV', clubId: 2, elementType: 2, canSelect: true, name: 'New' };
        const f = planFinances({
            applied: applied([slot(out, inc, true)]),
            bank: 10,
            freeTransfers: 1,
        });
        expect(f.sales).toBe(55);
        expect(f.buys).toBe(60);
        expect(f.bankAfter).toBe(5);
        expect(f.hit).toBe(0);
    });

    it('charges four points per transfer beyond the free ones', () => {
        const slots = [1, 2, 3].map((i) =>
            slot(owned(i), { id: 90 + i, price: 50, club: 'LIV', clubId: 2, elementType: 2, canSelect: true, name: 'N' }, true),
        );
        const f = planFinances({ applied: applied(slots), bank: 0, freeTransfers: 1 });
        expect(f.transfers).toBe(3);
        expect(f.paid).toBe(2);
        expect(f.hit).toBe(8);
    });

    it('makes transfers free and unlimited under a Wildcard', () => {
        const slots = [1, 2, 3, 4].map((i) =>
            slot(owned(i), { id: 90 + i, price: 50, club: 'LIV', clubId: 2, elementType: 2, canSelect: true, name: 'N' }, true),
        );
        const f = planFinances({ applied: applied(slots), bank: 0, freeTransfers: 1, chip: 'wildcard' });
        expect(f.hit).toBe(0);
        expect(f.paid).toBe(0);
        expect(f.chip).toBe('wildcard');
    });

    it('releases the money of a slot that has no replacement yet, but does not count it as a transfer', () => {
        const f = planFinances({
            applied: applied([slot(owned(1, { selling: 55 }), null, true)]),
            bank: 5,
            freeTransfers: 1,
        });
        expect(f.bankAfter).toBe(60);
        expect(f.transfers).toBe(0);
        expect(f.hit).toBe(0);
    });
});

describe('validatePlan', () => {
    const validate = (slots, bank = 0, freeTransfers = 1) => {
        const a = applied(slots);
        return validatePlan({ applied: a, finances: planFinances({ applied: a, bank, freeTransfers }) });
    };

    it('is quiet on a legal squad', () => {
        // A full, legal fifteen: 2 GKP, 5 DEF, 5 MID, 3 FWD across three clubs.
        const types = [1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4];
        const slots = types.map((t, i) =>
            slot(owned(i + 1, { elementType: t, club: ['ARS', 'LIV', 'MCI', 'EVE', 'BOU'][i % 5] })),
        );
        expect(validate(slots)).toEqual([]);
    });

    it('names an overspend rather than preventing it', () => {
        const out = owned(1, { selling: 50 });
        const inc = { id: 99, price: 130, club: 'LIV', clubId: 2, elementType: 2, canSelect: true, name: 'Haaland' };
        const issues = validate([slot(out, inc, true)], 0);
        expect(issues.map((i) => i.key)).toContain('budget');
        expect(issues.find((i) => i.key === 'budget').detail).toBe('£8.0M MORE THAN YOU HAVE');
    });

    it('names a fourth player from one club', () => {
        const slots = [1, 2, 3, 4].map((i) => slot(owned(i, { club: 'ARS' })));
        expect(validate(slots).map((i) => i.label)).toContain('CLUB LIMIT');
    });

    it('names a player who has left the league', () => {
        const inc = { id: 99, price: 50, club: 'LIV', clubId: 2, elementType: 2, canSelect: false, name: 'Gone' };
        expect(validate([slot(owned(1), inc, true)]).map((i) => i.label)).toContain('UNAVAILABLE');
    });

    it('does not complain about squad shape while a slot is still open', () => {
        // Fourteen players is incomplete, not illegal, and saying "4 DEF ·
        // NEEDS 5" about a slot the reader is mid-way through filling is noise.
        const slots = [slot(owned(1), null, true)];
        expect(validate(slots).filter((i) => i.label === 'SQUAD SHAPE')).toEqual([]);
    });
});

describe('applyPlan', () => {
    const bootstrap = {
        teams: [{ id: 1, short_name: 'ARS' }, { id: 2, short_name: 'LIV' }],
        elements: [
            { id: 1, web_name: 'Out', team: 1, element_type: 2, now_cost: 50, cost_change_start: 0 },
            { id: 2, web_name: 'In', team: 2, element_type: 2, now_cost: 60, cost_change_start: 0 },
        ],
    };
    const base = [owned(1, { id: 1, name: 'Out', slot: 1 })];

    it('leaves an unmoved squad alone', () => {
        const a = applyPlan(base, { moves: [] }, bootstrap);
        expect(a.squad.map((p) => p.id)).toEqual([1]);
        expect(a.completed).toHaveLength(0);
    });

    it('swaps the incoming player into the slot', () => {
        const a = applyPlan(base, { moves: [{ out: 1, in: 2 }] }, bootstrap);
        expect(a.squad.map((p) => p.id)).toEqual([2]);
        expect(a.completed).toHaveLength(1);
        expect(a.pending).toHaveLength(0);
    });

    it('leaves the slot empty while no replacement is chosen', () => {
        const a = applyPlan(base, { moves: [{ out: 1, in: null }] }, bootstrap);
        expect(a.squad).toHaveLength(0);
        expect(a.pending).toHaveLength(1);
        expect(a.completed).toHaveLength(0);
    });

    it('treats a move back to the same player as no move at all', () => {
        // A stored plan can hold one, and counting it would charge four points
        // for a change of mind.
        const a = applyPlan(base, { moves: [{ out: 1, in: 1 }] }, bootstrap);
        expect(a.completed).toHaveLength(0);
        expect(a.pending).toHaveLength(0);
        expect(a.squad.map((p) => p.id)).toEqual([1]);
        expect(planFinances({ applied: a, bank: 0, freeTransfers: 1 }).hit).toBe(0);
    });
});

/* ------------------------------------------------------------------ */
/* The team sheet                                                      */
/* ------------------------------------------------------------------ */

/** A realistic fifteen: 2 GKP, 5 DEF, 5 MID, 3 FWD in FPL's own slot order. */
const TYPES = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 2, 3];

// Five clubs, so the fifteen sit exactly on the three-per-club limit and the
// eleven can be tested without the club rule firing over the top of it.
const fullBootstrap = {
    teams: [
        { id: 1, short_name: 'ARS' }, { id: 2, short_name: 'LIV' }, { id: 3, short_name: 'MCI' },
        { id: 4, short_name: 'EVE' }, { id: 5, short_name: 'BOU' },
    ],
    elements: [
        ...TYPES.map((t, i) => ({
            id: i + 1,
            web_name: `P${i + 1}`,
            team: (i % 5) + 1,
            element_type: t,
            now_cost: 50,
            cost_change_start: 0,
            status: 'a',
        })),
        // A midfielder to bring in.
        { id: 99, web_name: 'New', team: 2, element_type: 3, now_cost: 55, cost_change_start: 0, status: 'a' },
    ],
};

const fullPicks = {
    entry_history: { bank: 0 },
    picks: TYPES.map((t, i) => ({
        element: i + 1,
        position: i + 1,
        element_type: t,
        multiplier: i < 11 ? 1 : 0,
        is_captain: i === 8,
        is_vice_captain: i === 4,
    })),
};

const fullBase = () => buildPlanBase({ picks: fullPicks, bootstrap: fullBootstrap });

describe('baselineSheet', () => {
    it('takes the eleven from the slots, not from the multiplier', () => {
        // Under Bench Boost every pick carries a multiplier, so a multiplier
        // test builds a fifteen-man eleven. Slots 1-11 are the eleven.
        const sheet = baselineSheet(fullBase());
        expect(sheet.xi).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        expect(sheet.bench).toEqual([12, 13, 14, 15]);
    });

    it('carries the armbands over from last gameweek', () => {
        const sheet = baselineSheet(fullBase());
        expect(sheet.captain).toBe(9);
        expect(sheet.vice).toBe(5);
    });
});

describe('swapSheet', () => {
    const sheet = baselineSheet(fullBase());

    it('substitutes a bench player for a starter', () => {
        const next = swapSheet(sheet, 3, 13);
        expect(next.xi).toContain(13);
        expect(next.xi).not.toContain(3);
        expect(next.bench).toContain(3);
        expect(next.bench).not.toContain(13);
    });

    it('re-orders substitution priority without touching the eleven', () => {
        const next = swapSheet(sheet, 13, 15);
        expect(next.xi).toEqual(sheet.xi);
        expect(next.bench).toEqual([12, 15, 14, 13]);
    });

    it('keeps fifteen players however they are moved', () => {
        const next = swapSheet(swapSheet(sheet, 1, 12), 5, 14);
        expect([...next.xi, ...next.bench].sort((a, b) => a - b)).toEqual(
            Array.from({ length: 15 }, (_, i) => i + 1),
        );
    });

    it('leaves the armbands where they were', () => {
        // Benching your captain is reachable — the validator names it.
        const next = swapSheet(sheet, 9, 12);
        expect(next.captain).toBe(9);
        expect(next.bench).toContain(9);
    });
});

describe('setArmband', () => {
    const sheet = baselineSheet(fullBase());

    it('moves the captaincy', () => {
        expect(setArmband(sheet, 2, 'captain').captain).toBe(2);
    });

    it('swaps the two when the vice is named captain', () => {
        // Otherwise one player would silently hold both armbands.
        const next = setArmband(sheet, 5, 'captain');
        expect(next.captain).toBe(5);
        expect(next.vice).toBe(9);
    });
});

describe('reconcileSheet', () => {
    const base = fullBase();

    it('falls back to the baseline when nothing is stored', () => {
        expect(reconcileSheet(null, base)).toEqual(baselineSheet(base));
    });

    it('rejects a sheet that has lost a player', () => {
        // Trusting it would drop someone off the pitch entirely.
        const broken = { xi: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], bench: [12, 13, 14] };
        expect(reconcileSheet(broken, base)).toEqual(baselineSheet(base));
    });

    it('rejects a sheet that lists a player twice', () => {
        const broken = { xi: [1, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11], bench: [12, 13, 14, 15] };
        expect(reconcileSheet(broken, base)).toEqual(baselineSheet(base));
    });

    it('rejects an eleven that is not eleven', () => {
        const broken = { xi: [1, 2, 3], bench: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] };
        expect(reconcileSheet(broken, base)).toEqual(baselineSheet(base));
    });

    it('keeps a sheet that reconciles', () => {
        const good = { xi: [12, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], bench: [1, 13, 14, 15], captain: 9, vice: 5 };
        expect(reconcileSheet(good, base).xi).toContain(12);
    });
});

describe('applyPlan with a team sheet', () => {
    const base = fullBase();

    it('reports the outfield shape', () => {
        expect(applyPlan(base, { moves: [] }, fullBootstrap).formation).toBe('3-4-3');
    });

    it('keeps a transfer in the outgoing player\'s place in the eleven', () => {
        // Slot 5 starts, so the player replacing them starts too.
        const a = applyPlan(base, { moves: [{ out: 5, in: 99 }] }, fullBootstrap);
        expect(a.xi.map((e) => e.player.id)).toContain(99);
        expect(a.formation).toBe('3-4-3');
    });

    it('passes the armband to whoever takes the shirt', () => {
        // The captain was slot 9. Transferring them out hands the armband to
        // their replacement rather than leaving the team without one.
        const withFwd = { ...fullBootstrap, elements: [...fullBootstrap.elements, { id: 98, web_name: 'NewF', team: 2, element_type: 4, now_cost: 60, cost_change_start: 0, status: 'a' }] };
        const a = applyPlan(base, { moves: [{ out: 9, in: 98 }] }, withFwd);
        expect(a.captain.player.id).toBe(98);
    });
});

describe('validatePlan — the eleven', () => {
    const base = fullBase();
    const check = (plan) => {
        const a = applyPlan(base, plan, fullBootstrap);
        return validatePlan({ applied: a, finances: planFinances({ applied: a, bank: 0, freeTransfers: 1 }) });
    };

    it('is quiet on a legal 3-4-3', () => {
        expect(check({ moves: [] })).toEqual([]);
    });

    it('names an eleven with no keeper', () => {
        // Slot 1 is the keeper, slot 13 a defender: swapping leaves 0 GKP.
        const sheet = swapSheet(baselineSheet(base), 1, 13);
        const issues = check({ moves: [], sheet });
        expect(issues.find((i) => i.label === 'FORMATION').detail).toBe('0 GKP STARTING · NEEDS 1');
    });

    it('names too few defenders', () => {
        // Start both keepers by benching a defender.
        const sheet = swapSheet(baselineSheet(base), 2, 12);
        expect(check({ moves: [], sheet }).map((i) => i.detail)).toContain('2 DEF STARTING · NEEDS 3–5');
    });

    it('names a benched captain rather than quietly moving the armband', () => {
        // FPL scores the vice instead, which is a different team to the one
        // the reader thinks they picked.
        const sheet = swapSheet(baselineSheet(base), 9, 12);
        expect(check({ moves: [], sheet }).map((i) => i.label)).toContain('CAPTAIN BENCHED');
    });

    it('does not judge the formation while a slot is still empty', () => {
        expect(check({ moves: [{ out: 5, in: null }] }).filter((i) => i.label === 'FORMATION')).toEqual([]);
    });
});

/* ------------------------------------------------------------------ */
/* Fixtures — blanks and doubles                                       */
/* ------------------------------------------------------------------ */

describe('buildFixtureIndex', () => {
    const clubs = new Map([[1, 'ARS'], [2, 'LIV'], [3, 'MCI']]);
    const fixtures = [
        { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 4, team_a_difficulty: 3 },
        { event: 3, team_h: 3, team_a: 1, team_h_difficulty: 2, team_a_difficulty: 5 },
        // A double: ARS play twice in GW4.
        { event: 4, team_h: 1, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 4 },
        { event: 4, team_h: 2, team_a: 1, team_h_difficulty: 2, team_a_difficulty: 2 },
        // Postponed, not yet rescheduled.
        { event: null, team_h: 2, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
    ];
    const index = buildFixtureIndex(fixtures, clubs);

    it('records both sides of a fixture from each club’s point of view', () => {
        expect(fixturesFor(index, 1, 2)).toEqual([
            { opponent: 'LIV', opponentId: 2, isHome: true, difficulty: 4, kickoff: null },
        ]);
        expect(fixturesFor(index, 2, 2)[0]).toMatchObject({ opponent: 'ARS', isHome: false, difficulty: 3 });
    });

    it('keeps both legs of a double gameweek', () => {
        // A `.find()` here would silently drop the second.
        expect(fixturesFor(index, 1, 4)).toHaveLength(2);
        expect(fixturesFor(index, 1, 4).map((f) => f.opponent)).toEqual(['MCI', 'LIV']);
    });

    it('returns an empty array for a blank gameweek', () => {
        expect(fixturesFor(index, 2, 3)).toEqual([]);
        expect(fixturesFor(index, 99, 3)).toEqual([]);
    });

    it('drops a fixture with no gameweek yet', () => {
        expect([...index.get(2).keys()]).not.toContain(null);
    });
});

describe('fixture summaries', () => {
    const easy = { difficulty: 2 };
    const even = { difficulty: 3 };
    const hard = { difficulty: 5 };

    it('counts fixtures, so a double is worth two and a blank none', () => {
        expect(summariseRun([[easy], [], [even, hard]])).toEqual({ good: 2, total: 3 });
    });

    it('counts a player once per gameweek, however many fixtures they have', () => {
        expect(summariseColumn([[easy, hard], [hard], [], [even]])).toBe(2);
    });
});

describe('planEvents', () => {
    const bootstrap = { events: Array.from({ length: 38 }, (_, i) => ({ id: i + 1 })) };

    it('gives three gameweeks from the target', () => {
        expect(planEvents(bootstrap, 2)).toEqual([2, 3, 4]);
    });

    it('stops at the end of the season rather than inventing a GW39', () => {
        expect(planEvents(bootstrap, 37)).toEqual([37, 38]);
        expect(planEvents(bootstrap, 38)).toEqual([38]);
    });
});

describe('untilDeadline', () => {
    const now = Date.parse('2026-08-27T12:00:00Z');

    it('breaks the wait into whole units', () => {
        expect(untilDeadline('2026-08-28T17:30:00Z', now)).toEqual({
            days: 1, hours: 5, minutes: 30, total: 1770,
        });
    });

    it('returns null once the deadline has passed', () => {
        expect(untilDeadline('2026-08-21T17:30:00Z', now)).toBeNull();
        expect(untilDeadline(null, now)).toBeNull();
    });
});
