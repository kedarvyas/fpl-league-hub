import { toNumber, getPositionShort, getPriceOutlook } from './playerStats';
import { formatMoney } from './myTeam';

/**
 * The transfer planner's arithmetic.
 *
 * Nothing in here touches React, because four of the numbers this page shows
 * are wrong in ways that never throw and never look wrong:
 *
 * 1. **Selling price is not the current price.** A player who has risen sells
 *    for the purchase price plus half the profit, rounded down to 0.1. Using
 *    `now_cost` inflates the budget by the whole rise.
 * 2. **Purchase price has two sources**, and a Free Hit poisons one of them.
 * 3. **Free transfers are not published.** They have to be accumulated across
 *    the season, and there is no figure to check the answer against.
 * 4. **A starter is `position <= 11`, not `multiplier > 0`** — that one is
 *    already solved in `lib/myTeam.js` and is reused rather than re-derived.
 *
 * Two conventions hold throughout:
 *
 * - **Money is integer tenths of a million.** `now_cost`, `bank`, `value` and
 *   `element_in_cost` all are, and the whole point of the rounding rule in
 *   `sellingPrice` is that it happens in tenths. Convert to £ only at the
 *   point of display, with `formatMoney`.
 * - Everything is null-safe. The season is one gameweek old and half of what
 *   the page reads does not exist yet.
 */

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

/**
 * The hit is **not in the API**. `game_settings` publishes the squad size, the
 * budget, the club limit and the transfer cap, but the four points a paid
 * transfer costs appear nowhere in the payload, so this is the one rule here
 * that is hardcoded rather than read.
 */
export const HIT_COST = 4;

/** From `game_settings`, verified 2026-08-27. */
export const SQUAD_SIZE = 15;
export const BUDGET = 1000;
export const CLUB_LIMIT = 3;
export const TRANSFERS_CAP = 20;

/** `max_extra_free_transfers` is 4 — one per week plus four banked. */
export const MAX_FREE_TRANSFERS = 5;

/** `element_types[].squad_select`. */
export const SQUAD_SHAPE = { 1: 2, 2: 5, 3: 5, 4: 3 };

/**
 * Legal starting elevens, from `element_types[].squad_min_play` /
 * `squad_max_play`. Exactly one keeper, 3–5 defenders, 2–5 midfielders, 1–3
 * forwards — which is why a squad of 2/5/5/3 always has *some* legal eleven in
 * it, and why the shape rules and the formation rules are separate checks.
 */
export const FORMATION = { 1: [1, 1], 2: [3, 5], 3: [2, 5], 4: [1, 3] };

export const STARTING_XI = 11;

/** The two chips that change the transfer rules rather than the scoring. */
export const TRANSFER_CHIPS = {
    wildcard: 'WILDCARD',
    freehit: 'FREE HIT',
};

export const isTransferChip = (chip) => Object.prototype.hasOwnProperty.call(TRANSFER_CHIPS, chip || '');

/**
 * The transfer chips this manager can still play in `targetEvent`.
 *
 * Chips come in half-season windows — `bootstrap.chips` carries a Wildcard for
 * GW2–19 and another for GW20–38 — so "used" is per window, not per season. A
 * Wildcard played in GW5 does not spend the second-half one.
 */
export const availableTransferChips = (bootstrap, used, targetEvent) => {
    const target = toNumber(targetEvent, null);
    if (target === null) return [];

    const played = (used || []).map((c) => ({ name: c?.name, event: toNumber(c?.event, null) }));

    return (bootstrap?.chips || [])
        .filter((c) => isTransferChip(c?.name))
        .filter((c) => {
            const from = toNumber(c.start_event, 1);
            const to = toNumber(c.stop_event, 38);
            if (target < from || target > to) return false;
            return !played.some((p) => p.name === c.name && p.event !== null && p.event >= from && p.event <= to);
        })
        .map((c) => ({ name: c.name, label: TRANSFER_CHIPS[c.name] }));
};

/* ------------------------------------------------------------------ */
/* Selling price                                                       */
/* ------------------------------------------------------------------ */

