'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { api, getEventById, joinQueue, getQueueStatus, reserveTicket, confirmPayment } from '../../../lib/api';
import { socket } from '../../../lib/socket';
import { Calendar, MapPin, Users, Timer, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'queueing' | 'promoted' | 'selecting_seat' | 'reserving' | 'paid' | 'expired'>('idle');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fallbackImages = [
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=1000",
    "https://images.unsplash.com/photo-1470229722913-7c090be5bc3a?auto=format&fit=crop&q=80&w=1000"
  ];

  const eventImages = event?.imageUrl 
    ? [event.imageUrl, ...fallbackImages]
    : fallbackImages;

  // Seat Selection State
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  
  const ticketCategories = [
    { id: 'vip', name: 'VIP', price: event?.priceVIP || 2500000, color: 'border-purple-500', seats: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2'] },
    { id: 'cat1', name: 'CAT 1', price: event?.priceCAT1 || 1500000, color: 'border-blue-500', seats: ['C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2'] },
    { id: 'cat2', name: 'CAT 2', price: event?.priceCAT2 || 800000, color: 'border-green-500', seats: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'F1', 'F2', 'F3'] },
  ];

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % eventImages.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + eventImages.length) % eventImages.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % eventImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await getEventById(id);
        setEvent(data);
      } catch (error) {
        console.error('Failed to fetch event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

    // Socket Setup
    socket.connect();
    socket.emit('join_event', id);

    const currentUserStr = localStorage.getItem('user');
    let currentUserId = null;
    if (currentUserStr) {
      const parsedUser = JSON.parse(currentUserStr);
      setUser(parsedUser);
      currentUserId = parsedUser.id;
    }

    socket.on('queue_update', (data) => {
      if (data.eventId === id) {
        // Optionally update global queue length
      }
    });

    socket.on('user_promoted', (data) => {
      if (currentUserId && data.userId === currentUserId && data.eventId === id) {
        setStatus('promoted');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Timer logic for reservation
  useEffect(() => {
    let interval: any;
    if (status === 'reserving' && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      setStatus('expired');
    }
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  const handleJoinQueue = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setStatus('queueing');
      const res = await joinQueue(id, user.id);
      setQueuePosition(res.position);
    } catch (error) {
      console.error(error);
      setStatus('idle');
    }
  };

  const handleProceedToSeatSelection = () => {
    setStatus('selecting_seat');
  };

  const handleReserve = async () => {
    if (!user || !selectedCategory || !selectedSeat) return;
    try {
      setStatus('reserving');
      
      const seatDetails = JSON.stringify({
        category: selectedCategory.name,
        seat: selectedSeat,
        price: selectedCategory.price
      });

      // API call should accept seatDetails in a real app.
      // For now we use the existing reserveTicket function and mock the backend capability.
      await reserveTicket(id, user.id); 
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reserve');
      setStatus('selecting_seat');
    }
  };

  const handlePayment = async () => {
    if (!user) return;
    try {
      await confirmPayment(id, user.id);
      setStatus('paid');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading || !event) return <div className="bg-[#09090b] min-h-screen text-white p-20 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Navbar />
      
      <main className="container mx-auto px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left: Event Details */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative w-full h-[400px] mb-8 rounded-3xl overflow-hidden group glow border border-zinc-800 shadow-2xl shadow-indigo-500/10">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={eventImages[currentImageIndex]}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 w-full h-full object-cover"
                  alt={`${event.title} - Slide ${currentImageIndex + 1}`}
                />
              </AnimatePresence>
              
              {/* Gradient Overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-transparent opacity-60" />

              {/* Navigation Arrows */}
              <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={prevImage}
                  className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 hover:scale-110 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={nextImage}
                  className="p-3 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/10 hover:bg-black/60 hover:scale-110 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Indicators */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-10">
                {eventImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-indigo-500 w-8 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-white/40 hover:bg-white/80 w-2'}`}
                  />
                ))}
              </div>
            </div>
            <h1 className="text-5xl font-black mb-6">{event.title}</h1>
            <p className="text-zinc-400 text-lg leading-relaxed mb-8">
              {event.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-6 rounded-2xl">
                <Calendar className="text-indigo-400 mb-2" />
                <div className="text-sm text-zinc-500">Tanggal</div>
                <div className="font-bold">{new Date(event.date).toLocaleDateString()}</div>
              </div>
              <div className="glass p-6 rounded-2xl">
                <MapPin className="text-indigo-400 mb-2" />
                <div className="text-sm text-zinc-500">Lokasi</div>
                <div className="font-bold">Jakarta, Stadium</div>
              </div>
            </div>
          </motion.div>

          {/* Right: Booking Status Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-center"
          >
            <div className="w-full max-w-md glass p-10 rounded-[40px] relative overflow-hidden border-2 border-indigo-500/20">
              <AnimatePresence mode="wait">
                {status === 'idle' && (
                  <motion.div key="idle" className="text-center" exit={{ opacity: 0, scale: 0.9 }}>
                    <h2 className="text-3xl font-bold mb-4">Mulai War Tiket?</h2>
                    <p className="text-zinc-400 mb-8 text-sm">Klik tombol di bawah untuk masuk ke antrean virtual.</p>
                    
                    {!user && (
                      <div className="mb-6 flex items-center justify-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-3 rounded-2xl text-sm border border-indigo-500/20">
                        <Lock size={16} />
                        Anda harus login untuk ikut antrean
                      </div>
                    )}
                    
                    <button onClick={handleJoinQueue} className="war-button w-full py-4 rounded-2xl font-bold text-lg">
                      {user ? 'Masuk Antrean' : 'Login ke Akun Anda'}
                    </button>
                  </motion.div>
                )}

                {status === 'queueing' && (
                  <motion.div key="queueing" className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="mb-6 flex justify-center">
                      <div className="animate-spin h-20 w-20 border-4 border-indigo-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Dalam Antrean</h2>
                    <p className="text-zinc-400 mb-8 text-sm">Mohon jangan tutup halaman ini.</p>
                    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                      <div className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Posisi Anda</div>
                      <div className="text-5xl font-black gradient-text">#{queuePosition || '...'}</div>
                    </div>
                  </motion.div>
                )}

                {status === 'promoted' && (
                  <motion.div key="promoted" className="text-center" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="mb-6 flex justify-center text-green-400">
                      <CheckCircle2 size={80} className="glow" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-green-400">Antrean Selesai!</h2>
                    <p className="text-zinc-400 mb-8 text-sm">Sekarang giliran Anda untuk memilih tempat duduk.</p>
                    <button onClick={handleProceedToSeatSelection} className="war-button w-full py-4 rounded-2xl font-bold text-lg bg-green-500 hover:bg-green-400">
                      Lanjut Pemilihan Kursi
                    </button>
                  </motion.div>
                )}

                {status === 'selecting_seat' && (
                  <motion.div key="selecting_seat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setStatus('promoted')} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <ChevronLeft size={20} />
                      </button>
                      <h2 className="text-2xl font-bold">Pilih Kursi</h2>
                    </div>
                    
                    <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
                      {/* Denah Panggung Visual */}
                      <div className="mb-6 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                        <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-6 text-center">Denah Panggung</div>
                        <div className="flex flex-col gap-3 items-center">
                          {/* Stage */}
                          <div className="w-2/3 h-10 bg-gradient-to-b from-indigo-500/20 to-transparent rounded-t-[40px] flex items-end justify-center pb-2 text-xs font-bold text-indigo-400 mb-6 border-t-2 border-indigo-500 shadow-[0_-10px_30px_rgba(99,102,241,0.2)]">
                            STAGE
                          </div>
                          
                          {/* VIP */}
                          <div className="w-full flex justify-center">
                            <div 
                              onClick={() => { setSelectedCategory(ticketCategories.find(c => c.id === 'vip')); setSelectedSeat(null); }}
                              className={`w-1/2 py-4 rounded-xl text-center text-sm font-bold border-2 cursor-pointer transition-all ${selectedCategory?.id === 'vip' ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-purple-500/30 text-purple-500/50 hover:border-purple-500/60'}`}
                            >
                              VIP
                            </div>
                          </div>
                          
                          {/* CAT 1 */}
                          <div className="w-full flex justify-center gap-3">
                            <div 
                              onClick={() => { setSelectedCategory(ticketCategories.find(c => c.id === 'cat1')); setSelectedSeat(null); }}
                              className={`w-5/12 py-5 rounded-xl text-center text-sm font-bold border-2 cursor-pointer transition-all ${selectedCategory?.id === 'cat1' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'border-blue-500/30 text-blue-500/50 hover:border-blue-500/60'}`}
                            >
                              CAT 1 (L)
                            </div>
                            <div 
                              onClick={() => { setSelectedCategory(ticketCategories.find(c => c.id === 'cat1')); setSelectedSeat(null); }}
                              className={`w-5/12 py-5 rounded-xl text-center text-sm font-bold border-2 cursor-pointer transition-all ${selectedCategory?.id === 'cat1' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'border-blue-500/30 text-blue-500/50 hover:border-blue-500/60'}`}
                            >
                              CAT 1 (R)
                            </div>
                          </div>
                          
                          {/* CAT 2 */}
                          <div className="w-full flex justify-center mt-2">
                            <div 
                              onClick={() => { setSelectedCategory(ticketCategories.find(c => c.id === 'cat2')); setSelectedSeat(null); }}
                              className={`w-11/12 py-6 rounded-xl text-center text-sm font-bold border-2 cursor-pointer transition-all ${selectedCategory?.id === 'cat2' ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-green-500/30 text-green-500/50 hover:border-green-500/60'}`}
                            >
                              CAT 2 - FESTIVAL
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-zinc-400 font-medium uppercase tracking-wider mb-2">1. Pilih Kategori</div>
                      <div className="grid grid-cols-1 gap-3">
                        {ticketCategories.map(cat => (
                          <div 
                            key={cat.id}
                            onClick={() => { setSelectedCategory(cat); setSelectedSeat(null); }}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedCategory?.id === cat.id ? `bg-zinc-800 ${cat.color}` : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-lg">{cat.name}</span>
                              <span className="text-indigo-400 font-bold">Rp {cat.price.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {selectedCategory && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6">
                          <div className="text-sm text-zinc-400 font-medium uppercase tracking-wider mb-3">2. Pilih Nomor Kursi</div>
                          <div className="grid grid-cols-4 gap-2">
                            {selectedCategory.seats.map((seat: string) => (
                              <div
                                key={seat}
                                onClick={() => setSelectedSeat(seat)}
                                className={`py-3 text-center rounded-lg cursor-pointer font-bold transition-colors ${selectedSeat === seat ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                              >
                                {seat}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <button 
                      onClick={handleReserve} 
                      disabled={!selectedCategory || !selectedSeat}
                      className="war-button w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
                    >
                      Lanjut Pembelian
                    </button>
                  </motion.div>
                )}

                {status === 'reserving' && (
                  <motion.div key="reserving" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-3 mb-8">
                      <button onClick={() => setStatus('selecting_seat')} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <ChevronLeft size={20} />
                      </button>
                      <h2 className="text-2xl font-bold">Checkout</h2>
                      <div className="ml-auto flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-sm font-bold border border-red-500/20">
                        <Timer size={14} />
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-8 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Kategori Tiket</span>
                        <span className="font-bold text-white">{selectedCategory?.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Nomor Kursi</span>
                        <span className="font-bold bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">{selectedSeat}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Harga Kursi</span>
                        <span>Rp {selectedCategory?.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Biaya Layanan</span>
                        <span>Rp 50.000</span>
                      </div>
                      <div className="h-px bg-zinc-800 my-4" />
                      <div className="flex justify-between font-bold text-xl">
                        <span>Total</span>
                        <span className="text-indigo-400">Rp {((selectedCategory?.price || event.price) + 50000).toLocaleString()}</span>
                      </div>
                    </div>
                    <button onClick={handlePayment} className="war-button w-full py-4 rounded-2xl font-bold text-lg">
                      Bayar Sekarang
                    </button>
                  </motion.div>
                )}

                {status === 'paid' && (
                  <motion.div key="paid" className="text-center">
                    <div className="mb-6 flex justify-center text-green-400">
                      <CheckCircle2 size={80} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Pembayaran Berhasil!</h2>
                    <p className="text-zinc-400 mb-8 text-sm">E-tiket Anda telah dikirim ke email.</p>
                    <a href="/" className="inline-block px-8 py-3 rounded-xl bg-zinc-800 font-bold hover:bg-zinc-700 transition-colors">
                      Kembali ke Beranda
                    </a>
                  </motion.div>
                )}

                {status === 'expired' && (
                  <motion.div key="expired" className="text-center">
                    <div className="mb-6 flex justify-center text-red-400">
                      <AlertCircle size={80} />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-red-400">Sesi Berakhir</h2>
                    <p className="text-zinc-400 mb-8 text-sm">Waktu pembayaran Anda habis. Silakan coba lagi.</p>
                    <button onClick={() => setStatus('idle')} className="w-full py-4 rounded-2xl font-bold bg-zinc-800">
                      Coba Lagi
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
