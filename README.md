# 🚀 TicketFlash - Panduan Menjalankan & Deploy Aplikasi

Repositori ini terdiri dari aplikasi fullstack dengan **Next.js** di bagian frontend dan **Express + TypeScript + Prisma + Redis** di bagian backend. Berikut adalah panduan lengkap untuk menjalankan aplikasi ini secara lokal (development) maupun deploy ke production.

---

## 🛠️ Prasyarat (Prerequisites)
Sebelum memulai, pastikan Anda telah menginstal tools berikut di komputer Anda:
*   [Node.js](https://nodejs.org/) (Sangat direkomendasikan versi **v18.x** atau **v20.x** ke atas)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Untuk menjalankan PostgreSQL & Redis secara praktis)
*   Git

---

## 💻 Cara 1: Menjalankan di Lingkungan Lokal (Local Development)

Metode ini menggunakan Docker untuk menyalakan database & Redis, sedangkan frontend dan backend dijalankan langsung menggunakan Node.js.

### Langkah 1: Jalankan Database & Redis (Docker)
1. Buka terminal Anda di root directory proyek (`finpro-sbd`).
2. Jalankan perintah berikut untuk mengaktifkan PostgreSQL dan Redis di latar belakang (background):
   ```bash
   docker compose up -d
   ```
3. Docker akan otomatis mengunduh image dan menjalankan kontainer dengan port:
   *   **PostgreSQL**: `localhost:5432` (User: `user`, Password: `password`, Database: `ticketflash`)
   *   **Redis**: `localhost:6379`

### Langkah 2: Setup dan Jalankan Backend
1. Pindah ke direktori backend:
   ```bash
   cd backend
   ```
2. Salin atau buat file konfigurasi lingkungan `.env`. Pastikan isinya sesuai dengan konfigurasi Docker:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://user:password@localhost:5432/ticketflash?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="supersecretkey"
   FRONTEND_URL="http://localhost:3000"
   ```
   > ⚠️ **Catatan penting**: Di file `.env` bawaan, tertulis `postgresql://postgres@localhost:5432/ticketflash`. Ubah menjadi `postgresql://user:password@localhost:5432/ticketflash` agar sesuai dengan kredensial yang didefinisikan di `docker-compose.yml`.

3. Instal semua dependensi:
   ```bash
   npm install
   ```
4. Sinkronisasikan skema Prisma ke database PostgreSQL:
   ```bash
   npx prisma db push
   ```
   *(Atau gunakan `npx prisma migrate dev --name init` untuk membuat riwayat migrasi resmi)*

5. Jalankan proses **Seeding** untuk mengisi data event awal ke PostgreSQL & stock awal ke Redis:
   ```bash
   npm run seed
   ```
6. Jalankan server backend dalam mode development:
   ```bash
   npm run dev
   ```
   Server backend akan aktif di `http://localhost:4000`.

### Langkah 3: Setup dan Jalankan Frontend (Next.js)
1. Buka terminal baru dan pindah ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Instal semua dependensi:
   ```bash
   npm install
   ```
3. Jalankan server frontend Next.js dalam mode development:
   ```bash
   npm run dev
   ```
4. Buka browser Anda dan akses aplikasi di:
   ```
   http://localhost:3000
   ```

---

## 🐳 Cara 2: Menjalankan Menggunakan Docker Penuh (Containerized)

Jika Anda ingin menjalankan seluruh aplikasi (Frontend, Backend, DB, Redis) dalam satu perintah menggunakan Docker Compose, Anda perlu menambahkan `Dockerfile` di folder `backend` dan `frontend` terlebih dahulu.

### 1. File Tambahan yang Diperlukan:

#### A. File `backend/Dockerfile`
Buat file bernama `Dockerfile` di dalam direktori `backend/` dengan isi:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]
```

#### B. File `frontend/Dockerfile`
Buat file bernama `Dockerfile` di dalam direktori `frontend/` dengan isi:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build Next.js
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### C. File `docker-compose.prod.yml` (di Root Directory)
Buat file baru di root directory dengan nama `docker-compose.prod.yml`:
```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: ticketflash-db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: ticketflash
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: ticketflash-redis
    ports:
      - "6379:6379"
    command: ["redis-server", "--notify-keyspace-events", "Ex"]

  backend:
    build: ./backend
    container_name: ticketflash-backend
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
      - DATABASE_URL=postgresql://user:password@postgres:5432/ticketflash?schema=public
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=supersecretkey
      - FRONTEND_URL=http://localhost:3000
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    container_name: ticketflash-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000/api
      - NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 2. Cara Menjalankan Docker Penuh:
