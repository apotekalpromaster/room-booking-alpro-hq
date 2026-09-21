import './globals.css';

export const metadata = {
  title: 'Dashboard Booking Ruang Meeting HQ — Apotek Alpro',
  description: 'Sistem booking 8 ruang meeting HQ Apotek Alpro terintegrasi Google Calendar & Audit Log',
  icons: {
    icon: '/alpro-logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/alpro-logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
