import React from 'react';
import { Card } from '@/components/ui/card';

const DashboardDebug = () => {
  const [apiStatus, setApiStatus] = React.useState({
    root: 'testing',
    leagues: 'testing',
    leagueData: null
  });

  React.useEffect(() => {
    const testAPI = async () => {
      try {
        // Test root endpoint
        const rootResponse = await fetch('https://fpl-league-hub-api.onrender.com/');
        const rootData = await rootResponse.json();
        setApiStatus(prev => ({ ...prev, root: '✅ Connected', rootData }));

        // Test specific league endpoint (using your league ID 738279)
        const leagueResponse = await fetch('https://fpl-league-hub-api.onrender.com/api/leagues/738279');
        const leagueData = await leagueResponse.json();
        setApiStatus(prev => ({ 
          ...prev, 
          leagues: '✅ Connected',
          leagueData 
        }));
      } catch (error) {
        setApiStatus(prev => ({ 
          ...prev, 
          root: error.message.includes('root') ? `❌ Error: ${error.message}` : prev.root,
          leagues: error.message.includes('leagues') ? `❌ Error: ${error.message}` : prev.leagues
        }));
      }
    };

    testAPI();
  }, []);

  return (
    <Card className="p-4 m-4 bg-purple-100 dark:bg-purple-900">
      <h3 className="text-lg font-bold mb-4">API Connection Status</h3>
      <div className="space-y-4">
        <div>
          <p className="font-medium">Root API Status:</p>
          <p className="font-mono">{apiStatus.root}</p>
        </div>
        
        <div>
          <p className="font-medium">League Data Status:</p>
          <p className="font-mono">{apiStatus.leagues}</p>
        </div>

        {apiStatus.leagueData && (
          <div>
            <p className="font-medium">League Data:</p>
            <pre className="bg-black/10 p-2 rounded overflow-auto">
              {JSON.stringify(apiStatus.leagueData, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-purple-700 dark:text-purple-300 mt-4">
          ℹ️ If you see any CORS errors, we need to update the backend configuration.
          If you see 404 errors, we need to verify the league data exists in the database.
        </div>
      </div>
    </Card>
  );
};

export default DashboardDebug;