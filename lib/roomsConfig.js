import { getGoogleClients } from './googleAuth.js';

// Konstanta dasar 8 ruangan HQ Alpro (Embedded langsung agar tidak pernah gagal load di Vercel Serverless)
export const DEFAULT_ROOMS = [
  {
    "id": "ruang-a",
    "name": "Ruang Genuine (Lt. 1)",
    "floor": 1,
    "zone": "Eksternal / Tamu Luar",
    "capacity": 6,
    "facilities": [],
    "color": "#EF4444",
    "colorId": "11"
  },
  {
    "id": "ruang-b",
    "name": "Ruang Welcoming (Lt. 1)",
    "floor": 1,
    "zone": "Eksternal / Tamu Luar",
    "capacity": 4,
    "facilities": [],
    "color": "#F97316",
    "colorId": "6"
  },
  {
    "id": "ruang-c",
    "name": "Ruang Knowledgeable (Lt. 1)",
    "floor": 1,
    "zone": "Eksternal / Tamu Luar",
    "capacity": 4,
    "facilities": [],
    "color": "#EAB308",
    "colorId": "5"
  },
  {
    "id": "ruang-d",
    "name": "Ruang Involved (Lt. 1)",
    "floor": 1,
    "zone": "Eksternal / Tamu Luar",
    "capacity": 8,
    "facilities": [],
    "color": "#84CC16",
    "colorId": "2"
  },
  {
    "id": "ruang-e",
    "name": "Ruang Considerate (Lt. 2)",
    "floor": 2,
    "zone": "Staff Internal",
    "capacity": 6,
    "facilities": [],
    "color": "#22C55E",
    "colorId": "10"
  },
  {
    "id": "ruang-f",
    "name": "Ruang Accountable (Lt. 2)",
    "floor": 2,
    "zone": "Staff Internal",
    "capacity": 6,
    "facilities": [],
    "color": "#06B6D4",
    "colorId": "7"
  },
  {
    "id": "ruang-g",
    "name": "Ruang Yong Xin Kaizen (Lt. 2)",
    "floor": 2,
    "zone": "Staff Internal",
    "capacity": 8,
    "facilities": [],
    "color": "#3B82F6",
    "colorId": "9"
  },
  {
    "id": "ruang-h",
    "name": "Ruang Alpro Kaizen (Lt. 4)",
    "floor": 4,
    "zone": "Staff Internal & Training",
    "capacity": 20,
    "facilities": [],
    "color": "#A855F7",
    "colorId": "3"
  }
];

// In-Memory Cache untuk fasilitas dinamis dari Google Spreadsheet
let cachedRooms = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 Detik Cache

export function getRooms() {
  if (cachedRooms && Date.now() < cacheExpiry) {
    return cachedRooms;
  }
  return DEFAULT_ROOMS;
}

export function getRoomById(roomId) {
  if (!roomId) return null;
  const currentRooms = getRooms();
  const normalizedTarget = String(roomId).trim().toLowerCase().replace(/[\s_]+/g, '-');
  return (
    currentRooms.find(r => r.id.toLowerCase().replace(/[\s_]+/g, '-') === normalizedTarget) ||
    DEFAULT_ROOMS.find(r => r.id.toLowerCase().replace(/[\s_]+/g, '-') === normalizedTarget) ||
    null
  );
}

/**
 * Mengambil daftar 8 ruangan yang diperkaya dengan fasilitas inventaris live dari Google Spreadsheet.
 * Resilien terhadap perbedaan penamaan tab (Fasilitas Ruangan, Fasilitas, Sheet1)
 * dan spasi pada Room ID (contoh: "ruang g" otomatis dicocokkan ke "ruang-g").
 */
