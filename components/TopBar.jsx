'use client';
import React, { useState, useEffect } from 'react';
import { Menu, Bell, Calendar, Clock, Plus, RefreshCw } from 'lucide-react';

export default function TopBar({
  title,
  setMobileOpen,
  onOpenBookingModal,
  onRefresh
}) {
  const [wibTime, setWibTime] = useState('');
  const [wibDate, setWibDate] = useState('');

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      // Format Jam WIB
      const timeStr = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + ' WIB';

      // Format Tanggal
      const dateStr = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      setWibTime(timeStr);
      setWibDate(dateStr);
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className="alpro-topbar"
      style={{
        height: 64,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Kiri: Hamburger + Judul */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          onClick={() => setMobileOpen(true)}
          style={{
            padding: 8,
            borderRadius: 8,
            color: '#374151',
            display: 'none',
          }}
          className="mobile-hamburger-btn"
          aria-label="Buka Menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
            {title || 'Dashboard Booking Ruang Meeting HQ'}
          </h1>
          <div style={{ fontSize: '11.5px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Apotek Alpro</span>
            <span>•</span>
            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Sistem Aktif</span>
          </div>
        </div>
      </div>

      {/* Kanan: Tanggal, Jam, Tombol Booking, Bell */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Clock & Date Widget (Desktop only) */}
        <div
          className="desktop-clock"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            padding: '6px 14px',
            fontSize: '12px',
            color: '#374151',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            <Calendar size={14} color="#6B7280" />
            <span>{wibDate}</span>
          </div>
          <div style={{ width: 1, height: 14, backgroundColor: '#D1D5DB' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--color-primary)' }}>
            <Clock size={14} />
            <span>{wibTime}</span>
          </div>
        </div>

        {/* Tombol Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Muat Ulang Data"
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: '#F3F4F6',
              color: '#4B5563',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
          >
            <RefreshCw size={17} />
          </button>
        )}

        {/* Tombol Buat Booking Baru (Desktop Header) */}
        <button
          onClick={onOpenBookingModal}
          className="desktop-book-btn"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13.5px',
            padding: '8px 16px',
            borderRadius: 'var(--radius-button)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 1px 2px rgba(249, 115, 22, 0.2)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary)'}
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>Booking Baru</span>
        </button>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-hamburger-btn {
            display: block !important;
          }
          .desktop-clock {
            display: none !important;
          }
          .desktop-book-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
