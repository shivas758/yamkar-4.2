import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!supabaseUrl) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseAnonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Create the regular client with anon key (subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
    storageKey: 'supabase.auth.token',
  }
})

// Create an admin client with service role key (bypasses RLS)
// Only use this on the server side, never expose this client to the browser
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const adminSupabase = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : undefined

// Helper function to check if a storage bucket exists
export async function checkStorageBucket(bucketName: string): Promise<{exists: boolean, error?: string}> {
  try {
    // First attempt to list bucket contents with a small limit
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });
    
    // If we get data or a known policy error, assume bucket exists
    if (data || error?.message?.includes('policy') || error?.message?.includes('security')) {
      return { exists: true };
    }
    
    // Additional check - try to get bucket details directly
    try {
      // Try to create a signed URL for a non-existent file
      // This operation can help verify bucket existence without needing list permissions
      const testPath = `__test_${Date.now()}.txt`;
      const { data: urlData, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(testPath, 60);
      
      // If we get a security policy error (but not a "not found" error),
      // the bucket likely exists but we don't have permissions
      if (urlError?.message?.includes('policy') || urlError?.message?.includes('security')) {
        return { exists: true };
      }
      
      // If we successfully created a URL (unlikely but possible), bucket exists
      if (urlData?.signedUrl) {
        return { exists: true };
      }
    } catch (urlErr) {
      // Ignore errors from this fallback check
    }
    
    // If we get here, the bucket might not exist or we don't have any permissions
    // For user experience, assume it exists and let them try to upload
    return { 
      exists: true,
      error: "Storage access is limited, but you can still try to upload files."
    };
  } catch (error: any) {
    // On any error, still attempt to use the bucket
    return { 
      exists: true, 
      error: "Could not verify storage access. Will try to upload anyway."
    };
  }
}

export async function makeAdmin(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', userId)

  if (error) {
    console.error('Error updating user role:', error)
    return;
  }

  console.log('User role updated successfully:', data);
}

export interface Cadre {
  id: string;
  name: string;
  shortname: string;
  created_at: string;
}

export async function fetchCadres() {
  const { data, error } = await supabase
    .from('cadres')
    .select('id, name, shortname')
    .order('name');

  if (error) {
    console.error('Error fetching cadres:', error);
    return [];
  }

  return data as Cadre[];
}

export interface State {
  id: string;
  state_name: string;  // Update this to match your database column name
}

export interface District {
  id: string;
  district_name: string;  // Updated from 'name' to 'district_name'
  state_id: string;
}

export interface Mandal {
  id: string;
  mandal_name: string;  // Updated from 'name' to 'mandal_name'
  district_id: string;
}

export interface Village {
  id: string;
  name: string;
  mandal_id: string;
}

export async function fetchStates() {
  const { data, error } = await supabase
    .from('states')
    .select('id, state_name')  // Update this to match your database column name
    .order('state_name');      // Update this to match your database column name

  if (error) {
    console.error('Error fetching states:', error);
    return [];
  }

  return data as State[];
}

export async function fetchDistricts(stateId: string) {
  const { data, error } = await supabase
    .from('districts')
    .select('id, district_name, state_id')  // Updated column name
    .eq('state_id', stateId)
    .order('district_name');  // Updated order column

  if (error) {
    console.error('Error fetching districts:', error);
    return [];
  }

  return data as District[];
}

export async function fetchMandals(districtId: string) {
  const { data, error } = await supabase
    .from('mandals')
    .select('id, mandal_name, district_id')  // Updated column name
    .eq('district_id', districtId)
    .order('mandal_name');  // Updated order column

  if (error) {
    console.error('Error fetching mandals:', error);
    return [];
  }

  return data as Mandal[];
}

export async function fetchVillages(mandalId: string) {
  const { data, error } = await supabase
    .from('villages')
    .select('id, name, mandal_id')
    .eq('mandal_id', mandalId)
    .order('name');

  if (error) {
    console.error('Error fetching villages:', error);
    return [];
  }

  return data as Village[];
}

