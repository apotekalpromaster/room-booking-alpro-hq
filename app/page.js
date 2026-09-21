'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from '../components/Toast';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import DashboardGrid from '../components/DashboardGrid';
import BookingModal from '../components/BookingModal';
import BookingDetailModal from '../components/BookingDetailModal';
import HistoryPage from '../components/HistoryPage';
import GuidePage from '../components/GuidePage';
import RoomSettingsPage from '../components/RoomSettingsPage';

function AppContent() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('beranda'); // beranda, riwayat, panduan, ruangan
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Data State
  const [rooms, setRooms] = useState([]);
  const [roomsSource, setRoomsSource] = useState('local-config');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tanggal yang sedang dilihat (Default: Hari Ini WIB)
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utc + 7 * 3600000);
    // Jika hari ini Sabtu (6), geser ke Senin depan (+2 hari)
    // Jika hari ini Minggu (0), geser ke Senin depan (+1 hari)
    const day = wib.getDay();
    if (day === 6) wib.setDate(wib.getDate() + 2);
    else if (day === 0) wib.setDate(wib.getDate() + 1);
    return wib.toISOString().slice(0, 10);
  });

  // Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [modalPrefill, setModalPrefill] = useState({
    roomId: '',
    date: '',
    startTime: '09:00',
  });
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);

  // Fetch Daftar Ruangan
  const fetchRooms = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/rooms?refresh=true' : '/api/rooms';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRooms(data.data || []);
        if (data.source) setRoomsSource(data.source);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }, []);

  // Fetch Ketersediaan Booking untuk Tanggal Tertentu
  const fetchAvailability = useCallback(async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${date}`);
      const data = await res.json();
      if (data.success) {
        setBookings(data.events || []);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetchAvailability(currentDate);
  }, [currentDate, fetchAvailability]);

  // Klik slot kosong pada grid
  function handleSlotClick(roomId, date, time) {
    setModalPrefill({
      roomId,
      date,
      startTime: time,
    });
    setIsBookingModalOpen(true);
  }

  // Klik event yang sudah dibooking
  function handleBookingClick(booking) {
    setSelectedBookingDetail(booking);
  }

  // Judul Dinamis
  const pageTitles = {
    beranda: 'Dashboard Booking Ruang Meeting HQ',
    riwayat: 'Riwayat & Audit Log Booking HQ',
    panduan: 'Panduan Operasional & Etika Ruang HQ',
    ruangan: 'Direktori Ruang Meeting HQ',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      {/* Sidebar Navigasi */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        isBookingModalOpen={isBookingModalOpen}
        onCloseBookingModal={() => setIsBookingModalOpen(false)}
        onOpenBookingModal={() => {
          setModalPrefill({
            roomId: rooms[0]?.id || 'ruang-a',
            date: currentDate,
            startTime: '09:00',
          });
          setIsBookingModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <div
        className="alpro-main-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: 'var(--sidebar-width)',
          minWidth: 0,
        }}
      >
        <TopBar
          title={pageTitles[activeTab]}
          setMobileOpen={setMobileSidebarOpen}
          onOpenBookingModal={() => {
            setModalPrefill({
              roomId: rooms[0]?.id || 'ruang-a',
              date: currentDate,
              startTime: '09:00',
            });
            setIsBookingModalOpen(true);
          }}
          onRefresh={() => fetchAvailability(currentDate)}
        />

        <main className="alpro-main-page" style={{ flex: 1, padding: '24px', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
          {activeTab === 'beranda' && (
            <DashboardGrid
              rooms={rooms}
              bookings={bookings}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              onSlotClick={handleSlotClick}
              onBookingClick={handleBookingClick}
              onOpenNewBooking={() => {
                setModalPrefill({
                  roomId: rooms[0]?.id || 'ruang-a',
                  date: currentDate,
                  startTime: '09:00',
                });
                setIsBookingModalOpen(true);
              }}
            />
          )}

          {activeTab === 'riwayat' && (
            <HistoryPage rooms={rooms} />
          )}

          {activeTab === 'panduan' && (
            <GuidePage />
          )}

          {activeTab === 'ruangan' && (
            <RoomSettingsPage rooms={rooms} source={roomsSource} onRefreshRooms={fetchRooms} />
          )}
        </main>
      </div>

      {/* Modal Booking Baru */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        rooms={rooms}
        initialRoomId={modalPrefill.roomId}
        initialDate={modalPrefill.date || currentDate}
        initialStartTime={modalPrefill.startTime}
        existingBookings={bookings}
        onBookingSuccess={() => {
          fetchAvailability(currentDate);
        }}
      />

      {/* Modal Detail Booking & Cancel */}
      <BookingDetailModal
        booking={selectedBookingDetail}
        rooms={rooms}
        onClose={() => setSelectedBookingDetail(null)}
        onCancelSuccess={() => {
          fetchAvailability(currentDate);
        }}
      />

      <style jsx global>{`
        @media (max-width: 768px) {
          .alpro-main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function RootPage() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
