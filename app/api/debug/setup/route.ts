import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const results: Record<string, any> = {};
    
    // Check if states table exists and create it if it doesn't
    const { error: statesCheckError } = await supabase
      .from('states')
      .select('id')
      .limit(1);
      
    if (statesCheckError) {
      console.log('Creating states table...');
      
      // Create states table
      const { error: createStatesError } = await supabase.rpc('create_states_table');
      
      if (createStatesError) {
        results.states = { error: createStatesError.message };
        
        // Try direct SQL if RPC fails
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS states (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              state_name TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Insert some sample states
            INSERT INTO states (state_name) VALUES 
              ('Andhra Pradesh'),
              ('Telangana'),
              ('Karnataka'),
              ('Tamil Nadu'),
              ('Maharashtra')
            ON CONFLICT (id) DO NOTHING;
          `
        });
        
        if (sqlError) {
          results.states_sql = { error: sqlError.message };
        } else {
          results.states_sql = { success: true };
        }
      } else {
        results.states = { success: true };
      }
    } else {
      results.states = { exists: true };
    }
    
    // Check if districts table exists and create it if it doesn't
    const { error: districtsCheckError } = await supabase
      .from('districts')
      .select('id')
      .limit(1);
      
    if (districtsCheckError) {
      console.log('Creating districts table...');
      
      // Create districts table
      const { error: createDistrictsError } = await supabase.rpc('create_districts_table');
      
      if (createDistrictsError) {
        results.districts = { error: createDistrictsError.message };
        
        // Try direct SQL if RPC fails
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS districts (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              district_name TEXT NOT NULL,
              state_id UUID REFERENCES states(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Insert some sample districts (assuming state IDs exist)
            -- This will need to be updated with actual state IDs
            INSERT INTO districts (district_name, state_id)
            SELECT 'Hyderabad', id FROM states WHERE state_name = 'Telangana'
            ON CONFLICT (id) DO NOTHING;
            
            INSERT INTO districts (district_name, state_id)
            SELECT 'Rangareddy', id FROM states WHERE state_name = 'Telangana'
            ON CONFLICT (id) DO NOTHING;
            
            INSERT INTO districts (district_name, state_id)
            SELECT 'Visakhapatnam', id FROM states WHERE state_name = 'Andhra Pradesh'
            ON CONFLICT (id) DO NOTHING;
          `
        });
        
        if (sqlError) {
          results.districts_sql = { error: sqlError.message };
        } else {
          results.districts_sql = { success: true };
        }
      } else {
        results.districts = { success: true };
      }
    } else {
      results.districts = { exists: true };
    }
    
    // Check if mandals table exists and create it if it doesn't
    const { error: mandalsCheckError } = await supabase
      .from('mandals')
      .select('id')
      .limit(1);
      
    if (mandalsCheckError) {
      console.log('Creating mandals table...');
      
      // Create mandals table
      const { error: createMandalsError } = await supabase.rpc('create_mandals_table');
      
      if (createMandalsError) {
        results.mandals = { error: createMandalsError.message };
        
        // Try direct SQL if RPC fails
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS mandals (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              mandal_name TEXT NOT NULL,
              district_id UUID REFERENCES districts(id),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Insert some sample mandals (assuming district IDs exist)
            -- This will need to be updated with actual district IDs
            INSERT INTO mandals (mandal_name, district_id)
            SELECT 'Secunderabad', id FROM districts WHERE district_name = 'Hyderabad'
            ON CONFLICT (id) DO NOTHING;
            
            INSERT INTO mandals (mandal_name, district_id)
            SELECT 'Kukatpally', id FROM districts WHERE district_name = 'Hyderabad'
            ON CONFLICT (id) DO NOTHING;
          `
        });
        
        if (sqlError) {
          results.mandals_sql = { error: sqlError.message };
        } else {
          results.mandals_sql = { success: true };
        }
      } else {
        results.mandals = { success: true };
      }
    } else {
      results.mandals = { exists: true };
    }
    
    // Check if crops table exists and create it if it doesn't
    const { error: cropsCheckError } = await supabase
      .from('crops')
      .select('id')
      .limit(1);
      
    if (cropsCheckError) {
      console.log('Creating crops table...');
      
      // Create crops table
      const { error: createCropsError } = await supabase.rpc('create_crops_table');
      
      if (createCropsError) {
        results.crops = { error: createCropsError.message };
        
        // Try direct SQL if RPC fails
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS crops (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Insert some sample crops
            INSERT INTO crops (name) VALUES 
              ('Rice'),
              ('Wheat'),
              ('Cotton'),
              ('Sugarcane'),
              ('Corn'),
              ('Vegetables'),
              ('Fruits')
            ON CONFLICT (id) DO NOTHING;
          `
        });
        
        if (sqlError) {
          results.crops_sql = { error: sqlError.message };
        } else {
          results.crops_sql = { success: true };
        }
      } else {
        results.crops = { success: true };
      }
    } else {
      results.crops = { exists: true };
    }
    
    // Check if farmers table exists and create it if it doesn't
    const { error: farmersCheckError } = await supabase
      .from('farmers')
      .select('id')
      .limit(1);
      
    if (farmersCheckError) {
      console.log('Creating farmers table...');
      
      // Create farmers table
      const { error: createFarmersError } = await supabase.rpc('create_farmers_table');
      
      if (createFarmersError) {
        results.farmers = { error: createFarmersError.message };
        
        // Try direct SQL if RPC fails
        const { error: sqlError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS farmers (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              phone TEXT NOT NULL,
              location TEXT NOT NULL,
              crop_id UUID REFERENCES crops(id),
              social_media TEXT DEFAULT '',
              collected_by TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `
        });
        
        if (sqlError) {
          results.farmers_sql = { error: sqlError.message };
        } else {
          results.farmers_sql = { success: true };
        }
      } else {
        results.farmers = { success: true };
      }
    } else {
      results.farmers = { exists: true };
    }
    
    return NextResponse.json({ data: results }, { status: 200 });
  } catch (error) {
    console.error('Error setting up tables:', error);
    return NextResponse.json(
      { error: 'Failed to set up tables: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
} 