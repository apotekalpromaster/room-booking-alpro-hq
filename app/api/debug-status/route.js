import { NextResponse } from 'next/server';
import {
  getGoogleClients,
  isGoogleConfigured,
  getServiceAccountEmail,
  getPrivateKey,
  getCalendarId,
  getSpreadsheetId
} from '../../../lib/googleAuth.js';

export async function GET() {
  const email = getServiceAccountEmail();
  const privateKey = getPrivateKey();
  const calendarId = getCalendarId();
  const spreadsheetId = getSpreadsheetId();

  // Mask email for display safety (e.g., alpro-r...account.com)
  const maskedEmail = email
    ? (email.length > 20 ? `${email.slice(0, 10)}...${email.slice(-15)}` : email)
    : null;

  const envCheck = {
    detectedEmail: maskedEmail,
    emailFullLength: email ? email.length : 0,
    hasPrivateKey: Boolean(privateKey),
    privateKeyLength: privateKey ? privateKey.length : 0,
    privateKeyHasHeader: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    privateKeyHasFooter: privateKey.includes('-----END PRIVATE KEY-----'),
    calendarId: calendarId || null,
    spreadsheetId: spreadsheetId || null,
    detectedGoogleEnvKeys: Object.keys(process.env).filter(k =>
      k.includes('GOOGLE') || k.includes('SHEET') || k.includes('CALENDAR') || k.includes('PRIVATE_KEY') || k.includes('CLIENT_EMAIL')
    ),
  };

  const diagnostics = {
    status: 'online',
    timestamp: new Date().toISOString(),
    envCheck,
    isGoogleConfigured: isGoogleConfigured(),
    authTest: null,
    calendarTest: null,
    sheetsTest: null,
  };

  const clients = getGoogleClients();
  if (!clients) {
    diagnostics.message = 'getGoogleClients() returned null. Cek envCheck di atas untuk melihat variabel mana yang belum terpasang atau salah format.';
    return NextResponse.json(diagnostics);
  }

  // 1. Test JWT Auth
  try {
    const tokenRes = await clients.auth.authorize();
    diagnostics.authTest = {
      success: true,
      tokenType: tokenRes.token_type,
      expiryDate: tokenRes.expiry_date
    };
  } catch (err) {
    diagnostics.authTest = {
      success: false,
      error: err.message,
      code: err.code
    };
  }

  // 2. Test Calendar
  if (clients.calendarId) {
    try {
      const calRes = await clients.calendar.events.list({
        calendarId: clients.calendarId,
        maxResults: 3,
        singleEvents: true,
        timeMin: new Date().toISOString(),
      });
      diagnostics.calendarTest = {
        success: true,
        calendarId: clients.calendarId,
        upcomingEventsCount: calRes.data.items?.length || 0,
      };
    } catch (err) {
      diagnostics.calendarTest = {
        success: false,
        calendarId: clients.calendarId,
        error: err.message,
        code: err.code
      };
    }
  } else {
    diagnostics.calendarTest = {
      success: false,
      error: 'calendarId belum diset di environment variables'
    };
  }

  // 3. Test Sheets
  if (clients.spreadsheetId) {
    try {
      const meta = await clients.sheets.spreadsheets.get({
        spreadsheetId: clients.spreadsheetId,
      });
      const tabs = (meta.data.sheets || []).map(s => s.properties?.title);

      let sampleFasilitas = [];
      try {
        const facTab = tabs.find(t => t.toLowerCase().includes('fasilitas')) || tabs[0];
        const valRes = await clients.sheets.spreadsheets.values.get({
          spreadsheetId: clients.spreadsheetId,
          range: `'${facTab}'!A1:F9`,
        });
        sampleFasilitas = valRes.data.values || [];
      } catch (fErr) {
        sampleFasilitas = [`Error: ${fErr.message}`];
      }

      diagnostics.sheetsTest = {
        success: true,
        spreadsheetId: clients.spreadsheetId,
        sheetTitle: meta.data.properties?.title,
        availableTabs: tabs,
        sampleFasilitasRowsCount: sampleFasilitas.length,
        hasLogBookingTab: tabs.some(t => t.toLowerCase().includes('log booking')),
        hasFasilitasTab: tabs.some(t => t.toLowerCase().includes('fasilitas'))
      };
    } catch (err) {
      diagnostics.sheetsTest = {
        success: false,
        spreadsheetId: clients.spreadsheetId,
        error: err.message,
        code: err.code
      };
    }
  } else {
    diagnostics.sheetsTest = {
      success: false,
      error: 'spreadsheetId belum diset di environment variables'
    };
  }

  return NextResponse.json(diagnostics);
}
