'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';

interface ListBooking {
  reservation_id: string;
  user_email: string;
  movie_title: string;
  start_time: string;
  status: string;
}

export default function ListBookingsPage() {
  const [bookings, setBookings] = useState<ListBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await apiClient.get('/admin/bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading bookings...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">List <span className="text-[#ff4d6d]">Bookings</span></h1>
      
      <div className="bg-[#151722] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="py-4 px-6 font-semibold text-white">User Email</th>
                <th className="py-4 px-6 font-semibold text-white">Movie</th>
                <th className="py-4 px-6 font-semibold text-white">Show Time</th>
                <th className="py-4 px-6 font-semibold text-white">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No bookings yet.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.reservation_id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-white font-medium">{booking.user_email}</td>
                    <td className="py-4 px-6 text-gray-300">{booking.movie_title}</td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(booking.start_time).toLocaleString('en-US', { 
                        weekday: 'short', month: 'short', day: 'numeric', 
                        hour: 'numeric', minute: '2-digit' 
                      })}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${
                        booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
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
