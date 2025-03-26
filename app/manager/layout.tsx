"use client"

import type React from "react"
import Sidebar from "@/components/layout/sidebar"
import { useAuth } from "@/contexts/auth-context"

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8F8FF]">
      <Sidebar userRole="manager" userName={user?.name || "Manager"} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
