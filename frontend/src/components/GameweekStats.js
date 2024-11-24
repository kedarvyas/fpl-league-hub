import React, { useState, useEffect } from 'react';
import { Typography, CircularProgress } from '@mui/material';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, TrophyIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

const LEAGUE_ID = 738279;
const API_URL = process.env.REACT_APP_API_URL || 'https://fpl-league-hub-api.onrender.com';

const TransferCard = ({ transfer, managerName }) => {
    // Format price to show £ and .0/.5
    const formatPrice = (price) => {
        if (!price) return '£0.0';
        return `£${(price / 10).toFixed(1)}`;
    };

    // Calculate if it was a free transfer or hit
    const isHit = transfer.cost > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg p-3 mb-2 shadow-sm"
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-purple-600">
                    {managerName}
                </span>
                {isHit && (
                    <span className="text-xs font-medium text-red-500">
                        Hit: -{transfer.cost} pts
                    </span>
                )}
            </div>
            <div className="flex justify-between items-center">
                <div className="flex flex-col space-y-2">
                    <div className="flex items-center">
                        <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">
                                {transfer.element_out_name}
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatPrice(transfer.element_out_cost)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">
                                {transfer.element_in_name}
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatPrice(transfer.element_in_cost)}
                            </span>
                        </div>
                    </div>
                </div>
                {/* Price difference */}
                <div className="text-xs">
                    {transfer.element_in_cost !== transfer.element_out_cost && (
                        <span className={
                            transfer.element_in_cost > transfer.element_out_cost
                                ? 'text-red-500'
                                : 'text-green-500'
                        }>
                            {transfer.element_in_cost > transfer.element_out_cost ? '-' : '+'}
                            {formatPrice(Math.abs(transfer.element_in_cost - transfer.element_out_cost))}
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

const ManagerOfWeekCard = ({ manager }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg p-4 text-white"
    >
        <div className="flex items-center justify-between mb-2">
            <Typography variant="h6" className="text-sm font-bold flex items-center">
                <TrophyIcon className="h-5 w-5 mr-2 text-yellow-400" />
                Manager of the Week
            </Typography>
        </div>
        <div className="space-y-2">
            <p className="font-bold text-lg">{manager.manager_name}</p>
            <p className="text-sm text-purple-200">{manager.team_name}</p>
            <div className="flex justify-between items-center mt-2">
                <span className="text-sm">Points</span>
                <span className="text-2xl font-bold">{manager.points}</span>
            </div>
        </div>
    </motion.div>
);


const GameweekStats = ({ eventId }) => {
    const [transfers, setTransfers] = useState([]);
    const [managerOfWeek, setManagerOfWeek] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchGameweekStats = async () => {
            if (!eventId) return;

            setLoading(true);
            try {
                // Fetch standings first
                const standingsResponse = await fetch(`${API_URL}/api/leagues/${LEAGUE_ID}/standings`);
                if (!standingsResponse.ok) throw new Error('Failed to fetch standings');
                const standingsData = await standingsResponse.json();

                let allTransfers = [];
                let maxPoints = 0;
                let topManager = null;

                // Get bootstrap-static data for player names
                const bootstrapResponse = await fetch(`${API_URL}/api/bootstrap-static`);
                if (!bootstrapResponse.ok) throw new Error('Failed to fetch bootstrap data');
                const bootstrapData = await bootstrapResponse.json();

                // Create a mapping of player IDs to names
                const playerMap = {};
                bootstrapData.elements.forEach(player => {
                    playerMap[player.id] = player.web_name;
                });

                // Process each team
                for (const team of standingsData) {
                    const entry = team.entry;
                    if (!entry) continue;

                    try {
                        // Fetch transfers
                        const transfersResponse = await fetch(`${API_URL}/api/entry/${entry}/transfers`);
                        if (!transfersResponse.ok) continue;
                        const transfersData = await transfersResponse.json();

                        // Check if transfersData is an array and handle accordingly
                        const gameweekTransfers = Array.isArray(transfersData)
                            ? transfersData
                                .filter(t => t.event === parseInt(eventId))
                                .map(t => ({
                                    ...t,
                                    element_in_name: playerMap[t.element_in] || 'Unknown',
                                    element_out_name: playerMap[t.element_out] || 'Unknown',
                                    manager_name: team.player_name,
                                    team_name: team.entry_name,
                                    element_in_cost: t.element_in_cost,
                                    element_out_cost: t.element_out_cost,
                                    cost: t.cost || 0
                                }))
                            : [];

                        allTransfers = [...allTransfers, ...gameweekTransfers];

                        // Fetch picks for points
                        const picksResponse = await fetch(`${API_URL}/api/entry/${entry}/event/${eventId}/picks`);
                        if (!picksResponse.ok) continue;
                        const picksData = await picksResponse.json();

                        const points = picksData.entry_history?.points || 0;
                        if (points > maxPoints) {
                            maxPoints = points;
                            topManager = {
                                manager_name: team.player_name,
                                team_name: team.entry_name,
                                points: points
                            };
                        }
                    } catch (err) {
                        console.error(`Error processing team ${entry}:`, err);
                        continue;
                    }
                }

                // Sort transfers by manager name
                allTransfers.sort((a, b) => a.manager_name.localeCompare(b.manager_name));

                setTransfers(allTransfers);
                setManagerOfWeek(topManager);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching gameweek stats:', error);
                setError('Failed to load gameweek statistics');
                setLoading(false);
            }
        };

        fetchGameweekStats();
    }, [eventId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <CircularProgress />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {managerOfWeek && <ManagerOfWeekCard manager={managerOfWeek} />}

            <div className="bg-white rounded-lg shadow-md p-4">
                <Typography variant="h6" className="text-gray-800 font-bold mb-4 text-sm">
                    Gameweek Transfers
                </Typography>
                <div className="space-y-2">
                    {transfers.length > 0 ? (
                        transfers.map((transfer, index) => (
                            <TransferCard
                                key={index}
                                transfer={transfer}
                                managerName={transfer.manager_name}
                            />
                        ))
                    ) : (
                        <p className="text-gray-500 text-sm">No transfers made this gameweek</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GameweekStats;