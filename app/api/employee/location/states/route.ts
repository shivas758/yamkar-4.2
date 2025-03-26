import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Add dynamic config to ensure proper handling
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('API: Fetching states...');
    
    // Direct query to get states from the existing table
    const { data, error } = await supabase
      .from('states')
      .select('id, state_name');
      
    if (error) {
      console.error('API: Error fetching states:', error);
      return NextResponse.json(
        { error: `Failed to fetch states: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully fetched ${data?.length || 0} states`);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API: Error in states endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch states: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 