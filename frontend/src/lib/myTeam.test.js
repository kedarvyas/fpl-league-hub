import { buildSquad, formatMoney } from './myTeam';
import { provisionalBonus } from './liveBonus';

/**
 * `buildSquad` joins raw picks against bootstrap. The part worth testing is
 * the arithmetic on top of that join — the multiplier, and bonus FPL has not
 * awarded yet, which multiplies with it.
 */

const TYPES = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 2, 3];

const bootstrap = {
    teams: [{ id: 1, short_name: 'ARS' }],
    elements: TYPES.map((t, i) => ({
        id: i + 1,
        code: i + 1,
        web_name: `P${i + 1}`,
        element_type: t,
        team: 1,
        now_cost: 50,
        // Everyone scored 5 in the gameweek so far.
        event_points: 5,
    })),
};

const picks = ({ captain = 1, bboost = false } = {}) => ({
    active_chip: bboost ? 'bboost' : null,
    entry_history: { event_transfers: 0, event_transfers_cost: 0, points_on_bench: 0, value: 1000, bank: 0 },
    picks: TYPES.map((t, i) => ({
        element: i + 1,
        position: i + 1,
        element_type: t,
        multiplier: i + 1 === captain ? 2 : i < 11 || bboost ? 1 : 0,
        is_captain: i + 1 === captain,
        is_vice_captain: i === 1,
    })),
});

describe('buildSquad without bonus', () => {
    it('splits the eleven on the slot, not the multiplier', () => {
        // Under Bench Boost every pick carries a multiplier, so a multiplier
        // test would build a fifteen-man eleven.
        const squad = buildSquad(picks({ bboost: true }), bootstrap);
        expect(squad.starters).toHaveLength(11);
        expect(squad.bench).toHaveLength(4);
    });

    it('applies the captain multiplier exactly once', () => {
        // Ten starters on 5, plus the captain on 10.
        expect(buildSquad(picks(), bootstrap).xiPoints).toBe(60);
    });

    it('reports nothing provisional', () => {
        expect(buildSquad(picks(), bootstrap).xiProvisional).toBe(0);
    });
});

describe('buildSquad with unawarded bonus', () => {
    const bonus = provisionalBonus([
        { id: 1, fixture: 1, bps: 40 },
        { id: 2, fixture: 1, bps: 30 },
        { id: 12, fixture: 1, bps: 20 },
    ]);

    it('adds a player’s pending bonus to their score', () => {
        const squad = buildSquad(picks({ captain: 5 }), bootstrap);
        const withBonus = buildSquad(picks({ captain: 5 }), bootstrap, bonus);
        expect(squad.starters.find((p) => p.id === 2).points).toBe(5);
        expect(withBonus.starters.find((p) => p.id === 2).points).toBe(7);
    });

    it('doubles a captain’s pending bonus', () => {
        // Player 1 is captain and top of the BPS: (5 + 3) x 2.
        const squad = buildSquad(picks({ captain: 1 }), bootstrap, bonus);
        expect(squad.starters.find((p) => p.id === 1).points).toBe(16);
    });

    it('keeps the pending part separately, so it can be labelled', () => {
        const squad = buildSquad(picks({ captain: 1 }), bootstrap, bonus);
        expect(squad.starters.find((p) => p.id === 1).provisional).toBe(3);
        // 3 doubled for the captain, plus 2 for the second-placed starter.
        expect(squad.xiProvisional).toBe(8);
    });

    it('leaves a benched player’s bonus out of the eleven’s total', () => {
        // Player 12 is on the bench with multiplier 0 in a normal week.
        const squad = buildSquad(picks({ captain: 1 }), bootstrap, bonus);
        expect(squad.bench.find((p) => p.id === 12).provisional).toBe(1);
        expect(squad.xiProvisional).toBe(8);
    });

    it('counts a benched player’s bonus under Bench Boost', () => {
        const squad = buildSquad(picks({ captain: 1, bboost: true }), bootstrap, bonus);
        expect(squad.benchPoints).toBe(5 + 1 + 5 + 5 + 5);
    });
});

describe('formatMoney', () => {
    it('puts the sign outside the currency symbol', () => {
        // £-0.5M reads as a typo where −£0.5M reads as an overspend.
        expect(formatMoney(-5)).toBe('−£0.5M');
        expect(formatMoney(1000)).toBe('£100.0M');
    });
});
