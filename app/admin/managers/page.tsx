"use client";

import type React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Mail, CheckCircle, Clock, ChevronRight, UserPlus, Lock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ManagerManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [managers, setManagers] = useState<any[]>([]);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'manager');

    if (error) {
      console.error("Error fetching managers:", error);
      return;
    }

    setManagers(data);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDialogOpen(false);

    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error("Error creating user:", authError);
        // Handle error
        return;
      }

      const userId = authData.user?.id;

      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            name,
            email,
            role: 'manager',
            status: 'active',
            phone: '', // Add if you have this field
          },
        ]);

      if (userError) {
        console.error("Error creating user profile:", userError);
        // Handle error
        return;
      }

      console.log("Manager created successfully!");
      fetchManagers();
      // Optionally, show a success message to the user
    } catch (error: any) {
      console.error("Error during manager creation:", error);
      // Handle error
    }
  };

  const filteredManagers = managers.filter((manager: any) => {
    const matchesSearch =
      manager.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      manager.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      activeTab === "all" ||
      (activeTab === "pending" && manager.status === "pending") ||
      (activeTab === "approved" && manager.status === "approved");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#228B22]">Manager Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#228B22] hover:bg-[#1a6b1a] flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create New Manager
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-[#228B22]">Create New Manager</DialogTitle>
              <DialogDescription>Enter the details below to create a new manager account.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input id="name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email Address *
                </Label>
                <Input id="email" type="email" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-1">
                  <Lock className="h-4 w-4" />
                  Password *
                </Label>
                <Input id="password" type="password" required />
              </div>

              <DialogFooter>
                <Button type="submit" className="bg-[#228B22] hover:bg-[#1a6b1a]">
                  Create Manager
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B8E23]" />
          <Input
            placeholder="Search managers..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Managers</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {filteredManagers.length > 0 ? (
          filteredManagers.map((manager: any) => (
            <Card key={manager.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between" >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10"  key={manager.id}>
                      <AvatarImage src={manager.avatar} alt={manager.name} />
                      <AvatarFallback className="bg-[#6B8E23] text-white">{getInitials(manager.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{manager.name}</div>
                      <div className="text-sm text-[#6B8E23] flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {manager.email}
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-6">
                    {manager.status === "approved" ? (
                      <Badge className="bg-[#FFD700] text-[#333333] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[#D3D3D3] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}

                    <div className="text-sm flex items-center gap-1">
                      <Users className="h-4 w-4 text-[#6B8E23]" />
                      {manager.employeeCount} Employees
                    </div>

                    <div className="flex items-center gap-2">
                      {manager.status === "pending" && (
                        <Button size="sm" className="bg-[#6B8E23] hover:bg-[#556b1b]">
                          Approve
                        </Button>
                      )}

                      <Button variant="ghost" size="sm" className="text-[#6B8E23]" asChild>
                        <a href={`/admin/managers/${manager.id}`}>
                          <span className="flex items-center gap-1">
                            View Details
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="md:hidden">
                    <Button variant="ghost" size="sm" className="text-[#6B8E23]" asChild>
                      <a href={`/admin/managers/${manager.id}`}>
                        <ChevronRight className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="md:hidden mt-2 flex items-center justify-between text-sm">
                  {manager.status === "approved" ? (
                    <Badge className="bg-[#FFD700] text-[#333333] flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[#D3D3D3] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}

                  <div className="text-sm flex items-center gap-1">
                    <Users className="h-3 w-3 text-[#6B8E23]" />
                    {manager.employeeCount} Employees
                  </div>

                  {manager.status === "pending" && (
                    <Button size="sm" className="bg-[#6B8E23] hover:bg-[#556b1b]">
                      Approve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-8">
            <div className="text-[#D3D3D3] mb-2">No managers found</div>
            <div className="text-sm">Try adjusting your search criteria</div>
          </div>
        )}
      </div>
    </div>
  );
}
