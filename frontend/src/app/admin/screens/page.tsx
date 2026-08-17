'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { Monitor, Plus } from 'lucide-react';

interface Screen {
  id: string;
  name: string;
  rows: number;
  columns: number;
}

export default function AdminScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [name, setName] = useState('');
  const [rows, setRows] = useState(10);
  const [columns, setColumns] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchScreens = async () => {
    try {
      const response = await apiClient.get<Screen[]>('/screens');
      setScreens(response.data);
    } catch (err) {
      console.error('Failed to fetch screens', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const handleAddScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Screen name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/screens', {
        name: name.trim(),
        rows: Number(rows),
        columns: Number(columns)
      });
      setSuccess('Screen added successfully!');
      setName('');
      setRows(10);
      setColumns(10);
      fetchScreens();
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.response?.data?.detail || 'Failed to add screen');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4d6d]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Manage Screens</h1>
          <p className="text-gray-400 text-sm">Add and configure physical screens in your theater</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Screens List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-4">Your Screens ({screens.length})</h2>
          
          {screens.length === 0 ? (
            <div className="bg-[#151722] border border-white/5 rounded-xl p-8 text-center text-gray-400">
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>You don't have any screens yet.</p>
              <p className="text-sm mt-1">Add your first screen to start allocating shows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {screens.map(screen => (
                <div key={screen.id} className="bg-[#151722] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#ff4d6d]/10 flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-[#ff4d6d]" />
                      </div>
                      <div>
                        <h3 className="font-bold">{screen.name}</h3>
                        <p className="text-xs text-gray-400">ID: {screen.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-black/30 p-2 rounded-lg text-center">
                      <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Rows</span>
                      <span className="font-semibold text-gray-200">{screen.rows}</span>
                    </div>
                    <div className="bg-black/30 p-2 rounded-lg text-center">
                      <span className="block text-gray-400 text-xs uppercase tracking-wider mb-1">Columns</span>
                      <span className="font-semibold text-gray-200">{screen.columns}</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center text-xs text-gray-500">
                    Total Capacity: <strong className="text-gray-300">{screen.rows * screen.columns} seats</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Screen Form */}
        <div>
          <div className="bg-[#151722] border border-white/10 rounded-xl p-6 sticky top-24">
            <h2 className="text-lg font-bold border-b border-white/10 pb-2 mb-6">Add New Screen</h2>
            
            <form onSubmit={handleAddScreen} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Screen Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Screen 1, IMAX, Hall A"
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#ff4d6d] transition-colors text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Rows</label>
                  <input 
                    type="number" 
                    min="1"
                    max="26"
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#ff4d6d] transition-colors text-sm"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 26 (A-Z)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Columns</label>
                  <input 
                    type="number" 
                    min="1"
                    max="50"
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-[#ff4d6d] transition-colors text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="bg-black/20 p-3 rounded-lg flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Capacity:</span>
                <span className="font-bold">{rows * columns} seats</span>
              </div>

              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-2.5 bg-[#ff4d6d] text-white rounded-lg font-medium hover:bg-[#ff3355] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? 'Adding...' : (
                  <><Plus className="w-4 h-4" /> Add Screen</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
