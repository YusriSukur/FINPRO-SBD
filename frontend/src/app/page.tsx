'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { EventCard } from '../components/EventCard';
import { getEvents } from '../lib/api';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);

    const fetchEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [router]);

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <Navbar />
      
      <main className="container mx-auto px-8 py-20">
        {/* Hero Section */}
        <div className="mb-24 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-400 border border-indigo-500/20 glow">
            <Sparkles size={14} />
            Sistem War Tiket Tercepat
          </div>
          <h1 className="mb-6 text-6xl font-black tracking-tight sm:text-7xl">
            Jangan Lewatkan <br />
            <span className="gradient-text">Momen Berharga.</span>
          </h1>
          <p className="max-w-2xl text-lg text-zinc-400">
            Platform e-ticketing high-concurrency yang menjamin keadilan dalam setiap antrean. 
            Teknologi Redis kami memastikan tidak ada tiket yang terhitung ganda.
          </p>
        </div>

        {/* Event Grid */}
        <section>
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold">Event Populer</h2>
              <p className="text-zinc-500">Dapatkan tiket sebelum kehabisan!</p>
            </div>
            <div className="h-px flex-1 mx-8 bg-zinc-800" />
            <div className="flex gap-2">
              <div className="h-2 w-8 rounded-full bg-indigo-500" />
              <div className="h-2 w-2 rounded-full bg-zinc-800" />
              <div className="h-2 w-2 rounded-full bg-zinc-800" />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[450px] w-full animate-pulse rounded-3xl bg-zinc-900" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard 
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  price={event.price}
                  date={event.date}
                  stock={event.currentStock}
                  imageUrl={event.imageUrl}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mt-20 border-t border-zinc-900 py-12 text-center text-sm text-zinc-600">
        &copy; 2026 TicketFlash. All rights reserved. Powered by Redis.
      </footer>
    </div>
  );
}
