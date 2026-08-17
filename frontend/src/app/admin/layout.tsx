'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, PlusCircle, List, CalendarCheck, User, LogOut, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout, isAdmin } = useAuth();
  
  // Protect all admin routes
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/dashboard');
    }
  }, [user, loading, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff4d6d]"></div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Screens', path: '/admin/screens', icon: Monitor },
    { name: 'Add Shows', path: '/admin/shows/add', icon: PlusCircle },
    { name: 'List Shows', path: '/admin/shows', icon: List },
    { name: 'List Bookings', path: '/admin/bookings', icon: CalendarCheck },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex text-white font-sans selection:bg-[#ff4d6d]/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#151722] border-r border-white/5 flex flex-col h-screen sticky top-0">
        
        {/* Admin Profile Area */}
        <div className="p-6 border-b border-white/5 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-bold text-lg">{user.full_name || 'Admin User'}</h2>
          <p className="text-sm text-gray-400 mb-2">{user.email}</p>
          
          {user.theater && (
            <div className="mt-2 text-center bg-black/20 p-3 rounded-xl border border-white/5 w-full">
              <p className="text-xs font-bold text-[#ff4d6d] uppercase tracking-wider mb-1">Theater Info</p>
              <p className="text-sm font-semibold text-gray-200 truncate">{user.theater.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.theater.address}</p>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <li key={item.name}>
                  <Link href={item.path}>
                    <div className={`relative px-6 py-3 flex items-center gap-3 transition-colors ${isActive ? 'text-[#ff4d6d]' : 'text-gray-400 hover:text-white'}`}>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4d6d]"
                        />
                      )}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#ff4d6d]/10 to-transparent pointer-events-none" />
                      )}
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
