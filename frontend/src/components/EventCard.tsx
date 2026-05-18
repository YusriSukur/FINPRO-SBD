import React from 'react';
import { Calendar, MapPin, Tag } from 'lucide-react';
import Link from 'next/link';

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  date: string;
  stock: number;
  imageUrl?: string;
}

export const EventCard = ({ id, title, description, price, date, stock, imageUrl }: EventCardProps) => {
  const formattedDate = new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);

  return (
    <div className="group glass animate-float overflow-hidden rounded-3xl transition-all hover:glow hover:border-indigo-500/50">
      <div className="relative h-48 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        <div className="absolute top-4 right-4 z-20 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 backdrop-blur-md">
          {stock > 0 ? `${stock} Tiket Tersisa` : 'Sold Out'}
        </div>
        <img 
          src={imageUrl || `https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000`} 
          alt={title} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="p-6">
        <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
        <p className="mb-4 text-sm leading-relaxed text-zinc-400 line-clamp-2">
          {description}
        </p>
        
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <MapPin size={14} />
            <span>Jakarta International Stadium</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Tag size={14} />
            <span className="font-bold text-indigo-400">{formattedPrice}</span>
          </div>
        </div>

        <Link 
          href={`/event/${id}`}
          className={`war-button flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold text-white ${stock === 0 ? 'opacity-50 pointer-events-none grayscale' : ''}`}
        >
          {stock > 0 ? 'Dapatkan Tiket' : 'Habis Terjual'}
        </Link>
      </div>
    </div>
  );
};
