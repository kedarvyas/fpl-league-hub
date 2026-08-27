import React, { useState, useEffect, useMemo } from 'react';
import PlayerPhoto from './PlayerPhoto';
import { API_URL, apiHeaders } from '../config/supabase';
import { getPositionShort, toNumber } from '../lib/playerStats';

/**
 * Player picker for the compare flow, on the Scoreboard system.
 *
 * The old version refetched the whole bootstrap-static payload on every
 * keystroke — roughly a megabyte per character typed, with the results of
 * whichever request happened to land last winning. It now loads once and
 * filters in memory.
 */
const PlayerSearchModal = ({ onSelect, onClose, excludePlayerId }) => {
    const [players, setPlayers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const response = await fetch(`${API_URL}/bootstrap-static`, { headers: apiHeaders() });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (cancelled) return;

                const teams = data.teams || [];
                setPlayers(
                    (data.elements || []).map((p) => ({
                        ...p,
                        teamShortName: teams.find((t) => t.id === p.team)?.short_name || 'UNK',
                    })),
                );
            } catch (err) {
                if (!cancelled) setError('Could not load players');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const results = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (term.length < 2) return [];
        return players
            .filter(
                (p) =>
                    p.id !== excludePlayerId &&
                    (p.web_name.toLowerCase().includes(term) ||
                        `${p.first_name} ${p.second_name}`.toLowerCase().includes(term) ||
                        p.teamShortName.toLowerCase() === term),
            )
            .sort((a, b) => toNumber(b.total_points) - toNumber(a.total_points))
            .slice(0, 8);
    }, [players, searchTerm, excludePlayerId]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 p-4 pt-[12vh] font-mono backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex max-h-[70vh] w-full max-w-md flex-col border border-border bg-panel"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                    <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
                        Compare with
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="-mr-2 flex h-11 w-11 items-center justify-center text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                        ✕
                    </button>
                </div>

                <div className="shrink-0 border-b border-border">
                    <input
                        type="text"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={loading ? 'LOADING PLAYERS…' : 'SEARCH PLAYER OR CLUB'}
                        aria-label="Search players"
                        disabled={loading || !!error}
                        className="min-h-[46px] w-full bg-panel px-4 text-[12px] tracking-[0.06em] text-foreground placeholder:text-muted-foreground placeholder:tracking-[0.12em] focus:outline-none disabled:opacity-60"
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {error ? (
                        <div className="border-l-2 border-destructive bg-destructive/10 px-4 py-3">
                            <p className="text-[9px] leading-[1.5] text-destructive-ink">{error}</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="flex flex-col gap-px bg-border">
                            {results.map((player) => (
                                <button
                                    key={player.id}
                                    onClick={() => onSelect(player)}
                                    className="flex items-center gap-3 bg-panel px-4 py-2.5 text-left transition-colors hover:bg-muted"
                                >
                                    <PlayerPhoto
                                        code={player.code}
                                        name={player.web_name}
                                        size="sm"
                                        className="h-[38px] w-[30px] shrink-0 border border-border bg-background text-[12px]"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[12px] font-medium leading-none text-foreground">
                                            {player.web_name}
                                        </span>
                                        <span className="mt-1.5 block truncate text-[8px] leading-none tracking-[0.1em] text-muted-foreground">
                                            {getPositionShort(player.element_type)} · {player.teamShortName} · £
                                            {(toNumber(player.now_cost) / 10).toFixed(1)}M
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-[16px] font-bold leading-none tracking-[-0.03em] text-foreground">
                                            {toNumber(player.total_points)}
                                        </span>
                                        <span className="mt-1 block text-[7px] leading-none tracking-[0.1em] text-muted-foreground">
                                            PTS
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-4 text-[8.5px] leading-[1.6] tracking-[0.12em] text-muted-foreground">
                            {loading
                                ? 'LOADING…'
                                : searchTerm.trim().length >= 2
                                    ? `NO PLAYERS MATCH "${searchTerm.toUpperCase()}"`
                                    : 'TYPE AT LEAST TWO CHARACTERS'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerSearchModal;
