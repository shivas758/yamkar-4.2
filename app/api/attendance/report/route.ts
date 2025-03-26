import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!userId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Fetch daily summaries
    const { data: summaries, error: summaryError } = await supabase
      .from('daily_work_summary')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (summaryError) throw summaryError;

    // Fetch detailed logs
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in', `${startDate}T00:00:00`)
      .lte('check_in', `${endDate}T23:59:59`)
      .order('check_in', { ascending: true });

    if (logsError) throw logsError;

    return NextResponse.json({
      summaries,
      logs,
      totalDays: summaries.length,
      totalHours: summaries.reduce((acc, day) => acc + (day.total_working_hours || 0), 0),
      averageHoursPerDay: summaries.length > 0 
        ? summaries.reduce((acc, day) => acc + (day.total_working_hours || 0), 0) / summaries.length 
        : 0
    });
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    return NextResponse.json(
      { error: "Failed to fetch attendance report" },
      { status: 500 }
    );
  }
}