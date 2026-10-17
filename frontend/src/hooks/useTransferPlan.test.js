import { act, renderHook } from '@testing-library/react';
import { planStorageKey, useTransferPlan } from './useTransferPlan';

/**
 * The planner tells the reader their plan is saved, so the hook has to know
 * when it is not. A blocked or full `localStorage` used to be swallowed, and
 * the plan lived in memory only — gone on the next reload, silently.
 */

afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
});

describe('useTransferPlan persistence', () => {
    it('writes every change and reports it saved', () => {
        const { result } = renderHook(() => useTransferPlan('5367810', 7));

        act(() => {
            result.current[1]((plan) => ({ ...plan, moves: [{ out: 1, in: 2 }] }));
        });

        const stored = JSON.parse(window.localStorage.getItem(planStorageKey('5367810', 7)));
        expect(stored.moves).toEqual([{ out: 1, in: 2 }]);
        expect(result.current[3]).toBe(true);
    });

    it('reports a write that storage refused instead of claiming it saved', () => {
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        const { result } = renderHook(() => useTransferPlan('5367810', 7));

        act(() => {
            result.current[1]((plan) => ({ ...plan, moves: [{ out: 1, in: 2 }] }));
        });

        // The plan still works in memory — it just is not kept.
        expect(result.current[0].moves).toEqual([{ out: 1, in: 2 }]);
        expect(result.current[3]).toBe(false);
    });

    it('keeps the three-element destructure working', () => {
        // Callers that predate the save flag must not break.
        const { result } = renderHook(() => useTransferPlan('5367810', 7));
        const [plan, update, reset] = result.current;
        expect(plan.moves).toEqual([]);
        expect(typeof update).toBe('function');
        expect(typeof reset).toBe('function');
    });
});
