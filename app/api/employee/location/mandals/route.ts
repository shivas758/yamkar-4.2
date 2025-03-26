import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const districtId = url.searchParams.get('districtId');
    
    if (!districtId) {
      return NextResponse.json(
        { error: 'District ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Fetching mandals for district ID: ${districtId}`);
    
    // Direct query to get mandals from the existing table
    const { data, error } = await supabase
      .from('mandals')
      .select('id, mandal_name, district_id')
      .eq('district_id', districtId);
      
    if (error) {
      console.error('API: Error fetching mandals:', error);
      return NextResponse.json(
        { error: `Failed to fetch mandals: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log(`API: Successfully fetched ${data?.length || 0} mandals for district ${districtId}`);
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API: Error in mandals endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mandals: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 