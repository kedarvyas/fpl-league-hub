import { buildPointsLedger } from './pointsLedger';

// Shapes mirror event/{gw}/live exactly.
const explain = (stats, fixture = 10) => [{ fixture, stats }];
const entry = (identifier, value, points, points_modification = 0) => ({
    identifier, value, points, points_modification,
});

describe('buildPointsLedger', () => {
    it('itemises a forward brace-and-assist and reconciles', () => {
        // João Pedro, GW1 2026/27: 90 mins, 1 goal, 1 assist, 2 bonus = 11.
        const led = buildPointsLedger(
            explain([
                entry('minutes', 90, 2),
                entry('goals_scored', 1, 4),
                entry('assists', 1, 3),
                entry('bonus', 2, 2),
            ]),
            { total_points: 11, bps: 45, defensive_contribution: 3 },
            { element_type: 4 },
        );
        expect(led.reconciled).toBe(true);
        expect(led.total).toBe(11);
        expect(led.rows.map((r) => r.points).reduce((a, b) => a + b, 0)).toBe(11);
    });

    it('shows a missed defensive-contribution threshold as a zero row', () => {
        const led = buildPointsLedger(
            explain([entry('minutes', 90, 2)]),
            { total_points: 2, defensive_contribution: 3 },
            { element_type: 4 }, // FWD, threshold 12
        );
        const row = led.rows.find((r) => r.label === 'Defensive contribution');
        expect(row).toBeDefined();
        expect(row.points).toBe(0);
        expect(row.sub).toBe('3 of 12 · threshold missed');
        expect(led.reconciled).toBe(true);
    });

    it('does not invent a defensive-contribution row for a goalkeeper', () => {
        const led = buildPointsLedger(
            explain([entry('minutes', 90, 2), entry('clean_sheets', 1, 4)]),
            { total_points: 6, defensive_contribution: 0 },
            { element_type: 1 },
        );
        expect(led.rows.some((r) => r.label === 'Defensive contribution')).toBe(false);
    });

    it('surfaces drift as an Other row rather than absorbing it', () => {
        const led = buildPointsLedger(
            explain([entry('minutes', 90, 2)]),
            { total_points: 5, defensive_contribution: 0 },
            { element_type: 1 },
        );
        expect(led.reconciled).toBe(false);
        const other = led.rows.find((r) => r.label === 'Other');
        expect(other.points).toBe(3);
        expect(led.rows.reduce((a, r) => a + r.points, 0)).toBe(5);
    });

    it('applies negative points_modification', () => {
        const led = buildPointsLedger(
            explain([entry('minutes', 90, 2), entry('goals_conceded', 4, -2)]),
            { total_points: 0, defensive_contribution: 0 },
            { element_type: 2 },
        );
        expect(led.rows.find((r) => r.label === 'Goals conceded').points).toBe(-2);
    });

    it('returns null when there is no explain data', () => {
        expect(buildPointsLedger(null, {}, {})).toBeNull();
        expect(buildPointsLedger([], {}, {})).toBeNull();
    });
});
