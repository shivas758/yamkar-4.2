import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Loader2, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface WorkSummary {
  date: string;
  total_working_hours: number;
  first_check_in: string;
  last_check_out: string;
  check_in_count: number;
  total_distance_traveled?: number;
}

interface EmployeeDataPopupProps {
  employee: Employee;
}

// Component for date selection
const WorkDatesSelector = ({ 
  onDatesSelected 
}: { 
  onDatesSelected: (fromDate: Date, toDate: Date) => void 
}) => {
  const [fromDate, setFromDate] = useState<Date>();
  const [toDate, setToDate] = useState<Date>();
  
  const handleSubmit = () => {
    if (fromDate && toDate) {
      onDatesSelected(fromDate, toDate);
    } else {
      toast({
        title: "Missing dates",
        description: "Please select both from and to dates",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="p-4 border rounded-md mb-4">
      <h3 className="text-lg font-medium mb-3">Select Date Range</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-2">From Date</h4>
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={setFromDate}
            className="rounded-md border"
          />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">To Date</h4>
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={setToDate}
            className="rounded-md border"
          />
        </div>
      </div>
      <Button 
        onClick={handleSubmit} 
        className="mt-4 bg-[#228B22] hover:bg-[#1A6B1A]"
      >
        View Work Data
      </Button>
    </div>
  );
};

// Component for displaying work summaries
const WorkSummaryDisplay = ({ 
  summaries,
  employee
}: { 
  summaries: WorkSummary[],
  employee: Employee
}) => {
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);

  // Function to fetch detailed log data including odometer readings
  const fetchDetailedLog = async (date: string) => {
    // Toggle off if clicking the already selected summary
    if (selectedSummary === date) {
      setSelectedSummary(null);
      return;
    }
    
    setSelectedSummary(date);
  };

  if (summaries.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>No work data available for the selected period.</p>
      </div>
    );
  }

  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      const title = `${employee.name}'s Work Report`;
      
      // Add title
      doc.setFontSize(18);
      doc.text(title, 105, 15, { align: 'center' });
      
      // Add period info
      doc.setFontSize(12);
      doc.text(`Report generated on ${format(new Date(), 'dd MMM yyyy')}`, 105, 25, { align: 'center' });
      
      // Add table headers
      doc.setFontSize(10);
      let y = 40;
      doc.text('Date', 20, y);
      doc.text('Hours Worked', 65, y);
      doc.text('First Check-in', 110, y);
      doc.text('Last Check-out', 155, y);
      doc.text('Distance (km)', 195, y);
      
      y += 10;
      
      // Add table data
      summaries.forEach(summary => {
        doc.text(format(new Date(summary.date), 'dd MMM yyyy'), 20, y);
        doc.text(summary.total_working_hours.toFixed(2), 65, y);
        doc.text(format(new Date(summary.first_check_in), 'hh:mm a'), 110, y);
        doc.text(format(new Date(summary.last_check_out), 'hh:mm a'), 155, y);
        doc.text(summary.total_distance_traveled?.toFixed(1) || '0', 195, y);
        y += 10;
      });
      
      // Save the PDF
      doc.save(`${employee.name.replace(/\s+/g, '_')}_work_report.pdf`);
      
      toast({
        title: "PDF Generated",
        description: "The work report has been downloaded",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Work Summary</h3>
        <Button 
          onClick={generatePDF} 
          variant="outline" 
          size="sm"
        >
          Download PDF
        </Button>
      </div>
      
      <ScrollArea className="h-[300px]">
        {summaries.map((summary, index) => (
          <Card key={index} className="mb-3">
            <CardHeader className="py-2">
              <CardTitle 
                className="text-sm font-medium flex items-center justify-between cursor-pointer"
                onClick={() => fetchDetailedLog(summary.date)}
              >
                <span>{format(new Date(summary.date), 'EEEE, MMMM d, yyyy')}</span>
                {summary.total_distance_traveled && summary.total_distance_traveled > 0 && (
                  <Badge variant="outline" className="ml-2 bg-green-50">
                    {summary.total_distance_traveled.toFixed(1)} km
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Hours:</span> {summary.total_working_hours.toFixed(2)}
                </div>
                <div>
                  <span className="font-medium">Check-ins:</span> {summary.check_in_count}
                </div>
                <div>
                  <span className="font-medium">First check-in:</span> {format(new Date(summary.first_check_in), 'hh:mm a')}
                </div>
                <div>
                  <span className="font-medium">Last check-out:</span> {format(new Date(summary.last_check_out), 'hh:mm a')}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Distance traveled:</span> {summary.total_distance_traveled?.toFixed(1) || '0'} km
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </ScrollArea>
    </div>
  );
};

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-40">
    <Loader2 className="h-6 w-6 animate-spin text-[#228B22]" />
    <span className="ml-2">Loading work data...</span>
  </div>
);

// Main component
const EmployeeDataPopup: React.FC<EmployeeDataPopupProps> = ({ employee }) => {
  const [summaries, setSummaries] = useState<WorkSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchWorkData = async (fromDate: Date, toDate: Date) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('daily_work_summary')
        .select('*')
        .eq('user_id', employee.id)
        .gte('date', format(fromDate, 'yyyy-MM-dd'))
        .lte('date', format(toDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setSummaries(data || []);
    } catch (error) {
      console.error("Error fetching work data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch work data",
        variant: "destructive",
      });
      setSummaries([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto font-medium text-left">
          {employee.name}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{employee.name}'s Work Data</DialogTitle>
          <DialogDescription>
            View work hours and attendance for this employee.
          </DialogDescription>
        </DialogHeader>
        
        <WorkDatesSelector onDatesSelected={fetchWorkData} />
        
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <WorkSummaryDisplay summaries={summaries} employee={employee} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDataPopup;
