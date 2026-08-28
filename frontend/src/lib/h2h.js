import { bonusFor } from './liveBonus';
import { toNumber } from './playerStats';

/**
 * H2H helpers.
 *
 * The one idea worth knowing: a head-to-head fixture is not decided by who has
 * the better team, it is decided by *differentials*. Players both managers own
 * cancel out exactly — if we both start Haaland, his 16 points move the gap by
 * nothing. What settles the fixture is the players only one side owns, plus the
 * occasional shared player one side captained.
 *
 * So instead of showing two squads side by side and leaving the reader to do
 * that subtraction in their head, we do it for them: split the two starting
 * elevens into HOME-ONLY / AWAY-ONLY / SHARED, and the first two columns are
 * the entire story of the scoreline.
 *
 * Everything here is null-safe and never returns NaN — the API drops fields for
 * byes and for managers who never set a squad.
 */

const CHIP_NAMES = {
    '3xc': 'TRIPLE CAPTAIN',
    bboost: 'BENCH BOOST',
    freehit: 'FREE HIT',
    wildcard: 'WILDCARD',
    manager: 'ASST MANAGER',
};

export const chipName = (chip) => (chip ? CHIP_NAMES[chip] || chip.toUpperCase() : null);

/**
 * The starting eleven is the first eleven squad slots — never `multiplier > 0`.
 *
 * Under Bench Boost the bench genuinely scores, so the API returns all fifteen
 * picks with a multiplier of at least 1 (verified: entry 3023953, GW1,
 * `active_chip: "bboost"`). Filtering on the multiplier builds a fifteen-man
 * XI for that side, and the differential columns stop reconciling to the
 * scoreline. The squad slot is the one rule that holds for every chip.
 *
 * The slot is `squadPosition`: the matchup function overwrites `position` with
 * the player's GKP/DEF/MID/FWD label, which is what the rows render. Payloads
 * cached before that field existed fall back to the pick's index, since the
 * API returns picks in slot order.
 */
const STARTING_XI = 11;

const startersOf = (team) =>
    (team?.picks || []).filter((p, i) => toNumber(p?.squadPosition, i + 1) <= STARTING_XI);

const byPointsDesc = (a, b) => toNumber(b.points) - toNumber(a.points);

/**
 * Fold bonus FPL has not awarded yet into a pick's score.
 *
 * `points` arrives from the matchup function already multiplied, so the
 * provisional bonus is multiplied to match — a captain's bonus doubles, which
 * is what will happen when the real bonus lands.
 */
const withProvisional = (pick, bonus) => {
    const provisional = bonusFor(bonus, pick?.id);
    if (provisional === 0) return pick;
    return {
        ...pick,
        points: toNumber(pick.points) + provisional * toNumber(pick.multiplier, 1),
        provisional,
    };
};

/**
 * A side's unawarded bonus, counted over every pick that is scoring rather
 * than over the eleven. Under Bench Boost the bench carries a multiplier and
 * its bonus counts too; every other week those picks multiply out to zero.
 */
const provisionalTotal = (team, bonus) =>
    (team?.picks || []).reduce(
        (total, p) => total + bonusFor(bonus, p?.id) * toNumber(p?.multiplier, 0),
        0,
    );

const sum = (list, key = 'points') => list.reduce((total, item) => total + toNumber(item[key]), 0);

/** One side of a fixture: identity from the matchup, squad detail from picks. */
const sideOf = (matchData, n, bonus) => {
    const m = matchData?.matchup || {};
    const team = n === 1 ? matchData?.team1 : matchData?.team2;
    const history = team?.entry_history || {};
    const provisional = provisionalTotal(team, bonus);

    return {
        entry: m[`entry_${n}_entry`] ?? null,
        teamName: m[`entry_${n}_name`] || '—',
        managerName: m[`entry_${n}_player_name`] || '',
        // The scoreline FPL publishes plus what it has not awarded yet, so the
        // headline and the columns below it cannot disagree.
        points: toNumber(m[`entry_${n}_points`]) + provisional,
        provisional,
        won: !!m[`entry_${n}_win`],
        drew: !!m[`entry_${n}_draw`],
        lost: !!m[`entry_${n}_loss`],
        starters: startersOf(team).map((p) => withProvisional(p, bonus)),
        // entry_history is fetched on every expand and has never been shown.
        // "He took a -8 and left 14 on the bench" is the story of a lot of
        // these fixtures.
        hit: toNumber(history.event_transfers_cost),
        transfers: toNumber(history.event_transfers),
        benched: toNumber(history.points_on_bench),
        chip: chipName(team?.active_chip),
        squadValue: toNumber(history.value),
    };
};

