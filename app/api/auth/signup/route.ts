import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { signupSchema } from "@/lib/validations";




export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    // Create a pseudo-email using phone number
    const pseudoEmail = `${validatedData.phone}@pseudo.local`;

    // Sign up with pseudo-email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: pseudoEmail,
      password: validatedData.password,
    });

    if (authError) {
      console.error("Error signing up:", authError);
      return NextResponse.json({ message: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;

    // Define a proper type for user data to handle optional fields
    type UserData = {
      id: string | undefined;
      name: string;
      phone: string;
      email: string;
      role: "employee" | "manager";
      status: string;
      driving_license: string | undefined;
      aadhar_number: string | undefined;
      pan_number: string | undefined;
      state: string | undefined;
      district: string | undefined;
      cadre?: string | undefined;
      manager_id?: string | undefined;
      mandal?: string | undefined;
    };

    // Prepare user data with correct column names
    const userData: UserData = {
      id: userId,
      name: validatedData.name,
      phone: validatedData.phone,
      email: validatedData.email || pseudoEmail, // Use pseudo-email if no real email provided
      role: validatedData.role,
      status: 'pending',
      // Common fields for both managers and employees
      driving_license: validatedData.driving_license,
      aadhar_number: validatedData.aadhar_number,
      pan_number: validatedData.pan_number,
      state: validatedData.state,
      district: validatedData.district,
    };

    // Add employee-specific fields only if role is employee
    if (validatedData.role === 'employee') {
      userData.cadre = validatedData.cadre;
      userData.manager_id = validatedData.manager_id;
      userData.mandal = validatedData.mandal;
    }

    const { error: userError } = await supabase
      .from('users')
      .insert([userData]);

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json({ message: userError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Signup successful" }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Something went wrong" },
      { status: 400 }
    );
  }
}
