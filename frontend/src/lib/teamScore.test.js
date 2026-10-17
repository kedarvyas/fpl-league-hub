import { buildSquad } from './myTeam';
import { applyPlan, buildFixtureIndex, buildPlanBase, clubMap, emptyPlan } from './transferPlan';
import {
    availabilityOf,
    bandFor,
    compareScores,
    CALIBRATION,
    rescale,
    shownDelta,
    minutesShare,
    rateFixtures,
    rateUnderlying,
    scoreSquad,
    squadFromPlan,
} from './teamScore';

/**
 * The model is a weighted blend, so testing the exact number it produces would
 * only test the weights — and the weights are the part most likely to be tuned
 * later. What is tested here is the behaviour that must survive tuning: the
 * availability gate, the direction each component pulls, blanks and doubles,
 * and the captain counting twice.
 */

const TYPES = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 3, 4];

/**
 * Players nobody owns, so a planned transfer has somewhere to transfer *from*.
 * Without them `{ out, in }` resolves to an element that is not in bootstrap,
 * which `applyPlan` treats as an open slot — so a test meaning to swap a weak
 * starter for a strong one was really testing an empty shirt.
 */
const MARKET = [4, 3, 2, 1, 4];
const ALL_TYPES = [...TYPES, ...MARKET];

