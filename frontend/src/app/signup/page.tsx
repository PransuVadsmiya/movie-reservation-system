'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Film, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [theaterName, setTheaterName] = useState('');
  const [theaterAddress, setTheaterAddress] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreed) {
      setError('You must agree to the Terms & Conditions');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/signup', {
        full_name: fullName,
        email,
        password,
        is_admin: isAdmin,
        theater_name: isAdmin ? theaterName : null,
        theater_address: isAdmin ? theaterAddress : null,
      });

      const userData = response.data;
      setSuccess(true);
      
      setTimeout(() => {
        if (userData.is_admin || userData.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      if (err.response?.data?.detail?.message) {
        setError(err.response.data.detail.message);
      } else if (typeof err.response?.data?.detail === 'string') {
        setError(err.response.data.detail);
      } else {
        setError('Signup failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center relative overflow-hidden text-white p-4 font-sans selection:bg-red-500/30">
      {/* Cinematic Background Elements */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 filter blur-sm pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-pink-500 mb-2">
            Ticketify
          </Link>
          <p className="text-gray-400">Join the premiere movie experience</p>
        </div>

        <div className="bg-[#151722] border border-white/5 shadow-xl rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
          
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              <span>Account created successfully! Redirecting to login...</span>
            </motion.div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-400 mb-2">Want to list your show?</p>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="isAdmin" 
                      checked={isAdmin} 
                      onChange={() => setIsAdmin(true)}
                      className="w-4 h-4 text-[#ff4d6d] bg-white/5 border-white/20 focus:ring-[#ff4d6d] focus:ring-2"
                    />
                    <span className="text-sm text-gray-300">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="isAdmin" 
                      checked={!isAdmin} 
                      onChange={() => setIsAdmin(false)}
                      className="w-4 h-4 text-[#ff4d6d] bg-white/5 border-white/20 focus:ring-[#ff4d6d] focus:ring-2"
                    />
                    <span className="text-sm text-gray-300">No</span>
                  </label>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-5 mb-5 p-5 bg-black/20 rounded-xl border border-white/5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5" htmlFor="theaterName">Theater Name</label>
                    <input
                      id="theaterName"
                      type="text"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all placeholder-gray-500"
                      placeholder="e.g. Rahulraj PVR"
                      value={theaterName}
                      onChange={(e) => setTheaterName(e.target.value)}
                      required={isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5" htmlFor="theaterAddress">Theater Address</label>
                    <textarea
                      id="theaterAddress"
                      rows={2}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all placeholder-gray-500 resize-none"
                      placeholder="e.g. Robert Robertson, 1234 NW Bobcat Lane"
                      value={theaterAddress}
                      onChange={(e) => setTheaterAddress(e.target.value)}
                      required={isAdmin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="fullName">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="fullName"
                    type="text"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all placeholder-gray-500"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5" htmlFor="email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all placeholder-gray-500"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5" htmlFor="password">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all placeholder-gray-500"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5" htmlFor="confirmPassword">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500" />
                    </div>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-[#ff4d6d] focus:border-transparent transition-all placeholder-gray-500"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  id="agreed"
                  type="checkbox"
                  className="w-4 h-4 rounded bg-white/5 border border-white/10 text-[#ff4d6d] focus:ring-[#ff4d6d]/50 cursor-pointer"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label htmlFor="agreed" className="text-sm text-gray-400 cursor-pointer select-none">
                  I have read and agree to the <span className="text-[#ff4d6d] hover:underline">Terms & Conditions</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 mt-4 bg-[#ff4d6d] hover:bg-[#ff2a55] text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(255,42,85,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                  <>Create Account</>
                )}
              </button>
            </form>
          )}

          {!success && (
            <>
              <div className="mt-6 flex items-center justify-between">
                <span className="w-1/5 border-b border-white/10 lg:w-1/4"></span>
                <span className="text-xs text-center text-gray-500 uppercase">or</span>
                <span className="w-1/5 border-b border-white/10 lg:w-1/4"></span>
              </div>

              <a 
                href={`${process.env.NEXT_PUBLIC_API_URL?.replace(':8080', ':10000') || 'http://127.0.0.1:10000'}/auth/google/login`}
                className="w-full flex justify-center items-center gap-3 py-3 mt-6 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </a>
            </>
          )}

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#ff4d6d] hover:text-white transition-colors font-medium">
              Log in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
