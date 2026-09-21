import { NextResponse } from 'next/server';
import { createBooking } from '../../../lib/bookingService.js';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await createBooking(body);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
