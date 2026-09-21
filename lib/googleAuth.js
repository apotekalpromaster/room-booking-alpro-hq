import { google } from 'googleapis';

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_CALENDAR_ID
  );
}

export function getGoogleClients() {
  if (!isGoogleConfigured()) {
    return null;
  }

  try {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';

    // Bersihkan quotes di awal/akhir jika ada (sering terjadi saat copy paste di Vercel)
    privateKey = privateKey.trim();
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    // Normalisasi newline literal \n menjadi newline asli
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    return {
      auth,
      calendar,
      sheets,
      calendarId: process.env.GOOGLE_CALENDAR_ID?.trim(),
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID?.trim(),
    };
  } catch (err) {
    console.error('Error initializing Google Clients:', err.message);
    return null;
  }
}
