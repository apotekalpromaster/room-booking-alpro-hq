'use client';
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Phone, FileText, AlertTriangle, Trash2, CheckCircle2, CalendarClock, ArrowRight } from 'lucide-react';
import { useToast } from './Toast';

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00'
];

export default function BookingDetailModal({
  booking,
  rooms = [],
  onClose,
  onCancelSuccess
}) {
  const { addToast } = useToast();
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'cancel'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cancel form state
  const [cancelPhone, setCancelPhone] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Edit form state
  const [editRoomId, setEditRoomId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('09:00');
  const [editEndTime, setEditEndTime] = useState('10:00');
  const [editPhone, setEditPhone] = useState('');
  const [editReason, setEditReason] = useState('');

  // Sinkronisasi state saat booking berubah
  useEffect(() => {
    if (booking) {
      setMode('view');
      setErrorMsg('');
      setCancelPhone('');
      setCancelReason('');
      setEditRoomId(booking.roomId || (rooms[0]?.id || ''));
      setEditDate(booking.date || '');
      setEditStartTime(booking.startTime || '09:00');
      setEditEndTime(booking.endTime || '10:00');
      setEditPhone('');
      setEditReason('');
    }
  }, [booking, rooms]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && Boolean(booking)) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [booking, onClose]);

  if (!booking) return null;

  async function handleCancelSubmit(e) {
    e.preventDefault();
    if (!cancelPhone.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi untuk verifikasi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          eventId: booking.id,
          whatsapp: cancelPhone.trim(),
          reason: cancelReason.trim() || 'Dibatalkan oleh pemesan',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal membatalkan booking.');
      }

      addToast({
        type: 'success',
        message: data.message || 'Booking berhasil dibatalkan.',
      });

      if (onCancelSuccess) onCancelSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editPhone.trim()) {
      setErrorMsg('Nomor WhatsApp wajib diisi untuk verifikasi identitas pemesan.');
      return;
    }

    if (editStartTime >= editEndTime) {
      setErrorMsg('Jam selesai harus lebih akhir dari jam mulai.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.bookingId,
          eventId: booking.id,
          whatsapp: editPhone.trim(),
          newRoomId: editRoomId,
          newDate: editDate,
          newStartTime: editStartTime,
          newEndTime: editEndTime,
          reason: editReason.trim() || 'Perubahan jam pemakaian / ruangan oleh pemesan',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengubah jadwal booking.');
      }

      addToast({
        type: 'success',
        message: data.message || 'Jadwal booking berhasil diperbarui.',
      });

      if (onCancelSuccess) onCancelSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
      addToast({
        type: 'error',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  const maskedPhone = booking.whatsapp
    ? booking.whatsapp.slice(0, 4) + '****' + booking.whatsapp.slice(-4)
    : '-';

  const selectedRoomObj = rooms.find(r => r.id === (mode === 'edit' ? editRoomId : booking.roomId));

  return (
    <div
      className="alpro-modal-overlay"
      onClick={onClose}
    >
      <div
        className="alpro-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="mobile-sheet-drag-handle" />

        {/* Header Modal */}
        <div className="alpro-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: booking.roomColor || 'var(--color-primary)',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {mode === 'edit' ? 'Ubah Jadwal & Ruangan' : mode === 'cancel' ? 'Konfirmasi Pembatalan' : 'Detail Pemesanan Ruang'}
              </h3>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                ID: {booking.bookingId || booking.id}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              color: '#9CA3AF',
              minWidth: 36,
              minHeight: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="alpro-modal-body">
          {mode === 'view' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Info Ruang & Lantai */}
              <div
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                    {booking.roomName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: 2 }}>
                    Lantai {booking.floor} • {booking.zone || (booking.floor === 1 ? 'Eksternal / Tamu Luar' : 'Staff Internal')}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 9999,
                    backgroundColor: booking.floor === 1 ? 'var(--zone-external-bg)' : 'var(--zone-internal-bg)',
                    color: booking.floor === 1 ? 'var(--zone-external-text)' : 'var(--zone-internal-text)',
                    flexShrink: 0,
                  }}
                >
                  Lt. {booking.floor}
                </span>
              </div>

              {/* Grid Info Detail */}
              <div className="detail-info-grid">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Calendar size={18} color="var(--color-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Tanggal</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{booking.date}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Clock size={18} color="var(--color-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Jam Pemakaian</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#1F2937' }}>
                      {booking.startTime} – {booking.endTime} WIB
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <User size={18} color="#6B7280" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Nama Pemesan</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{booking.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{booking.divisi}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Phone size={18} color="#6B7280" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Verifikasi WA</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{maskedPhone}</div>
                  </div>
                </div>
              </div>

              {/* Keperluan */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} />
                  <span>Keperluan Rapat:</span>
                </div>
                <div style={{ fontSize: '13px', color: '#1F2937', lineHeight: 1.5 }}>
                  {booking.keperluan || '-'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="alpro-modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="alpro-btn-secondary"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('edit');
                    setErrorMsg('');
                  }}
                  className="alpro-btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'var(--color-primary)',
                    color: '#FFFFFF',
                  }}
                >
                  <CalendarClock size={16} />
                  <span>Ubah Jadwal / Ruangan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('cancel');
                    setErrorMsg('');
                  }}
                  className="alpro-btn-danger"
                >
                  <Trash2 size={16} />
                  <span>Batalkan</span>
                </button>
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Notice Banner */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <CalendarClock size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                    Reschedule Jadwal Rapat oleh PIC
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#1E3A8A', marginTop: 2, lineHeight: 1.4 }}>
                    Anda dapat memindahkan ruangan atau menyesuaikan jam pemakaian. Masukkan nomor WhatsApp pemesan asli untuk konfirmasi.
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FFF1F2',
                    border: '1px solid #FDA4AF',
                    color: '#BE123C',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              {/* Pemilihan Ruangan Baru */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Pilih Ruangan <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="alpro-input"
                  required
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Lt. {r.floor} • Kapasitas: {r.capacity} orang)
                    </option>
                  ))}
                </select>
                {selectedRoomObj && (
                  <div style={{ fontSize: '11.5px', color: '#6B7280', marginTop: 4 }}>
                    Zonasi: <strong>{selectedRoomObj.zone}</strong> • {selectedRoomObj.description}
                  </div>
                )}
              </div>

              {/* Tanggal Pemakaian */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Tanggal Pemakaian <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="alpro-input"
                  required
                />
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: 3, display: 'block' }}>
                  * Ruang meeting HQ hanya beroperasi Senin – Jumat (Sabtu dan Minggu non-operasional).
                </span>
              </div>

              {/* Jam Mulai & Jam Selesai */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Jam Mulai <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={editStartTime}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setEditStartTime(newStart);
                      if (newStart >= editEndTime) {
                        const sIdx = TIME_SLOTS.indexOf(newStart);
                        if (sIdx !== -1 && sIdx + 1 < TIME_SLOTS.length) {
                          setEditEndTime(TIME_SLOTS[sIdx + 1]);
                        }
                      }
                    }}
                    className="alpro-input"
                    required
                  >
                    {TIME_SLOTS.slice(0, -1).map((t) => (
                      <option key={t} value={t}>{t} WIB</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Jam Selesai <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="alpro-input"
                    required
                  >
                    {TIME_SLOTS.filter(t => t > editStartTime).map((t) => (
                      <option key={t} value={t}>{t} WIB</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Verifikasi WhatsApp */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Verifikasi Nomor WhatsApp PIC <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                  className="alpro-input"
                />
                <span style={{ fontSize: '11px', color: '#6B7280', marginTop: 3, display: 'block' }}>
                  Wajib nomor WhatsApp yang digunakan saat membuat booking ({booking.name} - {booking.divisi}).
                </span>
              </div>

              {/* Alasan Perubahan */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Alasan Perubahan <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Peserta bertambah / Koordinasi dimajukan"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="alpro-input"
                />
              </div>

              <div className="alpro-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setMode('view');
                    setErrorMsg('');
                  }}
                  disabled={loading}
                  className="alpro-btn-secondary"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="alpro-btn-primary"
                  style={{ backgroundColor: 'var(--color-primary)', color: '#FFFFFF' }}
                >
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          )}

          {mode === 'cancel' && (
            <form onSubmit={handleCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <AlertTriangle size={22} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991B1B' }}>
                    Verifikasi Pembatalan Jadwal
                  </div>
                  <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: 4, lineHeight: 1.4 }}>
                    Masukkan <strong>Nomor WhatsApp pemesan</strong> yang digunakan saat membuat booking ini.
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div
                  style={{
                    backgroundColor: '#FFF1F2',
                    border: '1px solid #FDA4AF',
                    color: '#BE123C',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 500,
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Nomor WhatsApp Pemesan <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={cancelPhone}
                  onChange={(e) => setCancelPhone(e.target.value)}
                  required
                  className="alpro-input"
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Alasan Pembatalan <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rapat dimajukan / Jadwal bentrok"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="alpro-input"
                />
              </div>

              <div className="alpro-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setMode('view');
                    setErrorMsg('');
                  }}
                  disabled={loading}
                  className="alpro-btn-secondary"
                >
                  Kembali
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="alpro-btn-danger"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none' }}
                >
                  {loading ? 'Memverifikasi...' : 'Ya, Batalkan'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
