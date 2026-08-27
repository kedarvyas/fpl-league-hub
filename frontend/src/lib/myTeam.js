import { toNumber, getPositionShort } from './playerStats';

/**
 * Manager-entry helpers.
 *
 * Two things here are easy to get wrong and are worth stating once.
 *
 * 1. **A starter is `position <= 11`, not `multiplier > 0`.** Under Bench
 *    Boost every one of the fifteen picks carries a multiplier of 1, because
 *    the bench scores that week. Splitting on the multiplier gives a fifteen
 *    man "starting eleven" every time the chip is played.
 *
 * 2. **`entry-picks` comes back raw.** Unlike the `matchup` function, which
 *    enriches server-side, this endpoint returns bare element ids. Names,
 *    clubs, positions and this gameweek's points all come from joining against
 *    `bootstrap-static`, which is why `event_points` limits the squad view to
 *    the current gameweek — bootstrap carries no per-player history.
 *
 * Everything is null-safe. The API drops fields for entries that never set a
 * squad, and at GW1 half of what this page shows does not exist yet.
 */

const STARTING_SLOTS = 11;

/** The armband in FPL's own shorthand, from the multiplier the API applies. */
export const armband = (pick) => {
    const m = toNumber(pick?.multiplier, 1);
    if (pick?.is_captain) return m === 3 ? 'TC' : 'C';
    if (pick?.is_vice_captain) return 'V';
    return null;
};

/**
 * Join raw picks against the bootstrap element list.
 *
 * Points are the player's gameweek score times the multiplier the API already
 * applied — never multiplied a second time. That double-multiply is exactly
 * what the old H2H pitch got wrong, so it is done in one place here.
 */
export const buildSquad = (picksData, bootstrap) => {
    const picks = picksData?.picks;
    if (!Array.isArray(picks) || picks.length === 0) return null;

    const elements = new Map((bootstrap?.elements || []).map((e) => [e.id, e]));
    const clubs = new Map((bootstrap?.teams || []).map((t) => [t.id, t.short_name]));

    const shape = (pick) => {
        const element = elements.get(pick.element);
        const multiplier = toNumber(pick.multiplier, 0);
        const raw = toNumber(element?.event_points);

        return {
            id: pick.element,
            code: element?.code ?? null,
            name: element?.web_name || 'Unknown',
            club: clubs.get(element?.team) || '—',
            position: getPositionShort(pick.element_type ?? element?.element_type),
            elementType: pick.element_type ?? element?.element_type ?? null,
            price: toNumber(element?.now_cost),
            slot: toNumber(pick.position),
            multiplier,
            mark: armband(pick),
            // What this pick actually contributed.
            points: raw * multiplier,
            // What the player scored, regardless of whether it counted.
            rawPoints: raw,
            counted: multiplier > 0,
        };
    };

    const all = picks.map(shape).sort((a, b) => a.slot - b.slot);
    const starters = all.filter((p) => p.slot <= STARTING_SLOTS);
    const bench = all.filter((p) => p.slot > STARTING_SLOTS);

    const count = (type) => starters.filter((p) => p.elementType === type).length;
    const history = picksData?.entry_history || {};

    return {
        starters,
        bench,
        // Goalkeeper is always one, so the shorthand is the outfield shape.
        formation: `${count(2)}-${count(3)}-${count(4)}`,
        xiPoints: starters.reduce((total, p) => total + p.points, 0),
        // Under Bench Boost the bench carries a multiplier and does count.
        benchPoints: bench.reduce((total, p) => total + p.rawPoints, 0),
        benchCounted: bench.some((p) => p.counted),
        chip: picksData?.active_chip || null,
        subs: Array.isArray(picksData?.automatic_subs) ? picksData.automatic_subs : [],
        points: toNumber(history.points),
        hit: toNumber(history.event_transfers_cost),
        transfers: toNumber(history.event_transfers),
        officialBench: toNumber(history.points_on_bench),
        value: toNumber(history.value),
        bank: toNumber(history.bank),
    };
};

