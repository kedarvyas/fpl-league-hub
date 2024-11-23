import React from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const TransferStatsCard = ({ title, icon: Icon, value, change, subtitle, isPositive }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <Icon className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-purple-500'}`} />
        <span className="text-sm text-gray-600">{title}</span>
      </div>
      {change && (
        <Badge variant={isPositive ? 'success' : 'destructive'} className="text-xs">
          {isPositive ? '+' : ''}{change}
        </Badge>
      )}
    </div>
    <div className="space-y-1">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
  </div>
);

const TransferStats = ({ playerData }) => {
  // Calculate transfer metrics
  const transfersInLastFive = playerData.transfers_in_event || 0;
  const transfersOutLastFive = playerData.transfers_out_event || 0;
  const netTransfers = transfersInLastFive - transfersOutLastFive;
  
  // Fix price change calculation
  const priceChange = (playerData.cost_change_start / 10).toFixed(1);
  const currentPrice = (playerData.now_cost / 10).toFixed(1);
  
  // Fix ownership calculation
  const ownershipPercentage = parseFloat(playerData.selected_by_percent || 0).toFixed(1);
  const ownershipChange = ((playerData.transfers_in_event - playerData.transfers_out_event) / 
    (playerData.transfers_in_event + playerData.transfers_out_event) * 100 || 0).toFixed(1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-700 to-purple-600">
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="h-6 w-6 mr-2" />
            Transfer Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid gap-4">
          <TransferStatsCard
            title="Transfers In"
            icon={TrendingUp}
            value={transfersInLastFive.toLocaleString()}
            subtitle="This gameweek"
            isPositive={true}
          />
          
          <TransferStatsCard
            title="Transfers Out"
            icon={TrendingDown}
            value={transfersOutLastFive.toLocaleString()}
            subtitle="This gameweek"
            isPositive={false}
          />

          <TransferStatsCard
            title="Net Transfers"
            icon={Users}
            value={netTransfers.toLocaleString()}
            subtitle="This gameweek"
            isPositive={netTransfers > 0}
          />

          <TransferStatsCard
            title="Price Change"
            icon={DollarSign}
            value={`£${currentPrice}m`}
            subtitle="Since start"
            isPositive={priceChange > 0}
            change={`${priceChange > 0 ? '+' : ''}${priceChange}m`}
          />

          <TransferStatsCard
            title="Ownership"
            icon={Percent}
            value={`${ownershipPercentage}%`}
            subtitle="Of all teams"
            change={ownershipChange === '0.0' ? undefined : `${ownershipChange}%`}
            isPositive={ownershipChange > 0}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferStats;