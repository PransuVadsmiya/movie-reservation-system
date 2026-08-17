'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { Film, Filter, ChevronRight, PlayCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import UserDropdown from '@/components/UserDropdown';

interface Genre {
  id: string;
  name: string;
}

interface Movie {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  genre_id: string | null;
}

export default function MoviesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [loadingMovies, setLoadingMovies] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchGenres();
      fetchMovies();
    }
  }, [user]);

  const fetchGenres = async () => {
    try {
      const response = await apiClient.get('/genres');
      setGenres(response.data);
    } catch (err) {
      console.error('Failed to fetch genres:', err);
    }
  };

  const fetchMovies = async (genreId?: string) => {
    setLoadingMovies(true);
    try {
      const url = genreId ? `/movies?genre_id=${genreId}` : '/movies';
      const response = await apiClient.get(url);
      setMovies(response.data);
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    } finally {
      setLoadingMovies(false);
    }
  };

  const handleGenreFilter = (genreId: string) => {
    setSelectedGenre(genreId);
    if (genreId) {
      fetchMovies(genreId);
    } else {
      fetchMovies();
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 font-sans selection:bg-red-500/30">
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold tracking-tight">
            Ticketify
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2 py-1 backdrop-blur-md">
          <Link href="/" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link href="/dashboard" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/movies" className="px-5 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-red-500 to-pink-500 text-transparent bg-clip-text">Movies</Link>
          <Link href="/reservations" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Tickets</Link>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-gray-300 hover:text-white transition">
            <Search className="w-5 h-5" />
          </button>
          <UserDropdown />
        </div>
      </nav>

      {/* spacer for fixed nav */}
      <div className="h-24"></div>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Genre Filter */}
        <div className="mb-10 flex items-center gap-4 overflow-x-auto pb-4 hide-scrollbar">
          <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => handleGenreFilter('')}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full font-medium transition-all ${
              selectedGenre === ''
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-[0_0_15px_rgba(255,42,85,0.4)]'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            All Genres
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => handleGenreFilter(genre.id)}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full font-medium transition-all ${
                selectedGenre === genre.id
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-[0_0_15px_rgba(255,42,85,0.4)]'
                  : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {/* Movies Grid */}
        {loadingMovies ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4d6d]"></div>
          </div>
        ) : movies.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl"
          >
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">No movies found for this genre</p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
          >
            {movies.map((movie, idx) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative rounded-2xl overflow-hidden aspect-[2/3] bg-[#151722] border border-white/5"
              >
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-cinematic-800 text-gray-500">
                    <Film className="w-16 h-16 mb-4" />
                    <span>No Poster</span>
                  </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100"></div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent">
                  <h3 className="font-bold text-2xl text-white leading-tight">
                    {movie.title}
                  </h3>
                  
                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                    <div className="overflow-hidden">
                      <div className="pt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                        {movie.description && (
                          <p className="text-sm text-gray-300 line-clamp-3 mb-6">
                            {movie.description}
                          </p>
                        )}
                        <Link
                          href={`/movies/${movie.id}/showtimes`}
                          className="bg-white/10 hover:bg-[#ff4d6d] hover:border-transparent border border-white/20 flex items-center justify-center gap-2 w-full py-2.5 text-sm rounded-xl transition-all font-medium"
                        >
                          <PlayCircle className="w-4 h-4" />
                          Book Show
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
