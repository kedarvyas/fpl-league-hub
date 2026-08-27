import React, { useState, useEffect } from 'react';
import { SectionHeader } from './PlayerStatCell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { DEFAULT_LEAGUE_ID } from '../config/league';
import { API_URL, apiHeaders } from '../config/supabase';
import { formatCount, toNumber } from '../lib/playerStats';

/**
 * The gameweek rail: who topped the league this week, and what everyone did in
 * the transfer market.
 *
 * Rebuilt on Scoreboard, and off MUI — this file and WeeklyMatchups were the
 * last two importers of @mui/material in the app.
 */

const price = (tenths) => `£${(toNumber(tenths) / 10).toFixed(1)}`;

const TransferRow = ({ transfer }) => {
    const hit = toNumber(transfer.cost);
    const delta = toNumber(transfer.element_in_cost) - toNumber(transfer.element_out_cost);

    return (
        <div className="bg-panel px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] font-medium leading-none text-foreground">
                        {transfer.element_in_name}
                    </span>
                    <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                        IN · {price(transfer.element_in_cost)}
                    </span>
                </span>
                {hit > 0 && (
                    <span className="shrink-0 text-[7.5px] leading-none tracking-[0.1em] text-destructive-ink">
                        −{hit}
                    </span>
                )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[10px] leading-none text-muted-foreground line-through decoration-1">
                        {transfer.element_out_name}
                    </span>
                    <span className="mt-1 block truncate text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                        OUT · {price(transfer.element_out_cost)}
                    </span>
                </span>
                {delta !== 0 && (
                    <span className="shrink-0 text-[7.5px] leading-none tracking-[0.1em] text-muted-foreground">
                        {delta > 0 ? '+' : '−'}
                        {price(Math.abs(delta))}
                    </span>
                )}
            </div>
        </div>
    );
};

const GameweekStats = ({ eventId, leagueId }) => {
    const LEAGUE_ID = leagueId || DEFAULT_LEAGUE_ID;
    const [transfers, setTransfers] = useState([]);
    const [managerOfWeek, setManagerOfWeek] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [teamOptions, setTeamOptions] = useState([]);

    useEffect(() => {
        const fetchGameweekStats = async () => {
            if (!eventId) return;

            setLoading(true);
            setError(null);
            try {
                // One aggregate call. This used to fan out from the browser:
                // standings, then a transfers and a picks request per manager,
                // which is 45 round trips for a 22-team league.
                const response = await fetch(
                    `${API_URL}/league-gameweek-stats?leagueId=${LEAGUE_ID}&event=${eventId}`,
                    { headers: apiHeaders() },
                );
                if (!response.ok) throw new Error(`Failed to fetch gameweek stats: ${response.status}`);
                const data = await response.json();

                const allTransfers = data.transfers || [];
                const uniqueTeams = [...new Set(allTransfers.map((t) => t.manager_name))]
                    .sort()
                    .map((managerName) => ({
                        value: managerName,
                        label: managerName,
                        team: allTransfers.find((t) => t.manager_name === managerName)?.team_name || '',
                    }));

                setTransfers(allTransfers);
                setTeamOptions(uniqueTeams);
                setManagerOfWeek(data.managerOfWeek || null);
                setSelectedTeam((prev) =>
                    prev && uniqueTeams.some((t) => t.value === prev) ? prev : uniqueTeams[0]?.value || '',
                );
            } catch (err) {
                console.error('Error fetching gameweek stats:', err);
                setError('Could not load gameweek stats');
            } finally {
                setLoading(false);
            }
        };

        fetchGameweekStats();
    }, [eventId, LEAGUE_ID]);

    const filteredTransfers = selectedTeam
        ? transfers.filter((t) => t.manager_name === selectedTeam)
        : [];
    const current = teamOptions.find((t) => t.value === selectedTeam);

    if (loading) {
        return (
            <div className="animate-pulse">
                <SectionHeader label="Gameweek" />
                <div className="h-[92px] bg-panel" />
                <SectionHeader label="Transfers" />
                <div className="flex flex-col gap-px bg-border">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-[74px] bg-panel" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <>
                <SectionHeader label="Gameweek" />
                <div className="border-l-2 border-destructive bg-destructive/10 px-3 py-2.5">
                    <p className="text-[9px] leading-[1.5] text-destructive-ink">{error}</p>
                </div>
            </>
        );
    }

    return (
        <div>
            {managerOfWeek && (
                <>
                    <SectionHeader label="Manager of the week" tone="live" />
                    <div className="bg-panel px-3 py-3">
                        <p className="truncate text-[14px] font-bold uppercase leading-none tracking-[-0.02em] text-foreground">
                            {managerOfWeek.manager_name}
                        </p>
                        <p className="mt-1.5 truncate text-[8px] leading-none tracking-[0.12em] text-muted-foreground">
                            {managerOfWeek.team_name}
                        </p>
                        <div className="mt-3 flex items-end justify-between gap-2">
                            <span className="text-[34px] font-bold leading-[0.85] tracking-[-0.05em] text-live-ink">
                                {formatCount(managerOfWeek.points)}
                            </span>
                            <span className="pb-1 text-[7.5px] tracking-[0.14em] text-muted-foreground">
                                PTS
                            </span>
                        </div>
                    </div>
                </>
            )}

            <SectionHeader label="Transfers">
                {teamOptions.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger className="min-h-[24px] max-w-[150px] gap-1.5 px-1 text-[8px] font-medium tracking-[0.12em] text-primary-lighter">
                            <span className="truncate">{current?.label || 'PICK'}</span>
                            <span aria-hidden="true">▾</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="right" className="max-h-[260px] w-[190px] overflow-y-auto">
                            {teamOptions.map((team) => (
                                <DropdownMenuItem
                                    key={team.value}
                                    onClick={() => setSelectedTeam(team.value)}
                                    className={`min-h-[40px] px-3 text-[9px] leading-tight tracking-[0.08em] ${
                                        team.value === selectedTeam ? 'text-foreground' : 'text-muted-foreground'
                                    }`}
                                >
                                    <span className="block truncate">{team.label}</span>
                                    {team.team && (
                                        <span className="mt-0.5 block truncate text-[7.5px] text-muted-foreground">
                                            {team.team}
                                        </span>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </SectionHeader>

            <div className="flex flex-col gap-px bg-border">
                {filteredTransfers.length > 0 ? (
                    filteredTransfers.map((transfer, index) => (
                        <TransferRow key={index} transfer={transfer} />
                    ))
                ) : (
                    <div className="bg-panel px-3 py-3 text-[8.5px] leading-[1.5] tracking-[0.1em] text-muted-foreground">
                        {transfers.length > 0
                            ? 'NO TRANSFERS BY THIS MANAGER'
                            : 'NO TRANSFERS THIS GAMEWEEK'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameweekStats;
