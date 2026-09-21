import { NextResponse } from 'next/server';
import { getRoomsWithDynamicFacilities, DEFAULT_ROOMS } from '../../../lib/roomsConfig.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === 'true';

    const { rooms, source } = await getRoomsWithDynamicFacilities(forceRefresh);

    return NextResponse.json({
      success: true,
      data: rooms && rooms.length > 0 ? rooms : DEFAULT_ROOMS,
      source: source || 'local-config'
    });
  } catch (error) {
    console.error('Error in /api/rooms route:', error);
    // Jangan pernah biarkan endpoint rooms gagal dengan status 500
    return NextResponse.json({
      success: true,
      data: DEFAULT_ROOMS,
      source: 'fallback-error',
      warning: error.message
    });
  }
}
