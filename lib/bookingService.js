import { isGoogleConfigured, getGoogleClients } from './googleAuth.js';
import { readDb, writeDb } from './mockStore.js';
import { getRooms, getRoomById } from './roomsConfig.js';

/**
 * Normalisasi nomor WhatsApp format Indonesia
 * '08123...' -> '08123...'
 * '+628123...' -> '08123...'
 * '628123...' -> '08123...'
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Validasi nomor WhatsApp format Indonesia (10 - 14 digit, diawali 08 atau 628)
 */
export function isValidIndonesianPhone(phone) {
  const norm = normalizePhone(phone);
  return /^08[0-9]{8,12}$/.test(norm);
}

/**
 * Validasi hari kerja (Senin - Jumat)
 * dateStr: 'YYYY-MM-DD'
 */
export function isWorkingDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sun, 6 = Sat
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Validasi jam operasional (08:00 - 18:00 WIB)
 */
export function isWithinOperationalHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  const minLimit = 8 * 60; // 08:00
  const maxLimit = 18 * 60; // 18:00

  return startMinutes >= minLimit && endMinutes <= maxLimit && endMinutes > startMinutes;
}

/**
 * Cek apakah slot bentrok
 */
function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

/**
 * 1. Ambil ketersediaan ruangan untuk tanggal tertentu (08:00 - 18:00 WIB)
 */
