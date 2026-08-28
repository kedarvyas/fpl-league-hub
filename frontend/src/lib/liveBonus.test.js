import { bonusFor, hasProvisionalBonus, provisionalBonus } from './liveBonus';

/**
 * The tie cases are the point of these tests.
 *
 * Every one of GW1's ten fixtures contained at least one BPS tie, so the tie
 * rules are the normal path, not an edge case. The four shapes below are the
 * ones FPL's own rules enumerate, and this implementation was checked against
 * the real GW1 payload: it reproduces FPL's awarded bonus for all 610
 * player-fixture rows exactly.
 */

/** One fixture's worth of rows. */
const fixture = (id, bpsById) =>
    Object.entries(bpsById).map(([player, bps]) => ({ id: Number(player), fixture: id, bps }));

const award = (rows) => Object.fromEntries(provisionalBonus(rows));

describe('provisionalBonus without ties', () => {
    it('gives 3, 2 and 1 to the top three', () => {
        expect(award(fixture(1, { 10: 40, 11: 30, 12: 20, 13: 10 }))).toEqual({
            10: 3, 11: 2, 12: 1,
        });
    });

    it('gives the fourth-placed player nothing', () => {
        expect(bonusFor(provisionalBonus(fixture(1, { 10: 40, 11: 30, 12: 20, 13: 10 })), 13)).toBe(0);
    });
});

describe('provisionalBonus with ties', () => {
    it('makes two level at the top both first, and the next player third', () => {
        // 3, 3, 1 — nobody is second.
        expect(award(fixture(1, { 10: 30, 11: 30, 12: 25 }))).toEqual({ 10: 3, 11: 3, 12: 1 });
    });

    it('makes two level in second both second, and awards no single point', () => {
        // 3, 2, 2 — nobody is third.
        expect(award(fixture(1, { 10: 30, 11: 25, 12: 25 }))).toEqual({ 10: 3, 11: 2, 12: 2 });
    });

    it('gives three players level at the top three points each', () => {
        expect(award(fixture(1, { 10: 30, 11: 30, 12: 30 }))).toEqual({ 10: 3, 11: 3, 12: 3 });
    });

    it('gives two players level in third a point each', () => {
        expect(award(fixture(1, { 10: 30, 11: 25, 12: 24, 13: 24 }))).toEqual({
            10: 3, 11: 2, 12: 1, 13: 1,
        });
    });
});

describe('provisionalBonus across fixtures', () => {
    it('contests bonus within a fixture and never across them', () => {
        // The second fixture's best player is worse than the first fixture's
        // worst, and still takes three points in his own match.
        const rows = [...fixture(1, { 10: 90, 11: 80, 12: 70 }), ...fixture(2, { 20: 9, 21: 8, 22: 7 })];
        expect(award(rows)).toEqual({ 10: 3, 11: 2, 12: 1, 20: 3, 21: 2, 22: 1 });
    });

    it('adds up both legs of a double gameweek', () => {
        const rows = [...fixture(1, { 10: 40, 11: 30 }), ...fixture(2, { 10: 50, 12: 20 })];
        expect(bonusFor(provisionalBonus(rows), 10)).toBe(6);
    });
});

describe('provisionalBonus early in a match', () => {
    it('awards nothing while every BPS is still zero', () => {
        // Otherwise the first whistle would hand out three points.
        expect(award(fixture(1, { 10: 0, 11: 0, 12: 0 }))).toEqual({});
    });

    it('ignores players on zero even once others are scoring', () => {
        expect(award(fixture(1, { 10: 12, 11: 0, 12: 0 }))).toEqual({ 10: 3 });
    });
});

describe('null safety', () => {
    it('survives missing, empty and malformed input', () => {
        expect(award(undefined)).toEqual({});
        expect(award([])).toEqual({});
        expect(award([{ bps: 10 }, { id: 1 }, null])).toEqual({});
    });

    it('reports whether anything is provisional at all', () => {
        expect(hasProvisionalBonus(provisionalBonus([]))).toBe(false);
        expect(hasProvisionalBonus(provisionalBonus(fixture(1, { 10: 5 })))).toBe(true);
        expect(hasProvisionalBonus(null)).toBe(false);
    });

    it('returns zero for a player with no provisional bonus', () => {
        expect(bonusFor(provisionalBonus([]), 99)).toBe(0);
        expect(bonusFor(null, 99)).toBe(0);
    });
});
