import { NextRequest, NextResponse } from 'next/server';
import { supabase, adminSupabase } from '@/lib/supabaseClient';
import { withAuth } from '@/lib/auth-middleware';

async function initializeStorage(request: NextRequest, user: any) {
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can initialize storage' },
      { status: 403 }
    );
  }

  // Proceed with initialization if user is admin
  try {
    const bucketName = 'meter-readings';
    
    // Verify if adminSupabase client is available (should be in production)
    if (!adminSupabase) {
      return NextResponse.json(
        { error: 'Admin Supabase client not available. Service role key is missing.' },
        { status: 500 }
      );
    }

    // Try to create the bucket
    const { data: createData, error: createError } = await adminSupabase.storage.createBucket(
      bucketName,
      {
        public: false,
        fileSizeLimit: 5 * 1024 * 1024 // 5MB limit
      }
    );

    if (createError) {
      // If error is because bucket already exists, that's fine
      if (createError.message?.includes('already exists')) {
        return NextResponse.json({
          success: true,
          message: `Bucket '${bucketName}' already exists`
        });
      }

      return NextResponse.json(
        { error: `Failed to create bucket: ${createError.message}` },
        { status: 500 }
      );
    }

    // Set up RLS policies
    const policyStatements = [
      // Base policy for authenticated users to view their own folders
      `
      CREATE POLICY "Authenticated users can upload to their folder" 
      ON storage.objects FOR INSERT TO authenticated 
      USING (
        bucket_id = '${bucketName}' AND
        ((storage.foldername(name))[1] = 'odometer'::text) AND
        ((storage.foldername(name))[2] = auth.uid()::text)
      );
      `,
      // Allow users to update their own files
      `
      CREATE POLICY "Authenticated users can update their own files" 
      ON storage.objects FOR UPDATE TO authenticated 
      USING (
        bucket_id = '${bucketName}' AND
        ((storage.foldername(name))[1] = 'odometer'::text) AND
        ((storage.foldername(name))[2] = auth.uid()::text)
      );
      `,
      // Allow users to read their own files
      `
      CREATE POLICY "Authenticated users can read their own files" 
      ON storage.objects FOR SELECT TO authenticated 
      USING (
        bucket_id = '${bucketName}' AND
        ((storage.foldername(name))[1] = 'odometer'::text) AND
        ((storage.foldername(name))[2] = auth.uid()::text)
      );
      `,
      // Allow users to list the meter-readings bucket
      `
      CREATE POLICY "Authenticated users can list ${bucketName} bucket" 
      ON storage.objects FOR SELECT TO authenticated 
      USING (
        bucket_id = '${bucketName}'
      );
      `
    ];

    // Execute each policy statement
    for (const policyStatement of policyStatements) {
      try {
        await adminSupabase.rpc('admin_query', { query_text: policyStatement });
      } catch (policyError: any) {
        // If policy already exists, that's fine, continue
        if (policyError.message?.includes('already exists')) {
          console.log(`Policy already exists: ${policyError.message}`);
          continue;
        }
        
        console.error(`Error setting up policy: ${policyError.message}`);
        // We don't return error here, just log it and continue with other policies
      }
    }

    return NextResponse.json({
      success: true,
      message: `Storage bucket '${bucketName}' initialized successfully`
    });
  } catch (error: any) {
    console.error('Storage initialization error:', error);
    return NextResponse.json(
      { error: `Storage initialization failed: ${error.message}` },
      { status: 500 }
    );
  }
}

export const POST = withAuth(initializeStorage); 