export async function getAvailability(dateStr) {
  if (!isWorkingDay(dateStr)) {
    return {
      date: dateStr,
      isWorkingDay: false,
      message: 'Ruang meeting HQ Alpro hanya beroperasi pada hari Senin – Jumat (Sabtu dan Minggu non-operasional).',
      events: []
    };
  }

  const clients = getGoogleClients();

  if (clients && clients.calendarId) {
    try {
      const timeMin = `${dateStr}T08:00:00+07:00`;
      const timeMax = `${dateStr}T18:00:00+07:00`;

      const response = await clients.calendar.events.list({
        calendarId: clients.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const items = response.data.items || [];
      const events = items
        .filter(item => item.status !== 'cancelled')
        .map(item => {
          const props = item.extendedProperties?.private || {};
          const startIso = item.start?.dateTime || item.start?.date;
          const endIso = item.end?.dateTime || item.end?.date;
          const startTime = startIso ? startIso.substring(11, 16) : '08:00';
          const endTime = endIso ? endIso.substring(11, 16) : '18:00';

          return {
            id: item.id,
            bookingId: props.bookingId || item.id,
            roomId: props.roomId || '',
            roomName: item.summary?.split(']')[0]?.replace('[', '') || '',
            floor: props.floor ? Number(props.floor) : 1,
            date: dateStr,
            startTime,
            endTime,
            name: props.bookedByName || '',
            divisi: props.bookedByDivisi || '',
            keperluan: item.description?.split('\n')[0] || item.summary || '',
            status: 'CONFIRMED'
          };
        });

      return {
        date: dateStr,
        isWorkingDay: true,
        events
      };
    } catch (err) {
      console.error('Google Calendar list error, fallback to mock:', err);
    }
  }

  // Fallback Store (Local development or when Calendar is unconfigured)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  const db = readDb();
  const events = isProduction
    ? (db.events || []).filter(e => e.date === dateStr && e.status !== 'CANCELLED' && !String(e.id).startsWith('mock-'))
    : (db.events || []).filter(e => e.date === dateStr && e.status !== 'CANCELLED');

  return {
    date: dateStr,
    isWorkingDay: true,
    events
  };
}

/**
 * 2. Buat booking baru dengan validasi ketat & Race Condition Guard
 */
export async function createBooking(data) {
  const { roomId, date, startTime, endTime, name, divisi, whatsapp, keperluan } = data;

  // 1. Validasi field wajib
  if (!roomId || !date || !startTime || !endTime || !name || !divisi || !whatsapp || !keperluan) {
    const error = new Error('Semua field formulir booking wajib diisi.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Validasi ruang
  const room = getRoomById(roomId);
  if (!room) {
    const error = new Error(`Ruangan dengan ID ${roomId} tidak ditemukan.`);
    error.statusCode = 404;
    throw error;
  }

  // 3. Validasi hari operasional (Senin - Jumat)
  if (!isWorkingDay(date)) {
    const error = new Error('Pemesanan ditolak: Ruang meeting HQ Alpro hanya beroperasi pada hari kerja (Senin – Jumat).');
    error.statusCode = 400;
    throw error;
  }

  // 4. Validasi jam operasional (08:00 - 18:00 WIB)
  if (!isWithinOperationalHours(startTime, endTime)) {
    const error = new Error('Pemesanan ditolak: Jam operasional meeting room adalah pukul 08:00 – 18:00 WIB.');
    error.statusCode = 400;
    throw error;
  }

  // 5. Validasi tanggal & jam masa lalu
  const now = new Date();
  const nowWibTime = now.getTime() + 7 * 3600 * 1000;
  const nowWib = new Date(nowWibTime);
  const nowWibDateStr = nowWib.toISOString().slice(0, 10);
  const nowWibTimeStr = nowWib.toISOString().slice(11, 16);

  if (date < nowWibDateStr || (date === nowWibDateStr && startTime < nowWibTimeStr)) {
    const error = new Error('Pemesanan ditolak: Waktu booking tidak boleh di masa lalu.');
    error.statusCode = 400;
    throw error;
  }

  // 6. Validasi nomor WhatsApp
  const cleanPhone = normalizePhone(whatsapp);
  if (!isValidIndonesianPhone(cleanPhone)) {
    const error = new Error('Format Nomor WhatsApp tidak valid. Gunakan format nomor Indonesia (contoh: 08123456789).');
    error.statusCode = 400;
    throw error;
  }

  // ID Unik Booking
  const bookingId = 'BK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestampNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const clients = getGoogleClients();

  if (clients) {
    // ---- PRODUKSI: GOOGLE CALENDAR API & GOOGLE SHEETS API ----
    const startIso = `${date}T${startTime}:00+07:00`;
    const endIso = `${date}T${endTime}:00+07:00`;

    let createdEvent = { id: 'evt-' + Date.now() };

    // A. Cek & Insert Google Calendar (jika calendarId dikonfigurasi)
    if (clients.calendarId) {
      try {
        // Cek bentrok di Google Calendar sebelum insert
        const existingEvents = await clients.calendar.events.list({
          calendarId: clients.calendarId,
          timeMin: `${date}T08:00:00+07:00`,
          timeMax: `${date}T18:00:00+07:00`,
          singleEvents: true,
        });

        const items = (existingEvents.data.items || []).filter(e => {
          const p = e.extendedProperties?.private || {};
          return e.status !== 'cancelled' && p.roomId === roomId;
        });

        const clash = items.find(e => {
          const eStart = (e.start.dateTime || e.start.date).substring(11, 16);
          const eEnd = (e.end.dateTime || e.end.date).substring(11, 16);
          return isOverlapping(startTime, endTime, eStart, eEnd);
        });

        if (clash) {
          const p = clash.extendedProperties?.private || {};
          const booker = p.bookedByName || 'pengguna lain';
          const cStart = (clash.start.dateTime || clash.start.date).substring(11, 16);
          const cEnd = (clash.end.dateTime || clash.end.date).substring(11, 16);
          const error = new Error(`${room.name} sudah dibooking pukul ${cStart}–${cEnd} oleh ${booker}. Silakan pilih jam atau ruang lain.`);
          error.statusCode = 409;
          throw error;
        }

        // B. Insert Event ke Google Calendar
        const eventPayload = {
          summary: `[${room.name}] ${keperluan}`,
          description: `Dipesan oleh: ${name}\nDivisi: ${divisi}\nNo. WhatsApp: ${cleanPhone}\nLantai: ${room.floor} (${room.zone})\nBooking ID: ${bookingId}`,
          location: `${room.name} (Lantai ${room.floor} HQ Alpro)`,
          colorId: room.colorId || '6',
          start: { dateTime: startIso, timeZone: 'Asia/Jakarta' },
          end: { dateTime: endIso, timeZone: 'Asia/Jakarta' },
          extendedProperties: {
            private: {
              roomId,
              bookedByName: name,
              bookedByDivisi: divisi,
              bookedByWa: cleanPhone,
              bookingId,
              floor: String(room.floor),
            }
          }
        };

        const insertRes = await clients.calendar.events.insert({
          calendarId: clients.calendarId,
          requestBody: eventPayload,
        });
        createdEvent = insertRes.data;

        // C. Post-Insert Verification (RACE CONDITION GUARD)
        const verifyList = await clients.calendar.events.list({
          calendarId: clients.calendarId,
          timeMin: startIso,
          timeMax: endIso,
          singleEvents: true,
        });

        const concurrentEvents = (verifyList.data.items || []).filter(e => {
          const p = e.extendedProperties?.private || {};
          return e.status !== 'cancelled' && p.roomId === roomId;
        });

        if (concurrentEvents.length > 1) {
          concurrentEvents.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
          if (concurrentEvents[0].id !== createdEvent.id) {
            await clients.calendar.events.delete({
              calendarId: clients.calendarId,
              eventId: createdEvent.id,
            });
            const error = new Error('Ruang baru saja dibooking oleh pengguna lain. Silakan pilih slot lain.');
            error.statusCode = 409;
            throw error;
          }
        }
      } catch (calErr) {
        if (calErr.statusCode === 409) throw calErr;
        console.warn('Google Calendar warning (tetap melanjutkan pencatatan ke Google Sheet):', calErr.message);
      }
    }

    // D. Append log CREATED ke Google Sheets
    if (clients.spreadsheetId) {
      try {
        await clients.sheets.spreadsheets.values.append({
          spreadsheetId: clients.spreadsheetId,
          range: 'Log Booking!A:L',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              timestampNow,
              bookingId,
              room.name,
              room.floor,
              'CREATED',
              name,
              divisi,
              cleanPhone,
              `${date} ${startTime} - ${endTime}`,
              keperluan,
              createdEvent.id,
              '-'
            ]]
          }
        });
      } catch (sheetErr) {
        console.error('Error appending to Google Sheet audit log:', sheetErr);
      }
    }

    return {
      success: true,
      bookingId,
      eventId: createdEvent.id,
      roomName: room.name,
      slot: `${date} ${startTime} - ${endTime}`,
      message: `Booking ${room.name} berhasil dibuat untuk tanggal ${date} jam ${startTime}–${endTime}.`
    };
  }

  // ---- DEVELOPMENT / LOCAL FALLBACK STORE ----
  const db = readDb();

  // A. Cek bentrok di mock
  const clash = db.events.find(e => {
    return e.status !== 'CANCELLED' &&
           e.roomId === roomId &&
           e.date === date &&
           isOverlapping(startTime, endTime, e.startTime, e.endTime);
  });

  if (clash) {
    const error = new Error(`${room.name} sudah dibooking pukul ${clash.startTime}–${clash.endTime} oleh ${clash.name}. Silakan pilih jam atau ruang lain.`);
    error.statusCode = 409;
    throw error;
  }

  // B. Simpan Event
  const newEvent = {
    id: 'evt-' + Date.now(),
    bookingId,
    roomId,
    roomName: room.name,
    floor: room.floor,
    zone: room.zone,
    date,
    startTime,
    endTime,
    name,
    divisi,
    whatsapp: cleanPhone,
    keperluan,
    status: 'CONFIRMED',
    created: new Date().toISOString()
  };

  db.events.push(newEvent);

  // C. Simpan Log Audit CREATED
  db.logs.unshift({
    timestamp: timestampNow,
    bookingId,
    roomName: room.name,
    floor: room.floor,
    action: 'CREATED',
    name,
    divisi,
    whatsapp: cleanPhone,
    slot: `${date} ${startTime} - ${endTime}`,
    keperluan,
    eventId: newEvent.id,
    cancelReason: '-'
  });

  writeDb(db);

  return {
    success: true,
    bookingId,
    eventId: newEvent.id,
    roomName: room.name,
    slot: `${date} ${startTime} - ${endTime}`,
    message: `Booking ${room.name} berhasil dibuat untuk tanggal ${date} jam ${startTime}–${endTime}.`
  };
}

/**
 * 3. Batalkan booking dengan verifikasi nomor WhatsApp (Phone Hash Security)
 */
export async function cancelBooking(data) {
  const { bookingId, eventId, whatsapp, reason } = data;

  if ((!bookingId && !eventId) || !whatsapp) {
    const error = new Error('Booking ID / Event ID dan Nomor WhatsApp pemesan wajib disertakan untuk pembatalan.');
    error.statusCode = 400;
    throw error;
  }

  const cleanPhone = normalizePhone(whatsapp);
  const cancelReason = reason?.trim() || 'Dibatalkan oleh pemesan';
  const timestampNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  const clients = getGoogleClients();

  if (clients) {
    // ---- PRODUKSI: GOOGLE CALENDAR API & GOOGLE SHEETS API ----
    let event = null;
    let targetEventId = eventId;

    if (!targetEventId && bookingId) {
      // Cari event berdasarkan bookingId di extendedProperties
      const searchRes = await clients.calendar.events.list({
        calendarId: clients.calendarId,
        privateExtendedProperty: [`bookingId=${bookingId}`],
      });
      event = (searchRes.data.items || [])[0];
      if (event) targetEventId = event.id;
    } else if (targetEventId) {
      try {
        const getRes = await clients.calendar.events.get({
          calendarId: clients.calendarId,
          eventId: targetEventId,
        });
        event = getRes.data;
      } catch (err) {
        if (err.code === 404) {
          const error = new Error('Jadwal booking tidak ditemukan atau sudah dibatalkan sebelumnya.');
          error.statusCode = 404;
          throw error;
        }
        throw err;
      }
    }

    if (!event || event.status === 'cancelled') {
      const error = new Error('Jadwal booking tidak ditemukan atau sudah dibatalkan sebelumnya.');
      error.statusCode = 404;
      throw error;
    }

    // PHONE HASH VERIFICATION
    const bookedByWa = normalizePhone(event.extendedProperties?.private?.bookedByWa);
    if (bookedByWa !== cleanPhone) {
      const error = new Error('Nomor WhatsApp tidak cocok dengan data pemesan asli ruangan ini.');
      error.statusCode = 403;
      throw error;
    }

    // Delete event dari Google Calendar
    await clients.calendar.events.delete({
      calendarId: clients.calendarId,
      eventId: targetEventId,
    });

    const props = event.extendedProperties?.private || {};
    const roomName = event.summary?.split(']')[0]?.replace('[', '') || 'Ruang Meeting';
    const floor = props.floor || '1';
    const bookerName = props.bookedByName || '-';
    const divisi = props.bookedByDivisi || '-';
    const startIso = event.start?.dateTime || event.start?.date || '';
    const endIso = event.end?.dateTime || event.end?.date || '';
    const dateStr = startIso.substring(0, 10);
    const slotStr = `${dateStr} ${startIso.substring(11, 16)} - ${endIso.substring(11, 16)}`;

    // Append log CANCELLED ke Google Sheet
    if (clients.spreadsheetId) {
      try {
        await clients.sheets.spreadsheets.values.append({
          spreadsheetId: clients.spreadsheetId,
          range: 'Log Booking!A:L',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              timestampNow,
              props.bookingId || bookingId || targetEventId,
              roomName,
              floor,
              'CANCELLED',
              bookerName,
              divisi,
              cleanPhone,
              slotStr,
              event.description?.split('\n')[0] || event.summary || '-',
              targetEventId,
              cancelReason
            ]]
          }
        });
      } catch (sheetErr) {
        console.error('Error appending cancel log to Google Sheet:', sheetErr);
      }
    }

    return {
      success: true,
      message: `Booking ${roomName} berhasil dibatalkan.`
    };
  }

  // ---- DEVELOPMENT / LOCAL FALLBACK STORE ----
  const db = readDb();
  const eventIdx = db.events.findIndex(e =>
    (eventId && e.id === eventId) || (bookingId && e.bookingId === bookingId)
  );

  if (eventIdx === -1 || db.events[eventIdx].status === 'CANCELLED') {
    const error = new Error('Jadwal booking tidak ditemukan atau sudah dibatalkan sebelumnya.');
    error.statusCode = 404;
    throw error;
  }

  const targetEvent = db.events[eventIdx];

  // PHONE HASH VERIFICATION
  if (normalizePhone(targetEvent.whatsapp) !== cleanPhone) {
    const error = new Error('Nomor WhatsApp tidak cocok dengan data pemesan asli ruangan ini.');
    error.statusCode = 403;
    throw error;
  }

  // Ubah status jadi CANCELLED
  targetEvent.status = 'CANCELLED';

  // Tambahkan log CANCELLED
  db.logs.unshift({
    timestamp: timestampNow,
    bookingId: targetEvent.bookingId,
    roomName: targetEvent.roomName,
    floor: targetEvent.floor,
    action: 'CANCELLED',
    name: targetEvent.name,
    divisi: targetEvent.divisi,
    whatsapp: cleanPhone,
    slot: `${targetEvent.date} ${targetEvent.startTime} - ${targetEvent.endTime}`,
    keperluan: targetEvent.keperluan,
    eventId: targetEvent.id,
    cancelReason
  });

  writeDb(db);

  return {
    success: true,
    message: `Booking ${targetEvent.roomName} berhasil dibatalkan.`
  };
}