/**
 * What a player is worth on the way out.
 *
 * `game_settings.transfers_sell_on_fee` is 0.5 and
 * `game_config.rules.element_sell_at_purchase_price` is false: you keep the
 * purchase price plus half of any profit, rounded **down** to the nearest 0.1.
 * A fall is taken in full.
 *
 * The rounding is why this has to happen in tenths. A single 0.1 rise is worth
 * nothing on the way out — `Math.floor(1 / 2)` is 0 — which is the case most
 * likely to be got wrong by a plausible-looking `(now + purchase) / 2`.
 *
 * With no purchase price the honest answer is `now_cost`: assuming no profit
 * understates the budget rather than overstating it, and a budget that is too
 * small produces a plan that is legal.
 */
export const sellingPrice = (purchase, nowCost) => {
    const now = toNumber(nowCost);
    const paid = toNumber(purchase, null);
    if (paid === null) return now;
    if (now <= paid) return now;
    return paid + Math.floor((now - paid) / 2);
};

/**
 * Element id → the price it was bought at, from `entry/{id}/transfers/`.
 *
 * **Free Hit transfers have to come out first.** They appear in this list like
 * any other, but the Free Hit squad is thrown away at the end of its gameweek
 * and the previous squad comes back — so a player "bought" on a Free Hit was
 * never bought, and taking `element_in_cost` from that row gives the wrong
 * purchase price for whoever really owns the shirt.
 *
 * Sorted ascending so that a player bought, sold and bought again keeps the
 * most recent price. `id` is the tiebreak: `time` is a string and two
 * transfers submitted together share it.
 */
export const buildPurchasePrices = (transfers, chips) => {
    const freeHitEvents = new Set(
        (chips || [])
            .filter((c) => c?.name === 'freehit')
            .map((c) => toNumber(c.event, null))
            .filter((e) => e !== null),
    );

    const prices = new Map();
    (transfers || [])
        .filter((t) => !freeHitEvents.has(toNumber(t?.event, null)))
        .slice()
        .sort(
            (a, b) =>
                toNumber(a?.event) - toNumber(b?.event) ||
                String(a?.time || '').localeCompare(String(b?.time || '')) ||
                toNumber(a?.element_in) - toNumber(b?.element_in),
        )
        .forEach((t) => {
            const element = toNumber(t?.element_in, null);
            if (element !== null) prices.set(element, toNumber(t?.element_in_cost));
        });

    return prices;
};

/**
 * The price this element was bought at.
 *
 * Two sources, and both are needed. A player transferred in at some point has
 * a row in the transfer list. One still there from the opening squad has no
 * row at all, and their purchase price is `now_cost - cost_change_start` —
 * today's price minus everything it has moved since the season began.
 */
export const purchasePriceOf = (element, prices) => {
    if (!element) return null;
    const bought = prices?.get(element.id);
    if (bought !== undefined) return bought;
    return toNumber(element.now_cost) - toNumber(element.cost_change_start);
};

/* ------------------------------------------------------------------ */
/* Free transfers                                                      */
/* ------------------------------------------------------------------ */

/**
 * How many free transfers the manager has going into `targetEvent`.
 *
 * **There is no public endpoint for this.** The authenticated `my-team/{id}/`
 * carries the figure; we have no auth against FPL and are not adding it. So it
 * is accumulated from `entry/{id}/history/`, one gameweek at a time.
 *
 * The load-bearing trick is deriving how many transfers were *free* from what
 * they *cost* rather than from how many were made: `event_transfers_cost` is
 * FPL's own statement of how many were paid for, so the split between free and
 * paid never has to be guessed. That makes the accumulation self-correcting —
 * a gameweek this misreads cannot compound into the next.
 *
 * A Wildcard or Free Hit covers every transfer made that week and banked free
 * transfers survive it, so those gameweeks consume none.
 *
 * The first gameweek a manager plays is excluded: the opening squad is
 * unlimited and free, and a manager who joined late has `started_event > 1`.
 *
 * Because none of this can be checked against a figure FPL publishes, the
 * result is presented as derived and the reader can overrule it. `steps` is
 * the working, so the page can show how it got there.
 */
