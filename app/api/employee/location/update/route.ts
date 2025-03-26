import { NextRequest, NextResponse } from 'next/server';
import { supabase, insertEmployeeLocation } from '@/lib/supabaseClient';
import { withAuth } from '@/lib/auth-middleware';

interface LocationUpdateBody {
  latitude: number;
  longitude: number;
  attendanceLogId: string;
}

async function updateEmployeeLocation(request: NextRequest, user: any) {
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as LocationUpdateBody;
    
    if (!body.latitude || !body.longitude || !body.attendanceLogId) {
      return NextResponse.json(
        { error: 'Missing required fields: latitude, longitude, and attendanceLogId are required' },
        { status: 400 }
      );
    }

    // Verify the attendance log exists and belongs to this user
    const { data: logData, error: logError } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('id', body.attendanceLogId)
      .eq('user_id', user.id)
      .is('check_out', null) // Must be an active check-in
      .single();

    if (logError || !logData) {
      return NextResponse.json(
        { error: 'Invalid attendance log ID or attendance log is not active' },
        { status: 400 }
      );
    }

    // Insert new location record
    const locationData = {
      user_id: user.id,
      attendance_log_id: body.attendanceLogId,
      latitude: body.latitude,
      longitude: body.longitude,
      captured_at: new Date().toISOString()
    };

    const newLocation = await insertEmployeeLocation(locationData);

    return NextResponse.json({ 
      success: true, 
      message: 'Location updated successfully',
      location: newLocation
    });
  } catch (error) {
    console.error('Error updating employee location:', error);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(updateEmployeeLocation); 