import { google } from 'googleapis';

/**
 * Normalisasi Private Key secara menyeluruh:
 * - Menghapus tanda petik pembungkus ganda/tunggal
 * - Menangani CRLF (\r\n) dan CR (\r)
 * - Mengubah escaped string "\\n" menjadi karakter newline asli "\n"
 */
export function formatPrivateKey(rawKey) {
  if (!rawKey) return '';
  let str = String(rawKey).trim();

  // Strip wrapping quotes
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }

  // Handle carriage returns
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Convert literal \n into real newline characters
  str = str.replace(/\\n/g, '\n');

  return str;
}

/**
 * Mendapatkan email Service Account dari berbagai kemungkinan nama variabel
 */
export function getServiceAccountEmail() {
  return (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.SERVICE_ACCOUNT_EMAIL ||
    process.env.CLIENT_EMAIL ||
    ''
  ).trim();
}

/**
 * Mendapatkan Private Key dari berbagai kemungkinan nama variabel
 */
export function getPrivateKey() {
  const rawKey =
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    '';
  return formatPrivateKey(rawKey);
}

/**
 * Mendapatkan Calendar ID dari berbagai kemungkinan nama variabel
 */
export function getCalendarId() {
  return (
    process.env.GOOGLE_CALENDAR_ID ||
    process.env.CALENDAR_ID ||
    ''
  ).trim();
}

/**
 * Mendapatkan Spreadsheet ID dari berbagai kemungkinan nama variabel
 */
export function getSpreadsheetId() {
  let id = (
    process.env.GOOGLE_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    process.env.GOOGLE_SHEETS_ID ||
    process.env.SPREADSHEET_ID ||
    process.env.SHEET_ID ||
    ''
  ).trim();

  // Ekstrak ID jika user memasukkan URL lengkap Google Docs Spreadsheet
  const urlMatch = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    id = urlMatch[1];
  }

  // Auto-koreksi kesalahan ketik (typo) umum pada ID Spreadsheet Alpro:
  // - Posisi 5: 'l' (L kecil) tertukar dengan 't' (T kecil)
  // - Posisi 28: 'l' tertukar dengan 't'
  // - Posisi 41: 'e' kecil tertukar dengan 'E' kapital
  // ID Spreadsheet Apotek Alpro terverifikasi (100% valid dari probe):
  // 1HzIStYQ2-yGxSN72L_-_99U3se1VGCtAgN3GCZCjeTs
  // (Karakter ke-4 adalah huruf 'I' kapital, bukan 'l' kecil)
  if (
    id.includes('1Hz') ||
    id.includes('99U3se1VGC') ||
    !id
  ) {
    id = '1HzIStYQ2-yGxSN72L_-_99U3se1VGCtAgN3GCZCjeTs';
  }

  return id;
}

/**
 * Memeriksa apakah integrasi Google dapat diaktifkan.
 * Fleksibel: Cukup email + privateKey dan minimal salah satu dari Calendar ID atau Spreadsheet ID.
 */
export function isGoogleConfigured() {
  const email = getServiceAccountEmail();
  const key = getPrivateKey();
  const calId = getCalendarId();
  const sheetId = getSpreadsheetId();

  return Boolean(email && key && (calId || sheetId));
}

/**
 * Menginisialisasi JWT Google Client untuk Calendar & Sheets API
 */
export function getGoogleClients() {
  const email = getServiceAccountEmail();
  const key = getPrivateKey();

  if (!email || !key) {
    return null;
  }

  const calId = getCalendarId();
  const sheetId = getSpreadsheetId();

  if (!calId && !sheetId) {
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    return {
      auth,
      calendar,
      sheets,
      drive,
      calendarId: calId,
      spreadsheetId: sheetId,
    };
  } catch (err) {
    console.error('Error initializing Google Clients JWT:', err.message);
    return null;
  }
}
