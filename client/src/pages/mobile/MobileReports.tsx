import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileLayout } from "@/components/MobileLayout";
import { 
  FileText,
  Download,
  Calendar,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Filter
} from "lucide-react";
import { format } from "date-fns";

export default function MobileReports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedReport, setSelectedReport] = useState("attendance");

  const reportTypes = [
    { 
      id: "attendance", 
      name: "Attendance Report", 
      icon: Clock,
      description: "Monthly attendance summary"
    },
    { 
      id: "payroll", 
      name: "Payroll Report", 
      icon: DollarSign,
      description: "Salary and overtime calculations"
    },
    { 
      id: "performance", 
      name: "Performance Report", 
      icon: TrendingUp,
      description: "Employee performance metrics"
    },
    { 
      id: "departmental", 
      name: "Department Report", 
      icon: Users,
      description: "Department-wise analysis"
    }
  ];

  const handleGenerateReport = () => {
    // In a real app, this would trigger report generation
    console.log(`Generating ${selectedReport} report for ${selectedMonth}`);
  };

  const handleDownloadReport = (format: 'pdf' | 'excel') => {
    // In a real app, this would download the report
    console.log(`Downloading ${selectedReport} report as ${format}`);
  };

  return (
    <MobileLayout>
      <div className="space-y-4">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400">Generate and download reports</p>
        </div>

        {/* Month Selector */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Select Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </CardContent>
        </Card>

        {/* Report Types */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Type
          </h3>
          
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <Card 
                key={report.id}
                className={`bg-slate-800 border-slate-700 cursor-pointer transition-all ${
                  selectedReport === report.id 
                    ? 'border-primary bg-primary/10' 
                    : 'hover:bg-slate-700'
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedReport === report.id 
                        ? 'bg-primary/20' 
                        : 'bg-slate-700'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        selectedReport === report.id 
                          ? 'text-primary' 
                          : 'text-slate-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{report.name}</p>
                      <p className="text-sm text-slate-400">{report.description}</p>
                    </div>
                    {selectedReport === report.id && (
                      <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Generate Report Button */}
        <Button 
          onClick={handleGenerateReport}
          className="w-full bg-primary hover:bg-primary/90"
        >
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>

        {/* Download Options */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Download Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleDownloadReport('pdf')}
                className="border-slate-600 hover:bg-slate-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDownloadReport('excel')}
                className="border-slate-600 hover:bg-slate-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        Attendance Report - {format(new Date(2025, 7 - i, 1), 'MMMM yyyy')}
                      </p>
                      <p className="text-xs text-slate-400">
                        Generated on {format(new Date(2025, 7 - i, 5), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-primary">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}