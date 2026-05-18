import React, { useEffect, useState } from 'react';
import { Ticket, User, LogOut } from 'lucide-react';
import Link from 'next/link';

export const Navbar = () => {
  const [user, setUser] = useState<any>(null);

  const loadUser = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('auth-change', loadUser);
    return () => window.removeEventListener('auth-change', loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

  return (
    <nav className="glass sticky top-0 z-50 flex h-20 w-full items-center justify-between px-8">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg glow">
          <Ticket className="text-white" size={24} />
        </div>
        <span className="text-2xl font-bold tracking-tight text-white">
          Ticket<span className="gradient-text font-black">FLASH</span>
        </span>
      </Link>
      <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">Events</Link>
        {user?.role === 'SELLER' ? (
          <Link href="/dashboard" className="text-sm font-bold text-indigo-400 transition-colors hover:text-indigo-300">Dashboard</Link>
        ) : (
          <Link href="#" className="text-sm font-medium text-zinc-400 transition-colors hover:text-white">My Orders</Link>
        )}
        
        {user ? (
          <div className="flex items-center gap-4 ml-4 pl-4 border-l border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <User size={16} />
              </div>
              <span className="text-sm font-bold text-white">{user.name.split(' ')[0]}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-zinc-800">
            <Link href="/login" className="text-sm font-bold text-zinc-300 hover:text-white transition-colors">
              Masuk
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-xl text-sm font-bold bg-white text-black hover:bg-zinc-200 transition-colors">
              Daftar
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
