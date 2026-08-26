import { toNumber } from './playerStats';

/**
 * Fixture difficulty banding. Kept in one place so the hues are never inlined
 * at a call site and the bands can move if FPL rescales them.
 */
export const fdrBand = (difficulty) => {
    const d = toNumber(difficulty);
    if (d <= 2) return { key: 'easy', word: 'EASY', bg: 'bg-success', text: 'text-success' };
    if (d === 3) return { key: 'even', word: 'EVEN', bg: 'bg-warn', text: 'text-warn' };
    return { key: 'hard', word: 'HARD', bg: 'bg-destructive', text: 'text-destructive' };
};

/**
 * Average difficulty, the best consecutive window, and the hardest single
 * fixture. The API gives five fixtures and a 1–5 rating and nothing else, so
 * everything here is derived from those two facts and no further.
 */
export const summariseFixtures = (fixtures = []) => {
    const list = fixtures.slice(0, 5);
    if (list.length === 0) return null;

    const diffs = list.map((f) => toNumber(f.difficulty));
    const average = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const good = diffs.filter((d) => d <= 3).length;

    // Best window: the longest run of consecutive fixtures at 3 or better.
    let bestStart = 0, bestLen = 0, curStart = 0, curLen = 0;
    diffs.forEach((d, i) => {
        if (d <= 3) {
            if (curLen === 0) curStart = i;
            curLen += 1;
            if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
        } else {
            curLen = 0;
        }
    });

    const hardestIdx = diffs.indexOf(Math.max(...diffs));

    return {
        average,
        good,
        total: list.length,
        window: bestLen > 0
            ? { from: list[bestStart], to: list[bestStart + bestLen - 1], length: bestLen }
            : null,
        hardest: list[hardestIdx],
    };
};
