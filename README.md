# Dashboard Booking Ruang Meeting HQ — Apotek Alpro

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![Design System](https://img.shields.io/badge/Design%20Tokens-Alpro%20Orange%20%23F97316-orange?style=flat)](https://apotekalpro.com)
[![Google Calendar](https://img.shields.io/badge/Google%20Calendar-API%20v3-4285F4?style=flat&logo=googlecalendar)](https://developers.google.com/calendar)
[![Google Sheets](https://img.shields.io/badge/Google%20Sheets-API%20v4-34A853?style=flat&logo=googlesheets)](https://developers.google.com/sheets)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Aplikasi internal berbasis web untuk pemesanan terpusat 8 ruang meeting Kantor Pusat (HQ) Apotek Alpro. Sistem ini dirancang untuk menyederhanakan koordinasi pemakaian ruang, mencegah bentrok jadwal (*race condition guard*), mencatat riwayat audit secara otomatis (*append-only* di Google Sheets), dan mengamankan pembatalan pemesanan menggunakan verifikasi nomor WhatsApp pemesan (*Phone Hash Security*).

---

## 🏢 Ketentuan Operasional & Zonasi Ruangan

- **Hari Kerja:** **Senin – Jumat** (Sabtu dan Minggu non-operasional/dinonaktifkan).
- **Jam Operasional:** **08:00 – 18:00 WIB** (grid jadwal dan pemilih waktu terfokus pada batas jam kerja resmi ini).
- **Durasi Booking:** **Fleksibel / Tanpa Batas Maksimal** dalam rentang 08:00–18:00 WIB (mendukung rapat maraton, training pleno, seminar, dan audit).
- **Zonasi & Penamaan Nilai Budaya Perusahaan:**
  - **Lantai 1 — Khusus Tamu Luar / Eksternal (4 Ruangan):**
    - 🔴 **Ruang Genuine (Lt. 1):** Kapasitas 6 Orang • Area Eksternal
    - 🟠 **Ruang Welcoming (Lt. 1):** Kapasitas 4 Orang • Area Eksternal
    - 🟡 **Ruang Knowledgeable (Lt. 1):** Kapasitas 4 Orang • Area Eksternal
    - 🟢 **Ruang Involved (Lt. 1):** Kapasitas 8 Orang • Area Eksternal
  - **Lantai 2 — Khusus Staff Internal (3 Ruangan):**
    - 🟢 **Ruang Considerate (Lt. 2):** Kapasitas 6 Orang • Staff Internal
    - 🔵 **Ruang Accountable (Lt. 2):** Kapasitas 6 Orang • Staff Internal
    - 🔵 **Ruang Yong Xin Kaizen (Lt. 2):** Kapasitas 8 Orang • Staff Internal
  - **Lantai 4 — Khusus Staff Internal & Training Pleno (1 Ruangan):**
    - 🟣 **Ruang Alpro Kaizen (Lt. 4):** Kapasitas 20 Orang • Internal & Pelatihan
- **Fasilitas Inventaris Dinamis (General Affairs):**
  Dikelola langsung melalui **Google Spreadsheet (Tab Fasilitas Ruangan)** tanpa perlu hard-coding atau redeploy aplikasi.

---

## 🏬 Divisi / Departemen Pemesan (14 Divisi)

Formulir pemesanan mendukung 14 entitas departemen resmi di lingkungan Apotek Alpro:
1. Academy
2. BOD (Board of Directors)
3. BPT (Branding, Promotion, & Trade)
4. E-Commerce
5. Finance & Accounting
6. Legal
7. Operation Excellence
8. Operation Sales
9. OSS (Operation Support & Service)
10. PCD (Professional Care & Development)
11. People Management
12. PPR (Pharmacy Practice & Regulatory)
13. Procurement
14. SGM (Sales & Geo Marketing)

---

## 🎨 Design Tokens Apotek Alpro

Mengikuti 100% standar brand visual sistem internal Apotek Alpro:
- **Primary Color:** `#F97316` (Orange Alpro), Light: `#FFF1E6`, Hover: `#EA6A0C`
- **Status Colors:** Success: `#16A34A` (`#DCFCE7`), Warning: `#F59E0B` (`#FEF3C7`), Danger: `#EF4444` (`#FEE2E2`)
- **Neutrals:** Background: `#F8F9FA`, Card: `#FFFFFF`, Border: `#E5E7EB`, Text: `#111827`
- **Typography:** Plus Jakarta Sans
- **Layout Tokens:** Sidebar Fixed (260px desktop, slide-in drawer mobile), Card Radius 16px, Button Radius 10px.

---

## 🚀 Fitur Unggulan

1. **Dashboard Grid Interaktif (Desktop ≥768px):**
   - Grid 8 ruang x jam 08:00–18:00 WIB dengan visualisasi baris per lantai.
   - **Current Time Bar:** Indikator garis merah realtime otomatis memperbarui posisi menit berjalan.
   - **Penanda Batas Jam Operasional:** Batas penutupan 18:00 WIB disorot jelas.
   - Klik slot kosong = Formulir booking terbuka otomatis dengan ruang & jam ter-prefill.
   - Klik slot terisi = Modal detail pemesanan & opsi pembatalan.
2. **Mobile Responsive Penuh (<768px):**
   - Drawer navigasi slide-in dari kiri dengan tombol sentuh lega (≥44px).
   - Chip filter lantai & Tab horizontal swipe antar ruang.
   - Vertical timeline jam 08:00 s/d 18:00 WIB per ruangan.
   - **Mobile Bottom-Sheet:** Modal formulir muncul dari bawah (*slide-up sheet*) dengan *drag handle*.
   - Floating Action Button (FAB) `+` orange di pojok kanan bawah.
3. **Keamanan Pembatalan (Phone Hash Security):**
   - Tidak memerlukan akun login Google personal untuk staf.
   - Pembatalan jadwal memvalidasi kecocokan nomor WhatsApp pemesan dengan data asli di `extendedProperties.private.bookedByWa`.
   - Jika nomor salah: **Ditolak HTTP 403 Forbidden**.
   - Jika cocok: Event terhapus dari kalender & dicatat aksi `CANCELLED` di audit log.
4. **Smart Autofill (LocalStorage):**
   - Nama, Divisi, dan Nomor WhatsApp otomatis tersimpan di browser pemesan sehingga tidak perlu mengetik ulang pada booking berikutnya.
5. **Real-Time Conflict Guard & Anti Race Condition:**
   - Indikator ketersediaan instan (*"✅ Ruang tersedia"* / *"⚠️ Bentrok"*) sebelum menekan tombol submit.
   - *Post-Insert Self Verification* di server Google Calendar untuk mencegah dua pemesanan pada detik yang sama.
6. **Audit Trail Lengkap & Ekspor CSV:**
   - Seluruh histori aktivitas (`CREATED` / `CANCELLED`) tersimpan aman secara *append-only* di Google Sheets (Tab `Log Booking`).
   - Fitur filter multi-parameter (tanggal, ruang, lantai, nama pemesan, aksi) dan tombol ekspor laporan CSV.
7. **Fasilitas Ruangan Dinamis (Google Spreadsheet):**
   - Tim General Affairs (GA) dapat mengupdate ketersediaan alat rapat (Smart TV, Mic Wireless, Whiteboard, Proyektor) secara langsung dari Google Sheet tanpa mengubah kode sumber.

---

## 🛠️ Arsitektur Dual-Engine

Aplikasi mendukung arsitektur **Dual-Engine** otomatis:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVERLESS BACKEND                      │
│                                                                        │
│       ┌───────────────────────┐        ┌───────────────────────┐       │
│       │ MODE LOCAL FALLBACK   │        │ MODE PRODUKSI GOOGLE  │       │
│       │ (data/mock-db.json)   │        │ Calendar & Sheets API │       │
│       └───────────────────────┘        └───────────────────────┘       │
│                   ▲                                ▲                   │
│                   │ (Kredensial belum diisi)       │ (Env terpasang)   │
│                   └────────────────┬───────────────┘                   │
│                                    │                                   │
│                        isGoogleConfigured()                            │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Mode Local / Demo Fallback (Otomatis):**
   Jika kredensial Google belum disematkan, backend serverless otomatis menggunakan penyimpanan persisten lokal (`data/mock-db.json`). Semua fitur (grid, filter, booking, bentrok, phone hash, audit log) berfungsi 100% untuk demo/development.
2. **Mode Produksi (Google Calendar & Sheets API):**
   Cukup masukkan 5 Environment Variables di Vercel atau `.env.local`. Sistem otomatis beralih memanggil Google Calendar API v3 dan Google Sheets API v4 dengan normalisasi newline `\n` dan timezone WIB (+07:00 / `Asia/Jakarta`).

---

## 📋 Struktur Direktori Proyek

```text
├── app/
│   ├── api/
│   │   ├── availability/route.js # Endpoint cek jadwal bentrok (08:00-18:00 WIB)
│   │   ├── book/route.js         # Endpoint pembuatan booking baru + race guard
│   │   ├── cancel/route.js       # Endpoint pembatalan aman (Phone Hash check)
│   │   ├── history/route.js      # Endpoint audit trail & log booking
│   │   └── rooms/route.js        # Endpoint daftar 8 ruang + fasilitas live sheets
│   ├── globals.css               # Design tokens Alpro & aturan responsif mobile
│   ├── layout.js                 # Root layout Next.js
│   └── page.js                   # Client controller aplikasi utama
├── components/
│   ├── BookingDetailModal.jsx    # Modal detail & dialog konfirmasi cancel WA
│   ├── BookingModal.jsx          # Modal form booking baru + bottom sheet mobile
│   ├── CurrentTimeBar.jsx        # Garis merah waktu berjalan realtime
│   ├── DashboardGrid.jsx         # Grid jadwal desktop & timeline vertikal mobile
│   ├── GuidePage.jsx             # SOP etika meeting room & zonasi lantai
│   ├── HistoryPage.jsx           # Tabel audit trail lengkap + ekspor CSV
│   ├── RoomSettingsPage.jsx      # Direktori 8 ruang + fasilitas live dari GA
│   ├── Sidebar.jsx               # Navigasi desktop & drawer mobile
│   ├── Toast.jsx                 # Sistem notifikasi toast Alpro
│   └── TopBar.jsx                # Header jam realtime WIB & status sistem
├── data/
│   └── mock-db.json              # Fallback local store persisten
├── docs/
│   └── PANDUAN-SETUP-PRODUKSI.md # Panduan lengkap setup 2 Akun Google & Vercel
├── lib/
│   ├── bookingService.js         # Logika bisnis inti & validasi operasional
│   ├── googleAuth.js             # Client Google Calendar & Sheets API (JWT)
│   ├── mockStore.js              # Driver penyimpanan lokal mock
│   └── roomsConfig.js            # Loader konfigurasi ruang & sinkronisasi sheets
├── public/
│   ├── alpro-logo.png            # Aset logo resmi Apotek Alpro
│   └── favicon.ico               # Favicon aplikasi
├── scripts/
│   ├── test-api.js               # 8 Unit test backend (validasi, bentrok, phone hash)
│   └── test-google-production.js # Script diagnostik koneksi Google API Akun A
├── rooms.config.json             # Konfigurasi dasar 8 ruangan HQ Alpro
├── .env.example                  # Template variabel lingkungan produksi
├── package.json                  # Konfigurasi dependensi Next.js & skrip npm
└── README.md                     # Dokumentasi komprehensif proyek
```

---

## ⚡ Memulai Pengembangan Lokal (Quickstart)

### 1. Kloning Repository
```bash
git clone https://github.com/apotekalpromaster/room-booking-alpro-hq.git
cd room-booking-alpro-hq
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

### 4. Menjalankan Uji Otomatis (Unit Test)
```bash
npm test
```
Memverifikasi 8 skenario: validasi hari kerja, jam operasional, format nomor WhatsApp Indonesia, deteksi bentrok, pencegahan double booking, penolakan cancel nomor salah (HTTP 403), keberhasilan cancel nomor cocok, dan integritas audit trail.

---

## 🌐 Panduan Pemindahan ke Produksi (Vercel)

Untuk proses rilis produksi menggunakan pemisahan **Akun A (Google Cloud, Calendar, Sheets)** dan **Akun B (GitHub & Vercel)**, silakan baca panduan lengkap dan terstruktur di:

👉 **[docs/PANDUAN-SETUP-PRODUKSI.md](docs/PANDUAN-SETUP-PRODUKSI.md)**

Setelah kredensial Akun A siap, Anda dapat memvalidasinya terlebih dahulu dengan menjalankan:
```bash
npm run test:production
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [Lisensi MIT](LICENSE) untuk lingkungan internal Apotek Alpro.
