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
 * Ekstraksi keperluan rapat dari Google Calendar event secara cerdas & kompatibel mundur
 * Mendukung format event baru maupun data lama yang sudah tersimpan di Google Calendar
 */
export function extractEventKeperluan(item) {
  if (!item) return '-';
  const props = item.extendedProperties?.private || {};

  // 1. Properti privat langsung (prioritas utama pada event baru)
  if (props.keperluan && props.keperluan.trim()) {
    return props.keperluan.trim();
  }

  // 2. Baris 'Keperluan:' dari deskripsi
  if (item.description) {
    const match = item.description.match(/Keperluan:\s*([^\n\r]+)/i);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }

  // 3. Ekstraksi dari judul item.summary: format '[Nama Ruang] Keperluan Asli Rapat'
  // Ini memastikan kompatibilitas penuh untuk data lama (seperti booking Hilma)
  if (item.summary && item.summary.includes(']')) {
    const afterBracket = item.summary.split(']').slice(1).join(']').trim();
    if (afterBracket) {
      return afterBracket;
    }
  }

  // 4. Fallback baris pertama deskripsi HANYA jika bukan format metadata 'Dipesan oleh:'
  if (item.description && !item.description.trim().startsWith('Dipesan oleh:')) {
    const firstLine = item.description.split('\n')[0].trim();
    if (firstLine) return firstLine;
  }

  // 5. Fallback ke summary jika bukan sekadar nama ruang kurung siku
  if (item.summary && item.summary.trim()) {
    return item.summary.trim();
  }

  return '-';
}

/**
 * Ekstraksi nomor WhatsApp pemesan dari event Google Calendar
 */
