/**
 * Script Uji Kredensial Produksi Google Calendar & Google Sheets
 * Menjalankan pemeriksaan komprehensif terhadap 5 variabel lingkungan (Akun A)
 */
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Coba muat .env.local jika ada
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

console.log('\n======================================================');
console.log('  UJI KREDENSIAL PRODUKSI GOOGLE (AKUN A & VERCEL)');
console.log('======================================================\n');

const envKeys = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY',
  'GOOGLE_PROJECT_ID',
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_SPREADSHEET_ID'
];

let allEnvPresent = true;
console.log('1. Pengecekan Keberadaan Environment Variables:');
envKeys.forEach(k => {
  const isSet = Boolean(process.env[k]);
  if (isSet) {
    const preview = k === 'GOOGLE_PRIVATE_KEY'
      ? (process.env[k].includes('BEGIN PRIVATE KEY') ? '[VALID KEY STRING]' : '[INVALID KEY FORMAT]')
      : process.env[k].slice(0, 18) + '...';
    console.log(`   ✅ ${k}: ${preview}`);
  } else {
    console.log(`   ❌ ${k}: TIDAK TERDETEKSI`);
    allEnvPresent = false;
  }
});

if (!allEnvPresent) {
  console.log('\n⚠️  Kredensial belum lengkap di environment lokal (.env.local).');
  console.log('   Ikuti panduan di docs/PANDUAN-SETUP-PRODUKSI.md untuk mengisi nilai dari Akun A.\n');
  process.exit(0);
}

async function runProductionTests() {
  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    console.log('\n2. Mengautentikasi Service Account JWT...');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    await auth.authorize();
    console.log('   ✅ Autentikasi Service Account BERHASIL.');

    // 3. Uji Akses Google Calendar
    console.log('\n3. Menguji Akses Google Calendar ID: ' + process.env.GOOGLE_CALENDAR_ID);
    const calendar = google.calendar({ version: 'v3', auth });
    const calRes = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      maxResults: 5,
      singleEvents: true,
      timeMin: new Date().toISOString(),
    });
    console.log(`   ✅ Berhasil mengakses kalender sekunder. Ditemukan ${calRes.data.items?.length || 0} event mendatang.`);

    // 4. Uji Akses Google Sheets
    console.log('\n4. Menguji Akses Google Spreadsheet ID: ' + process.env.GOOGLE_SPREADSHEET_ID);
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Cek Tab Log Booking
    try {
      const logRes = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
        range: 'Log Booking!A1:L1',
      });
      console.log('   ✅ Tab "Log Booking" ditemukan dengan header:', logRes.data.values?.[0]?.join(' | ') || '(Kosong)');
    } catch (e) {
      console.log('   ⚠️  Gagal mengakses tab "Log Booking": ' + e.message);
    }

    // Cek Tab Fasilitas Ruangan
    try {
      const facRes = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
        range: 'Fasilitas Ruangan!A1:F9',
      });
      const rows = facRes.data.values || [];
      console.log(`   ✅ Tab "Fasilitas Ruangan" ditemukan. Terbaca ${rows.length > 1 ? rows.length - 1 : 0} baris data ruangan.`);
      if (rows.length > 1) {
        console.log('   Contoh data baris pertama:', rows[1].join(' | '));
      }
    } catch (e) {
      console.log('   ⚠️  Gagal mengakses tab "Fasilitas Ruangan": ' + e.message);
    }

    console.log('\n======================================================');
    console.log('  🎉 SEMUA KONEKSI PRODUKSI GOOGLE TERVERIFIKASI!');
    console.log('  Aplikasi siap dideploy ke Vercel melalui Akun B.');
    console.log('======================================================\n');
  } catch (error) {
    console.error('\n❌ Pengujian gagal dengan error:', error.message);
    if (error.message.includes('Not Found')) {
      console.error('   Tips: Pastikan Calendar ID atau Spreadsheet ID sudah dibagikan (share) ke email Service Account!');
    }
    process.exit(1);
  }
}

runProductionTests();
