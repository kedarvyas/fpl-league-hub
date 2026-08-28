import React from 'react';
import { render, screen, within } from '@testing-library/react';
import PlanPitch from './PlanPitch';
import { applyPlan, buildFixtureIndex, buildPlanBase, clubMap } from '../lib/transferPlan';

/**
 * The pitch, for the cases that are awkward to arrange through the whole page.
 *
 * The three that matter are all about *absence*, and they are three different
 * things that would otherwise look identical: a club with no fixture that week
 * (a blank), a squad slot with nobody in it, and a fixture list that failed to
 * load. Only the first is a statement about football, and drawing the other
 * two the same way would make the page assert things that are not true.
 *
 * `applied` is built with the real `buildPlanBase` / `applyPlan` rather than
 * hand-written, so the shape the component receives is the shape it receives
 * in the app.
 */

const TYPES = [1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 1, 2, 2, 3];
const CLUBS = [
    { id: 1, short_name: 'ARS' }, { id: 2, short_name: 'LIV' }, { id: 3, short_name: 'MCI' },
    { id: 4, short_name: 'EVE' }, { id: 5, short_name: 'BOU' },
];

const bootstrap = {
    teams: CLUBS,
    elements: [
        ...TYPES.map((t, i) => ({
            id: i + 1,
            code: i + 1,
            web_name: `P${i + 1}`,
            element_type: t,
            team: (i % 5) + 1,
            now_cost: 50,
            cost_change_start: 0,
            status: 'a',
            chance_of_playing_next_round: null,
            news: '',
            can_select: true,
            ep_next: '2.0',
            price_change_projections: [],
        })),
    ],
};

const picks = {
    entry_history: { bank: 0 },
    picks: TYPES.map((t, i) => ({
        element: i + 1,
        position: i + 1,
        element_type: t,
        multiplier: i < 11 ? 1 : 0,
        is_captain: i === 8,
        is_vice_captain: i === 4,
    })),
};

const EVENTS = [2, 3, 4];

// Club 1 plays twice in GW2 (a double) and not at all in GW3 (a blank).
const fixtures = [
    { event: 2, team_h: 1, team_a: 2, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 2, team_h: 3, team_a: 1, team_h_difficulty: 3, team_a_difficulty: 3 },
    { event: 3, team_h: 2, team_a: 3, team_h_difficulty: 2, team_a_difficulty: 4 },
    { event: 4, team_h: 1, team_a: 4, team_h_difficulty: 2, team_a_difficulty: 4 },
];

const base = buildPlanBase({ picks, bootstrap });
const index = buildFixtureIndex(fixtures, clubMap(bootstrap));

const renderPitch = (plan = { moves: [] }, props = {}) =>
    render(
        <PlanPitch
            applied={applyPlan(base, plan, bootstrap)}
            mode="three"
            events={EVENTS}
            fixtureIndex={index}
            fixturesReady
            selected={null}
            onSelect={() => {}}
            onFill={() => {}}
            {...props}
        />,
    );

/**
 * P1 is in club 1, which has the double and the blank.
 *
 * Matched on text content rather than accessible name: the name computation
 * inserts whitespace between the spans, and every assertion below needs to be
 * scoped *inside* one card anyway — a bare `getByText('LIV')` would also match
 * the club label on whichever card belongs to Liverpool.
 */
const doubled = () =>
    [...document.querySelectorAll('button[aria-pressed]')].find((b) =>
        b.textContent.startsWith('P1£'),
    );

describe('the shape of the pitch', () => {
    it('puts eleven above the line and four on the bench', () => {
        const { container } = renderPitch();
        expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(15);
        expect(screen.getByText('BENCH · IN SUBSTITUTION ORDER')).toBeInTheDocument();
    });

    it('marks the captain and the vice, and nobody else', () => {
        renderPitch();
        expect(screen.getAllByText('C')).toHaveLength(1);
        expect(screen.getAllByText('V')).toHaveLength(1);
    });

    it('says prices are what a player sells for', () => {
        // The one number on the page that disagrees with the FPL site on
        // purpose, so it is stated rather than left to be discovered.
        renderPitch();
        expect(screen.getByText(/PRICES ON THE PITCH ARE WHAT EACH PLAYER SELLS FOR/)).toBeInTheDocument();
    });
});

describe('blanks and doubles', () => {
    it('shows both legs of a double gameweek', () => {
        // A `.find()` on the fixture list would silently drop the second.
        renderPitch();
        const card = doubled();
        expect(within(card).getByText('LIV')).toBeInTheDocument();
        expect(within(card).getByText('MCI')).toBeInTheDocument();
    });

    it('draws a blank gameweek on the same geometry as a fixture', () => {
        // The pitch has ~23px per cell in this mode, so a blank is an em dash
        // rather than the word the FIXTURES grid has room to spell out. What
        // matters is that it occupies a cell instead of collapsing, so the row
        // is still read by how much ink is in it.
        renderPitch();
        expect(within(doubled()).getByText('—')).toBeInTheDocument();
    });

    it('draws nothing at all when the fixtures never loaded', () => {
        // "We could not fetch this" is not "this club does not play" — saying
        // BLANK here would be a specific and false claim about every club.
        renderPitch({ moves: [] }, { fixturesReady: false });
        // Neither an opponent nor the em dash that means "no opponent".
        // Scoped to a card whose own club is ARS, so LIV here could only be a
        // fixture, never the club label.
        expect(within(doubled()).queryByText('LIV')).not.toBeInTheDocument();
        expect(within(doubled()).queryByText('—')).not.toBeInTheDocument();
    });
});

describe('a slot with nobody in it', () => {
    const plan = { moves: [{ out: 3, in: null }] };

    it('invites a replacement in the position the slot needs', () => {
        renderPitch(plan);
        expect(screen.getByRole('button', { name: /Choose a DEF to replace P3/ })).toBeInTheDocument();
    });

    it('does not describe the empty slot as a blank gameweek', () => {
        renderPitch(plan);
        const slot = screen.getByRole('button', { name: /Choose a DEF to replace P3/ });
        expect(within(slot).queryByText('BLANK')).not.toBeInTheDocument();
    });

    it('leaves the other fourteen selectable', () => {
        const { container } = renderPitch(plan);
        expect(container.querySelectorAll('button[aria-pressed]')).toHaveLength(14);
    });
});

describe('selection', () => {
    it('marks the selected card as pressed and hides its difficulty bars', () => {
        // The bars are fill tokens tuned against --panel; the selected card
        // inverts to --inverted, where they are not.
        renderPitch({ moves: [] }, { selected: 1 });
        const card = doubled();
        expect(card).toHaveAttribute('aria-pressed', 'true');
        expect(within(card).queryByText('LIV')).not.toBeInTheDocument();
    });
});
