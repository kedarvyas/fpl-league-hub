import { buildLedger } from './h2h';
import { provisionalBonus } from './liveBonus';

// Shapes mirror the matchup Edge Function's enriched picks: `position` is the
// player's GKP/DEF/MID/FWD label, `squadPosition` the 1-15 slot.
const pick = (id, squadPosition, points, multiplier = 1) => ({
    id,
    squadPosition,
    name: `P${id}`,
    position: 'MID',
    club: 'XXX',
    points,
    multiplier,
    isStarting: multiplier > 0, // the field the client no longer trusts
});

/** Fifteen picks, ids offset so the two sides share nothing by default. */
const squad = (offset, { bboost = false } = {}) => ({
    active_chip: bboost ? 'bboost' : null,
    entry_history: { event_transfers: 1, event_transfers_cost: 0, points_on_bench: 0, value: 1000 },
    // Bench players score 2 each; starters 5 each.
    picks: Array.from({ length: 15 }, (_, i) =>
        // Under Bench Boost every pick carries a multiplier of at least 1.
        pick(offset + i, i + 1, i < 11 ? 5 : 2, !bboost && i >= 11 ? 0 : 1),
    ),
});

const fixture = (team1, team2) => ({
    matchup: {
        entry_1_entry: 1, entry_1_name: 'Home', entry_1_player_name: 'H', entry_1_points: 55,
        entry_2_entry: 2, entry_2_name: 'Away', entry_2_player_name: 'A', entry_2_points: 55,
    },
    team1,
    team2,
});

describe('buildLedger starters', () => {
    it('takes eleven starters from a normal side', () => {
        const led = buildLedger(fixture(squad(100), squad(200)));
        expect(led.homeOnly).toHaveLength(11);
        expect(led.awayOnly).toHaveLength(11);
        expect(led.totals.homeOnlyPoints).toBe(55);
    });

    it('takes eleven starters under Bench Boost, not fifteen', () => {
        // Every pick has multiplier 1, so `multiplier > 0` would return all 15.
        const led = buildLedger(fixture(squad(100, { bboost: true }), squad(200)));
        expect(led.home.chip).toBe('BENCH BOOST');
        expect(led.homeOnly).toHaveLength(11);
        // The four boosted bench players must not reach the differentials.
        expect(led.totals.homeOnlyPoints).toBe(55);
        expect(led.totals.edge).toBe(0);
    });

    it('does not treat a shared player benched by one side as shared', () => {
        // Same player: slot 3 for home, slot 13 (bench, boosted) for away.
        const home = squad(100);
        const away = squad(200, { bboost: true });
        away.picks[12] = pick(102, 13, 2);
        const led = buildLedger(fixture(home, away));
        expect(led.shared).toHaveLength(0);
        expect(led.homeOnly.some((p) => p.id === 102)).toBe(true);
    });

    it('falls back to pick order for payloads without squadPosition', () => {
        const home = squad(100, { bboost: true });
        home.picks = home.picks.map(({ squadPosition, ...rest }) => rest);
        const led = buildLedger(fixture(home, squad(200)));
        expect(led.homeOnly).toHaveLength(11);
    });
});

/* ------------------------------------------------------------------ */
/* Provisional bonus                                                   */
/* ------------------------------------------------------------------ */

