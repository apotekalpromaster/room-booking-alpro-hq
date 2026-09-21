import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/mock-db.json');

function getSeedData() {
  // Generate sample dates for today and future days
  const now = new Date();
  const formatYMD = (d) => d.toISOString().split('T')[0];

  const todayStr = formatYMD(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = formatYMD(tomorrow);

  return {
    events: [
      {
        id: 'evt-seed-1',
        bookingId: 'book-001',
        roomId: 'ruang-a',
        roomName: 'Ruang Genuine (Lt. 1)',
        floor: 1,
        zone: 'Eksternal / Tamu Luar',
        date: todayStr,
        startTime: '09:00',
        endTime: '11:00',
        name: 'Budi Santoso',
        divisi: 'Procurement',
        whatsapp: '081234567890',
        keperluan: 'Negosiasi Penawaran Harga PBF Kimia Farma',
        status: 'CONFIRMED',
        created: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'evt-seed-2',
        bookingId: 'book-002',
        roomId: 'ruang-c',
        roomName: 'Ruang Knowledgeable (Lt. 1)',
        floor: 1,
        zone: 'Eksternal / Tamu Luar',
        date: todayStr,
        startTime: '13:00',
        endTime: '15:00',
        name: 'Sari Wulandari',
        divisi: 'People Management',
        whatsapp: '082198765432',
        keperluan: 'Interview Calon Apoteker Pengganti Area Jabar',
        status: 'CONFIRMED',
        created: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'evt-seed-3',
        bookingId: 'book-003',
        roomId: 'ruang-e',
        roomName: 'Ruang Considerate (Lt. 2)',
        floor: 2,
        zone: 'Staff Internal',
        date: todayStr,
        startTime: '08:30',
        endTime: '10:30',
        name: 'Hendra Gunawan',
        divisi: 'BPT (Branding, Promotion, & Trade)',
        whatsapp: '081311223344',
        keperluan: 'Koordinasi Campaign Promo Gajian & Media Sosial',
        status: 'CONFIRMED',
        created: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: 'evt-seed-4',
        bookingId: 'book-004',
        roomId: 'ruang-h',
        roomName: 'Ruang Alpro Kaizen (Lt. 4)',
        floor: 4,
        zone: 'Staff Internal & Training',
        date: todayStr,
        startTime: '09:00',
        endTime: '16:00',
        name: 'Rian Pratama',
        divisi: 'Academy',
        whatsapp: '085712348899',
        keperluan: 'Pelatihan Service Excellence & SOP Kasir Baru Batch 4',
        status: 'CONFIRMED',
        created: new Date(Date.now() - 14400000).toISOString(),
      },
      {
        id: 'evt-seed-5',
        bookingId: 'book-005',
        roomId: 'ruang-d',
        roomName: 'Ruang Involved (Lt. 1)',
        floor: 1,
        zone: 'Eksternal / Tamu Luar',
        date: tomorrowStr,
        startTime: '10:00',
        endTime: '12:00',
        name: 'Dewi Lestari',
        divisi: 'Finance & Accounting',
        whatsapp: '087812345678',
        keperluan: 'Review Kontrak Kerjasama Vendor POS & Mesin EDC',
        status: 'CONFIRMED',
        created: new Date(Date.now() - 18000000).toISOString(),
      }
    ],
    logs: [
      {
        timestamp: new Date(Date.now() - 18000000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        bookingId: 'book-005',
        roomName: 'Ruang Involved (Lt. 1)',
        floor: 1,
        action: 'CREATED',
        name: 'Dewi Lestari',
        divisi: 'Finance & Accounting',
        whatsapp: '087812345678',
        slot: tomorrowStr + ' 10:00 - 12:00',
        keperluan: 'Review Kontrak Kerjasama Vendor POS & Mesin EDC',
        eventId: 'evt-seed-5',
        cancelReason: '-'
      },
      {
        timestamp: new Date(Date.now() - 14400000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        bookingId: 'book-004',
        roomName: 'Ruang Alpro Kaizen (Lt. 4)',
        floor: 4,
        action: 'CREATED',
        name: 'Rian Pratama',
        divisi: 'Training & Development',
        whatsapp: '085712348899',
        slot: todayStr + ' 09:00 - 16:00',
        keperluan: 'Pelatihan Service Excellence & SOP Kasir Baru Batch 4',
        eventId: 'evt-seed-4',
        cancelReason: '-'
      },
      {
        timestamp: new Date(Date.now() - 10800000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        bookingId: 'book-003',
        roomName: 'Ruang Considerate (Lt. 2)',
        floor: 2,
        action: 'CREATED',
        name: 'Hendra Gunawan',
        divisi: 'Marketing & Aktivasi',
        whatsapp: '081311223344',
        slot: todayStr + ' 08:30 - 10:30',
        keperluan: 'Koordinasi Campaign Promo Gajian & Media Sosial',
        eventId: 'evt-seed-3',
        cancelReason: '-'
      },
      {
        timestamp: new Date(Date.now() - 7200000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        bookingId: 'book-002',
        roomName: 'Ruang Knowledgeable (Lt. 1)',
        floor: 1,
        action: 'CREATED',
        name: 'Sari Wulandari',
        divisi: 'Human Capital / HR',
        whatsapp: '082198765432',
        slot: todayStr + ' 13:00 - 15:00',
        keperluan: 'Interview Calon Apoteker Pengganti Area Jabar',
        eventId: 'evt-seed-2',
        cancelReason: '-'
      },
      {
        timestamp: new Date(Date.now() - 3600000).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        bookingId: 'book-001',
        roomName: 'Ruang Genuine (Lt. 1)',
        floor: 1,
        action: 'CREATED',
        name: 'Budi Santoso',
        divisi: 'Purchasing & Logistik',
        whatsapp: '081234567890',
        slot: todayStr + ' 09:00 - 11:00',
        keperluan: 'Negosiasi Penawaran Harga PBF Kimia Farma',
        eventId: 'evt-seed-1',
        cancelReason: '-'
      }
    ]
  };
}

export function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = getSeedData();
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
      return initial;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading mock db:', err);
    return getSeedData();
  }
}

export function writeDb(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing mock db:', err);
  }
}
