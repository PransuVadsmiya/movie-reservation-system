'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Ticket, LogOut } from 'lucide-react';

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const displayName = user.full_name || 'Ticketify User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-bold text-sm text-white shadow-lg hover:ring-2 hover:ring-purple-400 transition-all focus:outline-none"
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl z-50 overflow-hidden text-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-5 flex items-center gap-4 border-b border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-bold text-xl text-white shadow-inner flex-shrink-0">
              {initial}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-gray-900 truncate text-lg">{displayName}</div>
              <div className="text-sm text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          
          <div className="py-2">
            {user.role === 'admin' && (
              <Link 
                href="/admin/dashboard" 
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-purple-50 transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-700">Admin Dashboard</span>
              </Link>
            )}
            <Link 
              href="/account" 
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Manage account</span>
            </Link>
            
            <Link 
              href="/reservations" 
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Ticket className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">My Bookings</span>
            </Link>
            
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <LogOut className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-700">Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
