import { NextResponse } from 'next/server';
import { getHistory } from '../../../lib/bookingService.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room') || '';
    const floor = searchParams.get('floor') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const name = searchParams.get('name') || '';
    const action = searchParams.get('action') || '';

    const result = await getHistory({ room, floor, startDate, endDate, name, action });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
  }
}
