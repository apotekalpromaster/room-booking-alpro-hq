'use client';
import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
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
  
  // Pagination & Sorting State
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (Terbaru) | 'asc' (Terlama)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // 10, 25, 50

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
        setCurrentPage(1); // Reset ke halaman 1 setiap kali query baru
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

  // Sorting: Default 'desc' (data API sudah di-reverse di backend dari Google Sheet)
  const sortedLogs = useMemo(() => {
    if (sortOrder === 'desc') return logs;
    return [...logs].reverse();
  }, [logs, sortOrder]);

  // Pagination calculation
  const totalRecords = sortedLogs.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const paginatedLogs = sortedLogs.slice(startIndex, endIndex);

  // Export CSV (Mengekspor seluruh data hasil filter, bukan hanya 1 halaman)
  function handleExportCsv() {
    if (sortedLogs.length === 0) {
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
      'Alasan Cancel / Reschedule'
    ];

    const rows = sortedLogs.map(l => [
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

    addToast({ type: 'success', message: `Berhasil mengekspor ${sortedLogs.length} baris log ke CSV!` });
  }

  function renderActionBadge(action) {
    if (action === 'CREATED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 9px',
            borderRadius: 9999,
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
          }}
        >
          <CheckCircle2 size={12} />
          <span>CREATED</span>
        </span>
      );
    }
    if (action === 'RESCHEDULED') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 9px',
            borderRadius: 9999,
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            border: '1px solid #BFDBFE',
          }}
        >
          <Clock size={12} />
          <span>RESCHEDULED</span>
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 9px',
          borderRadius: 9999,
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
        }}
      >
        <XCircle size={12} />
        <span>{action}</span>
      </span>
    );
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
              Catatan riwayat transaksi append-only terintegrasi Google Sheet (pencatatan create, reschedule, dan cancel)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                cursor: 'pointer',
              }}
              title="Segarkan Log"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCsv}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.25)',
              }}
            >
              <Download size={15} />
              <span>Ekspor Log (CSV)</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {/* Pencarian Nama */}
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
            <option value="RESCHEDULED">RESCHEDULED (Diubah)</option>
            <option value="CANCELLED">CANCELLED (Dibatalkan)</option>
          </select>

          {/* Sort Order Toggle */}
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13px',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontWeight: 600
            }}
            title="Pilih Urutan Waktu"
          >
            <option value="desc">Terbaru ke Terlama (Default)</option>
            <option value="asc">Terlama ke Terbaru</option>
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
              border: '1px solid #E5E7EB',
              cursor: 'pointer'
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
        ) : sortedLogs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9CA3AF' }}>
            <History size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px', color: '#D1D5DB' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }}>Belum ada catatan log</div>
            <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: 4 }}>
              Coba sesuaikan kata kunci pencarian atau filter di atas.
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
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
                  {paginatedLogs.map((log, index) => {
                    const isCreated = log.action === 'CREATED';
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF7ED'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}
                      >
                        <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {log.timestamp}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {renderActionBadge(log.action)}
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
                            <div style={{ fontSize: '11px', color: log.action === 'RESCHEDULED' ? '#2563EB' : '#DC2626', marginTop: 2, fontStyle: 'italic' }}>
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
              {paginatedLogs.map((log, index) => {
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
                      {renderActionBadge(log.action)}
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
                        <div style={{ color: log.action === 'RESCHEDULED' ? '#2563EB' : '#DC2626', marginTop: 2, fontSize: '11px' }}>
                          Alasan: {log.cancelReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer Controls */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: '#FAFAFA',
                gap: 12,
              }}
            >
              {/* Info rentang data & page size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12.5px', color: '#4B5563' }}>
                  Menampilkan <strong>{totalRecords === 0 ? 0 : startIndex + 1}–{endIndex}</strong> dari <strong>{totalRecords}</strong> catatan
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label htmlFor="pageSizeSelect" style={{ fontSize: '12px', color: '#6B7280' }}>Baris per halaman:</label>
                  <select
                    id="pageSizeSelect"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      fontSize: '12px',
                      backgroundColor: '#FFFFFF',
                      color: '#374151'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Tombol Navigasi Halaman */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: safeCurrentPage <= 1 ? '#F3F4F6' : '#FFFFFF',
                    color: safeCurrentPage <= 1 ? '#9CA3AF' : '#374151',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Sebelumnya</span>
                </button>

                <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151', padding: '0 8px' }}>
                  Halaman {safeCurrentPage} dari {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: safeCurrentPage >= totalPages ? '#F3F4F6' : '#FFFFFF',
                    color: safeCurrentPage >= totalPages ? '#9CA3AF' : '#374151',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={16} />
                </button>
              </div>
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
