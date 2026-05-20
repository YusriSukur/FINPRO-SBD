# Real-World Case Study: Ticketmaster

## Masalah Spesifik
Ticketmaster sering menghadapi masalah kritis saat mengadakan *war ticket* untuk acara atau konser besar. Lonjakan trafik yang menembus jutaan akses dalam hitungan detik menyebabkan sistem kewalahan. Jika semua *request* (read/write) ini langsung diproses ke database relasional (RDBMS) utama mereka, sistem akan mengalami *lock contention* (antrean baca/tulis yang macet), kelelahan pemrosesan, dan berujung pada server *crash* atau *downtime*. 

Selain masalah performa, tantangan krusial lainnya adalah terjadinya *race condition*, di mana tiket terjual melebihi batas kuota (*oversold*) akibat dibeli secara bersamaan oleh ribuan orang. 

## Solusi Paradigma Key-Value Store (Redis)
Untuk mengatasi *bottleneck* ini, arsitektur dialihkan menjadi paradigma *Key-Value Store* dengan menggunakan **Redis** sebagai lapisan pelindung terdepan. Alasan utamanya adalah:
1. **In-Memory Speed:** Redis bekerja sepenuhnya di dalam RAM, membuatnya merespons permintaan jauh lebih cepat daripada RDBMS konvensional yang berjalan di atas disk.
2. **Atomic Operations:** Fitur pengurangan (DECR) di Redis berjalan secara atomik, memastikan tidak ada perhitungan tiket yang ganda atau minus meskipun direbutkan secara bersamaan.
3. **Time-To-Live (TTL):** Fitur kadaluarsa otomatis yang digunakan untuk menahan kursi sementara saat pengguna melakukan pembayaran. Jika waktu pembayaran habis (misal 5 menit), kunci sesi akan hancur sendiri tanpa perlu perintah rumit, membebaskan kursi kembali ke pasar.
