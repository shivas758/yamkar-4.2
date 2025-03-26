import { NextResponse } from 'next/server'
import { makeAdmin } from '@/lib/supabaseClient'

export async function POST(request: Request): Promise<NextResponse> {
  const userId = "2e2a37e3-83bf-4d3f-ae85-894da2ab5873";

  try {
    await makeAdmin(userId);
    return NextResponse.json({ message: 'Admin role updated successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating admin role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}