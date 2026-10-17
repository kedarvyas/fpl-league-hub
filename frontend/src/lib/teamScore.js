import { getDefensiveContribution, percentileFor, toNumber } from './playerStats';
import { fixturesFor } from './transferPlan';

/**
 * A rating for a squad, and for each player in it.
 *
 * **This model is ours. FPL publishes no such number**, so everything here is
 * derived from `bootstrap-static` and the fixture list, and every component is
 * surfaced in the interface rather than rolled into an opaque figure. A score
 * a reader cannot take apart is a score they cannot disagree with, and on a
 * page that already shows the player rows it would be rating, that is worse
 * than useless.
 *
 * Two things are worth stating before the arithmetic.
 *
 * 1. **Every component is a percentile within position.** "Is 0.42 xGI per 90
 *    good" has no answer; "better than 86% of midfielders who have played" has
 *    one. It also means a goalkeeper and a forward can sit in the same column
 *    without the column being nonsense, which is the whole reason a squad can
 *    carry a single number at all.
 *
 * 2. **Availability is a gate, not a component.** A 95th-percentile forward
 *    with a broken foot is not a 95th-percentile pick, he is a zero, and no
 *    weighting of form against fixtures expresses that. So it multiplies the
 *    result instead of being averaged into it.
 *
 * What this is not: Fantasy Football Hub's rating sits on a projection model
 * fed by bookmaker odds and minutes modelling. The FPL API exposes no such
 * thing — `ep_next` is the closest it comes and it is crude. This is a
 * transparent heuristic over public data, and the interface says so.
 */

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/* ------------------------------------------------------------------ */
/* Availability                                                        */
/* ------------------------------------------------------------------ */

/**
 * 0–1, multiplied through the player's score.
 *
 * `chance_of_playing_next_round` is the field to trust when it exists: it is
 * the club's own percentage and it is set for exactly the players whose
 * availability is in question. `null` means nothing has been said, which for
 * an `a` player is good news and for an `i` player is not — hence the split
 * rather than a single `?? 100`.
 */
export const availabilityOf = (element) => {
    const chance = element?.chance_of_playing_next_round;
    if (chance !== null && chance !== undefined) return clamp(toNumber(chance), 0, 100) / 100;
    return (element?.status || 'a') === 'a' ? 1 : 0;
};

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

/**
 * FDR 1–5 onto 0–100. The curve is deliberately not linear: the gap between a
 * 4 and a 5 matters less than the gap between a 2 and a 3, because by the time
 * a fixture is a 4 you are hoping rather than expecting either way.
 */
const FDR_SCORE = { 1: 100, 2: 82, 3: 58, 4: 32, 5: 12 };

/** Small, because home advantage is real and is not worth a whole band. */
const HOME_BONUS = 4;

/**
 * A double gameweek is two chances to return, which the mean of its two
 * difficulties does not express — two fixtures at FDR 3 beat one at FDR 2.
 */
const DOUBLE_BONUS = 18;

const fixtureScore = (fixtures) => {
    const list = fixtures || [];
    // A blank is a real answer and it is zero. Scoring it as "no data" and
    // skipping it would quietly rate a blank gameweek as an average one.
    if (list.length === 0) return 0;

    const each = list.map((f) => {
        const base = FDR_SCORE[toNumber(f?.difficulty, 3)] ?? 58;
        return clamp(base + (f?.isHome ? HOME_BONUS : 0));
    });

    const mean = each.reduce((a, b) => a + b, 0) / each.length;
    return clamp(list.length > 1 ? mean + DOUBLE_BONUS : mean);
};

/**
 * The fixture component across a window of gameweeks, plus what the window
 * contains. Blanks and doubles are counted rather than averaged away, because
 * "58 out of 100" hides the fact that one of those weeks is a blank and the
 * manager needs to know that specifically.
 */
export const rateFixtures = (index, clubId, events) => {
    const list = events || [];
    if (list.length === 0) return { score: 0, blanks: 0, doubles: 0, runs: [] };

    const runs = list.map((event) => fixturesFor(index, clubId, event));
    const score = runs.reduce((total, run) => total + fixtureScore(run), 0) / runs.length;

    return {
        score: clamp(score),
        blanks: runs.filter((run) => run.length === 0).length,
        doubles: runs.filter((run) => run.length > 1).length,
        runs,
    };
};