export const deriveFreeTransfers = ({ current = [], chips = [], startedEvent = 1, targetEvent } = {}) => {
    const rows = new Map(
        (current || []).map((row) => [toNumber(row?.event, null), row]).filter(([e]) => e !== null),
    );
    const chipAt = new Map(
        (chips || []).map((c) => [toNumber(c?.event, null), c?.name]).filter(([e]) => e !== null),
    );

    const target = toNumber(targetEvent, null);
    const start = Math.max(1, toNumber(startedEvent, 1));
    const steps = [];

    // Going into the gameweek after the first one played, everyone has one.
    let free = 1;
    if (target === null) return { free, steps };

    for (let event = start + 1; event < target; event += 1) {
        const row = rows.get(event);
        const made = toNumber(row?.event_transfers);
        // The cost is always a whole multiple of the hit, so this is a count.
        const paid = toNumber(row?.event_transfers_cost) / HIT_COST;
        const chip = chipAt.get(event) || null;
        const covered = isTransferChip(chip);
        const used = covered ? 0 : Math.max(0, made - paid);

        const before = free;
        free = Math.min(MAX_FREE_TRANSFERS, Math.max(0, free - used) + 1);
        steps.push({ event, before, made, paid, chip, used, after: free, played: !!row });
    }

    return { free, steps };
};

/* ------------------------------------------------------------------ */
/* The squad                                                           */
/* ------------------------------------------------------------------ */

/** The fields the planner reads off a bootstrap element, and nothing else. */
export const shapePlayer = (element, clubs) => {
    if (!element) return null;
    return {
        id: element.id,
        code: element.code ?? null,
        name: element.web_name || 'Unknown',
        clubId: element.team ?? null,
        club: clubs?.get(element.team) || '—',
        elementType: element.element_type ?? null,
        position: getPositionShort(element.element_type),
        price: toNumber(element.now_cost),
        status: element.status || 'a',
        news: element.news || '',
        // `null` genuinely means "no doubt attached", which is not the same as 0.
        chance: element.chance_of_playing_next_round ?? null,
        // 45 players have left the league. They are still `can_transact`,
        // because you can sell them — you just cannot buy them.
        canSelect: element.can_select !== false,
        epNext: toNumber(element.ep_next, null),
        // Dynamic pricing, new this season. `price_change_percent` is progress
        // toward the next change where 100% is the threshold — not a price and
        // not a probability, so it is never rendered as an amount.
        // `getPriceOutlook` already normalises the block; only the two figures
        // a card has room for are kept.
        priceMomentum: getPriceOutlook(element)?.momentum ?? null,
        priceLocked: !!element.price_change_locked_until,
    };
};

export const clubMap = (bootstrap) =>
    new Map((bootstrap?.teams || []).map((t) => [t.id, t.short_name]));

export const elementMap = (bootstrap) =>
    new Map((bootstrap?.elements || []).map((e) => [e.id, e]));

/**
 * The fifteen you own, priced for selling.
 *
 * The baseline is the **last gameweek that started**, never the one being
 * planned: `entry/{id}/event/{next}/picks` is a 404 until that gameweek's
 * deadline passes. That is the right baseline anyway — you plan transfers from
 * the squad you hold — but it has to be said in the UI, because a manager who
 * has already made a move on fpl.com will not see it here.
 */
export const buildPlanBase = ({ picks, bootstrap, transfers, chips }) => {
    const list = picks?.picks;
    if (!Array.isArray(list) || list.length === 0) return null;

    const elements = elementMap(bootstrap);
    const clubs = clubMap(bootstrap);
    const prices = buildPurchasePrices(transfers, chips);

    return list
        .slice()
        .sort((a, b) => toNumber(a.position) - toNumber(b.position))
        .map((pick) => {
            const element = elements.get(pick.element);
            const player = shapePlayer(element, clubs) || {
                id: pick.element,
                name: 'Unknown',
                club: '—',
                elementType: pick.element_type ?? null,
                position: getPositionShort(pick.element_type),
                price: 0,
                status: 'a',
                news: '',
                chance: null,
                canSelect: true,
                epNext: null,
                code: null,
                clubId: null,
            };
            const purchase = purchasePriceOf(element, prices);

            return {
                ...player,
                slot: toNumber(pick.position),
                purchase,
                selling: sellingPrice(purchase, player.price),
                // A rise you only half keep is worth saying out loud.
                priceMoved: purchase === null ? 0 : player.price - purchase,
                // The armband as it stood last gameweek — the starting point
                // for the team sheet below.
                wasCaptain: !!pick.is_captain,
                wasVice: !!pick.is_vice_captain,
            };
        });
};

