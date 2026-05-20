# Conceptual Data Model Diagram (Redis)

Sistem TicketFlash menggunakan struktur data yang dioptimalkan untuk memori menggunakan tipe data spesifik bawaan Key-Value Store (Redis). Pemodelan ini sengaja menghindari relasi kompleks antar tabel demi mengutamakan kecepatan akses O(1).

## 1. Event Details
Menyimpan detail statis acara agar bisa diakses dengan latensi sangat rendah oleh ribuan pengguna secara bersamaan.
- **Data Type:** Hash
- **Key Format:** `event:{event_id}` 
- **Value:** `{ name: "JGTC", price: 50000, date: "2024-12-01" }`

## 2. Stock Counter
Berfungsi menyimpan total tiket yang tersedia. Saat war ticket berlangsung, sistem menggunakan operasi `DECR` yang bersifat atomik untuk menjamin tidak ada race condition.
- **Data Type:** String / Integer
- **Key Format:** `ticket_stock:{event_id}` 
- **Value:** `500` (integer)

## 3. Distributed Lock & Temporary Hold
Menahan kursi (hold) saat pembeli berhasil mendapat kuota untuk proses pembayaran dengan batasan waktu. Jika batas waktu berlalu tanpa pembayaran, *key* akan hancur dengan sendirinya berkat fitur TTL.
- **Data Type:** String (dengan TTL)
- **Key Format:** `hold:{event_id}:{user_id}` 
- **Value:** `"locked"`
- **TTL (Time-To-Live):** 300 seconds (5 Menit)

## 4. Virtual Waiting Room
Mengatur antrean masuk pengguna  atau traffic control agar server tidak terbebani. Pengguna baru ditambahkan ke belakang (RPUSH) dan dikeluarkan dari depan antrean (LPOP).
- **Data Type:** List
- **Key Format:** `queue:{event_id}` 
- **Value:** `["USR99", "USR105", "USR22..."]`
