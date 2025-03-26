"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function DatabaseDebugger() {
  const [results, setResults] = useState<{
    tables: Record<string, boolean>;
    columns: Record<string, Record<string, boolean>>;
    details: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredTables = [
    'users',
    'attendance_logs',
    'employee_locations',
    'storage.objects',
    'storage.buckets',
    'daily_work_summary'
  ];

  const requiredColumns = {
    'attendance_logs': [
      'id', 'user_id', 'check_in', 'check_out', 'duration_minutes', 
      'check_in_meter_reading', 'check_out_meter_reading',
      'check_in_meter_image', 'check_out_meter_image', 'distance_traveled'
    ],
    'employee_locations': [
      'id', 'user_id', 'attendance_log_id', 'latitude', 'longitude', 'captured_at'
    ],
    'users': [
      'id', 'name', 'email', 'is_active', 'role'
    ]
  };

  const runDatabaseCheck = async () => {
    console.log("[DEBUG] Starting database check");
    setLoading(true);
    setError(null);
    
    try {
      const tableResults: Record<string, boolean> = {};
      const columnResults: Record<string, Record<string, boolean>> = {};
      const details: string[] = [];
      
      // First, check if tables exist
      for (const tableName of requiredTables) {
        try {
          console.log(`[DEBUG] Checking if table exists: ${tableName}`);
          
          // For storage tables, we need a different approach
          if (tableName.startsWith('storage.')) {
            // Simply try to query from the table
            const { data, error } = await supabase
              .from(tableName.replace('storage.', ''))
              .select('*')
              .limit(1);
              
            if (error && error.code === '42P01') { // Relation doesn't exist
              tableResults[tableName] = false;
              details.push(`❌ Table "${tableName}" does not exist`);
            } else {
              tableResults[tableName] = true;
              details.push(`✅ Table "${tableName}" exists`);
            }
          } else {
            // For regular tables
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
              
            if (error && error.code === '42P01') { // Relation doesn't exist
              tableResults[tableName] = false;
              details.push(`❌ Table "${tableName}" does not exist`);
            } else {
              tableResults[tableName] = true;
              details.push(`✅ Table "${tableName}" exists`);
              
              // If table exists and we have column requirements for it, check columns
              if (requiredColumns[tableName as keyof typeof requiredColumns]) {
                columnResults[tableName] = {};
                console.log(`[DEBUG] Checking columns for table: ${tableName}`);
                
                // Get column info by selecting with single()
                try {
                  const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1)
                    .single();
                    
                  if (data) {
                    for (const column of requiredColumns[tableName as keyof typeof requiredColumns]) {
                      const exists = column in data;
                      columnResults[tableName][column] = exists;
                      
                      if (exists) {
                        details.push(`  ✅ Column "${column}" exists in "${tableName}"`);
                      } else {
                        details.push(`  ❌ Column "${column}" is missing from "${tableName}"`);
                      }
                    }
                  } else {
                    details.push(`  ⚠️ Could not verify columns for empty table "${tableName}"`);
                  }
                } catch (err) {
                  console.error(`[DEBUG] Error checking columns for table ${tableName}:`, err);
                  details.push(`  ⚠️ Error checking columns for "${tableName}"`);
                }
              }
            }
          }
        } catch (err) {
          console.error(`[DEBUG] Error checking table ${tableName}:`, err);
          tableResults[tableName] = false;
          details.push(`❌ Error checking table "${tableName}"`);
        }
      }
      
      setResults({
        tables: tableResults,
        columns: columnResults,
        details
      });
      
    } catch (err: any) {
      console.error("[DEBUG] Database check error:", err);
      setError(`Error running database checks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Database Structure Debugger</CardTitle>
        <CardDescription>Check if required tables and columns exist in your database</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Checking database structure...</span>
          </div>
        ) : results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <h3 className="font-medium text-lg">Table Status:</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {Object.entries(results.tables).map(([table, exists]) => (
                  <div key={table} className="flex items-center mb-2">
                    {exists ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span className={exists ? 'text-green-700' : 'text-red-700'}>
                      {table}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium text-lg mb-2">Details:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap overflow-y-auto max-h-60">
                {results.details.join('\n')}
              </pre>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-lg flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-700">Click the button below to check your database structure.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={runDatabaseCheck} 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Checking...
            </>
          ) : (
            'Check Database Structure'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 