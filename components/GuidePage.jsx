'use client';
import React from 'react';
import { BookOpen, ShieldCheck, Users, Clock, Sparkles, AlertTriangle, Building, HeartHandshake } from 'lucide-react';

export default function GuidePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* Header Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '24px 28px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BookOpen size={26} />
        </div>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#111827' }}>
            Panduan Operasional & Etika Ruang Meeting HQ
          </h2>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: 2 }}>
            Standar operasional prosedur (SOP) penggunaan 8 ruang meeting Kantor Pusat Apotek Alpro
          </p>
        </div>
      </div>

      {/* 1. Aturan Zonasi Lantai */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building size={20} color="var(--color-primary)" />
          <span>1. Zonasi & Peruntukan Ruangan Berdasarkan Lantai</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {/* Lantai 1 */}
          <div
            style={{
              backgroundColor: '#F0F9FF',
              border: '1px solid #BAE6FD',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369A1', backgroundColor: '#E0F2FE', padding: '3px 8px', borderRadius: 9999 }}>
                LANTAI 1
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0284C7' }}>4 Ruangan</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C4A6E', marginTop: 6 }}>
              Area Tamu Luar / Eksternal
            </div>
            <p style={{ fontSize: '12px', color: '#0369A1', marginTop: 6, lineHeight: 1.5 }}>
              Ruang A (6 org), Ruang B (4 org), Ruang C (4 org), Ruang D (8 org).
              Dikhususkan untuk pertemuan dengan vendor, PBF, prinsipal, perbankan, dan wawancara calon kandidat eksternal.
            </p>
          </div>

          {/* Lantai 2 */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: 9999 }}>
                LANTAI 2
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>3 Ruangan</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: 6 }}>
              Area Staff Internal
            </div>
            <p style={{ fontSize: '12px', color: '#334155', marginTop: 6, lineHeight: 1.5 }}>
              Ruang E (6 org), Ruang F (6 org), Ruang G (8 org).
              Dikhususkan untuk rapat internal divisi HQ, koordinasi operasional apotek cabang, dan evaluasi tim kerja Alpro.
            </p>
          </div>

          {/* Lantai 4 */}
          <div
            style={{
              backgroundColor: '#FAF5FF',
              border: '1px solid #E9D5FF',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '3px 8px', borderRadius: 9999 }}>
                LANTAI 4
              </span>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#9333EA' }}>1 Ruangan</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#581C87', marginTop: 6 }}>
              Internal & Training Pleno
            </div>
            <p style={{ fontSize: '12px', color: '#7E22CE', marginTop: 6, lineHeight: 1.5 }}>
              Ruang H (20 org).
              Ruang rapat besar serbaguna untuk pelatihan staf farmasi/kasir, seminar, onboarding karyawan baru, dan rapat pleno BOD.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Ketentuan Jam Kerja & Durasi */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={20} color="var(--color-primary)" />
          <span>2. Ketentuan Waktu Operasional & Durasi Booking</span>
        </h3>

        <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 20, fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
          <li>
            <strong>Hari Operasional:</strong> <strong>Senin s/d Jumat</strong>. Akhir pekan (Sabtu & Minggu) adalah hari non-operasional dan sistem secara otomatis menonaktifkan pemesanan.
          </li>
          <li>
            <strong>Rentang Jam:</strong> Pukul <strong>08:00 s/d 18:00 WIB</strong> (Waktu Indonesia Barat).
          </li>
          <li>
            <strong>Durasi Fleksibel:</strong> Tidak ada batasan maksimal durasi per sesi dalam rentang jam operasional (mengakomodasi rapat maraton, training harian, dan audit menyeluruh).
          </li>
          <li>
            <strong>Disiplin Waktu:</strong> Diharapkan mengakhiri meeting <strong>5 menit sebelum jam selesai</strong> agar tim berikutnya dapat memulai tepat waktu.
          </li>
        </ul>
      </div>

      {/* 3. Keamanan Pembatalan (Phone Hash) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} color="var(--color-primary)" />
          <span>3. Protokol Keamanan Pembatalan Jadwal (Phone Hash)</span>
        </h3>

        <div
          style={{
            backgroundColor: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '13px',
            color: '#9A3412',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Mekanisme Anti-Salah Hapus / Unauthorized Cancellation:
          </div>
          Setiap pemesanan ruangan mewajibkan pencantuman <strong>Nomor WhatsApp Pemesan</strong>. Ketika Anda atau tim ingin membatalkan jadwal yang telah dibuat, sistem akan meminta verifikasi nomor WhatsApp tersebut. Jika nomor tidak cocok, request pembatalan akan <strong>ditolak oleh sistem (HTTP 403 Forbidden)</strong>. Hal ini menjaga jadwal tetap aman tanpa memerlukan login akun yang rumit.
        </div>
      </div>

      {/* 4. Etika & Kebersihan */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HeartHandshake size={20} color="var(--color-primary)" />
          <span>4. Etika Bersama & Budaya Zero-Waste HQ Alpro</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '12.5px', color: '#374151' }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>🧹 Kerapian & Kebersihan</div>
            Tinggalkan ruang dalam keadaan bersih, kembalikan posisi kursi, dan buang sampah snack/botol minum ke tempat sampah yang tersedia.
          </div>
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: '12.5px', color: '#374151' }}>
            <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>💡 Penghematan Energi</div>
            Matikan proyektor, monitor display, dan lampu saat meeting telah berakhir. Jika ruang tidak dipakai lagi, matikan AC ruangan.
          </div>
        </div>
      </div>
    </div>
  );
}