/* ------------------------------------------------------------------ */
/* Minutes                                                             */
/* ------------------------------------------------------------------ */

/**
 * The share of his side's minutes a player has actually been on the pitch for.
 *
 * This is the component most likely to be unfair to one kind of player, and it
 * is worth being honest about which: a man who missed six weeks injured and is
 * now starting again scores badly here, because bootstrap carries season
 * totals and no per-gameweek history. Fetching that history means
 * `element-summary` fifteen times over, which is exactly the burst the FPL WAF
 * answers with a flat 403. So the season share stands, and the availability
 * gate above — which *is* current — carries the "is he fit right now" half.
 */
export const minutesShare = (element, gamesPlayed) => {
    const games = toNumber(gamesPlayed, 0);
    if (games <= 0) return 0;
    return clamp((toNumber(element?.minutes) / (games * 90)) * 100);
};

/* ------------------------------------------------------------------ */
/* Underlying output                                                   */
/* ------------------------------------------------------------------ */

/**
 * What the player is actually doing on the pitch, weighted by what his
 * position is paid for.
 *
 * A goalkeeper and a forward earn points in almost disjoint ways, so a single
 * "underlying" stat across both would be measuring nothing. Each position gets
 * the blend FPL's own scoring implies: keepers and defenders are paid to keep
 * the ball out, forwards to put it in, and midfielders for both plus the
 * defensive contribution threshold.
 */
export const rateUnderlying = (element, elements) => {
    const type = toNumber(element?.element_type, null);

    const attacking = percentileFor(element, elements, 'expected_goal_involvements_per_90');
    const defending = percentileFor(element, elements, 'expected_goals_conceded_per_90', {
        lowerIsBetter: true,
    });
    const saves = percentileFor(element, elements, 'saves_per_90');
    // 0–1 of the way to the defensive-contribution threshold, which is worth
    // two points a week to anyone who clears it regularly.
    const defcon = clamp(getDefensiveContribution(element).progress * 100);

    if (type === 1) return clamp(defending * 0.6 + saves * 0.4);
    if (type === 2) return clamp(defending * 0.45 + attacking * 0.3 + defcon * 0.25);
    if (type === 3) return clamp(attacking * 0.75 + defcon * 0.25);
    return clamp(attacking);
};

/* ------------------------------------------------------------------ */
/* Weighting                                                           */
/* ------------------------------------------------------------------ */

/**
 * Two horizons, two sets of weights, and the difference between them is the
 * point.
 *
 * Over one gameweek, who is hot and who they play is most of the answer.
 * Over five, form regresses and the fixture run and minutes matter more, so
 * season-long quality — `points_per_game`, which a single hot week cannot
 * move — enters the blend and form's share halves.
 */
/*
 * `ep_next` was a fifth component here and is not any more.
 *
 * Measured across 77 starters from seven real squads it correlates with
 * `form` at **r = 0.998** — FPL's expected-points figure is a restatement of
 * form, not an independent projection of it. Carrying both put 40% of the
 * score on one signal counted twice, and dressed it up as two.
 *
 * Its weight went to `underlying`, which at r = 0.08 against form is the only
 * genuinely independent thing the model measures and was the second-lowest
 * weighted. Do not add `ep_next` back without re-measuring that correlation.
 */
export const GW_WEIGHTS = {
    form: 0.26,
    fixture: 0.26,
    underlying: 0.32,
    minutes: 0.16,
};

export const RUN_WEIGHTS = {
    form: 0.13,
    fixture: 0.25,
    underlying: 0.29,
    minutes: 0.18,
    season: 0.15,
};

export const COMPONENT_LABELS = {
    form: 'Form',
    fixture: 'Fixtures',
    underlying: 'Underlying',
    minutes: 'Minutes',
    season: 'Season',
};

const blend = (components, weights) => {
    let total = 0;
    let used = 0;
    Object.entries(weights).forEach(([key, weight]) => {
        const value = components[key];
        if (value === null || value === undefined) return;
        total += value * weight;
        used += weight;
    });
    return used > 0 ? clamp(total / used) : 0;
};

