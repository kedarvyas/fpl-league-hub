import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

const APITestComponent = () => {
  const [connectionStatus, setConnectionStatus] = useState('testing');
  const [leagues, setLeagues] = useState([]);
  const [error, setError] = useState(null);

  // This should be configured in your .env file
  const API_URL = process.env.REACT_APP_API_URL || 'https://fpl-league-hub-api.onrender.com';

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test root endpoint
        const rootResponse = await fetch(`${API_URL}/`);
        if (!rootResponse.ok) throw new Error('API root endpoint not responding');
        
        // Test leagues endpoint
        const leaguesResponse = await fetch(`${API_URL}/api/leagues`);
        const leaguesData = await leaguesResponse.json();
        
        setLeagues(leaguesData);
        setConnectionStatus('connected');
      } catch (err) {
        setError(err.message);
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Backend Connection Status
          {connectionStatus === 'connected' ? (
            <Badge className="bg-green-500">
              <CheckCircle className="w-4 h-4 mr-2" />
              Connected
            </Badge>
          ) : connectionStatus === 'error' ? (
            <Badge className="bg-red-500">
              <AlertCircle className="w-4 h-4 mr-2" />
              Error
            </Badge>
          ) : (
            <Badge className="bg-yellow-500">Testing...</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">API Configuration</h3>
            <code className="bg-gray-100 p-2 rounded block">
              {API_URL}
            </code>
          </div>
          
          {error && (
            <div className="text-red-500 bg-red-50 p-4 rounded">
              <h3 className="font-medium">Error Details</h3>
              <p>{error}</p>
            </div>
          )}

          {leagues.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Detected Leagues</h3>
              <ul className="space-y-2">
                {leagues.map(league => (
                  <li key={league.id} className="bg-gray-50 p-2 rounded">
                    {league.name} (ID: {league.id})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default APITestComponent;