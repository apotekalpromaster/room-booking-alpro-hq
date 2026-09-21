'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 380,
          width: 'calc(100% - 48px)',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => {
          let bg = '#FFFFFF';
          let border = '#E5E7EB';
          let icon = <Info size={20} color="#3B82F6" />;

          if (toast.type === 'success') {
            bg = '#F0FDF4';
            border = '#BBF7D0';
            icon = <CheckCircle2 size={20} color="#16A34A" />;
          } else if (toast.type === 'error' || toast.type === 'danger') {
            bg = '#FEF2F2';
            border = '#FECACA';
            icon = <XCircle size={20} color="#EF4444" />;
          } else if (toast.type === 'warning') {
            bg = '#FFFBEB';
            border = '#FDE68A';
            icon = <AlertTriangle size={20} color="#F59E0B" />;
          }

          return (
            <div
              key={toast.id}
              className="animate-fade-in"
              style={{
                pointerEvents: 'auto',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flexShrink: 0 }}>{icon}</div>
              <div style={{ fontSize: '13.5px', color: '#1F2937', fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ padding: 4, color: '#9CA3AF', borderRadius: 6 }}
                aria-label="Tutup notifikasi"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