/**
 * 4. Ambil riwayat audit log dengan multi-parameter filter
 */
export async function getHistory(filters = {}) {
  const { room, floor, startDate, endDate, name, action } = filters;

  const clients = getGoogleClients();

  if (clients && clients.spreadsheetId) {
    try {
      const response = await clients.sheets.spreadsheets.values.get({
        spreadsheetId: clients.spreadsheetId,
        range: 'Log Booking!A2:L',
      });

      const rows = response.data.values || [];
      let logs = rows.map(r => ({
        timestamp: r[0] || '',
        bookingId: r[1] || '',
        roomName: r[2] || '',
        floor: r[3] ? Number(r[3]) : '',
        action: r[4] || '',
        name: r[5] || '',
        divisi: r[6] || '',
        whatsapp: r[7] || '',
        slot: r[8] || '',
        keperluan: r[9] || '',
        eventId: r[10] || '',
        cancelReason: r[11] || '-'
      }));

      // Filter
      if (room) logs = logs.filter(l => l.roomName.toLowerCase().includes(room.toLowerCase()));
      if (floor) logs = logs.filter(l => String(l.floor) === String(floor));
      if (name) logs = logs.filter(l => l.name.toLowerCase().includes(name.toLowerCase()));
      if (action) logs = logs.filter(l => l.action.toUpperCase() === action.toUpperCase());
      if (startDate) logs = logs.filter(l => l.slot >= startDate);
      if (endDate) logs = logs.filter(l => l.slot <= endDate + ' 23:59');

      return { logs };
    } catch (err) {
      console.error('Error fetching Google Sheets history:', err.message);
      return { logs: [], error: 'Gagal membaca riwayat dari Google Sheet: ' + err.message };
    }
  }

  // Fallback Store: di Production jangan pernah tampilkan data dummy mock
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  if (isProduction) {
    return { logs: [] };
  }

  const db = readDb();
  let logs = [...(db.logs || [])];

  if (room) logs = logs.filter(l => l.roomName.toLowerCase().includes(room.toLowerCase()));
  if (floor) logs = logs.filter(l => String(l.floor) === String(floor));
  if (name) logs = logs.filter(l => l.name.toLowerCase().includes(name.toLowerCase()));
  if (action) logs = logs.filter(l => l.action.toUpperCase() === action.toUpperCase());
  if (startDate) logs = logs.filter(l => l.slot >= startDate);
  if (endDate) logs = logs.filter(l => l.slot <= endDate + ' 23:59');

  return { logs };
}
