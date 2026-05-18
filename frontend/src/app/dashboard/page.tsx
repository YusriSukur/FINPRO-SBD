'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, Ticket, TrendingUp, Calendar, Plus, ShieldAlert, X, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceVIP, setPriceVIP] = useState('2500000');
  const [priceCAT1, setPriceCAT1] = useState('1500000');
  const [priceCAT2, setPriceCAT2] = useState('800000');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [totalStock, setTotalStock] = useState('');
  const [date, setDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  useEffect(() => {
    const currentUserStr = localStorage.getItem('user');
    if (!currentUserStr) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(currentUserStr);
    setUser(parsedUser);
    setLoading(false);

    if (parsedUser.role === 'SELLER') {
      fetchEvents();
    }
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError('');
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFormError('Ukuran file maksimal adalah 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    if (!title || !priceVIP || !priceCAT1 || !priceCAT2 || !totalStock || !date) {
      setFormError('Semua kolom bertanda * wajib diisi');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priceVIP: parseFloat(priceVIP),
          priceCAT1: parseFloat(priceCAT1),
          priceCAT2: parseFloat(priceCAT2),
          price: parseFloat(priceCAT2),
          imageUrl, // Send Base64 String
          totalStock: parseInt(totalStock),
          date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Gagal membuat event');
        setSubmitting(false);
        return;
      }

      // Success
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setPriceVIP('2500000');
      setPriceCAT1('1500000');
      setPriceCAT2('800000');
      setImageUrl(null);
      setTotalStock('');
      setDate('');
      fetchEvents(); // Refresh list
    } catch (err) {
      setFormError('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="bg-[#09090b] min-h-screen text-white p-20 text-center">Loading...</div>;
  }

  // Guard: Check if role is SELLER
  if (user?.role !== 'SELLER') {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex justify-center items-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass p-10 rounded-[40px] text-center border border-zinc-800"
          >
            <div className="mb-6 flex justify-center text-red-400">
              <ShieldAlert size={80} className="glow" />
            </div>
            <h2 className="text-3xl font-bold mb-4 text-red-500">Akses Ditolak</h2>
            <p className="text-zinc-400 mb-8 text-sm">Halaman ini hanya dapat diakses oleh akun Penyelenggara Event (Seller).</p>
            <button onClick={() => router.push('/')} className="war-button w-full py-4 rounded-2xl font-bold text-lg">
              Kembali ke Beranda
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  // Aggregate stats based on loaded events
  const totalActiveEvents = events.length;
  const totalStockSum = events.reduce((acc, curr) => acc + (curr.totalStock || 0), 0);
  const totalCurrentStockSum = events.reduce((acc, curr) => acc + (curr.currentStock !== undefined ? curr.currentStock : curr.totalStock || 0), 0);
  const totalTicketsSold = totalStockSum - totalCurrentStockSum;

  const mockStats = [
    { label: 'Total Penjualan (Estimasi)', value: `Rp ${(totalTicketsSold * 1500000).toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
    { label: 'Tiket Terjual', value: `${totalTicketsSold}/${totalStockSum}`, icon: Ticket, color: 'text-indigo-400' },
    { label: 'Event Aktif', value: `${totalActiveEvents} Event`, icon: Calendar, color: 'text-amber-400' },
    { label: 'Total Pengunjung Antrean', value: totalTicketsSold > 0 ? (totalTicketsSold * 3).toString() : '0', icon: Users, color: 'text-purple-400' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col relative">
      <Navbar />
      <main className="flex-1 container mx-auto px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-12"
        >
          <div>
            <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
              <LayoutDashboard className="text-indigo-400" />
              Seller Dashboard
            </h1>
            <p className="text-zinc-400 text-sm">Selamat datang kembali, Penyelenggara Event {user.name}!</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold transition-all duration-300 shadow-lg shadow-indigo-600/30"
          >
            <Plus size={20} />
            Buat Event Baru
          </button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {mockStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-6 rounded-3xl border border-zinc-800"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-zinc-500 text-sm font-semibold">{stat.label}</span>
                  <Icon className={`${stat.color}`} size={24} />
                </div>
                <div className="text-3xl font-black">{stat.value}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Event List Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-8 rounded-[40px] border border-zinc-800"
        >
          <h2 className="text-2xl font-black mb-6">Kelola Event Anda</h2>
          
          {events.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Calendar className="mx-auto mb-4 opacity-35" size={48} />
              Belum ada event yang dibuat. Mulai dengan membuat event baru!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-sm">
                    <th className="pb-4 font-semibold">Foto</th>
                    <th className="pb-4 font-semibold">Nama Event</th>
                    <th className="pb-4 font-semibold">Tanggal</th>
                    <th className="pb-4 font-semibold">Harga VIP</th>
                    <th className="pb-4 font-semibold">Harga CAT 1</th>
                    <th className="pb-4 font-semibold">Harga CAT 2</th>
                    <th className="pb-4 font-semibold">Stok Tiket</th>
                    <th className="pb-4 font-semibold">Status</th>
                    <th className="pb-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/30 transition-colors">
                      <td className="py-5">
                        {event.imageUrl ? (
                          <img 
                            src={event.imageUrl} 
                            alt={event.title} 
                            className="w-12 h-12 object-cover rounded-xl border border-zinc-800" 
                          />
                        ) : (
                          <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-650">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </td>
                      <td className="py-5 font-bold text-white">{event.title}</td>
                      <td className="py-5 text-zinc-400">{new Date(event.date).toLocaleDateString()}</td>
                      <td className="py-5 font-bold text-purple-400">Rp {(event.priceVIP || 2500000).toLocaleString()}</td>
                      <td className="py-5 font-bold text-blue-400">Rp {(event.priceCAT1 || 1500000).toLocaleString()}</td>
                      <td className="py-5 font-bold text-green-400">Rp {(event.priceCAT2 || 800000).toLocaleString()}</td>
                      <td className="py-5 font-bold text-indigo-400">
                        {event.currentStock !== undefined ? event.currentStock : event.totalStock}/{event.totalStock}
                      </td>
                      <td className="py-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border bg-green-500/10 border-green-500/20 text-green-400`}>
                          Active
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <button className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors mr-4">Edit</button>
                        <button className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors">Hapus</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>

      {/* CREATE EVENT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass p-10 rounded-[40px] border border-zinc-800 relative z-10 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <h2 className="text-3xl font-black mb-2">Buat Event Baru</h2>
              <p className="text-zinc-400 text-sm mb-6">Lengkapi detail untuk mempublikasikan konser/acara baru Anda.</p>

              {formError && (
                <div className="mb-6 flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-3 rounded-2xl text-sm border border-red-500/20">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Image Upload Input */}
                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Foto Event (PNG/JPG) *</label>
                  
                  {imageUrl ? (
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-zinc-800 mb-2">
                      <img src={imageUrl} alt="Event Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setImageUrl(null)}
                        className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer bg-zinc-900/20 hover:bg-zinc-900/40 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                        <Upload className="h-8 w-8 text-zinc-500 group-hover:text-indigo-400 transition-colors mb-2" />
                        <p className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
                          <span className="font-bold">Klik untuk upload foto</span> atau drag & drop
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">PNG atau JPG (Maks. 2MB)</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg" 
                        className="hidden" 
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Nama Event *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Taylor Swift | The Eras Tour"
                    className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-650"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Deskripsi</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tuliskan deskripsi lengkap mengenai event ini..."
                    rows={2}
                    className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-650 resize-none"
                  />
                </div>

                {/* Seating category prices */}
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-3xl space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Pengaturan Harga Kategori Kursi</div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Harga VIP (Rp) *</label>
                      <input
                        type="number"
                        required
                        value={priceVIP}
                        onChange={(e) => setPriceVIP(e.target.value)}
                        placeholder="2500000"
                        min={0}
                        className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Harga CAT 1 (Rp) *</label>
                      <input
                        type="number"
                        required
                        value={priceCAT1}
                        onChange={(e) => setPriceCAT1(e.target.value)}
                        placeholder="1500000"
                        min={0}
                        className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Harga CAT 2 (Rp) *</label>
                      <input
                        type="number"
                        required
                        value={priceCAT2}
                        onChange={(e) => setPriceCAT2(e.target.value)}
                        placeholder="800000"
                        min={0}
                        className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Total Stok Tiket *</label>
                    <input
                      type="number"
                      required
                      value={totalStock}
                      onChange={(e) => setTotalStock(e.target.value)}
                      placeholder="100"
                      min={1}
                      className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-650"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">Tanggal Pelaksanaan *</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-650"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-2xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/35 transition-all war-button disabled:opacity-50"
                  >
                    {submitting ? 'Memproses...' : 'Buat Event'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
