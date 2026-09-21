'use client';
import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useToast } from './Toast';

export default function HistoryPage({ rooms = [] }) {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  async function fetchHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedRoom) params.append('room', selectedRoom);
      if (selectedFloor) params.append('floor', selectedFloor);
      if (selectedAction) params.append('action', selectedAction);
      if (searchName) params.append('name', searchName);

      const res = await fetch(`/api/history?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs || []);
      } else {
        throw new Error(data.message || 'Gagal memuat riwayat.');
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [selectedRoom, selectedFloor, selectedAction]);

  // Export CSV
  function handleExportCsv() {
    if (logs.length === 0) {
      addToast({ type: 'warning', message: 'Tidak ada data log untuk diekspor.' });
      return;
    }

    const headers = [
      'Timestamp',
      'Booking ID',
      'Ruang',
      'Lantai',
      'Aksi',
      'Nama Pemesan',
      'Divisi',
      'No WhatsApp',
      'Slot Waktu',
      'Keperluan',
      'Alasan Cancel'
    ];

    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.bookingId}"`,
      `"${l.roomName}"`,
      `"${l.floor}"`,
      `"${l.action}"`,
      `"${l.name}"`,
      `"${l.divisi}"`,
      `"${l.whatsapp}"`,
      `"${l.slot}"`,
      `"${(l.keperluan || '').replace(/"/g, '""')}"`,
      `"${(l.cancelReason || '-').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log-Booking-HQ-Alpro-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({ type: 'success', message: 'Log berhasil diekspor ke file CSV!' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header & Filter Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
              <History size={22} color="var(--color-primary)" />
              <span>Riwayat & Audit Log Booking HQ</span>
            </h2>
            <p style={{ fontSize: '12.5px', color: '#6B7280', marginTop: 2 }}>
              Catatan riwayat transaksi append-only terintegrasi Google Sheet (pencatatan create dan cancel)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={fetchHistory}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={15} />
              <span>Segarkan</span>
            </button>

            <button
              onClick={handleExportCsv}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-button)',
                border: 'none',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 2px rgba(249, 115, 22, 0.2)',
              }}
            >
              <Download size={16} />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Cari nama pemesan..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchHistory(); }}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Filter Ruang */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#374151'
            }}
          >
            <option value="">Semua Ruangan</option>
            {rooms.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>

          {/* Filter Lantai */}
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#374151'
            }}
          >
            <option value="">Semua Lantai</option>
            <option value="1">Lantai 1 (Eksternal)</option>
            <option value="2">Lantai 2 (Internal)</option>
            <option value="4">Lantai 4 (Training)</option>
          </select>

          {/* Filter Aksi */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#374151'
            }}
          >
            <option value="">Semua Status Aksi</option>
            <option value="CREATED">CREATED (Booking Baru)</option>
            <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
          </select>

          <button
            onClick={fetchHistory}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Terapkan Filter
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#6B7280' }}>
            <div className="animate-pulse-subtle" style={{ fontSize: '14px', fontWeight: 600 }}>
              Memuat data log booking...
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
            <History size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', color: '#D1D5DB' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }}>Belum ada catatan log</div>
            <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: 4 }}>
              Coba sesuaikan kata kunci pencarian atau filter di atas.
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-table-container" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--color-border)', color: '#4B5563', fontSize: '12px', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Waktu Aksi (WIB)</th>
                    <th style={{ padding: '12px 16px' }}>Aksi</th>
                    <th style={{ padding: '12px 16px' }}>Ruangan</th>
                    <th style={{ padding: '12px 16px' }}>Slot Jadwal</th>
                    <th style={{ padding: '12px 16px' }}>Nama Pemesan & Divisi</th>
                    <th style={{ padding: '12px 16px' }}>Verifikasi WA</th>
                    <th style={{ padding: '12px 16px' }}>Keperluan / Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const isCreated = log.action === 'CREATED';
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        }}
                      >
                        <td style={{ padding: '12px 16px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {log.timestamp}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 9px',
                              borderRadius: 9999,
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: isCreated ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                              color: isCreated ? 'var(--color-success)' : 'var(--color-danger)',
                            }}
                          >
                            {isCreated ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{log.action}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                          <div>{log.roomName}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 400 }}>Lantai {log.floor}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#374151', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {log.slot}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{log.name}</div>
                          <div style={{ fontSize: '11.5px', color: '#6B7280' }}>{log.divisi}</div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#4B5563', fontSize: '12px' }}>
                          {log.whatsapp ? log.whatsapp.slice(0, 4) + '****' + log.whatsapp.slice(-4) : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#374151', maxWidth: 280 }}>
                          <div style={{ fontWeight: 500 }}>{log.keperluan}</div>
                          {!isCreated && log.cancelReason && log.cancelReason !== '-' && (
                            <div style={{ fontSize: '11px', color: '#DC2626', marginTop: 2, fontStyle: 'italic' }}>
                              Alasan: {log.cancelReason}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (<768px) */}
            <div className="mobile-table-cards" style={{ display: 'none', flexDirection: 'column', padding: 12, gap: 10 }}>
              {logs.map((log, index) => {
                const isCreated = log.action === 'CREATED';
                return (
                  <div
                    key={index}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      padding: '14px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 9999,
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: isCreated ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                          color: isCreated ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                      >
                        {isCreated ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{log.action}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: '#6B7280' }}>{log.timestamp}</span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                      {log.roomName} (Lt. {log.floor})
                    </div>
                    <div style={{ fontSize: '12px', color: '#4B5563' }}>
                      🕒 {log.slot}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#111827', fontWeight: 600 }}>
                      👤 {log.name} • <span style={{ color: '#6B7280', fontWeight: 400 }}>{log.divisi}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#374151', backgroundColor: '#F9FAFB', padding: '8px 10px', borderRadius: 6 }}>
                      {log.keperluan}
                      {!isCreated && log.cancelReason && log.cancelReason !== '-' && (
                        <div style={{ color: '#DC2626', marginTop: 2, fontSize: '11px' }}>
                          Alasan: {log.cancelReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-table-container {
            display: none !important;
          }
          .mobile-table-cards {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
