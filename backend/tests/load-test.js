import http from 'k6/http'
import { check, sleep } from 'k6'
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js"

// ==============================
// KONFIGURASI 
// ==============================
const BASE_URL = 'http://localhost:4000/api' 
const EVENT_ID = 'da251799-7ce5-4fbe-ab21-22920e8cf6c7'
const TICKET_CATEGORY = 'CAT2'

export const options = {
  setupTimeout: '5m',
  scenarios: {
    war_ticket: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 100 },   
        { duration: '10s', target: 500 },  
        { duration: '5s', target: 1000 },  
        { duration: '10s', target: 1000 }, 
        { duration: '5s', target: 0 },     
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'], 
  },
}

export function setup() {
  const users = []
  const TOTAL_USERS = 1000

  console.log(`⏳ Sedang mendaftarkan ${TOTAL_USERS} user ke database...`);
  
  for (let i = 1; i <= TOTAL_USERS; i++) {
    const email = `warrior${i}_${Date.now()}@test.com`
    const password = 'password123'

    const regRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      name: `Ticket Warrior ${i}`,
      email,
      password
    }), { headers: { 'Content-Type': 'application/json' } })

    if (regRes.status !== 201) continue; 

    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email, password
    }), { headers: { 'Content-Type': 'application/json' } })

    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body || '{}')
      if (body.token && body.user?.id) {
        users.push({ token: body.token, email, userId: body.user.id }) 
      }
    }
    
    if (i % 50 === 0) console.log(`✅ Progress: ${i} / ${TOTAL_USERS} user siap...`);
  }

  if (users.length === 0) throw new Error("🚨 FATAL ERROR: 0 user berhasil didaftarkan.");
  console.log(`🚀 SETUP SELESAI! Memulai war ticket dengan ${users.length} user...`)
  return { users }
}

export default function (data) {
  const { users } = data
  if (!users || users.length === 0) return; 
  
  const user = users[(__VU - 1) % users.length] 
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${user.token}`
  }

  // === FASE 3: Langsung Reserve tiket ===
  const reserveRes = http.post(`${BASE_URL}/ticket/reserve`,
    JSON.stringify({ eventId: EVENT_ID, category: TICKET_CATEGORY, userId: user.userId }),
    { headers }
  )

  check(reserveRes, {
    'Reserve berhasil': (r) => r.status === 201 || r.status === 200,
  })

  // 🚨 TANGKAP ERROR JIKA GAGAL RESERVE
  if (reserveRes.status !== 200 && reserveRes.status !== 201) {
    console.log(`❌ VU ${__VU} Gagal Reserve: Status ${reserveRes.status} -> ${reserveRes.body}`);
  } 
  // === FASE 4: Bayar tiket (Hanya jika reserve sukses) ===
  else {
    sleep(Math.random() + 1); // Jeda realistis 1-2 detik sebelum bayar (simulasi orang ketik PIN)

    const payRes = http.post(`${BASE_URL}/payment/confirm`,
      JSON.stringify({ eventId: EVENT_ID, userId: user.userId }), 
      { headers }
    )

    check(payRes, {
      'Pembayaran berhasil': (r) => r.status === 200,
    })

    // 🚨 TANGKAP ERROR JIKA GAGAL BAYAR
    if (payRes.status !== 200) {
       console.log(`❌ VU ${__VU} Gagal Bayar: Status ${payRes.status} -> ${payRes.body}`);
    }
  }

  // 🆕 WAJIB ADA: Jeda 1 detik di setiap akhir siklus agar K6 tidak "kesetanan" saat gagal
  sleep(1); 
}

export function handleSummary(data) {
  const duration = data.metrics.http_req_duration?.values
  const reqs = data.metrics.http_reqs?.values

  const customStdout = `
╔═════════════════════════════════════════════════╗
║         HASIL WAR TICKET (REDIS ARCH)           ║
╠═════════════════════════════════════════════════╣
║ Total Request   : ${reqs?.count ?? 0}
║ Request/detik   : ${reqs?.rate?.toFixed(2) ?? 0}
║ Avg Response    : ${duration?.avg?.toFixed(2) ?? 0}ms
║ P95 Response    : ${duration?.['p(95)']?.toFixed(2) ?? 0}ms
╚═════════════════════════════════════════════════╝
  `
  return {
    stdout: customStdout, 
    "load-test-report.html": htmlReport(data) 
  }
}