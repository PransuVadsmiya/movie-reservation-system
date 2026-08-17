'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';

interface ListShow {
  showtime_id: string;
  movie_title: string;
  screen_name: string;
  start_time: string;
  total_bookings: number;
  earnings: number;
}

export default function ListShowsPage() {
  const [shows, setShows] = useState<ListShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    try {
      const response = await apiClient.get('/admin/shows');
      setShows(response.data);
    } catch (error) {
      console.error('Failed to fetch shows:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading shows...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">List <span className="text-[#ff4d6d]">Shows</span></h1>
      
      <div className="bg-[#151722] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="py-4 px-6 font-semibold text-white">Movie Name</th>
                <th className="py-4 px-6 font-semibold text-white">Screen</th>
                <th className="py-4 px-6 font-semibold text-white">Show Time</th>
                <th className="py-4 px-6 font-semibold text-white">Total Bookings</th>
                <th className="py-4 px-6 font-semibold text-white">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {shows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No shows scheduled yet.
                  </td>
                </tr>
              ) : (
                shows.map((show) => (
                  <tr key={show.showtime_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-white font-medium">{show.movie_title}</td>
                    <td className="py-4 px-6 text-gray-300">{show.screen_name}</td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(show.start_time).toLocaleString('en-US', { 
                        weekday: 'short', month: 'long', day: 'numeric', 
                        hour: 'numeric', minute: '2-digit' 
                      })}
                    </td>
                    <td className="py-4 px-6 text-gray-300">{show.total_bookings}</td>
                    <td className="py-4 px-6 text-white font-medium">${Number(show.earnings || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
