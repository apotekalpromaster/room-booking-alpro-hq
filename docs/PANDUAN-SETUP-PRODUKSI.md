# Panduan Lengkap Setup Fase Produksi: Room Booking HQ Apotek Alpro

Panduan ini disusun secara terstruktur untuk memisahkan kepemilikan dan tanggung jawab antara dua akun Google yang berbeda:
- **Akun A:** Akun Google Pemilik Data Operasional (Google Calendar & Google Sheets)
- **Akun B:** Akun Google Developer / DevOps (GitHub Repository & Hosting Vercel)

---

## Arsitektur Pemisahan Akun

```text
┌────────────────────────────────────────────────────────┐
│                   AKUN A (Google Cloud & Data)         │
│  - Google Cloud Console: Project & Service Account Key │
│  - Google Calendar: Kalender Sekunder "Room Booking"   │
│  - Google Spreadsheet: "Log Booking" & "Fasilitas"     │
└───────────────────────────┬────────────────────────────┘
                            │ Menghasilkan 5 Variabel
                            │ (Email SA, Key, Cal ID, Sheet ID, Proj ID)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   AKUN B (DevOps & Hosting)            │
│  - GitHub: Repository Kode Sumber                      │
│  - Vercel Dashboard: Environment Variables (5 Variabel)│
│  - Domain Publik: https://room-booking-alpro.vercel.app│
└────────────────────────────────────────────────────────┘
```

---

## TAHAP 1: Konfigurasi Akun A (Google Cloud, Calendar, & Spreadsheet)