/** Names for the automatic substitutions FPL made after the deadline. */
export const describeSubs = (subs, bootstrap) => {
    const elements = new Map((bootstrap?.elements || []).map((e) => [e.id, e.web_name]));
    return (subs || []).map((sub) => ({
        key: `${sub.element_in}-${sub.element_out}`,
        in: elements.get(sub.element_in) || 'Unknown',
        out: elements.get(sub.element_out) || 'Unknown',
    }));
};

/* ------------------------------------------------------------------ */
/* Rank as a share of the field                                        */
/* ------------------------------------------------------------------ */

/**
 * A rank of 99,942 means nothing without a denominator, and FPL's own
 * `entry_percentile_rank` is bucketed to 1/5/10/15/25/50 — too coarse to
 * separate the top of a mini-league from the middle. Dividing gives the real
 * figure, and it is the number every manager actually quotes.
 */
export const topPercent = (rank, total) => {
    const r = toNumber(rank, null);
    const t = toNumber(total, null);
    if (r === null || t === null || r <= 0 || t <= 0) return null;
    return Math.min(100, (r / t) * 100);
};

export const formatTopPercent = (percent) => {
    if (percent === null || percent === undefined) return null;
    if (percent < 0.1) return `TOP ${percent.toFixed(2)}%`;
    if (percent < 10) return `TOP ${percent.toFixed(1)}%`;
    return `TOP ${Math.round(percent)}%`;
};

/** Track fill for a percentile: better rank, fuller bar. */
export const rankFill = (percent) =>
    percent === null || percent === undefined ? 0 : Math.max(0, Math.min(100, 100 - percent));

/** Tenths of a million, as FPL stores squad value and the bank. */
export const formatMoney = (tenths) => `£${(toNumber(tenths) / 10).toFixed(1)}M`;

/* ------------------------------------------------------------------ */
/* Mini-leagues                                                        */
/* ------------------------------------------------------------------ */

/**
 * `leagues.classic` mixes two very different things: leagues you joined with
 * people you know (`league_type: 'x'`) and the ones FPL enrols everyone into
 * automatically — Overall, Gameweek N, your club, your country
 * (`league_type: 's'`). Ranking 99,942nd of nine million and 1st of nine are
 * both interesting, but not in the same list.
 */
const shapeLeague = (league) => {
    const rank = toNumber(league?.entry_rank, null);
    const last = toNumber(league?.entry_last_rank, null);
    const count = toNumber(league?.rank_count, null);
    const percent = topPercent(rank, count);

    return {
        id: league?.id,
        name: league?.name || '—',
        rank,
        count,
        percent,
        // last_rank is 0 before a second gameweek exists, which is not a move.
        move: last && rank ? last - rank : 0,
    };
};

export const groupLeagues = (leagues) => {
    const classic = leagues?.classic || [];
    const h2h = leagues?.h2h || [];

    return {
        h2h: h2h.map(shapeLeague),
        invitational: classic.filter((l) => l?.league_type === 'x').map(shapeLeague),
        global: classic.filter((l) => l?.league_type !== 'x').map(shapeLeague),
    };
};

/* ------------------------------------------------------------------ */
/* Previous seasons                                                    */
/* ------------------------------------------------------------------ */

/**
 * The endpoint hands back a `tier_color` hex and a medal emoji per season.
 * Neither can be used: a fixed hex cannot survive six themes with panels on
 * both sides of the lightness scale, and the design carries no icons. The
 * ordinal information in the tier is kept — a top-5% season earns the accent
 * chip — and everything else is the percentile track, which is the same object
 * the mini-league rows use.
 */
export const seasonStanding = (season) => {
    const percent = toNumber(season?.percentage, null);
    return {
        percent,
        label: formatTopPercent(percent),
        fill: rankFill(percent),
        // Colour is earned: only a genuinely strong finish gets the chip.
        strong: percent !== null && percent <= 5,
    };
};
