import React, { useState, useEffect } from 'react';

const League = ({ id }) => {
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeague = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/leagues/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch league');
        }
        const data = await response.json();
        setLeague(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLeague();
  }, [id]);

  if (loading) return <div className="text-center py-10">Loading league data...</div>;
  if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">{error}</div>;
  if (!league) return <div className="text-center py-10">No league found</div>;

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 bg-purple-700">
        <h3 className="text-lg leading-6 font-medium text-white">{league.name}</h3>
        <p className="mt-1 max-w-2xl text-sm text-purple-200">League Details</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">League ID</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{league.id}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Created at</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{new Date(league.created_at).toLocaleString()}</dd>
          </div>
          {league.updated_at && (
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Last updated</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{new Date(league.updated_at).toLocaleString()}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};

export default League;