describe('buildLedger with unawarded bonus', () => {
    // Slot 1 is a home starter, slot 12 a home bench player.
    const rows = [
        { id: 100, fixture: 1, bps: 40 },
        { id: 111, fixture: 1, bps: 30 },
        { id: 200, fixture: 1, bps: 20 },
    ];
    const bonus = provisionalBonus(rows);

    it('adds nothing at all when no bonus is pending', () => {
        const plain = buildLedger(fixture(squad(100), squad(200)));
        const withEmpty = buildLedger(fixture(squad(100), squad(200)), provisionalBonus([]));
        expect(withEmpty.totals.homeOnlyPoints).toBe(plain.totals.homeOnlyPoints);
        expect(withEmpty.home.points).toBe(plain.home.points);
    });

    it('adds a starter’s bonus to their score and their side', () => {
        const led = buildLedger(fixture(squad(100), squad(200)), bonus);
        // 100 tops the fixture (3), 111 is second (2) but is home's bench, 200
        // is third (1) and is an away starter.
        expect(led.homeOnly.find((p) => p.id === 100).points).toBe(8);
        expect(led.awayOnly.find((p) => p.id === 200).points).toBe(6);
    });

    it('doubles a captain’s bonus, because the real bonus will double too', () => {
        const home = squad(100);
        home.picks[0].multiplier = 2;
        home.picks[0].points = 10;
        const led = buildLedger(fixture(home, squad(200)), bonus);
        // 5 x 2 already applied by the matchup function, plus 3 bonus x 2.
        expect(led.homeOnly.find((p) => p.id === 100).points).toBe(16);
    });

    it('ignores a benched player’s bonus in a normal week', () => {
        // 111 is home's slot 12 with multiplier 0, so their 2 bonus is worth
        // nothing to the side total.
        const led = buildLedger(fixture(squad(100), squad(200)), bonus);
        expect(led.home.provisional).toBe(3);
    });

    it('counts a benched player’s bonus under Bench Boost', () => {
        // Under the chip every pick carries a multiplier, so the bench scores.
        const led = buildLedger(fixture(squad(100, { bboost: true }), squad(200)), bonus);
        expect(led.home.provisional).toBe(5);
    });

    it('keeps the headline and the columns in agreement', () => {
        // If the scoreline excluded bonus while the rows included it, the
        // ledger would stop reconciling — which is the whole point of it.
        const led = buildLedger(fixture(squad(100), squad(200)), bonus);
        expect(led.home.points - led.away.points).toBe(led.totals.edge);
    });
});

/* ------------------------------------------------------------------ */
/* Live scorelines                                                     */
/* ------------------------------------------------------------------ */

/** A fixture FPL has not scored yet: both sides reported on nothing. */
const unscored = (team1, team2) => {
    const f = fixture(team1, team2);
    f.matchup.entry_1_points = 0;
    f.matchup.entry_2_points = 0;
    return f;
};

describe('buildLedger while FPL has not scored the gameweek', () => {
    it('takes the scoreline from the picks instead of showing 0–0', () => {
        // FPL reports 0 for both sides until a H2H gameweek is over, which put
        // a 0–0 directly above a ledger full of points.
        const led = buildLedger(unscored(squad(100), squad(200)));
        expect(led.home.points).toBe(55);
        expect(led.away.points).toBe(55);
    });

    it('subtracts the hit, as FPL does', () => {
        const home = squad(100);
        home.entry_history = { event_transfers: 2, event_transfers_cost: 8, points_on_bench: 0, value: 1000 };
        expect(buildLedger(unscored(home, squad(200))).home.points).toBe(47);
    });

    it('leaves a benched player out, however their points are reported', () => {
        // `points` arrives already multiplied, so a benched player should be
        // on zero — but the score is filtered on the multiplier so that a
        // payload reporting otherwise cannot inflate it.
        const led = buildLedger(unscored(squad(100), squad(200)));
        expect(led.home.points).toBe(55);
    });

    it('counts the bench under Bench Boost', () => {
        // Eleven starters on 5 plus four bench on 2.
        const led = buildLedger(unscored(squad(100, { bboost: true }), squad(200)));
        expect(led.home.points).toBe(63);
    });

    it('keeps FPL’s own figure once the fixture has been scored', () => {
        // After settlement FPL accounts for automatic substitutions, which a
        // sum of the picks cannot see.
        const led = buildLedger(fixture(squad(100), squad(200)));
        expect(led.home.points).toBe(55);
        expect(led.away.points).toBe(55);
    });

    it('does not treat a one-sided blank as unscored', () => {
        const f = fixture(squad(100), squad(200));
        f.matchup.entry_1_points = 0;
        f.matchup.entry_2_points = 12;
        expect(buildLedger(f).home.points).toBe(0);
    });
});
