"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Download, BarChart, Users, MapPin, Fuel } from "lucide-react"

export default function ReportsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  const mockPerformanceData = [
    { name: "John Doe", checkIns: 22, kilometers: 450, farmers: 15 },
    { name: "Jane Smith", checkIns: 20, kilometers: 380, farmers: 12 },
    { name: "Mike Johnson", checkIns: 18, kilometers: 320, farmers: 10 },
    { name: "Sarah Williams", checkIns: 21, kilometers: 410, farmers: 14 },
    { name: "David Brown", checkIns: 19, kilometers: 350, farmers: 11 },
  ]

  const mockLocationData = [
    { region: "North", employees: 12, activeToday: 10, totalKm: 1200 },
    { region: "South", employees: 8, activeToday: 7, totalKm: 950 },
    { region: "East", employees: 10, activeToday: 8, totalKm: 1100 },
    { region: "West", employees: 9, activeToday: 8, totalKm: 1050 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#228B22]">Performance Reports</h1>
          <p className="text-[#6B8E23]">View and analyze team performance</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="north">North Region</SelectItem>
              <SelectItem value="south">South Region</SelectItem>
              <SelectItem value="east">East Region</SelectItem>
              <SelectItem value="west">West Region</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#6B8E23]" />
              <div className="text-sm text-muted-foreground">Total Employees</div>
            </div>
            <div className="text-2xl font-bold mt-2">39</div>
            <div className="text-xs text-[#6B8E23] mt-1">↑ 2 from last month</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart className="h-4 w-4 text-[#6B8E23]" />
              <div className="text-sm text-muted-foreground">Active Today</div>
            </div>
            <div className="text-2xl font-bold mt-2">33</div>
            <div className="text-xs text-[#6B8E23] mt-1">85% activity rate</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#6B8E23]" />
              <div className="text-sm text-muted-foreground">Total Distance</div>
            </div>
            <div className="text-2xl font-bold mt-2">4,300 km</div>
            <div className="text-xs text-[#6B8E23] mt-1">↑ 300km from last week</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-[#6B8E23]" />
              <div className="text-sm text-muted-foreground">Fuel Charges</div>
            </div>
            <div className="text-2xl font-bold mt-2">$1,250</div>
            <div className="text-xs text-[#6B8E23] mt-1">This month</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPerformanceData.map((employee, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">{employee.checkIns} check-ins</div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Kilometers</span>
                      <span>{employee.kilometers} km</span>
                    </div>
                    <div className="h-2 bg-[#F4A460] bg-opacity-30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6B8E23] rounded-full"
                        style={{ width: `${(employee.kilometers / 500) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Farmers Data</span>
                      <span>{employee.farmers} entries</span>
                    </div>
                    <div className="h-2 bg-[#F4A460] bg-opacity-30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#228B22] rounded-full"
                        style={{ width: `${(employee.farmers / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {mockLocationData.map((region, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{region.region} Region</div>
                    <div className="text-sm text-muted-foreground">{region.employees} employees</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Active Today</div>
                      <div className="text-lg font-medium">{region.activeToday}</div>
                      <div className="h-2 bg-[#F4A460] bg-opacity-30 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-[#FFD700] rounded-full"
                          style={{ width: `${(region.activeToday / region.employees) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Distance</div>
                      <div className="text-lg font-medium">{region.totalKm} km</div>
                      <div className="h-2 bg-[#F4A460] bg-opacity-30 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-[#228B22] rounded-full"
                          style={{ width: `${(region.totalKm / 1500) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