/* ------------------------------------------------------------------ */
/* Per player                                                          */
/* ------------------------------------------------------------------ */

/**
 * One pick's rating over a window of gameweeks.
 *
 * `pick` is a row from `buildSquad` — it already carries the armband and the
 * slot — and `element` is the bootstrap row it was built from. Both are needed:
 * the pick knows the manager's decisions, the element knows the football.
 */
export const ratePlayer = ({ pick, element, elements, index, events, gamesPlayed, weights }) => {
    const available = availabilityOf(element);
    const fixtures = rateFixtures(index, toNumber(element?.team, null), events);

    const components = {
        form: percentileFor(element, elements, 'form'),
        fixture: fixtures.score,
        underlying: rateUnderlying(element, elements),
        minutes: minutesShare(element, gamesPlayed),
        season: percentileFor(element, elements, 'points_per_game'),
    };

    const raw = blend(components, weights);

    /*
     * The component holding this player back, which is the only part of a
     * per-player rating anyone can act on. "Sánchez 41" says nothing; "Sánchez
     * 41, fixtures" says sell him or bench him, and "Sánchez 41, minutes" says
     * something else entirely.
     *
     * Only the components actually in the blend are considered — season
     * quality is not in the gameweek weights, so it cannot be the reason for a
     * gameweek rating.
     */
    const inPlay = Object.keys(weights).map((key) => ({
        key,
        label: COMPONENT_LABELS[key],
        value: components[key] ?? 0,
    }));
    const limiting = inPlay.reduce((worst, c) => (c.value < worst.value ? c : worst), inPlay[0]);

    return {
        id: pick?.id ?? element?.id ?? null,
        name: pick?.name || element?.web_name || 'Unknown',
        code: pick?.code ?? element?.code ?? null,
        club: pick?.club || '—',
        position: pick?.position || '—',
        slot: toNumber(pick?.slot, 0),
        mark: pick?.mark || null,
        price: toNumber(pick?.price ?? element?.now_cost),
        components,
        limiting,
        // The rating before availability is applied, so the interface can say
        // "a 78 player who is not playing" rather than presenting a 0 that
        // looks like a data fault.
        raw,
        available,
        score: clamp(raw * available),
        blanks: fixtures.blanks,
        doubles: fixtures.doubles,
        // The club's own words, which beat anything we would write.
        news: (element?.news || '').trim(),
        status: element?.status || 'a',
    };
};

/* ------------------------------------------------------------------ */
/* The transfer planner's squad                                        */
/* ------------------------------------------------------------------ */

/**
 * The planner's applied plan, in the shape `scoreSquad` reads.
 *
 * `buildSquad` and `applyPlan` describe the same fifteen players in two
 * different shapes, because they answer different questions: one joins picks
 * against bootstrap for a gameweek that has happened, the other lays moves
 * over a baseline for one that has not. Rather than teach the model both, this
 * translates — so the planner is rated by exactly the code the squad tab uses,
 * and the two pages can never quietly disagree about what a squad is worth.
 *
 * **The armband comes from the sheet, not the pick.** The planner keys the
 * captaincy by baseline slot, so transferring out your captain moves the
 * armband onto whoever replaces him; reading `wasCaptain` off the player would
 * lose it the moment he was sold.
 */
export const squadFromPlan = (applied) => {
    if (!applied || !Array.isArray(applied.xi)) return null;

    const captainSlot = applied.captain?.slot ?? null;
    const viceSlot = applied.vice?.slot ?? null;

    const shape = (entry) => {
        // A slot marked out with nobody in yet. Not an error — it is how you
        // open a slot — so it is dropped here and counted below.
        if (!entry?.player) return null;
        const player = entry.player;
        return {
            id: player.id,
            code: player.code ?? null,
            name: player.name || 'Unknown',
            club: player.club || '—',
            position: player.position || '—',
            elementType: player.elementType ?? null,
            price: toNumber(player.price),
            slot: toNumber(entry.slot),
            mark: entry.slot === captainSlot ? 'C' : entry.slot === viceSlot ? 'V' : null,
        };
    };

    const starters = (applied.xi || []).map(shape).filter(Boolean);
    const bench = (applied.bench || []).map(shape).filter(Boolean);
    if (starters.length === 0) return null;

    return {
        starters,
        bench,
        // How much of the eleven is not filled in yet. The score is computed
        // on the players who are there rather than counting a hole as a zero:
        // mid-plan, a slot you have just opened is a decision in progress, and
        // a rating that collapses while you are choosing is noise, not news.
        open: (applied.xi || []).length - starters.length,
    };
};

