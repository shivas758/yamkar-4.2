"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Shield, Clock, Key } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import PasswordChangePopup from "@/components/PasswordChangePopup"

export default function AdminDashboard() {
  const [showPasswordChangePopup, setShowPasswordChangePopup] = useState(false);
  const stats = [
    { label: "Total Managers", value: "8" },
    { label: "Total Employees", value: "124" },
    { label: "Pending Approvals", value: "5" },
    { label: "Active Users", value: "98" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Admin Dashboard</h1>
        <p className="text-[#6B8E23]">System Administration</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-2xl font-bold text-[#228B22]">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                <Users className="h-6 w-6 text-[#228B22]" />
              </div>
              <Button variant="ghost" className="text-[#6B8E23]" asChild>
                <Link href="/admin/managers">View Managers</Link>
              </Button>
            </div>
            <h2 className="text-lg font-semibold mb-2">Manager Management</h2>
            <p className="text-sm text-muted-foreground">View and manage manager accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                <Users className="h-6 w-6 text-[#228B22]" />
              </div>
              <Button variant="ghost" className="text-[#6B8E23]" asChild>
                <Link href="/admin/employees">View Employees</Link>
              </Button>
            </div>
            <h2 className="text-lg font-semibold mb-2">Employee Management</h2>
            <p className="text-sm text-muted-foreground">View and manage all employee accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-[#228B22]" />
              </div>
              <Button variant="ghost" className="text-[#6B8E23]" asChild>
                <Link href="/admin/approvals">View Approvals</Link>
              </Button>
            </div>
            <h2 className="text-lg font-semibold mb-2">Pending Approvals</h2>
            <p className="text-sm text-muted-foreground">Review and approve new account requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-[#228B22]" />
              </div>
              <Button variant="ghost" className="text-[#6B8E23]" asChild>
                <Link href="/admin/security">Security Settings</Link>
              </Button>
            </div>
            <h2 className="text-lg font-semibold mb-2">Security</h2>
            <p className="text-sm text-muted-foreground">Configure system-wide security settings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                <Key className="h-6 w-6 text-[#228B22]" />
              </div>
              <Button 
                variant="ghost" 
                className="text-[#6B8E23]"
                onClick={() => setShowPasswordChangePopup(true)}
              >
                Change Password
              </Button>
            </div>
            <h2 className="text-lg font-semibold mb-2">Password</h2>
            <p className="text-sm text-muted-foreground">Update your account password</p>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Popup */}
      <PasswordChangePopup
        isOpen={showPasswordChangePopup}
        onClose={() => setShowPasswordChangePopup(false)}
      />
    </div>
  )
}

