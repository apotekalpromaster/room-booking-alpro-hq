import { createRequire } from 'module';
import { getGoogleClients } from './googleAuth.js';

const require = createRequire(import.meta.url);
const baseRoomsConfig = require('../rooms.config.json');

// In-Memory Cache untuk fasilitas dinamis dari Google Spreadsheet
let cachedRooms = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 Detik Cache agar ringan dan tetap cepat

/**
 * Mendapatkan daftar ruangan secara sinkron (menggunakan cache terkini atau config dasar)
 */
export function getRooms() {
  if (cachedRooms && Date.now() < cacheExpiry) {
    return cachedRooms;
  }
  return baseRoomsConfig;
}

/**
 * Mencari ruangan berdasarkan ID
 */
export function getRoomById(roomId) {
  if (!roomId) return null;
  const currentRooms = getRooms();
  return (
    currentRooms.find(r => r.id === roomId) ||
    baseRoomsConfig.find(r => r.id === roomId) ||
    null
  );
}

/**
 * Mengambil daftar 8 ruangan yang diperkaya dengan fasilitas inventaris live dari Google Spreadsheet
 * Memiliki mekanisme Graceful Fallback jika Google Sheets belum terkonfigurasi atau ada gangguan jaringan.
 */
export async function getRoomsWithDynamicFacilities(forceRefresh = false) {
  // 1. Gunakan cache jika masih valid
  if (!forceRefresh && cachedRooms && Date.now() < cacheExpiry) {
    return {
      rooms: cachedRooms,
      source: 'google-sheets'
    };
  }

  const clients = getGoogleClients();

  // 2. Ambil dari Google Spreadsheet jika terkonfigurasi
  if (clients && clients.spreadsheetId) {
    try {
      const response = await clients.sheets.spreadsheets.values.get({
        spreadsheetId: clients.spreadsheetId,
        range: 'Fasilitas Ruangan!A2:F',
      });

      const rows = response.data.values || [];
      if (rows.length > 0) {
        // Mapping kolom: [0: Room ID, 1: Nama Ruangan, 2: Lantai, 3: Fasilitas, 4: Status, 5: Catatan]
        const facilityMap = new Map();
        rows.forEach(r => {
          if (!r[0]) return;
          const rId = String(r[0]).trim().toLowerCase();
          const facilitiesStr = r[3] ? String(r[3]).trim() : '';
          const facilities = facilitiesStr
            ? facilitiesStr.split(',').map(f => f.trim()).filter(Boolean)
            : [];
          const status = r[4] ? String(r[4]).trim() : 'Siap Pakai';
          const notes = r[5] ? String(r[5]).trim() : '';

          facilityMap.set(rId, { facilities, status, notes });
        });

        // Gabungkan konfigurasi dasar dengan data live dari Spreadsheet
        const mergedRooms = baseRoomsConfig.map(room => {
          const live = facilityMap.get(room.id.toLowerCase());
          if (live) {
            return {
              ...room,
              facilities: live.facilities.length > 0 ? live.facilities : (room.facilities || []),
              status: live.status || 'Siap Pakai',
              notes: live.notes || ''
            };
          }
          return {
            ...room,
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
    } catch (err) {
      console.warn('Gagal membaca fasilitas dari Google Sheet, beralih ke local fallback config:', err.message);
    }
  }

  // 3. Fallback Aman: Data statis rooms.config.json
  const fallbackRooms = baseRoomsConfig.map(r => ({
    ...r,
    facilities: r.facilities || [],
    status: 'Siap Pakai',
    notes: ''
  }));

  cachedRooms = fallbackRooms;
  cacheExpiry = Date.now() + 15000; // Retry lebih cepat jika fallback
  return {
    rooms: fallbackRooms,
    source: 'local-config'
  };
}

export default baseRoomsConfig;
