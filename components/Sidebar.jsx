'use client';
import React from 'react';
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  BookOpen,
  Settings2,
  X,
  User,
  Building2,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  mobileOpen,
  setMobileOpen,
  onOpenBookingModal,
  isBookingModalOpen = false,
  onCloseBookingModal
}) {
  const menuItems = [
    {
      id: 'beranda',
      label: 'Beranda Jadwal',
      icon: LayoutDashboard,
      description: 'Grid ketersediaan 8 ruang'
    },
    {
      id: 'booking-baru',
      label: 'Booking Baru',
      icon: CalendarPlus,
      action: () => onOpenBookingModal(),
      isAction: true,
      badge: 'Booking Cepat'
    },
    {
      id: 'riwayat',
      label: 'Riwayat & Audit Log',
      icon: History,
      description: 'Log transaksi & pembatalan'
    },
    {
      id: 'panduan',
      label: 'Panduan & Etika Ruang',
      icon: BookOpen,
      description: 'SOP & zonasi lantai'
    },
    {
      id: 'ruangan',
      label: 'Direktori Ruangan',
      icon: Settings2,
      description: 'Daftar & kapasitas ruang'
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(0)', // On desktop always 0, on mobile we override via media query
        }}
        className={`alpro-sidebar ${mobileOpen ? 'open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '20px 20px 16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/alpro-logo.png"
              alt="Alpro Logo"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                objectFit: 'contain',
                backgroundColor: '#FFF7ED',
                padding: 2,
              }}
              onError={(e) => {
                // Fallback jika gambar logo tidak ter-load
                e.target.style.display = 'none';
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#111827', letterSpacing: '-0.3px' }}>
                Apotek Alpro
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: 600 }}>
                Room Booking HQ
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="mobile-close-btn"
            style={{
              padding: 6,
              borderRadius: 8,
              color: '#6B7280',
              display: 'none', // Overridden in CSS media query
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Operational Notice Tag */}
        <div style={{ padding: '12px 18px 4px 18px' }}>
          <div
            style={{
              backgroundColor: '#FFF7ED',
              border: '1px solid #FFEDD5',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: '11px',
              color: '#9A3412',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 500
            }}
          >
            <ShieldCheck size={16} color="var(--color-primary)" />
            <span>Senin – Jumat • 08:00 – 18:00 WIB</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 10px 4px' }}>
            Menu Utama
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'booking-baru'
              ? Boolean(isBookingModalOpen)
              : (!isBookingModalOpen && activeTab === item.id);

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    if (onCloseBookingModal) onCloseBookingModal();
                    setActiveTab(item.id);
                  }
                  if (setMobileOpen) setMobileOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  textAlign: 'left',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : '#FFFFFF',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13.5px',
                  position: 'relative',
                  border: isActive ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid var(--color-border)',
                  boxShadow: isActive ? '0 1px 2px rgba(249, 115, 22, 0.1)' : 'none',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }
                }}
              >
                <Icon
                  size={18}
                  color={isActive ? 'var(--color-primary)' : '#6B7280'}
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 9999,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: '#FAFAFA',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              border: '2px solid #FED7AA'
            }}
          >
            HA
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              Staff Internal HQ
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Building2 size={12} />
              <span>Apotek Alpro Indonesia</span>
            </div>
          </div>
        </div>

        {/* Copyright & Creator Footer */}
        <div
          style={{
            padding: '12px 16px 14px 16px',
            backgroundColor: '#FAFAFA',
            borderTop: '1px solid #F3F4F6',
            fontSize: '11px',
            color: '#4B5563',
            lineHeight: 1.45,
            textAlign: 'center'
          }}
        >
          <div>© 2026 <strong>Apotek Alpro Indonesia</strong></div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: 3 }}>
            Dibuat oleh OASIS • Departemen OSS
          </div>
        </div>
      </aside>

      <style jsx global>{`
        @media (max-width: 768px) {
          .alpro-sidebar {
            transform: translateX(-100%) !important;
          }
          .alpro-sidebar.open {
            transform: translateX(0) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
