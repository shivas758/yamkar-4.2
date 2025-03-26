import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Add dynamic config to ensure proper handling
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const stateId = url.searchParams.get('stateId');
    
    if (!stateId) {
      return NextResponse.json(
        { error: 'State ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Fetching districts for state ID: ${stateId}`);
    
    // Direct query to get districts from the existing table
    const { data, error } = await supabase
      .from('districts')
      .select('id, district_name, state_id')
      .eq('state_id', stateId);
      
    if (error) {
      console.error('API: Error fetching districts:', error);
      return NextResponse.json(
        { error: `Failed to fetch districts: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully fetched ${data?.length || 0} districts for state ${stateId}`);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API: Error in districts endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch districts: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 