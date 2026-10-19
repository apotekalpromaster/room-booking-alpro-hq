import { NextResponse } from 'next/server';
import { rescheduleBooking } from '../../../lib/bookingService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await rescheduleBooking(body);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
