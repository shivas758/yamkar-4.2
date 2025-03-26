import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    console.log('API: Fetching crops...');
    
    // Direct query to get crops from the existing table
    const { data, error } = await supabase
      .from('crops')
      .select('id, name')
      .order('name');
      
    if (error) {
      console.error('API: Error fetching crops:', error);
      return NextResponse.json(
        { error: `Failed to fetch crops: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully fetched ${data?.length || 0} crops`);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API: Error in crops endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crops: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 