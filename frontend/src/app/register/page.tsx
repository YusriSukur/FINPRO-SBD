'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Registrasi gagal');
        setLoading(false);
        return;
      }
      
      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setSuccess(true);
      window.dispatchEvent(new Event('auth-change'));
      
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      setError('Terjadi kesalahan jaringan');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex justify-center items-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass p-10 rounded-[40px] relative overflow-hidden border border-zinc-800"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            {success ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <div className="mb-6 flex justify-center text-green-400">
                  <CheckCircle2 size={80} className="glow" />
                </div>
                <h2 className="text-3xl font-bold mb-2 text-green-400">Registrasi Berhasil!</h2>
                <p className="text-zinc-400 text-sm">Mengalihkan ke beranda...</p>
              </motion.div>
            ) : (
              <>
                <h1 className="text-4xl font-black mb-2 text-center">Buat Akun</h1>
                <p className="text-zinc-400 text-center mb-8 text-sm">Daftar sekarang untuk memulai war tiket.</p>
                
                {error && (
                  <div className="mb-6 flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-3 rounded-2xl text-sm border border-red-500/20">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {/* Role Switcher */}
                <div className="mb-6 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRole('BUYER')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${role === 'BUYER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Pembeli Tiket
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('SELLER')}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${role === 'SELLER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Penyelenggara Event
                  </button>
                </div>
                
                <form onSubmit={handleRegister} className="space-y-5">
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-500"
                        placeholder="Nama Lengkap"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-zinc-500" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-500"
                        placeholder="Alamat Email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-zinc-500" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-500"
                        placeholder="Kata Sandi"
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-4 rounded-2xl font-bold text-lg war-button disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {loading ? 'Memproses...' : 'Daftar Akun'}
                  </button>
                </form>
                
                <div className="mt-8 text-center text-sm text-zinc-400">
                  Sudah punya akun?{' '}
                  <button onClick={() => router.push('/login')} className="text-indigo-400 font-bold hover:text-indigo-300">
                    Masuk di sini
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
