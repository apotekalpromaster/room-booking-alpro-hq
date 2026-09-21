'use client';
import React, { useState } from 'react';
import {
  Settings2,
  Users,
  Building,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Info,
  ShieldCheck
} from 'lucide-react';

export default function RoomSettingsPage({ rooms = [], source = 'local-config', onRefreshRooms }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefreshRooms) {
      setIsRefreshing(true);
      try {
        await onRefreshRooms(true);
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  const isLiveSheets = source === 'google-sheets';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '20px 24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings2 size={22} color="var(--color-primary)" />
            <span>Direktori Konfigurasi 8 Ruang Meeting HQ</span>
          </h2>
          <p style={{ fontSize: '12.5px', color: '#6B7280', marginTop: 4 }}>
            {isLiveSheets ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#047857', fontWeight: 600 }}>
                <FileSpreadsheet size={15} color="#059669" />
                Fasilitas inventaris terhubung langsung secara real-time dari Google Spreadsheet (Tab Fasilitas Ruangan).
              </span>
            ) : (
              <span>Data konfigurasi ruangan dimuat dari <code>rooms.config.json</code> (Siap dihubungkan ke Google Spreadsheet Akun A).</span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isLiveSheets ? (
            <div
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '12px',
                color: '#065F46',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ShieldCheck size={16} color="#059669" />
              <span>Sinkronisasi Google Sheet Aktif</span>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '12px',
                color: '#1D4ED8',
                fontWeight: 500,
              }}
            >
              Data-Driven • Dikelola General Affairs (GA)
            </div>
          )}

          {onRefreshRooms && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Perbarui Fasilitas dari Google Sheet"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: isRefreshing ? 'wait' : 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Memperbarui...' : 'Sinkronkan Fasilitas'}</span>
            </button>
          )}
        </div>
      </div>

      {/* GA Instruction Card */}
      <div
        style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          fontSize: '12.5px',
          color: '#92400E',
        }}
      >
        <Info size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Info Manajemen Fasilitas (General Affairs):</strong> Tim GA dapat menambah, mengubah, atau memperbarui fasilitas fisik di setiap ruang kapan saja cukup melalui Google Spreadsheet tab <code>Fasilitas Ruangan</code>. Sistem akan otomatis merefleksikan perubahan di antarmuka booking tanpa perlu merombak atau redeploy kode sumber.
        </div>
      </div>

      {/* Grid Ruangan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(285px, 1fr))', gap: 16 }}>
        {rooms.map((room) => {
          const isReady = !room.status || room.status.toLowerCase() === 'siap pakai';

          return (
            <div
              key={room.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top Accent Strip */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: room.color,
                }}
              />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 9999,
                      backgroundColor: room.floor === 1 ? 'var(--zone-external-bg)' : 'var(--zone-internal-bg)',
                      color: room.floor === 1 ? 'var(--zone-external-text)' : 'var(--zone-internal-text)',
                    }}
                  >
                    Lantai {room.floor}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', color: '#6B7280' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: room.color }} />
                    <span>Color ID: {room.colorId}</span>
                  </div>
                </div>

                <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginTop: 12 }}>
                  {room.name}
                </div>

                <div style={{ fontSize: '12.5px', color: '#4B5563', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Building size={14} color="#6B7280" />
                  <span>{room.zone}</span>
                </div>

                <div style={{ fontSize: '12.5px', color: '#4B5563', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} color="#6B7280" />
                  <span>Kapasitas: <strong>{room.capacity} Orang</strong></span>
                </div>

                {/* Fasilitas Section */}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Fasilitas Inventaris:</span>
                    {room.facilities && room.facilities.length > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 600 }}>
                        {room.facilities.length} item
                      </span>
                    )}
                  </div>
                  {room.facilities && room.facilities.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {room.facilities.map((fac, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '11.5px',
                            backgroundColor: '#F3F4F6',
                            color: '#1F2937',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #E5E7EB',
                            fontWeight: 500
                          }}
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11.5px', color: '#9CA3AF', fontStyle: 'italic' }}>
                      (Fasilitas belum diisi — dapat ditambahkan langsung oleh General Affairs di Google Sheet)
                    </div>
                  )}
                </div>

                {/* Catatan Tambahan (jika ada di Spreadsheet) */}
                {room.notes && (
                  <div style={{ marginTop: 10, fontSize: '11.5px', color: '#6B7280', backgroundColor: '#F9FAFB', padding: '6px 10px', borderRadius: 6, border: '1px solid #F3F4F6' }}>
                    <strong>Catatan:</strong> {room.notes}
                  </div>
                )}
              </div>

              {/* Footer Status */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: isReady ? 'var(--color-success)' : '#D97706',
                  }}
                >
                  {isReady ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  <span>{room.status || 'Siap Pakai'}</span>
                </span>
                <span style={{ fontSize: '10.5px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                  ID: {room.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