/** Club 1 plays a kind fixture in GW7; club 2 is blank; club 3 has a double. */
const FIXTURES = [
    { event: 7, team_h: 1, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 7, team_h: 3, team_a: 5, team_h_difficulty: 3, team_a_difficulty: 3 },
    { event: 7, team_h: 6, team_a: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
    { event: 8, team_h: 1, team_a: 5, team_h_difficulty: 2, team_a_difficulty: 4 },
];

const CLUBS = [1, 2, 3, 4, 5, 6].map((id) => ({ id, short_name: `C${id}` }));

/**
 * Fifteen players on club 1. Stats climb with the index inside each position,
 * so the last player of a position is the best of it and percentiles have
 * something to separate.
 */
const element = (i, overrides = {}) => ({
    id: i + 1,
    code: i + 1,
    web_name: `P${i + 1}`,
    element_type: ALL_TYPES[i],
    team: 1,
    now_cost: 50,
    event_points: 2,
    minutes: 400 + i * 20,
    form: (1 + i * 0.3).toFixed(1),
    points_per_game: (2 + i * 0.2).toFixed(1),
    ep_next: (2 + i * 0.3).toFixed(1),
    expected_goal_involvements_per_90: 0.1 + i * 0.05,
    expected_goals_conceded_per_90: 2 - i * 0.05,
    saves_per_90: 1 + i * 0.2,
    defensive_contribution: 40,
    defensive_contribution_per_90: 6,
    status: 'a',
    chance_of_playing_next_round: null,
    news: '',
    ...overrides,
});

const bootstrapWith = (overrides = {}) => ({
    teams: CLUBS,
    elements: ALL_TYPES.map((_, i) => element(i, overrides[i + 1] || {})),
});

const picksWith = (captain = 9) => ({
    active_chip: null,
    entry_history: { event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0, value: 1000, bank: 0 },
    picks: TYPES.map((t, i) => ({
        element: i + 1,
        position: i + 1,
        element_type: t,
        multiplier: i + 1 === captain ? 2 : i < 11 ? 1 : 0,
        is_captain: i + 1 === captain,
        is_vice_captain: i + 1 === (captain === 10 ? 9 : 10),
    })),
});

const index = buildFixtureIndex(FIXTURES, clubMap({ teams: CLUBS }));

const rate = ({ bootstrap = bootstrapWith(), captain = 9, events = [7], horizon = 'gw' } = {}) =>
    scoreSquad({
        squad: buildSquad(picksWith(captain), bootstrap),
        bootstrap,
        index,
        events,
        gamesPlayed: 6,
        horizon,
    });

describe('availabilityOf', () => {
    it('trusts the stated chance over the status letter', () => {
        // A doubtful player with a number attached is that number, not a coin
        // flip and not a zero.
        expect(availabilityOf({ status: 'd', chance_of_playing_next_round: 75 })).toBe(0.75);
    });

    it('reads a silent available player as fully available', () => {
        expect(availabilityOf({ status: 'a', chance_of_playing_next_round: null })).toBe(1);
    });

    it('reads a silent unavailable player as a zero', () => {
        // `null` is "nothing has been said", which is good news for an `a`
        // player and bad news for an injured one.
        expect(availabilityOf({ status: 'i', chance_of_playing_next_round: null })).toBe(0);
        expect(availabilityOf({ status: 'u', chance_of_playing_next_round: null })).toBe(0);
    });

    it('treats a flagged zero chance as out', () => {
        expect(availabilityOf({ status: 'd', chance_of_playing_next_round: 0 })).toBe(0);
    });
});

describe('rateFixtures', () => {
    it('scores a blank gameweek at zero rather than skipping it', () => {
        // The bug this guards: averaging only the gameweeks that have a
        // fixture rates a blank as an average week.
        expect(rateFixtures(index, 2, [7]).score).toBe(0);
        expect(rateFixtures(index, 2, [7]).blanks).toBe(1);
    });

    it('rates a double above a single of the same difficulty', () => {
        const double = rateFixtures(index, 3, [7]);
        const single = rateFixtures(index, 5, [7]);
        expect(double.doubles).toBe(1);
        expect(double.score).toBeGreaterThan(single.score);
    });

    it('rates a kind fixture above a hard one', () => {
        // Club 1 is at home at FDR 2; club 4 is away at FDR 4.
        expect(rateFixtures(index, 1, [7]).score).toBeGreaterThan(
            rateFixtures(index, 4, [7]).score,
        );
    });

    it('averages across the window and counts a blank within it', () => {
        // Club 5 plays in both 7 and 8; club 4 plays only in 7.
        const run = rateFixtures(index, 4, [7, 8]);
        expect(run.blanks).toBe(1);
        expect(run.score).toBeLessThan(rateFixtures(index, 4, [7]).score);
    });

    it('is zero with no gameweeks to rate', () => {
        expect(rateFixtures(index, 1, []).score).toBe(0);
    });
});

describe('minutesShare', () => {
    it('is the share of the side’s minutes played', () => {
        expect(minutesShare({ minutes: 270 }, 6)).toBe(50);
    });

    it('caps an ever-present rather than exceeding 100', () => {
        // Doubles push a player past 90 minutes a gameweek.
        expect(minutesShare({ minutes: 700 }, 6)).toBe(100);
    });

    it('is zero before a gameweek has been played', () => {
        expect(minutesShare({ minutes: 0 }, 0)).toBe(0);
    });
});

describe('rateUnderlying', () => {
    const elements = bootstrapWith().elements;

    it('rates a keeper on what he stops, not what he creates', () => {
        const keeper = elements.find((e) => e.element_type === 1);
        // Give him the best attacking numbers in the game. It must not move
        // him, because no keeper is picked for his expected assists.
        const creative = { ...keeper, expected_goal_involvements_per_90: 9 };
        expect(rateUnderlying(creative, elements)).toBe(rateUnderlying(keeper, elements));
    });

    it('rates a forward on what he creates', () => {
        const forward = elements.find((e) => e.element_type === 4);
        const sharper = { ...forward, expected_goal_involvements_per_90: 9 };
        expect(rateUnderlying(sharper, elements)).toBeGreaterThan(
            rateUnderlying(forward, elements),
        );
    });

    it('rewards a defender for conceding less', () => {
        const defender = elements.find((e) => e.element_type === 2);
        const solid = { ...defender, expected_goals_conceded_per_90: 0.1 };
        expect(rateUnderlying(solid, elements)).toBeGreaterThan(
            rateUnderlying(defender, elements),
        );
    });
});

describe('scoreSquad', () => {
    it('returns null rather than a zero when there is nothing to rate', () => {
        // A zero would render as a real, terrible rating.
        expect(scoreSquad({ squad: null, bootstrap: bootstrapWith(), index, events: [7] })).toBeNull();
        expect(rate({ events: [] })).toBeNull();
    });

    it('declines to rate at all when the fixture list is missing', () => {
        // Not a missing rating but a wrong one: every club would read as a
        // blank and a quarter of the score would be zero for eleven players
        // who are all playing.
        const bootstrap = bootstrapWith();
        expect(
            scoreSquad({
                squad: buildSquad(picksWith(9), bootstrap),
                bootstrap,
                index: null,
                events: [7],
                gamesPlayed: 6,
            }),
        ).toBeNull();
    });

    it('names the component holding each player back', () => {
        const result = rate();
        const keys = result.components.map((c) => c.key);
        result.players.forEach((p) => {
            expect(keys).toContain(p.limiting.key);
            // It is the lowest of the components actually in the blend.
            keys.forEach((k) => expect(p.components[k]).toBeGreaterThanOrEqual(p.limiting.value));
        });
    });

    it('cannot blame a component that is not in the blend', () => {
        // Season quality carries no weight over one gameweek, so it cannot be
        // the reason for a one-gameweek rating.
        rate().players.forEach((p) => expect(p.limiting.key).not.toBe('season'));
    });

    it('rates the eleven and the bench separately', () => {
        const result = rate();
        expect(result.players).toHaveLength(11);
        expect(result.benchPlayers).toHaveLength(4);
    });

    it('keeps the score and every component on 0–100', () => {
        const result = rate();
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        result.components.forEach((c) => {
            expect(c.value).toBeGreaterThanOrEqual(0);
            expect(c.value).toBeLessThanOrEqual(100);
        });
    });

    it('drops the score when a starter is ruled out', () => {
        const injured = bootstrapWith({ 9: { status: 'i', chance_of_playing_next_round: 0 } });
        expect(rate({ bootstrap: injured }).raw).toBeLessThan(rate().raw);
    });

    it('zeroes a ruled-out player but keeps his rating visible', () => {
        const injured = bootstrapWith({ 9: { status: 'i', chance_of_playing_next_round: 0 } });
        const player = rate({ bootstrap: injured }).players.find((p) => p.id === 9);
        expect(player.score).toBe(0);
        // The interface says "a 70 player who is not playing", not "a 0".
        expect(player.raw).toBeGreaterThan(0);
        expect(injured.elements[8].status).toBe('i');
    });

    it('halves a doubtful player rather than dropping or keeping him whole', () => {
        const doubt = bootstrapWith({ 9: { status: 'd', chance_of_playing_next_round: 50 } });
        const player = doubt && rate({ bootstrap: doubt }).players.find((p) => p.id === 9);
        expect(player.score).toBeCloseTo(player.raw / 2, 5);
    });

    it('lists the unavailable starters', () => {
        const injured = bootstrapWith({ 9: { status: 'i', chance_of_playing_next_round: 0 } });
        expect(rate({ bootstrap: injured }).unavailable.map((p) => p.id)).toEqual([9]);
    });

    it('weights the captain twice', () => {
        // P11 is the strongest forward and P9 the weakest. Moving the armband
        // between them must move the squad rating.
        expect(rate({ captain: 11 }).raw).toBeGreaterThan(rate({ captain: 9 }).raw);
    });

    it('reads the armband off the pick, not the multiplier', () => {
        // Under Bench Boost every multiplier is 1, which must not flatten the
        // captain's weighting or turn the bench into starters.
        const bootstrap = bootstrapWith();
        const picks = picksWith(11);
        picks.active_chip = 'bboost';
        picks.picks = picks.picks.map((p) => ({ ...p, multiplier: p.is_captain ? 2 : 1 }));
        const boosted = scoreSquad({
            squad: buildSquad(picks, bootstrap),
            bootstrap,
            index,
            events: [7],
            gamesPlayed: 6,
        });
        expect(boosted.players).toHaveLength(11);
        expect(boosted.captain.id).toBe(11);
    });

    it('names a better captain only when the gap is worth saying', () => {
        // Captaining the weakest forward when better options are in the side.
        expect(rate({ captain: 9 }).betterCaptain).not.toBeNull();
        // Captaining whoever the model rates highest leaves nothing to say.
        // Taken from the ranking rather than hardcoded, because who that is
        // depends on the peer set each percentile is drawn from.
        const top = rate({ captain: 9 }).strongest[0].id;
        expect(rate({ captain: top }).betterCaptain).toBeNull();
    });

    it('docks the squad for its weak links rather than averaging them away', () => {
        // A flat mean of eleven percentiles regresses to the middle, which is
        // why nothing ever reached the top or bottom band. The score must sit
        // below the plain mean of the eleven whenever the worst three are
        // below it.
        const result = rate();
        expect(result.floor).toBeLessThan(result.xi);
        expect(result.raw).toBeLessThan(result.xi);
    });

    it('lets one ruined starter move the score more than a flat mean would', () => {
        const base = rate();
        const injured = bootstrapWith({ 11: { status: 'i', chance_of_playing_next_round: 0 } });
        const hurt = rate({ bootstrap: injured });
        // One of eleven at zero is a 1/11 ≈ 9-point hit on a flat mean. The
        // floor must make it cost more than that.
        expect(base.raw - hurt.raw).toBeGreaterThan((base.xi - hurt.xi) * 1.1);
    });

    it('surfaces the three weakest starters, worst first', () => {
        const result = rate();
        expect(result.weakest).toHaveLength(3);
        expect(result.weakest[0].score).toBeLessThanOrEqual(result.weakest[1].score);
        expect(result.weakest[0].score).toBeLessThanOrEqual(result.strongest[0].score);
    });

    it('flags the starters with a blank in the window', () => {
        const bootstrap = bootstrapWith({ 5: { team: 2 } });
        expect(rate({ bootstrap }).blanks.map((p) => p.id)).toEqual([5]);
    });

    it('takes a weights override, so the model can be tuned against real squads', () => {
        // Rating on fixtures alone must differ from the standard blend, and
        // must match what the fixture component says on its own.
        const only = rate({ bootstrap: bootstrapWith() });
        const fixturesOnly = scoreSquad({
            squad: buildSquad(picksWith(9), bootstrapWith()),
            bootstrap: bootstrapWith(),
            index,
            events: [7],
            gamesPlayed: 6,
            weights: { fixture: 1 },
        });
        expect(fixturesOnly.raw).not.toBeCloseTo(only.raw, 1);
        expect(fixturesOnly.components.map((c) => c.key)).toEqual(['fixture']);
    });

    it('uses the run weights over a longer window', () => {
        // Season quality is only in the blend for a run, so it only appears in
        // the breakdown there.
        const keys = (horizon, events) => rate({ horizon, events }).components.map((c) => c.key);
        expect(keys('gw', [7])).not.toContain('season');
        expect(keys('run', [7, 8])).toContain('season');
    });
});

describe('bandFor', () => {
    it('bands the scale from elite down to weak', () => {
        expect(bandFor(92).word).toBe('ELITE');
        expect(bandFor(70).word).toBe('STRONG');
        expect(bandFor(50).word).toBe('SOLID');
        expect(bandFor(20).word).toBe('THIN');
        expect(bandFor(10).word).toBe('WEAK');
    });

    it('puts every band within reach of a real squad', () => {
        /*
         * Raw ratings measured on 132 real squads rated for GW7, from the
         * worst (a side with several starters out) to the best. Two earlier
         * sets of cutoffs failed this in opposite directions: one left ELITE
         * and WEAK unreachable, the next let a quarter of squads into ELITE.
         */
        const observed = [38.9, 52, 57.8, 59.6, 62.5, 66.5, 69.1, 72.3, 73.8];
        const words = new Set(observed.map((raw) => bandFor(Math.round(rescale(raw))).word));
        expect(words.size).toBeGreaterThanOrEqual(4);
        // The user's own squad, the best in their league, reads ELITE.
        expect(bandFor(Math.round(rescale(72.3))).word).toBe('ELITE');
        expect(bandFor(Math.round(rescale(38.9))).word).toBe('WEAK');
        // And the typical squad does not.
        expect(bandFor(Math.round(rescale(62.5))).word).toBe('SOLID');
    });

    it('spends no colour on an unremarkable squad', () => {
        // Rule 5 — colour is earned, and SOLID is where most squads land.
        expect(bandFor(50).tone).toBe('neutral');
    });

    it('always returns a band, even for nonsense', () => {
        expect(bandFor(null).word).toBe('WEAK');
    });
});


/* ------------------------------------------------------------------ */
/* The transfer planner                                                */
/* ------------------------------------------------------------------ */

/**
 * These go through the planner's own `buildPlanBase` and `applyPlan` rather
 * than a hand-built approximation of their output. The adapter exists to
 * bridge two real shapes, so a test against an imagined one would pass while
 * the bridge was broken.
 */
const planOf = (bootstrap, moves = [], captain = 9) => {
    const base = buildPlanBase({
        picks: picksWith(captain),
        bootstrap,
        transfers: [],
        chips: [],
    });
    return applyPlan(base, { ...emptyPlan('1', 7), moves }, bootstrap);
};

const scoreOf = (squad, bootstrap) =>
    scoreSquad({ squad, bootstrap, index, events: [7], gamesPlayed: 6 });

describe('squadFromPlan', () => {
    it('is null-safe on a planner that has not loaded', () => {
        expect(squadFromPlan(null)).toBeNull();
        expect(squadFromPlan({})).toBeNull();
    });

    it('splits the eleven and the bench the way the squad tab does', () => {
        const squad = squadFromPlan(planOf(bootstrapWith()));
        expect(squad.starters).toHaveLength(11);
        expect(squad.bench).toHaveLength(4);
        expect(squad.open).toBe(0);
    });

    it('rates an untouched plan exactly as the squad tab rates the same squad', () => {
        /*
         * The whole reason the adapter exists. `buildSquad` and `applyPlan`
         * describe the same fifteen players in two shapes, and if the bridge
         * between them drifts, the planner and the squad tab quietly disagree
         * about what the same squad is worth — which is the kind of thing a
         * reader notices and never trusts either number again.
         */
        const bootstrap = bootstrapWith();
        const fromPicks = scoreOf(buildSquad(picksWith(9), bootstrap), bootstrap);
        const fromPlan = scoreOf(squadFromPlan(planOf(bootstrap)), bootstrap);
        // On the raw rating: these test squads sit below the range real
        // squads occupy, so both displayed scores clamp to 0 and would agree
        // whatever the adapter did.
        expect(fromPlan.raw).toBeCloseTo(fromPicks.raw, 10);
        expect(fromPlan.score).toBeCloseTo(fromPicks.score, 10);
        expect(fromPlan.captain.id).toBe(fromPicks.captain.id);
    });

    it('keeps the armband on the shirt when the captain is sold', () => {
        // The planner keys captaincy by baseline slot, so whoever replaces the
        // captain inherits it. Reading `wasCaptain` off the player would drop
        // the armband the moment he left the squad.
        const bootstrap = bootstrapWith();
        const squad = squadFromPlan(planOf(bootstrap, [{ out: 9, in: 11 }], 9));
        const marked = squad.starters.filter((p) => p.mark === 'C');
        expect(marked).toHaveLength(1);
        expect(marked[0].id).toBe(11);
    });

    it('drops an open slot and counts it rather than scoring a hole as zero', () => {
        // Marking a player out with nobody in yet is a decision in progress.
        const bootstrap = bootstrapWith();
        const squad = squadFromPlan(planOf(bootstrap, [{ out: 5, in: null }]));
        expect(squad.starters).toHaveLength(10);
        expect(squad.open).toBe(1);
        // And it still rates, on the ten who are there.
        expect(scoreOf(squad, bootstrap).raw).toBeGreaterThan(0);
    });

    it('lifts the score when a weak starter is replaced by a strong one', () => {
        // P9 is the weakest forward in the eleven; P20 is the best in the
        // game, and unowned, so this is a real swap rather than an open slot.
        const bootstrap = bootstrapWith();
        const before = scoreOf(squadFromPlan(planOf(bootstrap)), bootstrap);
        const plan = squadFromPlan(planOf(bootstrap, [{ out: 9, in: 20 }]));

        expect(plan.starters).toHaveLength(11);
        expect(plan.open).toBe(0);
        expect(plan.starters.some((p) => p.id === 20)).toBe(true);
        expect(scoreOf(plan, bootstrap).raw).toBeGreaterThan(before.raw);
    });
});

describe('compareScores', () => {
    const bootstrap = bootstrapWith();
    const before = scoreOf(squadFromPlan(planOf(bootstrap)), bootstrap);

    it('is null-safe before either side has been rated', () => {
        expect(compareScores(null, before)).toBeNull();
        expect(compareScores(before, null)).toBeNull();
    });

    it('reports no movement for a plan with no moves', () => {
        const same = compareScores(before, before);
        expect(same.delta).toBe(0);
        expect(same.bandChanged).toBe(false);
        same.components.forEach((c) => expect(c.delta).toBe(0));
    });

    it('carries the arithmetic the headline is built from', () => {
        /*
         * The regression this guards: bringing in a 25%-doubt striker lifted
         * form and underlying while the score dropped, because components are
         * percentiles before the availability discount and the score is after
         * it. Rising rows over a falling number reads as a bug, so the figures
         * that actually moved have to be on screen too.
         */
        const doubtful = bootstrapWith({ 20: { chance_of_playing_next_round: 25, status: 'd' } });
        const after = scoreOf(squadFromPlan(planOf(doubtful, [{ out: 9, in: 20 }])), doubtful);
        const diff = compareScores(before, after);

        expect(diff.aggregates.map((a) => a.key)).toEqual(['xi', 'floor', 'bench']);
        diff.aggregates.forEach((a) => expect(a.delta).toBeCloseTo(a.after - a.before, 10));
        // The weak link is what moved, and it moved down.
        expect(diff.aggregates.find((a) => a.key === 'floor').delta).toBeLessThan(0);
    });

    it('carries the before and after of every component', () => {
        // A move that leaves the score flat by trading fixtures for form has
        // still told the manager something; a bare 0 has not.
        const injured = bootstrapWith({ 9: { status: 'i', chance_of_playing_next_round: 0 } });
        const after = scoreOf(squadFromPlan(planOf(injured)), injured);
        const diff = compareScores(before, after);

        expect(diff.before).toBe(before.score);
        expect(diff.after).toBe(after.score);
        expect(diff.delta).toBeCloseTo(after.score - before.score, 10);
        expect(diff.components.map((c) => c.key)).toEqual(before.components.map((c) => c.key));
        diff.components.forEach((c) => {
            expect(c.delta).toBeCloseTo(c.after - c.before, 10);
        });
    });
});


describe('shownDelta', () => {
    it('is the difference between the numbers on screen, not underneath them', () => {
        // The bug: 72.4 → 72.6 read NO CHANGE between a displayed 72 and 73.
        expect(shownDelta(72.4, 72.6)).toBe(1);
        expect(shownDelta(72.6, 72.4)).toBe(-1);
    });

    it('calls a move that does not change the displayed number no change', () => {
        // 72.1 → 72.4 is a real 0.3, but both read 72.
        expect(shownDelta(72.1, 72.4)).toBe(0);
    });

    it('is null-safe', () => {
        expect(shownDelta(null, undefined)).toBe(0);
    });
});

describe('agreement with the displayed number', () => {
    it('bands the score as it is displayed', () => {
        // 84.6 is shown as 85, which is ELITE; the band must not say STRONG.
        expect(bandFor(Math.round(84.6)).word).toBe('ELITE');
        const result = rate();
        expect(result.band.word).toBe(bandFor(Math.round(result.score)).word);
    });

    it('reports the movement the reader sees alongside the raw one', () => {
        const bootstrap = bootstrapWith();
        const before = scoreOf(squadFromPlan(planOf(bootstrap)), bootstrap);
        const after = scoreOf(squadFromPlan(planOf(bootstrap, [{ out: 9, in: 20 }])), bootstrap);
        const diff = compareScores(before, after);
        expect(diff.shown).toBe(Math.round(after.score) - Math.round(before.score));
    });
});


describe('rescale', () => {
    it('puts a typical squad at 50', () => {
        expect(rescale(CALIBRATION.gw.median, 'gw')).toBeCloseTo(50, 10);
        expect(rescale(CALIBRATION.run.median, 'run')).toBeCloseTo(50, 10);
    });

    it('keeps the order of the raw ratings', () => {
        const raws = [40, 55, 60, 62, 65, 70, 74];
        const shown = raws.map((r) => rescale(r));
        shown.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(shown[i]));
    });

    it('stays responsive at the top, where a percentile curve went flat', () => {
        /*
         * The reason this is linear. A share-of-squads-beaten curve fitted the
         * sample well but, at an elite squad's 99, moved 0.4 for a whole raw
         * point — so nearly every transfer an elite manager planned read NO
         * CHANGE. One raw point must move the display by the same amount at
         * the top as in the middle.
         */
        const middle = rescale(61) - rescale(60);
        const top = rescale(71) - rescale(70);
        expect(top).toBeCloseTo(middle, 10);
        expect(top).toBeGreaterThan(3);
    });

    it('clamps both ends to the 0–100 a reader expects', () => {
        expect(rescale(0)).toBe(0);
        expect(rescale(100)).toBe(100);
    });

    it('calibrates each horizon on its own', () => {
        // The five-week blend sits a little higher and wider than one week.
        expect(rescale(62.08, 'run')).toBeCloseTo(50, 10);
        expect(rescale(62.08, 'gw')).toBeGreaterThan(50);
    });

    it('rates the user\'s squad around 90, not 72', () => {
        // The complaint that started this: an elite squad read 73.
        expect(Math.round(rescale(72.3, 'gw'))).toBeGreaterThanOrEqual(88);
        expect(Math.round(rescale(72.3, 'gw'))).toBeLessThanOrEqual(94);
    });
});
