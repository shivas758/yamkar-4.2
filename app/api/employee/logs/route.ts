import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { withAuth } from "@/lib/auth-middleware";

interface AttendanceLog {
  date: string;
  totalHours: number;
  routeMapImage: string;
  checkInTime: string;
  checkOutTime: string;
}

interface WorkSummaryRecord {
  id: string;
  date?: string;
  work_date?: string;
  total_hours: number;
  check_in?: string;
  check_out?: string;
  route_map_image?: string;
  employee_id?: string;
  user_id?: string;
  created_at?: string;
  [key: string]: any;
}

async function getEmployeeLogs(request: NextRequest, user: any) {
  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get("employeeId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!employeeId || !fromDate || !toDate) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Check permission - ensure the user has access to this employee data
  // If the user is not an admin or manager of this employee, deny access
  if (user.role !== 'admin' && user.id !== employeeId) {
    const { data: employeeData } = await supabase
      .from('users')
      .select('manager_id')
      .eq('id', employeeId)
      .single();

    if (!employeeData || employeeData.manager_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to access this employee's data" },
        { status: 403 }
      );
    }
  }

  try {
    // First verify employee exists
    const { data: employeeData, error: employeeError } = await supabase
      .from('users')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError) {
      console.error("Employee lookup error:", employeeError);
      return NextResponse.json(
        { error: "Could not verify employee" },
        { status: 404 }
      );
    }

    console.log("Found employee:", employeeData);

    // Format dates for database
    const formattedStartDate = format(new Date(fromDate), 'yyyy-MM-dd');
    const formattedEndDate = format(new Date(toDate), 'yyyy-MM-dd');

    // First try the daily_work_summary table (preferred)
    const { data: workData, error: workError } = await supabase
      .from('daily_work_summary')
      .select('*')
      .eq('user_id', employeeId)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate);
      
    if (!workError && workData?.length > 0) {
      return NextResponse.json(formatWorkData(workData));
    }

    // Fall back to attendance_logs
    const { data: logsData, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', employeeId)
      .gte('check_in', `${formattedStartDate}T00:00:00`)
      .lte('check_in', `${formattedEndDate}T23:59:59`);
      
    if (!logsError && logsData?.length > 0) {
      return NextResponse.json(formatLogsData(logsData));
    }

    // If we get here, no data was found in either table
    return NextResponse.json({ logs: [] });

  } catch (error) {
    console.error("Error fetching employee logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee logs" },
      { status: 500 }
    );
  }
}

// Use the withAuth middleware to protect this endpoint
export const GET = withAuth(getEmployeeLogs);

// Helper functions to format the data
function formatWorkData(workData: any[]) {
  return {
    logs: workData.map(record => ({
      date: record.date,
      totalHours: record.total_working_hours || 0,
      routeMapImage: record.route_map_image || null,
      checkInTime: record.first_check_in ? format(new Date(record.first_check_in), 'HH:mm') : null,
      checkOutTime: record.last_check_out ? format(new Date(record.last_check_out), 'HH:mm') : null,
    }))
  };
}

function formatLogsData(logsData: any[]) {
  // Group logs by date
  const logsByDate: Record<string, any[]> = logsData.reduce((acc: Record<string, any[]>, log) => {
    const date = format(new Date(log.check_in), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {});

  // Format each day's logs
  return {
    logs: Object.entries(logsByDate).map(([date, logs]) => {
      const totalMinutes = logs.reduce((sum, log) => {
        return sum + (log.duration_minutes || 0);
      }, 0);
      
      const firstLog = logs[0];
      const lastLog = logs[logs.length - 1];
      
      return {
        date,
        totalHours: totalMinutes / 60,
        routeMapImage: null, // Logs don't typically have route maps
        checkInTime: format(new Date(firstLog.check_in), 'HH:mm'),
        checkOutTime: lastLog.check_out ? format(new Date(lastLog.check_out), 'HH:mm') : null,
      };
    })
  };
}
