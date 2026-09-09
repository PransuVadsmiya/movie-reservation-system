'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle2, Ticket } from 'lucide-react';

interface Showtime {
  id: string;
  movie_id: string;
  screen_id: string;
  start_time: string;
  price: string;
}

interface SeatMapEntry {
  seat_id: string;
  row_label: string;
  seat_number: number;
  status: 'available' | 'locked' | 'booked';
  is_mine: boolean;
}

interface SeatMap {
  showtime_id: string;
  seats: SeatMapEntry[];
}

export default function SeatSelectionPage() {
  const router = useRouter();
  const params = useParams();
  const showtimeId = params.id as string;
  const { user, loading } = useAuth();
  
  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lockedSeats, setLockedSeats] = useState<string[]>([]);
  const [lockExpiry, setLockExpiry] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'locked' | 'confirming'>('select');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && showtimeId) {
      fetchShowtime();
      fetchSeatMap();
    }
  }, [user, showtimeId]);

  const [now, setNow] = useState(Date.now());

  // Countdown timer for lock expiry
  useEffect(() => {
    if (lockExpiry) {
      setNow(Date.now());
      const interval = setInterval(() => {
        const currentTime = Date.now();
        setNow(currentTime);
        const remainingMs = lockExpiry - currentTime;
        if (remainingMs <= 0) {
          setError('Your seat lock has expired. Please select seats again.');
          setStep('select');
          setLockedSeats([]);
          setSelectedSeats([]);
          setLockExpiry(null);
          // Wait a short moment to ensure backend Redis TTL has fully expired
          setTimeout(() => {
            fetchSeatMap();
          }, 1500);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockExpiry]);

  const fetchShowtime = async () => {
    try {
      const response = await apiClient.get(`/showtimes/${showtimeId}`);
      setShowtime(response.data);
    } catch (err: any) {
      console.error('Failed to fetch showtime:', err);
      setError('Showtime not found');
    }
  };

  const fetchSeatMap = async () => {
    try {
      const response = await apiClient.get(`/showtimes/${showtimeId}/seats`);
      setSeatMap(response.data);
    } catch (err: any) {
      console.error('Failed to fetch seat map:', err);
      setError('Failed to load seats');
    }
  };

  const handleSeatClick = (seat: SeatMapEntry) => {
    if (step !== 'select') return;
    if (seat.status !== 'available') return;

    setSelectedSeats((prev) => {
      if (prev.includes(seat.seat_id)) {
        return prev.filter((id) => id !== seat.seat_id);
      } else {
        if (prev.length >= 10) {
          setError('Maximum 10 seats per booking');
          return prev;
        }
        return [...prev, seat.seat_id];
      }
    });
  };

  const handleLockSeats = async () => {
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat');
      return;
    }

    setLoadingAction(true);
    setError('');

    try {
      const response = await apiClient.post(`/showtimes/${showtimeId}/lock-seats`, {
        seat_ids: selectedSeats,
      });
      
      setLockedSeats(response.data.locked_seat_ids);
      setLockExpiry(Date.now() + response.data.expires_in_seconds * 1000);
      setStep('locked');
      await fetchSeatMap();
    } catch (err: any) {
      if (err.response?.status === 409) {
        const detail = err.response.data?.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else if (detail?.message) {
          setError(detail.message);
        }
        await fetchSeatMap();
      } else {
        setError('Failed to lock seats. Please try again.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConfirmReservation = async () => {
    setLoadingAction(true);
    setError('');
    setStep('confirming');

    try {
      await apiClient.post('/reservations/confirm', {
        showtime_id: showtimeId,
        seat_ids: lockedSeats,
      });
      
      router.push('/reservations?success=true');
    } catch (err: any) {
      setStep('locked');
      if (err.response?.status === 409) {
        setError('Lock expired or seats no longer available. Refreshing...');
        setTimeout(() => {
          setStep('select');
          setSelectedSeats([]);
          setLockedSeats([]);
          setLockExpiry(null);
          fetchSeatMap();
        }, 2000);
      } else {
        setError('Failed to confirm reservation. Please try again.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelSelection = async () => {
    if (lockedSeats.length > 0) {
      setLoadingAction(true);
      try {
        await apiClient.delete(`/showtimes/${showtimeId}/lock-seats`, {
          data: { seat_ids: lockedSeats }
        });
      } catch (err) {
        console.error('Failed to explicitly release seats', err);
      }
      setLoadingAction(false);
    }
    
    setSelectedSeats([]);
    setLockedSeats([]);
    setLockExpiry(null);
    setStep('select');
    setError('');
    fetchSeatMap();
  };

  const getSeatStyle = (seat: SeatMapEntry) => {
    if (lockedSeats.includes(seat.seat_id)) {
      return 'bg-yellow-500/80 border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.5)] cursor-not-allowed';
    }
    if (selectedSeats.includes(seat.seat_id)) {
      return 'bg-gradient-to-br from-red-500 to-pink-500 border-white shadow-[0_0_15px_rgba(255,42,85,0.6)] cursor-pointer scale-110 z-10';
    }
    
    if (seat.is_mine) {
      if (seat.status === 'locked') {
        return 'bg-[#ff4d6d]/80 border-[#ff4d6d] shadow-[0_0_10px_rgba(255,77,109,0.5)] cursor-not-allowed';
      }
      return 'bg-[#ff4d6d]/60 border-[#ff4d6d]/80 cursor-not-allowed';
    }

    switch (seat.status) {
      case 'available':
        return 'bg-white/10 border-white/20 hover:border-[#ff4d6d]/50 hover:bg-[#ff4d6d]/20 cursor-pointer';
      case 'locked':
        return 'bg-yellow-500/30 border-yellow-500/50 cursor-not-allowed opacity-50';
      case 'booked':
        return 'bg-red-500/40 border-red-500/50 cursor-not-allowed opacity-40';
    }
  };

  const organizeSeats = () => {
    if (!seatMap) return {};
    const organized: { [key: string]: SeatMapEntry[] } = {};
    seatMap.seats.forEach((seat) => {
      if (!organized[seat.row_label]) {
        organized[seat.row_label] = [];
      }
      organized[seat.row_label].push(seat);
    });
    Object.keys(organized).forEach((row) => {
      organized[row].sort((a, b) => a.seat_number - b.seat_number);
    });
    return organized;
  };

  const getRemainingTime = () => {
    if (!lockExpiry) return null;
    const remaining = Math.floor((lockExpiry - now) / 1000);
    if (remaining <= 0) return '0:00';
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading || !user || !showtime) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4d6d]"></div>
      </div>
    );
  }

  const organizedSeats = organizeSeats();
  const rows = Object.keys(organizedSeats).sort();
  const totalPrice = parseFloat(showtime.price) * (lockedSeats.length || selectedSeats.length);

  return (
    <div className="min-h-screen bg-background text-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-x-0 border-t-0 border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <Link href={`/movies/${showtime.movie_id}/showtimes`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition text-sm mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Showtimes
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Select Your Seats
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{new Date(showtime.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="mx-2">•</span>
                <Ticket className="w-4 h-4" />
                <span>${parseFloat(showtime.price).toFixed(2)} per seat</span>
              </div>
            </div>
            
            {lockExpiry && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-right bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-xl"
              >
                <div className="text-xs text-red-400 uppercase font-bold tracking-wider mb-1">Time remaining</div>
                <div className="text-2xl font-mono font-bold text-red-500">
                  {getRemainingTime()}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
            >
              <span className="font-medium">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="mb-12 flex flex-wrap gap-6 justify-center text-sm glass-panel py-4 px-6 rounded-full w-max mx-auto">
          {[
            { label: 'Available', color: 'bg-white/10 border-white/20' },
            { label: 'Selected', color: 'bg-gradient-to-r from-red-500 to-pink-500 border-white shadow-[0_0_10px_rgba(255,42,85,0.4)]' },
            { label: 'Your Lock', color: 'bg-yellow-500/80 border-yellow-400' },
            { label: 'Your Booked Seats', color: 'bg-[#ff4d6d]/60 border-[#ff4d6d]/80' },
            { label: 'Unavailable', color: 'bg-red-500/40 border-red-500/50' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-t-lg rounded-b-sm border ${item.color}`}></div>
              <span className="text-gray-300 font-medium">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Theater Screen */}
        <div className="mb-16 max-w-4xl mx-auto relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#ff4d6d]/20 filter blur-[50px] rounded-full pointer-events-none"></div>
          <svg viewBox="0 0 800 100" className="w-full drop-shadow-[0_10px_20px_rgba(255,42,85,0.3)]">
            <path d="M 50 100 Q 400 0 750 100" fill="none" stroke="url(#screen-gradient)" strokeWidth="6" strokeLinecap="round" />
            <defs>
              <linearGradient id="screen-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#ff4d6d" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center text-sm font-bold tracking-[0.3em] text-[#ff4d6d]/60 mt-2 uppercase">Screen</div>
        </div>

        {/* Seat Grid */}
        <div className="max-w-4xl mx-auto overflow-x-auto pb-8">
          <div className="min-w-max mx-auto px-4">
            {rows.map((row) => (
              <div key={row} className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 text-center font-bold text-gray-500">
                  {row}
                </div>
                <div className="flex gap-2">
                  {organizedSeats[row].map((seat) => (
                    <motion.button
                      whileHover={seat.status === 'available' && step === 'select' ? { scale: 1.15, y: -2 } : {}}
                      whileTap={seat.status === 'available' && step === 'select' ? { scale: 0.95 } : {}}
                      key={seat.seat_id}
                      onClick={() => handleSeatClick(seat)}
                      disabled={seat.status !== 'available' || step !== 'select'}
                      className={`w-10 h-10 border rounded-t-xl rounded-b-md flex items-center justify-center text-xs font-bold text-white transition-all duration-200 ${getSeatStyle(seat)}`}
                      title={`${row}${seat.seat_number}`}
                    >
                      {seat.seat_number}
                    </motion.button>
                  ))}
                </div>
                <div className="w-8 text-center font-bold text-gray-500">
                  {row}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {(selectedSeats.length > 0 || lockedSeats.length > 0) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-6"
          >
            <div className="max-w-4xl mx-auto glass-panel border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  {step === 'select' && `${selectedSeats.length} seat(s) selected`}
                  {step === 'locked' && `${lockedSeats.length} seat(s) locked`}
                  {step === 'confirming' && 'Processing transaction...'}
                </div>
                <div className="text-3xl font-bold text-white">
                  ${totalPrice.toFixed(2)}
                </div>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                {step === 'select' && (
                  <button
                    onClick={handleLockSeats}
                    disabled={loadingAction}
                    className="btn-premium w-full sm:w-auto px-8"
                  >
                    {loadingAction ? 'Locking...' : 'Lock Seats'}
                  </button>
                )}
                
                {step === 'locked' && (
                  <>
                    <button
                      onClick={handleCancelSelection}
                      disabled={loadingAction}
                      className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmReservation}
                      disabled={loadingAction}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] rounded-xl font-bold transition-all flex items-center gap-2"
                    >
                      {loadingAction ? 'Processing...' : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Confirm Payment
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
