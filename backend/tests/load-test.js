import http from 'k6/http'
import { check, sleep } from 'k6'
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js"

// ==============================
// KONFIGURASI 
// ==============================
const BASE_URL = 'http://localhost:4000/api' 
const EVENT_ID = 'event-1' 
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
    http_req_failed: ['rate<0.15'],     
  },
}

export function setup() {
  const users = []
  const TOTAL_USERS = 300 

  console.log(`⏳ Sedang mendaftarkan ${TOTAL_USERS} user ke database, mohon tunggu...`);
  
  for (let i = 1; i <= TOTAL_USERS; i++) {
    const email = `warrior${i}_${Date.now()}@test.com`
    const password = 'password123'

    const regRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
      name: `Ticket Warrior ${i}`,
      email,
      password
    }), { headers: { 'Content-Type': 'application/json' } })

    if (regRes.status !== 201) {
      console.error(`❌ Register gagal untuk user ${i}: API menjawab Status ${regRes.status} -> ${regRes.body}`);
      continue; 
    }

    const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email, password
    }), { headers: { 'Content-Type': 'application/json' } })

    if (loginRes.status === 200) {
      const body = JSON.parse(loginRes.body || '{}')
      if (body.token) {
        users.push({ token: body.token, email })
      }
    }
  }

  if (users.length === 0) {
    throw new Error("🚨 FATAL ERROR: 0 user berhasil didaftarkan. Tolong cek apakah Port BASE_URL sudah sama dengan terminal backend kamu!");
  }

  console.log(`✅ ${users.length} user siap untuk war ticket!`)
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

  // === FASE 1: Join Antrean (Queue) ===
  const joinRes = http.post(`${BASE_URL}/queue/join`,
    JSON.stringify({ eventId: EVENT_ID }),
    { headers }
  )
  
  if (joinRes.status !== 200 && joinRes.status !== 201) return;

  // === FASE 2: Polling Status Queue ===
  let isPromoted = false;
  let attempts = 0;
  
  while (!isPromoted && attempts < 20) {
    sleep(2); 
    
    const statusRes = http.get(`${BASE_URL}/queue/status?eventId=${EVENT_ID}`, { headers })
    
    if (statusRes.status === 200) {
      const statusBody = JSON.parse(statusRes.body)
      if (statusBody.status === 'promoted') {
        isPromoted = true;
        break;
      }
    }
    attempts++;
  }

  if (!isPromoted) return; 

  // === FASE 3: Reserve tiket ===
  const reserveRes = http.post(`${BASE_URL}/ticket/reserve`,
    JSON.stringify({ eventId: EVENT_ID, category: TICKET_CATEGORY }),
    { headers }
  )

  check(reserveRes, {
    'Reserve berhasil': (r) => r.status === 201 || r.status === 200,
    'Reserve ditolak (tiket habis)': (r) => r.status === 400,
  })

  if (reserveRes.status === 201 || reserveRes.status === 200) {
    sleep(1.5) 

    // === FASE 4: Bayar tiket ===
    const payRes = http.post(`${BASE_URL}/payment/confirm`,
      JSON.stringify({ eventId: EVENT_ID }),
      { headers }
    )

    check(payRes, {
      'Pembayaran berhasil': (r) => r.status === 200,
    })
  }
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
╠═════════════════════════════════════════════════╣
║ ✅ Redis In-Memory Queuing Dites                ║
║ ✅ Atomic Decrements Dievaluasi                 ║
╚═════════════════════════════════════════════════╝
  `

  return {
    stdout: customStdout, 
    "load-test-report.html": htmlReport(data) 
  }
}