/* ------------------------------------------------------------------ */
/* The plan                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* The team sheet                                                      */
/* ------------------------------------------------------------------ */

/**
 * Who starts, who is on the bench and in what order, and who wears the
 * armbands.
 *
 * **Everything here is keyed by baseline slot, never by player id.** A slot's
 * position cannot change — the picker is filtered to the slot's own position —
 * so a slot is a stable handle, while a player id stops existing the moment
 * they are transferred out. Keying by slot also gives the behaviour people
 * expect for free: transfer out your captain and the player who replaces them
 * inherits the armband, because the armband was on the shirt, not the name.
 */
export const baselineSheet = (base) => {
    const list = base || [];
    const captain = list.find((p) => p.wasCaptain);
    const vice = list.find((p) => p.wasVice);

    return {
        // FPL numbers picks 1–11 for the eleven and 12–15 for the bench, in
        // substitution order. That ordering is the sheet we start from.
        xi: list.filter((p) => p.slot <= STARTING_XI).map((p) => p.slot),
        bench: list.filter((p) => p.slot > STARTING_XI).map((p) => p.slot),
        captain: captain ? captain.slot : null,
        vice: vice ? vice.slot : null,
    };
};

/**
 * Swap two slots wherever they each sit.
 *
 * One operation covers all three cases, because each is the same move seen
 * from a different pair of places: one in the eleven and one on the bench is a
 * substitution, two in the eleven is a positional shuffle, two on the bench
 * re-orders substitution priority.
 *
 * Illegal results are reachable on purpose — benching your only keeper leaves
 * a formation the validator names rather than a swap the interface refuses.
 * See `validatePlan`.
 */
export const swapSheet = (sheet, a, b) => {
    if (!sheet || a === b) return sheet;
    const swap = (list) => (list || []).map((slot) => (slot === a ? b : slot === b ? a : slot));
    return { ...sheet, xi: swap(sheet.xi), bench: swap(sheet.bench) };
};

/** The armband. Naming the current captain as vice swaps the two. */
export const setArmband = (sheet, slot, role) => {
    if (!sheet) return sheet;
    const other = role === 'captain' ? 'vice' : 'captain';
    const next = { ...sheet, [role]: slot };
    if (sheet[other] === slot) next[other] = sheet[role] ?? null;
    return next;
};

/**
 * A stored sheet cannot be trusted to describe the current squad — the plan it
 * was saved against may since have changed, and a sheet that is missing a slot
 * or lists one twice would silently drop a player off the pitch. Anything that
 * does not reconcile falls back to the baseline arrangement.
 */
export const reconcileSheet = (sheet, base) => {
    const fallback = baselineSheet(base);
    if (!sheet || !Array.isArray(sheet.xi) || !Array.isArray(sheet.bench)) return fallback;

    const slots = new Set((base || []).map((p) => p.slot));
    const listed = [...sheet.xi, ...sheet.bench];

    const complete =
        sheet.xi.length === STARTING_XI &&
        listed.length === slots.size &&
        new Set(listed).size === listed.length &&
        listed.every((slot) => slots.has(slot));

    if (!complete) return fallback;

    return {
        xi: sheet.xi,
        bench: sheet.bench,
        captain: slots.has(sheet.captain) ? sheet.captain : fallback.captain,
        vice: slots.has(sheet.vice) ? sheet.vice : fallback.vice,
    };
};

/** The outfield shape, in the shorthand every manager writes. */
export const formationOf = (xi) => {
    const count = (type) => (xi || []).filter((entry) => entry?.player?.elementType === type).length;
    return `${count(2)}-${count(3)}-${count(4)}`;
};

/**
 * The stored plan is `{ entry, targetEvent, moves: [{ out, in }] }`, and it is
 * shaped that way so a chained multi-gameweek plan stays possible later as a
 * *list* of these. Chaining is explicitly out of scope: a different squad and
 * a different budget in each of GW+1, +2 and +3 is a different data model, not
 * a bigger version of this one.
 */