/**
 * Split two starting elevens into the three buckets. A shared player normally
 * nets zero, but not if one manager captained him — that is why shared players
 * carry a net rather than a single figure.
 */
export const buildLedger = (matchData, bonus = null) => {
    if (!matchData) return null;

    const home = sideOf(matchData, 1, bonus);
    const away = sideOf(matchData, 2, bonus);

    const homeById = new Map(home.starters.map((p) => [p.id, p]));
    const awayById = new Map(away.starters.map((p) => [p.id, p]));

    const homeOnly = home.starters.filter((p) => !awayById.has(p.id)).sort(byPointsDesc);
    const awayOnly = away.starters.filter((p) => !homeById.has(p.id)).sort(byPointsDesc);

    const shared = home.starters
        .filter((p) => awayById.has(p.id))
        .map((p) => {
            const other = awayById.get(p.id);
            return {
                id: p.id,
                name: p.name,
                position: p.position,
                club: p.club,
                homePoints: toNumber(p.points),
                awayPoints: toNumber(other.points),
                homeMultiplier: toNumber(p.multiplier, 1),
                awayMultiplier: toNumber(other.multiplier, 1),
                net: toNumber(p.points) - toNumber(other.points),
            };
        })
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || b.homePoints - a.homePoints);

    const homeOnlyPoints = sum(homeOnly);
    const awayOnlyPoints = sum(awayOnly);
    const sharedNet = shared.reduce((total, p) => total + p.net, 0);
    // Shared points are the same on both sides except where captaincy differs,
    // so the lower of the two is what genuinely cancels.
    const sharedCancelled = shared.reduce(
        (total, p) => total + Math.min(p.homePoints, p.awayPoints),
        0,
    );

    return {
        home,
        away,
        homeOnly,
        awayOnly,
        shared,
        totals: {
            homeOnlyPoints,
            awayOnlyPoints,
            sharedNet,
            sharedCancelled,
            // What the differentials alone are worth. Sign is from home's side.
            edge: homeOnlyPoints - awayOnlyPoints + sharedNet,
            margin: home.points - away.points,
        },
    };
};

/**
 * The armband, in FPL's own shorthand: C for captain, TC when the Triple
 * Captain chip is on him. Anything else with a multiplier above 1 falls back to
 * the raw figure rather than guessing a name for it.
 */
export const captainMark = (multiplier) => {
    const m = toNumber(multiplier, 1);
    if (m === 2) return 'C';
    if (m === 3) return 'TC';
    return m > 1 ? `×${m}` : null;
};

/** Whether a shared player was captained by one side and not the other. */
export const captaincySplit = (player) => player.homeMultiplier !== player.awayMultiplier;

/** League-wide numbers for the gameweek, from the fixture list alone. */
export const summariseGameweek = (matchups) => {
    const scores = (matchups || [])
        .flatMap((m) => [m.entry_1_points, m.entry_2_points])
        .map((v) => toNumber(v, null))
        .filter((v) => v !== null);

    if (!scores.length) {
        return { highest: null, lowest: null, average: null, fixtures: 0, teams: 0 };
    }

    return {
        highest: Math.max(...scores),
        lowest: Math.min(...scores),
        average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        fixtures: (matchups || []).length,
        teams: scores.length,
    };
};

/** Result of a fixture from one side's point of view. */
export const resultOf = (matchup, entryKey) => {
    const isHome = entryKey === 1;
    const own = toNumber(isHome ? matchup.entry_1_points : matchup.entry_2_points);
    const other = toNumber(isHome ? matchup.entry_2_points : matchup.entry_1_points);
    if (own > other) return 'W';
    if (own < other) return 'L';
    return 'D';
};

/**
 * Home's share of the two scores, for the split bar on every fixture row. Two
 * blanks sit at 50/50 rather than collapsing, so an unplayed gameweek still
 * reads as a row of fixtures (rule 4 — never hide a zero).
 */
export const homeShare = (matchup) => {
    const h = toNumber(matchup.entry_1_points);
    const a = toNumber(matchup.entry_2_points);
    if (h + a <= 0) return 50;
    return (h / (h + a)) * 100;
};

/** Rank movement since last gameweek, for the standings board. */
export const rankMove = (row) => {
    const last = toNumber(row?.last_rank, 0);
    const now = toNumber(row?.rank, 0);
    if (!last || !now || last === now) return 0;
    return last - now; // positive = climbed
};
