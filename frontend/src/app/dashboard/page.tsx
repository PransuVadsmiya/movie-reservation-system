'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Search, Calendar, Clock, Star, Play, ArrowRight, Share2 } from 'lucide-react';
import apiClient from '@/lib/api';

import UserDropdown from '@/components/UserDropdown';

interface Movie {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  backdrop_url?: string;
  trailer_video_id?: string;
  release_date?: string;
  genre_id?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);
  const [fetching, setFetching] = useState(true);

  const [activeTrailerIndex, setActiveTrailerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await apiClient.get<Movie[]>('/movies');
        setMovies(res.data);
        
        try {
          const heroRes = await apiClient.get<Movie>('/movies/hero');
          setHeroMovie(heroRes.data);
        } catch (heroErr) {
          console.error('Failed to fetch hero movie', heroErr);
        }
        
      } catch (err) {
        console.error('Failed to fetch movies', err);
      } finally {
        setFetching(false);
      }
    };
    if (user) {
      fetchMovies();
    }
  }, [user]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const mockMovies = [
    { id: 'mock-1', title: 'Spider-Man: Brand New Day', genre: 'Action | Adventure | Sci-Fi', year: '2026', duration: '2h 25m', rating: '8.5', poster_url: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg' },
    { id: 'mock-2', title: 'Toy Story 5', genre: 'Animation | Adventure | Comedy', year: '2026', duration: '1h 40m', rating: '7.8', poster_url: 'https://image.tmdb.org/t/p/w500/w9kR8qbmQ01HwnvK4alvnQ2ca0L.jpg' },
    { id: 'mock-3', title: 'Jurassic World Rebirth', genre: 'Action | Adventure | Sci-Fi', year: '2026', duration: '2h 15m', rating: '7.2', poster_url: 'https://image.tmdb.org/t/p/w500/kAVRgw7GgK1CfYEJq8ME6EvRIgU.jpg' },
    { id: 'mock-4', title: "Harry Potter and the Sorcerer's Stone (25th Anniversary)", genre: 'Fantasy | Adventure | Family', year: '2026', duration: '2h 32m', rating: '9.0', poster_url: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg' },
  ];

  const displayMovies = movies.length > 0 ? movies.map((m, i) => ({
    id: m.id,
    title: m.title,
    genre: 'Action | Sci-Fi', // fallback since genre is ID
    year: '2026',
    duration: '2h 15m',
    rating: (8.0 - (i * 0.2)).toFixed(1),
    poster_url: m.poster_url || mockMovies[i % mockMovies.length].poster_url,
    backdrop_url: m.backdrop_url || m.poster_url || mockMovies[i % mockMovies.length].poster_url,
    trailer_video_id: m.trailer_video_id
  })) : mockMovies;

  const dynamicTrailersList = displayMovies.slice(0, 4).map((movie) => ({
    id: movie.id,
    title: `${movie.title} - Official Trailer`,
    channel: "Ticketify Trailers",
    videoId: (movie as any).trailer_video_id || "JfVOs4VSpmA", // Fallback if no trailer exists
    img: (movie as any).backdrop_url || movie.poster_url
  }));

  const activeTrailer = dynamicTrailersList[activeTrailerIndex] || dynamicTrailersList[0];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-red-500/30">

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-[#0a0a0f]/90 to-transparent backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold tracking-tight">
            Ticketify
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2 py-1 backdrop-blur-md">
          <Link href="/" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link href="/dashboard" className="px-5 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-red-500 to-pink-500 text-transparent bg-clip-text">Dashboard</Link>
          <Link href="/movies" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Movies</Link>
          <Link href="/reservations" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Tickets</Link>
          <Link href="/favorites" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Favorites</Link>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-gray-300 hover:text-white transition">
            <Search className="w-5 h-5" />
          </button>
          <UserDropdown />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full h-screen min-h-[700px] flex items-center">
        {heroMovie ? (
          <>
            {/* Background Image & Gradient */}
            <div className="absolute inset-0 z-0 bg-[#0a0a0f]">
              <img 
                src={heroMovie.backdrop_url || heroMovie.poster_url || "https://image.tmdb.org/t/p/original/qeQJx07rK2xm8SD2sJxFKhE7gs0.jpg"} 
                alt={`${heroMovie.title} Backdrop`} 
                className="w-full h-full object-cover object-right opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent w-full md:w-3/4"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent"></div>
            </div>

            {/* Hero Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-6 w-full mt-20">
              <div className="max-w-2xl">
                <div className="inline-block bg-white text-black font-extrabold px-3 py-1 text-sm tracking-wider mb-6">
                  FEATURED
                </div>
                <h1 className="text-5xl md:text-7xl font-extrabold mb-4 leading-tight tracking-tight">
                  {heroMovie.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-gray-300 mb-6 font-medium">
                  <span>Action | Adventure | Fantasy</span>
                  {heroMovie.release_date && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> {heroMovie.release_date.substring(0, 4)}
                      </div>
                    </>
                  )}
                  <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> 2h 25m
                  </div>
                </div>

                <p className="text-gray-300 text-lg mb-8 max-w-lg leading-relaxed">
                  {heroMovie.description || "An epic cinematic experience awaits."}
                </p>

                <Link href={`/movies/${heroMovie.id}/showtimes`} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#ff4d6d] to-[#ff2a55] text-white font-semibold py-3 px-8 rounded-full hover:shadow-[0_0_20px_rgba(255,42,85,0.4)] transition-all transform hover:scale-105">
                  Book Tickets <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 z-0 bg-[#0a0a0f] animate-pulse flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-[#ff4d6d] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </section>

      {/* Now Showing Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Now Showing</h2>
          <Link href="/movies" className="text-sm font-medium text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {displayMovies.map((movie) => (
            <div key={movie.id} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(25%-1.125rem)] flex-none snap-start bg-[#151722] rounded-2xl overflow-hidden shadow-lg border border-white/5 group transition-transform hover:-translate-y-1">
              <Link href={`/movies/${movie.id}/showtimes`} className="block">
                <div className="aspect-[2/3] overflow-hidden relative">
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#151722] to-transparent opacity-80"></div>
                </div>
              </Link>

              <div className="p-5 relative -mt-16 z-10">
                <h3 className="text-xl font-bold mb-1 truncate">{movie.title}</h3>
                <p className="text-xs text-gray-400 mb-6 truncate">{movie.year} • {movie.genre} • {movie.duration}</p>

                <div className="flex items-center justify-between">
                  <Link
                    href={`/movies/${movie.id}/showtimes`}
                    className="bg-[#ff4d6d] hover:bg-[#ff2a55] text-white text-sm font-semibold py-2 px-5 rounded-full transition-colors"
                  >
                    Buy Tickets
                  </Link>
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="w-4 h-4 text-[#ff4d6d] fill-[#ff4d6d]" /> {movie.rating}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Link href="/movies" className="bg-[#ff4d6d] hover:bg-[#ff2a55] text-white font-semibold py-3 px-8 rounded-xl transition-colors">
            Show more
          </Link>
        </div>
      </section>

      {/* Trailers Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8">Trailers</h2>

        <div className="w-full aspect-video rounded-2xl overflow-hidden relative group bg-black shadow-2xl border border-white/10">
          {isPlaying ? (
            <iframe 
              className="w-full h-full" 
              src={`https://www.youtube.com/embed/${activeTrailer.videoId}?autoplay=1&mute=0`} 
              title={activeTrailer.title} 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          ) : (
            <>
              <img
                src={activeTrailer.img}
                alt="Trailer Thumbnail"
                className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-300"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={() => setIsPlaying(true)}
                  className="w-20 h-20 bg-[#ff0000] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.6)] transform group-hover:scale-110 transition-all cursor-pointer"
                >
                  <Play className="w-8 h-8 text-white fill-white ml-1" />
                </button>
              </div>

              <div className="absolute top-0 left-0 p-6 flex gap-4 w-full bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="w-16 h-8 bg-red-600 font-bold flex items-center justify-center text-xs">MARVEL</div>
                <div>
                  <h3 className="font-bold text-lg md:text-xl">{activeTrailer.title}</h3>
                  <p className="text-sm text-gray-300">{activeTrailer.channel}</p>
                </div>
              </div>

              <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 pointer-events-none">
                <span className="text-sm font-medium">Watch on</span>
                <div className="flex items-center gap-1 font-bold">
                  <Play className="w-4 h-4 text-red-500 fill-red-500" /> YouTube
                </div>
              </div>
            </>
          )}
        </div>

        {/* Small Trailer Thumbnails */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {dynamicTrailersList.map((trailer, idx) => {
            const isActive = activeTrailerIndex === idx;
            return (
              <div 
                key={idx} 
                onClick={() => {
                  setActiveTrailerIndex(idx);
                  setIsPlaying(true);
                }}
                className={`aspect-video rounded-xl overflow-hidden relative group cursor-pointer border-2 transition-all ${isActive ? 'border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'border-white/10 hover:border-white/30'}`}
              >
                <img src={trailer.img} alt={trailer.title} className={`w-full h-full object-cover transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'}`} />
                {!isActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-2 bg-black/20">
                    <Play className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 transition-opacity mb-2" />
                    <span className="text-xs font-bold text-center leading-tight drop-shadow-md">{trailer.title}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-[#08080c] pt-16 pb-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold tracking-tight">Ticketify</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-sm text-sm leading-relaxed">
                Ticketify is a smart movie reservation system designed to make movie booking simple and convenient. Browse movies, explore showtimes, choose your seats, and reserve your tickets with ease.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm tracking-wider">Quick Links</h4>
              <ul className="space-y-4">
                <li><Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">About us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Contact us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy policy</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm tracking-wider">Get in touch</h4>
              <ul className="space-y-4">
                <li className="text-gray-400 text-sm">+91 79847 19576</li>
                <li><a href="mailto:pransu@ticketify.com" className="text-gray-400 hover:text-white text-sm transition-colors">pransu@ticketify.com</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 text-center text-sm text-gray-500">
            <p>Copyright 2026 © GreatStack. All Right Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
