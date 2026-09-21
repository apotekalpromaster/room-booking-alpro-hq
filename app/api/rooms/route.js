import { NextResponse } from 'next/server';
import { getRoomsWithDynamicFacilities } from '../../../lib/roomsConfig.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const { rooms, source } = await getRoomsWithDynamicFacilities(forceRefresh);

    return NextResponse.json({
      success: true,
      data: rooms,
      source
    });
  } catch (error) {
    console.error('Error fetching rooms API:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
