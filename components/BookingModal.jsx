'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, MapPin, User, Building, Phone, FileText, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { useToast } from './Toast';

const DIVISI_SUGGESTIONS = [
  'Academy',
  'BOD (Board of Directors)',
  'BPT (Branding, Promotion, & Trade)',
  'E-Commerce',
  'Finance & Accounting',
  'Legal',
  'Operation Excellence',
  'Operation Sales',
  'OSS (Operation Support & Service)',
  'PCD (Professional Care & Development)',
  'People Management',
  'PPR (Pharmacy Practice & Regulatory)',
  'Procurement',
  'SGM (Sales & Geo Marketing)',
];

export default function BookingModal({
  isOpen,
  onClose,
  rooms = [],
  initialRoomId = '',
  initialDate = '',
  initialStartTime = '09:00',
  existingBookings = [],
  onBookingSuccess
}) {
  const { addToast } = useToast();

  const [roomId, setRoomId] = useState(initialRoomId || (rooms[0]?.id || 'ruang-a'));
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(initialStartTime || '09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [name, setName] = useState('');
  const [divisi, setDivisi] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [keperluan, setKeperluan] = useState('');
  const [loading, setLoading] = useState(false);
  const [weekendWarning, setWeekendWarning] = useState('');

  // Sinkronisasi props saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (initialRoomId) setRoomId(initialRoomId);
      if (initialDate) setDate(initialDate);
      if (initialStartTime) {
        setStartTime(initialStartTime);
        const [h, m] = initialStartTime.split(':').map(Number);
        const endHour = Math.min(18, h + 1);
        setEndTime(String(endHour).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
      }

      // Smart Autofill dari localStorage
      try {
        const saved = localStorage.getItem('alpro_booking_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.name) setName(parsed.name);
          if (parsed.divisi) setDivisi(parsed.divisi);
          if (parsed.whatsapp) setWhatsapp(parsed.whatsapp);
        }
      } catch (err) {
        console.warn('Could not read from localStorage', err);
      }
    }
  }, [isOpen, initialRoomId, initialDate, initialStartTime]);

  // Validasi Hari Kerja (Senin - Jumat)
  useEffect(() => {
    if (!date) return;
    const [y, m, d] = date.split('-').map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (day === 0 || day === 6) {
      setWeekendWarning('⚠️ Tanggal yang dipilih adalah hari Sabtu/Minggu. Ruang meeting HQ Alpro hanya beroperasi Senin – Jumat.');
    } else {
      setWeekendWarning('');
    }
  }, [date]);

  // Real-time Conflict Availability Check
  const availabilityStatus = useMemo(() => {
    if (!roomId || !date || !startTime || !endTime) {
      return { status: 'idle', message: '' };
    }

    if (endTime <= startTime) {
      return { status: 'invalid', message: 'Jam selesai harus lebih besar dari jam mulai.' };
    }

    const room = rooms.find(r => r.id === roomId);
    const roomName = room ? room.name : 'Ruangan';

    const clash = existingBookings.find(b => {
      if (b.status === 'CANCELLED') return false;
      if (b.roomId !== roomId) return false;
      if (b.date !== date) return false;
      return startTime < b.endTime && b.startTime < endTime;
    });

    if (clash) {
      return {
        status: 'clash',
        message: `Bentrok: ${clash.name} (${clash.divisi}) telah memesan pukul ${clash.startTime}–${clash.endTime}.`
      };
    }

    return {
      status: 'available',
      message: `✅ ${roomName} tersedia untuk slot pukul ${startTime}–${endTime} WIB.`
    };
  }, [roomId, date, startTime, endTime, rooms, existingBookings]);

  if (!isOpen) return null;

  const selectedRoom = rooms.find(r => r.id === roomId) || rooms[0];

  // List opsi jam operasional 08:00 s/d 18:00 WIB (step 30 menit)
  const timeOptions = [];
  for (let h = 8; h <= 18; h++) {
    const hStr = String(h).padStart(2, '0');
    timeOptions.push(`${hStr}:00`);
    if (h < 18) {
      timeOptions.push(`${hStr}:30`);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (weekendWarning) {
      addToast({ type: 'error', message: 'Tidak dapat memesan pada hari Sabtu atau Minggu.' });
      return;
    }

    if (availabilityStatus.status === 'clash') {
      addToast({ type: 'error', message: availabilityStatus.message });
      return;
    }

    if (endTime <= startTime) {
      addToast({ type: 'error', message: 'Jam selesai harus setelah jam mulai.' });
      return;
    }

    const cleanWa = whatsapp.replace(/[^0-9]/g, '');
    if (!cleanWa.startsWith('08') && !cleanWa.startsWith('628')) {
      addToast({
        type: 'error',
        message: 'Nomor WhatsApp harus nomor Indonesia yang diawali 08 atau 628.'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          date,
          startTime,
          endTime,
          name: name.trim(),
          divisi: divisi.trim(),
          whatsapp: whatsapp.trim(),
          keperluan: keperluan.trim()
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal membuat booking.');
      }

      try {
        localStorage.setItem(
          'alpro_booking_user',
          JSON.stringify({ name: name.trim(), divisi: divisi.trim(), whatsapp: whatsapp.trim() })
        );
      } catch (e) {}

      addToast({
        type: 'success',
        message: data.message || `Berhasil memesan ${selectedRoom.name}!`
      });

      onBookingSuccess();
      onClose();
    } catch (err) {
      addToast({
        type: 'error',
        message: err.message || 'Terjadi kesalahan sistem.'
      });
    } finally {
      setLoading(false);
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10);

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

        {/* Modal Header */}
        <div className="alpro-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'var(--color-primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                flexShrink: 0,
              }}
            >
              <Calendar size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Formulir Booking Ruang
              </h3>
              <div style={{ fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                HQ Apotek Alpro • 08:00 – 18:00 WIB
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: 6,
              borderRadius: 8,
              color: '#9CA3AF',
              flexShrink: 0,
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="alpro-modal-body">
          {weekendWarning && (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                color: '#92400E',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 500,
              }}
            >
              {weekendWarning}
            </div>
          )}

          {/* 1. Pilih Ruang */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Pilih Ruangan <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              className="alpro-input"
              style={{ fontWeight: 600 }}
            >
              <optgroup label="Lantai 1 — Khusus Tamu Luar / Eksternal">
                {rooms.filter(r => r.floor === 1).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity} org)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Lantai 2 — Staff Internal">
                {rooms.filter(r => r.floor === 2).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity} org)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Lantai 4 — Staff Internal & Training">
                {rooms.filter(r => r.floor === 4).map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity} org)
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedRoom && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    backgroundColor: selectedRoom.floor === 1 ? 'var(--zone-external-bg)' : 'var(--zone-internal-bg)',
                    color: selectedRoom.floor === 1 ? 'var(--zone-external-text)' : 'var(--zone-internal-text)',
                  }}
                >
                  Lantai {selectedRoom.floor} ({selectedRoom.zone})
                </span>
                <span style={{ fontSize: '11.5px', color: '#6B7280' }}>
                  Kapasitas: <strong>{selectedRoom.capacity} Orang</strong>
                </span>
              </div>
            )}

            {selectedRoom?.facilities && selectedRoom.facilities.length > 0 && (
              <div style={{ marginTop: 8, padding: '7px 10px', backgroundColor: '#F9FAFB', borderRadius: 8, border: '1px solid #F3F4F6', fontSize: '11.5px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>Fasilitas Ruang:</span>
                {selectedRoom.facilities.map((fac, idx) => (
                  <span key={idx} style={{ backgroundColor: '#FFFFFF', padding: '2px 7px', borderRadius: 5, border: '1px solid #E5E7EB', fontSize: '11px', color: '#1F2937' }}>
                    {fac}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2. Tanggal & Waktu (Responsive: Full-width tanggal di mobile, Jam Mulai & Selesai berdampingan) */}
          <div className="alpro-datetime-grid">
            <div className="date-col">
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Tanggal <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="alpro-input"
              />
            </div>

            <div className="time-grid-sub">
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Jam Mulai <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="alpro-input"
                >
                  {timeOptions.slice(0, -1).map((t) => (
                    <option key={t} value={t}>{t} WIB</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Jam Selesai <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="alpro-input"
                >
                  {timeOptions.filter(t => t > startTime).map((t) => (
                    <option key={t} value={t}>
                      {t} WIB{t === '18:00' ? ' (Batas Akhir)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Realtime Conflict / Availability Indicator */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              lineHeight: 1.4,
              backgroundColor:
                availabilityStatus.status === 'available' ? '#F0FDF4' :
                availabilityStatus.status === 'clash' ? '#FEF2F2' : '#F9FAFB',
              color:
                availabilityStatus.status === 'available' ? '#16A34A' :
                availabilityStatus.status === 'clash' ? '#DC2626' : '#6B7280',
              border: `1px solid ${
                availabilityStatus.status === 'available' ? '#BBF7D0' :
                availabilityStatus.status === 'clash' ? '#FECACA' : '#E5E7EB'
              }`
            }}
          >
            <div style={{ flexShrink: 0, marginTop: 1 }}>
              {availabilityStatus.status === 'available' && <CheckCircle2 size={16} />}
              {availabilityStatus.status === 'clash' && <AlertTriangle size={16} />}
            </div>
            <span>{availabilityStatus.message || 'Pilih slot waktu untuk memeriksa ketersediaan.'}</span>
          </div>

          {/* 3. Identitas Pemesan (Responsive: Stacked di mobile, 2-kolom di desktop) */}
          <div className="alpro-name-divisi-grid">
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Nama Pemesan <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Nama lengkap pemesan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="alpro-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Divisi / Departemen <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
                required
                className="alpro-input"
              >
                <option value="">Pilih Divisi / Departemen</option>
                {DIVISI_SUGGESTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Nomor WhatsApp */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Nomor WhatsApp Pemesan <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
              className="alpro-input"
            />
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: 4, lineHeight: 1.4 }}>
              🔒 <em>Verifikasi keamanan (Phone Hash) saat ingin membatalkan booking.</em>
            </div>
          </div>

          {/* 5. Keperluan Rapat */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                Keperluan Rapat <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: keperluan.length > 100 ? '#EF4444' : '#9CA3AF' }}>
                {keperluan.length}/100
              </span>
            </div>
            <textarea
              rows={2}
              placeholder="Contoh: Rapat koordinasi operasional apotek cabang"
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              required
              className="alpro-input"
              style={{ resize: 'none', minHeight: 64 }}
            />
          </div>

          {/* Modal Footer (Sticky & Touch-friendly) */}
          <div className="alpro-modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="alpro-btn-secondary"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={loading || availabilityStatus.status === 'clash'}
              className="alpro-btn-primary"
              style={{
                backgroundColor: availabilityStatus.status === 'clash' ? '#9CA3AF' : 'var(--color-primary)',
                cursor: (loading || availabilityStatus.status === 'clash') ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Menyimpan...' : 'Konfirmasi Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
