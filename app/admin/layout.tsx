"use client";

import type React from "react";
import SidebarComponent from "@/components/layout/sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { User } from "@/types";
import { useAuth } from "@/contexts/auth-context";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({
  children,
}: AdminLayoutProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user?.role !== "admin") {
      router.push("/");
    }
  }, [router, user, isLoading]);

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F8FF]">
      <SidebarComponent userRole="admin" userName={user?.name || "Admin User"} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
