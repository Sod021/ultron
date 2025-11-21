import { useState, useEffect, useRef, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Edit, Trash2, ExternalLink, CheckCircle2, XCircle, LayoutDashboard, Globe, FileText, Download, AlertTriangle, ChevronDown, RefreshCw, Loader2, ArrowUp, ArrowDown, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
// Import jsPDF and autoTable
import { jsPDF } from 'jspdf';
import autoTable, { CellDef, RowInput } from 'jspdf-autotable';
import 'jspdf-autotable';
import html2canvas from "html2canvas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Website {
  id: number;
  name: string;
  url: string;
  created_at: string;
}

interface DailyCheck {
  id: number;
  website_id: number;
  website_name: string;
  website_url: string;
  is_live: boolean;
  is_functional: boolean;
  has_problem: boolean;
  notes: string;
  created_at: string;
}

const Sentinel = () => {
  const { toast } = useToast();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [dailyChecks, setDailyChecks] = useState<DailyCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [checkComplete, setCheckComplete] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [websiteName, setWebsiteName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLive, setIsLive] = useState<string>("yes");
  const [isFunctional, setIsFunctional] = useState<string>("yes");
  const [hasProblem, setHasProblem] = useState<string>("no");
  const [notes, setNotes] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<string>("");
  const [isCustomNote, setIsCustomNote] = useState(false);
  const [reportDate, setReportDate] = useState<Date>();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearWebsitesDialogOpen, setIsClearWebsitesDialogOpen] = useState(false);
  const [showAllWebsites, setShowAllWebsites] = useState(false);
  const [isLoading, setIsLoading] = useState({
    checks: false,
    pdf: false,
    websites: false,
    dashboard: true // Initial load
  });
  
  // Simulate trend data (in a real app, this would come from your backend)
  const [trendData, setTrendData] = useState({
    total: { change: 2, isPositive: true },
    live: { change: 1, isPositive: true },
    functional: { change: 1, isPositive: false },
    problematic: { change: 2, isPositive: false }
  });
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(prev => ({ ...prev, dashboard: false }));
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Common issues list
  const commonIssues = [
    "Contact Form Not Working",
    "404 Page",
    "Header/Footer Distorted",
    "Redirecting to Betting Site",
    "Domain Expired",
    "403 Page",
    "Other (Specify Below)"
  ];
  const [reportData, setReportData] = useState<DailyCheck[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const handleCSVImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      if (!headers.includes('name') || !headers.includes('url')) {
        throw new Error('CSV must include "name" and "url" columns');
      }

      const newWebsites: Website[] = [];
      const existingUrls = new Set(websites.map(w => w.url.toLowerCase()));
      const newUrls = new Set<string>();
      const duplicateUrls = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const website: Partial<Website> = {};
        
        headers.forEach((header, index) => {
          if (header === 'name') website.name = values[index] || `Website ${i}`;
          if (header === 'url') {
            let url = values[index];
            if (!url.startsWith('http')) {
              url = `https://${url}`;
            }
            website.url = url;
          }
        });

        if (website.name && website.url) {
          const url = website.url.toLowerCase();
          if (existingUrls.has(url)) {
            duplicateUrls.add(website.url);
          } else if (!newUrls.has(url)) {
            newWebsites.push({
              id: Date.now() + i,
              name: website.name,
              url: website.url,
              created_at: new Date().toISOString()
            });
            newUrls.add(url);
          }
        }
      }

      if (newWebsites.length > 0) {
        const updatedWebsites = [...websites, ...newWebsites];
        saveWebsites(updatedWebsites);
        
        let message = `Successfully imported ${newWebsites.length} website(s)`;
        if (duplicateUrls.size > 0) {
          message += ` (Skipped ${duplicateUrls.size} duplicate URL(s))`;
        }
        
        toast({ 
          title: 'Import Successful', 
          description: message,
          variant: 'default'
        });
      } else if (duplicateUrls.size > 0) {
        toast({
          title: 'No new websites imported',
          description: `All ${duplicateUrls.size} URLs already exist in the system`,
          variant: 'default'
        });
      }

      // Reset the file input
      event.target.value = '';
      setImportError(null);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import CSV file');
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import CSV file',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const storedWebsites = localStorage.getItem("sentinel_websites");
    const storedChecks = localStorage.getItem("sentinel_daily_checks");
    if (storedWebsites) setWebsites(JSON.parse(storedWebsites));
    if (storedChecks) setDailyChecks(JSON.parse(storedChecks));
  }, []);

  const saveWebsites = (data: Website[]) => {
    localStorage.setItem("sentinel_websites", JSON.stringify(data));
    setWebsites(data);
  };

  const saveDailyChecks = (data: DailyCheck[]) => {
    localStorage.setItem("sentinel_daily_checks", JSON.stringify(data));
    setDailyChecks(data);
  };

  const addWebsite = () => {
    if (!websiteName || !websiteUrl) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (editingId) {
      saveWebsites(websites.map(w => w.id === editingId ? { ...w, name: websiteName, url: websiteUrl } : w));
      toast({ title: "Success", description: "Website updated successfully" });
      setEditingId(null);
    } else {
      saveWebsites([...websites, { id: Date.now(), name: websiteName, url: websiteUrl, created_at: new Date().toISOString() }]);
      toast({ title: "Success", description: "Website added successfully" });
    }
    setWebsiteName("");
    setWebsiteUrl("");
  };

  const stopDailyChecks = () => {
    setIsStopping(true);
    setIsChecking(false);
    setCheckComplete(false);
    setCurrentCheckIndex(0);
    setIsStopping(false);
    toast({ title: "Stopped", description: "Website checks have been stopped" });
  };

  const startDailyCheck = () => {
    if (websites.length === 0) {
      toast({ title: "Error", description: "Please add websites first", variant: "destructive" });
      return;
    }
    setIsChecking(true);
    setCurrentCheckIndex(0);
    setCheckComplete(false);
    setIsLive("yes");
    setIsFunctional("yes");
    setHasProblem("no");
    setNotes("");
    setSelectedIssue("");
    setIsCustomNote(false);
    setIsStopping(false);
    setReportData([]);
  };

  const handleNext = () => {
    const currentWebsite = websites[currentCheckIndex];
    const finalNotes = selectedIssue === "Other (Specify Below)" 
      ? notes 
      : selectedIssue || notes;
    
    saveDailyChecks([...dailyChecks, {
      id: Date.now(),
      website_id: currentWebsite.id,
      website_name: currentWebsite.name,
      website_url: currentWebsite.url,
      is_live: isLive === "yes",
      is_functional: isFunctional === "yes",
      has_problem: hasProblem === "yes",
      notes: finalNotes,
      created_at: new Date().toISOString(),
    }]);
    
    if (currentCheckIndex < websites.length - 1) {
      setCurrentCheckIndex(currentCheckIndex + 1);
      setIsLive("yes");
      setIsFunctional("yes");
      setHasProblem("no");
      setNotes("");
      setSelectedIssue("");
      setIsCustomNote(false);
    } else {
      setCheckComplete(true);
      toast({ title: "Complete", description: "All checks completed successfully" });
    }
  };

  const generateReport = () => {
    if (!reportDate) {
      toast({ title: "Error", description: "Please select a date", variant: "destructive" });
      return;
    }
    const selectedDate = format(reportDate, "yyyy-MM-dd");
    const filtered = dailyChecks.filter(check => format(new Date(check.created_at), "yyyy-MM-dd") === selectedDate);
    setReportData(filtered);
    if (filtered.length === 0) toast({ title: "No Data", description: "No check data found for this date" });
  };

  const downloadPDF = () => {
    if (reportData.length === 0) {
      toast({ title: "Error", description: "No report data to download", variant: "destructive" });
      return;
    }
    generateAndDownloadPDF(reportData, 'sentinel-report-');
  };

  const downloadProblematicPDF = () => {
    const problematicChecks = reportData.filter(check => check.has_problem);
    
    if (problematicChecks.length === 0) {
      toast({ 
        title: "No Issues Found", 
        description: "No websites were marked as having problems.", 
        variant: "default" 
      });
      return;
    }
    
    generateAndDownloadPDF(problematicChecks, 'problematic-websites-');
  };

  const clearAllWebsites = () => {
    setWebsites([]);
    localStorage.removeItem("sentinel_websites");
    setIsClearWebsitesDialogOpen(false);
    toast({
      title: "Success",
      description: "All websites have been cleared.",
    });
  };

  const generateAndDownloadPDF = (checks: DailyCheck[], filenamePrefix: string) => {
    try {
      // Initialize jsPDF
      const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(22);
      doc.text(
        filenamePrefix.includes('problematic') ? 'Problematic Websites Report' : 'Sentinel Report',
        14,
        20
      );
      
      // Add date
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(
        `Report Date: ${reportDate ? format(reportDate, "PPPP") : 'N/A'}`,
        14,
        30
      );
      
      // Type definitions for table cells
      type CellStyle = {
        halign: 'left' | 'center' | 'right';
        fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic';
        textColor?: [number, number, number];
        fontSize?: number;
      };

      type TableCell = {
        content: string;
        styles: CellStyle;
      };

      // Prepare table data as a 2D array of CellDef for autoTable
      const tableData: CellDef[][] = checks.map(check => [
        // Website
        {
          content: `${check.website_name}\n${check.website_url}`,
          styles: { 
            halign: 'left',
            fontStyle: 'bold' as const
          }
        },
        // Live
        {
          content: check.is_live ? 'Yes' : 'No',
          styles: { 
            halign: 'center',
            fontStyle: 'bold' as const,
            textColor: check.is_live ? [0, 150, 0] as [number, number, number] : [200, 0, 0] as [number, number, number]
          }
        },
        // Functional
        {
          content: check.is_functional ? 'Yes' : 'No',
          styles: { 
            halign: 'center',
            fontStyle: 'bold' as const,
            textColor: check.is_functional ? [0, 150, 0] as [number, number, number] : [200, 0, 0] as [number, number, number]
          }
        },
        // Issue
        {
          content: check.has_problem ? 'Yes' : 'No',
          styles: { 
            halign: 'center',
            fontStyle: 'bold' as const,
            textColor: check.has_problem ? [200, 0, 0] as [number, number, number] : [100, 100, 100] as [number, number, number]
          }
        },
        // Notes
        {
          content: check.notes || '-',
          styles: {
            halign: 'left',
            fontStyle: 'normal' as const
          }
        }
      ]);

      // Calculate column widths (A4 width in landscape is 297mm, leave some margin)
      const margin = 10;
      const totalWidth = 297 - (2 * margin);
      
      // Define column widths (adjust these values as needed)
      const colWidths = [
        totalWidth * 0.4,  // Website (40%)
        totalWidth * 0.1,  // Live (10%)
        totalWidth * 0.15, // Functional (15%)
        totalWidth * 0.15, // Issue (15%)
        totalWidth * 0.2   // Notes (20%)
      ];

      // Set default font to Courier and text color to black
      doc.setFont('courier');
      doc.setTextColor(0, 0, 0); // Black color
      
      // Create the autoTable configuration with proper typing
      autoTable(doc, {
        head: [[
          { content: 'Website', styles: { font: 'courier', fontStyle: 'bold' } },
          { content: 'Live', styles: { font: 'courier', fontStyle: 'bold' } },
          { content: 'Functional', styles: { font: 'courier', fontStyle: 'bold' } },
          { content: 'Issue', styles: { font: 'courier', fontStyle: 'bold' } },
          { content: 'Notes', styles: { font: 'courier', fontStyle: 'bold' } }
        ]],
        body: tableData,
        startY: 40,
        theme: 'grid',
        margin: { left: margin, right: margin },
        styles: {
          font: 'courier',
          fontSize: 10,
          cellPadding: 3,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          overflow: 'linebreak',
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [241, 243, 245],
          textColor: [0, 0, 0],
          font: 'courier',
          fontStyle: 'bold',
          fontSize: 12,
          halign: 'center',
          lineWidth: 0.1,
          cellPadding: 6
        },
        columnStyles: {
          0: { 
            cellWidth: colWidths[0],
            halign: 'left',
            valign: 'middle',
            cellPadding: { left: 5, right: 2, top: 3, bottom: 3 }
          },
          1: { 
            cellWidth: colWidths[1],
            halign: 'center',
            valign: 'middle'
          },
          2: { 
            cellWidth: colWidths[2],
            halign: 'center',
            valign: 'middle'
          },
          3: { 
            cellWidth: colWidths[3],
            halign: 'center',
            valign: 'middle'
          },
          4: { 
            cellWidth: colWidths[4],
            halign: 'left',
            valign: 'middle',
            cellPadding: { left: 5, right: 5, top: 3, bottom: 3 }
          }
        }
      });

      // Save the PDF
      const filename = `${filenamePrefix}${format(reportDate || new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(filename);
      
      // Show success toast
      toast({ 
        title: "Success", 
        description: `Report downloaded with ${checks.length} ${filenamePrefix.includes('problematic') ? 'problematic ' : ''}websites` 
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ 
        title: "Error", 
        description: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive" 
      });
    }
  };

  const clearAllReports = () => {
    setDailyChecks([]);
    setReportData([]);
    localStorage.removeItem("sentinel_daily_checks");
    setShowClearConfirm(false);
    toast({ title: "Success", description: "All reports have been cleared" });
  };

// ...
  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "websites", label: "Websites", icon: Globe },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground">Sentinel</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-1">Website Monitor</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => !isChecking && setActiveTab(item.id)}
                  disabled={isChecking}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                  } ${isChecking ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        {!isChecking ? (
          <>
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => {
                        setIsLoading(prev => ({ ...prev, dashboard: true }));
                        setTimeout(() => {
                          setIsLoading(prev => ({ ...prev, dashboard: false }));
                        }, 800);
                      }}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoading.dashboard ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {/* Total Websites */}
                  <Card 
                    className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setActiveTab("websites")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2 group">
                          <span>Total Websites</span>
                          <div className="relative group">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <div className="absolute hidden group-hover:block z-10 w-48 p-2 -ml-4 mt-1 text-xs bg-popover text-popover-foreground rounded-md shadow-lg border">
                              Total number of websites being monitored in the system
                            </div>
                          </div>
                        </div>
                        <Globe className="h-4 w-4 text-blue-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading.dashboard ? (
                        <div className="space-y-2">
                          <div className="h-7 w-3/4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold flex items-center gap-2">
                            {websites.length}
                            {trendData.total.change > 0 && (
                              <span className={`text-xs flex items-center ${trendData.total.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {trendData.total.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                {trendData.total.change}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Tracked in system</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Live Status */}
                  <Card 
                    className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setActiveTab("reports")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2 group">
                          <span>Live Status</span>
                          <div className="relative group">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <div className="absolute hidden group-hover:block z-10 w-48 p-2 -ml-4 mt-1 text-xs bg-popover text-popover-foreground rounded-md shadow-lg border">
                              Live websites vs. websites that are currently down
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading.dashboard ? (
                        <div className="space-y-2">
                          <div className="h-7 w-3/4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-green-600">
                                {dailyChecks.filter(c => c.is_live).length}
                              </span>
                              {trendData.live.change > 0 && (
                                <span className={`text-xs flex items-center ${trendData.live.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                  {trendData.live.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                  {trendData.live.change}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-lg text-muted-foreground">
                              {dailyChecks.filter(c => !c.is_live).length}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Live / Down</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Functional Status */}
                  <Card 
                    className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setActiveTab("reports")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2 group">
                          <span>Functional Status</span>
                          <div className="relative group">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <div className="absolute hidden group-hover:block z-10 w-48 p-2 -ml-4 mt-1 text-xs bg-popover text-popover-foreground rounded-md shadow-lg border">
                              Websites functioning normally vs. those with functional issues
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading.dashboard ? (
                        <div className="space-y-2">
                          <div className="h-7 w-3/4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-green-600">
                                {dailyChecks.filter(c => c.is_functional).length}
                              </span>
                              {trendData.functional.change > 0 && (
                                <span className={`text-xs flex items-center ${trendData.functional.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                  {trendData.functional.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                  {trendData.functional.change}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-lg text-amber-600">
                              {dailyChecks.filter(c => !c.is_functional).length}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">OK / With Issues</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Problematic Sites */}
                  <Card 
                    className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      // Filter to only show problematic sites in reports
                      const problematicSites = dailyChecks.filter(c => c.has_problem);
                      if (problematicSites.length > 0) {
                        generateAndDownloadPDF(problematicSites, 'problematic-sites-');
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2 group">
                          <span>Problematic Sites</span>
                          <div className="relative group">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <div className="absolute hidden group-hover:block z-10 w-48 p-2 -ml-4 mt-1 text-xs bg-popover text-popover-foreground rounded-md shadow-lg border">
                              Click to download a report of all problematic sites
                            </div>
                          </div>
                        </div>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading.dashboard ? (
                        <div className="space-y-2">
                          <div className="h-7 w-3/4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold text-red-600">
                                {dailyChecks.filter(c => c.has_problem).length}
                              </span>
                              {trendData.problematic.change > 0 && (
                                <span className={`text-xs flex items-center ${trendData.problematic.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                  {trendData.problematic.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                  {trendData.problematic.change}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {dailyChecks.filter(c => c.has_problem).length > 0 
                              ? 'Needs immediate attention' 
                              : 'No critical issues'}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={startDailyCheck}>
                    <RefreshCw className="h-6 w-6" />
                    <span>Run Checks</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setActiveTab('websites')}>
                    <Plus className="h-6 w-6" />
                    <span>Add Website</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => generateAndDownloadPDF(dailyChecks, 'full-report-')}>
                    <Download className="h-6 w-6" />
                    <span>Export Report</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setActiveTab('reports')}>
                    <FileText className="h-6 w-6" />
                    <span>View Reports</span>
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Daily Checks</CardTitle>
                    <CardDescription>Start manual website monitoring checks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={startDailyCheck} size="lg" className="w-full sm:w-auto">
                      Start Daily Checks
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "websites" && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">Websites</h2>
                <Card className="mb-6">
                  <CardHeader><CardTitle>{editingId ? "Edit Website" : "Add Website"}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div><Label htmlFor="name">Website Name</Label><Input id="name" value={websiteName} onChange={(e) => setWebsiteName(e.target.value)} placeholder="My Website" /></div>
                      <div><Label htmlFor="url">URL</Label><Input id="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" /></div>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button onClick={addWebsite}><Plus className="w-4 h-4 mr-2" />{editingId ? "Update" : "Add"} Website</Button>
                            <div className="relative">
                              <Button type="button" variant="outline" asChild>
                                <Label htmlFor="csv-upload" className="cursor-pointer">
                                  <Download className="w-4 h-4 mr-2" /> Import CSV
                                </Label>
                              </Button>
                              <Input 
                                id="csv-upload"
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleCSVImport}
                              />
                            </div>
                            {editingId && (
                              <Button 
                                variant="outline" 
                                onClick={() => { 
                                  setEditingId(null); 
                                  setWebsiteName(""); 
                                  setWebsiteUrl(""); 
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                        {importError && (
                          <p className="text-sm text-destructive">{importError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          CSV format: <code className="bg-muted px-1 rounded">name,url</code>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Your Websites</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsClearWebsitesDialogOpen(true)}
                      className="text-white hover:bg-red-600 hover:text-white border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {websites
                        .slice(0, showAllWebsites ? websites.length : 5)
                        .map((website) => (
                          <div key={website.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{website.name}</h3>
                              <a href={website.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                {website.url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { 
                                  setWebsiteName(website.name); 
                                  setWebsiteUrl(website.url); 
                                  setEditingId(website.id); 
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => { 
                                  saveWebsites(websites.filter(w => w.id !== website.id)); 
                                  toast({ title: "Success", description: "Website deleted" }); 
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      
                      {websites.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No websites added yet</p>
                      )}
                      
                      {websites.length > 5 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:bg-blue-50 hover:text-blue-600 w-full justify-center mt-2"
                          onClick={() => setShowAllWebsites(!showAllWebsites)}
                        >
                          {showAllWebsites ? (
                            <span>Show Less</span>
                          ) : (
                            <span>View All {websites.length} Websites</span>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "reports" && (
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-6">Reports</h2>
                <Card>
                  <CardHeader><CardTitle>Generate Report</CardTitle><CardDescription>View check results for a specific date</CardDescription></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div><Label>Select Date</Label>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{reportDate ? format(reportDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reportDate} onSelect={setReportDate} initialFocus /></PopoverContent></Popover>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={generateReport}>Generate Report</Button>
                        {reportData.length > 0 && (
                          <>
                            <Button onClick={downloadPDF} variant="secondary">
                              <Download className="w-4 h-4 mr-2" />Download Full Report
                            </Button>
                            <Button 
                              onClick={downloadProblematicPDF} 
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={!reportData.some(check => check.has_problem)}
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Download Problematic Only
                            </Button>
                            <Button 
                              onClick={() => setShowClearConfirm(true)}
                              className="bg-red-600 hover:bg-red-700 text-white ml-auto"
                              disabled={dailyChecks.length === 0}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Clear All Reports
                            </Button>
                          </>
                        )}
                      </div>
                      {reportData.length > 0 && (
                        <div ref={reportRef} className="mt-6 bg-card rounded-lg overflow-hidden">
                          <div className="p-6">
                            <h3 className="text-2xl font-bold text-foreground mb-1">Sentinel Report</h3>
                            <p className="text-muted-foreground mb-6">{reportDate && format(reportDate, "PPPP")}</p>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="border p-2 text-left">Website</th>
                                    <th className="border p-2 w-24">Live</th>
                                    <th className="border p-2 w-24">Functional</th>
                                    <th className="border p-2 w-24">Issue</th>
                                    <th className="border p-2 text-left">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportData.map((check) => (
                                    <tr key={check.id} className="hover:bg-muted/50">
                                      <td className="border p-2">
                                        <div className="font-medium">{check.website_name}</div>
                                        <a 
                                          href={check.website_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-sm text-primary hover:underline flex items-center gap-1"
                                        >
                                          {check.website_url}
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </td>
                                      <td className="border p-2 text-center">
                                        {check.is_live ? (
                                          <Badge className="bg-green-500 hover:bg-green-500/90">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive">
                                            <XCircle className="w-3 h-3 mr-1" /> No
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="border p-2 text-center">
                                        {check.is_functional ? (
                                          <Badge className="bg-green-500 hover:bg-green-500/90">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                                          </Badge>
                                        ) : (
                                          <Badge variant="destructive">
                                            <XCircle className="w-3 h-3 mr-1" /> No
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="border p-2 text-center">
                                        {check.has_problem ? (
                                          <Badge variant="destructive">
                                            <AlertTriangle className="w-3 h-3 mr-1" /> Yes
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> No
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="border p-2 text-sm text-muted-foreground max-w-xs">
                                        {check.notes || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardHeader>{!checkComplete ? <><CardTitle>Website {currentCheckIndex + 1} of {websites.length}</CardTitle><CardDescription>{websites[currentCheckIndex].name}</CardDescription></> : <><CardTitle>Checks Complete!</CardTitle><CardDescription>All website checks completed</CardDescription></>}</CardHeader>
            <CardContent>
              {!checkComplete ? (
                <div className="space-y-6">
                  <a href={websites[currentCheckIndex].url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-2">{websites[currentCheckIndex].url}<ExternalLink className="w-4 h-4" /></a>
                  <div><Label className="mb-3 block">Is it live?</Label><RadioGroup value={isLive} onValueChange={setIsLive}><div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="live-yes" /><Label htmlFor="live-yes">Yes</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="no" id="live-no" /><Label htmlFor="live-no">No</Label></div></RadioGroup></div>
                  <div><Label className="mb-3 block">Is it functional?</Label><RadioGroup value={isFunctional} onValueChange={setIsFunctional}><div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="functional-yes" /><Label htmlFor="functional-yes">Yes</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="no" id="functional-no" /><Label htmlFor="functional-no">No</Label></div></RadioGroup></div>
                  <div><Label className="mb-3 block">Is there a Problem?</Label><RadioGroup value={hasProblem} onValueChange={setHasProblem}><div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="problem-yes" /><Label htmlFor="problem-yes">Yes</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="no" id="problem-no" /><Label htmlFor="problem-no">No</Label></div></RadioGroup></div>
                  <div>
                    <Label htmlFor="notes" className="mb-2 block">Notes / Memo</Label>
                    <div className="mb-2">
                      <Select 
                        value={selectedIssue} 
                        onValueChange={(value) => {
                          setSelectedIssue(value);
                          if (value === "Other (Specify Below)") {
                            setIsCustomNote(true);
                            setNotes("");
                          } else if (value) {
                            setIsCustomNote(false);
                            setNotes(value);
                          } else {
                            setIsCustomNote(true);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a common issue or choose to type your own" />
                        </SelectTrigger>
                        <SelectContent>
                          {commonIssues.map((issue) => (
                            <SelectItem key={issue} value={issue}>
                              {issue}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(isCustomNote || !selectedIssue) && (
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={
                          selectedIssue === "Other (Specify Below)" 
                            ? "Please specify the issue..." 
                            : "Any additional notes..."
                        }
                        rows={3}
                        className="mt-2"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleNext} 
                      size="lg" 
                      className="flex-1"
                      disabled={isStopping}
                    >
                      {currentCheckIndex < websites.length - 1 ? "Save & Next" : "Finish"}
                    </Button>
                    <Button 
                      onClick={stopDailyChecks} 
                      variant="outline" 
                      size="lg"
                      className="flex-1"
                      disabled={isStopping}
                    >
                      {isStopping ? 'Stopping...' : 'Stop'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                  <p className="text-muted-foreground">
                    {isStopping ? 'Checks stopped' : `You have completed checks for all ${websites.length} websites.`}
                  </p>
                  <Button 
                    onClick={() => { 
                      setIsChecking(false); 
                      setCheckComplete(false); 
                      setCurrentCheckIndex(0); 
                    }} 
                    size="lg"
                  >
                    Return to Dashboard
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all report data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={clearAllReports}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All Reports
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearWebsitesDialogOpen} onOpenChange={setIsClearWebsitesDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <AlertDialogTitle>Clear All Websites</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Are you sure you want to clear all websites? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={clearAllWebsites}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Clear All Websites
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sentinel;