/**
 * What a plan did to the rating.
 *
 * The planner's question is never "what is this squad worth" on its own — it
 * is "is this better than what I already have". So the comparison is the
 * product, and the components are carried alongside it, because a move that
 * leaves the score flat by trading fixtures for form has told the manager
 * something and a bare `0` has not.
 */
export const compareScores = (before, after) => {
    if (!before || !after) return null;

    const was = new Map(before.components.map((c) => [c.key, c.value]));
    const pair = (key, label, read) => ({
        key,
        label,
        before: read(before),
        after: read(after),
        delta: read(after) - read(before),
    });

    return {
        before: before.score,
        after: after.score,
        delta: after.score - before.score,
        // What the reader sees move, as opposed to `delta` above.
        shown: shownDelta(before.score, after.score),
        bandChanged: before.band.word !== after.band.word,
        /*
         * The three figures the headline is actually built from.
         *
         * Without these the comparison can look broken, and did: bringing in a
         * 25%-doubt striker raised every component average and dropped the
         * score by six, because the components are percentiles *before* the
         * chance-of-playing discount while the score is after it — and because
         * a new weak link hits the floor far harder than it moves a mean. Four
         * green arrows above a falling number is the kind of thing that makes
         * a reader stop believing the page.
         */
        aggregates: [
            pair('xi', 'XI mean', (s) => s.xi),
            pair('floor', 'Worst 3', (s) => s.floor),
            pair('bench', 'Bench', (s) => s.bench),
        ],
        components: after.components.map((c) => ({
            key: c.key,
            label: c.label,
            before: was.get(c.key) ?? 0,
            after: c.value,
            delta: c.value - (was.get(c.key) ?? 0),
        })),
    };
};

/* ------------------------------------------------------------------ */
/* Bands                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* The displayed scale                                                 */
/* ------------------------------------------------------------------ */

/**
 * Where real squads land on the raw blend, so the displayed number can mean
 * something to a reader.
 *
 * The raw rating is a mean of within-position percentiles, docked for weak
 * links, and on real squads it only spans about 40–74 — so an elite squad read
 * 73, which sounds like a C grade. These are the population-weighted median
 * and spread of 110 squads sampled across the Overall league (rank 1 to ~10M),
 * rated for GW7 before it kicked off, each weighted by the band of ranks it
 * stands for. The rank sample alone over-represents the top: ranks 1–165k are
 * ~1.5% of managers and four of its eleven sampling points.
 *
 * **One gameweek's calibration.** A week of unusually kind fixtures lifts the
 * whole field, so if the bands start to look generous, re-measure (see
 * `.score-validation/` locally) rather than nudging these by eye.
 */
export const CALIBRATION = {
    gw: { median: 60.9, sd: 4.47 },
    run: { median: 62.08, sd: 4.97 },
};

/** Displayed points per standard deviation of the raw rating. */
const SCALE_PER_SD = 16;

/**
 * Raw rating → the 0–100 a reader sees: 50 is a typical squad, ~90 is roughly
 * the top 2%.
 *
 * **Linear, deliberately not a percentile.** A "share of squads you beat"
 * curve was tried first and fitted the sample well, but it flattens out at the
 * top: at 99, a whole raw point of improvement moved the display by 0.4, so
 * almost every transfer an elite manager planned read NO CHANGE. A straight
 * line keeps one raw point worth the same ~3.5 displayed points everywhere,
 * which is what a planner that answers "did that help" needs. The cost is
 * that the number is a rating, not a literal percentage, and both ends clamp.
 */
export const rescale = (raw, horizon = 'gw') => {
    const { median, sd } = CALIBRATION[horizon] || CALIBRATION.gw;
    return clamp(50 + (SCALE_PER_SD * (toNumber(raw) - median)) / sd);
};

