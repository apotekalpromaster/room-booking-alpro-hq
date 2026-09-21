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

  const maskedEmail = email
    ? (email.length > 20 ? `${email.slice(0, 10)}...${email.slice(-15)}` : email)
    : null;

  const envCheck = {
    detectedEmail: maskedEmail,
    emailFullLength: email ? email.length : 0,
    hasPrivateKey: Boolean(privateKey),
    privateKeyLength: privateKey ? privateKey.length : 0,
    calendarId: calendarId || null,
    spreadsheetId: spreadsheetId || null,
  };

  const diagnostics = {
    status: 'online',
    timestamp: new Date().toISOString(),
    envCheck,
    isGoogleConfigured: isGoogleConfigured(),
    authTest: null,
    calendarTest: null,
    driveDiscovery: null,
    sheetsTest: null,
  };

  const clients = getGoogleClients();
  if (!clients) {
    diagnostics.message = 'getGoogleClients() returned null.';
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
      error: err.message
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
        error: err.message
      };
    }
  }

  // 3. Drive Discovery (Find exact spreadsheet ID shared with SA)
  if (clients.drive) {
    try {
      const driveRes = await clients.drive.files.list({
        pageSize: 10,
        fields: 'files(id, name, mimeType)',
      });
      diagnostics.driveDiscovery = {
        success: true,
        files: driveRes.data.files || []
      };
    } catch (dErr) {
      diagnostics.driveDiscovery = {
        success: false,
        error: dErr.message
      };
    }
  }

  // 4. Candidate ID probe for Google Sheets
  const candidates = [
    spreadsheetId,
    '1HzlStYQ2-yGxSN72l_-_99U3se1VGCtAgN3GCZCjeTs',
    '1HzlStYQ2-yGxSN72L_-_99U3se1VGCtAgN3GCZCjeTs',
    '1HzlStYQ2-yGxSN72l_-_99U3se1VGCtAgN3GCZCjEts',
    '1HzlStYQ2-yGxSN72L_-_99U3se1VGCtAgN3GCZCjEts',
    '1HzlStYQ2-yGxSN72l_-_99U3se1VGCtAgN3GCZCjets',
    '1HzlStYQ2-yGxSN72L_-_99U3se1VGCtAgN3GCZCjets',
    '1HzlStYQ2-yGxSN72l-_99U3se1VGCtAgN3GCZCjeTs',
    '1HzlStYQ2-yGxSN72L-_99U3se1VGCtAgN3GCZCjeTs',
    '1HzIStYQ2-yGxSN72l_-_99U3se1VGCtAgN3GCZCjeTs',
    '1HzIStYQ2-yGxSN72L_-_99U3se1VGCtAgN3GCZCjeTs',
    '1HzlStYQ2-yGxSN72l_-_99U3se1VGClAgN3GCZCjeTs',
    '1HzlStYQ2-yGxSN72L_-_99U3se1VGClAgN3GCZCjeTs',
  ].filter(Boolean);

  // Deduplicate
  const uniqueCandidates = [...new Set(candidates)];
  let foundSheetMeta = null;
  let successfulId = null;
  const probeErrors = [];

  for (const idToTry of uniqueCandidates) {
    try {
      const meta = await clients.sheets.spreadsheets.get({
        spreadsheetId: idToTry,
      });
      foundSheetMeta = meta.data;
      successfulId = idToTry;
      break;
    } catch (tryErr) {
      probeErrors.push({ id: idToTry, error: tryErr.message });
    }
  }

  if (foundSheetMeta && successfulId) {
    const tabs = (foundSheetMeta.sheets || []).map(s => s.properties?.title);
    let sampleRows = [];
    try {
      const facTab = tabs.find(t => t.toLowerCase().includes('fasilitas')) || tabs[0];
      const valRes = await clients.sheets.spreadsheets.values.get({
        spreadsheetId: successfulId,
        range: `'${facTab}'!A1:F9`,
      });
      sampleRows = valRes.data.values || [];
    } catch (rErr) {
      sampleRows = [rErr.message];
    }

    diagnostics.sheetsTest = {
      success: true,
      matchedSpreadsheetId: successfulId,
      sheetTitle: foundSheetMeta.properties?.title,
      availableTabs: tabs,
      sampleRowsCount: sampleRows.length,
      sampleRows: sampleRows.slice(0, 3)
    };
  } else {
    diagnostics.sheetsTest = {
      success: false,
      testedCount: uniqueCandidates.length,
      lastError: probeErrors[0]?.error || 'All candidate IDs failed',
      errors: probeErrors.slice(0, 3)
    };
  }

  return NextResponse.json(diagnostics);
}
