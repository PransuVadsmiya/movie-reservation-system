'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { Save, User as UserIcon, Mail, Phone, Shield, ArrowLeft, Camera } from 'lucide-react';
import UserDropdown from '@/components/UserDropdown';

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+1 (555) 000-0000'); // Mocked for now
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      await authAPI.updateProfile({ full_name: fullName });
      await refreshUser(); // Refresh the context to update the UI globally
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const initial = (user.full_name || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-red-500/30">
      
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl font-bold tracking-tight">Ticketify</span>
        </Link>
        <UserDropdown />
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-32">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold mb-2">Manage Account</h1>
          <p className="text-gray-400">Update your profile details and manage your settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-[#151722] rounded-2xl p-6 border border-white/5 flex flex-col items-center text-center shadow-lg">
              <div className="relative group cursor-pointer mb-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center font-bold text-5xl text-white shadow-inner">
                  {initial}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold">{user.full_name || 'Ticketify User'}</h2>
              <div className="text-sm text-gray-400 mb-4">{user.email}</div>
              
              <div className="w-full px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 font-medium text-sm flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" /> Premium Member
              </div>
            </div>
            
            <div className="bg-[#151722] rounded-2xl p-6 border border-white/5 shadow-lg">
              <h3 className="font-bold mb-4 text-sm tracking-wider uppercase text-gray-500">Quick Links</h3>
              <ul className="space-y-3">
                <li><Link href="/reservations" className="text-gray-300 hover:text-[#ff4d6d] transition-colors font-medium">My Bookings</Link></li>
                <li><a href="#" className="text-gray-300 hover:text-[#ff4d6d] transition-colors font-medium">Payment Methods</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#ff4d6d] transition-colors font-medium">Notification Settings</a></li>
              </ul>
            </div>
          </div>

          {/* Right Content */}
          <div className="md:col-span-2">
            <div className="bg-[#151722] rounded-2xl p-8 border border-white/5 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
              
              {message && (
                <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                  {message.text}
                </div>
              )}
              
              <form onSubmit={handleSave} className="space-y-6">
                
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Email (Read Only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Email Address (Read Only)</label>
                  <div className="relative opacity-60">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Phone (Mock) */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 bg-[#ff4d6d] text-white hover:bg-[#ff2a55] font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,42,85,0.3)]"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
