import { buildSquad } from './myTeam';
import { buildFixtureIndex, clubMap } from './transferPlan';
import {
    availabilityOf,
    bandFor,
    minutesShare,
    rateFixtures,
    rateUnderlying,
    scoreSquad,
} from './teamScore';

/**
 * The model is a weighted blend, so testing the exact number it produces would
 * only test the weights — and the weights are the part most likely to be tuned
 * later. What is tested here is the behaviour that must survive tuning: the
 * availability gate, the direction each component pulls, blanks and doubles,
 * and the captain counting twice.
 */

const TYPES = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 3, 4];

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
    element_type: TYPES[i],
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
    elements: TYPES.map((_, i) => element(i, overrides[i + 1] || {})),
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
        expect(rate({ bootstrap: injured }).score).toBeLessThan(rate().score);
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
        expect(rate({ captain: 11 }).score).toBeGreaterThan(rate({ captain: 9 }).score);
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
        // Captaining the weakest forward when the strongest is in the side.
        expect(rate({ captain: 9 }).betterCaptain).not.toBeNull();
        // Captaining the best player in the squad leaves nothing to say.
        const best = rate({ captain: 11 });
        expect(best.betterCaptain === null || best.betterCaptain.id === 11).toBe(true);
    });

    it('docks the squad for its weak links rather than averaging them away', () => {
        // A flat mean of eleven percentiles regresses to the middle, which is
        // why nothing ever reached the top or bottom band. The score must sit
        // below the plain mean of the eleven whenever the worst three are
        // below it.
        const result = rate();
        expect(result.floor).toBeLessThan(result.xi);
        expect(result.score).toBeLessThan(result.xi);
    });

    it('lets one ruined starter move the score more than a flat mean would', () => {
        const base = rate();
        const injured = bootstrapWith({ 11: { status: 'i', chance_of_playing_next_round: 0 } });
        const hurt = rate({ bootstrap: injured });
        // One of eleven at zero is a 1/11 ≈ 9-point hit on a flat mean. The
        // floor must make it cost more than that.
        expect(base.score - hurt.score).toBeGreaterThan((base.xi - hurt.xi) * 1.1);
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
        expect(fixturesOnly.score).not.toBeCloseTo(only.score, 1);
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
        expect(bandFor(64).word).toBe('STRONG');
        expect(bandFor(58).word).toBe('SOLID');
        expect(bandFor(50).word).toBe('THIN');
        expect(bandFor(10).word).toBe('WEAK');
    });

    it('puts every band within reach of a real squad', () => {
        /*
         * The cutoffs this replaced were 80/66/52/38, and on 27 real squads
         * rated for one gameweek the field ran 40 to 69 — so ELITE and WEAK
         * could not happen and the word beside the number said nothing. These
         * are measured against that distribution; the guard is that the whole
         * observed range is still spanned by more than one band.
         */
        const observed = [40, 49.6, 52.1, 57.6, 61, 62, 63.6, 66, 68.9];
        const words = new Set(observed.map((v) => bandFor(v).word));
        expect(words.size).toBeGreaterThanOrEqual(4);
        expect(bandFor(68.9).word).toBe('ELITE');
        expect(bandFor(40).word).toBe('WEAK');
    });

    it('spends no colour on an unremarkable squad', () => {
        // Rule 5 — colour is earned, and SOLID is where most squads land.
        expect(bandFor(58).tone).toBe('neutral');
    });

    it('always returns a band, even for nonsense', () => {
        expect(bandFor(null).word).toBe('WEAK');
    });
});