Jalankan perintah berikut di root directory proyek:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
Semua service (Frontend, Backend, Database, Redis) akan aktif dan saling terhubung secara otomatis!

---

## 🌐 Cara 3: Deploy ke Cloud (Production Live Deployment)

Untuk men-deploy aplikasi ini ke internet agar bisa diakses oleh siapa saja secara gratis atau berbayar, skema arsitektur terbaiknya adalah sebagai berikut:

```mermaid
graph TD
    User(Pengguna/Client) -->|Akses UI| Frontend[Frontend: Vercel]
    Frontend -->|HTTP / WebSockets| Backend[Backend API: Railway / Render]
    Backend -->|Query Data| DB[(Database: Supabase PostgreSQL)]
    Backend -->|Cache & Antrian| Redis[(Redis: Upstash / Railway Redis)]
```

### 1. Database (PostgreSQL) - Supabase
1. Buat akun di [Supabase](https://supabase.com/).
2. Buat proyek baru dan dapatkan **Connection String** PostgreSQL.
3. Contoh format URI database: `postgresql://postgres:[PASSWORD-ANDA]@[HOST-SUPABASE]:5432/postgres`

### 2. Redis - Upstash
1. Buat akun gratis di [Upstash](https://upstash.com/).
2. Buat database Redis Serverless baru.
3. Dapatkan **Redis URL**, formatnya seperti: `redis://default:[PASSWORD-REDIS]@[HOST-REDIS]:6379`

### 3. Backend (API) - Render / Railway
1. Hubungkan repositori GitHub Anda ke [Render](https://render.com/) atau [Railway](https://railway.app/).
2. Pilih opsi **Web Service**.
3. Atur konfigurasi build & run:
   *   **Build Command**: `npm install && npx prisma generate && npm run build`
   *   **Start Command**: `npx prisma db push && npm run seed && npm start` *(Seeding hanya dijalankan sekali saja pada deploy pertama)*
4. Masukkan **Environment Variables**:
   *   `PORT` = `4000` (atau biarkan default Render)
   *   `DATABASE_URL` = *(URL PostgreSQL Supabase Anda)*
   *   `REDIS_URL` = *(URL Redis Upstash Anda)*
   *   `JWT_SECRET` = *(Token rahasia acak)*
   *   `FRONTEND_URL` = *(URL Frontend Vercel Anda setelah dideploy)*

### 4. Frontend (Next.js) - Vercel
1. Hubungkan repositori GitHub Anda ke [Vercel](https://vercel.com/).
2. Tambahkan proyek baru dan arahkan ke folder `frontend`.
3. Masukkan **Environment Variables**:
   *   `NEXT_PUBLIC_API_URL` = `https://[URL-BACKEND-ANDA].onrender.com/api`
   *   `NEXT_PUBLIC_SOCKET_URL` = `https://[URL-BACKEND-ANDA].onrender.com`
4. Klik **Deploy**! Vercel akan secara otomatis membangun aplikasi Next.js Anda dan menyediakannya dengan SSL gratis.


**Hasil Akhir "**
<img width="596" height="204" alt="image" src="https://github.com/user-attachments/assets/0686521e-86d6-4f75-a002-4ab9946972fa" />