/**
 * Cutoffs on the displayed scale. On the calibration sample, for the
 * gameweek view, ELITE is ~6% of FPL squads, STRONG ~13%, SOLID ~72%, THIN
 * ~9%; WEAK is the squad with several starters out. The five-week view
 * spreads a little wider (ELITE ~2%).
 *
 * The first cutoffs were 80/66/52/38 on the raw scale and nothing ever
 * reached ELITE or WEAK; the second set was fitted on 26 squads and, at 132,
 * let a quarter of them into ELITE. Measure before moving these.
 *
 * Rule 5 — colour is earned. SOLID is the shape of most squads most weeks and
 * takes no colour at all; a band only lights up when it is telling the reader
 * something they would act on.
 */
export const SCORE_BANDS = [
    { min: 85, word: 'ELITE', tone: 'live' },
    { min: 65, word: 'STRONG', tone: 'live' },
    { min: 35, word: 'SOLID', tone: 'neutral' },
    { min: 15, word: 'THIN', tone: 'warn' },
    { min: 0, word: 'WEAK', tone: 'destructive' },
];

export const bandFor = (score) =>
    SCORE_BANDS.find((band) => toNumber(score) >= band.min) || SCORE_BANDS[SCORE_BANDS.length - 1];

/**
 * The movement a reader sees: the difference between the two numbers on
 * screen, not between the two numbers underneath them.
 *
 * Scores are shown rounded and carried unrounded, and the gap between those is
 * exactly where this went wrong: 72.4 → 72.6 is a 0.2 move, so the label said
 * NO CHANGE, while the two numbers either side of it read 72 and 73. A label
 * that contradicts the figures beside it makes every figure on the page
 * suspect, so the label is derived from what is displayed.
 */
export const shownDelta = (before, after) =>
    Math.round(toNumber(after)) - Math.round(toNumber(before));

/* ------------------------------------------------------------------ */
/* The squad                                                           */
/* ------------------------------------------------------------------ */

/** The eleven carry the week; the bench is insurance and is weighted as such. */
const BENCH_SHARE = { gw: 0.1, run: 0.2 };

/**
 * How much of the eleven's rating comes from its worst three rather than its
 * mean.
 *
 * A flat mean of eleven percentiles regresses hard to the middle: on a plain
 * mean, 27 real squads spanning a 230-point season gap all scored between 56
 * and 70. The scale was barely used and no reweighting fixed it — the
 * arithmetic was the problem, not the weights. Leaning on the weak links
 * spreads the same squads across 40–69, which is what makes the bands below
 * mean anything.
 *
 * **What this does not do is agree with season points.** On seven squads it
 * looked like it did (r 0.6 → 0.8); at 27 that correlation is 0.16 and the
 * earlier figure was small-sample noise. It is a weak yardstick either way —
 * season points are what a squad has already banked and this rates what it is
 * about to do, so a 447-point squad with a hard week *should* rate below a
 * 300-point squad with an easy one. The justification for the floor is the
 * spread and the football, not a correlation.
 *
 * The football: a manager with nine good picks and two blanks does not have a
 * nine-tenths-good gameweek. The two blanks are what they talk about after.
 */
const FLOOR_SHARE = 0.4;
const FLOOR_PLAYERS = 3;

/**
 * How hard a wrong armband is punished. The captain is one of eleven picks and
 * scores twice, so getting him wrong costs real points — but the model's own
 * ordering of two good captains is not worth more confidence than this.
 */
const CAPTAIN_PENALTY = 0.3;
const CAPTAIN_PENALTY_CAP = 6;

const mean = (values) =>
    values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Rate a whole squad over a window of gameweeks.
 *
 * @param squad       the object `buildSquad` returns
 * @param bootstrap   for the element rows and the peer set behind every percentile
 * @param index       `buildFixtureIndex` output
 * @param events      the gameweeks to rate — one for the week, several for the run
 * @param gamesPlayed finished gameweeks, the denominator for minutes
 * @param horizon     'gw' or 'run', which picks the weights and the bench share
 * @param weights     overrides the horizon's weights, for tuning them against
 *                    a real squad rather than by argument
 */