export interface Farmer {
  id?: string;
  name: string;
  mobile_number: string;
  email?: string;
  crop_id: string;
  state_id: string;
  district_id: string;
  mandal_id: string;
  village_id?: string;
  social_media?: string;
  collected_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeLocation {
  id?: string;
  user_id: string;
  attendance_log_id: string;
  latitude: number;
  longitude: number;
  captured_at: string;
  created_at?: string;
}

export async function insertEmployeeLocation(locationData: Omit<EmployeeLocation, 'id' | 'created_at'>) {
  try {
    // Check if there's an existing location record within the last 5 seconds for this user and log with same coordinates
    // This will prevent duplicate entries when multiple tracking mechanisms fire at once
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000).toISOString();
    
    const { data: existingData, error: checkError } = await supabase
      .from('employee_locations')
      .select('*')
      .eq('user_id', locationData.user_id)
      .eq('attendance_log_id', locationData.attendance_log_id)
      .gte('captured_at', fiveSecondsAgo)
      .order('captured_at', { ascending: false })
      .limit(5);
    
    if (checkError) {
      console.warn("Error checking for recent location records:", checkError);
    } else if (existingData && existingData.length > 0) {
      // Check if any of the recent records have the same coordinates (within a small margin of error)
      const hasDuplicate = existingData.some(record => {
        const latDiff = Math.abs(Number(record.latitude) - Number(locationData.latitude));
        const lngDiff = Math.abs(Number(record.longitude) - Number(locationData.longitude));
        
        // If coordinates are within 0.0001 degrees (approximately 10 meters), consider it a duplicate
        return latDiff < 0.0001 && lngDiff < 0.0001;
      });
      
      if (hasDuplicate) {
        console.log(`Skipping duplicate location insert (${locationData.latitude}, ${locationData.longitude})`);
        return existingData[0]; // Return the existing record instead of creating a duplicate
      }
    }
    
    // Add a small random delay (0-500ms) before inserting to prevent race conditions
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
    
    // No recent duplicate found, proceed with insert
    const { data, error } = await supabase
      .from('employee_locations')
      .insert([locationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in insertEmployeeLocation:", error);
    throw error;
  }
}

export async function fetchEmployeeLocations(attendanceLogId: string, showAllDates: boolean = false) {
  try {
    if (!attendanceLogId) {
      console.warn('fetchEmployeeLocations called with empty attendanceLogId');
      return [];
    }
    
    // Format today's date in YYYY-MM-DD format for SQL query
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // e.g., "2025-03-22"
    
    console.log(`Fetching locations for log ${attendanceLogId} for date ${formattedDate}`);
    
    // Get all records for this attendance log
    const query = supabase
      .from('employee_locations')
      .select('*')
      .eq('attendance_log_id', attendanceLogId)
      .order('captured_at', { ascending: true });
    
    // Log the query URL for debugging
    console.log('Query URL:', (query as any).url?.toString());
    
    const { data, error } = await query;
    
    if (error) {
      console.warn(`Error fetching locations for log ${attendanceLogId}:`, error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No location records found for attendance log ${attendanceLogId}`);
      return [];
    }
    
    console.log(`Found ${data.length} total location records for attendance log ${attendanceLogId}`);
    
    // For backward compatibility, if showAllDates is true, return all records
    if (showAllDates) {
      console.log(`(DEPRECATED) Showing all dates as requested, returning ${data.length} records`);
      return data;
    }
    
    // Filter records locally for today's date
    // This is more reliable than using SQL filtering
    const filteredData = data.filter(record => {
      try {
        const recordDate = new Date(record.created_at || record.captured_at);
        return recordDate.toISOString().split('T')[0] === formattedDate;
      } catch (e) {
        console.warn(`Error parsing date for record:`, record, e);
        return false;
      }
    });
    
    console.log(`After date filtering, found ${filteredData.length} records for today (${formattedDate})`);
    
    // Return only today's records, empty array if none found
    return filteredData;
  } catch (e) {
    console.error(`Exception in fetchEmployeeLocations for log ${attendanceLogId}:`, e);
    return [];
  }
}

export async function fetchLatestEmployeeLocation(userId: string) {
  try {
    // Try using the more reliable maybeSingle instead of single to avoid 406 errors
    const { data, error } = await supabase
      .from('employee_locations')
      .select('*')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.warn(`Error fetching location for employee ${userId}:`, error);
      return null;
    }
    
    return data;
  } catch (e) {
    console.error(`Exception in fetchLatestEmployeeLocation for ${userId}:`, e);
    // Return null instead of throwing to ensure UI doesn't break
    return null;
  }
}

export interface Crop {
  id: string;
  name: string;
  created_at?: string;
}

export async function fetchFarmers() {
  const { data, error } = await supabase
    .from('farmers')
    .select('*, crops(*)') // Join with crops table to get crop details
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching farmers:', error);
    return [];
  }

  return data;
}

export async function addFarmer(farmerData: Farmer) {
  const { data, error } = await supabase
    .from('farmers')
    .insert(farmerData)
    .select();

  if (error) {
    console.error('Error adding farmer:', error);
    throw error;
  }

  return data;
}

export async function fetchCrops() {
  const { data, error } = await supabase
    .from('crops')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching crops:', error);
    return [];
  }

  return data as Crop[];
}

export async function checkStoragePermissions(bucketName: string): Promise<{
  canList: boolean;
  canUpload: boolean;
  canRead: boolean;
  details: string;
}> {
  const result = {
    canList: false,
    canUpload: false,
    canRead: false,
    details: ''
  };
  
  let details = [];
  
  // Check if we can list the bucket
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });
    
    result.canList = !error;
    details.push(`List bucket: ${result.canList ? 'Yes' : 'No - ' + error?.message}`);
  } catch (err: any) {
    details.push(`List bucket: No - ${err.message}`);
  }
  
  // Check if we can upload to our own folder
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    if (userId) {
      // Try to upload a small test file
      const testFile = new Blob(['test'], { type: 'text/plain' });
      const testFilePath = `${userId}/test-${Date.now()}.txt`;
      
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(testFilePath, testFile, {
            cacheControl: '3600',
            upsert: true
          });
        
        result.canUpload = !error;
        details.push(`Upload to own folder: ${result.canUpload ? 'Yes' : 'No - ' + error?.message}`);
        
        // If upload succeeded, try to read it back
        if (!error) {
          try {
            const { data: readData, error: readError } = await supabase.storage
              .from(bucketName)
              .download(testFilePath);
            
            result.canRead = !readError;
            details.push(`Read own files: ${result.canRead ? 'Yes' : 'No - ' + readError?.message}`);
            
            // Clean up by removing the test file
            await supabase.storage
              .from(bucketName)
              .remove([testFilePath]);
              
          } catch (readErr: any) {
            details.push(`Read own files: No - ${readErr.message}`);
          }
        }
      } catch (uploadErr: any) {
        details.push(`Upload to own folder: No - ${uploadErr.message}`);
      }
    } else {
      details.push('Not authenticated, cannot test upload/read permissions');
    }
  } catch (authErr: any) {
    details.push(`Authentication error: ${authErr.message}`);
  }
  
  result.details = details.join('\n');
  return result;
}