### 1.1 Buat Google Cloud Project & Aktifkan API
1. Login ke [Google Cloud Console](https://console.cloud.google.com/) menggunakan **Akun A**.
2. Klik dropdown project di navigasi atas → klik **"New Project"**.
3. Beri nama project: `alpro-hq-room-booking` → klik **Create**.
4. Buka menu **APIs & Services** > **Library**:
   - Cari **"Google Calendar API"** → klik **Enable**.
   - Cari **"Google Sheets API"** → klik **Enable**.

### 1.2 Buat Service Account & Unduh JSON Key
1. Buka menu **APIs & Services** > **Credentials**.
2. Klik **"+ CREATE CREDENTIALS"** → pilih **Service Account**.
3. Masukkan detail:
   - **Service account name:** `alpro-room-booking-sa`
   - **Service account ID:** (otomatis terisi)
   - Klik **CREATE AND CONTINUE** → klik **DONE**.
4. Salin email Service Account yang terbentuk (contoh: `alpro-room-booking-sa@alpro-hq-room-booking.iam.gserviceaccount.com`).
5. Klik pada email Service Account tersebut → buka tab **KEYS**.
6. Klik **ADD KEY** > **Create new key** → pilih tipe **JSON** → klik **CREATE**.
7. File JSON akan otomatis terunduh ke komputer Anda. Simpan file ini dengan aman!

---

### 1.3 Setup Dedicated Google Calendar Sekunder (Akun A)
> **Penting:** Jangan gunakan kalender utama personal. Buat kalender sekunder khusus ruangan meeting.

1. Buka [Google Calendar](https://calendar.google.com/) dengan **Akun A**.
2. Pada panel kiri, di sebelah *Other calendars* (Kalender lain), klik tanda **`+`** > **Create new calendar**.
3. Isi nama: `Room Booking HQ Apotek Alpro`.
4. Setelah dibuat, klik kalender tersebut di menu sebelah kiri untuk membuka **Settings**.
5. Gulir ke bagian **"Share with specific people or groups"**:
   - Klik **"Add people and groups"**.
   - Masukkan **Email Service Account** (dari langkah 1.2).
   - Pada pilihan Permissions, pilih: **"Make changes to events"** (Wajib agar sistem bisa membuat & membatalkan jadwal).
   - Klik **Send**.
6. Gulir ke bagian bawah pada **"Integrate calendar"**:
   - Salin **Calendar ID** (contoh: `c_abcdef123456@group.calendar.google.com`).

---

### 1.4 Setup Google Spreadsheet (Akun A)
1. Buka [Google Sheets](https://sheets.new) dengan **Akun A**.
2. Beri judul spreadsheet: `Apotek Alpro - HQ Room Booking`.
3. Buat **2 Tab (Sheet)** di bagian bawah spreadsheet:

#### Tab 1: Beri nama persis `Log Booking`
Isi baris pertama (Header) dengan kolom berikut:
```text
Timestamp | Booking ID | Ruang | Lantai | Aksi | Nama Pemesan | Divisi | No. WhatsApp | Tanggal & Jam Slot | Keperluan | Event ID | Alasan Cancel
```

#### Tab 2: Beri nama persis `Fasilitas Ruangan`
Isi baris pertama (Header):
```text
Room ID | Nama Ruangan | Lantai | Fasilitas Inventaris (Pisahkan dengan koma) | Status Ruangan | Catatan Khusus
```
Salin data awal 8 ruangan berikut ke baris 2 hingga 9:
```text
ruang-a	Ruang Genuine (Lt. 1)	1	Smart TV 55", Polycom Conference Mic, Whiteboard, HDMI Cable	Siap Pakai	Khusus Tamu Luar / Eksternal
ruang-b	Ruang Welcoming (Lt. 1)	1	Smart TV 43", Whiteboard, Extension Cable	Siap Pakai	Khusus Tamu Luar / Eksternal
ruang-c	Ruang Knowledgeable (Lt. 1)	1	Smart TV 43", Whiteboard, Audio Bar	Siap Pakai	Khusus Tamu Luar / Eksternal
ruang-d	Ruang Involved (Lt. 1)	1	Proyektor Laser, Sound System, 2x Whiteboard	Siap Pakai	Khusus Tamu Luar / Eksternal
ruang-e	Ruang Considerate (Lt. 2)	2	Smart TV 50", Whiteboard	Siap Pakai	Staff Internal
ruang-f	Ruang Accountable (Lt. 2)	2	Smart TV 50", Whiteboard	Siap Pakai	Staff Internal
ruang-g	Ruang Yong Xin Kaizen (Lt. 2)	2	Video Conference Display, Jabra Speak, Whiteboard	Siap Pakai	Staff Internal
ruang-h	Ruang Alpro Kaizen (Lt. 4)	4	Proyektor Gantung, Sound System 4 Speaker, Wireless Mic 2x, Podium, Whiteboard Besar	Siap Pakai	Staff Internal & Training Pleno
```

4. Bagikan Spreadsheet ke Service Account:
   - Klik tombol **Share (Bagikan)** hijau di pojok kanan atas spreadsheet.
   - Masukkan **Email Service Account**.
   - Berikan hak akses: **"Editor"** (Editor).
   - Hapus centang "Notify people" → klik **Share**.
5. Salin **Spreadsheet ID** dari URL browser:
   - Format URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

---

## TAHAP 2: Rekap 5 Variabel Lingkungan

Dari file JSON Key dan konfigurasi Akun A, Anda kini memiliki 5 variabel penting:

| Nama Variabel | Diambil Dari |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` di file JSON Key |
| `GOOGLE_PRIVATE_KEY` | `private_key` di file JSON Key (termasuk BEGIN & END PRIVATE KEY) |
| `GOOGLE_PROJECT_ID` | `project_id` di file JSON Key |
| `GOOGLE_CALENDAR_ID` | Calendar ID kalender sekunder dari Google Calendar Settings |
| `GOOGLE_SPREADSHEET_ID` | ID Spreadsheet dari URL Google Sheet |

---

## TAHAP 3: Konfigurasi Akun B (GitHub & Vercel Deployment)

### 3.1 Push Kode ke GitHub (Akun B)
1. Buka PowerShell atau terminal di direktori proyek:
   ```bash
   cd c:\Users\ALPNB092\.gemini\antigravity\playground\room-booking-alpro-react
   git init
   git add .
   git commit -m "feat: room booking alpro hq production ready"
   ```
2. Login ke [GitHub](https://github.com/) menggunakan **Akun B**.
3. Buat repository baru (misal: `room-booking-alpro-hq`).
4. Hubungkan remote repository dan push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/{username-akun-b}/room-booking-alpro-hq.git
   git push -u origin main
   ```

### 3.2 Deploy ke Vercel (Akun B)
1. Login ke [Vercel](https://vercel.com/) menggunakan **Akun B** (dapat menggunakan opsi "Continue with GitHub").
2. Klik tombol **"Add New..."** > **Project**.
3. Pilih repository `room-booking-alpro-hq` yang baru dipush → klik **Import**.
4. Pada bagian **Environment Variables**, tambahkan ke-5 variabel yang didapat dari Akun A:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_PROJECT_ID`
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_SPREADSHEET_ID`
   > **Catatan Khusus Private Key di Vercel:** Masukkan isi private key persis seperti di file JSON (aplikasi kami sudah dilengkapi fungsi normalisasi `.replace(/\\n/g, '\n')` secara otomatis).
5. Klik **"Deploy"**.
6. Tunggu 1–2 menit hingga proses build selesai dan domain `https://{project-name}.vercel.app` aktif!

---

## TAHAP 4: Verifikasi & Operasional Harian

1. **Uji Coba Booking:** Buka domain Vercel, lakukan booking baru. Cek Google Calendar Akun A apakah event muncul dengan warna yang sesuai.
2. **Uji Coba Audit Log:** Cek tab `Log Booking` di Google Sheet Akun A apakah baris baru dengan aksi `CREATED` otomatis tercatat.
3. **Uji Coba Pembatalan:** Batalkan booking dengan menginput Nomor WhatsApp yang valid. Pastikan event terhapus dari Calendar dan tercatat `CANCELLED` di Google Sheet.
4. **Pembaruan Fasilitas oleh GA:** Jika ada penambahan fasilitas baru (misal menambah dispenser air / konektor USB-C), tim General Affairs cukup mengetikkan fasilitas tersebut di kolom Fasilitas pada tab `Fasilitas Ruangan` Google Sheet. Perubahan akan langsung muncul di web app saat di-refresh!
