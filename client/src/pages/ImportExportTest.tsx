import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileUp, Download, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ImportExportTest() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);
  const { toast } = useToast();

  // Test import status endpoint
  const checkImportStatus = async () => {
    try {
      const response = await apiRequest({
        url: "/api/admin/excel-import/import-status",
        method: "GET"
      });
      const data = await response.json();
      setImportStatus(data);
      toast({
        title: "Import Status Retrieved",
        description: `Staging records: ${data.stagingCount}, June records: ${data.juneRecords}`
      });
    } catch (error: any) {
      console.error("Import status error:", error);
      toast({
        title: "Import Status Failed",
        description: error.message || "Failed to get import status",
        variant: "destructive"
      });
    }
  };

  // Test CSV export functionality
  const exportReportData = async (format: "csv" | "pdf") => {
    setIsExporting(true);
    try {
      const response = await apiRequest({
        url: `/api/reports/comprehensive/export?month=2025-07&format=${format}`,
        method: "GET"
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comprehensive-report-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Export Successful",
          description: `${format.toUpperCase()} file downloaded successfully`
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `${format.toUpperCase()} export failed`);
      }
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error.message || `Failed to export ${format.toUpperCase()}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Test file import functionality
  const handleFileImport = async () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', importFile);

      const response = await fetch('/api/admin/excel-import/upload-june-data', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Import Successful",
          description: `Processed ${data.processed} records, inserted ${data.inserted}`
        });
        checkImportStatus(); // Refresh status
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Import/Export Test Interface</h1>
        <p className="text-slate-400">Test CSV import and data export functionality</p>
      </div>

      {/* Import Status Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Import Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkImportStatus} variant="outline">
            Check Import Status
          </Button>
          
          {importStatus && (
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Current Status:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Staging Records:</span>
                  <span className="ml-2 font-mono">{importStatus.stagingCount}</span>
                </div>
                <div>
                  <span className="text-slate-400">Processed Records:</span>
                  <span className="ml-2 font-mono">{importStatus.processedCount}</span>
                </div>
                <div>
                  <span className="text-slate-400">June Records:</span>
                  <span className="ml-2 font-mono">{importStatus.juneRecords}</span>
                </div>
                <div>
                  <span className="text-slate-400">Polling Status:</span>
                  <span className="ml-2 font-mono">{importStatus.isPollingRunning ? 'Running' : 'Stopped'}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Import Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            CSV File Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>
          
          <Button 
            onClick={handleFileImport} 
            disabled={!importFile || isImporting}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV File
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Export Test Card */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => exportReportData("csv")} 
              disabled={isExporting}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            <Button 
              onClick={() => exportReportData("pdf")} 
              disabled={isExporting}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
          
          {isExporting && (
            <p className="text-sm text-slate-400 text-center">
              Generating export file...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <CheckCircle className="h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-300 space-y-2">
          <p>1. Click "Check Import Status" to verify API connectivity</p>
          <p>2. Select a CSV file and click "Import CSV File" to test import functionality</p>
          <p>3. Use the export buttons to test CSV and PDF generation</p>
          <p>4. Check the browser network tab for API response details</p>
        </CardContent>
      </Card>
    </div>
  );
}