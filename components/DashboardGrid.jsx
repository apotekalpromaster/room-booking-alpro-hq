'use client';
import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  Building,
  Plus,
  Info,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import CurrentTimeBar from './CurrentTimeBar';

// Format jam operasional 08:00 - 18:00 WIB (interval 30 menit)
const HOURS = [];
for (let h = 8; h <= 18; h++) {
  HOURS.push(h);
}

// Helper formatting tanggal lokal Indonesia
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  return dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function getTodayString() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  return wib.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);

  // Jika jatuh ke Sabtu (6) atau Minggu (0), lewati ke hari kerja
  let dayOfWeek = dateObj.getUTCDay();
  if (dayOfWeek === 6) { // Sabtu -> Senin (+2 hari)
    dateObj.setUTCDate(dateObj.getUTCDate() + (days > 0 ? 2 : -1));
  } else if (dayOfWeek === 0) { // Minggu -> Senin (+1 hari)
    dateObj.setUTCDate(dateObj.getUTCDate() + (days > 0 ? 1 : -2));
  }

  return dateObj.toISOString().slice(0, 10);
}

export default function DashboardGrid({
  rooms = [],
  bookings = [],
  currentDate,
  setCurrentDate,
  onSlotClick,
  onBookingClick,
  onOpenNewBooking
}) {
  const [floorFilter, setFloorFilter] = useState('ALL'); // ALL, 1, 2, 4
  const [selectedMobileRoomId, setSelectedMobileRoomId] = useState(rooms[0]?.id || 'ruang-a');

  const todayStr = getTodayString();
  const isToday = currentDate === todayStr;

  // Cek apakah tanggal saat ini adalah akhir pekan
  const isWeekend = useMemo(() => {
    if (!currentDate) return false;
    const [y, m, d] = currentDate.split('-').map(Number);
    const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return day === 0 || day === 6;
  }, [currentDate]);

  // Filter ruangan berdasarkan lantai
  const filteredRooms = useMemo(() => {
    if (floorFilter === 'ALL') return rooms;
    return rooms.filter(r => String(r.floor) === String(floorFilter));
  }, [rooms, floorFilter]);

  // Ruangan yang dikelompokkan berdasarkan lantai untuk desktop view
  const groupedRooms = useMemo(() => {
    const groups = [];
    const f1 = filteredRooms.filter(r => r.floor === 1);
    const f2 = filteredRooms.filter(r => r.floor === 2);
    const f4 = filteredRooms.filter(r => r.floor === 4);

    if (f1.length > 0) {
      groups.push({
        floor: 1,
        title: 'LANTAI 1 — KHUSUS TAMU LUAR / EKSTERNAL',
        subtitle: 'Area pertemuan dengan mitra vendor, PBF, prinsipal & rekrutmen',
        badgeColor: 'var(--zone-external-text)',
        badgeBg: 'var(--zone-external-bg)',
        rooms: f1,
      });
    }
    if (f2.length > 0) {
      groups.push({
        floor: 2,
        title: 'LANTAI 2 — STAFF INTERNAL',
        subtitle: 'Area koordinasi divisi & tim operasional internal Apotek Alpro',
        badgeColor: 'var(--zone-internal-text)',
        badgeBg: 'var(--zone-internal-bg)',
        rooms: f2,
      });
    }
    if (f4.length > 0) {
      groups.push({
        floor: 4,
        title: 'LANTAI 4 — STAFF INTERNAL & TRAINING/SEMINAR',
        subtitle: 'Ruang serbaguna kapasitas besar untuk pelatihan staf & rapat pleno',
        badgeColor: 'var(--zone-training-text)',
        badgeBg: 'var(--zone-training-bg)',
        rooms: f4,
      });
    }
    return groups;
  }, [filteredRooms]);

  // Hitung posisi dan lebar event pada grid 08:00 - 18:00
  function getEventStyle(event, roomColor) {
    const [sh, sm] = event.startTime.split(':').map(Number);
    const [eh, em] = event.endTime.split(':').map(Number);

    const startMinutes = sh * 60 + sm - 8 * 60;
    const endMinutes = eh * 60 + em - 8 * 60;
    const totalGridMinutes = 10 * 60; // 08:00 s/d 18:00 = 600 menit

    const leftPercent = Math.max(0, (startMinutes / totalGridMinutes) * 100);
    const widthPercent = Math.min(100 - leftPercent, ((endMinutes - startMinutes) / totalGridMinutes) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      backgroundColor: roomColor ? `${roomColor}20` : '#FFF1E6',
      borderLeft: `4px solid ${roomColor || 'var(--color-primary)'}`,
      borderTop: '1px solid #E5E7EB',
      borderRight: '1px solid #E5E7EB',
      borderBottom: '1px solid #E5E7EB',
    };
  }

  // Selected room untuk mobile view
  const currentMobileRoom = rooms.find(r => r.id === selectedMobileRoomId) || rooms[0];
  const mobileBookingsForRoom = useMemo(() => {
    if (!currentMobileRoom) return [];
    return bookings.filter(b => b.roomId === currentMobileRoom.id && b.status !== 'CANCELLED');
  }, [bookings, currentMobileRoom]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. Bar Navigasi Tanggal & Filter Lantai */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '16px 20px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Date Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -1))}
            title="Hari Sebelumnya"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '13px',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          >
            <ChevronLeft size={16} />
            <span className="desktop-nav-text">Sebelumnya</span>
          </button>

          {/* Date Picker Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '6px 12px',
            }}
          >
            <Calendar size={16} color="var(--color-primary)" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                if (e.target.value) setCurrentDate(e.target.value);
              }}
              style={{
                border: 'none',
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#111827',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} className="desktop-date-label">
              ({formatIndonesianDate(currentDate)})
            </span>
          </div>

          <button
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            title="Hari Berikutnya"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '13px',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
          >
            <span className="desktop-nav-text">Berikutnya</span>
            <ChevronRight size={16} />
          </button>

          {/* Tombol Pintas 'Hari Ini' */}
          {!isToday && (
            <button
              onClick={() => setCurrentDate(todayStr)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                fontSize: '12.5px',
                fontWeight: 700,
                border: '1px solid rgba(249, 115, 22, 0.3)',
              }}
            >
              Hari Ini
            </button>
          )}
        </div>

        {/* Filter Lantai (Segmented Control) */}
        <div className="alpro-floor-filter" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginRight: 4 }}>
            Filter Lantai:
          </span>
          {[
            { id: 'ALL', label: 'Semua Ruang (8)' },
            { id: '1', label: 'Lt. 1 — Tamu Luar' },
            { id: '2', label: 'Lt. 2 — Internal' },
            { id: '4', label: 'Lt. 4 — Training' },
          ].map((f) => {
            const isSel = floorFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFloorFilter(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: isSel ? 700 : 500,
                  backgroundColor: isSel ? 'var(--color-primary)' : '#F3F4F6',
                  color: isSel ? '#FFFFFF' : '#4B5563',
                  boxShadow: isSel ? '0 1px 2px rgba(249, 115, 22, 0.2)' : 'none',
                }}
              >
                {f.label}
              </button>
            );
          })}
          
          {/* Penanda Batas Akhir Jam Operasional 18:00 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0 6px 0',
              marginTop: 4,
              borderTop: '2px dashed #E5E7EB',
            }}
          >
            <div style={{ width: 50, fontSize: '12.5px', fontWeight: 800, color: 'var(--color-primary)' }}>
              18:00
            </div>
            <div
              style={{
                flex: 1,
                backgroundColor: 'var(--color-primary-light)',
                border: '1px solid rgba(249, 115, 22, 0.25)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🔒 Batas Akhir Jam Operasional Ruang Meeting HQ (18:00 WIB)</span>
            </div>
          </div>

        </div>
      </div>

      {/* Weekend Notice if Saturday or Sunday is selected */}
      {isWeekend && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#92400E',
            fontSize: '13.5px',
          }}
        >
          <AlertCircle size={20} />
          <div>
            <strong>Hari Non-Operasional:</strong> Ruang meeting HQ Apotek Alpro hanya beroperasi pada hari <strong>Senin – Jumat</strong> pukul 08:00 – 18:00 WIB. Pemesanan pada hari Sabtu dan Minggu dinonaktifkan.
          </div>
        </div>
      )}

      {/* 2. DESKTOP GRID VIEW (≥768px) */}
      <div className="desktop-grid-wrapper" style={{ backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
        {/* Grid Header Jam Operasional */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            borderBottom: '2px solid var(--color-border)',
            backgroundColor: '#F9FAFB',
          }}
        >
          {/* Kolom Nama Ruangan */}
          <div
            style={{
              padding: '14px 16px',
              fontWeight: 700,
              fontSize: '13px',
              color: '#374151',
              borderRight: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Daftar Ruangan</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280' }}>
              ({filteredRooms.length} Ruang)
            </span>
          </div>

          {/* Kolom Timeline 08:00 - 18:00 WIB */}
          <div style={{ position: 'relative', height: '44px', width: '100%', overflow: 'hidden' }}>
            {HOURS.map((hour, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === HOURS.length - 1; // 18:00
              const leftPercent = (idx / 10) * 100;
              return (
                <div
                  key={hour}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    transform: isLast ? 'translateX(-100%)' : isFirst ? 'none' : 'translateX(-50%)',
                    top: '50%',
                    transform: isLast
                      ? 'translate(-100%, -50%)'
                      : isFirst
                      ? 'translate(8px, -50%)'
                      : 'translate(-50%, -50%)',
                    fontSize: '12px',
                    fontWeight: isLast ? 800 : 600,
                    color: isLast ? 'var(--color-primary)' : '#4B5563',
                    backgroundColor: isLast ? 'var(--color-primary-light)' : 'transparent',
                    padding: isLast ? '3px 8px' : '2px 4px',
                    borderRadius: '6px',
                    border: isLast ? '1px solid rgba(249, 115, 22, 0.3)' : 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 5,
                  }}
                >
                  {String(hour).padStart(2, '0')}:00{isLast ? ' (Akhir Operasional)' : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Body Grouped by Floors */}
        <div style={{ position: 'relative' }}>
          {groupedRooms.map((group) => (
            <div key={group.floor}>
              {/* Floor Group Header Divider */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: '8px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    backgroundColor: group.badgeBg,
                    color: group.badgeColor,
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    letterSpacing: '0.3px',
                  }}
                >
                  Lt. {group.floor}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {group.title}
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748B', display: 'none' }} className="desktop-desc">
                  — {group.subtitle}
                </span>
              </div>

              {/* Rows for each room */}
              {group.rooms.map((room) => {
                const roomBookings = bookings.filter(b => b.roomId === room.id && b.status !== 'CANCELLED');

                return (
                  <div
                    key={room.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '220px 1fr',
                      borderBottom: '1px solid #F3F4F6',
                      minHeight: 58,
                      position: 'relative',
                    }}
                  >
                    {/* Kolom Informasi Ruangan */}
                    <div
                      style={{
                        padding: '10px 16px',
                        borderRight: '1px solid var(--color-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: room.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#111827' }}>
                          {room.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} />
                          <span>{room.capacity} org</span>
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#9CA3AF' }}>•</span>
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>
                          {room.zone.split('/')[0].trim()}
                        </span>
                      </div>
                    </div>

                    {/* Kolom Timeline Ruang */}
                    <div
                      style={{
                        position: 'relative',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        backgroundColor: '#FAFAFA',
                      }}
                    >
                      {/* Grid Lines per Hour */}
                      {HOURS.slice(0, 10).map((h) => {
                        const hStr = String(h).padStart(2, '0');
                        return (
                          <div
                            key={h}
                            style={{
                              borderRight: '1px solid #E5E7EB',
                              height: '100%',
                              position: 'relative',
                              display: 'flex',
                            }}
                          >
                            {/* Slot 30 menit pertama (:00) */}
                            <div
                              onClick={() => {
                                if (!isWeekend) {
                                  onSlotClick(room.id, currentDate, `${hStr}:00`);
                                }
                              }}
                              title={isWeekend ? 'Sabtu/Minggu Libur' : `Klik untuk booking ${room.name} pukul ${hStr}:00`}
                              style={{
                                flex: 1,
                                height: '100%',
                                cursor: isWeekend ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isWeekend) e.currentTarget.style.backgroundColor = '#FFF7ED';
                              }}
                              onMouseLeave={(e) => {
                                if (!isWeekend) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            />
                            {/* Slot 30 menit kedua (:30) */}
                            <div
                              onClick={() => {
                                if (!isWeekend) {
                                  onSlotClick(room.id, currentDate, `${hStr}:30`);
                                }
                              }}
                              title={isWeekend ? 'Sabtu/Minggu Libur' : `Klik untuk booking ${room.name} pukul ${hStr}:30`}
                              style={{
                                flex: 1,
                                height: '100%',
                                borderLeft: '1px dashed #F3F4F6',
                                cursor: isWeekend ? 'not-allowed' : 'pointer',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isWeekend) e.currentTarget.style.backgroundColor = '#FFF7ED';
                              }}
                              onMouseLeave={(e) => {
                                if (!isWeekend) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            />
                          </div>
                        );
                      })}

                      {/* Event Booking Cards */}
                      {roomBookings.map((event) => {
                        const cardStyle = getEventStyle(event, room.color);

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onBookingClick({ ...event, roomColor: room.color });
                            }}
                            title={`${event.startTime}–${event.endTime} | ${event.name} (${event.divisi}): ${event.keperluan}`}
                            style={{
                              position: 'absolute',
                              top: 4,
                              bottom: 4,
                              zIndex: 10,
                              borderRadius: '8px',
                              padding: '6px 10px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              ...cardStyle,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-1px)';
                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>
                              <span>{event.startTime}–{event.endTime}</span>
                              <span>•</span>
                              <span style={{ color: room.color }}>{event.name}</span>
                              <span style={{ color: '#64748B', fontWeight: 500 }}>({event.divisi})</span>
                            </div>
                            <div
                              style={{
                                fontSize: '11.5px',
                                color: '#334155',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontWeight: 500,
                                marginTop: 1,
                              }}
                            >
                              {event.keperluan}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Current Time Bar (Realtime indicator across timeline) */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 220, right: 0, pointerEvents: 'none' }}>
            <CurrentTimeBar isToday={isToday} />
          </div>
        </div>
      </div>

      {/* 3. MOBILE VIEW (<768px): Vertical Timeline + Room Tabs */}
      <div className="mobile-timeline-wrapper" style={{ display: 'none', flexDirection: 'column', gap: 14 }}>
        {/* Horizontal Room Tabs */}
        <div
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: 8,
            paddingBottom: 6,
            scrollbarWidth: 'none',
          }}
        >
          {filteredRooms.map((r) => {
            const isSel = r.id === selectedMobileRoomId;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedMobileRoomId(r.id)}
                style={{
                  flexShrink: 0,
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: isSel ? '2px solid var(--color-primary)' : '1px solid #E5E7EB',
                  backgroundColor: isSel ? 'var(--color-primary-light)' : '#FFFFFF',
                  color: isSel ? 'var(--color-primary)' : '#374151',
                  fontWeight: isSel ? 700 : 500,
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: r.color }} />
                <span>{r.name}</span>
                <span style={{ fontSize: '10.5px', color: '#6B7280' }}>({r.capacity} org)</span>
              </button>
            );
          })}
        </div>

        {/* Selected Room Header Card */}
        {currentMobileRoom && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                {currentMobileRoom.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: 2 }}>
                Lantai {currentMobileRoom.floor} • {currentMobileRoom.zone}
              </div>
            </div>
            <button
              onClick={() => onSlotClick(currentMobileRoom.id, currentDate, '09:00')}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={15} />
              <span>Booking</span>
            </button>
          </div>
        )}

        {/* Vertical Hours Timeline */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--color-border)', padding: '8px 12px' }}>
          {HOURS.slice(0, 10).map((h) => {
            const hStr = String(h).padStart(2, '0') + ':00';
            const nextHStr = String(h + 1).padStart(2, '0') + ':00';

            // Cek apakah ada booking yang mencakup jam ini
            const activeBooking = mobileBookingsForRoom.find(b => {
              return b.startTime <= hStr && b.endTime > hStr;
            });

            return (
              <div
                key={h}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: '1px solid #F3F4F6',
                  alignItems: 'flex-start',
                }}
              >
                {/* Kolom Jam */}
                <div style={{ width: 50, fontSize: '12px', fontWeight: 700, color: '#4B5563', paddingTop: 4 }}>
                  {hStr}
                </div>

                {/* Kolom Slot Content */}
                <div style={{ flex: 1 }}>
                  {activeBooking ? (
                    <div
                      onClick={() => onBookingClick({ ...activeBooking, roomColor: currentMobileRoom.color })}
                      style={{
                        backgroundColor: `${currentMobileRoom.color}15`,
                        borderLeft: `4px solid ${currentMobileRoom.color}`,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                        {activeBooking.startTime} – {activeBooking.endTime} • {activeBooking.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#4B5563', marginTop: 2 }}>
                        {activeBooking.divisi}
                      </div>
                      <div style={{ fontSize: '12px', color: '#1F2937', marginTop: 4, fontWeight: 500 }}>
                        {activeBooking.keperluan}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => onSlotClick(currentMobileRoom.id, currentDate, hStr)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px dashed #D1D5DB',
                        backgroundColor: '#FAFAFA',
                        fontSize: '12px',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <span>Kosong</span>
                      <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '11.5px' }}>
                        + Ketuk untuk booking
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Action Button (FAB) Mobile */}
        <button
          onClick={onOpenNewBooking}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 20px rgba(249, 115, 22, 0.4)',
            zIndex: 40,
            border: 'none',
          }}
          aria-label="Buat Booking Baru"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {/* 4. Legend Warna 8 Ruang (Selalu Terlihat di Layar) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '14px 20px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
          Legend 8 Ruang HQ:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, flex: 1 }}>
          {rooms.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: r.color,
                }}
              />
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
                {r.name}
              </span>
              <span style={{ fontSize: '10.5px', color: '#9CA3AF' }}>
                ({r.capacity} org)
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-grid-wrapper {
            display: none !important;
          }
          .mobile-timeline-wrapper {
            display: flex !important;
          }
          .desktop-nav-text {
            display: none !important;
          }
          .desktop-date-label {
            display: none !important;
          }
          .desktop-desc {
            display: none !important;
          }
        }
        @media (min-width: 769px) {
          .desktop-desc {
            display: inline !important;
          }
        }
      `}</style>
    </div>
  );
}