export const emptyPlan = (entry, targetEvent) => ({
    entry: entry ? String(entry) : null,
    targetEvent: toNumber(targetEvent, null),
    moves: [],
});

/**
 * Lay the moves over the baseline fifteen.
 *
 * A move with no `in` yet is a real state, not an error: marking a player out
 * is how you open the slot, and the money is released immediately so the
 * picker can be filtered by what you can now afford. It leaves the squad
 * fourteen strong, which is reported as incomplete rather than illegal.
 */
export const applyPlan = (base, plan, bootstrap) => {
    const elements = elementMap(bootstrap);
    const clubs = clubMap(bootstrap);
    const moves = new Map(
        (plan?.moves || [])
            .map((m) => [toNumber(m?.out, null), m])
            .filter(([out]) => out !== null),
    );

    const slots = (base || []).map((original) => {
        const stored = moves.get(original.id);
        // Bringing back the player you took out is not a transfer, it is a
        // change of mind. A stored plan can hold one, so it is neutralised
        // here rather than only prevented in the picker.
        const move = stored && stored.in === original.id ? null : stored;
        const incoming = move?.in ? shapePlayer(elements.get(move.in), clubs) : null;

        return {
            slot: original.slot,
            original,
            incoming,
            removed: !!move,
            // What the planned squad actually holds in this slot.
            player: incoming || (move ? null : original),
        };
    });

    // The team sheet is laid over the same slots, so a transfer keeps the
    // incoming player in the outgoing player's place in the eleven.
    const sheet = reconcileSheet(plan?.sheet, base);
    const bySlot = new Map(slots.map((entry) => [entry.slot, entry]));
    const take = (list) => (list || []).map((slot) => bySlot.get(slot)).filter(Boolean);

    const xi = take(sheet.xi);

    return {
        slots,
        sheet,
        xi,
        bench: take(sheet.bench),
        captain: bySlot.get(sheet.captain) || null,
        vice: bySlot.get(sheet.vice) || null,
        formation: formationOf(xi),
        // A transfer is a completed pair. An open slot is not one yet.
        completed: slots.filter((s) => s.removed && s.incoming),
        pending: slots.filter((s) => s.removed && !s.incoming),
        squad: slots.map((s) => s.player).filter(Boolean),
    };
};

/**
 * The three numbers that constrain every decision.
 *
 * A chip makes transfers unlimited and free, which is the state most people
 * actually want to plan in, so it zeroes the hit rather than hiding the strip.
 */
export const planFinances = ({ applied, bank, freeTransfers, chip }) => {
    const sales = applied.slots
        .filter((s) => s.removed)
        .reduce((total, s) => total + toNumber(s.original.selling), 0);
    const buys = applied.slots.reduce((total, s) => total + toNumber(s.incoming?.price), 0);

    const bankAfter = toNumber(bank) + sales - buys;
    const transfers = applied.completed.length;
    const chipActive = isTransferChip(chip);
    const free = chipActive ? Infinity : Math.max(0, toNumber(freeTransfers));
    const paid = chipActive ? 0 : Math.max(0, transfers - free);

    return {
        sales,
        buys,
        bankBefore: toNumber(bank),
        bankAfter,
        transfers,
        free,
        paid,
        hit: paid * HIT_COST,
        chip: chipActive ? chip : null,
        overCap: transfers > TRANSFERS_CAP,
    };
};

/**
 * Everything wrong with the plan, named rather than prevented.
 *
 * Rule 4 by analogy: an illegal squad is drawn, not hidden. The picker filters
 * to the slot's position, to players still in the league and to players not
 * already owned — those are structural — and leaves budget and the club limit
 * reachable, because "this costs 0.4 more than you have" is information and a
 * disabled row is not.
 */
