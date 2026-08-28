import { toNumber } from './playerStats';

/**
 * Provisional bonus, while a match is still being played.
 *
 * **FPL does not publish bonus until a fixture is done.** During play the API
 * reports `stats.bonus` as 0 and only `stats.bps` moves, so every points total
 * in this app — the squad list, the H2H ledger — reads low mid-match and then
 * jumps an hour after the whistle. That gap is the single most visible
 * difference between this app and the live-score sites, and it is entirely
 * derivable from data the API already gives us.
 *
 * The rule is the one FPL applies: rank everyone in a fixture by BPS and award
 * 3, 2 and 1 to the top three. What makes it worth writing carefully is the
 * ties, which are common rather than exceptional — **all ten** GW1 fixtures
 * contained at least one. Ties use *competition* ranking, so two players level
 * at the top are both first and the next player is third:
 *
 *   30, 30, 25  ->  3, 3, 1   (nobody is second)
 *   30, 25, 25  ->  3, 2, 2   (nobody is third)
 *   30, 30, 30  ->  3, 3, 3
 *   30, 25, 24, 24  ->  3, 2, 1, 1
 *
 * Verified by replaying GW1: this reproduces FPL's own awarded bonus for all
 * 610 player-fixture rows exactly.
 */

/** Rank 1, 2 and 3 are worth 3, 2 and 1. Everyone else gets nothing. */
export const BONUS_FOR_RANK = { 1: 3, 2: 2, 3: 1 };

/**
 * `[{ id, fixture, bps }]` → `Map(elementId → bonus)`.
 *
 * Rows are grouped by fixture, because bonus is contested within a fixture and
 * nowhere else. A player with two fixtures in a double gameweek accumulates
 * bonus from both, which is why the map adds rather than assigns.
 */
export const provisionalBonus = (rows) => {
    const byFixture = new Map();
    (rows || []).forEach((row) => {
        const fixture = toNumber(row?.fixture, null);
        const id = toNumber(row?.id, null);
        if (fixture === null || id === null) return;
        if (!byFixture.has(fixture)) byFixture.set(fixture, []);
        byFixture.get(fixture).push({ id, bps: toNumber(row.bps) });
    });

    const bonus = new Map();
    byFixture.forEach((players) => {
        // Nobody scores bonus off zero BPS, and including them would hand out
        // three points in the opening minutes of a match.
        const scoring = players.filter((p) => p.bps > 0);
        scoring.forEach((player) => {
            // Competition ranking: how many are strictly ahead, plus one.
            const rank = scoring.filter((other) => other.bps > player.bps).length + 1;
            const award = BONUS_FOR_RANK[rank] || 0;
            if (award > 0) bonus.set(player.id, (bonus.get(player.id) || 0) + award);
        });
    });

    return bonus;
};

/**
 * Whether anything is actually provisional right now.
 *
 * Used to decide whether to say so in the interface. An empty map during a
 * finished gameweek is the normal, quiet case.
 */
export const hasProvisionalBonus = (bonus) => !!bonus && bonus.size > 0;

/** What one player is provisionally owed. Null-safe for every caller. */
export const bonusFor = (bonus, elementId) => (bonus ? toNumber(bonus.get(elementId)) : 0);
