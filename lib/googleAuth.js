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

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Normalisasi newline karakter private key untuk environment Vercel
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

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
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
  };
}
