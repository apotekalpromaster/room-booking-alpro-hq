import { NextResponse } from 'next/server';
import { getAvailability } from '../../../lib/bookingService.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, message: 'Parameter date (YYYY-MM-DD) wajib disertakan.' },
        { status: 400 }
      );
    }

    const result = await getAvailability(date);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in /api/availability route:', error);
    // Graceful fallback agar grid tetap dapat dirender tanpa crash
    return NextResponse.json({
      success: true,
      date: new Date().toISOString().slice(0, 10),
      isWorkingDay: true,
      events: [],
      warning: error.message
    });
  }
}
