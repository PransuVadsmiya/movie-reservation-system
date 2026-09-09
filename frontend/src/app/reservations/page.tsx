'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Ticket, Calendar, Clock, MapPin, CheckCircle, XCircle, ArrowLeft, Search } from 'lucide-react';
import UserDropdown from '@/components/UserDropdown';

interface Reservation {
  id: string;
  showtime_id: string;
  status: string;
  created_at: string;
  seat_ids: string[];
}

interface ShowtimeDetails {
  id: string;
  movie_id: string;
  screen_id: string;
  start_time: string;
  price: string;
  screen?: {
    name: string;
  };
}

interface MovieDetails {
  id: string;
  title: string;
  poster_url: string | null;
}

interface ReservationWithDetails extends Reservation {
  showtime?: ShowtimeDetails;
  movie?: MovieDetails;
  seatLabels?: string[];
}

function ReservationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchReservations();
    }
  }, [user]);

  const fetchReservations = async () => {
    setLoadingReservations(true);
    try {
      const response = await apiClient.get('/reservations/me');
      const reservationsData = response.data;

      const reservationsWithDetails = await Promise.all(
        reservationsData.map(async (reservation: Reservation) => {
          try {
            const showtimeResponse = await apiClient.get(`/showtimes/${reservation.showtime_id}`);
            const showtime = showtimeResponse.data;

            const movieResponse = await apiClient.get(`/movies/${showtime.movie_id}`);
            const movie = movieResponse.data;

            const seatsResponse = await apiClient.get(`/showtimes/${reservation.showtime_id}/seats`);
            const allSeats = seatsResponse.data.seats;
            const seatLabels = reservation.seat_ids.map(id => {
              const seat = allSeats.find((s: any) => s.seat_id === id);
              return seat ? `${seat.row_label}${seat.seat_number}` : id.split('-')[0];
            });

            return {
              ...reservation,
              showtime,
              movie,
              seatLabels,
            };
          } catch (err) {
            console.error('Failed to fetch details for reservation:', reservation.id);
            return reservation;
          }
        })
      );

      // Filter out reservations for past showtimes so they don't clutter the dashboard
      const activeReservations = reservationsWithDetails.filter(res => {
        if (!res.showtime) return false;
        const showtimeDate = new Date(res.showtime.start_time);
        return showtimeDate > new Date();
      });

      // Sort by latest first
      activeReservations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReservations(activeReservations);
    } catch (err: any) {
      console.error('Failed to fetch reservations:', err);
      setError('Failed to load reservations');
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation?')) return;

    setCancellingId(reservationId);
    setError('');

    try {
      await apiClient.delete(`/reservations/${reservationId}`);
      setShowSuccess(true);
      fetchReservations();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const canCancelReservation = (reservation: ReservationWithDetails) => {
    if (reservation.status === 'cancelled') return false;
    if (!reservation.showtime) return false;
    const showtimeDate = new Date(reservation.showtime.start_time);
    return showtimeDate > new Date();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4d6d]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20 relative font-sans selection:bg-red-500/30">
      
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold tracking-tight">
            Ticketify
          </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-2 py-1 backdrop-blur-md">
          <Link href="/" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link href="/dashboard" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Dashboard</Link>
          <Link href="/movies" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Movies</Link>
          <Link href="/reservations" className="px-5 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-red-500 to-pink-500 text-transparent bg-clip-text">Tickets</Link>
          <Link href="/favorites" className="px-5 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white transition-colors">Favorites</Link>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-gray-300 hover:text-white transition">
            <Search className="w-5 h-5" />
          </button>
          <UserDropdown />
        </div>
      </nav>

      <div className="h-24"></div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Success! Operation completed.</span>
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-red-400">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
            <button onClick={() => setError('')} className="hover:text-red-300">✕</button>
          </motion.div>
        )}

        {loadingReservations ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4d6d]"></div>
          </div>
        ) : reservations.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 bg-[#151722] border border-white/5 rounded-2xl max-w-2xl mx-auto">
            <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-6">You don't have any tickets yet.</p>
            <Link href="/movies" className="inline-block bg-[#ff4d6d] hover:bg-[#ff2a55] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,42,85,0.3)] py-3 px-8">
              Browse Movies
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            {reservations.map((reservation, idx) => {
              const isCancelled = reservation.status === 'cancelled';
              const showtimeDate = reservation.showtime ? new Date(reservation.showtime.start_time) : null;
              
              return (
                <motion.div
                  key={reservation.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex flex-col md:flex-row rounded-2xl overflow-hidden relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${isCancelled ? 'opacity-60 grayscale' : 'bg-[#151722] border border-white/5'}`}
                >
                  {/* Decorative perforations */}
                  <div className="hidden md:flex absolute left-64 top-0 bottom-0 w-8 flex-col justify-between py-2 z-10">
                    {[...Array(15)].map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-full bg-[#0a0a0f] border border-white/5 -translate-x-1/2"></div>
                    ))}
                  </div>

                  {/* Left Side (Poster) */}
                  <div className="md:w-64 h-64 md:h-auto relative flex-shrink-0 bg-cinematic-900 border-b md:border-b-0 md:border-r border-white/10 border-dashed">
                    {reservation.movie?.poster_url ? (
                      <img src={reservation.movie.poster_url} alt="Poster" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                        <Ticket className="w-12 h-12 mb-2" />
                        <span>No Poster</span>
                      </div>
                    )}
                    {/* Status Ribbon */}
                    <div className={`absolute top-4 -left-8 px-10 py-1 font-bold text-xs uppercase tracking-wider transform -rotate-45 shadow-lg ${isCancelled ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                      {reservation.status}
                    </div>
                  </div>

                  {/* Right Side (Details) */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-2 leading-tight">
                            {reservation.movie?.title || 'Unknown Movie'}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            {showtimeDate && (
                              <>
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#ff4d6d]" /> {showtimeDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-pink-500" /> {showtimeDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-400" /> {reservation.showtime?.screen?.name || `Screen ${reservation.showtime?.screen_id}`}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 pb-6 border-b border-white/10">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Seats</p>
                          <p className="font-bold text-lg text-[#ff4d6d]">{reservation.seatLabels ? reservation.seatLabels.join(', ') : reservation.seat_ids.join(', ')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Qty</p>
                          <p className="font-bold text-lg">{reservation.seat_ids.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Paid</p>
                          <p className="font-bold text-lg text-green-400">
                            ${reservation.showtime ? (parseFloat(reservation.showtime.price) * reservation.seat_ids.length).toFixed(2) : '--'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Booking ID</p>
                          <p className="font-mono text-sm">{reservation.id.split('-')[0].toUpperCase()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      {/* Barcode Placeholder */}
                      <div className="h-12 w-48 bg-white/5 rounded overflow-hidden flex">
                        {[...Array(40)].map((_, i) => (
                          <div key={i} className="h-full bg-white/20" style={{ width: `${Math.random() * 4 + 1}px`, marginRight: `${Math.random() * 2}px` }}></div>
                        ))}
                      </div>

                      {canCancelReservation(reservation) && !isCancelled && (
                        <button
                          onClick={() => handleCancelReservation(reservation.id)}
                          disabled={cancellingId === reservation.id}
                          className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-all"
                        >
                          {cancellingId === reservation.id ? 'Cancelling...' : 'Cancel Tickets'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4d6d]"></div>
      </div>
    }>
      <ReservationsContent />
    </Suspense>
  );
}