export const validatePlan = ({ applied, finances }) => {
    const issues = [];
    const squad = applied.squad;

    if (finances.bankAfter < 0) {
        issues.push({
            key: 'budget',
            label: 'OVER BUDGET',
            detail: `${formatMoney(Math.abs(finances.bankAfter))} MORE THAN YOU HAVE`,
        });
    }

    const byClub = new Map();
    squad.forEach((p) => byClub.set(p.club, (byClub.get(p.club) || 0) + 1));
    [...byClub.entries()]
        .filter(([, n]) => n > CLUB_LIMIT)
        .forEach(([club, n]) =>
            issues.push({
                key: `club-${club}`,
                label: 'CLUB LIMIT',
                detail: `${n} FROM ${club} · MAX ${CLUB_LIMIT}`,
            }),
        );

    const seen = new Set();
    squad.forEach((p) => {
        if (seen.has(p.id)) {
            issues.push({ key: `dup-${p.id}`, label: 'DUPLICATE', detail: `${p.name.toUpperCase()} IS IN TWICE` });
        }
        seen.add(p.id);
    });

    // Only meaningful once every slot is filled — an open slot is short by
    // definition and is reported as incomplete instead.
    if (applied.pending.length === 0) {
        Object.entries(SQUAD_SHAPE).forEach(([type, want]) => {
            const have = squad.filter((p) => p.elementType === Number(type)).length;
            if (have !== want) {
                issues.push({
                    key: `shape-${type}`,
                    label: 'SQUAD SHAPE',
                    detail: `${have} ${getPositionShort(Number(type))} · NEEDS ${want}`,
                });
            }
        });
    }

    applied.slots
        .filter((s) => s.incoming && !s.incoming.canSelect)
        .forEach((s) =>
            issues.push({
                key: `select-${s.incoming.id}`,
                label: 'UNAVAILABLE',
                detail: `${s.incoming.name.toUpperCase()} HAS LEFT THE LEAGUE`,
            }),
        );

    // The eleven, separately from the fifteen. A squad of 2/5/5/3 always
    // contains *some* legal eleven, so these two can never be the same check —
    // and an eleven only goes wrong once someone moves it.
    // Guarded on the sheet existing at all rather than assumed: the squad
    // checks above are meaningful for a plan with no team sheet, and reporting
    // "0 GKP STARTING" against an absent eleven would be noise, not a finding.
    const filledXi = (applied.xi || []).filter((entry) => entry.player);
    if (applied.xi && applied.pending.length === 0) {
        Object.entries(FORMATION).forEach(([type, [min, max]]) => {
            const have = filledXi.filter((entry) => entry.player.elementType === Number(type)).length;
            if (have < min || have > max) {
                issues.push({
                    key: `formation-${type}`,
                    label: 'FORMATION',
                    detail: `${have} ${getPositionShort(Number(type))} STARTING · NEEDS ${
                        min === max ? min : `${min}–${max}`
                    }`,
                });
            }
        });
    }

    const inXi = new Set((applied.xi || []).map((entry) => entry.slot));
    if (!applied.xi) {
        // No sheet to check.
    } else if (!applied.captain) {
        issues.push({ key: 'captain', label: 'NO CAPTAIN', detail: 'NOBODY IS WEARING THE ARMBAND' });
    } else if (!inXi.has(applied.captain.slot)) {
        // Worth naming rather than silently reassigning: FPL scores the vice
        // instead, which is a different team to the one you thought you picked.
        issues.push({
            key: 'captain-benched',
            label: 'CAPTAIN BENCHED',
            detail: `${(applied.captain.player || applied.captain.original).name.toUpperCase()} IS NOT STARTING`,
        });
    }

    if (applied.vice && !inXi.has(applied.vice.slot)) {
        issues.push({
            key: 'vice-benched',
            label: 'VICE BENCHED',
            detail: `${(applied.vice.player || applied.vice.original).name.toUpperCase()} IS NOT STARTING`,
        });
    }

    if (finances.overCap) {
        issues.push({
            key: 'cap',
            label: 'TRANSFER CAP',
            detail: `${finances.transfers} MOVES · MAX ${TRANSFERS_CAP}`,
        });
    }

    return issues;
};

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

/**
 * Club id → gameweek → **array** of fixtures.
 *
 * The array is the whole point. A club can have no fixture in a gameweek (a
 * blank) or two (a double), so a `.find()` here is the bug waiting to happen:
 * it silently drops the second leg of a double and returns `undefined` for a
 * blank, which then renders as a fixture against nobody. None exist yet this
 * season — all 38 gameweeks currently have exactly ten — but they arrive with
 * the first cup postponement.
 */
