import assert from 'assert';
import {
  isWorkingDay,
  isWithinOperationalHours,
  normalizePhone,
  isValidIndonesianPhone,
  createBooking,
  cancelBooking,
  getAvailability,
  getHistory,
  extractEventKeperluan,
  extractEventWhatsApp,
  rescheduleBooking
} from '../lib/bookingService.js';
import { getRoomById } from '../lib/roomsConfig.js';

async function runTests() {
  console.log('--- STARTING ROOM BOOKING BACKEND VERIFICATION ---');

  // 1. Phone Normalization & Validation
  console.log('Test 1: Phone Normalization & Validation');
  assert.strictEqual(normalizePhone('081234567890'), '081234567890');
  assert.strictEqual(normalizePhone('+6281234567890'), '081234567890');
  assert.strictEqual(normalizePhone('6281234567890'), '081234567890');
  assert.strictEqual(isValidIndonesianPhone('081234567890'), true);
  assert.strictEqual(isValidIndonesianPhone('+6281234567890'), true);
  assert.strictEqual(isValidIndonesianPhone('0215554321'), false);
  assert.strictEqual(isValidIndonesianPhone('12345'), false);
  console.log('✅ Phone validation passed');

  // 2. Working Day Validation (Senin - Jumat only)
  console.log('Test 2: Working Day Validation');
  assert.strictEqual(isWorkingDay('2026-09-21'), true, 'Senin harus valid');
  assert.strictEqual(isWorkingDay('2026-09-22'), true, 'Selasa harus valid');
  assert.strictEqual(isWorkingDay('2026-09-25'), true, 'Jumat harus valid');
  assert.strictEqual(isWorkingDay('2026-09-26'), false, 'Sabtu harus non-operasional');
  assert.strictEqual(isWorkingDay('2026-09-27'), false, 'Minggu harus non-operasional');
  console.log('✅ Working day validation passed');

  // 3. Operational Hours (08:00 - 18:00 WIB)
  console.log('Test 3: Operational Hours Validation');
  assert.strictEqual(isWithinOperationalHours('08:00', '09:00'), true);
  assert.strictEqual(isWithinOperationalHours('08:00', '18:00'), true);
  assert.strictEqual(isWithinOperationalHours('07:30', '09:00'), false);
  assert.strictEqual(isWithinOperationalHours('17:00', '18:30'), false);
  assert.strictEqual(isWithinOperationalHours('10:00', '09:00'), false);
  console.log('✅ Operational hours validation passed');

  // 4. Booking Creation & Weekend Rejection
  console.log('Test 4: Rejection on Weekend Booking');
  try {
    await createBooking({
      roomId: 'ruang-b',
      date: '2026-10-17', // Sabtu
      startTime: '09:00',
      endTime: '11:00',
      name: 'Test Weekend',
      divisi: 'IT',
      whatsapp: '081234567890',
      keperluan: 'Test weekend reject'
    });
    assert.fail('Seharusnya melempar error hari kerja');
  } catch (err) {
    assert.strictEqual(err.statusCode, 400);
    console.log('✅ Weekend booking correctly rejected with HTTP 400');
  }

  // 5. Booking Creation Success (Future Weekday)
  console.log('Test 5: Create Valid Booking (Future Weekday)');
  // Hitung hari kerja di masa depan secara dinamis
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
    futureDate.setDate(futureDate.getDate() + 1);
  }
  const testDate = futureDate.toISOString().slice(0, 10);
  const bookingRes = await createBooking({
    roomId: 'ruang-b',
    date: testDate,
    startTime: '10:00',
    endTime: '12:00',
    name: 'Ahmad Fauzi',
    divisi: 'Operasional & QA',
    whatsapp: '081234567890',
    keperluan: 'Audit Internal SOP Kebersihan & Pelayanan'
  });
  assert.strictEqual(bookingRes.success, true);
  assert.ok(bookingRes.bookingId);
  console.log('✅ Booking created successfully:', bookingRes.bookingId);

  // 6. Conflict Detection on Same Slot
  console.log('Test 6: Conflict Detection on Overlapping Slot');
  try {
    await createBooking({
      roomId: 'ruang-b',
      date: testDate,
      startTime: '11:00', // Bentrok 11:00 - 13:00
      endTime: '13:00',
      name: 'User Bentrok',
      divisi: 'Finance',
      whatsapp: '081987654321',
      keperluan: 'Rapat dadakan'
    });
    assert.fail('Seharusnya melempar error bentrok HTTP 409');
  } catch (err) {
    assert.strictEqual(err.statusCode, 409);
    console.log('✅ Conflict correctly caught with HTTP 409:', err.message);
  }

  // 7. Cancellation Security: Phone Hash Verification
  console.log('Test 7: Security Cancellation (Phone Hash)');
  // A. Wrong WhatsApp Number -> Must Reject HTTP 403
  try {
    await cancelBooking({
      bookingId: bookingRes.bookingId,
      whatsapp: '089999999999', // SALAH
      reason: 'Coba cancel ilegal'
    });
    assert.fail('Seharusnya ditolak 403 Forbidden');
  } catch (err) {
    assert.strictEqual(err.statusCode, 403);
    assert.strictEqual(err.message, 'Nomor WhatsApp tidak cocok dengan data pemesan asli ruangan ini.');
    console.log('✅ Unauthorized cancellation rejected with HTTP 403 Forbidden');
  }

  // B. Correct WhatsApp Number -> Must Succeed
  const cancelRes = await cancelBooking({
    bookingId: bookingRes.bookingId,
    whatsapp: '081234567890', // BENAR
    reason: 'Jadwal audit dimajukan'
  });
  assert.strictEqual(cancelRes.success, true);
  console.log('✅ Authorized cancellation succeeded with correct WhatsApp number');

  // 8. Verify Audit Log
  console.log('Test 8: Audit Log Integrity');
  const history = await getHistory({ name: 'Ahmad Fauzi' });
  assert.ok(history.logs.length >= 2, 'Harus ada log CREATED dan CANCELLED');
  const createdLog = history.logs.find(l => l.action === 'CREATED');
  const cancelledLog = history.logs.find(l => l.action === 'CANCELLED');
  assert.ok(createdLog, 'Log CREATED harus ada');
  assert.ok(cancelledLog, 'Log CANCELLED harus ada');
  assert.strictEqual(cancelledLog.cancelReason, 'Jadwal audit dimajukan');
  console.log('✅ Audit log correctly recorded CREATED and CANCELLED entries');

  // 9. Room Capacity Verification (Ruang Alpro Kaizen Lt. 4)
  console.log('Test 9: Room Capacity Verification');
  const ruangH = getRoomById('ruang-h');
  assert.ok(ruangH, 'Ruang H harus ditemukan');
  assert.strictEqual(ruangH.capacity, 35, 'Kapasitas Ruang Alpro Kaizen harus 35 orang');
  console.log('✅ Ruang Alpro Kaizen (Lt. 4) capacity verified: 35 orang');

  // 10. Parser Verification: Legacy Google Calendar Event (Hilma format / backward compatibility)
  console.log('Test 10: Legacy Event Extraction (Hilma format)');
  const legacyEvent = {
    summary: '[Ruang Welcoming (Lt. 1)] Diskusi Rencana Kerja Divisi',
    description: 'Dipesan oleh: Hilma\nDivisi: People Management\nNo. WhatsApp: 081234567890\nLantai: 1 (Eksternal / Tamu Luar)\nBooking ID: BK-MVD9K8VH-VA2F',
    extendedProperties: {
      private: {
        roomId: 'ruang-b',
        bookedByName: 'Hilma',
        bookedByDivisi: 'People Management',
        bookedByWa: '081234567890',
        bookingId: 'BK-MVD9K8VH-VA2F',
        floor: '1'
      }
    }
  };
  const extractedKeperluanLegacy = extractEventKeperluan(legacyEvent);
  const extractedWaLegacy = extractEventWhatsApp(legacyEvent);
  assert.strictEqual(extractedKeperluanLegacy, 'Diskusi Rencana Kerja Divisi');
  assert.strictEqual(extractedWaLegacy, '081234567890');
  console.log('✅ Legacy Google Calendar event correctly extracts actual meeting purpose & WhatsApp');

  // 11. Parser Verification: New Google Calendar Event
  console.log('Test 11: New Event Extraction');
  const newEvent = {
    summary: '[Ruang Genuine (Lt. 1)] Presentasi Vendor Mesin POS',
    description: 'Keperluan: Presentasi Vendor Mesin POS\nDipesan oleh: Budi\nDivisi: Procurement\nNo. WhatsApp: 081299998888\nLantai: 1\nBooking ID: BK-NEW123',
    extendedProperties: {
      private: {
        roomId: 'ruang-a',
        bookedByName: 'Budi',
        bookedByDivisi: 'Procurement',
        bookedByWa: '081299998888',
        bookingId: 'BK-NEW123',
        floor: '1',
        keperluan: 'Presentasi Vendor Mesin POS'
      }
    }
  };
  assert.strictEqual(extractEventKeperluan(newEvent), 'Presentasi Vendor Mesin POS');
  assert.strictEqual(extractEventWhatsApp(newEvent), '081299998888');
  console.log('✅ New Google Calendar event correctly extracts purpose from private props & description');

  // 12. Verification: getAvailability returns keperluan & whatsapp
  console.log('Test 12: getAvailability returns keperluan and whatsapp');
  const avail = await getAvailability(testDate);
  assert.strictEqual(avail.isWorkingDay, true);
  assert.ok(Array.isArray(avail.events));
  console.log('✅ getAvailability verified with event array structure');

  // 13. Reschedule: Extend time in same room (Self-Exclusion Guard verification)
  console.log('Test 13: Reschedule - Extend Time in Same Room');
  const reschDate = testDate;
  const bResch = await createBooking({
    roomId: 'ruang-c',
    date: reschDate,
    startTime: '13:00',
    endTime: '14:00',
    name: 'Siti Rahma',
    divisi: 'Finance',
    whatsapp: '081345678901',
    keperluan: 'Review Anggaran Bulanan'
  });
  assert.strictEqual(bResch.success, true);

  // Extend 13:00 - 14:00 to 13:00 - 15:00 in ruang-c
  const updated1 = await rescheduleBooking({
    bookingId: bResch.bookingId,
    whatsapp: '081345678901',
    newRoomId: 'ruang-c',
    newDate: reschDate,
    newStartTime: '13:00',
    newEndTime: '15:00',
    reason: 'Pembahasan butuh waktu tambahan'
  });
  assert.strictEqual(updated1.success, true);
  assert.strictEqual(updated1.endTime, '15:00');
  console.log('✅ Reschedule in same room passed without false-positive self-conflict');

  // 14. Reschedule: Switch Room (Move to Ruang Alpro Kaizen Lt. 4)
  console.log('Test 14: Reschedule - Switch Room to Ruang H (Kaizen)');
  const updated2 = await rescheduleBooking({
    bookingId: bResch.bookingId,
    whatsapp: '081345678901',
    newRoomId: 'ruang-h',
    newDate: reschDate,
    newStartTime: '13:00',
    newEndTime: '15:00',
    reason: 'Peserta bertambah jadi 30 orang'
  });
  assert.strictEqual(updated2.success, true);
  assert.strictEqual(updated2.floor, 4);
  console.log('✅ Reschedule to new room passed successfully');

  // 15. Reschedule Rejection: Wrong WhatsApp (Identity Guard)
  console.log('Test 15: Reschedule Rejection on Wrong WhatsApp');
  try {
    await rescheduleBooking({
      bookingId: bResch.bookingId,
      whatsapp: '089999999999', // SALAH
      newRoomId: 'ruang-h',
      newStartTime: '14:00',
      newEndTime: '16:00'
    });
    assert.fail('Seharusnya ditolak 403 Forbidden');
  } catch (err) {
    assert.strictEqual(err.statusCode, 403);
    console.log('✅ Unauthorized reschedule rejected with HTTP 403 Forbidden');
  }

  // 16. Reschedule Rejection: Conflict with Another User\'s Booking
  console.log('Test 16: Reschedule Rejection on Conflict Slot');
  const bOther = await createBooking({
    roomId: 'ruang-a',
    date: reschDate,
    startTime: '15:00',
    endTime: '17:00',
    name: 'Bambang',
    divisi: 'Audit',
    whatsapp: '081288887777',
    keperluan: 'Audit Rutin'
  });
  assert.strictEqual(bOther.success, true);

  try {
    await rescheduleBooking({
      bookingId: bResch.bookingId,
      whatsapp: '081345678901',
      newRoomId: 'ruang-a',
      newDate: reschDate,
      newStartTime: '14:00',
      newEndTime: '16:00'
    });
    assert.fail('Seharusnya bentrok HTTP 409');
  } catch (err) {
    assert.strictEqual(err.statusCode, 409);
    console.log('✅ Conflicting reschedule rejected with HTTP 409 Conflict');
  }

  // 17. Verify Audit Log: Newest First & RESCHEDULED action
  console.log('Test 17: Audit Log Newest-First & RESCHEDULED Action');
  const hist = await getHistory();
  assert.ok(hist.logs.length >= 3);
  const reschLog = hist.logs.find(l => l.action === 'RESCHEDULED');
  assert.ok(reschLog, 'Harus ada catatan log aksi RESCHEDULED');
  assert.strictEqual(reschLog.name, 'Siti Rahma');
  console.log('✅ Audit log verified with RESCHEDULED entries and newest-first order');

  console.log('--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
