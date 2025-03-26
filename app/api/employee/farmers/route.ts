import { NextRequest, NextResponse } from 'next/server';
import { supabase, fetchFarmers, Farmer } from '@/lib/supabaseClient';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Helper function to validate UUID format
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Validation schema for farmer data
const farmerSchema = z.object({
  name: z.string().min(3, { message: "Name should be at least 3 characters" }),
  mobile_number: z.string().min(10, { message: "Mobile number should be at least 10 digits" }),
  email: z.string().email().optional(),
  state_id: z.string().uuid({ message: "Invalid state ID" }),
  district_id: z.string().uuid({ message: "Invalid district ID" }),
  mandal_id: z.string().uuid({ message: "Invalid mandal ID" }),
  village_id: z.string().uuid({ message: "Invalid village ID" }).optional(),
  crop_id: z.string().uuid({ message: "Invalid crop ID" }),
  social_media: z.string().optional(),
  collected_by: z.string().uuid({ message: "Invalid collector ID" })
});

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('farmers')
      .select(`
        *,
        state:states(id, state_name),
        district:districts(id, district_name),
        mandal:mandals(id, mandal_name),
        village:villages(id, name),
        crop:crops(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching farmers:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching farmers:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received farmer data:', body);
    
    const validationResult = farmerSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }

    const farmerData = validationResult.data;
    console.log('Validated farmer data:', farmerData);

    // Simple insert with regular client (RLS is disabled)
    const { data, error } = await supabase
      .from('farmers')
      .insert(farmerData)
      .select()
      .single();

    if (error) {
      console.error('Error inserting farmer:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log('Farmer data inserted successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error adding farmer:', error);
    return NextResponse.json(
      { error: 'Failed to add farmer data' },
      { status: 500 }
    );
  }
}

// Helper function to create a client with an auth token
// This sets the session on the existing supabase client and returns it
// Note: This approach modifies the global supabase client, which is fine for
// server-side API routes but would not be appropriate for client-side code
async function createClientWithToken(token: string) {
  if (!token) {
    console.warn('No token provided to createClientWithToken');
    return supabase; // Return default client if no token
  }
  
  try {
    console.log('Setting auth session with token...');
    // Set the session on the existing client
    // This modifies the global supabase client to use this auth token
    const { data, error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '',
    });
    
    if (error) {
      console.error('Error setting auth session:', error);
      return supabase; // Return default client if session setting fails
    }
    
    if (data.session) {
      console.log('Successfully set auth session with token');
    } else {
      console.warn('No session data returned after setting auth token');
    }
    
    // Return the client with the session set
    return supabase;
  } catch (error) {
    console.error('Exception setting auth session:', error);
    return supabase; // Return the default client if session setting fails
  }
} 