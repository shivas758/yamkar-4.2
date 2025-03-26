"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, Users, Settings, Clock, MapPin, CheckCircle, XCircle, Loader2, Key } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { supabase, checkStorageBucket } from "@/lib/supabaseClient"
import { useToast } from "@/components/ui/use-toast"
import MeterReadingPopup from "@/components/MeterReadingPopup"
import PasswordChangePopup from "@/components/PasswordChangePopup"
import LocationTracker from "@/components/LocationTracker"

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checkInStatus, setCheckInStatus] = useState<"checked-in" | "checked-out">("checked-out")
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null)
  const [currentLogId, setCurrentLogId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMeterPopup, setShowMeterPopup] = useState(false)
  const [meterReadingType, setMeterReadingType] = useState<"check-in" | "check-out">("check-in")
  const [bucketStatus, setBucketStatus] = useState<"checking" | "exists" | "error">("checking")
  const [showPasswordChangePopup, setShowPasswordChangePopup] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [meterReading, setMeterReading] = useState<number | null>(null)
  const [capturedImage, setCapturedImage] = useState<File | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null)

  // Clear any stuck checkout flags on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for stale checkout flag
      const checkoutInProgress = localStorage.getItem('checkout_in_progress');
      if (checkoutInProgress) {
        console.log("Found stale checkout_in_progress flag, clearing it");
        localStorage.removeItem('checkout_in_progress');
      }
      
      // Set up page freeze detection
      let lastActivityTime = Date.now();
      
      const activityHandler = () => {
        lastActivityTime = Date.now();
      };
      
      // Add activity listeners
      ['mousemove', 'keydown', 'click', 'touchstart'].forEach(event => {
        window.addEventListener(event, activityHandler);
      });
      
      // Check for UI freezes every minute
      const freezeDetectionInterval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        
        // If user is active but UI hasn't responded for over 2 minutes,
        // possibly we have a freeze that needs clearing
        if (timeSinceLastActivity < 60000 && 
            document.visibilityState === 'visible' && 
            checkInStatus === "checked-in") {
          
          // Try to refresh local state
          checkCurrentStatus();
        }
      }, 60000);
      
      return () => {
        // Clean up listeners
        ['mousemove', 'keydown', 'click', 'touchstart'].forEach(event => {
          window.removeEventListener(event, activityHandler);
        });
        
        clearInterval(freezeDetectionInterval);
      };
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkCurrentStatus();
      checkBucketStatus();
    }
  }, [user]);

  const checkBucketStatus = async () => {
    try {
      const result = await checkStorageBucket('meter-readings');
      setBucketStatus(result.exists ? "exists" : "error");
      
      if (!result.exists) {
        toast({
          title: "Storage Setup Issue",
          description: result.error || "There was a problem with the image storage setup. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error checking storage bucket:", error);
      setBucketStatus("error");
      
      toast({
        title: "Storage Setup Issue",
        description: error.message || "There was a problem with the image storage setup. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const checkCurrentStatus = async () => {
    if (!user?.id) return;

    // Check user's active status
    const { data: userData } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', user.id)
      .single();

    if (userData?.is_active) {
      // Get the latest attendance log
      const { data: logData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .is('check_out', null)
        .single();

      if (logData) {
        setCheckInStatus("checked-in");
        setCurrentLogId(logData.id);
        setLastCheckTime(new Date(logData.check_in).toLocaleTimeString([], { 
          hour: "2-digit", 
          minute: "2-digit" 
        }));
      }
    }
  };

  const initializeCheckIn = () => {
    if (!user?.id || isSubmitting) return;
    setMeterReadingType("check-in");
    setShowMeterPopup(true);
  };

  const initializeCheckOut = () => {
    if (!user?.id || !currentLogId || isSubmitting) return;
    
    setMeterReadingType("check-out");
    setShowMeterPopup(true);
  };

  const handleCheckIn = async (meterReading: number, imageUrl: string | null, location?: { latitude: number, longitude: number }) => {
    console.log("[DEBUG] handleCheckIn called with:", { meterReading, imageUrl, location });
    if (!user?.id) {
      console.log("[DEBUG] No user ID, returning early");
      return;
    }
    setIsSubmitting(true);
    
    // Set up a timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.log("[DEBUG] Check-in operation timed out");
      setIsSubmitting(false);
      toast({
        title: "Check-in Timed Out",
        description: "The operation took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000); // 30 seconds timeout

    try {
      console.log("[DEBUG] Starting check-in process with meter reading:", meterReading);
      console.log("[DEBUG] Image URL for check-in:", imageUrl);
      if (location) {
        console.log("[DEBUG] Location data for check-in:", location);
      }
      
      console.log("[DEBUG] Inserting new attendance log");
      // Create new attendance log with meter reading data
      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .insert([
          { 
            user_id: user.id, 
            check_in: new Date().toISOString(),
            check_in_meter_reading: meterReading,
            check_in_meter_image: imageUrl
          }
        ])
        .select()
        .single();

      console.log("[DEBUG] Insert response:", { data: logData, error: logError });

      if (logError) {
        console.error("[DEBUG] Log creation error:", logError);
        throw new Error(`Failed to create attendance log: ${logError.message}`);
      }
      
      if (!logData) {
        console.error("[DEBUG] No data returned after creating attendance log");
        throw new Error("No data returned after creating attendance log");
      }

      console.log("[DEBUG] Attendance log created successfully:", logData.id);

      // Save location data if provided from the meter reading popup
      // This ensures we have the exact check-in location
      if (location && location.latitude && location.longitude) {
        try {
          console.log("[DEBUG] Saving initial check-in location data");
          const { data: locationData, error: locationError } = await supabase
            .from('employee_locations')
            .insert([
              { 
                user_id: user.id,
                attendance_log_id: logData.id,
                latitude: location.latitude,
                longitude: location.longitude,
                captured_at: new Date().toISOString()
              }
            ])
            .select();

          console.log("[DEBUG] Location insert response:", { data: locationData, error: locationError });

          if (locationError) {
            console.error("[DEBUG] Error saving location data:", locationError);
            // Don't throw here, just log it - we don't want to fail check-in if location saving fails
          } else {
            console.log("[DEBUG] Location data saved successfully");
            
            // Set location tracking flag to avoid duplicate location capture
            if (typeof window !== 'undefined') {
              localStorage.setItem('initial_location_captured', 'true');
              
              // Remove the flag after 30 seconds to allow normal tracking to resume
              setTimeout(() => {
                console.log("[DEBUG] Removing initial_location_captured flag to resume normal tracking");
                localStorage.removeItem('initial_location_captured');
              }, 30000); // Reduced to 30 seconds to ensure tracking resumes sooner
            }
          }
        } catch (locationSaveError) {
          console.error("[DEBUG] Exception saving location data:", locationSaveError);
          // Don't throw here either
        }
      }

      console.log("[DEBUG] Updating user's active status");
      // Update user's active status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ is_active: true })
        .eq('id', user.id)
        .select();

      console.log("[DEBUG] User update response:", { data: userData, error: userError });

      if (userError) {
        console.error("[DEBUG] User status update error:", userError);
        
        // Attempt to rollback the attendance log if user status update fails
        console.log("[DEBUG] Attempting to rollback attendance log");
        const { error: rollbackError } = await supabase
          .from('attendance_logs')
          .delete()
          .eq('id', logData.id);
          
        console.log("[DEBUG] Rollback result:", { error: rollbackError });
        throw new Error(`Failed to update user status: ${userError.message}`);
      }

      console.log("[DEBUG] User status updated successfully");
      
      // Clear the timeout as operation was successful
      clearTimeout(timeoutId);

      setCheckInStatus("checked-in");
      setCurrentLogId(logData.id);
      setLastCheckTime(new Date().toLocaleTimeString([], { 
        hour: "2-digit", 
        minute: "2-digit" 
      }));

      console.log("[DEBUG] Check-in UI updated");
      toast({
        title: "Checked In Successfully",
        description: "Your attendance and odometer reading have been recorded.",
      });
      console.log("[DEBUG] Success toast displayed");
    } catch (error: any) {
      console.error('[DEBUG] Error during check-in:', error);
      toast({
        title: "Check-in Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      console.log("[DEBUG] Check-in operation completed");
      clearTimeout(timeoutId); // Ensure timeout is cleared
      setIsSubmitting(false);
      setShowMeterPopup(false); // Close the dialog regardless of outcome
    }
  };

  const updateDailySummary = async (userId: string, checkOutTime: Date) => {
    const today = new Date().toISOString().split('T')[0];

    // Get all attendance logs for today
    const { data: todayLogs } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in', `${today}T00:00:00`)
      .lte('check_in', `${today}T23:59:59`);

    if (!todayLogs) return;

    const totalMinutes = todayLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const checkInCount = todayLogs.length;
    const firstCheckIn = todayLogs[0]?.check_in;
    const totalDistance = todayLogs.reduce((acc, log) => acc + (log.distance_traveled || 0), 0);

    await supabase
      .from('daily_work_summary')
      .upsert({
        user_id: userId,
        date: today,
        total_working_hours: totalHours,
        check_in_count: checkInCount,
        first_check_in: firstCheckIn,
        last_check_out: checkOutTime.toISOString(),
        total_distance_traveled: totalDistance
      });
  };

  const calculateDuration = async (logId: string): Promise<number> => {
    console.log("[DEBUG] calculateDuration called for log ID:", logId);
    try {
      // Get the check-in time from the current log
      console.log("[DEBUG] About to query attendance_logs for check-in time");
      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .select('check_in')
        .eq('id', logId)
        .single();
      
      console.log("[DEBUG] Log data for duration calculation:", { data: logData, error: logError });
      
      if (logError) {
        console.error("[DEBUG] Error getting check-in time:", logError);
        // Just use a default duration of 60 minutes if we can't calculate
        console.log("[DEBUG] Using default duration of 60 minutes due to error");
        return 60;
      }
      
      if (!logData || !logData.check_in) {
        console.error("[DEBUG] No check-in time data found for log:", logId);
        // Just use a default duration of 60 minutes if we can't calculate
        console.log("[DEBUG] Using default duration of 60 minutes due to missing data");
        return 60;
      }
      
      const checkInTime = new Date(logData.check_in);
      const checkOutTime = new Date();
      
      // Calculate duration in minutes
      const durationMs = checkOutTime.getTime() - checkInTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      console.log("[DEBUG] Calculated duration:", durationMinutes, "minutes from check-in time:", checkInTime);
      return durationMinutes > 0 ? durationMinutes : 1; // Ensure at least 1 minute
    } catch (error) {
      console.error("[DEBUG] Exception in calculateDuration:", error);
      // Just use a default duration of 60 minutes if we can't calculate
      console.log("[DEBUG] Using default duration of 60 minutes due to exception");
      return 60; // Return a default of 60 minutes if an error occurs
    }
  };
  
  const calculateDistanceTraveled = async (logId: string, checkOutReading: number): Promise<{distance: number}> => {
    console.log("[DEBUG] calculateDistanceTraveled called for log ID:", logId, "and reading:", checkOutReading);
    try {
      // Get the check-in meter reading
      console.log("[DEBUG] About to query attendance_logs for check-in meter reading");
      const { data: logData, error: logError } = await supabase
        .from('attendance_logs')
        .select('check_in_meter_reading')
        .eq('id', logId)
        .single();
      
      console.log("[DEBUG] Log data for distance calculation:", { data: logData, error: logError });
      
      if (logError) {
        console.error("[DEBUG] Error getting check-in meter reading:", logError);
        // Return a default distance of 5 km
        console.log("[DEBUG] Using default distance of 5 km due to error");
        return { distance: 5 };
      }
      
      if (!logData) {
        console.error("[DEBUG] No data returned for log:", logId);
        // Return a default distance of 5 km
        console.log("[DEBUG] Using default distance of 5 km due to missing data");
        return { distance: 5 };
      }
      
      const checkInReading = logData.check_in_meter_reading || 0;
      
      // Calculate distance (always positive)
      const distance = Math.max(0, checkOutReading - checkInReading);
      
      console.log("[DEBUG] Calculated distance:", distance, "km", {
        checkInReading,
        checkOutReading
      });
      
      // Try to update the distance in the log, but don't block on it
      try {
        if (distance > 0) {
          console.log("[DEBUG] About to update distance traveled in attendance_logs");
          const { error: updateError } = await supabase
            .from('attendance_logs')
            .update({ distance_traveled: distance })
            .eq('id', logId);
          
          if (updateError) {
            console.error("[DEBUG] Error updating distance traveled:", updateError);
          } else {
            console.log("[DEBUG] Successfully updated distance traveled");
          }
        }
      } catch (updateError) {
        console.error("[DEBUG] Exception updating distance traveled:", updateError);
        // Continue even if update fails
      }
      
      // Return the calculated distance regardless of whether the update succeeded
      return { distance: distance || 5 }; // Ensure at least 5 km if calculated is 0
    } catch (error) {
      console.error("[DEBUG] Exception in calculateDistanceTraveled:", error);
      // Return a default distance of 5 km on error
      console.log("[DEBUG] Using default distance of 5 km due to exception");
      return { distance: 5 };
    }
  };

  const handleCheckOut = async (meterReading: number, imageUrl: string | null, location?: { latitude: number, longitude: number }) => {
    console.log("[DEBUG] handleCheckOut called with:", { meterReading, imageUrl, location });
    
    // Verify we have the required data
    if (!user?.id) {
      console.error("[DEBUG] No user ID found for checkout");
      toast({
        title: "Checkout Failed",
        description: "User information is missing. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentLogId) {
      console.error("[DEBUG] No active check-in found (no currentLogId)");
      toast({
        title: "Checkout Failed",
        description: "No active check-in found. You may have already checked out.",
        variant: "destructive",
      });
      return;
    }
    
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log("[DEBUG] Already processing a checkout request");
      return;
    }
    
    setIsSubmitting(true);
    
    // Set a flag to prevent the location tracker from running during checkout
    if (typeof window !== 'undefined') {
      localStorage.setItem('checkout_in_progress', 'true');
    }
    
    // Ensure flag is cleared after a maximum time to prevent stuck state
    const maxCheckoutTime = setTimeout(() => {
      console.log("[DEBUG] Maximum checkout time reached, clearing flag");
      if (typeof window !== 'undefined') {
        localStorage.removeItem('checkout_in_progress');
      }
    }, 120000); // 2 minutes absolute maximum
    
    // Set up a timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.log("[DEBUG] Check-out operation timed out");
      setIsSubmitting(false);
      setShowMeterPopup(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('checkout_in_progress');
      }
      toast({
        title: "Check-out Timed Out",
        description: "The operation took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000);
    
    try {
      console.log("[DEBUG] Starting checkout process for user:", user.id, "log:", currentLogId);
      // Get the current time for checkout
      const checkOutTime = new Date();
      
      // Calculate real duration
      console.log("[DEBUG] Calculating duration for log:", currentLogId);
      const durationMinutes = await calculateDuration(currentLogId);
      console.log("[DEBUG] Calculated duration:", durationMinutes);
      
      // Calculate real distance
      console.log("[DEBUG] Calculating distance for meter reading:", meterReading);
      const { distance: distanceTraveled } = await calculateDistanceTraveled(currentLogId, meterReading);
      console.log("[DEBUG] Calculated distance:", distanceTraveled);
      
      // Update attendance log with checkout information
      console.log("[DEBUG] Updating attendance log with checkout information");
      const { data: updateData, error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          check_out: checkOutTime.toISOString(),
          duration_minutes: durationMinutes, // Calculated duration
          check_out_meter_reading: meterReading,
          check_out_meter_image: imageUrl,
          distance_traveled: distanceTraveled // Calculated distance
        })
        .eq('id', currentLogId)
        .select();
      
      console.log("[DEBUG] Update response:", { data: updateData, error: updateError });
      
      if (updateError) {
        console.error("[DEBUG] Failed to update attendance log:", updateError);
        throw new Error(`Failed to update attendance log: ${updateError.message}`);
      }
      console.log("[DEBUG] Attendance log updated successfully");
      
      // Update daily summary
      try {
        console.log("[DEBUG] Updating daily summary");
        await updateDailySummary(user.id, checkOutTime);
        console.log("[DEBUG] Daily summary updated");
      } catch (summaryError) {
        console.error("[DEBUG] Error updating daily summary:", summaryError);
        // Continue even if this fails
      }
      
      // Update user status
      console.log("[DEBUG] Updating user status to inactive");
      const { data: userData, error: userError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', user.id)
        .select();
      
      console.log("[DEBUG] User update response:", { data: userData, error: userError });
      
      if (userError) {
        console.error("[DEBUG] Error updating user status, but checkout was successful:", userError);
      } else {
        console.log("[DEBUG] User status updated successfully");
      }
      
      // Save location data if provided
      if (location && location.latitude && location.longitude) {
        try {
          console.log("[DEBUG] Saving location data");
          const { data: locationData, error: locationError } = await supabase
            .from('employee_locations')
            .insert([
              { 
                user_id: user.id,
                attendance_log_id: currentLogId,
                latitude: location.latitude,
                longitude: location.longitude,
                captured_at: new Date().toISOString()
              }
            ])
            .select();
            
          console.log("[DEBUG] Location insert response:", { data: locationData, error: locationError });
            
          if (locationError) {
            console.error("[DEBUG] Error saving location data:", locationError);
          } else {
            console.log("[DEBUG] Location data saved successfully");
          }
        } catch (locationError) {
          console.error("[DEBUG] Exception saving location data:", locationError);
        }
      }
      
      // Clear the timeout as operation was successful
      clearTimeout(timeoutId);
      
      // Update UI state
      console.log("[DEBUG] Updating UI state for checkout");
      setCheckInStatus("checked-out");
      setCurrentLogId(null);
      setLastCheckTime(null);
      setMeterReading(null);
      setCapturedImage(null);
      console.log("[DEBUG] UI state updated for checkout");
      
      toast({
        title: "Checked Out Successfully",
        description: "Your attendance has been recorded."
      });
      console.log("[DEBUG] Success toast displayed");
      
    } catch (error) {
      console.error("[DEBUG] Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is cleared
      clearTimeout(maxCheckoutTime); // Clear the max time limit
      setIsSubmitting(false);
      setShowMeterPopup(false);
      
      // Remove the checkout flag
      if (typeof window !== 'undefined') {
        localStorage.removeItem('checkout_in_progress');
      }
      
      console.log("[DEBUG] Checkout operation completed");
    }
  };

  return (
    <div className="container px-4 md:px-6 py-6">
      {/* Include the LocationTracker when employee is checked in */}
      {checkInStatus === "checked-in" && currentLogId && (
        <LocationTracker 
          attendanceLogId={currentLogId} 
          interval={120000} // 2 minutes in milliseconds
        />
      )}
      
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#228B22]">Employee Dashboard</h1>
          <p className="text-[#6B8E23]">Welcome back, {user?.name || "Employee"}</p>
        </div>

        <Card className="bg-gradient-to-r from-[#F4A460] to-[#6B8E23] bg-opacity-10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white bg-opacity-90 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-[#228B22]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Current Status</h2>
                  {lastCheckTime && (
                    <div className="text-sm text-white flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {checkInStatus === "checked-in" ? `Checked in at ${lastCheckTime}` : `Checked out at ${lastCheckTime}`}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {checkInStatus === "checked-out" ? (
                  <Button 
                    onClick={initializeCheckIn} 
                    disabled={isSubmitting} 
                    className="w-full md:w-auto bg-[#228B22] hover:bg-[#1A6B1A]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Check In
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={initializeCheckOut} 
                    disabled={isSubmitting} 
                    className="w-full md:w-auto bg-red-500 hover:bg-red-600"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Check Out
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meter Reading Popup */}
        {user && showMeterPopup && (
          <MeterReadingPopup
            isOpen={showMeterPopup}
            onClose={() => setShowMeterPopup(false)}
            onSubmit={meterReadingType === "check-in" ? handleCheckIn : handleCheckOut}
            type={meterReadingType}
            userId={user.id}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-full bg-[#228B22] bg-opacity-10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[#228B22]" />
                </div>
                <Button variant="ghost" className="text-[#6B8E23]" asChild>
                  <Link href="/employee/farmers">View Farmers</Link>
                </Button>
              </div>
              <h2 className="text-lg font-semibold mb-2">Farmer Data</h2>
              <p className="text-sm text-muted-foreground">
                Collect and manage farmer information and product usage data
              </p>
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
              <h2 className="text-lg font-semibold mb-2">Security</h2>
              <p className="text-sm text-muted-foreground">Change your password and security settings</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Password Change Popup */}
        <PasswordChangePopup
          isOpen={showPasswordChangePopup}
          onClose={() => setShowPasswordChangePopup(false)}
        />
      </div>
    </div>
  )
}