export function extractEventWhatsApp(item) {
  if (!item) return '';
  const props = item.extendedProperties?.private || {};
  if (props.bookedByWa && props.bookedByWa.trim()) {
    return props.bookedByWa.trim();
  }

  if (item.description) {
    const match = item.description.match(/(?:WhatsApp|No\.\s*WhatsApp):\s*([^\n\r]+)/i);
    if (match && match[1]?.trim()) {
      return match[1].trim();
    }
  }

  return '';
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
            whatsapp: extractEventWhatsApp(item),
            keperluan: extractEventKeperluan(item),
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
          description: `Keperluan: ${keperluan}\nDipesan oleh: ${name}\nDivisi: ${divisi}\nNo. WhatsApp: ${cleanPhone}\nLantai: ${room.floor} (${room.zone})\nBooking ID: ${bookingId}`,
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
              keperluan,
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
              extractEventKeperluan(event),
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
 * 3. Reschedule / Ubah Jadwal Pemakaian atau Ruangan Booking oleh PIC
 */
export async function rescheduleBooking(data) {
  const {
    bookingId,
    eventId,
    whatsapp,
    newRoomId,
    newDate,
    newStartTime,
    newEndTime,
    reason = 'Perubahan jadwal oleh pemesan'
  } = data;

  // 1. Validasi input wajib
  if ((!bookingId && !eventId) || !whatsapp || !newRoomId || !newStartTime || !newEndTime) {
    const error = new Error('Field bookingId/eventId, whatsapp, newRoomId, newStartTime, dan newEndTime wajib diisi.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Validasi format WhatsApp
  if (!isValidIndonesianPhone(whatsapp)) {
    const error = new Error('Nomor WhatsApp tidak valid. Format harus nomor aktif Indonesia (contoh: 081234567890).');
    error.statusCode = 400;
    throw error;
  }
  const cleanPhone = normalizePhone(whatsapp);

  // 3. Validasi ruangan baru
  const newRoom = getRoomById(newRoomId);
  if (!newRoom) {
    const error = new Error(`Ruangan dengan ID ${newRoomId} tidak ditemukan.`);
    error.statusCode = 404;
    throw error;
  }

  // 4. Validasi jam operasional (08:00 - 18:00 WIB)
  if (!isWithinOperationalHours(newStartTime, newEndTime)) {
    const error = new Error('Jam pemakaian tidak valid. Ruang meeting HQ hanya beroperasi pukul 08:00 – 18:00 WIB.');
    error.statusCode = 400;
    throw error;
  }

  const clients = getGoogleClients();
  const timestampNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

  // ---- PRODUCTION: GOOGLE CALENDAR & GOOGLE SHEETS ----
  if (clients && clients.calendarId) {
    // A. Cari event di Google Calendar
    let event = null;
    let targetEventId = eventId;

    if (bookingId && !targetEventId) {
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

    // B. PHONE HASH VERIFICATION (Identity Guard)
    const bookedByWa = normalizePhone(extractEventWhatsApp(event) || event.extendedProperties?.private?.bookedByWa);
    if (bookedByWa !== cleanPhone) {
      const error = new Error('Nomor WhatsApp tidak cocok dengan data pemesan asli ruangan ini.');
      error.statusCode = 403;
      throw error;
    }

    // Tanggal target: jika newDate diberikan gunakan newDate, jika tidak gunakan tanggal lama
    const originalStartIso = event.start?.dateTime || event.start?.date || '';
    const originalDate = originalStartIso ? originalStartIso.substring(0, 10) : '';
    const targetDate = newDate || originalDate;

    // Validasi hari kerja target
    if (!isWorkingDay(targetDate)) {
      const error = new Error('Pemesanan ditolak: Ruang meeting HQ Alpro hanya beroperasi pada hari kerja (Senin – Jumat).');
      error.statusCode = 400;
      throw error;
    }

    const startIso = `${targetDate}T${newStartTime}:00+07:00`;
    const endIso = `${targetDate}T${newEndTime}:00+07:00`;

    // C. Pengecekan Bentrok (Self-Exclusion Guard)
    const existingEventsRes = await clients.calendar.events.list({
      calendarId: clients.calendarId,
      timeMin: `${targetDate}T08:00:00+07:00`,
      timeMax: `${targetDate}T18:00:00+07:00`,
      singleEvents: true,
    });

    const activeEvents = (existingEventsRes.data.items || []).filter(e => {
      const p = e.extendedProperties?.private || {};
      const isTargetRoom = p.roomId === newRoomId;
      const notSelf = e.id !== targetEventId && p.bookingId !== (event.extendedProperties?.private?.bookingId || bookingId);
      return e.status !== 'cancelled' && isTargetRoom && notSelf;
    });

    const clash = activeEvents.find(e => {
      const eStart = (e.start.dateTime || e.start.date).substring(11, 16);
      const eEnd = (e.end.dateTime || e.end.date).substring(11, 16);
      return isOverlapping(newStartTime, newEndTime, eStart, eEnd);
    });

    if (clash) {
      const p = clash.extendedProperties?.private || {};
      const booker = p.bookedByName || 'pengguna lain';
      const cStart = (clash.start.dateTime || clash.start.date).substring(11, 16);
      const cEnd = (clash.end.dateTime || clash.end.date).substring(11, 16);
      const error = new Error(`${newRoom.name} sudah dibooking pukul ${cStart}–${cEnd} oleh ${booker}. Silakan pilih jam atau ruang lain.`);
      error.statusCode = 409;
      throw error;
    }

    // D. Patch Google Calendar Event (In-place Atomic Update)
    const originalProps = event.extendedProperties?.private || {};
    const keperluan = extractEventKeperluan(event);
    const bookerName = originalProps.bookedByName || '';
    const divisi = originalProps.bookedByDivisi || '';
    const bId = originalProps.bookingId || bookingId || targetEventId;

    const patchPayload = {
      summary: `[${newRoom.name}] ${keperluan}`,
      description: `Keperluan: ${keperluan}\nDipesan oleh: ${bookerName}\nDivisi: ${divisi}\nNo. WhatsApp: ${cleanPhone}\nLantai: ${newRoom.floor} (${newRoom.zone})\nBooking ID: ${bId}\n(Jadwal diperbarui: ${timestampNow})`,
      location: `${newRoom.name} (Lantai ${newRoom.floor} HQ Alpro)`,
      colorId: newRoom.colorId || '6',
      start: { dateTime: startIso, timeZone: 'Asia/Jakarta' },
      end: { dateTime: endIso, timeZone: 'Asia/Jakarta' },
      extendedProperties: {
        private: {
          ...originalProps,
          roomId: newRoom.id,
          floor: String(newRoom.floor),
          keperluan,
        }
      }
    };

    await clients.calendar.events.patch({
      calendarId: clients.calendarId,
      eventId: targetEventId,
      requestBody: patchPayload,
    });

    // E. Append log RESCHEDULED ke Google Sheets
    const slotStr = `${targetDate} ${newStartTime} - ${newEndTime}`;
    if (clients.spreadsheetId) {
      try {
        await clients.sheets.spreadsheets.values.append({
          spreadsheetId: clients.spreadsheetId,
          range: 'Log Booking!A:L',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              timestampNow,
              bId,
              newRoom.name,
              newRoom.floor,
              'RESCHEDULED',
              bookerName,
              divisi,
              cleanPhone,
              slotStr,
              keperluan,
              targetEventId,
              reason || 'Perubahan jam pemakaian / ruangan oleh pemesan'
            ]]
          }
        });
      } catch (sheetErr) {
        console.error('Error appending reschedule log to Google Sheet:', sheetErr);
      }
    }

    return {
      success: true,
      message: `Jadwal berhasil diubah ke ${newRoom.name} (${newStartTime}–${newEndTime} WIB).`,
      bookingId: bId,
      eventId: targetEventId,
      roomName: newRoom.name,
      floor: newRoom.floor,
      date: targetDate,
      startTime: newStartTime,
      endTime: newEndTime
    };
  }

  // ---- LOCAL / FALLBACK STORE ----
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

  const targetDate = newDate || targetEvent.date;
  if (!isWorkingDay(targetDate)) {
    const error = new Error('Pemesanan ditolak: Ruang meeting HQ Alpro hanya beroperasi pada hari kerja (Senin – Jumat).');
    error.statusCode = 400;
    throw error;
  }

  // Conflict Check (Self-Exclusion)
  const isConflict = db.events.some(e => {
    if (e.id === targetEvent.id || e.bookingId === targetEvent.bookingId) return false;
    if (e.status === 'CANCELLED') return false;
    if (e.roomId !== newRoomId || e.date !== targetDate) return false;
    return isOverlapping(newStartTime, newEndTime, e.startTime, e.endTime);
  });

  if (isConflict) {
    const error = new Error(`${newRoom.name} sudah dibooking pada jam tersebut oleh pengguna lain. Silakan pilih jam atau ruang lain.`);
    error.statusCode = 409;
    throw error;
  }

  // Update event in local store
  targetEvent.roomId = newRoom.id;
  targetEvent.roomName = newRoom.name;
  targetEvent.floor = newRoom.floor;
  targetEvent.zone = newRoom.zone;
  targetEvent.date = targetDate;
  targetEvent.startTime = newStartTime;
  targetEvent.endTime = newEndTime;

  // Append log RESCHEDULED
  db.logs.unshift({
    timestamp: timestampNow,
    bookingId: targetEvent.bookingId,
    roomName: newRoom.name,
    floor: newRoom.floor,
    action: 'RESCHEDULED',
    name: targetEvent.name,
    divisi: targetEvent.divisi,
    whatsapp: cleanPhone,
    slot: `${targetDate} ${newStartTime} - ${newEndTime}`,
    keperluan: targetEvent.keperluan,
    eventId: targetEvent.id,
    cancelReason: reason || 'Perubahan jam pemakaian / ruangan oleh pemesan'
  });

  writeDb(db);

  return {
    success: true,
    message: `Jadwal berhasil diubah ke ${newRoom.name} (${newStartTime}–${newEndTime} WIB).`,
    bookingId: targetEvent.bookingId,
    eventId: targetEvent.id,
    roomName: newRoom.name,
    floor: newRoom.floor,
    date: targetDate,
    startTime: newStartTime,
    endTime: newEndTime
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

      // Urutkan transaksi terbaru ke terlama (baris bawah sheet berada di teratas)
      logs.reverse();

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
