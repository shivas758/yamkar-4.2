"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Image, Bike, Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react"

// Interface for odometer log data
interface OdometerLog {
  id: string
  check_in: string
  check_out: string | null
  check_in_meter_reading: number | null
  check_out_meter_reading: number | null
  check_in_meter_image: string | null
  check_out_meter_image: string | null
  distance_traveled: number | null
  user_id: string
}

export default function ActivityPage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [odometerLogs, setOdometerLogs] = useState<OdometerLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [period, setPeriod] = useState<"day" | "week" | "month">("day")

  useEffect(() => {
    if (user) {
      fetchOdometerLogs()
    }
  }, [user, selectedDate, period])

  const fetchOdometerLogs = async () => {
    if (!user) return
    
    setIsLoading(true)
    
    try {
      // Calculate date range based on selected period
      let startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)
      
      let endDate = new Date(selectedDate)
      
      if (period === "day") {
        endDate.setHours(23, 59, 59, 999)
      } else if (period === "week") {
        startDate.setDate(startDate.getDate() - startDate.getDay()) // Start of week (Sunday)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6) // End of week (Saturday)
        endDate.setHours(23, 59, 59, 999)
      } else if (period === "month") {
        startDate.setDate(1) // First day of month
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0) // Last day of month
        endDate.setHours(23, 59, 59, 999)
      }
      
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_in', startDate.toISOString())
        .lte('check_in', endDate.toISOString())
        .order('check_in', { ascending: false })
      
      if (error) throw error
      
      setOdometerLogs(data || [])
    } catch (error) {
      console.error('Error fetching odometer logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate total distance for the selected period
  const totalDistance = odometerLogs.reduce((sum, log) => 
    sum + (log.distance_traveled || 0), 0
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#228B22]">Activity Tracking</h1>
        <p className="text-[#6B8E23]">
          View your odometer readings and travel details
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">Select Date Range</h3>
              <Tabs defaultValue="day" className="w-full" onValueChange={(value) => setPeriod(value as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="pt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Odometer History</span>
              <span className="text-[#228B22]">{totalDistance.toFixed(1)} km</span>
            </CardTitle>
            <CardDescription>
              {period === "day" ? format(selectedDate, "MMMM d, yyyy") :
               period === "week" ? `Week of ${format(selectedDate, "MMMM d, yyyy")}` :
               format(selectedDate, "MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-[#228B22]" />
                <span className="ml-2">Loading activity data...</span>
              </div>
            ) : odometerLogs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No odometer readings found for this period
              </div>
            ) : (
              <div className="space-y-4">
                {odometerLogs.map((log) => (
                  <Card key={log.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Date
                          </p>
                          <p className="text-sm font-medium">
                            {format(new Date(log.check_in), "MMMM d, yyyy")}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center">
                            <Bike className="h-3 w-3 mr-1" />
                            Distance
                          </p>
                          <p className="text-sm font-medium">
                            {log.distance_traveled ? `${log.distance_traveled.toFixed(1)} km` : "Not completed"}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Check-in Reading</p>
                          <div className="flex items-center">
                            <p className="text-sm font-medium mr-2">
                              {log.check_in_meter_reading !== null 
                                ? `${log.check_in_meter_reading} km` 
                                : "N/A"}
                            </p>
                            {log.check_in_meter_image && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => setSelectedImage(log.check_in_meter_image)}
                                  >
                                    <Image className="h-4 w-4 text-[#228B22]" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <div className="overflow-hidden rounded-md">
                                    <img
                                      src={log.check_in_meter_image}
                                      alt="Check-in odometer reading"
                                      className="w-full object-contain max-h-[70vh]"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Check-out Reading</p>
                          <div className="flex items-center">
                            <p className="text-sm font-medium mr-2">
                              {log.check_out_meter_reading !== null 
                                ? `${log.check_out_meter_reading} km` 
                                : "Not checked out"}
                            </p>
                            {log.check_out_meter_image && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => setSelectedImage(log.check_out_meter_image)}
                                  >
                                    <Image className="h-4 w-4 text-[#228B22]" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                  <div className="overflow-hidden rounded-md">
                                    <img
                                      src={log.check_out_meter_image}
                                      alt="Check-out odometer reading"
                                      className="w-full object-contain max-h-[70vh]"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

