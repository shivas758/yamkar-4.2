"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/contexts/auth-context"
import { loginSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Leaf } from "lucide-react"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Capacitor } from '@capacitor/core'

type FormData = {
  phone: string
  password: string
}

export default function LoginPage() {
  const { login, user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter();
  
  // Check if running in Capacitor (native app)
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isSubmitting) {
      return;
    }
    if (user) {
      router.push(`/${user.role}`);
    }
  }, [user, router, isSubmitting]);

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    setIsLoading(true);
    setIsSubmitting(true);
    
    // Create a timeout promise that rejects after 15 seconds
    const timeoutPromise = new Promise((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error("Login timed out. Please try again."));
      }, 15000); // 15 seconds timeout
    });
    
    try {
      // Race the login against the timeout
      await Promise.race([
        login(data.phone, data.password),
        timeoutPromise
      ]);
      
      // If we're in the native app, show a success toast
      if (isNative) {
        toast({
          title: "Login Successful",
          description: "You have been logged in successfully.",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("pending admin approval")) {
          toast({
            title: "Account Pending Approval",
            description: "Your account is pending admin approval. Please wait for approval before logging in.",
            variant: "destructive",
          });
        } else if (error.message.includes("timed out")) {
          toast({
            title: "Login Timeout",
            description: "The login process is taking longer than expected. Your login may still complete in the background.",
            variant: "destructive",
          });
          
          // Special handling for timeouts in the native app
          if (isNative) {
            toast({
              title: "Try Again",
              description: "Please close the app and try again. Your login may have succeeded in the background.",
            });
          }
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred during login.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      // Keep isSubmitting true if we're in a Capacitor app to prevent multiple login attempts
      // which could cause state issues
      if (!isNative) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F8FF] p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-[#228B22] flex items-center justify-center mb-4">
            <Leaf className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#228B22]">Yamkar</h1>
          <p className="text-[#6B8E23] mt-2">Employee Management System</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your phone number"
                        {...field}
                        type="tel"
                        maxLength={10}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter your password"
                        className="w-full border-[#D3D3D3] focus:border-[#228B22] focus:ring-[#228B22]"
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-[#228B22] hover:bg-[#1a6b1a] text-white" disabled={isLoading || isSubmitting}>
                {isLoading ? "Logging in..." : isSubmitting ? "Please wait..." : "Login"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <a href="/forgot-password" className="text-[#6B8E23] text-sm hover:underline">
              Forgot Password?
            </a>
          </div>

          <div className="mt-4 text-center">
            <a href="/signup" className="text-[#6B8E23] text-sm hover:underline">
              Create Account
            </a>
          </div>

          <div className="text-center text-sm text-[#D3D3D3] mt-4">
            © {new Date().getFullYear()} Yamkar. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
