import { toNumber } from './playerStats';

/**
 * The "call" shown in the hero. This logic is ours, not the API's — FPL
 * publishes no verdict — so it is kept here, derived and testable, rather than
 * scattered through the view.
 *
 * The call must never render without the two numbers beside it. NO DATA says
 * so in words rather than dressing a zero up as an opinion.
 */

export const VERDICT = {
    IN_FORM: 'IN_FORM',
    COOLING: 'COOLING',
    AVOID: 'AVOID',
    NO_DATA: 'NO_DATA',
};

/** Minutes below which we decline to have an opinion at all. */
const MIN_MINUTES = 45;

/** Top-decile cutoff, expressed as a rank within the player's position. */
const TOP_DECILE = 0.1;

// Two-word verdicts break across two lines; single words stay whole. Splitting
// mid-word ("AVO / ID") reads as a rendering fault, not a design.
const CONFIG = {
    [VERDICT.IN_FORM]: { label: ['IN', 'FORM'], tone: 'live' },
    [VERDICT.COOLING]: { label: ['COOLING'], tone: 'warn' },
    [VERDICT.AVOID]: { label: ['AVOID'], tone: 'destructive' },
    [VERDICT.NO_DATA]: { label: ['NO', 'DATA'], tone: 'muted' },
};

/**
 * @param player  bootstrap element
 * @param positionCount  how many players share this position, for the rank cutoff
 */
export const getVerdict = (player, positionCount = 0) => {
    const minutes = toNumber(player?.minutes);
    const form = toNumber(player?.form);
    const ppg = toNumber(player?.points_per_game);
    const formRank = toNumber(player?.form_rank_type, null);
    const ppgRank = toNumber(player?.points_per_game_rank_type, null);

    let state;
    let reason;

    if (player?.status && player.status !== 'a') {
        state = VERDICT.AVOID;
        // `news` is the club's own wording and is the most useful thing we have.
        reason = (player.news || '').trim().toUpperCase() || 'NOT AVAILABLE';
    } else if (minutes < MIN_MINUTES) {
        state = VERDICT.NO_DATA;
        reason = minutes > 0 ? `ONLY ${minutes} MINS` : 'NO MINUTES YET';
    } else {
        const cutoff = positionCount > 0 ? Math.ceil(positionCount * TOP_DECILE) : 0;
        const topOnBoth =
            cutoff > 0 && formRank !== null && ppgRank !== null &&
            formRank <= cutoff && ppgRank <= cutoff;

        if (topOnBoth) {
            state = VERDICT.IN_FORM;
            reason = formRank === 1 && ppgRank === 1 ? '1ST ON BOTH' : 'TOP 10% ON BOTH';
        } else if (form < ppg) {
            state = VERDICT.COOLING;
            reason = `FORM ${form.toFixed(1)} VS ${ppg.toFixed(1)} AVG`;
        } else {
            // Playing and not declining, but not elite either. Reuse COOLING's
            // neutral treatment rather than inventing a fifth state.
            state = VERDICT.COOLING;
            reason = 'STEADY, NOT TOP TIER';
        }
    }

    return { state, reason, ...CONFIG[state] };
};

/**
 * Rank within position -> percentile, where a full bar is best in position.
 * Ranks are 1-based, so rank 1 of 210 is 100% and rank 210 is a sliver.
 */
export const rankToPercentile = (rank, total) => {
    const r = toNumber(rank, null);
    const n = toNumber(total, null);
    if (r === null || n === null || n <= 0 || r <= 0) return 0;
    return Math.max(0, Math.min(100, ((n - r + 1) / n) * 100));
};
