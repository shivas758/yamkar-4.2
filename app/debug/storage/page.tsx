"use client";

import StoragePermissionsTester from "@/components/StoragePermissionsTester";
import DatabaseDebugger from "@/components/DatabaseDebugger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function StorageDebugPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-[#228B22] mb-2">Storage Permissions Debug</h1>
        <p className="text-[#6B8E23]">Use this page to diagnose storage-related issues</p>
      </div>

      <div className="grid gap-8">
        <StoragePermissionsTester />
        
        <DatabaseDebugger />

        <Card>
          <CardHeader>
            <CardTitle>Supabase SQL Migration</CardTitle>
            <CardDescription>Run this SQL in your Supabase SQL editor</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-sm overflow-x-auto whitespace-pre">
{`-- Create the meter-readings bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-readings', 'meter-readings', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for meter-readings bucket
DROP POLICY IF EXISTS "Users can upload their own meter readings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own meter readings" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own meter readings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list meter-readings bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can read all meter readings" ON storage.objects;

-- Create the policies fresh
CREATE POLICY "Users can upload their own meter readings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meter-readings' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can update their own meter readings"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'meter-readings' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Users can read their own meter readings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meter-readings' AND
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Authenticated users can list meter-readings bucket"
ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'meter-readings'
);

CREATE POLICY "Admins and managers can read all meter readings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meter-readings' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() AND
    (auth.users.role = 'admin' OR auth.users.role = 'manager')
  )
);`}
            </pre>
            <div className="mt-4 bg-amber-50 p-4 rounded-md border border-amber-200">
              <p className="text-amber-800">
                Copy and paste the SQL above into your Supabase SQL editor and run it to reset your storage policies.
                This will fix permission issues with the meter readings bucket.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 