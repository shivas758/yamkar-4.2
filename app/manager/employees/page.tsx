"use client"

import { useState, useEffect } from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, History } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context";
import { supabase, fetchLatestEmployeeLocation } from "@/lib/supabaseClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Dynamically load components that use browser APIs
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), { ssr: false });
const EmployeeDataPopup = dynamic(() => import('@/components/EmployeeDataPopup'), { ssr: false });

interface Employee {
  id: string;
  name: string;
  role: string;
  location?: string;
  avatar?: string;
  status: 'checked-in' | 'checked-out';
  lastCheckTime: string | null;
  cadre?: { name: string };
  currentLogId?: string | null;
  locationUpdatedAt?: string | null;
  lastLogId?: string | null;
}

const ManagerEmployeeList = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([])
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeTab, setSelectedEmployeeTab] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();

    // Add visibility change listener to refresh data when tab becomes active
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, refreshing employee data');
        fetchEmployees();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const fetchEmployees = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          cadre(name),
          attendance_logs(id, check_in, check_out)
        `)
        .eq('role', 'employee')
        .eq('manager_id', user.id);

      if (error) {
        console.error("Error fetching employees:", error);
        return;
      }

      interface AttendanceLog {
        id: string;
        check_in: string;
        check_out: string | null;
      }

      const employeesWithStatus = await Promise.all(data.map(async employee => {
        const latestLog = employee.attendance_logs?.sort((a: AttendanceLog, b: AttendanceLog) => 
          new Date(b.check_in).getTime() - new Date(a.check_in).getTime()
        )[0];
        
        let locationStr = employee.location || '';
        let locationUpdatedAt = null;
        
        // Fetch latest location data for ALL employees, not just checked-in ones
        try {
          const latestLocation = await fetchLatestEmployeeLocation(employee.id);
          if (latestLocation) {
            locationStr = `${latestLocation.latitude},${latestLocation.longitude}`;
            locationUpdatedAt = new Date(latestLocation.captured_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            });
          }
        } catch (e) {
          console.error(`Error fetching location for employee ${employee.id}:`, e);
        }
        
        const lastAttendanceLogId = latestLog?.id || null;
        
        return {
          ...employee,
          status: latestLog ? (latestLog.check_out ? "checked-out" : "checked-in") : "checked-out",
          lastCheckTime: latestLog?.check_in ? new Date(latestLog.check_in).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }) : null,
          currentLogId: latestLog && !latestLog.check_out ? latestLog.id : null,
          lastLogId: lastAttendanceLogId, // Add this to track the last log regardless of check-out status
          location: locationStr,
          locationUpdatedAt
        };
      }));

      setEmployees(employeesWithStatus);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    } finally {
      setIsLoading(false);
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleExpandClick = (employeeId: string) => {
    setExpandedEmployeeId(expandedEmployeeId === employeeId ? null : employeeId);
    // Set default tab to current location when expanding
    if (expandedEmployeeId !== employeeId) {
      setSelectedEmployeeTab({...selectedEmployeeTab, [employeeId]: 'current'});
    }
  };

  // Filter employees based on search query and location filter
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (employee.cadre?.name && employee.cadre.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLocation = locationFilter === "all" || 
                          (employee.location && employee.location.includes(locationFilter));
    
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#228B22]">Employee List</h1>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchEmployees} 
            disabled={isLoading}
            className="flex items-center gap-1"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-b-2 border-[#228B22] rounded-full"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
                <span>Refresh</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="bg-[#F4A460] bg-opacity-20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B8E23]" />
              <Input
                placeholder="Search employees..."
                className="pl-10 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-white">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>Filter by Location</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="North Region">North Region</SelectItem>
                <SelectItem value="South Region">South Region</SelectItem>
                <SelectItem value="East Region">East Region</SelectItem>
                <SelectItem value="West Region">West Region</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredEmployees.length > 0 ? (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border border-[#F4A460]">
                    <AvatarImage src={employee.avatar || ""} alt={employee.name} />
                    <AvatarFallback className="bg-[#F4A460] text-white">
                      {getInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-[#6B8E23]">
                      {employee.cadre?.name || "Staff"}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-4">
                    <div className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#6B8E23]" />
                      {employee.locationUpdatedAt ? (
                        <span>Last updated: {employee.locationUpdatedAt}</span>
                      ) : (
                        <span>No location data</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleExpandClick(employee.id)}
                      className="p-0"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform text-[#6B8E23] ${
                          expandedEmployeeId === employee.id ? "rotate-180 text-[#D3D3D3]" : ""
                        }`}
                      />
                    </button>

                    <div className="flex items-center gap-2">
                      {employee.status === "checked-in" ? (
                        <Badge className="bg-[#FFD700] text-[#333333] flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[#D3D3D3] flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Checked Out
                        </Badge>
                      )}
                      <span className="text-xs text-[#D3D3D3] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {employee.lastCheckTime}
                      </span>
                    </div>

                    <Button variant="ghost" size="sm" className="text-[#6B8E23]" asChild>
                      <a href={`/manager/employees/${employee.id}`}>
                        <span className="flex items-center gap-1">
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="md:hidden mt-2 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-[#6B8E23]" />
                    {employee.locationUpdatedAt ? (
                      <span>Last updated: {employee.locationUpdatedAt}</span>
                    ) : (
                      <span>No location data</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExpandClick(employee.id)}
                      className="p-0"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform text-[#6B8E23] ${
                          expandedEmployeeId === employee.id ? "rotate-180 text-[#D3D3D3]" : ""
                        }`}
                      />
                    </button>

                    {employee.status === "checked-in" ? (
                      <Badge className="bg-[#FFD700] text-[#333333] flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Checked In
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[#D3D3D3] flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Checked Out
                      </Badge>
                    )}
                    <span className="text-xs text-[#D3D3D3] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {employee.lastCheckTime}
                    </span>
                  </div>
                </div>
                {expandedEmployeeId === employee.id && (
                  <div className="mt-4">
                    <Tabs value={selectedEmployeeTab[employee.id] || 'current'} 
                          onValueChange={(value) => setSelectedEmployeeTab({...selectedEmployeeTab, [employee.id]: value})}>
                      <TabsList className="mb-2">
                        <TabsTrigger value="current">Current Location</TabsTrigger>
                        {(employee.currentLogId || employee.lastLogId) && (
                          <TabsTrigger value="path">
                            <History className="h-3 w-3 mr-1" />
                            Movement Path
                          </TabsTrigger>
                        )}
                      </TabsList>
                      
                      <TabsContent value="current" className="relative">
                        <div 
                          className="w-full bg-gray-100 rounded-lg overflow-hidden" 
                          style={{ height: "350px" }}
                          data-map-container={employee.id}
                        >
                          <LeafletMap
                            key={`current-${employee.id}-${Date.now()}`}
                            employeeId={employee.id}
                            location={employee.location ? employee.location : undefined}
                            showPath={false}
                            containerType="current-location"
                          />
                        </div>
                        <div className="mt-2 bg-[#F4FAF4] p-3 rounded-lg">
                          <div className="text-sm font-medium">{employee.name}</div>
                          <div className="text-sm text-[#6B8E23] flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {employee.locationUpdatedAt ? (
                              <span>Location updated at {employee.locationUpdatedAt}</span>
                            ) : (
                              <span>No recent location data available</span>
                            )}
                          </div>
                          {!employee.location && (
                            <div className="mt-2 text-xs text-amber-600">
                              This employee has no location records. Location tracking begins when an employee checks in.
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      {(employee.currentLogId || employee.lastLogId) && (
                        <TabsContent value="path" className="relative">
                          <div 
                            className="w-full bg-gray-100 rounded-lg overflow-hidden" 
                            style={{ height: "350px" }}
                            data-map-container={employee.id}
                          >
                            <LeafletMap
                              key={`path-${employee.id}-${employee.currentLogId || employee.lastLogId}-${Date.now()}`}
                              employeeId={employee.id}
                              showPath={true}
                              attendanceLogId={(employee.currentLogId || employee.lastLogId) as string}
                              containerType="movement-path"
                            />
                          </div>
                          <div className="mt-2 bg-[#F4FAF4] p-3 rounded-lg">
                            <div className="text-sm font-medium">Movement History</div>
                            <div className="text-sm text-[#6B8E23]">
                              {employee.status === "checked-in" ? (
                                <span>Showing path since check-in at {employee.lastCheckTime}</span>
                              ) : (
                                <span>Showing path from last activity at {employee.lastCheckTime}</span>
                              )}
                            </div>
                            {!employee.location && (
                              <div className="mt-2 text-xs text-amber-600">
                                No movement data available for this attendance period.
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-[#6B8E23]">No employees found matching your search criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Create a wrapper component that only renders on the client
const ManagerEmployeesPage = () => {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return <div className="p-8 flex justify-center">Loading employee data...</div>;
  }
  
  return <ManagerEmployeeList />;
};

export default dynamic(() => Promise.resolve(ManagerEmployeesPage), { ssr: false });
