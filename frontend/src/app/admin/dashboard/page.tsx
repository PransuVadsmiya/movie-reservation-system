'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { TrendingUp, DollarSign, PlayCircle, Users, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface ActiveShow {
  id: string;
  movie_title: string;
  movie_poster: string | null;
  start_time: string;
  price: number;
}

interface DashboardStats {
  total_bookings: number;
  total_revenue: number;
  active_shows: number;
  total_users: number;
  shows: ActiveShow[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // New state variables for Quick Add Movie
  const [addingMovie, setAddingMovie] = useState(false);
  const [addMessage, setAddMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4">Loading stats...</div>;
  }

  if (!stats) return null;

  const statCards = [
    { title: 'Total Bookings', value: stats.total_bookings.toString(), icon: TrendingUp },
    { title: 'Total Revenue', value: `$${Number(stats.total_revenue).toFixed(2)}`, icon: DollarSign },
    { title: 'Active Shows', value: stats.active_shows.toString(), icon: PlayCircle },
    { title: 'Total Users', value: stats.total_users.toString(), icon: Users },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-3xl font-bold mb-8">Admin <span className="text-[#ff4d6d]">Dashboard</span></h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={card.title} 
                className="bg-[#151722] border border-white/5 rounded-xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors"
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <p className="text-sm text-white font-medium mb-1">{card.title}</p>
                    <h3 className="text-3xl font-bold text-white">{card.value}</h3>
                  </div>
                  <div className="p-2 bg-white/5 rounded-lg text-white">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                {/* Decorative background glow */}
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#ff4d6d]/10 rounded-full blur-2xl group-hover:bg-[#ff4d6d]/20 transition-colors pointer-events-none"></div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick Add Movie */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Quick Add Movie</h2>
        <div className="bg-[#151722] border border-white/5 rounded-xl p-6">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              if (!title) return;
              
              setAddingMovie(true);
              setAddMessage({ text: '', type: '' });
              
              try {
                const response = await apiClient.post('/movies/fetch-from-tmdb', { title });
                setAddMessage({ 
                  text: `Successfully added "${response.data.title}" to the global database! You can now add showtimes for it.`, 
                  type: 'success' 
                });
                (e.target as HTMLFormElement).reset();
              } catch (error: any) {
                setAddMessage({ 
                  text: error.response?.data?.detail || 'Failed to add movie. It may already exist or was not found on TMDB.', 
                  type: 'error' 
                });
              } finally {
                setAddingMovie(false);
              }
            }}
            className="flex flex-col sm:flex-row gap-4 max-w-2xl"
          >
            <input 
              type="text" 
              name="title" 
              placeholder="Enter movie title (e.g. Inception)" 
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#ff4d6d] transition-colors"
              required
            />
            <button 
              type="submit" 
              disabled={addingMovie}
              className="bg-[#ff4d6d] hover:bg-[#ff2a55] disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {addingMovie ? 'Fetching...' : 'Fetch & Add to DB'}
            </button>
          </form>
          {addMessage.text && (
            <div className={`mt-4 p-4 rounded-lg border ${addMessage.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {addMessage.text}
            </div>
          )}
        </div>
      </div>

      {/* Active Shows Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Active Shows</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {stats.shows.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500 bg-[#151722] rounded-xl border border-white/5">
              <p>No active shows found. Add one to get started!</p>
              <Link href="/admin/shows/add" className="inline-block mt-4 text-[#ff4d6d] hover:underline">
                Go to Add Shows &rarr;
              </Link>
            </div>
          ) : (
            stats.shows.map((show, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                key={show.id}
                className="bg-[#151722] border border-white/5 rounded-xl overflow-hidden group relative"
              >
                <div className="aspect-[2/3] relative">
                  {show.movie_poster ? (
                    <img src={show.movie_poster} alt={show.movie_title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">No Poster</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-90"></div>
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white mb-2 truncate">{show.movie_title}</h3>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-white">${show.price}</span>
                    <span className="flex items-center text-gray-400 gap-1">
                      <Star className="w-3 h-3 text-[#ff4d6d] fill-[#ff4d6d]" /> 7.5
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(show.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
