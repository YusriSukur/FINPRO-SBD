import './env.js';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';


const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');


async function main() {
  console.log('DB URL:', process.env.DATABASE_URL);
  console.log('🌱 Seeding events...');


  const events = [
    {
      title: 'Taylor Swift | The Eras Tour',
      description: 'The most anticipated concert of the year. Experience the eras of Taylor Swift.',
      price: 1500000,
      totalStock: 50,
      stockVIP: 10,
      stockCAT1: 20,
      stockCAT2: 20,
      date: new Date('2026-12-01'),
    },
    {
      title: 'Coldplay: Music of the Spheres',
      description: 'A spectacular audio-visual experience with Coldplay.',
      price: 2500000,
      totalStock: 30,
      stockVIP: 5,
      stockCAT1: 10,
      stockCAT2: 15,
      date: new Date('2026-11-15'),
    },
    {
      title: 'Bruno Mars Live in Jakarta',
      description: 'Get ready to dance with Bruno Mars.',
      price: 1200000,
      totalStock: 100,
      stockVIP: 20,
      stockCAT1: 30,
      stockCAT2: 50,
      date: new Date('2026-10-20'),
    },
  ];

  for (const e of events) {
    const event = await prisma.event.create({
      data: e,
    });
    
    // Seed Redis stock
    await redis.set(`ticket_stock:${event.id}:total`, event.totalStock);
    await redis.set(`ticket_stock:${event.id}:VIP`, event.stockVIP);
    await redis.set(`ticket_stock:${event.id}:CAT 1`, event.stockCAT1);
    await redis.set(`ticket_stock:${event.id}:CAT 2`, event.stockCAT2);
    console.log(`✅ Created event: ${event.title} with ID: ${event.id}`);
  }

  console.log('✨ Seeding finished.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
