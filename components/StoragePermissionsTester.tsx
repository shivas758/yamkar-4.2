"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { checkStoragePermissions } from "@/lib/supabaseClient";

export default function StoragePermissionsTester() {
  const [results, setResults] = useState<{
    canList: boolean;
    canUpload: boolean;
    canRead: boolean;
    details: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const permissions = await checkStoragePermissions('meter-readings');
      setResults(permissions);
    } catch (err: any) {
      setError(`Error running tests: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Storage Permissions Tester</CardTitle>
        <CardDescription>Test your storage bucket permissions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Running tests...</span>
          </div>
        ) : results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg flex items-center ${results.canList ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {results.canList ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                <div>
                  <p className="font-medium">List Bucket</p>
                  <p className="text-sm opacity-75">{results.canList ? 'Permission granted' : 'Permission denied'}</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg flex items-center ${results.canUpload ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {results.canUpload ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                <div>
                  <p className="font-medium">Upload Files</p>
                  <p className="text-sm opacity-75">{results.canUpload ? 'Permission granted' : 'Permission denied'}</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg flex items-center ${results.canRead ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {results.canRead ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                <div>
                  <p className="font-medium">Read Files</p>
                  <p className="text-sm opacity-75">{results.canRead ? 'Permission granted' : 'Permission denied'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="font-medium mb-2">Details:</h3>
              <pre className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap">
                {results.details}
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
            <p className="text-blue-700">Click the button below to test your storage permissions.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={runTests} 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Running Tests...
            </>
          ) : (
            'Test Storage Permissions'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 