export async function getRoomsWithDynamicFacilities(forceRefresh = false) {
  try {
    // 1. Gunakan cache jika masih valid
    if (!forceRefresh && cachedRooms && Date.now() < cacheExpiry) {
      return {
        rooms: cachedRooms,
        source: 'google-sheets'
      };
    }

    let clients = null;
    try {
      clients = getGoogleClients();
    } catch (authErr) {
      console.warn('Google clients auth error:', authErr.message);
    }

    // 2. Ambil dari Google Spreadsheet jika terkonfigurasi
    if (clients && clients.spreadsheetId) {
      try {
        // Deteksi nama tab yang tersedia di spreadsheet secara dinamis
        let targetRange = 'A2:F'; // Default range
        try {
          const metaRes = await clients.sheets.spreadsheets.get({
            spreadsheetId: clients.spreadsheetId,
            fields: 'sheets.properties.title',
          });
          const sheetTitles = (metaRes.data.sheets || [])
            .map(s => s.properties?.title)
            .filter(Boolean);

          // Cari tab yang mengandung 'fasilitas', 'ruang', atau gunakan sheet pertama
          const matchedTab =
            sheetTitles.find(t => t.toLowerCase().includes('fasilitas')) ||
            sheetTitles.find(t => t.toLowerCase().includes('ruang')) ||
            sheetTitles[0];

          if (matchedTab) {
            targetRange = `'${matchedTab}'!A2:F`;
          }
        } catch (metaErr) {
          console.warn('Could not read sheet metadata, fallback to range Fasilitas Ruangan!A2:F:', metaErr.message);
          targetRange = 'Fasilitas Ruangan!A2:F';
        }

        const response = await clients.sheets.spreadsheets.values.get({
          spreadsheetId: clients.spreadsheetId,
          range: targetRange,
        });

        const rows = response.data.values || [];
        if (rows.length > 0) {
          // Buat lookup map dengan normalisasi (hapus spasi, ganti ke hyphen, lowercase)
          const facilityMap = new Map();

          rows.forEach((r, idx) => {
            const rawId = r[0] ? String(r[0]).trim() : '';
            const rawName = r[1] ? String(r[1]).trim() : '';
            const normalizedId = rawId.toLowerCase().replace(/[\s_]+/g, '-');
            const facilitiesStr = r[3] ? String(r[3]).trim() : '';
            const facilities = facilitiesStr
              ? facilitiesStr.split(',').map(f => f.trim()).filter(Boolean)
              : [];
            const status = r[4] ? String(r[4]).trim() : 'Siap Pakai';
            const notes = r[5] ? String(r[5]).trim() : '';

            const entry = {
              name: rawName,
              facilities,
              status,
              notes,
              rowIndex: idx
            };

            if (normalizedId) facilityMap.set(normalizedId, entry);
            if (rawId) facilityMap.set(rawId.toLowerCase(), entry);
            if (rawName) facilityMap.set(rawName.toLowerCase(), entry);
          });

          // Gabungkan konfigurasi dasar dengan data live dari Spreadsheet
          const mergedRooms = DEFAULT_ROOMS.map((room, idx) => {
            const normalizedRoomId = room.id.toLowerCase().replace(/[\s_]+/g, '-');
            const custom =
              facilityMap.get(normalizedRoomId) ||
              facilityMap.get(room.id.toLowerCase()) ||
              facilityMap.get(room.name.toLowerCase());

            if (custom) {
              return {
                ...room,
                // Jika di sheet nama diisi, gunakan nama dari sheet
                name: custom.name || room.name,
                facilities: custom.facilities.length > 0 ? custom.facilities : (room.facilities || []),
                status: custom.status || 'Siap Pakai',
                notes: custom.notes || ''
              };
            }

            return {
              ...room,
              facilities: room.facilities || [],
              status: 'Siap Pakai',
              notes: ''
            };
          });

          cachedRooms = mergedRooms;
          cacheExpiry = Date.now() + CACHE_TTL_MS;
          return {
            rooms: mergedRooms,
            source: 'google-sheets'
          };
        }
      } catch (sheetErr) {
        console.warn('Gagal membaca fasilitas dari Google Sheet, menggunakan data default:', sheetErr.message);
      }
    }
  } catch (err) {
    console.error('Unexpected error in getRoomsWithDynamicFacilities:', err);
  }

  // 3. Fallback Aman: Tidak pernah melempar error dan selalu mengembalikan 8 ruangan
  const fallbackRooms = DEFAULT_ROOMS.map(r => ({
    ...r,
    facilities: r.facilities || [],
    status: 'Siap Pakai',
    notes: ''
  }));

  cachedRooms = fallbackRooms;
  cacheExpiry = Date.now() + 15000;
  return {
    rooms: fallbackRooms,
    source: 'local-config'
  };
}

export default DEFAULT_ROOMS;
