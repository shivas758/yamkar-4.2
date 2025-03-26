import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mandalId = url.searchParams.get('mandalId');
    
    if (!mandalId) {
      return NextResponse.json(
        { error: 'Mandal ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Fetching villages for mandal ID: ${mandalId}`);
    
    // Direct query to get villages from the table
    const { data, error } = await supabase
      .from('villages')
      .select('id, name, mandal_id')
      .eq('mandal_id', mandalId);
      
    if (error) {
      console.error('API: Error fetching villages:', error);
      return NextResponse.json(
        { error: `Failed to fetch villages: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully fetched ${data?.length || 0} villages for mandal ${mandalId}`);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API: Error in villages endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch villages: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 