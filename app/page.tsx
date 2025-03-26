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
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type FormData = {
  phone: string
  password: string
}

export default function LoginPage() {
  const { login, user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (user) {
      router.push(`/${user.role}`);
    }
  }, [user, router, isLoading]);

  const form = useForm<FormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true)
      await login(data.phone, data.password)
    } catch (error) {
      if (error instanceof Error && error.message.includes("pending admin approval")) {
        toast({
          title: "Account Pending Approval",
          description: "Your account is pending admin approval. Please wait for approval before logging in.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Login failed",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
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
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-[#228B22] hover:bg-[#1a6b1a] text-white" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
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
