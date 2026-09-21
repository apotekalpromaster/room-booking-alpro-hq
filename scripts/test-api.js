import assert from 'assert';
import {
  isWorkingDay,
  isWithinOperationalHours,
  normalizePhone,
  isValidIndonesianPhone,
  createBooking,
  cancelBooking,
  getAvailability,
  getHistory
} from '../lib/bookingService.js';

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
      date: '2026-09-26', // Sabtu
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
  const testDate = '2026-10-05'; // Senin
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

  console.log('--- ALL BACKEND TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
