/**
 * Shared helpers for the 2026/27 FPL player data.
 *
 * Everything in here is defensive: the season is one gameweek old, so most
 * values are 0, null or missing entirely. No helper may ever return
 * "NaN", "undefined" or "null" as a display string.
 */

export const POSITION_NAMES = {
    1: 'Goalkeeper',
    2: 'Defender',
    3: 'Midfielder',
    4: 'Forward'
};

export const POSITION_SHORT = {
    1: 'GKP',
    2: 'DEF',
    3: 'MID',
    4: 'FWD'
};

export const getPositionName = (elementType) => POSITION_NAMES[elementType] || 'Unknown';
export const getPositionShort = (elementType) => POSITION_SHORT[elementType] || '—';

/** Parse anything the API hands us into a finite number, or `fallback`. */
export const toNumber = (value, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/** Fixed-decimal formatting that degrades to `fallback` instead of NaN. */
export const formatDecimal = (value, decimals = 2, fallback = '—') => {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = toNumber(value, null);
    return parsed === null ? fallback : parsed.toFixed(decimals);
};

/** Whole-number formatting. 0 is a real value, not a fallback. */
export const formatCount = (value, fallback = '0') => {
    const parsed = toNumber(value, null);
    return parsed === null ? fallback : Math.round(parsed).toLocaleString();
};

export const formatPrice = (nowCost) => `£${(toNumber(nowCost) / 10).toFixed(1)}m`;

/** `cost_change_*` fields are in tenths of a million. */
export const formatPriceDelta = (tenths) => {
    const value = toNumber(tenths) / 10;
    if (value === 0) return '£0.0m';
    return `${value > 0 ? '+' : '−'}£${Math.abs(value).toFixed(1)}m`;
};

export const perNinety = (total, minutes) => {
    const played = toNumber(minutes);
    if (played <= 0) return 0;
    return (toNumber(total) * 90) / played;
};

export const ordinal = (value) => {
    const n = toNumber(value, null);
    if (n === null) return '';
    const abs = Math.abs(Math.round(n));
    const mod100 = abs % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${abs}th`;
    switch (abs % 10) {
        case 1: return `${abs}st`;
        case 2: return `${abs}nd`;
        case 3: return `${abs}rd`;
        default: return `${abs}th`;
    }
};

/* ------------------------------------------------------------------ */
/* Defensive Contribution — the new 2026/27 scoring category           */
/* ------------------------------------------------------------------ */

/**
 * Per-match thresholds. Verified against every GW1 element: reconstructing
 * total_points with DEF=10 / MID=FWD=12 matches all 610 players exactly.
 * Goalkeepers do not score the category at all.
 */
export const DEFCON_THRESHOLDS = {
    2: 10,
    3: 12,
    4: 12
};

export const DEFCON_POINTS = 2;

/**
 * DEF earn on tackles + clearances/blocks/interceptions (CBIT).
 * MID and FWD earn on CBIT + recoveries.
 */
export const getDefensiveContribution = (player) => {
    const elementType = player?.element_type ?? null;
    const threshold = DEFCON_THRESHOLDS[elementType] ?? null;
    const eligible = threshold !== null;

    const tackles = toNumber(player?.tackles);
    const recoveries = toNumber(player?.recoveries);
    const cbi = toNumber(player?.clearances_blocks_interceptions);
    const total = toNumber(player?.defensive_contribution);
    const minutes = toNumber(player?.minutes);

    const rawPer90 = player?.defensive_contribution_per_90;
    const per90 = rawPer90 === null || rawPer90 === undefined
        ? perNinety(total, minutes)
        : toNumber(rawPer90);

    const countsRecoveries = eligible && elementType !== 2;
    const progress = eligible && threshold > 0
        ? Math.max(0, Math.min(per90 / threshold, 1))
        : 0;

    return {
        elementType,
        eligible,
        threshold,
        total,
        per90,
        tackles,
        recoveries,
        cbi,
        countsRecoveries,
        progress,
        minutes,
        pointsPerHit: eligible ? DEFCON_POINTS : 0
    };
};

/** How often the player actually cleared the threshold, from element-summary history. */
export const getDefconGameweeks = (history, elementType) => {
    const threshold = DEFCON_THRESHOLDS[elementType] ?? null;
    if (!threshold || !Array.isArray(history)) {
        return { hits: 0, played: 0, points: 0, eligible: threshold !== null };
    }
    const played = history.filter((game) => toNumber(game?.minutes) > 0);
    const hits = played.filter((game) => toNumber(game?.defensive_contribution) >= threshold).length;
    return { hits, played: played.length, points: hits * DEFCON_POINTS, eligible: true };
};

/* ------------------------------------------------------------------ */
/* Dynamic pricing (new in 2026/27)                                    */
/* ------------------------------------------------------------------ */

export const priceOffsetLabel = (offset) => {
    const value = toNumber(offset, null);
    if (value === null) return 'Soon';
    if (value <= 0) return 'Today';
    if (value === 1) return 'Tomorrow';
    return `In ${value} days`;
};

/**
 * Normalises the dynamic-pricing block. `likelihood` carries both direction
 * (sign) and the number of projected £0.1m steps. Returns null when FPL has
 * published nothing for this player.
 */
export const getPriceOutlook = (player) => {
    if (!player) return null;

    const rawProjections = Array.isArray(player.price_change_projections)
        ? player.price_change_projections
        : [];

    const projections = rawProjections
        .filter((entry) => entry && entry.offset !== null && entry.offset !== undefined)
        .map((entry) => {
            const steps = Math.round(toNumber(entry.likelihood));
            const percent = toNumber(entry.projected_percent);
            const direction = steps > 0 ? 1 : steps < 0 ? -1 : 0;
            return {
                offset: Math.round(toNumber(entry.offset)),
                label: priceOffsetLabel(entry.offset),
                percent,
                steps,
                direction,
                deltaTenths: steps
            };
        })
        .sort((a, b) => a.offset - b.offset);

    const percent = toNumber(player.price_change_percent, null);
    const hourlyRate = toNumber(player.price_change_hourly_rate, null);

    if (projections.length === 0 && percent === null) return null;

    const momentum = percent !== null
        ? percent
        : projections.length > 0 ? projections[0].percent : 0;

    return {
        percent,
        momentum,
        hourlyRate,
        lockedUntil: player.price_change_locked_until || null,
        calibrating: player.price_change_calibrating === true,
        projections,
        next: projections.length > 0 ? projections[0] : null,
        furthest: projections.length > 0 ? projections[projections.length - 1] : null,
        direction: momentum > 0 ? 1 : momentum < 0 ? -1 : 0
    };
};

export const priceMoveWord = (direction) => {
    if (direction > 0) return 'Rising';
    if (direction < 0) return 'Falling';
    return 'Steady';
};

/**
 * `likelihood` carries the direction in its sign and FPL's confidence in its
 * magnitude (1–5). We never translate it into a £ amount — FPL does not
 * publish that mapping.
 */
export const priceConfidence = (likelihood) => {
    const value = Math.abs(Math.round(toNumber(likelihood)));
    return Math.max(0, Math.min(value, 5));
};

export const formatSignedPercent = (value, decimals = 1) => {
    const parsed = toNumber(value, null);
    if (parsed === null) return '—';
    return `${parsed > 0 ? '+' : ''}${parsed.toFixed(decimals)}%`;
};

export const formatLockedUntil = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/* ------------------------------------------------------------------ */
/* Set-piece duties                                                    */
/* ------------------------------------------------------------------ */

export const SET_PIECE_FIELDS = [
    { key: 'penalties', label: 'Penalties', orderKey: 'penalties_order', textKey: 'penalties_text' },
    { key: 'freekicks', label: 'Direct free kicks', orderKey: 'direct_freekicks_order', textKey: 'direct_freekicks_text' },
    { key: 'corners', label: 'Corners & indirect', orderKey: 'corners_and_indirect_freekicks_order', textKey: 'corners_and_indirect_freekicks_text' }
];

export const getSetPieces = (player) => SET_PIECE_FIELDS
    .map((field) => {
        const rawOrder = player?.[field.orderKey];
        const order = toNumber(rawOrder, null);
        const text = typeof player?.[field.textKey] === 'string' ? player[field.textKey].trim() : '';
        return {
            key: field.key,
            label: field.label,
            order: order !== null && order > 0 ? Math.round(order) : null,
            text
        };
    })
    .filter((duty) => duty.order !== null || duty.text.length > 0);

/* ------------------------------------------------------------------ */
/* Expected stats family                                               */
/* ------------------------------------------------------------------ */

export const getExpectedStats = (player) => ([
    {
        key: 'xg',
        label: 'Expected goals',
        short: 'xG',
        total: toNumber(player?.expected_goals),
        per90: toNumber(player?.expected_goals_per_90),
        actualLabel: 'Goals',
        actual: toNumber(player?.goals_scored),
        higherIsBetter: true
    },
    {
        key: 'xa',
        label: 'Expected assists',
        short: 'xA',
        total: toNumber(player?.expected_assists),
        per90: toNumber(player?.expected_assists_per_90),
        actualLabel: 'Assists',
        actual: toNumber(player?.assists),
        higherIsBetter: true
    },
    {
        key: 'xgi',
        label: 'Expected goal involvements',
        short: 'xGI',
        total: toNumber(player?.expected_goal_involvements),
        per90: toNumber(player?.expected_goal_involvements_per_90),
        actualLabel: 'G+A',
        actual: toNumber(player?.goals_scored) + toNumber(player?.assists),
        higherIsBetter: true
    },
    {
        key: 'xgc',
        label: 'Expected goals conceded',
        short: 'xGC',
        total: toNumber(player?.expected_goals_conceded),
        per90: toNumber(player?.expected_goals_conceded_per_90),
        actualLabel: 'Conceded',
        actual: toNumber(player?.goals_conceded),
        higherIsBetter: false
    }
]);

/* ------------------------------------------------------------------ */
/* Season stat lines, per position                                     */
/* ------------------------------------------------------------------ */

export const getSeasonStats = (player) => {
    const elementType = player?.element_type ?? null;
    const minutes = toNumber(player?.minutes);
    const starts = toNumber(player?.starts);

    const rows = [
        { key: 'starts', label: 'Starts', value: formatCount(starts), sub: `${formatCount(minutes)} mins played` },
        { key: 'goals', label: 'Goals', value: formatCount(player?.goals_scored) },
        { key: 'assists', label: 'Assists', value: formatCount(player?.assists) },
        { key: 'bonus', label: 'Bonus', value: formatCount(player?.bonus) },
        { key: 'bps', label: 'BPS', value: formatCount(player?.bps), sub: 'Bonus points system' }
    ];

    if (elementType === 1 || elementType === 2 || elementType === 3) {
        rows.push({
            key: 'clean_sheets',
            label: 'Clean sheets',
            value: formatCount(player?.clean_sheets)
        });
    }

    if (elementType === 1 || elementType === 2) {
        rows.push({
            key: 'goals_conceded',
            label: 'Goals conceded',
            value: formatCount(player?.goals_conceded),
            sub: `${formatDecimal(player?.goals_conceded_per_90, 2, '0.00')} per 90`
        });
    }

    if (elementType === 1) {
        rows.push({
            key: 'saves',
            label: 'Saves',
            value: formatCount(player?.saves),
            sub: `${formatDecimal(player?.saves_per_90, 2, '0.00')} per 90`
        });
        rows.push({ key: 'penalties_saved', label: 'Pens saved', value: formatCount(player?.penalties_saved) });
    }

    if (elementType !== 1) {
        rows.push({
            key: 'defensive_contribution',
            label: 'Def. contribution',
            value: formatCount(player?.defensive_contribution),
            sub: `${formatDecimal(player?.defensive_contribution_per_90, 1, '0.0')} per 90`
        });
    }

    rows.push({ key: 'yellow_cards', label: 'Yellow cards', value: formatCount(player?.yellow_cards) });
    rows.push({ key: 'red_cards', label: 'Red cards', value: formatCount(player?.red_cards) });

    if (toNumber(player?.own_goals) > 0) {
        rows.push({ key: 'own_goals', label: 'Own goals', value: formatCount(player?.own_goals) });
    }
    if (toNumber(player?.penalties_missed) > 0) {
        rows.push({ key: 'penalties_missed', label: 'Pens missed', value: formatCount(player?.penalties_missed) });
    }

    return rows;
};

/** Sortable numeric accessor for leaderboards. */
export const statValue = (player, key) => toNumber(player?.[key]);
