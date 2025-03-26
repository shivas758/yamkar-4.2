"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Mail, CheckCircle, Clock, ChevronRight, UserPlus, Lock, Building, MapPin } from "lucide-react";
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
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('status', 'pending');

    if (error) {
      console.error("Error fetching approvals:", error);
      return;
    }

    setApprovals(data);
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'approved' })
        .eq('id', id);

      if (error) {
        console.error("Error approving user:", error);
        toast({
          title: "Error",
          description: "Failed to approve user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Approved",
        description: "The account request has been approved successfully.",
        duration: 3000,
      });
      fetchApprovals();
    } catch (error) {
      console.error("Error during approval:", error);
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error rejecting user:", error);
        toast({
          title: "Error",
          description: "Failed to reject user",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Rejected",
        description: "The account request has been rejected.",
        duration: 3000,
      });
      fetchApprovals();
    } catch (error) {
      console.error("Error during rejection:", error);
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    }
  };

  const filteredApprovals = approvals.filter((approval: any) => {
    const matchesSearch =
      approval.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || approval.role === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Pending Approvals</h1>
        <p className="text-[#6B8E23]">Review and manage account requests</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B8E23]" />
          <Input
            placeholder="Search requests..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredApprovals.length > 0 ? (
          filteredApprovals.map((approval: any) => (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={approval.name} />
                      <AvatarFallback className="bg-[#6B8E23] text-white">
                        {approval.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{approval.name}</div>
                      <div className="text-sm text-[#6B8E23]">{approval.email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#6B8E23]" />
                      <Badge variant="outline">{approval.role.charAt(0).toUpperCase() + approval.role.slice(1)}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-[#6B8E23]" />
                      {approval.department}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#6B8E23]" />
                      {approval.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#6B8E23]" />
                      <span className="text-muted-foreground">{new Date(approval.requestedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(approval.id)} className="bg-[#228B22] hover:bg-[#1a6b1a]">
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(approval.id)}
                      className="border-[#E2725B] text-[#E2725B] hover:bg-[#E2725B] hover:text-white"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center p-8">
            <div className="text-[#D3D3D3] mb-2">No pending approvals</div>
            <div className="text-sm">All requests have been processed</div>
          </div>
        )}
      </div>
    </div>
  );
}
