import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Check the farmers table schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'farmers');
      
    if (schemaError) {
      console.error('Error getting schema:', schemaError);
      return NextResponse.json(
        { error: `Failed to get schema: ${schemaError.message}` },
        { status: 500 }
      );
    }

    // Try to alter the table to add the missing column if needed
    let alterResult = null;
    if (!schemaData.some(col => col.column_name === 'location')) {
      console.log('Trying to add location column to farmers table...');
      
      const { error: alterError } = await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE farmers 
          ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '';
        `
      });
      
      alterResult = {
        success: !alterError,
        error: alterError ? alterError.message : null
      };
    }

    return NextResponse.json({ 
      schema: schemaData,
      alterResult
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking schema:', error);
    return NextResponse.json(
      { error: 'Failed to check schema: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 