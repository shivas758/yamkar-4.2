import { NextRequest, NextResponse } from "next/server";
import { supabase } from "./supabaseClient";

export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return { authenticated: false, error: 'Invalid or expired token' };
    }
    
    return { authenticated: true, user: data.user };
  } catch (error) {
    console.error("Authentication error:", error);
    return { authenticated: false, error: 'Authentication error' };
  }
}

// Helper function to create authenticated API handlers
export function withAuth(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const auth = await authenticateRequest(request);
    
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    
    return handler(request, auth.user);
  };
} 