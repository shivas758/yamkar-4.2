import { z } from "zod";
import { fetchCadres } from "./supabaseClient";

// Helper function to create dynamic enum schema
const createCadreSchema = async () => {
  const cadres = await fetchCadres();
  const cadreValues = cadres.map(cadre => cadre.name);
  return z.enum(cadreValues as [string, ...string[]]);
};

export const loginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),
  password: z.string().min(1, "Password must be at least 1 character"),
});

export const signupSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Invalid email address.",
  }).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, {
    message: "Invalid phone number. Must be 10 digits starting with 6-9",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  role: z.enum(["employee", "manager"]),
  cadre: z.string().optional(),
  manager_id: z.string().optional(),
  driving_license: z.string().optional(),
  aadhar_number: z.string().optional(),
  pan_number: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  mandal: z.string().optional(),
});
export const employeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  employeeId: z.string().min(4, "Employee ID must be at least 4 characters"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  role: z.string().min(1, "Role is required"),
})

export const farmerDataSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
  email: z.string().email("Invalid email address").optional(),
  crop: z.string().min(1, "Crop type is required"),
  location: z.string().min(1, "Location is required"),
  products: z.array(z.string()).min(1, "At least one product is required"),
})
