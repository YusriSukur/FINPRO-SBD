'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Login gagal');
        setLoading(false);
        return;
      }
      
      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Dispatch an event to update Navbar (if needed) or just redirect
      window.dispatchEvent(new Event('auth-change'));
      router.push('/');
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass p-10 rounded-[40px] relative overflow-hidden border border-zinc-800"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h1 className="text-4xl font-black mb-2 text-center">Selamat Datang</h1>
            <p className="text-zinc-400 text-center mb-8 text-sm">Masuk ke akun Anda untuk ikut war tiket.</p>
            
            {error && (
              <div className="mb-6 flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-3 rounded-2xl text-sm border border-red-500/20">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
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
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-lg war-button disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm text-zinc-400">
              Belum punya akun?{' '}
              <button onClick={() => router.push('/register')} className="text-indigo-400 font-bold hover:text-indigo-300">
                Daftar sekarang
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
