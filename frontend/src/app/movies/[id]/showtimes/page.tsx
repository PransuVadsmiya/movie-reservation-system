'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface Movie {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Theater {
  id: string;
  name: string;
  address: string;
}

interface Screen {
  id: string;
  name: string;
  theater: Theater;
}

interface Showtime {
  id: string;
  movie_id: string;
  screen_id: string;
  start_time: string;
  price: string;
  screen: Screen;
}

export default function ShowtimesPage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params.id as string;
  const { user, loading } = useAuth();
  
  const [movie, setMovie] = useState<Movie | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && movieId) {
      fetchMovie();
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      setIsFavorite(localStorage.getItem(`fav_${movieId}`) === 'true');
    }
  }, [user, movieId]);

  useEffect(() => {
    if (selectedDate && movieId) {
      fetchShowtimes(selectedDate);
    }
  }, [selectedDate, movieId]);

  const fetchMovie = async () => {
    try {
      const response = await apiClient.get(`/movies/${movieId}`);
      setMovie(response.data);
      fetchCast(response.data.title);
    } catch (err: any) {
      console.error('Failed to fetch movie:', err);
      setError('Movie not found');
    }
  };

  const fetchCast = async (title: string) => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      if (!apiKey) return;
      const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&api_key=${apiKey}`);
      const searchData = await searchRes.json();
      if (searchData.results && searchData.results.length > 0) {
        const tmdbId = searchData.results[0].id;
        const creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${apiKey}`);
        const creditsData = await creditsRes.json();
        if (creditsData.cast) {
          setCast(creditsData.cast.slice(0, 10));
        }
      }
    } catch (err) {
      console.error('Failed to fetch cast:', err);
    }
  };

  const fetchShowtimes = async (date: string) => {
    setLoadingShowtimes(true);
    setError('');
    try {
      const response = await apiClient.get(`/movies/${movieId}/showtimes?show_date=${date}`);
      setShowtimes(response.data);
    } catch (err: any) {
      console.error('Failed to fetch showtimes:', err);
      setError('Failed to load showtimes');
    } finally {
      setLoadingShowtimes(false);
    }
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center glass-card p-10">
          <p className="text-red-400 mb-6 text-xl">{error}</p>
          <Link href="/movies" className="btn-premium flex items-center justify-center gap-2">
            <ArrowLeft className="w-5 h-5" /> Back to Movies
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-20 relative font-sans">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 right-0 h-screen z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-[#ff4d6d]/10 blur-[120px] rounded-full mix-blend-screen"></div>
      </div>

      {/* Navigation */}
      <header className="relative z-20 pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </header>

      <main className="relative z-20 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Movie Info (Quickshow Style) */}
        {movie && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col md:flex-row gap-10 mb-20 mt-4 items-center md:items-start"
          >
            {movie.poster_url && (
              <div className="w-[280px] md:w-[320px] flex-shrink-0 rounded-xl overflow-hidden shadow-2xl relative border border-white/5">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 pt-2 md:pt-10">
              <div className="text-[#ff4d6d] text-sm font-bold tracking-widest uppercase mb-3">
                ENGLISH
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                {movie.title}
              </h1>
              
              <div className="flex items-center gap-2 text-[#ff4d6d] font-medium mb-6">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>8.5 User Rating</span>
              </div>
              
              {movie.description && (
                <p className="text-gray-300 max-w-3xl leading-relaxed mb-6 text-sm md:text-base">
                  {movie.description}
                </p>
              )}
              
              <div className="text-white font-medium mb-10 text-sm md:text-base flex items-center gap-2 flex-wrap">
                <span>2h 15m</span>
                <span className="text-gray-500">•</span>
                <span>Action, Adventure, Sci-Fi</span>
                <span className="text-gray-500">•</span>
                <span>2026</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <button className="flex items-center gap-2 bg-[#2a2d3e] hover:bg-[#34384c] text-white px-6 py-3 rounded-lg font-semibold transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Watch Trailer
                </button>
                <button 
                  onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                  className="bg-[#ff4d6d] hover:bg-[#ff2a55] text-white px-8 py-3 rounded-lg font-semibold shadow-lg shadow-[#ff4d6d]/20 transition-all"
                >
                  Buy Tickets
                </button>
                <button 
                  onClick={() => {
                    const newFav = !isFavorite;
                    setIsFavorite(newFav);
                    if (newFav) {
                      localStorage.setItem(`fav_${movie.id}`, 'true');
                    } else {
                      localStorage.removeItem(`fav_${movie.id}`);
                    }
                  }}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors group ${isFavorite ? 'bg-[#ff4d6d]/10' : 'bg-[#2a2d3e] hover:bg-[#34384c]'}`}
                >
                  <svg className={`w-5 h-5 transition-colors ${isFavorite ? 'text-[#ff4d6d]' : 'text-gray-400 group-hover:text-[#ff4d6d]'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cast Section */}
        {cast.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-16"
          >
            <h2 className="text-xl font-bold mb-6">Your Favorite Cast</h2>
            <div className="flex gap-6 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {cast.map((actor) => (
                <div key={actor.id} className="flex flex-col items-center flex-shrink-0 w-24">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-white/10 bg-[#151722] transition-transform hover:scale-105 cursor-pointer">
                    {actor.profile_path ? (
                      <img 
                        src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`} 
                        alt={actor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400 text-2xl font-bold">
                        {actor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-center text-white line-clamp-2 leading-tight">
                    {actor.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Date Picker */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6 text-xl font-semibold">
            <Calendar className="w-6 h-6 text-neon-cyan" />
            <h2>Select Date</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
            {getNext7Days().map((date) => {
              const dateObj = new Date(date);
              const isSelected = date === selectedDate;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-20 h-24 rounded-2xl transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-br from-neon-purple to-neon-blue text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transform scale-105'
                      : 'glass-panel text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className={`text-xs uppercase tracking-wider mb-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                    {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-2xl font-bold mb-1">
                    {dateObj.getDate()}
                  </span>
                  <span className="text-xs font-medium">
                    {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Showtimes */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-6 text-xl font-semibold">
            <Clock className="w-6 h-6 text-neon-purple" />
            <h2>Available Showtimes</h2>
          </div>

          {loadingShowtimes ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
            </div>
          ) : showtimes.length === 0 ? (
            <div className="text-center py-16 glass-card">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
              <p className="text-xl text-gray-400">No showtimes available for this date.</p>
              <p className="text-gray-500 mt-2">Try selecting another day.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(
                showtimes.reduce((acc, showtime) => {
                  const theaterName = showtime.screen?.theater?.name || 'Unknown Theater';
                  if (!acc[theaterName]) {
                    acc[theaterName] = {
                      address: showtime.screen?.theater?.address || '',
                      showtimes: []
                    };
                  }
                  acc[theaterName].showtimes.push(showtime);
                  return acc;
                }, {} as Record<string, { address: string, showtimes: Showtime[] }>)
              ).map(([theaterName, theaterData]) => (
                <div key={theaterName} className="bg-[#151722] border border-white/5 rounded-2xl p-6">
                  <div className="mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-2xl font-bold text-white mb-1">{theaterName}</h3>
                    {theaterData.address && (
                      <p className="text-gray-400 text-sm flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-[#ff4d6d]" /> {theaterData.address}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {theaterData.showtimes.map((showtime, idx) => (
                      <Link
                        key={showtime.id}
                        href={`/showtimes/${showtime.id}/seats`}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-black/40 border border-white/5 rounded-xl p-4 text-center hover:border-[#ff4d6d]/50 hover:bg-[#ff4d6d]/5 transition-all group cursor-pointer"
                        >
                          <div className="text-2xl font-bold text-white mb-2 group-hover:text-[#ff4d6d] transition-colors">
                            {formatTime(showtime.start_time).split(' ')[0]}
                            <span className="text-xs text-gray-400 ml-1">{formatTime(showtime.start_time).split(' ')[1]}</span>
                          </div>
                          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs text-green-400 font-medium">
                            ${parseFloat(showtime.price).toFixed(2)}
                          </div>
                          {showtime.screen?.name && (
                            <div className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider">
                              {showtime.screen.name}
                            </div>
                          )}
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
