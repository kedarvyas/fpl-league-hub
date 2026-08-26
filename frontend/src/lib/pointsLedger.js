import { toNumber, DEFCON_THRESHOLDS } from './playerStats';

/**
 * Breaks a gameweek score into the events that produced it.
 *
 * The handoff assumed this had to be reconstructed by re-implementing the
 * 2026/27 scoring rules. It doesn't: `event/{gw}/live` returns an `explain`
 * array giving each scoring event, its value and its points, straight from the
 * game. Checked across all 610 elements in GW1, `explain` sums to the API's own
 * `total_points` every time. Re-deriving it would only add a way to be wrong.
 *
 * We still reconcile, because a silently wrong ledger is worse than none: if
 * the rows don't sum to the official total the difference is surfaced as a
 * single `Other` row rather than quietly absorbed.
 */

/** Display label and sub-line per FPL scoring identifier. */
const EVENTS = {
    minutes: {
        label: 'Appearance',
        sub: (v) => (v >= 60 ? '60+ minutes' : `${v} minutes`),
        tone: 'neutral',
    },
    goals_scored: {
        label: 'Goal',
        sub: (v, _p, pts) => `${v} × ${v ? Math.round(pts / v) : 0} pts`,
        tone: 'live',
    },
    assists: { label: 'Assist', sub: (v) => `${v} × 3 pts`, tone: 'liveDark' },
    clean_sheets: { label: 'Clean sheet', sub: () => '60+ minutes, none conceded', tone: 'live' },
    saves: { label: 'Saves', sub: (v) => `${v} saves · 1 pt per 3`, tone: 'live' },
    goals_conceded: { label: 'Goals conceded', sub: (v) => `${v} conceded · −1 per 2`, tone: 'negative' },
    bonus: { label: 'Bonus', sub: (v, p) => `${toNumber(p?.bps)} BPS in match`, tone: 'primary' },
    defensive_contribution: {
        label: 'Defensive contribution',
        sub: (v, p) => `${v} of ${DEFCON_THRESHOLDS[p?.element_type] ?? '—'} · threshold met`,
        tone: 'neutralDark',
    },
    penalties_saved: { label: 'Penalty saved', sub: (v) => `${v} × 5 pts`, tone: 'live' },
    penalties_missed: { label: 'Penalty missed', sub: (v) => `${v} × −2 pts`, tone: 'negative' },
    own_goals: { label: 'Own goal', sub: (v) => `${v} × −2 pts`, tone: 'negative' },
    yellow_cards: { label: 'Yellow card', sub: () => '−1 pt', tone: 'negative' },
    red_cards: { label: 'Red card', sub: () => '−3 pts', tone: 'negative' },
};

const FALLBACK = { label: 'Other', sub: () => '', tone: 'neutral' };

/**
 * @param explain  the `explain` array for one player from event/{gw}/live
 * @param stats    that player's `stats` object from the same payload
 * @param player   bootstrap element, for position-dependent wording
 * @returns { rows, total, reconciled } or null when there is nothing to show
 */
export const buildPointsLedger = (explain, stats, player) => {
    if (!Array.isArray(explain) || explain.length === 0) return null;

    const rows = [];
    let sum = 0;

    explain.forEach((block) => {
        (block?.stats || []).forEach((entry) => {
            const points = toNumber(entry?.points) + toNumber(entry?.points_modification);
            const value = toNumber(entry?.value);
            const meta = EVENTS[entry?.identifier] || FALLBACK;
            sum += points;
            rows.push({
                key: `${block.fixture}-${entry.identifier}`,
                label: meta.label,
                sub: meta.sub(value, { ...player, ...stats }, points),
                points,
                tone: meta.tone,
            });
        });
    });

    // A missed defensive-contribution threshold produces no explain entry, but
    // the miss is exactly what a manager wants to see, so show it at zero.
    const threshold = DEFCON_THRESHOLDS[player?.element_type];
    const hasDefcon = rows.some((r) => r.label === EVENTS.defensive_contribution.label);
    if (threshold && !hasDefcon) {
        const actual = toNumber(stats?.defensive_contribution);
        rows.push({
            key: 'defcon-missed',
            label: EVENTS.defensive_contribution.label,
            sub: `${actual} of ${threshold} · threshold missed`,
            points: 0,
            tone: 'neutralDark',
        });
    }

    const official = toNumber(stats?.total_points);
    const drift = official - sum;
    if (drift !== 0) {
        rows.push({
            key: 'reconciliation',
            label: 'Other',
            sub: 'Not itemised by the API',
            points: drift,
            tone: 'neutral',
        });
    }

    return { rows, total: official, reconciled: drift === 0 };
};

/**
 * The three bonus places in this player's fixture. Needs every element's BPS,
 * which is why it comes from the same live payload rather than element-summary.
 */
export const buildBonusRace = (race) => {
    if (!Array.isArray(race) || race.length === 0) return null;
    return race.map((r, i) => ({ ...r, place: i + 1 }));
};
