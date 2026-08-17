'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { motion } from 'framer-motion';
import { Star, Calendar as CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Movie {
  id: string;
  title: string;
  poster_url: string | null;
  release_date: string;
}

interface Screen {
  id: string;
  name: string;
}

export default function AddShowsPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
  const [selectedScreen, setSelectedScreen] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [showDate, setShowDate] = useState<string>('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMovies();
    fetchScreens();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await apiClient.get('/movies');
      setMovies(response.data);
    } catch (err) {
      console.error('Failed to fetch movies', err);
    }
  };

  const fetchScreens = async () => {
    try {
      const response = await apiClient.get('/screens');
      setScreens(response.data);
      if (response.data.length > 0) {
        setSelectedScreen(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch screens', err);
    }
  };

  const handleAddShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovie) {
      setError('Please select a movie from the list above.');
      return;
    }
    if (screens.length === 0) {
      setError('You do not have any screens set up in your theater. Contact support.');
      return;
    }
    
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/showtimes', {
        movie_id: selectedMovie,
        screen_id: selectedScreen,
        start_time: showDate,
        price: parseFloat(price)
      });
      setSuccess('Show successfully added!');
      setTimeout(() => {
        router.push('/admin/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to add show');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Now Playing Movies</h1>
      
      {/* Horizontal Scroll Movie List */}
      <div className="flex overflow-x-auto gap-4 pb-6 scrollbar-hide snap-x">
        {movies.map((movie) => (
          <div 
            key={movie.id} 
            onClick={() => setSelectedMovie(movie.id)}
            className={`flex-none w-48 snap-start cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 relative group
              ${selectedMovie === movie.id ? 'border-[#ff4d6d] shadow-[0_0_20px_rgba(255,77,109,0.3)]' : 'border-transparent hover:border-white/20'}`}
          >
            <div className="aspect-[2/3] relative">
              {movie.poster_url ? (
                <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">No Poster</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent"></div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="font-bold text-white text-sm truncate">{movie.title}</h3>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="flex items-center text-gray-400 gap-1">
                  <Star className="w-3 h-3 text-[#ff4d6d] fill-[#ff4d6d]" /> 7.9
                </span>
                <span className="text-gray-500">2.6k Votes</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{movie.release_date}</p>
            </div>
            
            {/* Selection overlay indicator */}
            {selectedMovie === movie.id && (
              <div className="absolute top-2 right-2 bg-[#ff4d6d] rounded-full p-1 shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-white/10 pt-8 max-w-2xl">
        <form onSubmit={handleAddShow} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">Select Screen</label>
            {screens.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-sm text-red-400">
                You don't have any screens set up in your theater.{' '}
                <a href="/admin/screens" className="underline font-bold hover:text-white">Click here to add one.</a>
              </div>
            ) : (
              <select 
                value={selectedScreen}
                onChange={(e) => setSelectedScreen(e.target.value)}
                required
                className="w-full bg-[#151722] border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#ff4d6d] transition-colors"
              >
                {screens.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Show Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full bg-[#151722] border border-white/10 rounded-lg py-3 pl-8 pr-4 text-white focus:outline-none focus:border-[#ff4d6d] transition-colors"
                placeholder="Enter show price"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Select Date and Time</label>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <input 
                  type="datetime-local" 
                  value={showDate}
                  onChange={(e) => setShowDate(e.target.value)}
                  required
                  className="w-full bg-[#151722] border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-[#ff4d6d] transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="px-8 py-3 bg-[#ff4d6d] text-white rounded-lg font-medium hover:bg-[#ff3355] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Show'}
          </button>
        </form>
      </div>
    </div>
  );
}
