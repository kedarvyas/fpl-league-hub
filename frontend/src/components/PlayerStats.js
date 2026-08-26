import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { API_URL, apiHeaders } from '../config/supabase';
import PlayerHero from './PlayerHero';
import PlayerOutputTab from './PlayerOutputTab';
import PlayerScoringTab from './PlayerScoringTab';
import PlayerFixturesTab from './PlayerFixturesTab';
import PlayerComparison from './PlayerComparison';
import PlayerSearchModal from './PlayerSearchModal';
import { positionCount } from '../lib/playerStats';

const TABS = [
    { id: 'output', label: 'OUTPUT' },
    { id: 'scoring', label: 'SCORING' },
    { id: 'fixtures', label: 'FIXTURES' },
];

const readHashTab = () => {
    const hash = window.location.hash.replace('#', '');
    return TABS.some((t) => t.id === hash) ? hash : 'output';
};

const PlayerStats = () => {
    const { playerId } = useParams();

    const [playerData, setPlayerData] = useState(null);
    const [elements, setElements] = useState([]);
    const [teams, setTeams] = useState({});
    const [history, setHistory] = useState(null);
    const [live, setLive] = useState(null);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Tab lives in the URL hash so a shared link opens where the sender was.
    const [activeTab, setActiveTab] = useState(readHashTab);
    const onTabChange = useCallback((value) => {
        setActiveTab(value);
        window.history.replaceState(null, '', `#${value}`);
    }, []);

    const [showComparison, setShowComparison] = useState(false);
    const [showPlayerSearch, setShowPlayerSearch] = useState(false);
    const [comparePlayer, setComparePlayer] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const headers = apiHeaders();
                const [bootstrapRes, historyRes] = await Promise.all([
                    fetch(`${API_URL}/bootstrap-static`, { headers }),
                    fetch(`${API_URL}/element-summary/${playerId}`, { headers }),
                ]);
                if (!bootstrapRes.ok) throw new Error('Failed to load player data');

                const bootstrap = await bootstrapRes.json();
                const historyData = historyRes.ok ? await historyRes.json() : null;

                const player = bootstrap.elements.find((p) => p.id === parseInt(playerId, 10));
                if (!player) throw new Error('Player not found');

                const teamLookup = {};
                bootstrap.teams.forEach((t) => {
                    teamLookup[t.id] = { name: t.name, short_name: t.short_name };
                });
                const team = teamLookup[player.team];
                player.teamName = team ? team.name : 'Unknown';
                player.teamShortName = team ? team.short_name : 'UNK';

                const current = bootstrap.events?.find((e) => e.is_current);

                if (cancelled) return;
                setPlayerData(player);
                setElements(bootstrap.elements);
                setTeams(teamLookup);
                setHistory(historyData);
                setCurrentEvent(current?.id ?? null);
                setIsLive(Boolean(current && !current.finished));
                setLoading(false);

                // The scoring ledger and bonus race need event/{gw}/live, which
                // element-summary does not carry. Fetched after first paint so
                // the page is usable without it, and failing softly — an absent
                // ledger degrades to a message, it doesn't break the tab.
                if (current?.id) {
                    try {
                        const liveRes = await fetch(
                            `${API_URL}/event-live?event=${current.id}&playerId=${playerId}`,
                            { headers },
                        );
                        if (liveRes.ok && !cancelled) setLive(await liveRes.json());
                    } catch (liveErr) {
                        console.error('Live gameweek detail unavailable:', liveErr);
                    }
                }
            } catch (err) {
                if (cancelled) return;
                console.error('Error fetching player data:', err);
                setError(err.message || 'Failed to load player data');
                setLoading(false);
            }
        };

        if (playerId) load();
        return () => { cancelled = true; };
    }, [playerId]);

    const posCount = useMemo(
        () => positionCount(playerData, elements),
        [playerData, elements],
    );

    const fixtures = history?.fixtures || [];

    if (loading) return <PlayerStatsSkeleton />;

    if (error || !playerData) {
        return (
            <div className="mx-auto max-w-[1280px] px-4 py-16 text-center md:px-7">
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {error || 'Player not found'}
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1280px] font-mono">
            <PlayerHero
                playerData={playerData}
                positionCount={posCount}
                currentEvent={currentEvent}
                isLive={isLive}
            />

            <Tabs.Root value={activeTab} onValueChange={onTabChange}>
                <Tabs.List className="mt-4 flex border-t border-border">
                    {TABS.map((t) => (
                        <Tabs.Trigger
                            key={t.id}
                            value={t.id}
                            className={`flex-1 py-[11px] text-center text-[9.5px] font-medium leading-none tracking-[0.14em] transition-colors ${
                                activeTab === t.id
                                    ? 'border-b-2 border-live text-live'
                                    : 'border-b-2 border-transparent text-muted-foreground'
                            }`}
                        >
                            {t.label}
                        </Tabs.Trigger>
                    ))}
                    <button
                        type="button"
                        onClick={() => setShowPlayerSearch(true)}
                        className="hidden shrink-0 px-4 text-[9.5px] font-medium tracking-[0.14em] text-primary-lighter md:block"
                    >
                        COMPARE →
                    </button>
                </Tabs.List>

                <Tabs.Content value="output">
                    <PlayerOutputTab
                        playerData={playerData}
                        elements={elements}
                        history={history}
                        teams={teams}
                    />
                </Tabs.Content>
                <Tabs.Content value="scoring">
                    <PlayerScoringTab
                        playerData={playerData}
                        elements={elements}
                        history={history}
                        live={live}
                        currentEvent={currentEvent}
                    />
                </Tabs.Content>
                <Tabs.Content value="fixtures">
                    <PlayerFixturesTab fixtures={fixtures} teams={teams} />
                </Tabs.Content>
            </Tabs.Root>

            {/* Mobile entry point for compare; desktop uses the tab-bar link. */}
            <div className="px-4 pb-8 md:hidden">
                <button
                    type="button"
                    onClick={() => setShowPlayerSearch(true)}
                    className="min-h-[44px] w-full border border-border text-[9.5px] font-medium tracking-[0.14em] text-primary-lighter"
                >
                    COMPARE WITH ANOTHER PLAYER
                </button>
            </div>

            {showPlayerSearch && (
                <PlayerSearchModal
                    onClose={() => setShowPlayerSearch(false)}
                    onSelect={(p) => {
                        setComparePlayer(p);
                        setShowPlayerSearch(false);
                        setShowComparison(true);
                    }}
                />
            )}

            {showComparison && comparePlayer && (
                <PlayerComparison
                    player1={playerData}
                    player2={comparePlayer}
                    onClose={() => {
                        setShowComparison(false);
                        setComparePlayer(null);
                    }}
                />
            )}
        </div>
    );
};

/**
 * Skeleton mirrors the tile geometry rather than showing a spinner, so the grid
 * does not reflow when data lands.
 */
const PlayerStatsSkeleton = () => (
    <div className="mx-auto max-w-[1280px] animate-pulse font-mono">
        <div className="px-4 pt-4 md:px-7">
            <div className="h-[78px] w-[62px] bg-panel" />
            <div className="mt-4 h-[25px] w-2/3 bg-panel" />
            <div className="mt-4 flex gap-px bg-border">
                {[0, 1, 2].map((i) => <div key={i} className="h-[86px] flex-1 bg-panel" />)}
            </div>
        </div>
        <div className="mt-4 h-[38px] border-y border-border" />
        <div className="px-4 pt-8 md:px-7">
            <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-[92px] bg-panel" />)}
            </div>
        </div>
    </div>
);

export default PlayerStats;
