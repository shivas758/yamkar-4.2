'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';

export default function StorageInitPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const initializeStorage = async () => {
    try {
      setStatus('loading');
      setMessage('Initializing storage...');

      // Get current session
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setStatus('error');
        setMessage('No active session. Please log in first.');
        return;
      }

      // Call our API endpoint to initialize storage
      const response = await fetch('/api/storage/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setMessage(`Error: ${data.error || 'Unknown error'}`);
        return;
      }

      setStatus('success');
      setMessage(data.message || 'Storage initialized successfully');
    } catch (error: any) {
      setStatus('error');
      setMessage(`Exception: ${error.message}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Storage Initialization</CardTitle>
          <CardDescription>
            Use this page to initialize or repair Supabase storage buckets needed by the application.
            Only administrators can perform this action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'idle' && (
            <Alert className={`mb-4 ${status === 'error' ? 'bg-red-50' : status === 'success' ? 'bg-green-50' : ''}`}>
              <AlertTitle>{status === 'loading' ? 'Processing' : status === 'success' ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          
          <p className="text-sm text-muted-foreground mb-4">
            This will create the necessary storage buckets and set up the proper security policies.
            If the buckets already exist, it will ensure policies are correctly configured.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={initializeStorage} 
            disabled={status === 'loading'} 
            className="w-full"
          >
            {status === 'loading' ? 'Initializing...' : 'Initialize Storage'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 