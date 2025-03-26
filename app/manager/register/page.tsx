"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Mail, Phone, Building, Users, CheckCircle, MapPin } from "lucide-react"

export default function EmployeeRegistrationPage() {
  const [formSubmitted, setFormSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would save the data to Supabase
    setFormSubmitted(true)
  }

  if (formSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-[#228B22]" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#228B22] mb-2">Registration Successful</h2>
            <p className="text-[#6B8E23] mb-6">
              The employee has been registered successfully and is pending admin approval.
            </p>
            <div className="space-y-3">
              <Button className="w-full bg-[#228B22] hover:bg-[#1a6b1a]" onClick={() => setFormSubmitted(false)}>
                Register Another Employee
              </Button>
              <Button variant="outline" className="w-full border-[#6B8E23] text-[#6B8E23]" asChild>
                <a href="/manager/employees">View Employee List</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Register New Employee</h1>
        <p className="text-[#6B8E23]">Create a new employee account that will require admin approval</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#228B22]">Employee Information</CardTitle>
          <CardDescription>
            Fill in the details below to register a new employee. All fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Full Name *
                  </Label>
                  <Input id="name" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee-id" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Employee ID *
                  </Label>
                  <Input id="employee-id" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    Email Address *
                  </Label>
                  <Input id="email" type="email" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Mobile Number *
                  </Label>
                  <Input id="phone" type="tel" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Role *
                  </Label>
                  <Select required>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="field-agent">Field Agent</SelectItem>
                      <SelectItem value="sales-rep">Sales Representative</SelectItem>
                      <SelectItem value="tech-support">Technical Support</SelectItem>
                      <SelectItem value="admin-staff">Administrative Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    Department *
                  </Label>
                  <Select required>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="admin">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location/Region *
                </Label>
                <Select required>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North Region</SelectItem>
                    <SelectItem value="south">South Region</SelectItem>
                    <SelectItem value="east">East Region</SelectItem>
                    <SelectItem value="west">West Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t flex flex-col md:flex-row gap-3 justify-end">
              <Button type="button" variant="outline" className="border-[#D3D3D3] text-[#D3D3D3]" asChild>
                <a href="/manager/employees">Cancel</a>
              </Button>
              <Button type="submit" className="bg-[#228B22] hover:bg-[#1a6b1a]">
                Register Employee
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

