'use client';
import React, { useState, useEffect } from 'react';

export default function CurrentTimeBar({ isToday }) {
  const [percent, setPercent] = useState(null);
  const [timeLabel, setTimeLabel] = useState('');

  useEffect(() => {
    if (!isToday) {
      setPercent(null);
      return;
    }

    function calculatePosition() {
      const now = new Date();
      // Get current hours and minutes in WIB (UTC+7)
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wibDate = new Date(utc + 7 * 3600000);

      const hours = wibDate.getHours();
      const minutes = wibDate.getMinutes();

      const totalMinutes = hours * 60 + minutes;
      const startMinutes = 8 * 60;  // 08:00
      const endMinutes = 18 * 60;   // 18:00

      if (totalMinutes < startMinutes || totalMinutes > endMinutes) {
        setPercent(null);
        return;
      }

      const p = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
      setPercent(p);
      setTimeLabel(
        String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
      );
    }

    calculatePosition();
    const interval = setInterval(calculatePosition, 30000); // Tiap 30 detik
    return () => clearInterval(interval);
  }, [isToday]);

  if (percent === null) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${percent}%`,
        width: '2px',
        backgroundColor: 'var(--color-danger)',
        zIndex: 25,
        pointerEvents: 'none',
        boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
      }}
    >
      {/* Time tag at the top */}
      <div
        style={{
          position: 'absolute',
          top: -24,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--color-danger)',
          color: '#FFFFFF',
          fontSize: '10.5px',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        }}
      >
        {timeLabel} WIB
      </div>
      {/* Little dot */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: -3,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: 'var(--color-danger)',
        }}
      />
    </div>
  );
}
