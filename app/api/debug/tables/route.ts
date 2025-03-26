import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Check if the tables exist
    const tables = ['states', 'districts', 'mandals', 'farmers', 'crops'];
    const results: Record<string, any> = {};
    
    // Check database schema for column names
    const { data: schemasData, error: schemasError } = await supabase
      .rpc('get_table_schemas');
    
    if (schemasError) {
      results.schemas = { error: schemasError.message };
      
      // Fallback to information_schema if RPC fails
      const { data: infoSchema, error: infoSchemaError } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type')
        .in('table_name', tables);
        
      if (!infoSchemaError) {
        results.schemas = organizeSchemaInfo(infoSchema || []);
      }
    } else {
      results.schemas = schemasData;
    }
    
    for (const table of tables) {
      try {
        // Try to get a sample of data from the table to check if it exists
        const { data: sampleData, error: sampleError } = await supabase
          .from(table)
          .select('*')
          .limit(3);
          
        if (sampleError) {
          results[table] = { error: sampleError.message };
          
          // If table not found, try to get its name with different casing
          if (sampleError.message.includes('not found') || sampleError.message.includes('does not exist')) {
            const { data: tableList, error: tableListError } = await supabase
              .rpc('list_tables');
              
            if (!tableListError && tableList) {
              const possibleMatches = tableList.filter((t: string) => 
                t.toLowerCase() === table.toLowerCase());
              
              if (possibleMatches.length > 0) {
                results[table].possibleMatches = possibleMatches;
              }
            }
          }
        } else {
          results[table] = { 
            exists: true,
            count: sampleData?.length || 0,
            sample: sampleData,
            columns: sampleData && sampleData.length > 0 
              ? Object.keys(sampleData[0]) 
              : []
          };
        }
      } catch (tableError) {
        results[table] = { error: tableError instanceof Error ? tableError.message : 'Unknown error' };
      }
    }
    
    return NextResponse.json({ data: results }, { status: 200 });
  } catch (error) {
    console.error('Error checking tables:', error);
    return NextResponse.json(
      { error: 'Failed to check tables: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

function organizeSchemaInfo(columns: any[]) {
  const result: Record<string, any> = {};
  
  for (const column of columns) {
    const tableName = column.table_name;
    if (!result[tableName]) {
      result[tableName] = [];
    }
    
    result[tableName].push({
      name: column.column_name,
      type: column.data_type
    });
  }
  
  return result;
}
