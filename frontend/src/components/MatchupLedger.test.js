import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MatchupLedger from './MatchupLedger';

// Enriched picks as the matchup Edge Function returns them.
const pick = (name, squadPosition, points, multiplier = 1) => ({
    id: name.charCodeAt(0) * 100 + squadPosition,
    squadPosition,
    name,
    position: 'MID',
    club: 'XXX',
    points,
    multiplier,
    isStarting: multiplier > 0,
});

const side = (prefix, { bboost = false, shared = 0 } = {}) => ({
    active_chip: bboost ? 'bboost' : null,
    entry_history: { event_transfers: 1, event_transfers_cost: 0, points_on_bench: 0, value: 1000 },
    picks: Array.from({ length: 15 }, (_, i) => {
        const starting = i < 11;
        // The first `shared` slots are the same players on both sides.
        const name = i < shared ? `SHARED${i}` : starting ? `${prefix}${i}` : `${prefix}BENCH${i}`;
        const p = pick(name, i + 1, starting ? 5 : 3, !bboost && !starting ? 0 : 1);
        // Shared players must carry the same id on both sides.
        if (i < shared) p.id = 900 + i;
        return p;
    }),
});

const matchData = {
    matchup: {
        entry_1_entry: 1, entry_1_name: 'HOME FC', entry_1_player_name: 'Home Mgr', entry_1_points: 67,
        entry_2_entry: 2, entry_2_name: 'AWAY FC', entry_2_player_name: 'Away Mgr', entry_2_points: 55,
    },
    team1: side('H', { bboost: true, shared: 5 }),
    team2: side('A', { shared: 5 }),
};

const renderLedger = () =>
    render(
        <MemoryRouter>
            <MatchupLedger matchData={matchData} />
        </MemoryRouter>,
    );

describe('MatchupLedger under Bench Boost', () => {
    it('names the chip', () => {
        renderLedger();
        expect(screen.getByText('BENCH BOOST')).toBeInTheDocument();
    });

    it('shows eleven starters per side, so six differentials each', () => {
        const { container } = renderLedger();
        // Shared rows are collapsed by default, so every player link on screen
        // is a differential row: 6 home-only + 6 away-only.
        expect(container.querySelectorAll('a[href^="/player/"]')).toHaveLength(12);
        expect(screen.getByText('5 PLAYERS IN BOTH SIDES · 25 PTS CANCELLED')).toBeInTheDocument();
    });

    it('keeps the boosted bench out of the differentials', () => {
        renderLedger();
        expect(screen.queryByText('HBENCH11')).not.toBeInTheDocument();
        expect(screen.queryByText('HBENCH14')).not.toBeInTheDocument();
    });

    it('reconciles the differential subtotals to the swing', () => {
        renderLedger();
        // 6 home-only and 6 away-only starters at 5 pts each; no captaincy split.
        expect(screen.getAllByText('30')).toHaveLength(2);
        // signed(0) has no sign, so the swing badge reads "0 SWING".
        expect(screen.getByText(/^0 SWING$/)).toBeInTheDocument();
    });
});