export const buildFixtureIndex = (fixtures, clubs) => {
    const index = new Map();

    const add = (teamId, event, entry) => {
        if (!index.has(teamId)) index.set(teamId, new Map());
        const byEvent = index.get(teamId);
        if (!byEvent.has(event)) byEvent.set(event, []);
        byEvent.get(event).push(entry);
    };

    (fixtures || []).forEach((f) => {
        const event = toNumber(f?.event, null);
        // A fixture with no gameweek is postponed and not yet rescheduled.
        if (event === null) return;
        add(f.team_h, event, {
            opponent: clubs?.get(f.team_a) || '—',
            opponentId: f.team_a,
            isHome: true,
            difficulty: toNumber(f.team_h_difficulty, null),
            kickoff: f.kickoff_time || null,
        });
        add(f.team_a, event, {
            opponent: clubs?.get(f.team_h) || '—',
            opponentId: f.team_h,
            isHome: false,
            difficulty: toNumber(f.team_a_difficulty, null),
            kickoff: f.kickoff_time || null,
        });
    });

    return index;
};

/** Always an array. Empty is a blank gameweek and is a real answer. */
export const fixturesFor = (index, clubId, event) => index?.get(clubId)?.get(event) || [];

/** The gameweeks the grid covers, clipped to what the season actually has. */
export const planEvents = (bootstrap, from, count = 3) => {
    const ids = new Set((bootstrap?.events || []).map((e) => toNumber(e.id, null)));
    const start = toNumber(from, null);
    if (start === null) return [];
    return Array.from({ length: count }, (_, i) => start + i).filter((e) => ids.has(e));
};

/** A fixture is a good one at FDR 3 or better — the same line `lib/fdr.js` draws. */
export const isGoodFixture = (fixture) => fixture?.difficulty !== null && fixture.difficulty <= 3;

/** Per-row: how much of this player's window is kind. Counts fixtures, so a
 *  double gameweek is worth two and a blank is worth none. */
export const summariseRun = (runs) => {
    const all = (runs || []).flat();
    return { good: all.filter(isGoodFixture).length, total: all.length };
};

/** Per-column: how many of the planned fifteen have a good fixture that week. */
export const summariseColumn = (cells) =>
    (cells || []).filter((fixtures) => (fixtures || []).some(isGoodFixture)).length;

/* ------------------------------------------------------------------ */
/* Display                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tenths of a million. Never do the arithmetic on the £ value — floating-point
 * pounds produce £0.30000000000000004 and a budget wrong by 0.1.
 *
 * Re-exported rather than redefined so the app has one money format.
 */
export { formatMoney };

export const formatMoneyDelta = (tenths) => {
    const value = toNumber(tenths);
    if (value === 0) return formatMoney(0);
    return `${value > 0 ? '+' : '−'}${formatMoney(Math.abs(value))}`;
};

/** Availability, in the words FPL uses for `status`. */
export const STATUS_WORDS = {
    d: 'DOUBT',
    i: 'INJURED',
    s: 'SUSPENDED',
    u: 'UNAVAILABLE',
    n: 'INELIGIBLE',
};

export const statusFlag = (player) => {
    if (!player || player.status === 'a') return null;
    const word = STATUS_WORDS[player.status] || 'FLAGGED';
    const chance = player.chance;
    return { word, chance, severe: player.status !== 'd', news: player.news };
};

/**
 * Time left before the deadline, as whole units. Returns null once it passes,
 * because a negative countdown is worse than no countdown.
 */
export const untilDeadline = (isoString, now = Date.now()) => {
    if (!isoString) return null;
    const deadline = Date.parse(isoString);
    if (!Number.isFinite(deadline)) return null;
    const ms = deadline - now;
    if (ms <= 0) return null;

    const minutes = Math.floor(ms / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return { days, hours, minutes: minutes % 60, total: minutes };
};

export const formatCountdown = (left) => {
    if (!left) return 'DEADLINE PASSED';
    if (left.days > 0) return `${left.days}D ${left.hours}H LEFT`;
    if (left.hours > 0) return `${left.hours}H ${left.minutes}M LEFT`;
    return `${left.minutes}M LEFT`;
};