export const scoreSquad = ({
    squad,
    bootstrap,
    index,
    events,
    gamesPlayed,
    horizon = 'gw',
    weights: override = null,
} = {}) => {
    const elements = bootstrap?.elements;
    if (!squad || !Array.isArray(elements) || elements.length === 0) return null;
    if (!Array.isArray(events) || events.length === 0) return null;
    // Without the fixture list every club reads as a blank, which would not be
    // a missing rating — it would be a confidently wrong one, a quarter of the
    // score at zero for eleven players who are all playing.
    if (!index) return null;

    const byId = new Map(elements.map((e) => [e.id, e]));
    const weights = override || (horizon === 'run' ? RUN_WEIGHTS : GW_WEIGHTS);
    const rate = (pick) =>
        ratePlayer({
            pick,
            element: byId.get(pick.id),
            elements,
            index,
            events,
            gamesPlayed,
            weights,
        });

    const starters = squad.starters.map(rate);
    const bench = squad.bench.map(rate);
    if (starters.length === 0) return null;

    /*
     * The captain scores twice, so he is worth twice as much of the rating.
     *
     * This reads the armband off the picks rather than the multiplier, for the
     * same reason `buildSquad` splits the eleven on the slot: under Bench
     * Boost every multiplier is 1 and under Triple Captain the captain's is 3,
     * so a multiplier here would weight the squad differently depending on a
     * chip that has nothing to do with how good the squad is.
     */
    const weightOf = (player) => (player.mark === 'C' || player.mark === 'TC' ? 2 : 1);
    const weighted = starters.reduce((total, p) => total + p.score * weightOf(p), 0);
    const divisor = starters.reduce((total, p) => total + weightOf(p), 0);
    const xi = divisor > 0 ? weighted / divisor : 0;

    const benchScore = mean(bench.map((p) => p.score));
    const benchShare = horizon === 'run' ? BENCH_SHARE.run : BENCH_SHARE.gw;

    // Who the model would captain, which is only interesting when it is not
    // who the manager captained.
    const ranked = [...starters].sort((a, b) => b.score - a.score);

    // The weak links, averaged. See FLOOR_SHARE.
    const floor = mean(ranked.slice(-Math.min(FLOOR_PLAYERS, ranked.length)).map((p) => p.score));
    const eleven = xi * (1 - FLOOR_SHARE) + floor * FLOOR_SHARE;
    const captain = starters.find((p) => p.mark === 'C' || p.mark === 'TC') || null;
    const best = ranked[0] || null;
    const captainGap = captain && best ? Math.max(0, best.score - captain.score) : 0;
    const captainPenalty = Math.min(CAPTAIN_PENALTY_CAP, captainGap * CAPTAIN_PENALTY);

    const base = eleven * (1 - benchShare) + benchScore * benchShare;
    // The model's own figure, on the player scale the breakdown uses.
    const raw = clamp(base - captainPenalty);
    // What the reader sees: the same rating placed against real squads.
    const score = rescale(raw, horizon);

    // Averaged across the eleven, so the breakdown is on the same 0–100 scale
    // as the headline and the two can be read against each other.
    const componentKeys = Object.keys(weights);
    const components = componentKeys.map((key) => ({
        key,
        label: COMPONENT_LABELS[key],
        weight: weights[key],
        value: clamp(mean(starters.map((p) => p.components[key] ?? 0))),
    }));

    return {
        score,
        raw,
        // From the number as displayed, for the same reason as `shownDelta`:
        // 84.6 is shown as 85, and 85 is ELITE, so it must not read STRONG.
        band: bandFor(Math.round(score)),
        // The plain mean of the eleven, kept separate from `score` so the
        // interface can show what the weak links cost. On the player scale,
        // like `floor` and `bench` — not on the displayed squad scale.
        xi,
        floor,
        bench: benchScore,
        components,
        players: starters,
        benchPlayers: bench,
        // The actionable half. Availability is already in `score`, so an
        // injured starter sorts to the bottom where he belongs.
        weakest: ranked.slice(-3).reverse(),
        strongest: ranked.slice(0, 3),
        captain,
        // Only named when the model disagrees by enough to be worth saying.
        betterCaptain: captain && best && best.id !== captain.id && captainGap >= 4 ? best : null,
        captainPenalty,
        blanks: starters.filter((p) => p.blanks > 0),
        doubles: starters.filter((p) => p.doubles > 0),
        unavailable: starters.filter((p) => p.available < 1),
        events,
        horizon,
    };
};
