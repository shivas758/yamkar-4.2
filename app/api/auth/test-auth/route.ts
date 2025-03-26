import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request): Promise<NextResponse> {
  const { email, password } = await request.json();

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user) {
      console.error('No user found with that email');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.password !== password) {
      console.error('Incorrect password');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Authentication successful', user }, { status: 200 });
  } catch (error: any) {
    console.error('Error during authentication:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}