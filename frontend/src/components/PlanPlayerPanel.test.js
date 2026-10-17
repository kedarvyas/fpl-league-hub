import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PlanPlayerPanel from './PlanPlayerPanel';

/**
 * The search, and what it hides.
 *
 * `owned` leaves out everyone in the planned squad and, while a slot is being
 * filled, the player who started in it. Both are right. What these guard is
 * that a search for one of them says so instead of coming back empty —
 * transfer Hall out, type "Hall", and an empty list reads as a broken search.
 */

const player = (id, name, type, club) => ({
    id,
    web_name: name,
    first_name: name,
    second_name: name,
    element_type: type,
    team: 1,
    now_cost: 50,
    can_select: true,
    total_points: 10,
    form: '1.0',
    ep_next: '1.0',
    selected_by_percent: '1.0',
    club,
});

const bootstrap = {
    teams: [{ id: 1, short_name: 'NEW' }],
    elements: [
        player(1, 'Hall', 2),
        player(2, 'De Cuyper', 2),
        player(3, 'Saka', 3),
        player(4, 'Gabriel', 2),
    ],
};

// De Cuyper has replaced Hall, and that slot is the one being filled.
const target = {
    slot: 3,
    removed: true,
    original: { id: 1, name: 'Hall', elementType: 2, position: 'DEF' },
    incoming: { id: 2, name: 'De Cuyper' },
};

const setup = (overrides = {}) => {
    const props = {
        bootstrap,
        fixtureIndex: null,
        events: [],
        // Hall (the slot's original), De Cuyper and Saka (in the planned squad).
        owned: new Set([1, 2, 3]),
        budgetFor: () => 100,
        clubCounts: new Map(),
        target,
        onPick: jest.fn(),
        onCancelTarget: jest.fn(),
        onUndo: jest.fn(),
        ...overrides,
    };
    render(<PlanPlayerPanel {...props} />);
    const search = (text) =>
        fireEvent.change(screen.getByLabelText('Search players'), { target: { value: text } });
    return { props, search };
};

describe('searching for a player the list hides', () => {
    it('offers the player you sold as an undo, not a purchase', () => {
        const { props, search } = setup();
        search('hall');

        const row = screen.getByText('THE PLAYER YOU TRANSFERRED OUT', { exact: false }).closest('button');
        expect(row).toBeInTheDocument();

        fireEvent.click(row);
        expect(props.onUndo).toHaveBeenCalledTimes(1);
        // Bringing him back is the undo. Buying him would be a second move.
        expect(props.onPick).not.toHaveBeenCalled();
    });

    it('does not claim nothing matched when the sold player did', () => {
        const { search } = setup();
        search('hall');
        expect(screen.queryByText('NO PLAYERS MATCH THESE FILTERS')).not.toBeInTheDocument();
    });

    it('says a player is already in your squad rather than hiding him silently', () => {
        const { search } = setup();
        search('saka');
        expect(screen.getByText('ALREADY IN YOUR SQUAD:', { exact: false })).toBeInTheDocument();
        expect(screen.getByText('SAKA')).toBeInTheDocument();
        expect(screen.queryByText('NO PLAYERS MATCH THESE FILTERS')).not.toBeInTheDocument();
    });

    it('still lists players you can actually buy', () => {
        const { props, search } = setup();
        search('gabriel');
        fireEvent.click(screen.getByText('Gabriel').closest('button'));
        expect(props.onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }));
    });

    it('still says nothing matched when nothing did', () => {
        const { search } = setup();
        search('zzzz');
        expect(screen.getByText('NO PLAYERS MATCH THESE FILTERS')).toBeInTheDocument();
    });

    it('offers no undo before anything is searched', () => {
        // With no search, nothing the reader asked for is missing, and the
        // target strip already carries the undo.
        setup();
        expect(screen.queryByText('THE PLAYER YOU TRANSFERRED OUT', { exact: false })).not.toBeInTheDocument();
    });

    it('offers no undo when the slot has not been transferred', () => {
        const { search } = setup({ target: { ...target, removed: false, incoming: null } });
        search('hall');
        expect(screen.queryByText('THE PLAYER YOU TRANSFERRED OUT', { exact: false })).not.toBeInTheDocument();
    });
});
