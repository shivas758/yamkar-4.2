import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fakeUser = {
  id: "fake-user-id",
  email: "test@example.com",
  password: "password",
  name: "Test User",
  role: "employee",
}
